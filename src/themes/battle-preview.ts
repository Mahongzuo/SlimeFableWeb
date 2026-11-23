import * as T from 'three';
import type {Stage,StageLook} from '../level/stage';
import {rng} from '../templates/random';
import {Kit} from './folio-landmarks';

// Both adversaries and their insignia are fictional cloth constructs.
export function battleLook(ship:boolean):StageLook {
 return ship ? {skyTop:'#4287a2',skyHorizon:'#efd6a5',fog:[16,68],sun:'#ffe3ad',sunIntensity:2.1,hemiSky:'#f7efe4',hemiGround:'#78757a',ink:'#243942',wash:'#dbc79f'} :
 {skyTop:'#809399',skyHorizon:'#d5cfb8',fog:[8,43],sun:'#ffe1ab',sunIntensity:1.65,hemiSky:'#e9eee3',hemiGround:'#746456',ink:'#333c3f',wash:'#cbbd9e'};
}

type Fabric='sail'|'banner'|'deck'|'earth';
function painted(stage:Stage,kind:Fabric){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const g=canvas.getContext('2d')!, random=rng(kind);
 g.fillStyle={sail:'#eee0bb',banner:'#963f39',deck:'#a77953',earth:'#a59b7d'}[kind];g.fillRect(0,0,512,512);
 if(kind==='deck'){
  for(let i=0;i<16;i++){
   const x=i*32,joint=random.int(60,420);
   g.fillStyle=i%3===0?'#b38961':i%3===1?'#a87952':'#ab8059';g.fillRect(x,0,31,512);
   g.fillStyle='#594936';g.fillRect(x,0,1.3,512);g.fillRect(x,joint,32,1.5);
   for(const dx of [5,24])for(const dy of [-4,5]){
    g.fillStyle='#746046';g.fillRect(x+dx,joint+dy,2,2);
   }
   for(let n=0;n<17;n++){
    const px=x+random.range(2,29),py=random.range(0,512);
    g.strokeStyle='#7656354a';g.beginPath();g.moveTo(px,py);g.quadraticCurveTo(px+3,py+18,px,py+random.range(28,92));g.stroke();
   }
  }
 }else if(kind==='earth'){
  for(let i=0;i<7500;i++){
   const x=random.range(0,512),y=random.range(0,512);
   g.fillStyle=random.int(0,1)?'#6f775e35':'#d0c09950';g.fillRect(x,y,random.range(1,7),random.range(1,3));
  }
 }else{
  const banner=kind==='banner';
  g.strokeStyle=banner?'#d6b17d':'#baab8b';g.lineWidth=banner?9:2;
  g.strokeRect(10,8,492,495);
  if(banner){
   g.translate(256,200);g.rotate(Math.PI/4);
   g.fillStyle='#e7c590';g.fillRect(-97,-97,194,194);g.fillStyle='#843d38';g.fillRect(-70,-70,140,140);
   g.fillStyle='#e7c590';g.fillRect(-40,-40,80,80);
  }else{
   g.setLineDash([5,4]);for(let x=64;x<510;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,512);g.stroke();}
   g.setLineDash([]);g.fillStyle='#d0be99';g.beginPath();g.moveTo(0,512);g.lineTo(66,512);g.lineTo(0,440);g.fill();
  }
 }
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
 return stage.toon('#ffffff',{map,side:T.DoubleSide});
}

function cloth(parent:any,mat:any,x:number,y:number,z:number,w:number,h:number,banner=false){
 const geo=new T.PlaneGeometry(w,h,14,9),pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++){
  const px=pos.getX(i)/w+.5,py=.5-pos.getY(i)/h;
  const bulge=banner?Math.sin(px*7+py*3)*.12*py:Math.sin(Math.PI*py)*.16-.09*py;
  pos.setXYZ(i,pos.getX(i)*(1-py*(banner?.04:.12)),pos.getY(i)+Math.sin(px*Math.PI)*py*.08*h,bulge*w);
 }
 geo.computeVertexNormals();
 const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}

export function buildField(stage:Stage){
 const random=rng('ridge-1600');
 const world=new T.Group();stage.scene.add(world);
 const toon=stage.toon('#ffffff'),glow=new T.MeshBasicMaterial({color:0xffffff});
 const kit=new Kit({toon,glow,lit:toon,lamp:glow,glass:toon},'battle-preview');
 const ground=new T.Mesh(new T.PlaneGeometry(67,66),painted(stage,'earth'));
 ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.name='field-walk-surface';world.add(ground);
 const decor=kit.group(world);decor.userData.walkThrough=true;
 const armCloth=painted(stage,'banner');
  // Contiguous silhouette bands keep the mist layered even when viewed from the sides.
  for(const side of [-1,1])for(let i=0;i<28;i++){
   const a=(i/28)*Math.PI*2,r=side<0?27:38;
   kit.put('rock',decor,'toon',side<0?'#848c7f':'#75888b',Math.cos(a)*r,-2,Math.sin(a)*r,random.range(5,9),random.range(4,9),7,0,a);
  }
  for(let i=0;i<110;i++){
   const a=random.range(0,Math.PI*2),r=random.range(12,26),h=random.range(2,5),x=Math.cos(a)*r,z=Math.sin(a)*r;
   kit.cyl(decor,'#685849',x,h*.36,z,.11,h*.72);
   for(let j=0;j<3;j++)kit.put('cone',decor,'toon',j===2?'#617972':'#4e6761',x,h*(.57+j*.16),z,h*(.30-j*.055),h*.53,h*(.23-j*.04));
  }
  for(const side of [-1,1])for(let i=0;i<5;i++){
   const x=side*(5.3+i*.37),z=4-i*3.1,h=2.75+(i%2)*.44;
   kit.cyl(decor,'#665646',x,h*.5,z,.042,h);
   kit.beam(decor,'#b29666',[x-.03,h-.14,z],[x+.83,h-.14,z],.033);
   cloth(decor,armCloth,x+.38,h-1.1,z,.76,1.8,true);
  }
  for(let i=0;i<410;i++){
   const x=random.range(-22,22),z=random.range(-20,20);
   if(Math.abs(x)<4.4&&Math.abs(z)<6.4)continue;
   const h=random.range(.17,.58);
   kit.put('cone',decor,'toon',i%2?'#aaa16e':'#c4b489',x,h*.48,z,.07,h,.035,.18,0,-.18);
  }
 kit.flush();
}
