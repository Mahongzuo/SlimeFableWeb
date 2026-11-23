import * as T from 'three';
import {editions} from '../../content/atlas';
import type {AtlasSpec} from '../../content/levels/types';
import type {Stage,StageLook} from '../level/stage';
import {curve,laneWidth,targetX,type Course,type Run} from '../templates/atlas';
import {rng} from '../templates/random';

const cream='#ffe7b7',brass='#cc9056',steel='#364451',jade='#75d6be';
export function atlasLook(spec:AtlasSpec):StageLook{
  const [dark,accent]=editions[spec.kind].colors;
  const horizon={orbit:'#666792',score:'#be8985',atelier:'#b9a3aa',race:'#93b8ad',field:'#9dc7ae',span:'#c3a590',flight:'#8ea9bc',ink:'#c6a89a',signal:'#9ca9ba'}[spec.kind];
  return {skyTop:dark,skyHorizon:horizon,fog:[28,105],sun:cream,sunIntensity:2.25,hemiSky:'#fff7ed',hemiGround:dark,ink:dark,wash:accent};
}
const solids={box:new T.BoxGeometry(1,1,1),drum:new T.CylinderGeometry(1,1,1,24),cone:new T.ConeGeometry(1,1,24),ball:new T.SphereGeometry(1,24,14),ring:new T.TorusGeometry(1,.048,8,64),gem:new T.OctahedronGeometry(1),rock:new T.IcosahedronGeometry(1,0)};
type Form=keyof typeof solids;
const solid=new T.MeshStandardMaterial({roughness:.58,metalness:.18});
const luminous=new T.MeshBasicMaterial();
function kit(parent:any){
  const groups=new Map<string,{form:Form,lit:boolean,mats:any[],colors:string[]}>(),helper=new T.Object3D();
  function part(form:Form,color:string,x:number,y:number,z:number,w:number,h:number,d:number,rx=0,ry=0,rz=0,lit=false){
    const k=form+lit;
    if(!groups.has(k))groups.set(k,{form,lit,mats:[],colors:[]});
    helper.position.set(x,y,z);helper.rotation.set(rx,ry,rz);helper.scale.set(w,h,d);helper.updateMatrix();
    const batch=groups.get(k)!;batch.mats.push(helper.matrix.clone());batch.colors.push(color);
  }
  function box(c:string,x:number,y:number,z:number,w:number,h:number,d:number,lit=false){part('box',c,x,y,z,w,h,d,0,0,0,lit);}
  function ring(c:string,x:number,y:number,z:number,r:number,rx=0,ry=0,lit=false){part('ring',c,x,y,z,r,r,r,rx,ry,0,lit);}
  function rod(c:string,from:number[],to:number[],radius:number){
    const a=new T.Vector3(...from),b=new T.Vector3(...to),v=b.clone().sub(a),length=v.length();
    const rot=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));
    part('drum',c,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,radius,length,radius,rot.x,rot.y,rot.z);
  }
  function flush(){for(const b of groups.values()){
    const mesh=new T.InstancedMesh(solids[b.form],b.lit?luminous:solid,b.mats.length);
    b.mats.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,new T.Color(b.colors[i]));});
    mesh.receiveShadow=!b.lit;mesh.castShadow=!b.lit;parent.add(mesh);
  }groups.clear();}
  return {part,box,ring,rod,flush};
}
export function buildAtlas(stage:Stage,spec:AtlasSpec,course:Course){
  const [dark,accent]=editions[spec.kind].colors,r=rng(spec.id+'-art'),kind=spec.kind;
  const seal=spec.id==='0101-1864',returning=spec.id==='0928-2008',moonLanding=spec.id==='0720-1969';
  const scenery=kit(stage.scene),hero=new T.Group(),moving=new T.Group();stage.scene.add(hero);hero.add(moving);
  hero.position.set(curve(course.finish,course.phase),0,-course.finish-6);
  const fixed=kit(hero),anim=kit(moving);
  const pathX=(s:number)=>curve(s,course.phase);
  // Each slice's four corners are shared by physics and the curved lane markings.
  const path=new T.BufferGeometry(),positions:number[]=[],indices:number[]=[],colors:number[]=[];
  const order=[-3.4,-3.28,-3.09,-2.99,-.84,-.81,.81,.84,2.99,3.09,3.28,3.4];
  const road=kind==='score'?'#726267':kind==='race'?'#516369':kind==='field'?'#b87a67':kind==='orbit'?'#5c6783':kind==='atelier'?'#c9ad9d':'#8c8781';
  const runLength=Math.ceil(course.finish)+9;
  for(let s=-9;s<runLength;s++){
    for(let j=0;j<order.length-1;j++){
      const edge=j===1||j===9,line=j===4||j===6;
      const color=new T.Color(edge?(s%4<2?cream:accent):line&&s%4===0?'#d4d3bf':j===0||j===10?brass:road);
      const base=positions.length/3;
      for(const [ss,xx] of [[s,order[j]],[s,order[j+1]],[s+1,order[j+1]],[s+1,order[j]]]){
        positions.push(pathX(ss)+xx,.005,-ss);colors.push(color.r,color.g,color.b);
      }
      indices.push(base,base+1,base+2,base,base+2,base+3);
    }
    if((s+12)%3===0)for(const sign of [-1,1]){
      const x=pathX(s)+sign*3.75;scenery.box(steel,x,-.33,-s,.4,.8,.9);
      scenery.box(accent,x,.14,-s,.22,.11,.5,true);
      if(s%2===0){scenery.part('drum',brass,x,-3,-s,.25,5,.25);scenery.rod(steel,[x,-1,-s],[x,-3,-s-3],.1);}
    }
  }
  path.setAttribute('position',new T.Float32BufferAttribute(positions,3));path.setAttribute('color',new T.Float32BufferAttribute(colors,3));path.setIndex(indices);path.computeVertexNormals();
  const deck=new T.Mesh(path,new T.MeshStandardMaterial({vertexColors:true,roughness:.71}));deck.receiveShadow=true;stage.scene.add(deck);
  for(let i=0;i<110;i++){
    const side=i%2?1:-1,s=r.range(-12,runLength+25),x=side*r.range(9,33),h=r.range(1.5,10);
    if(kind==='orbit'||kind==='flight')scenery.part('rock',i%3?'#79879f':'#a9a9b8',x,-5,-s,h*.78,h*.7,h,0,r.range(-3,3));
    else if(kind==='field'||kind==='span'){scenery.part('rock',i%3?'#82928f':'#a4ac92',x,-3,-s,h,h*.62,h*.85,0,r.range(-3,3));}
    else{scenery.box(i%3?'#7e8287':'#9f9191',x,h*.5-5,-s,2.7,h,2.9);for(let k=0;k<3;k++)scenery.box(cream,x-side*1.37,h*.37-3+k*.7,-s,.05,.21,1.1,true);}
  }
  // Foreground props declare the discipline even while the distant landmark is out of view.
  for(let i=0;i<12;i++){
    const s=i*4.3-1,x=pathX(s)+(i%2?1:-1)*5.1;
    if(kind==='score'){for(let n=0;n<4;n++)scenery.rod(n%2?brass:cream,[x+n*.17,0,-s],[x+n*.17,1+Math.sin(i+n)**2,-s],.07);}
    else if(kind==='ink'||kind==='atelier'){scenery.box(brass,x,.84,-s,1.45,1.5,.16);scenery.box(i%2?accent:cream,x,.84,-s+.11,1.24,1.25,.1);scenery.part('gem',dark,x,1,-s+.18,.3,.42,.06,0,0,i);}
    else if(kind==='race'||kind==='field'){for(let n=0;n<3;n++)scenery.box(n%2?dark:accent,x+(n-1)*.44,1+n*.11,-s,.4,.32,.55);scenery.rod(steel,[x,0,-s],[x,1.2,-s],.08);}
    else{scenery.part('drum',steel,x,.48,-s,.18,.96,.18);scenery.ring(accent,x,1.35,-s,.41,0,i*.19);scenery.part('ball',cream,x,1.35,-s,.1,.1,.1);}
  }
  // Landmarks along the road keep the subject visible from the starting camera.
  for(let station=0;station<5;station++){
    const s=4+station*9,x=pathX(s),z=-s,side=station%2?-1:1;
    if(kind==='score'||kind==='orbit'){
      const y=kind==='orbit'?2:2.7;
      for(let n=0;n<2;n++)scenery.ring(n?accent:brass,x,y,z-n*.3,4.5+n*.13,.15,n*.11,n===1);
      if(kind==='score')for(let n=0;n<5;n++)scenery.rod(cream,[x+side*4.9,1+n*.16,z],[x+side*4.9,1+n*.16,z-5],.035);
    }else if(kind==='race'||kind==='field'){
      for(let tier=0;tier<3;tier++){scenery.box(steel,x+side*(6+tier*.8),.55+tier*.5,z,1.1,.37,6);
        for(let j=0;j<8;j++)scenery.box(j%3?accent:cream,x+side*(6+tier*.8),.84+tier*.5,z-2.55+j*.72,.54,.24,.5);}
    }else if(kind==='span'){
      for(const dir of [-1,1]){scenery.rod(brass,[x+dir*3.9,0,z],[x+dir*2.5,4.5,z],.15);
        scenery.rod(accent,[x+dir*3.9,.3,z],[x+dir*3.9,2.6,z-4],.095);}
      scenery.rod(cream,[x-2.55,4.5,z],[x+2.55,4.5,z],.13);
    }else if(kind==='atelier'||kind==='ink'){
      const ox=x+side*4.65;
      if(seal){
        scenery.box('#985046',ox,.53,z,.94,1,.87);scenery.box('#c2a683',ox,.09,z,1.2,.16,1.06);
        scenery.part('rock','#9bafa2',ox,1.32,z,.6,.5,.49,0,station);
        for(let j=0;j<6;j++)scenery.box(cream,ox+(j%3-1)*.18,.32+Math.floor(j/3)*.29,z+.45,.09,j%2?.24:.13,.025);
      }else{
        scenery.part('box',cream,ox,1.24,z,1.8,2.45,.14,0,side*.3,side*.05);
        for(let j=0;j<9;j++)scenery.box(j%4===0?accent:dark,ox+(j%3-1)*.37,1.9-Math.floor(j/3)*.45,z+.16,.21+j%3*.1,.07,.03);
      }
    }else{
      for(const dir of [-1,1]){scenery.rod(steel,[x+dir*4.55,0,z],[x+dir*4.55,3.1,z],.09);
        for(let j=0;j<4;j++)scenery.ring(accent,x+dir*4.55,2.6+j*.14,z,.28,Math.PI/2);}
      scenery.rod(brass,[x-4.55,3.06,z],[x+4.55,3.06,z],.035);
    }
  }
  scenery.flush();
  // Keep the pedestal radius and elevations distinct from the road at y=.005,
  // including when the player first sees its silhouette from the far end.
  fixed.part('drum',steel,0,-.45,0,5.6,.82,4.2);fixed.part('drum',brass,0,.025,0,5.35,.17,4);
  if(kind==='score'){
    for(let i=-9;i<=9;i++){const h=3.5+.75*Math.cos(i*.7)+3*(Math.abs(i)/9)**1.5;
      fixed.part('drum',i%3?brass:cream,i*.43,h/2,0,.2,h,.2);
      fixed.box(dark,i*.43,h-.33,.2,.15,.24,.04);}
    for(let i=0;i<22;i++){anim.box(cream,i*.35-3.7,.52,1.35,.325,.48,1.45);
      if(![2,6].includes(i%7))anim.box(steel,i*.35-3.54,.82,1.03,.16,.2,.8);}
    fixed.ring(accent,0,4.9,-.3,2.3,0,0,true);
  }else if(kind==='orbit'){
    fixed.part('drum',brass,0,.6,0,2.5,1.2,2.5);fixed.rod(steel,[-2,.5,0],[-1,4.3,0],.18);fixed.rod(steel,[2,.5,0],[1,4.3,0],.18);
    fixed.part('ball',spec.fact.includes('月食')?'#e69c82':'#ffe1a0',0,4.4,0,1.58,1.58,1.58,0,0,0,true);
    for(let n=0;n<3;n++)fixed.ring(n===0?cream:brass,0,4.4,0,2.25+n*.31,.36*n,n*.53,n===0);
    anim.part('ball','#52627f',0,4.4,2.1,1.29,1.29,1.29);
  }else if(kind==='race'||kind==='field'){
    for(const side of [-1,1])fixed.rod(steel,[side*3,0,0],[side*3,4.8,0],.24);
    fixed.box(dark,0,4.7,0,7.3,1.45,.65);
    if(kind==='race'){for(let i=0;i<14;i++)for(let j=0;j<2;j++)fixed.box((i+j)%2?cream:steel,(i-6.5)*.46,4.4+j*.48,.4,.45,.45,.12);
      anim.box(accent,0,.85,1,2.9,.57,1.3);anim.part('ball',steel,0,1.2,1,.56,.4,.5);
      for(const x of [-1.15,1.15])for(const z of [.27,1.73])anim.part('drum',dark,x,.56,z,.44,.33,.44,Math.PI/2);
    }else{fixed.part('cone',brass,0,2.8,0,1.5,3,1.5,Math.PI);for(let i=0;i<9;i++)anim.part('gem',i%2?cream:accent,Math.cos(i)*.72,4+Math.sin(i)*.4,Math.sin(i)*.6,.25,1.15,.25,0,0,.22*Math.cos(i));}
  }else if(returning){
    anim.part('ball','#865a49',0,1.6,0,1.15,1.07,1.15);anim.part('drum',steel,0,1.07,0,1.14,.43,1.14);
    for(let j=0;j<12;j++){const a=j*Math.PI/6,px=2.55*Math.cos(a),pz=2.55*Math.sin(a);
      anim.part('ball',j%2?cream:'#d47d59',px,6.7,pz,.82,.55,.82);
      anim.rod(cream,[px,6.4,pz],[px*.2,2.55,pz*.2],.025);}
    anim.part('ball','#d78d69',0,6.95,0,2.55,.86,2.55);
    for(let j=0;j<18;j++)fixed.part('rock',j%2?'#8b9c60':'#a29b64',r.range(-4,4),.28,r.range(-3,3),.35,.28,.35);
  }else if(moonLanding){
    anim.box('#bca065',0,1.52,0,1.85,1.28,1.85);anim.part('rock',cream,0,2.91,0,1.17,1.08,1.02);
    anim.ring(brass,.7,3.83,0,.48,0,.47);
    for(let j=0;j<4;j++){const a=j*Math.PI/2+.6,x=Math.cos(a),z=Math.sin(a);
      anim.rod(brass,[x*.76,1.57,z*.76],[x*1.9,.36,z*1.9],.087);anim.part('drum',brass,x*1.9,.25,z*1.9,.39,.13,.39);}
  }else if(kind==='flight'){
    anim.part('drum',cream,0,3.05,0,.85,5.9,.85);anim.part('cone',cream,0,6.75,0,.85,1.6,.85);
    for(const h of [1.2,3.6,5.8])anim.part('drum',steel,0,h,0,.86,.43,.86);
    for(const x of [-1,1]){anim.part('drum','#d3a17d',x,1.9,0,.35,3.5,.35);anim.part('cone',cream,x,3.98,0,.35,.66,.35);}
    for(let n=0;n<6;n++){fixed.box(brass,-2.4,n+.54,0,.19,1,.19);fixed.rod(steel,[-2.4,n,0],[-3.5,n+1,0],.09);fixed.box(cream,-2.9,n+.9,0,1.45,.12,1.15);}
  }else if(kind==='span'){
    for(let n=0;n<12;n++)for(const side of [-1,1]){const x=-4.8+n*.8,z=side*1.1,h=1.1+3.5*Math.sin(n*Math.PI/12),end=1.1+3.5*Math.sin((n+1)*Math.PI/12);
      fixed.rod(accent,[x,h,z],[x+.8,end,z],.13);fixed.rod(brass,[x,.76,z],[x,h,z],.07);fixed.rod(steel,[x,.76,z],[x+.8,end,z],.06);}
    anim.box(cream,0,.76,0,10,.32,2.7);
  }else if(kind==='signal'){
    for(const x of [-2.4,2.4]){fixed.part('drum',steel,x,1.9,0,.36,3.7,.36);for(let n=0;n<7;n++)fixed.ring(brass,x,.64+n*.44,0,.83,Math.PI/2);}
    fixed.ring(accent,0,3.8,0,1.76,0,0,true);anim.rod(cream,[0,0,0],[1,1,0],.13);moving.position.set(0,3.8,0);
  }else if(kind==='ink'){
    for(const x of [-2.55,2.55])fixed.box(brass,x,2.2,0,.5,4.4,2.5);
    fixed.box(steel,0,4.18,0,5.75,.65,2.6);fixed.part('drum',brass,0,3.3,0,.29,2,.29);anim.box('#bd7869',0,2.3,0,4.5,.4,2.2);fixed.box(cream,0,1.1,.2,4.7,.2,2.6);
    for(let i=0;i<20;i++)fixed.box(i%3?steel:brass,(i%10-4.5)*.37,1.29,.48+Math.floor(i/10)*.45,.29,.15,.32);
  }else if(seal){
    fixed.box('#82473d',0,.38,0,5.45,.7,3.95);fixed.box('#d6b886',0,.79,0,5.3,.14,3.8);
    anim.box('#a85648',0,2.08,0,1.98,2.4,1.96);anim.part('rock','#98afa1',0,3.92,0,1.32,1.07,1.15,0,.6);
    for(let j=0;j<16;j++)anim.box(cream,(j%4-1.5)*.36,1.4+Math.floor(j/4)*.4,1,.1,.17+(j%3)*.07,.05);
    fixed.box(cream,1.72,1,.5,1.32,.12,2.4);fixed.box('#ad5548',1.71,1.08,.5,.81,.05,.84);
  }else{
    for(let panel=-1;panel<=1;panel++){const x=panel*2.87,y=panel===0?3.65:2.65;
      fixed.box(brass,x,y-.1,0,2.85,4,.27);fixed.box(cream,x,y-.1,.18,2.5,3.65,.11);
      for(let i=0;i<12;i++){const c=[dark,'#d68470',jade,'#d1a453'][i%4];anim.part(i%2?'box':'ball',c,x+r.range(-.72,.72),y+r.range(-1.2,1.2),.28+i*.013,r.range(.24,.8),r.range(.18,.59),.032,0,0,r.range(-.9,.9));}
      fixed.rod(steel,[x-.67,0,0],[x,2,0],.08);fixed.rod(steel,[x+.67,0,0],[x,2,0],.08);}
  }
  fixed.flush();anim.flush();
  const jewels:any[]=[],gates:any[]=[];
  for(const [i,g] of course.gates.entries()){
    const group=new T.Group(),k=kit(group);stage.scene.add(group);gates.push(group);
    for(const xx of (g.sign==='fork'?[-laneWidth,laneWidth]:[0])){
      const c=g.sign==='leap'?'#ffae76':g.sign==='fold'?'#97ead3':'#ffe0a1';
      k.part('ring',c,xx,.07,0,.82,.6,.82,Math.PI/2,0,0,true);
      if(g.sign==='leap'||g.sign==='fold'){
        const h=g.sign==='fold'?.86:.34;k.box(c,xx,h,0,1.91,.13,.22,true);
        for(const s of [-1,1]){k.box(steel,xx+.94*s,h*.5,0,.14,h,.16);k.part('gem',c,xx+.94*s,h+.1,0,.15,.18,.15);}
        if(g.sign==='fold')for(let j=-2;j<=2;j++)k.box(j%2?cream:jade,xx+j*.29,h+.24,0,.22,.27,.13);
      }else{for(const s of [-1,1]){k.part('gem',c,xx+.82*s,.43,0,.15,.43,.15);k.box(cream,xx+s*.57,.06,0,.24,.07,.6);}}
    }k.flush();
    const gem=new T.Mesh(solids.gem,new T.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.68,metalness:.4,roughness:.25}));
    gem.scale.set(.17,.29,.17);gem.position.set(pathX(g.distance-3.1)+g.jewelLane*laneWidth,.53,-g.distance+3.1);stage.scene.add(gem);jewels.push(gem);
  }
  const count=390,coords=new Float32Array(count*3),base=new Float32Array(count*3);
  for(let i=0;i<count;i++){base[i*3]=r.range(-23,23);base[i*3+1]=r.range(.45,16);base[i*3+2]=r.range(-runLength-12,3);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(coords,3));const dust=new T.Points(geo,new T.PointsMaterial({color:cream,transparent:true,opacity:.75,size:.066,depthWrite:false,blending:T.AdditiveBlending}));dust.frustumCulled=false;stage.scene.add(dust);
  // A ribbon unwinds round the date's landmark for the player's final action.
  const ribbon=new T.Group();hero.add(ribbon);const rk=kit(ribbon);
  for(let i=0;i<90;i++){const a=i*.27,radius=2.4+i*.025;rk.part('gem',i%4?accent:cream,Math.cos(a)*radius,.5+i*.068,Math.sin(a)*radius,.08,.14,.08,0,a,0,true);}rk.flush();
  function paint(run:Run,time:number,finale:number){
    course.gates.forEach((g,i)=>{const group=gates[i];group.visible=i>=run.index;
      group.position.set(pathX(g.distance)+(g.sign==='fork'?0:targetX(g,run.time)),0,-g.distance);
      jewels[i].visible=!run.collected.has(i)&&i>=run.index;jewels[i].rotation.y=time*2.5+i;jewels[i].position.y=.57+.1*Math.sin(time*2+i);});
    const f=Math.min(1,finale/2);ribbon.visible=finale>0;ribbon.scale.setScalar(.15+.85*f);ribbon.rotation.y=finale*.56;
    if(kind==='orbit')moving.position.x=(1-f)*2.72*Math.cos(time*.45);
    if(kind==='flight')moving.position.y=returning||moonLanding?(1-f)*(1.1+.2*Math.sin(time)):f*f*5.6;
    if(kind==='score'||kind==='ink')moving.position.y=(kind==='ink'?-.54:.14)*Math.sin(time*(finale>0?5:1.5))**2;
    if(kind==='race')moving.position.x=Math.sin(time*.8)*1.7*(1-f);
    if(kind==='signal')moving.rotation.z=Math.sin(time*(1+f*3))*.72;
    if(kind==='span')moving.position.y=.65*(1-f);
    if(kind==='field')moving.scale.y=1+.13*Math.sin(time*4)+f*.35;
    if(kind==='atelier')moving.position.z=.1+.18*f+.05*Math.sin(time);
    for(let i=0;i<count;i++){const k=i*3;coords[k]=base[k]+.46*Math.sin(time*.36+i);coords[k+1]=base[k+1]+.35*Math.sin(time*.52+i);coords[k+2]=base[k+2];}
    geo.attributes.position.needsUpdate=true;
  }
  return {paint,hero};
}
