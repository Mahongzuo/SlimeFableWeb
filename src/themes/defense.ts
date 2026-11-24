import * as T from 'three';
import {Stage,type StageLook} from '../level/stage';
import {SlimeCharacter} from '../slime/character';
import type {DefenseGame,TileMod,TowerKind} from '../templates/defense';
import {Kit} from './folio-landmarks';
import {rng} from '../templates/random';
import message1974 from '../../content/levels/1116-1974';

// The playable signal lanes, creatures and transfer apparatus are a fictional control-room diorama.
const look:StageLook={skyTop:'#172946',skyHorizon:'#83a39a',fog:[20,65],sun:'#fff1ce',sunIntensity:1.74,
 hemiSky:'#d6f1f3',hemiGround:'#879797',ink:'#203b44',wash:'#8da9a1'};
const CW=1.55,CD=1.43,W=8*CW,D=5*CD,top=.025;
const dark='#263f4b',teal='#578b85',ivory='#e8dfb8',copper='#b99865',brass='#edbd77';
const xpos=(cell:number)=>(cell-4)*CW,zpos=(lane:number)=>(lane-2)*CD;
type V=[number,number,number];
const indexColors=['#72d7e2','#87db9e','#ffab71','#c4a3f6','#d393d2'];

export function defenseCellWorld(lane:number,colX:number,y=.68):V{
 return [xpos(colX),y,zpos(lane)];
}

function paperTexture(w:number,h:number,paint:(g:CanvasRenderingContext2D)=>void){
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const g=c.getContext('2d')!;paint(g);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function boardMaterial(stage:Stage,tiles:readonly TileMod[]){
 const texture=paperTexture(1280,760,g=>{
  g.fillStyle='#345357';g.fillRect(0,0,1280,760);
  const rand=rng('relay enamel');
  for(let y=0;y<5;y++)for(let x=0;x<8;x++){
   const l=x*160+4,t=y*152+4,w=152,h=144;
   const mod=tiles.find(tm=>tm.lane===y&&tm.col===x)?.kind;
   g.fillStyle='#1e3e45';g.beginPath();g.roundRect(l,t,w,h,11);g.fill();
   const enamel=g.createLinearGradient(l,t,l+w*.75,t+h);
   if(mod==='amp'){enamel.addColorStop(0,'#b89d60');enamel.addColorStop(1,'#7d6b42');}
   else if(mod==='chill'){enamel.addColorStop(0,'#69a9bd');enamel.addColorStop(1,'#3f738a');}
   else if(mod==='spring'){enamel.addColorStop(0,'#63b096');enamel.addColorStop(1,'#3a7c6c');}
   else{enamel.addColorStop(0,(x+y)%2?'#8bb5ab':'#709c9d');enamel.addColorStop(1,(x+y)%2?'#598a88':'#507d83');}
   g.fillStyle=enamel;g.beginPath();g.roundRect(l+1.8,t+1,w-3.6,h-5,9);g.fill();
   g.strokeStyle=mod==='amp'?'#ffe49699':mod==='chill'?'#baf2ff99':mod==='spring'?'#b5ffd899':'#b1c0a777';
   g.lineWidth=mod?3:2.1;g.beginPath();g.moveTo(l+13,t+10);g.lineTo(l+w-15,t+10);g.stroke();
   g.strokeStyle='#24495244';g.setLineDash([6,7]);g.beginPath();g.moveTo(l,t+h*.66);g.lineTo(l+w,t+h*.66);g.stroke();g.setLineDash([]);
   g.strokeStyle=mod==='amp'?'#fff0b5bb':mod==='chill'?'#cff8ffbb':mod==='spring'?'#c9ffe0bb':'#d3ccb067';
   g.lineWidth=mod?2.5:1.5;g.beginPath();g.ellipse(l+w*.5,t+h*.50,32,29,0,0,Math.PI*2);g.stroke();
   if(mod==='amp'){
    g.strokeStyle='#ffe79c';g.lineWidth=2.5;
    g.beginPath();g.moveTo(l+w*.5,t+h*.5-22);g.lineTo(l+w*.5+20,t+h*.5);g.lineTo(l+w*.5,t+h*.5+22);g.lineTo(l+w*.5-20,t+h*.5);g.closePath();g.stroke();
    g.fillStyle='#fff4cc';g.font='bold 15px sans-serif';g.textAlign='center';g.fillText('⚡增幅',l+w*.5,t+h-13);g.textAlign='left';
   }else if(mod==='chill'){
    g.strokeStyle='#d4f8ff';g.lineWidth=2;
    for(let a=0;a<3;a++){const r=a*Math.PI/3;g.beginPath();g.moveTo(l+w*.5-Math.cos(r)*19,t+h*.5-Math.sin(r)*17);g.lineTo(l+w*.5+Math.cos(r)*19,t+h*.5+Math.sin(r)*17);g.stroke();}
    g.fillStyle='#e2fbff';g.font='bold 15px sans-serif';g.textAlign='center';g.fillText('❄液冷',l+w*.5,t+h-13);g.textAlign='left';
   }else if(mod==='spring'){
    g.strokeStyle='#c9ffe0';g.lineWidth=2.2;g.beginPath();g.ellipse(l+w*.5,t+h*.5,20,18,0,0,Math.PI*2);g.stroke();
    g.fillStyle='#dcffec';g.font='bold 15px sans-serif';g.textAlign='center';g.fillText('✧泉眼',l+w*.5,t+h-13);g.textAlign='left';
   }
   if(x===0){g.fillStyle='#e6dfb5';g.font='bold 19px monospace';g.fillText(String(y+1).padStart(2,'0'),l+16,t+31);}
   for(let i=0;i<8;i++){const a=i*Math.PI/4;g.strokeStyle='#d8d9b88f';g.beginPath();g.moveTo(l+w/2+Math.cos(a)*36,t+h*.5+Math.sin(a)*32);g.lineTo(l+w/2+Math.cos(a)*41,t+h*.5+Math.sin(a)*37);g.stroke();}
   for(const dx of [-1,1])for(const dy of [-1,1]){
    const px=l+w/2+dx*(w*.5-10),py=t+h/2+dy*(h*.5-12);g.fillStyle='#466567';g.beginPath();g.arc(px,py,2.3,0,Math.PI*2);g.fill();
   }
   for(let i=0;i<26;i++){g.fillStyle=rand.next()>.4?'#e5daca18':'#2a51481b';g.fillRect(l+rand.range(8,w-9),t+rand.range(7,h-7),rand.range(.5,2.1),1);}
  }
 });
 return stage.toon('#fff',{map:texture});
}
function scenery(stage:Stage,tiles:readonly TileMod[]){
 const root=new T.Group();stage.scene.add(root);
 const toon=stage.toon('#fff'),glow=new T.MeshBasicMaterial({color:0xffffff});
 const k=new Kit({toon,glow,lit:toon,lamp:glow,glass:toon},'arecibo 1974 signal station');
 const rand=rng('karst beneath the transmitter');
 // The deck is a single painted face with integral sockets, grooves and engraved locator marks.
 const deck=new T.Mesh(new T.BoxGeometry(W,.34,D),[toon,toon,boardMaterial(stage,tiles),toon,toon,toon]);
 deck.position.y=top-.17;deck.receiveShadow=true;root.add(deck);
 for(const s of [-1,1]){
  k.box(root,dark,0,-.16,s*(D/2+.135),W+.55,.39,.27);
  k.box(root,copper,0,.045,s*(D/2+.165),W+.55,.041,.062);
  k.box(root,dark,s*(W/2+.14),-.15,0,.28,.35,D);
  for(let i=0;i<13;i++)k.box(root,'#73877f',-W/2+.26+i*.97,-.15,s*(D/2+.278),.62,.13,.025);
 }
 const foundation=k.group(root,0,-.50,0);
 k.box(foundation,'#506760',0,-.1,0,W+1.32,.32,D+1.22);
 for(const x of [-5.55,5.55])for(const z of [-2.8,2.8])k.box(root,'#5d655d',x,-.98,z,.87,.72,.93);
 for(let i=0;i<5;i++){
  const z=zpos(i),c=indexColors[i];
  k.box(root,'#486267',-W/2-.34,-.02,z,.4,.29,.79);
  k.box(root,c,-W/2-.36,.145,z,.26,.05,.40,0,'glow');
  k.box(root,dark,W/2+.40,-.095,z,.55,.24,.44);
  for(const dz of [-.14,.14])k.box(root,brass,W/2+.39,.03,z+dz,.39,.06,.06);
 }
 // Across the valley a spherical reflector, its radial panel seams and its three suspended cable runs.
 const cx=-2.0,cz=-8.1,radius=4.25;
 const points:number[]=[],shades:number[]=[],indices:number[]=[],uvs:number[]=[];
 const sphere=(radius*radius+1.26**2)/(2*1.26);
 function surface(rad:number,a:number):V{return [cx+Math.cos(a)*rad,-.75+sphere-Math.sqrt(sphere*sphere-rad*rad),cz+Math.sin(a)*rad];}
 for(let ring=0;ring<9;ring++)for(let j=0;j<64;j++){
  const a=j*Math.PI/32,b=(j+1)*Math.PI/32,ri=radius*ring/9,ro=radius*(ring+1)/9;
  const color=new T.Color(rand.pick(['#c3d8d7','#cbded8','#bdcecd','#ccdad7'])),id=points.length/3;
  for(const p of [surface(ri,a),surface(ri,b),surface(ro,b),surface(ro,a)]){points.push(...p);shades.push(color.r,color.g,color.b);}
  uvs.push(0,0,1,0,1,1,0,1);indices.push(id,id+1,id+2,id,id+2,id+3);
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setAttribute('color',new T.Float32BufferAttribute(shades,3));geo.setIndex(indices);geo.computeVertexNormals();
 geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 const wire=paperTexture(64,64,g=>{
  g.fillStyle='#f5f6ee';g.fillRect(0,0,64,64);g.fillStyle='#879a96';g.fillRect(0,0,1.6,64);g.fillRect(0,0,64,1.6);g.fillStyle='#bdc7bd';
  for(let i=8;i<64;i+=8){g.fillRect(i,0,1,64);g.fillRect(0,i,64,1);}
 });
 const dishMat=stage.toon('#fff',{side:T.DoubleSide,map:wire});dishMat.vertexColors=true;
 const dish=new T.Mesh(geo,dishMat);dish.castShadow=dish.receiveShadow=true;dish.name='spherical reflector';root.add(dish);
 for(let j=0;j<48;j++){
  const a=j*Math.PI/24,b=(j+1)*Math.PI/24;
  k.beam(root,'#74938e',surface(radius,a),surface(radius,b),.034);
  if(j%3===0)for(let ring=0;ring<6;ring++)k.beam(root,'#748f8a',surface(radius*ring/6,a),surface(radius*(ring+1)/6,a),.013);
 }
 const suspended:V=[cx,2,cz];
 for(const [x,z,height] of [[cx-4.35,cz+.25,3.32],[cx+2.64,cz+3.47,2.95],[cx+2.2,cz-3.72,3.78]]){
  k.taper(root,'#95a49a',x,height/2-.62,z,.22,height+1.23);
  k.box(root,ivory,x,height-.07,z,.51,.24,.49);k.ball(root,'#ffb875',x,height+.13,z,.075,.10,.075,'glow');
  for(const dz of [-.13,.13])k.beam(root,'#546569',[x,height,z+dz],[cx,2,cz+dz*2.35],.025);
  k.beam(root,'#72817a',[x,height,z],[x+(x-cx)*.24,-1,z+(z-cz)*.2],.021);
 }
 // A sparse M13-like star field appears above the karst during the final camera lift.
 for(let i=0;i<90;i++){
  const x=rand.range(-53,39),y=rand.range(8.8,49),z=-52-rand.range(0,12);
  const r=rand.range(.022,.076);k.ball(root,i%5?'#d1e4d8':'#f8db99',x,y,z,r,r,r,'glow');
 }
 const feed=k.group(root,...suspended);
 k.taper(feed,dark,0,0,0,.49,.29,true);k.ball(feed,'#dbd1ad',0,-.24,0,.30,.23,.30);
 k.cyl(feed,brass,0,-.47,0,.06,.23);
 for(let j=0;j<3;j++){const a=j*Math.PI*2/3,b=a+Math.PI*2/3;k.beam(feed,ivory,[.61*Math.cos(a),.05,.61*Math.sin(a)],[.61*Math.cos(b),.05,.61*Math.sin(b)],.047);}
 // Tropical limestone behind the dish, with foliage kept below the sightline to the suspended instrument.
 const hills=Array.from({length:46},()=>({x:rand.range(-41,41),z:rand.range(-46,-15),h:rand.range(2.7,8.4),r:rand.range(3.8,8.3)}));
 function valley(x:number,z:number){
  let h=0;for(const p of hills){const d=((x-p.x)**2+(z-p.z)**2*.91)/(p.r*p.r);if(d<1)h=Math.max(h,p.h*(1-d)**.68);}
  return -1.53+h+Math.min(1,h)*(.31*Math.sin(x*1.03+z*.29)+.23*Math.cos(z*1.34-x*.43));
 }
 const land:number[]=[],landColors:number[]=[],landIds:number[]=[];
 for(let iz=0;iz<=33;iz++)for(let ix=0;ix<=74;ix++){
  const x=(ix-37)*1.12,z=-11-iz*1.1,h=valley(x,z),id=iz*75+ix;
  const tint=new T.Color(h>4.5?'#5d8372':h>2.1?'#4c786b':'#376963');tint.multiplyScalar(.94+rand.next()*.12);
  land.push(x,h,z);landColors.push(tint.r,tint.g,tint.b);
  if(ix&&iz)landIds.push(id-76,id-75,id,id-76,id,id-1);
 }
 const landMesh=new T.BufferGeometry();landMesh.setAttribute('position',new T.Float32BufferAttribute(land,3));
 landMesh.setAttribute('color',new T.Float32BufferAttribute(landColors,3));landMesh.setIndex(landIds);landMesh.computeVertexNormals();
 const lm=stage.toon('#fff').clone();lm.vertexColors=true;const valleyMesh=new T.Mesh(landMesh,lm);valleyMesh.receiveShadow=true;root.add(valleyMesh);
 for(let i=0;i<165;i++){
  const x=rand.range(-27,27),z=rand.range(-31,-12.9),y=valley(x,z),size=rand.range(.34,.94);
  k.rock(root,rand.pick(['#3c6d60','#467866','#558575']),x,y+.13,z,size,size*.79,size*1.15,rand.range(0,6));
 } for(let i=0;i<62;i++){
  const side=i%2?1:-1,x=side*rand.range(8.9,22.4),z=rand.range(-11,12),h=rand.range(.6,2.0);
  k.rock(root,rand.pick(['#627f6b','#62846c','#467669']),x,-1.35,z,h*1.5,h,h*1.4,rand.range(0,3));
 }
 k.box(root,'#4f706a',0,-1.8,-1,85,.52,75);
 // A low receiver laboratory, a service catwalk, exterior cable runs and instrument racks.
 const labX=-7.45,labZ=-6.48;
 k.box(root,'#b5ac8f',labX,-.20,labZ,2.93,2.12,2.36);
 k.box(root,'#526b70',labX,.94,labZ,3.15,.16,2.53);
 for(let i=0;i<3;i++){
  const x=labX-.92+i*.89;
  k.box(root,'#455a60',x,.11,labZ+1.196,.72,.70,.07);
  k.box(root,'#e1d5a6',x,.11,labZ+1.246,.61,.60,.036);
  k.box(root,'#557471',x,.11,labZ+1.275,.045,.62,.02);
 }
 k.box(root,teal,labX-.32,1.19,labZ,.94,.34,.78);
 for(let i=0;i<7;i++)k.box(root,'#b9bba6',labX-.70+i*.13,1.379,labZ,.058,.035,.68);
 k.box(root,'#647874',labX+.80,1.16,labZ-.34,.67,.28,.58);k.cyl(root,ivory,labX+.80,1.36,labZ-.34,.19,.1);
 const timber='#8a7860';
 for(let i=0;i<19;i++){
  const sign=i%2?1:-1,x=sign*rand.range(8.45,16.4),z=rand.range(-15.5,10),h=rand.range(1.5,3.6);
  k.beam(root,timber,[x,-1.62,z],[x+.16,h-1.62,z+.12],.067);
  for(let j=0;j<6;j++){const a=j*tau/6+i*.7,dx=Math.cos(a),dz=Math.sin(a);
   k.put('ball',root,'toon',j%2?'#477767':'#67a383',x+.16+dx*.50,h-1.66,z+.12+dz*.50,.72,.077,.24,0,-a,dx*.17);
  }
 }
 // Raised operator's station: reels, sloping console, tuning lamps and a hinged transmitter key.
 const consoleX=-W/2-.91;
 k.box(root,'#546d70',consoleX,.04,-.12,1.03,.75,2.46);
 k.box(root,'#3e585e',consoleX,.48,-.19,1.11,.13,2.57);
 for(const z of [-.93,.7]){
  k.box(root,copper,consoleX-.43,.592,z,.10,.095,.43);
  k.box(root,'#98aca1',consoleX+.40,.592,z,.12,.10,.36);
 }
 k.cyl(root,'#d9ceb1',consoleX,.576,-.02,.41,.059);
 k.ring(root,brass,consoleX,.609,-.02,.33,Math.PI/2);
 const actorStart:V=[consoleX,.608,-.02];
 for(const z of [-2.92,-2.26]){
  k.box(root,dark,consoleX,-.016,z,.90,.8,.56);k.box(root,'#89978d',consoleX,.40,z,.92,.085,.56);
  for(const x of [-.18,.18]){k.cyl(root,ivory,consoleX+x,.463,z,.148,.045);k.cyl(root,dark,consoleX+x,.49,z,.05,.025);}
 }
 k.box(root,'#a4b69b',consoleX,.04,2.05,1.16,.69,.82);
 k.box(root,dark,consoleX,.406,2.24,1.07,.043,.16);
 for(let i=0;i<6;i++)k.box(root,i===5?'#d8a86e':'#5c7b78',consoleX-.44+.15*i,.412,1.88,.09,.045,.12);
 const strip=paperTexture(256,256,g=>{
  g.fillStyle='#e1d4ae';g.fillRect(0,0,256,256);
  for(let j=0;j<14;j++){g.fillStyle='#806f59';g.fillRect(5,j*18+6,7,7);g.fillRect(244,j*18+6,7,7);
   for(let i=0;i<23;i++){g.fillStyle=message1974.board.rows[j+28][i]==='1'?'#49615f':'#c7b998';g.fillRect(18+i*9.4,j*18+5,5,6);}
  }
 });
 const page=new T.Mesh(new T.PlaneGeometry(.78,.68),stage.toon('#fff',{map:strip,side:T.DoubleSide}));page.rotation.x=-1.18;page.position.set(consoleX,.304,2.63);root.add(page);
 // A punched-message CRT shares the original, exactly 23 by 73, design data.
 const frame=k.group(root,4.12,1.45,-5.02,-.20,-.12);
 k.box(frame,dark,0,0,0,1.58,3.20,.43);k.box(frame,copper,0,1.55,.23,1.57,.09,.055);
 for(const sx of [-.69,.69])k.box(frame,teal,sx,0,.232,.10,2.96,.05);
 for(let j=0;j<6;j++)k.box(frame,j<3?'#f5aa63':'#79d6b7',-.46+j*.18,-1.50,.251,.09,.051,.034,0,'glow');
 const crt=document.createElement('canvas');crt.width=92;crt.height=292;const cg=crt.getContext('2d')!;
 const crtMap=new T.CanvasTexture(crt);crtMap.magFilter=T.NearestFilter;crtMap.minFilter=T.NearestFilter;crtMap.colorSpace=T.SRGBColorSpace;
 const display=new T.Mesh(new T.PlaneGeometry(1.10,2.81),new T.MeshBasicMaterial({map:crtMap}));display.position.z=.26;frame.add(display);
 const rows=message1974.board.rows;
 let drawn=-1;
 function decode(count:number){
  const n=Math.max(0,Math.min(73,Math.floor(count)));if(drawn===n)return;drawn=n;
  cg.fillStyle='#172e39';cg.fillRect(0,0,92,292);
  for(let r=0;r<73;r++){
   const color=message1974.board.sections.find(range=>range.end>r)!.color;
   for(let c=0;c<23;c++){
    cg.fillStyle=rows[r][c]==='1'?(r<n?color:'#2e4950'):'#20383d';cg.fillRect(c*4,r*4,3,3);
   }
  }
  crtMap.needsUpdate=true;
 }
 k.flush();decode(0);
 return {actorStart,dishCenter:suspended,decode};
}
type Shape='orb'|'block'|'drum'|'spike'|'jewel'|'ring';
const colors:Record<TowerKind,[string,string]>={
 water:['#598fcb','#b4f2ed'],wind:['#58a98e','#c4f6bf'],fire:['#d77644','#ffe99c'],
 thunder:['#9c75c3','#ebc4fa'],dark:['#514867','#efacd4'],physical:['#9a8062','#f0d39b'],dew:['#59a5a1','#ccffde']
};
// A single batch per primitive and lighting type also draws every moving projectile and reaction.
class Stamps{
 private meshes=new Map<string,T.InstancedMesh>();
 private transform=new T.Object3D();private colorCache=new Map<string,T.Color>();
 private direction=new T.Vector3();private up=new T.Vector3(0,1,0);
 constructor(stage:Stage){
  const shapes={orb:new T.SphereGeometry(1,18,12),block:new T.BoxGeometry(),drum:new T.CylinderGeometry(1,1,1,16),
   spike:new T.ConeGeometry(1,1,10),jewel:new T.OctahedronGeometry(1),ring:new T.TorusGeometry(1,.09,7,32)};
  const normal=stage.toon('#fff'),light=new T.MeshBasicMaterial({color:0xffffff});
  for(const [shape,geometry] of Object.entries(shapes))for(const bright of [false,true]){
   const m=new T.InstancedMesh(geometry,bright?light:normal,1800);m.count=0;m.frustumCulled=false;
   m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.castShadow=m.receiveShadow=!bright;
   if(bright)m.layers.set(1);
   stage.scene.add(m);this.meshes.set(shape+(bright?'+':''),m);
  }
 }
 reset(){for(const m of this.meshes.values())m.count=0;}
 private put(shape:Shape,color:string,bright:boolean){
  const mesh=this.meshes.get(shape+(bright?'+':''))!;if(mesh.count>=mesh.instanceMatrix.count)return;
  let c=this.colorCache.get(color);if(!c){c=new T.Color(color);this.colorCache.set(color,c);}
  this.transform.updateMatrix();mesh.setMatrixAt(mesh.count,this.transform.matrix);mesh.setColorAt(mesh.count,c);mesh.count++;
 }
 stamp(shape:Shape,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,rx=0,ry=0,rz=0,bright=false){
  const o=this.transform;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,ry,rz);this.put(shape,color,bright);
 }
 beam(color:string,x:number,y:number,z:number,xx:number,yy:number,zz:number,r:number,bright=false){
  const d=this.direction.set(xx-x,yy-y,zz-z),length=d.length();if(length<.0001)return;
  const o=this.transform;o.position.set((x+xx)/2,(y+yy)/2,(z+zz)/2);o.scale.set(r,length,r);o.quaternion.setFromUnitVectors(this.up,d.multiplyScalar(1/length));this.put('drum',color,bright);
 }
 finish(){for(const m of this.meshes.values()){m.visible=m.count>0;if(m.visible){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}}}
}
const tau=Math.PI*2;
function towerBody(b:Stamps,t:DefenseGame['towers'][number],time:number,elapsed:number){
 const [color,rim]=colors[t.kind],x=xpos(t.col+.5),z=zpos(t.lane),breath=.025*Math.sin(time*2.7+t.id*.8);
 const lvScale=t.level===3?1.15:t.level===2?1.07:1.0,y=.43+breath;
 b.stamp('drum','#3c5860',x,.105,z,.40*lvScale,.15,.40*lvScale);
 b.stamp('drum',t.level===3?'#ffd875':t.level===2?brass:copper,x,.19,z,.367*lvScale,.048,.367*lvScale);
 b.stamp('orb',color,x,y,z,(.334-breath)*lvScale,(.25+breath)*lvScale,(.321-breath)*lvScale);
 // Faces turn towards the incoming signals. Highlights stay separate from the element's silhouette.
 for(const dx of [-.105,.105]){
  b.stamp('orb','#243440',x+dx+.073,y+.01,z+.285*lvScale,.033,.047,.022);
  b.stamp('orb',ivory,x+dx+.08,y+.027,z+.303*lvScale,.009,.013,.006,0,0,0,true);
 }
 switch(t.kind){
 case 'water':
  b.stamp('orb',rim,x-.085,y+.18,z-.03,.19,.20,.17);
  b.stamp('orb','#d8ffff',x-.124,y+.27,z+.086,.044,.036,.022,0,0,0,true);
  b.stamp('ring',color,x+.23,y+.047,z,.12,.12,.12,0,Math.PI/2);break;
 case 'wind':
  for(let j=0;j<3;j++){const a=j*tau/3+time*(2.3+t.level*.6);
   b.stamp('orb',rim,x+.20*Math.cos(a),y+.26+.045*Math.sin(a),z+.18*Math.sin(a),.175,.033,.066,0,-a,.28);
  }
  b.stamp('spike',color,x,y+.33,z,.07,.22,.07);break;
 case 'fire':
  b.stamp('spike',color,x-.04,y+.31,z,.20,.38,.16,0,0,-.2);
  b.stamp('jewel',rim,x+.04,y+.30,z+.10,.08,.18,.08,0,time,0,true);
  for(const d of [-1,1])b.stamp('jewel','#bf5841',x+d*.19,y+.18,z-.05,.07,.16,.08,0,0,-d*.4);break;
 case 'thunder':
  for(const d of [-1,1]){b.stamp('jewel',rim,x+d*.13,y+.285,z,.074,.22,.08,0,0,-d*.27);}
  b.beam('#ffedc4',x-.13,y+.40,z,x+.13,y+.36,z,.017,true);break;
 case 'dark':
  b.stamp('ring',rim,x,y+.18,z,.33,.33,.33,1.01,time*.68,.3);
  b.stamp('jewel','#d2afdf',x,y+.32,z,.095,.17,.085,0,time,0,true);break;
 case 'physical':
  b.stamp('block','#756a5d',x+.02,y+.26,z,.47,.14,.38,0,.15,.02);
  for(const d of [-1,1])b.stamp('jewel',rim,x+d*.225,y+.14,z+.08,.09,.12,.09);break;
 case 'dew':
  b.stamp('ring',rim,x,y+.1,z,.32,.32,.32,Math.PI/2);
  for(const d of [-1,1])b.stamp('orb','#94d497',x+d*.136,y+.26,z-.04,.15,.04,.078,0,0,d*.46);
  b.stamp('orb','#b8f4db',x,y+.40,z,.095,.14,.09,0,0,0,true);break;
 }
 // Lv.2 & Lv.3 evolution crown / orbiting crystals
 if(t.level>=2){
  const r=t.level===3?.46:.41;
  b.stamp('ring',t.level===3?'#ffe78a':rim,x,.22,z,r,r,r,Math.PI/2,0,0,true);
  const sat=t.level===3?3:2;
  for(let i=0;i<sat;i++){
   const a=time*2.2+i*tau/sat+t.id;
   b.stamp('jewel',t.level===3?'#fff0a6':rim,x+Math.cos(a)*.42,y+.36+.05*Math.sin(a*2),z+Math.sin(a)*.42,.048,.095,.048,0,a,0,true);
  }
  if(t.level===3&&t.kind==='dew'){
   const pr=.52+.12*Math.sin(time*3.2);
   b.stamp('ring','#a4ffe1',x,.11,z,pr,pr,pr,Math.PI/2,0,0,true);
  }
 }
 if(t.jammedUntil>elapsed){b.stamp('ring','#ff816e',x,y+.50,z,.32,.32,.32,Math.PI/2+.3,time*3,0,true);}
 if(t.hp<t.maxHp){
  b.stamp('block',dark,x,.96,z,.51,.048,.044);
  const ratio=Math.max(0,t.hp/t.maxHp);b.stamp('block','#a9e4b8',x-.25*(1-ratio),.966,z+.032,.49*ratio,.040,.018,0,0,0,true);
 }
}
function interference(b:Stamps,e:DefenseGame['enemies'][number],time:number,elapsed:number){
 const x=xpos(e.x),z=zpos(e.lane),pulse=Math.sin(time*(e.kind==='noise'?8:5)+e.id*2);
 const scale=e.kind==='boss'?1.65:e.kind==='shield'?1.18:e.shadow?.62:1;
 const y=(e.kind==='boss'?.64:.38)+.065*pulse;
 const color=e.kind==='noise'?'#b56254':e.kind==='echo'?'#92769f':e.kind==='shield'?'#4e7a8a':e.kind==='boss'?'#3b2c4e':'#5d536a';
 const rim=e.kind==='boss'?'#ff6ea8':e.kind==='shield'?'#8bf0ff':e.kind==='detune'?'#ffb263':'#ffe1a9';
 b.stamp('jewel',color,x,y,z,.31*scale,.32*scale,.29*scale,.13,time*.74+e.id,.20);
 b.stamp('block','#3a3a4c',x-.05*scale,y+.025*scale,z+.181*scale,.34*scale,.106*scale,.11*scale,0,.07,-.04);
 b.stamp('block',rim,x-.07*scale,y+.035*scale,z+.246*scale,.20*scale,.030*scale,.018,0,0,-.04,true);
 if(e.kind==='noise'){
  for(const d of [-1,1])b.beam('#9c6958',x+d*.21,y-.15,z,x+d*.32,y-.30+pulse*.04*d,z+.10,.041);
  b.stamp('block','#ed9b70',x-.11,y+.25,z,.10,.14,.104,0,0,.27);
 }else if(e.kind==='echo'){
  for(let i=0;i<2;i++)b.stamp('ring',i?rim:color,x+(i-.5)*.18*scale,y,z,.25*scale,.25*scale,.25*scale,.58+time*.3,.4+i,.34);
 }else if(e.kind==='shield'){
  b.stamp('block','#6fa6b8',x-.32,y,z,.09,.48,.48,0,0,0);
  if(e.shield>0)b.stamp('ring','#86f2ff',x-.35,y,z,.34,.34,.34,0,Math.PI/2,time*1.8,true);
 }else if(e.kind==='boss'){
  b.stamp('ring','#ff6ea8',x,y,z,.68,.68,.68,time*.9,time*1.3,0,true);
  b.stamp('ring','#b089ff',x,y,z,.54,.54,.54,-time*1.1,.5,time*.8,true);
  for(let i=0;i<4;i++){
   const a=time*1.5+i*Math.PI/2;
   b.stamp('jewel','#ffd07b',x+Math.cos(a)*.62,y+.18*Math.sin(time*2+i),z+Math.sin(a)*.62,.10,.18,.10,0,a,0,true);
  }
  if(e.shield>0)b.stamp('ring','#8af4ff',x,y,z,.76,.76,.76,Math.PI/2,0,0,true);
 }else{
  for(const d of [-1,1]){
   b.stamp('spike','#a77c83',x+d*.29,y+.04,z,.13,.44,.11,0,0,-d*.72);
   b.stamp('jewel',rim,x+d*.26,y+.32,z,.06,.105,.06,0,time,0,true);
  }
 }
 // Status auras
 if(e.wetUntil>elapsed)b.stamp('ring','#91dcf2',x,.12,z,.32*scale,.32*scale,.32*scale,Math.PI/2,0,0,true);
 else if(e.aura&&e.auraUntil>elapsed){
  const ac=colors[e.aura][1];
  b.stamp('ring',ac,x,.14,z,.30*scale,.30*scale,.30*scale,Math.PI/2,0,0,true);
 }
 if(e.vulnUntil>elapsed)b.stamp('jewel','#ef82ff',x,y+.55*scale,z,.07,.12,.07,0,time*3,0,true);
 if(e.stunUntil>elapsed)b.stamp('ring','#ffe875',x,y+.45*scale,z,.24*scale,.24*scale,.24*scale,Math.PI/2,time*6,0,true);
 // Health & shield bars
 const barY=e.kind==='boss'?1.55:.92,barW=e.kind==='boss'?.95:.52;
 if(e.hp<e.maxHp||e.shield>0){
  const ratio=Math.max(0,e.hp/e.maxHp);
  b.stamp('block','#293844',x,barY,z,barW,.048,.03);
  b.stamp('block',e.kind==='boss'?'#ff7597':'#ffc282',x-barW*.5*(1-ratio),barY+.009,z+.024,barW*.96*ratio,.040,.015,0,0,0,true);
  if(e.shield>0&&e.maxShield>0){
   const sr=Math.max(0,e.shield/e.maxShield);
   b.stamp('block','#7ef2ff',x-barW*.5*(1-sr),barY+.062,z+.024,barW*.96*sr,.026,.014,0,0,0,true);
  }
 }
}
function signalEffects(b:Stamps,e:DefenseGame['effects'][number],time:number){
 if(e.lane<0)return;
 const x=xpos(e.x),z=zpos(e.lane),from=xpos(e.fromX),fromZ=zpos(e.fromLane);
 const u=Math.max(0,Math.min(1,1-e.life/e.maxLife)),fade=Math.max(.04,1-u);
 const color=e.element?colors[e.element][1]:'#ffe8b2';
 if(e.kind==='shot'){
  if(e.element==='thunder'||e.element==='dark'){
   const count=6;
   let xx=from,yy=.56,zz=fromZ;
   for(let i=1;i<=count;i++){const t=i/count,bx=from+(x-from)*t,bz=fromZ+(z-fromZ)*t;
    const by=.54+(i<count?Math.sin(i*19+e.id)*.15:0);
    b.beam(color,xx,yy,zz,bx,by,bz,.032*fade,true);xx=bx;yy=by;zz=bz;
   }
  }else{
   const t=Math.min(1,u*1.9),back=Math.max(0,t-.20),xx=from+(x-from)*t,zz=fromZ+(z-fromZ)*t,yy=.52+.20*Math.sin(t*Math.PI);
   b.beam(color,from+(x-from)*back,.52+.20*Math.sin(back*Math.PI),fromZ+(z-fromZ)*back,xx,yy,zz,.034*fade,true);
   b.stamp(e.element==='physical'?'jewel':'orb',color,xx,yy,zz,.09,.09,.09,0,time*6,0,true);
  }
 }else if(e.kind==='support'){
  if(u<.45){
   const k=u/.45,px=from+(x-from)*k,pz=fromZ+(z-fromZ)*k,py=.75+Math.sin(k*Math.PI)*3.1;
   b.stamp('orb',color,px,py,pz,.30,.30,.30,0,time*5,0,true);
   b.stamp('ring','#ffffff',px,py,pz,.38,.38,.38,time*4,time*3,0,true);
  }else{
   const k=(u-.45)/.55,r=.35+k*2.45,f=Math.max(.05,1-k);
   b.stamp('ring',color,x,.16+k*.4,z,r,r,r,Math.PI/2,0,0,true);
   b.stamp('ring','#ffffff',x,.22+k*.65,z,r*.7,r*.7,r*.7,Math.PI/2,0,0,true);
   for(let j=0;j<10;j++){
    const a=j*tau/10+e.id;
    b.stamp('jewel',color,x+Math.cos(a)*r*.85,.35+Math.sin(k*Math.PI)*1.1,z+Math.sin(a)*r*.85,.10*f,.22*f,.10*f,0,a,0,true);
   }
  }
 }else if(e.kind==='upgrade'){
  const r=.22+u*.62;
  b.stamp('ring','#ffe78a',x,.15+u*.85,z,r,r,r,Math.PI/2,0,0,true);
  for(let j=0;j<6;j++){
   const a=j*tau/6+u*3;
   b.stamp('jewel','#fff4c4',x+Math.cos(a)*.48,.25+u*.95,z+Math.sin(a)*.48,.06*fade,.12*fade,.06*fade,0,a,0,true);
  }
 }else if(e.kind==='shieldBreak'||e.kind==='bossPulse'){
  const tint=e.kind==='shieldBreak'?'#8bf4ff':'#ff66a3';
  const r=.25+u*(e.kind==='bossPulse'?2.2:1.1);
  b.stamp('ring',tint,x,.35,z,r,r,r,Math.PI/2,0,0,true);
 }else if(e.kind==='tape'){
  const xx=xpos(u*8);
  b.beam('#ffe5a0',xx,.15,z-.55,xx,.15,z+.55,.065*fade,true);
  for(let i=0;i<4;i++)b.stamp('block',ivory,xx-i*.2,.27+i*.045,z,.16,.026,.31,0,0,-u,true);
 }else if(e.kind==='dew'){
  for(let i=0;i<3;i++)b.stamp('orb',color,x+Math.sin(i*2)*u*.20,.49+u*(.50+.14*i),z+Math.cos(i)*u*.13,.07*fade,.11*fade,.07*fade,0,0,0,true);
 }else{
  const tint=e.kind==='jam'?'#ff8265':e.kind==='leak'?'#ff9681':e.reaction==='vaporize'?'#ffd89b':e.reaction==='overload'?'#ff75a0':e.reaction==='swirl'?'#9effd6':color;
  const r=.11+u*(e.reaction?.72:.37);
  b.stamp('ring',tint,x,.13+u*.16,z,r,r,r,Math.PI/2,0,0,true);
  for(let j=0;j<5;j++){const a=(e.id+j)*2.40;b.stamp('jewel',tint,x+Math.cos(a)*u*.37,.37+Math.sin(u*Math.PI)*.36,z+Math.sin(a)*u*.34,.056*fade,.10*fade,.056*fade,0,a,0,true);}
 }
}
export interface DefenseSceneOptions {
 tiles?:readonly TileMod[];
 onHover?:(lane:number,col:number)=>void;
 onCollectDrop?:(id:number)=>void;
}
export function createDefenseScene(onCell:(lane:number,col:number)=>void,options?:DefenseSceneOptions){
 const stage=new Stage(look),props=scenery(stage,options?.tiles??[]),batch=new Stamps(stage);
 const actor=new SlimeCharacter(stage,{spawn:props.actorStart,world:{boxes:[],surfaces:[{min:[-8,-1.5],max:[-6,1.55],height:props.actorStart[1]}]},
  input:false,ui:false,trainingTargets:[],onToast:()=>{}}).attach();
 const canvas=stage.renderer.domElement as HTMLCanvasElement;canvas.style.touchAction='none';
 const cam=stage.camera as T.PerspectiveCamera,probe=new T.Vector3(),pivot=new T.Vector3(-.44,.05,-.38);
 const cast=new T.Raycaster(),ndc=new T.Vector2(),normal=new T.Vector3(0,1,0),ground=new T.Plane(normal,-top);
 const playEye=new T.Vector3(),playRotation=new T.Quaternion(),endEye=new T.Vector3(),endLook=new T.Vector3(),endRotation=new T.Quaternion(),orientation=new T.Matrix4();
 let playOffsetX=0,playOffsetY=0,newest=0,placedAt=-100,placedX=0,placedZ=0,placedKind:TowerKind='water';
 let selLane=-1,selCol=-1,hoverLane=-1,hoverCol=-1,previewMode:'none'|'plant'|'support'|'tape'|'remove'='none';
 let previewKind:TowerKind='water';
 let winTime=-1,pressed:{x:number;y:number;id:number}|null=null;
 let lastDrops:DefenseGame['drops']=[];
 function resize(){
  const width=innerWidth,height=innerHeight,portrait=width<height,tilt=portrait?1.02:.78;
  cam.aspect=width/height;cam.fov=portrait?38:36;cam.clearViewOffset();cam.updateProjectionMatrix();
  const margin=width<600?5:Math.min(width*.025,28),right=W/2+.45,left=-W/2-1.53;
  const maxW=width-2*margin,maxH=Math.max(60,height-(height<500?63:76)-(height<500?69:98));
  function at(distance:number){
   cam.position.set(pivot.x,pivot.y+distance*Math.sin(tilt),pivot.z+distance*Math.cos(tilt));
   cam.lookAt(pivot);cam.updateMatrixWorld();
   let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
   for(const x of [left,right])for(const z of [-D/2-.16,D/2+.24]){
    probe.set(x,top,z).project(cam);
    const sx=probe.x*width/2,sy=-probe.y*height/2;
    minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);
   }
   return {minY,maxY,width:maxX-minX,height:maxY-minY,midX:(maxX+minX)/2};
  }
  let lower=5,upper=85;
  for(let i=0;i<22;i++){const mid=(lower+upper)/2,p=at(mid);if(p.width>maxW||p.height>maxH*.93)lower=mid;else upper=mid;}
  if(stage.scene.fog){stage.scene.fog.near=upper+9;stage.scene.fog.far=upper+48;}
  const rect=at(upper),yBottom=height-(height<490?72:Math.min(115,height*.16));
  const preferred=portrait?height*.57:height*.61;
  const shiftY=Math.min(yBottom-rect.height/2,preferred)-(rect.minY+rect.maxY)/2-height/2;
    playOffsetX=rect.midX;playOffsetY=-shiftY;
  cam.setViewOffset(width,height,playOffsetX,playOffsetY,width,height);cam.updateProjectionMatrix();
  playEye.copy(cam.position);playRotation.copy(cam.quaternion);
  endLook.set(-.42,1.99,-6.49);endEye.set(-.28,.32,1).normalize().multiplyScalar(Math.max(14.6,11.3/(2*Math.tan(37*Math.PI/360)*cam.aspect))).add(endLook);
  endRotation.setFromRotationMatrix(orientation.lookAt(endEye,endLook,cam.up));
 }
 function select(lane:number,col:number){selLane=lane;selCol=col;}
 function setPreview(mode:'none'|'plant'|'support'|'tape'|'remove',kind:TowerKind='water'){
  previewMode=mode;previewKind=kind;
 }
 function cellScreen(lane:number,col:number){
  const r=canvas.getBoundingClientRect();probe.set(xpos(col+.5),top,zpos(lane)).project(cam);
  return {x:r.left+(probe.x+1)*r.width/2,y:r.top+(1-probe.y)*r.height/2};
 }
 function hitBoard(clientX:number,clientY:number){
  const r=canvas.getBoundingClientRect();
  ndc.set((clientX-r.left)/r.width*2-1,1-(clientY-r.top)/r.height*2);
  cast.setFromCamera(ndc,cam);
  if(!cast.ray.intersectPlane(ground,probe))return null;
  const colF=probe.x/CW+4,laneF=probe.z/CD+2.5;
  return {col:Math.floor(colF),lane:Math.floor(laneF),colF,laneF};
 }
 function press(event:PointerEvent){if(event.isPrimary&&event.button===0)pressed={x:event.clientX,y:event.clientY,id:event.pointerId};}
 function move(event:PointerEvent){
  const hit=hitBoard(event.clientX,event.clientY);
  if(!hit||hit.col<0||hit.col>=8||hit.lane<0||hit.lane>=5){
   if(hoverLane!==-1||hoverCol!==-1){hoverLane=-1;hoverCol=-1;options?.onHover?.(-1,-1);}
   return;
  }
  if(options?.onCollectDrop&&lastDrops.length){
   for(const d of lastDrops){
    if(Math.hypot(d.x-hit.colF,d.lane+0.5-hit.laneF)<.75){options.onCollectDrop(d.id);break;}
   }
  }
  if(hit.lane!==hoverLane||hit.col!==hoverCol){hoverLane=hit.lane;hoverCol=hit.col;options?.onHover?.(hoverLane,hoverCol);}
 }
 function release(event:PointerEvent){
  const p=pressed;pressed=null;if(!p||p.id!==event.pointerId||Math.hypot(p.x-event.clientX,p.y-event.clientY)>15)return;
  const hit=hitBoard(event.clientX,event.clientY);
  if(!hit)return;
  if(options?.onCollectDrop&&lastDrops.length){
   const near=lastDrops.find(d=>Math.hypot(d.x-hit.colF,d.lane+0.5-hit.laneF)<.82);
   if(near){options.onCollectDrop(near.id);return;}
  }
  if(hit.col>=0&&hit.col<8&&hit.lane>=0&&hit.lane<5)onCell(hit.lane,hit.col);
 }
 function cancel(){pressed=null;}
 canvas.addEventListener('pointerdown',press);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',cancel);window.addEventListener('resize',resize);resize();
 function drawCellFrame(lane:number,col:number,color:string,y=.070){
  const x=xpos(col+.5),z=zpos(lane);
  for(const a of [-1,1])for(const d of [-1,1]){
   const xx=x+a*CW*.44,zz=z+d*CD*.44;
   batch.beam(color,xx,y,zz,xx-a*.26,y,zz,.024,true);batch.beam(color,xx,y,zz,xx,y,zz-d*.24,.024,true);
  }
 }
 function update(game:DefenseGame,time:number,dt:number){
  lastDrops=game.drops;
  actor.update(time,dt);batch.reset();
  if(game.phase==='setup'){newest=0;placedAt=-100;}
  for(const tower of game.towers){
   towerBody(batch,tower,time,game.elapsed);
   if(tower.id>newest){newest=tower.id;placedAt=time;placedX=xpos(tower.col+.5);placedZ=zpos(tower.lane);placedKind=tower.kind;
    const elements:TowerKind[]=['water','wind','fire','thunder','dark','physical'];
    actor.setElement(Math.max(0,elements.indexOf(tower.kind)),true);actor.setMood('Happy',.38,56);
   }
  }
  // Burn zones (Lv.3 fire / fire support)
  for(const bz of game.burns){
   const x=xpos(bz.x),z=zpos(bz.lane),r=.52+.08*Math.sin(time*9+bz.x);
   batch.stamp('ring','#ff8442',x,.075,z,r,r,r,Math.PI/2,0,0,true);
   for(let j=0;j<3;j++){
    const a=time*3+j*2.1;
    batch.stamp('jewel','#ffcf70',x+Math.cos(a)*.35,.22+.12*Math.sin(time*8+j),z+Math.sin(a)*.30,.05,.12,.05,0,a,0,true);
   }
  }
  // Collectible glowing dew drops
  for(const d of game.drops){
   const x=xpos(d.x),z=zpos(d.lane),bob=.46+.12*Math.sin(time*4.5+d.id);
   const blink=d.life<2&&Math.sin(time*18)<0?.55:1;
   batch.stamp('orb','#9effe0',x,bob,z,.17*blink,.22*blink,.17*blink,0,time*2,0,true);
   batch.stamp('ring','#d6fff0',x,.12,z,.24,.24,.24,Math.PI/2,0,0,true);
  }
  // Right-side incoming lane warning beacons
  if(game.phase==='wave'||game.phase==='interval'){
   for(const warn of game.upcomingLanes){
    const z=zpos(warn.lane),pulse=.65+.35*Math.sin(time*9+warn.lane);
    const col=warn.kind==='boss'?'#ff5294':warn.kind==='detune'?'#ffad5c':warn.kind==='shield'?'#7df2ff':'#ffe799';
    const x=W/2+.38;
    batch.beam(col,x,.08,z,x,.08+(warn.kind==='boss'?1.55:.85)*pulse,z,.055,true);
    batch.stamp('ring',col,x,.12,z,.26*pulse,.26*pulse,.26*pulse,Math.PI/2,0,0,true);
   }
  }
  // Hover tactical preview (empty cell range / support 3x3 / tape lane)
  if((game.phase==='wave'||game.phase==='interval')&&hoverLane>=0&&hoverCol>=0){
   const occupied=game.towers.some(t=>t.lane===hoverLane&&t.col===hoverCol);
   if(previewMode==='support'){
    const col=colors[previewKind][1];
    for(let dl=-1;dl<=1;dl++)for(let dc=-1;dc<=1;dc++){
     const nl=hoverLane+dl,nc=hoverCol+dc;
     if(nl>=0&&nl<5&&nc>=0&&nc<8)drawCellFrame(nl,nc,col,.082);
    }
   }else if(previewMode==='tape'){
    for(let c=0;c<8;c++)drawCellFrame(hoverLane,c,'#ffe799',.08);
   }else if(previewMode==='remove'){
    drawCellFrame(hoverLane,hoverCol,occupied?'#ff8678':'#889ea0',.078);
   }else if(previewMode==='plant'){
    const col=occupied?'#ffe599':colors[previewKind][1];
    drawCellFrame(hoverLane,hoverCol,col,.076);
    if(!occupied&&previewKind!=='dew'){
     const x0=xpos(hoverCol+.5),x1=previewKind==='physical'?xpos(Math.min(8,hoverCol+1.55)):xpos(8.05),z=zpos(hoverLane);
     batch.beam(col,x0,.16,z,x1,.16,z,.022,true);
     batch.stamp('orb',col,x0,.38,z,.20,.16,.20,0,time*2,0,true);
    }
   }
  }
  const drop=(time-placedAt)/.44;
  if(drop>=0&&drop<1){const [ox,oy,oz]=props.actorStart,px=ox+(placedX-ox)*drop,pz=oz+(placedZ-oz)*drop;
   batch.stamp('orb',colors[placedKind][1],px,oy+.35+Math.sin(drop*Math.PI)*1.3,pz,.14,.13,.14,0,0,0,true);
  }
  for(let j=0;j<3;j++){
   const active=j<game.integrity;
   batch.stamp('orb',active?'#b2ffe1':'#35494f',props.actorStart[0]-.27+j*.27,.615,.94,.080,.042,.08,0,0,0,active);
  }
  for(const enemy of game.enemies)interference(batch,enemy,time,game.elapsed);
  for(const fx of game.effects)signalEffects(batch,fx,time);
  if(selLane>=0&&selCol>=0){
   drawCellFrame(selLane,selCol,'#fff2b3',.086);
  }
  props.decode(game.decodedRows);
  if(game.phase==='won'){
   if(winTime<0){winTime=time;actor.setMood('Happy',2.8,75);}
   const t=time-winTime,uCam=Math.min(1,t/1.18),blend=uCam*uCam*(3-2*uCam);
   cam.position.lerpVectors(playEye,endEye,blend);cam.quaternion.slerpQuaternions(playRotation,endRotation,blend);
   cam.setViewOffset(innerWidth,innerHeight,playOffsetX*(1-blend),playOffsetY*(1-blend),innerWidth,innerHeight);cam.updateMatrixWorld();
   const [x,y,z]=props.dishCenter,range=Math.min(19,t*10),pulse=.048+.02*Math.sin(t*14);
   batch.beam('#a1e9e2',x,y,z,x+range*.42,y+range*.74,z-range*.88,pulse,true);
   // Encode successive real bits as narrow and wide pulses alongside the carrier.
   const bits=message1974.board.rows,head=Math.min(1678,Math.floor(t*620));
   for(let i=0;i<20;i++){
    const n=head-i;if(n<0)continue;
    const bit=bits[Math.floor(n/23)][n%23],u=((t*.65+i/20)%1)*range;
    batch.stamp('jewel',bit==='1'?'#ffdc9d':'#a8eaf4',x+.17+u*.42,y+u*.74,z-u*.88,.042,bit==='1'?.13:.046,.042,0,0,-.52,true);
   }
   for(let i=0;i<11;i++){
    const u=(t*.70-i/12)%1;if(u<0)continue;
    batch.stamp('ring',i%2?'#b6fae8':'#ffe6b5',x+u*range*.42,y+u*range*.74,z-u*range*.88,.14+u*.51,.14+u*.51,.14+u*.51,.61,.40,0,true);
   }
  }else if(winTime>=0){winTime=-1;resize();}
  batch.finish();stage.render(dt,actor);
 }
 function dispose(){
  window.removeEventListener('resize',resize);canvas.removeEventListener('pointerdown',press);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',release);canvas.removeEventListener('pointercancel',cancel);actor.dispose();
 }
 return {stage,actor,update,select,setPreview,cellScreen,dispose};
}
