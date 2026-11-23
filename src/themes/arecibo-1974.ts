import * as T from 'three';
import type {Stage, StageLook} from '../level/stage';
import {rng} from '../templates/random';
import {pointOnLeg, type Route} from '../templates/landmark';
import {CRITTER_KINDS, spawnCritter, stepCritter} from '../life/critters';
import type {LandmarkPoint} from '../../content/levels/types';

export const areciboLook: StageLook = {skyTop:'#24476e', skyHorizon:'#f4bf94', fog:[60,168],
  sun:'#ffdcaa',sunIntensity:2.1,hemiSky:'#d7ecff',hemiGround:'#a0bda7',ink:'#263c42',wash:'#cbd9cd'};
const TAU = Math.PI * 2;
const earthTexture = () => {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const g = canvas.getContext('2d')!; g.fillStyle='#275779'; g.fillRect(0,0,512,256);
  const continents = [
    [[25,47],[63,30],[120,37],[143,61],[111,71],[98,90],[80,104],[67,91],[50,82]],
    [[90,104],[115,112],[132,136],[121,158],[106,188],[98,174],[101,150],[87,124]],
    [[154,29],[177,26],[166,49],[155,53]],
    [[218,74],[250,61],[275,72],[295,98],[279,133],[258,161],[245,146],[239,118],[214,100]],
    [[223,63],[236,47],[282,39],[306,47],[344,34],[429,47],[447,65],[387,74],[366,102],[340,97],[321,80],[300,107],[281,83],[264,68]],
    [[371,143],[401,133],[424,149],[413,167],[379,163]],
  ];
  g.fillStyle='#83ad87';
  for (const polygon of continents) {g.beginPath();polygon.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
  const random=rng('earth-clouds');g.fillStyle='rgba(234,247,226,.6)';
  for(let i=0;i<70;i++){g.beginPath();g.ellipse(random.range(0,512),random.range(12,242),random.range(3,15),random.range(.8,2.8),-.2,0,TAU);g.fill();}
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return tex;
};
export function buildArecibo(stage: Stage, route: Route, seed: string) {
  const random=rng(seed), root=new T.Group(), solids=new T.Group();
  // Keep the complete sky dome behind the valley, including the far side of the opening view.
  stage.camera.far=420;stage.camera.updateProjectionMatrix();
  const sky=stage.scene.children.find((object:any)=>object.geometry?.type==='SphereGeometry'&&object.material?.isShaderMaterial);
  const duskTop=new T.Color(areciboLook.skyTop),nightTop=new T.Color('#051124');
  const duskHorizon=new T.Color(areciboLook.skyHorizon),nightHorizon=new T.Color('#263b55');
  root.name='observatory'; solids.name='route-structure'; stage.scene.add(root); root.add(solids);
  const colors={steel:'#586e75', silver:'#afc3c0', cream:'#e9ddbb', teal:'#287b79', orange:'#ef9143'};
  const cube=new T.BoxGeometry(1,1,1), orb=new T.IcosahedronGeometry(1,1), tube=new T.CylinderGeometry(1,1,1,8);
  const dummy=new T.Object3D(), up=new T.Vector3(0,1,0), direction=new T.Vector3();
  const groups=new Map<any,{matrices:any[];colors:string[]}>();
  function stamp(geometry:any,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,rx=0,ry=0,rz=0) {
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();
    let group=groups.get(geometry);if(!group){group={matrices:[],colors:[]};groups.set(geometry,group);}
    group.matrices.push(dummy.matrix.clone());group.colors.push(color);
  }
  function rod(a:LandmarkPoint,b:LandmarkPoint,r:number,color:string) {
    direction.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const len=direction.length();
    dummy.quaternion.setFromUnitVectors(up,direction.normalize());const {x,y,z}=dummy.rotation;
    stamp(tube,color,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,len,r,x,y,z);
  }
  function solid(x:number,y:number,z:number,w:number,h:number,d:number,color:string) {
    const mesh=new T.Mesh(cube,stage.toon(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d); mesh.name='deck';solids.add(mesh);
  }
  // A shared annular mesh follows the parabola. Each real panel seam lies on its surface.
  const centerZ=-6,radius=30;const dishY=(r:number)=>-11+12*r*r;
  const dishPoint=(r:number,a:number):LandmarkPoint=>[radius*r*Math.cos(a),dishY(r),centerZ+radius*r*Math.sin(a)];
  const positions:number[]=[], shades:number[]=[], indices:number[]=[], wire:number[]=[];
  function line(a:LandmarkPoint,b:LandmarkPoint){wire.push(...a,...b);}
  for(let ring=0;ring<16;ring++)for(let sector=0;sector<96;sector++){
    const r=ring/16,s=(ring+1)/16,a=TAU*sector/96,b=TAU*(sector+1)/96;
    const pts=[dishPoint(r,a),dishPoint(r,b),dishPoint(s,b),dishPoint(s,a)];
    const base=positions.length/3;
    const col=new T.Color(random.pick(['#bed1cb','#bdcecb','#cbd8d1','#b8c9c8','#cbd3c6']));
    for(const p of pts){positions.push(...p);shades.push(col.r,col.g,col.b);}
    indices.push(base,base+1,base+2,base,base+2,base+3);
    line(pts[2],pts[3]);if(ring>2||sector%3===0)line(pts[0],pts[3]);
  }
  const dish=new T.BufferGeometry();dish.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  dish.setAttribute('color',new T.Float32BufferAttribute(shades,3));dish.setIndex(indices);dish.computeVertexNormals();
  const dishMat=stage.toon('#ffffff',{side:T.DoubleSide}).clone();dishMat.vertexColors=true;
  root.add(new T.Mesh(dish,dishMat));
  const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wire,3));
  const grid=new T.LineSegments(wg,new T.LineBasicMaterial({color:'#617e83',transparent:true,opacity:.42}));grid.position.y=.025;grid.layers.set(1);root.add(grid);
  for(let i=0;i<96;i++){const a=TAU*i/96,b=TAU*(i+1)/96;rod(dishPoint(1,a),dishPoint(1,b),.13,colors.silver);}
  const landPoints:number[]=[], landColors:number[]=[], landIndices:number[]=[];
  const bands=[30,31,34,42,56,78,105,145];
  for(let j=0;j<bands.length;j++)for(let i=0;i<=96;i++){
    const a=TAU*i/96,d=bands[j],relief=Math.sin(a*6+j*.55)*.8+Math.cos(a*3-j*.4)*.65;
    const y=j===0?.84:j===1?.3:j===2?-.75:-2+relief;
    landPoints.push(d*Math.cos(a),y,centerZ+d*Math.sin(a));
    const tint=new T.Color(j<2?'#87946c':j===2?'#70885d':'#568259');tint.multiplyScalar(1+relief*.065);landColors.push(tint.r,tint.g,tint.b);
    if(j&&i){const k=j*97+i;landIndices.push(k-98,k-97,k,k-98,k,k-1);}
  }
  const terrain=new T.BufferGeometry();terrain.setAttribute('position',new T.Float32BufferAttribute(landPoints,3));terrain.setAttribute('color',new T.Float32BufferAttribute(landColors,3));
  terrain.setIndex(landIndices);terrain.computeVertexNormals();root.add(new T.Mesh(terrain,dishMat));
  // Hills have an open central depression. Individual limestone shoulders and tree clusters overlap its rim.
  for(let i=0;i<195;i++){
    const a=random.range(0,TAU),d=random.range(44,108),w=random.range(6,15);
    const h=random.range(7,21)*(d<48?.55:1);
    stamp(orb,random.pick(['#396957','#507d60','#618460','#507967','#769576']),Math.cos(a)*d,-3.7,centerZ+Math.sin(a)*d,w,h,w*.84,0,a);
  }
  for(let i=0;i<380;i++){
    const a=random.range(0,TAU),d=random.range(32,67),x=d*Math.cos(a),z=centerZ+d*Math.sin(a);
    if(x>-34&&x< -11&&z>15&&z<33)continue;
    const h=random.range(.6,2.2),tone=random.pick(['#477955','#688851','#628859','#77985f']);
    stamp(orb,tone,x,-.3+h*.45,z,h*1.3,h,h*1.12,0,a);
  }
  solid(-23,-.6,22,16,1.2,9,'#b89f75');
  solid(-16.55,4.7,18.9,1.15,9.4,1.9,colors.cream);
  solid(-14.05,11.4,18.4,1.45,22.8,1.8,colors.cream);
  solid(-16,10.45,19.15,4.1,.6,2,colors.teal);
  solid(-15.9,22.77,19.2,5.4,.46,3.7,colors.teal);
  const towers:LandmarkPoint[]=[[-15,23,19],[29,27,-8],[-15,26,-34]];
  for(const [x,y,z] of towers){
    if(z!==19) {stamp(tube,colors.cream,x,y/2-1,z,1.4,y+2,1.4);stamp(cube,colors.teal,x,y,z,3.8,1.2,3.1);}
    for(let j=1;j<y;j+=2.4){stamp(cube,colors.steel,x,j,z+.88,1.35,.11,.25);}
    for(const dx of [-.44,.44])rod([x+dx,.3,z+1.02],[x+dx,y,z+1.02],.055,colors.orange);
    for(let h=.6;h<y;h+=.46)rod([x-.45,h,z+1.06],[x+.45,h,z+1.06],.045,colors.silver);
    for(let k=-1;k<=1;k++){
      let prev:LandmarkPoint=[x+k*.58,y,z];
      for(let n=1;n<=16;n++){const t=n/16;const next:LandmarkPoint=[x*(1-t)+k*(.58+1.1*t),y+(15.6-y)*t-1.2*Math.sin(t*Math.PI),z+(centerZ-z)*t];rod(prev,next,.075,colors.steel);prev=next;}
    }
    rod([x,y+.4,z],[x*1.33,-1,centerZ+(z-centerZ)*1.35],.085,colors.steel);
    stamp(orb,colors.orange,x,y+1,z,.24,.32,.24);
  }
  const cable=route.find(l=>l.action==='slide')!;let prev=cable.start;
  for(let i=1;i<=32;i++){const p=pointOnLeg(cable,i/32,[0,0,0]);rod(prev,p,.15,'#e6b269');prev=p;}
  for(let i=0;i<8;i++){const t=i/8;stamp(cube,colors.orange,-27+9.3*t,.04,23-4*t,.32,.1,.18);}
  // The suspended receiver is recognisable by its triangular truss and long feed below it.
  solid(0,15.7,centerZ,6.8,.6,5.6,'#3f7071');
  const corners:LandmarkPoint[]=[[-4,15.7,centerZ+2.6],[4,15.7,centerZ+2.6],[0,15.7,centerZ-4.3]];
  for(let i=0;i<3;i++){
    const a=corners[i],b=corners[(i+1)%3];rod(a,b,.18,colors.silver);
    for(let n=0;n<8;n++){const t=n/8,s=(n+1)/8;const x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t;
      const nx=a[0]+(b[0]-a[0])*s,nz=a[2]+(b[2]-a[2])*s;rod([x,15.7,z],[nx,14.6,nz],.07,colors.cream);rod([x,14.6,z],[nx,14.6,nz],.1,colors.silver);}
    rod(a,[0,11,centerZ],.09,colors.steel);
  }
  stamp(tube,colors.cream,0,11.6,centerZ,1.1,2.1,1.1);rod([0,11,centerZ],[0,6.5,centerZ],.19,colors.orange);
  // Ceremony tents, folding chairs, a brass ensemble and palms beside the trailhead.
  const roof=new T.ConeGeometry(1,1,4), leaf=new T.SphereGeometry(1,5,3);
  for(let t=0;t<3;t++){
    const x=-31+t*5,z=28.4;stamp(roof,'#fff0d2',x,3,z,3.6,1.8,3.2,0,Math.PI/4);
    for(const dx of [-1.9,1.9])for(const dz of [-1.6,1.6])rod([x+dx,0,z+dz],[x+dx,2.6,z+dz],.055,colors.steel);
    for(let i=0;i<6;i++){const px=x+(i%3-1)*.75,pz=z+Math.floor(i/3)*.9;
      stamp(cube,'#a0744c',px,.5,pz,.5,.12,.52);stamp(orb,i%2?'#386e66':'#d49e55',px,1,pz,.27,.4,.24);
      stamp(orb,'#b9805f',px,1.48,pz,.21,.22,.2);if(t===0)stamp(roof,'#f6c16a',px+.22,1.18,pz+.22,.2,.45,.2,1,0,0);}
  }
  for(let i=0;i<105;i++){const a=random.range(0,TAU),d=random.range(32,63),x=d*Math.cos(a),z=centerZ+d*Math.sin(a);
    const h=random.range(3,6);rod([x,-1,z],[x+.3,h,z],.15,'#7e7955');
    for(let j=0;j<6;j++){const phi=TAU*j/6+a;stamp(leaf,random.pick(['#306951','#59865a','#73a367']),x+.3+1.1*Math.cos(phi),h+.28,z+1.1*Math.sin(phi),1.8,.22,.45,0,-phi,.16);}
  }
  // Period electronics: twin open reel drives, amber pilot lamps, line printer and perforations.
  for(let i=0;i<2;i++){
    const x=-2.1+i*1.12;stamp(cube,colors.cream,x,17.1,-7.6,1,2.2,.68);
    stamp(cube,colors.teal,x,17.5,-7.24,.88,1.1,.05);
    for(const dx of [-.23,.23]){stamp(tube,'#b3c2ad',x+dx,17.65,-7.16,.2,.08,.2,Math.PI/2);
      stamp(tube,'#364f55',x+dx,17.65,-7.09,.074,.08,.074,Math.PI/2);}
    for(let j=0;j<5;j++)stamp(cube,j%2?colors.orange:'#ebdfab',x-.32+j*.16,16.91,-7.17,.085,.08,.08);
  }
  stamp(cube,'#99aa92',1.8,16.55,-7.5,1.6,1.1,.86);stamp(cube,'#fbebc2',1.8,17.14,-7.2,1,.045,.78);
  for(let i=0;i<24;i++)stamp(cube,colors.steel,1.4+(i%8)*.105,17.174,-7.4+Math.floor(i/8)*.14,.04,.015,.06);
  const reel=new T.Mesh(new T.CylinderGeometry(.24,.24,.38,16),stage.toon('#f9c867'));reel.position.set(-18.2,23.45,19.7);reel.rotation.z=1.2;root.add(reel);
  const swatch=new T.Color();
  for(const [geometry,batch] of groups) {
    const mesh=new T.InstancedMesh(geometry,stage.toon('#ffffff'),batch.colors.length);mesh.name='scenery-fx';
    batch.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,swatch.set(batch.colors[i]));});root.add(mesh);
  }
  const frogs=Array.from({length:4},(_,i)=>spawnCritter(CRITTER_KINDS.find(k=>k.id==='critter-frog')!,[-27+i*1.2,25.5]));
  const frogLights=frogs.map(()=>{const fx=stage.glow('#c9fa98',.38,.9);root.add(fx);return fx;});
  const stalker={pos:[0,0] as [number,number],speed:0,spread:0};
  const beam=new T.Mesh(new T.CylinderGeometry(.18,1.4,90,24,1,true),new T.MeshBasicMaterial({color:'#c1fff0',transparent:true,opacity:.46,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));
  beam.position.set(0,34,centerZ);beam.layers.set(1);root.add(beam);beam.visible=false;
  const stars:number[]=[]; for(let i=0;i<750;i++){const a=random.range(0,TAU),h=random.range(-.6,1),r=Math.sqrt(1-h*h);stars.push(115*r*Math.cos(a),115*h,115*r*Math.sin(a));}
  const starGeo=new T.BufferGeometry();starGeo.setAttribute('position',new T.Float32BufferAttribute(stars,3));
  const starMat=new T.PointsMaterial({color:'#fff5cf',size:.3,fog:false,transparent:true,opacity:.48});
  const skyStars=new T.Points(starGeo,starMat);skyStars.layers.set(1);stage.scene.add(skyStars);
  const earth=new T.Mesh(new T.SphereGeometry(7,64,32),new T.MeshLambertMaterial({map:earthTexture(),fog:false}));earth.position.set(0,71,-6);stage.scene.add(earth);earth.visible=false;
  const glow=stage.glow('#8ee5ff',21,.88);glow.position.copy(earth.position);stage.scene.add(glow);glow.visible=false;
  const pulseData=new Float32Array(72*3), pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pulseData,3));
  const pulse=new T.Points(pg,new T.PointsMaterial({color:'#fff8be',size:.36,transparent:true,blending:T.AdditiveBlending}));pulse.frustumCulled=false;pulse.visible=false;pulse.layers.set(1);stage.scene.add(pulse);
  function update(time:number,dt:number,p:LandmarkPoint,finish:number) {
    stalker.pos[0]=p[0];stalker.pos[1]=p[2];
    frogs.forEach((f,i)=>{stepCritter(f,stalker,dt,random.next);frogLights[i].position.set(f.pos[0],.35+.18*Math.abs(Math.sin(time*1.4+i)),f.pos[1]);});
    reel.rotation.y=time*1.4;beam.visible=finish>=0&&finish<4.5;pulse.visible=finish>=0;
    if(finish>=0){
      const dusk=Math.min(1,finish/1.6);
      if(sky){sky.material.uniforms.uTop.value.lerpColors(duskTop,nightTop,dusk);sky.material.uniforms.uHorizon.value.lerpColors(duskHorizon,nightHorizon,dusk);}
      stage.scene.fog.color.lerpColors(duskHorizon,nightHorizon,dusk);starMat.opacity=.48+.52*dusk;
      for(let i=0;i<72;i++){const v=(finish*.24+i/72)%1;const a=i*2.4+finish*2;
        pulseData[3*i]=Math.cos(a)*(.2+v*1.8);pulseData[3*i+1]=15+v*65;pulseData[3*i+2]=centerZ+Math.sin(a)*(.2+v*1.8);}
      pg.attributes.position.needsUpdate=true;
      if(finish>3.8){
        if(!earth.visible){if(sky)sky.visible=false;root.visible=false;earth.visible=true;glow.visible=true;skyStars.position.y=70;
          stage.scene.background=new T.Color('#081628');stage.sun.position.set(-18,81,7);stage.sun.target.position.copy(earth.position);}
        earth.rotation.y=-1.6+finish*.045;
      }
    }
  }
  return {root,solids,update,reel};
}
