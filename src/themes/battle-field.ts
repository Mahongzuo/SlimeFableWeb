import * as T from 'three';
import type {Stage} from '../level/stage';
import type {Vec,Box} from '../slime/types';
import type {WorldDefinition} from '../slime/world';
import {Kit} from './folio-landmarks';
import {rng} from '../templates/random';

export const fieldPoints:{spawn:Vec;first:Vec;fork:Vec;left:Vec;right:Vec;bossGate:Vec;boss:Vec}={
  spawn:[0,0,8],first:[0,0,2],fork:[0,0,-4],left:[-5,0,-8],right:[5,1.8,-8],bossGate:[0,0,-14],boss:[0,0,-19]
};
const extent={x0:-10,x1:10,z0:-25,z1:11},step=.5;
const width=(extent.x1-extent.x0)/step+1,height=(extent.z1-extent.z0)/step+1;
function vertexHeight(x:number,z:number){
  const terrace=T.MathUtils.smoothstep(x,0,3.5);
  const rise=T.MathUtils.smoothstep(-z,3.5,7.0)*(1-T.MathUtils.smoothstep(-z,10,14));
  return 1.8*terrace*rise;
}
const values:number[]=[];
for(let j=0;j<height;j++)for(let i=0;i<width;i++)values.push(vertexHeight(extent.x0+i*step,extent.z0+j*step));
export function fieldHeight(x:number,z:number){
  const i=T.MathUtils.clamp((x-extent.x0)/step,0,width-1),j=T.MathUtils.clamp((z-extent.z0)/step,0,height-1);
  const a=Math.min(width-2,Math.floor(i)),b=Math.min(height-2,Math.floor(j)),dx=i-a,dz=j-b;
  const v=values[a+b*width],u=values[a+b*width+1],w=values[a+(b+1)*width],t=values[a+(b+1)*width+1];
  return (v*(1-dx)+u*dx)*(1-dz)+(w*(1-dx)+t*dx)*dz;
}
const walls:Box[]=[
  {name:'east rim',min:[10,-.1,-26],max:[11,5,12],camera:true},
  {name:'west rim',min:[-11,-.1,-26],max:[-10,5,12],camera:true},
  {name:'mountain screen',min:[-10,-.1,-26],max:[10,5,-25],camera:true},
  {name:'south fence',min:[-10,-.1,11],max:[10,4,12],camera:true}
];
// This outcrop uses one set of triangles for feet, projectiles, lock visibility
// and drawing; cut faces meet edge to edge and the base penetrates the soil.
const rockFaces:number[]=[];
const footprint=[[-.85,-.78],[-.28,-1.28],[.49,-1.1],[.95,-.49],[.87,.66],[.26,1.22],[-.58,1.12],[-.94,.39]];
const tiers=[{w:1,y:-.24},{w:.99,y:.57},{w:.75,y:1.37},{w:.50,y:1.71}];
const rockVertex=(row:number,col:number):Vec=>{
  const [x,z]=footprint[col],r=tiers[row];return [x*r.w+row*.045,r.y+(row?Math.sin(col*1.5+.7)*.095:0),-10.55+z*r.w-row*.023];
};
for(let i=0;i<footprint.length;i++){
  const n=(i+1)%footprint.length;
  for(let row=0;row<tiers.length-1;row++){
    const a=rockVertex(row,i),b=rockVertex(row,n),c=rockVertex(row+1,i),d=rockVertex(row+1,n);
    rockFaces.push(...a,...c,...b,...c,...d,...b);
  }
  rockFaces.push(...rockVertex(3,i),.07,1.89,-10.68,...rockVertex(3,n));
}
export function fieldWorld():WorldDefinition{
  return {boxes:walls.map(b=>({...b,min:[...b.min],max:[...b.max]})),triangles:rockFaces,surfaces:[{min:[extent.x0,extent.z0],max:[extent.x1,extent.z1],height:0,grid:{width,height,values}}]};
}
const wood='#68564a',straw='#c9ad77',dark='#514c46',madder='#aa4e41',indigo='#375d69';
function paintGround(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1792;
  const g=canvas.getContext('2d')!,random=rng('field-trodden-path');
  const px=(x:number)=>(x+10)*canvas.width/20, pz=(z:number)=>(z+25)*canvas.height/36;
  g.fillStyle='#95936d';g.fillRect(0,0,canvas.width,canvas.height);
  const path=(points:number[][],color:string,size:number)=>{
    g.strokeStyle=color;g.lineWidth=size;g.lineCap='round';g.lineJoin='round';g.beginPath();
    points.forEach(([x,z],i)=>i?g.lineTo(px(x),pz(z)):g.moveTo(px(x),pz(z)));g.stroke();
  };
  path([[0,10],[0,4],[0,-3],[-4,-5],[-5,-8],[-3,-11],[0,-14],[0,-19]],'#ae9f7d',155);
  path([[0,-3],[3.8,-5],[5,-8],[4,-11],[0,-14]],'#b6aa85',103);
  for(let i=0;i<11500;i++){
    const x=random.range(-10,10),z=random.range(-25,11),u=px(x),v=pz(z);
    g.fillStyle=random.int(0,2)?'#736c4a32':'#e0cf9f47';g.fillRect(u,v,random.range(1.1,5.2),random.range(1.0,2.3));
  }
  // Stone marks and wagon ruts share the earth texture at every viewing angle.
  for(let i=0;i<25;i++){
    const z=-4-i*.35,x=2.3+2.7*Math.sin((i/24)*Math.PI);
    for(const k of [-1,1]){
      g.fillStyle=i%3===0?'#938a71':'#a1987e';const u=px(x+.29*k+random.range(-.14,.14)),v=pz(z);
      g.beginPath();g.moveTo(u-7,v);g.lineTo(u-5,v-5);g.lineTo(u+6,v-6);g.lineTo(u+11,v-2);g.lineTo(u+4,v+3);g.closePath();g.fill();
    }
  }
  for(let i=0;i<75;i++){const z=random.range(-12.2,-3.8),x=-4.0+random.range(-1.5,1.2);
    path([[x,z],[x+.1,z-.17],[x+.11,z-.32]],'#716d594f',2.5);}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
}
function standardMaterial(stage:Stage,color:string,type:number){
  const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d')!;
  g.fillStyle=color;g.fillRect(0,0,128,256);g.strokeStyle='#d8c195';g.lineWidth=3;g.strokeRect(9,9,110,239);
  g.fillStyle='#ead6ad';g.translate(64,99);
  if(type===0){for(let i=0;i<3;i++){g.beginPath();g.arc(15*Math.cos(i*2.094-.52),15*Math.sin(i*2.094-.52),11,0,6.29);g.fill();}}
  else if(type===1){for(let i=0;i<3;i++){g.beginPath();g.moveTo(-25,-20+i*17);g.lineTo(0,-30+i*17);g.lineTo(25,-20+i*17);g.lineTo(25,-14+i*17);g.lineTo(0,-24+i*17);g.lineTo(-25,-14+i*17);g.fill();}}
  else {g.rotate(Math.PI/4);g.strokeStyle=g.fillStyle;g.lineWidth=9;g.strokeRect(-19,-19,38,38);g.fillRect(-6,-6,12,12);}
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
  return stage.toon('#ffffff',{map:tex,side:T.DoubleSide});
}

export function buildCampaignField(stage:Stage){
  const root=new T.Group();root.name='Sekigahara-field';stage.scene.add(root);
  const mat=stage.toon('#fff'),kit=new Kit({toon:mat,glow:mat,lit:mat,lamp:mat,glass:mat},'mountain-standards');
  const random=rng('field-1600'),indices:number[]=[],points:number[]=[],uv:number[]=[];
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){
    const k=i+j*width;points.push(extent.x0+i*step,values[k],extent.z0+j*step);uv.push(i/(width-1),1-j/(height-1));
    if(i&&j)indices.push(k-width-1,k-1,k,k-width-1,k,k-width);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const terrain=new T.Mesh(geo,stage.toon('#ffffff',{map:paintGround()}));terrain.name='field-walk-surface';terrain.receiveShadow=true;root.add(terrain);
  // The outer turf starts at the mesh boundary; the east terrace has a
  // separate bank facing the adjoining fields rather than a floating lip.
  for(const [x,z,w,d] of [[-22.5,-7,25,36],[22.5,-7,25,36],[0,19,70,16],[0,-33,70,16]]){
    kit.box(root,'#8b8d6d',x,-.23,z,w,.42,d);
  }
  const bank:number[]=[],sideIndices:number[]=[];
  for(let j=0;j<height;j++){
    const z=extent.z0+step*j;bank.push(10,fieldHeight(10,z),z,10,-.020,z);
    const n=j*2;if(j)sideIndices.push(n-2,n,n-1,n-1,n,n+1);
  }
  const bankGeo=new T.BufferGeometry();bankGeo.setAttribute('position',new T.Float32BufferAttribute(bank,3));bankGeo.setIndex(sideIndices);bankGeo.computeVertexNormals();
  const eastBank=new T.Mesh(bankGeo,stage.toon('#8d795c',{side:T.DoubleSide}));root.add(eastBank);
  const rockGeometry=new T.BufferGeometry(),rockColors:number[]=[];
  for(let i=0;i<rockFaces.length;i+=9){
    const y=(rockFaces[i+1]+rockFaces[i+4]+rockFaces[i+7])/3;
    const rockColor=new T.Color(y>1.55?'#7e8968':y>.80?'#858171':'#716f65');
    rockColor.multiplyScalar(.94+.10*Math.sin(i*.71));
    for(let v=0;v<3;v++)rockColors.push(rockColor.r,rockColor.g,rockColor.b);
  }
  rockGeometry.setAttribute('position',new T.Float32BufferAttribute(rockFaces,3));rockGeometry.setAttribute('color',new T.Float32BufferAttribute(rockColors,3));rockGeometry.computeVertexNormals();
  const outcrop=new T.Mesh(rockGeometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));
  outcrop.name='fork-outcrop';outcrop.castShadow=outcrop.receiveShadow=true;root.add(outcrop);
  const mats=[standardMaterial(stage,indigo,0),standardMaterial(stage,madder,1),standardMaterial(stage,'#b28243',2)];
  type Banner={post:T.Group,cloth:T.Mesh,rest:Float32Array,offset:number,turn:boolean};
  const banners:Banner[]=[];
  function banner(x:number,y:number,z:number,tall:number,id:number,turn=false){
    const post=kit.group(root,x,y,z),w=tall*.25,h=tall*.58;
    kit.cyl(post,wood,0,tall/2,0,.040,tall);
    kit.beam(post,straw,[-.11,tall-.1,0],[w+.10,tall-.1,0],.035);
    const clothGeo=new T.PlaneGeometry(w,h,6,12),cloth=new T.Mesh(clothGeo,mats[id]);
    cloth.castShadow=true;cloth.position.set(w/2+.026,tall-.15-h/2,0);post.add(cloth);
    banners.push({post,cloth,rest:new Float32Array(clothGeo.attributes.position.array),offset:x+z,turn});
    return post;
  }
  for(const [x,z,id] of [[-3.5,6,0],[3.5,6,1],[-4.4,-1,0],[4.6,-.8,1],[-7.5,-8,0],[6.8,-8,1],[-3.3,-14.7,0],[3.3,-14.7,1],[-7.2,-22.5,0],[7.2,-22.5,1]]){
    banner(x,fieldHeight(x,z),z,z<-14?3.8:2.9,id);
  }
  // A bend in the stockade opens sightlines to both choices at the fork.
  function fence(x:number,z:number,length:number,alongX:boolean){
    const count=Math.ceil(length/.9),dx=alongX?length/count:0,dz=alongX?0:length/count;
    for(let n=0;n<=count;n++){
      const a=x+n*dx,b=z+n*dz,y=fieldHeight(a,b);kit.cyl(root,wood,a,y+.47,b,.057,.94);
      if(n<count)for(const ly of [.25,.64])kit.beam(root,straw,[a,y+ly,b],[a+dx,fieldHeight(a+dx,b+dz)+ly,b+dz],.042);
    }
  }
  for(const x of [-9.8,9.8])for(const z of [-24,-14,-4,5])fence(x,z,z===5?5.6:8.2,false);
  fence(-9.7,10.9,19.4,true);fence(-9.6,-24.8,19.2,true);
  fence(-8,-10.9,2.5,true);fence(6.5,-10.8,2.1,true);
  // A camp drum, its rack, cord bindings and traceable signal ropes.
  const drum=(x:number,z:number)=>{
    const y=fieldHeight(x,z);for(const dx of [-.36,.36])kit.beam(root,wood,[x+dx,y,z+.29],[x+dx*.56,y+1.13,z-.12],.066);
    kit.put('round',root,'toon',redBrown,x,y+.87,z,.41,.53,.41,Math.PI/2);
    for(const dz of [-.283,.283])kit.put('round',root,'toon','#d8c3a2',x,y+.87,z+dz,.405,.033,.405,Math.PI/2);
    for(let k=0;k<12;k++){const a=k*Math.PI/6,b=a+.14;
      kit.beam(root,straw,[x+.416*Math.cos(a),y+.87+.416*Math.sin(a),z-.245],[x+.416*Math.cos(b),y+.87+.416*Math.sin(b),z+.245],.009);}
  };
  const redBrown='#9d5545';drum(-3.1,5.4);drum(4.7,-12.3);
  for(let i=0;i<320;i++){
    const x=random.range(-10.1,10.1),z=random.range(-24.8,10.8);
    const lane=(z<-3&&z>-14)?Math.abs(Math.abs(x)-4.7)<2.4:Math.abs(x)<3.9;
    if(lane||Math.abs(x)<2.1)continue;
    const h=random.range(.17,.65),y=fieldHeight(x,z);
    for(const k of [-1,0,1])kit.put('cone',root,'toon',k?'#bca777':'#867f5b',x+k*.032,y+h*.47,z,.032,h,.025,.14,0,k*.19);
  }
  // Backdrop hills physically end beyond the playable earth; the hilltop unit
  // pivots as one group, so its changed allegiance reads at the north approach.
  for(let layer=0;layer<2;layer++)for(let i=0;i<15;i++){
    const x=-40+i*5.8,z=-30-layer*7-random.range(0,2),h=3.8+layer*2+random.range(0,4);
    kit.rock(root,layer?'#7f8d91':'#707d71',x,-1.2,z,random.range(4,8),h,3.7,random.range(-.5,.5));
  }
  for(let i=0;i<63;i++){
    const side=i%2?1:-1,x=side*random.range(11.3,24),z=random.range(-24,12),h=random.range(2.7,5.2);
    kit.cyl(root,wood,x,h*.32,z,.10,h*.64);
    for(let j=0;j<3;j++)kit.put('cone',root,'toon',j===2?'#6d8276':'#526f63',x,h*(.61+j*.16),z,h*(.24-j*.047),h*.48,h*(.20-j*.04));
  }
  for(let i=0;i<6;i++){
    const x=-4.2+i*1.58,y=3.2+Math.sin(i*.48)*1.1,z=-28.2-i*.29;
    kit.rock(root,'#6b776a',x,-.2,z,3.1,y+.3,2.6,.3*i);banner(x,y,z,2.65,2,true);
  }
  const command=banner(.85,0,-23.4,5.35,2);
  kit.flush();let turn=0,fall=0,last=0;
  function update(time:number,phaseTwo:boolean,won:boolean){
    const dt=Math.min(.12,Math.max(0,time-last));last=time;
    turn=T.MathUtils.lerp(turn,won?1:0,1-Math.exp(-dt*2.6));
    fall=T.MathUtils.lerp(fall,won?1:0,1-Math.exp(-dt*2.0));
    if(stage.scene.fog?.isFog){stage.scene.fog.near=7+(phaseTwo?1:0)+fall*12;stage.scene.fog.far=36+(phaseTwo?4:0)+fall*29;}
    command.rotation.z=fall*1.31;
    for(const {post,cloth,rest,offset,turn:turning} of banners){
      if(turning){post.rotation.z=.10-turn*.66;post.rotation.y=.42-turn*1.14;}
      const p=cloth.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const u=(i%7)/6,v=Math.floor(i/7)/12;
        p.setZ(i,rest[i*3+2]+(.065*Math.sin(time*2.5+offset+u*3+v*4)+.05*Math.sin(u*7+time*1.3))*v);
      }
      p.needsUpdate=true;cloth.geometry.computeVertexNormals();
    }
  }
  update(0,false,false);
  return {root,update};
}
