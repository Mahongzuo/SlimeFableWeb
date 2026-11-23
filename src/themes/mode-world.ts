// Imagined studio, ink garden and memorial court. Architecture uses the same footprints as the playable geometry.
import * as T from 'three';
import {Kit} from './folio-landmarks';
import {rng} from '../templates/random';
import type {Stage,StageLook} from '../level/stage';
import type {Layout} from '../templates/mode-world';
import type {Vec} from '../slime/types';
import type {GroundSurface} from '../slime/world';
import {buildModeLandmark} from './mode-landmarks';

const palettes={
 studio:{sky:'#202e49',haze:'#b7b8bb',deck:'#9b8f82',dark:'#26384a',trim:'#d69762',glow:'#f8dd8a'},
 ink:{sky:'#718d96',haze:'#ebe3c5',deck:'#c1bfa8',dark:'#334943',trim:'#a54e3d',glow:'#ffdf8c'},
 peace:{sky:'#627e82',haze:'#dee4d8',deck:'#b8c2b4',dark:'#5c7269',trim:'#9d917c',glow:'#ffe8b3'}
};
function palette(day:string){return day==='1123'?palettes.studio:day==='0101'?palettes.ink:palettes.peace;}
export function modeLook(day:string):StageLook{
 const p=palette(day);return {skyTop:p.sky,skyHorizon:p.haze,fog:[28,90],sun:'#fff2d4',sunIntensity:2.05,hemiSky:'#f2efdf',hemiGround:p.dark,ink:p.dark,wash:p.haze};
}
// Collision slabs may overlap to keep the character supported at a join. Draw only
// the upper owner of each footprint, including the banks above a riverbed.
function visibleSlabs(surfaces:GroundSurface[]):GroundSurface[]{
 const sorted=[...surfaces].sort((a,b)=>b.height-a.height);
 const deck:GroundSurface[]=[];
 for(const s of sorted){
   let parts=[s];
   for(const owner of deck){
     const next:GroundSurface[]=[];
     for(const part of parts){
       const [x0,z0]=part.min,[x1,z1]=part.max;
       const a=Math.max(x0,owner.min[0]),b=Math.min(x1,owner.max[0]);
       const c=Math.max(z0,owner.min[1]),d=Math.min(z1,owner.max[1]);
       if(a>=b-.00001||c>=d-.00001){next.push(part);continue;}
       const add=(x:number,z:number,X:number,Z:number)=>{
         if(X-x>.00001&&Z-z>.00001) next.push({min:[x,z],max:[X,Z],slope:s.slope,
           height:s.height+(x-s.min[0])*(s.slope?.[0]??0)+(z-s.min[1])*(s.slope?.[1]??0)});
       };
       add(x0,z0,a,z1);add(b,z0,x1,z1);add(a,z0,b,c);add(a,d,b,z1);
     }
     parts=next;
   }
   deck.push(...parts);
 }
 return deck;
}
export function buildModeWorld(stage:Stage,l:Layout,kind:string,seed:string){
 const r=rng(seed),p=palette(l.day),studio=l.day==='1123',ink=l.day==='0101',peace=l.day==='0815',shot=kind==='shot';
 const solid=new T.MeshStandardMaterial({roughness:.81,metalness:.08}),light=new T.MeshBasicMaterial();
 const k=new Kit({toon:solid,glow:light,lamp:light,lit:solid,glass:solid},seed),root=stage.scene;
 const sign=(parent:any,x:number,y:number,z:number,text:string,color=p.dark)=>{
   const c=document.createElement('canvas');c.width=768;c.height=128;
   const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,768,128);
   ctx.strokeStyle=p.glow;ctx.lineWidth=3;ctx.strokeRect(8,8,752,112);
   ctx.font='600 53px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff3d8';ctx.fillText(text,384,66,714);
   const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
   const tag=new T.Mesh(new T.PlaneGeometry(2.65,.44),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));tag.position.set(x,y,z);parent.add(tag);
 };
 // Tiled landings with joints and chamfered end borders; graded surfaces carry their true slope.
 for(const f of visibleSlabs(l.world.surfaces)){
   const width=f.max[0]-f.min[0],depth=f.max[1]-f.min[1],x=(f.min[0]+f.max[0])/2,z=(f.min[1]+f.max[1])/2;
   const tilt=f.slope?.[1]??0,g=k.group(root,x,f.height+tilt*depth/2,z,-Math.atan(tilt));
   // Sloping boards cover the complete horizontal extent of their collision strip.
   const length=depth*Math.hypot(1,tilt);
   k.box(g,p.dark,0,-.28,0,Math.max(.01,width-.06),.54,Math.max(.01,length-.06));
   k.box(g,p.deck,0,-.025,0,width,.05,length);
   if(f.height<-.3)continue;
   for(let row=-depth/2+.58;row<depth/2-.06;row+=.84){
     k.box(g,studio?'#776b60':'#989b89',0,.005,row,width-.1,.009,.015);
     for(let col=-width/2+.52+(Math.round((row+depth/2)*10)%2)*.42;col<width/2-.05;col+=1.33)k.box(g,'#959786',col,.008,row-.27,.018,.01,.46);
   }
   if(width>.22&&depth>.1)
     for(const side of [-1,1])k.box(g,p.trim,side*(width/2-.058),.014,0,.045,.018,depth-.08);
 }
 k.box(root,peace?'#759692':'#678e91',0,-.64,0,120,.03,110);
 if(ink)k.box(root,'#87b1a5',0,-.255,0,3,.018,7);
 for(let i=0;i<200;i++){
   const x=r.range(-30,30),z=-34+(i+r.range(.12,.88))*52/200;
   k.box(root,'#adc0b0',x,-.61,z,r.range(.16,1.2),.012,.025);
 }
 for(const b of l.world.boxes){
   const [x,y,z]=b.min.map((v,i)=>(v+b.max[i])*.5),[w,h,d]=b.max.map((v,i)=>v-b.min[i]);
   k.box(root,b.name.includes('下沿')?'#74614f':p.dark,x,y-.023,z,w,h-.046,d);
   k.box(root,p.trim,x,b.max[1]-.03,z,w+.035,.06,d+.035);
   if(b.name.includes('检修')||b.name.includes('望台')||b.name.includes('纸阁')){
     for(let i=0;i<h/.24;i++)k.box(root,p.trim,x,b.min[1]+i*.24+.08,b.max[2]+.012,w*.66,.034,.035);
     for(let zz=b.min[2]+.2;zz<b.max[2];zz+=.4)k.box(root,p.deck,x,b.max[1]+.008,zz,w-.1,.016,.035);
   }
   if(b.name.includes('布景')||b.name.includes('画屏')){
     for(let i=0;i<6;i++)k.box(root,'#cec9a9',x-.4*w+i*w*.15,b.min[1]+h*.59,z+d/2+.011,.065*w,h*.54,.018);
   }
 }
 if(ink){
  for(const x of [-6.3,6.3]){
   for(let z=-6;z<=4;z+=4.4){k.box(root,'#e3dbbb',x,1.32,z,1.65,2.7,3.3);
    for(const side of [-1,1])k.put('box',root,'toon','#52675d',x+side*.59,2.92,z,1.39,.14,3.94,0,0,-side*.38);
    k.box(root,'#3f554b',x,3.27,z,.18,.16,4.08);
    for(const off of [-1,0,1]){
     const face=x-Math.sign(x)*.84;k.box(root,p.dark,face,1.42,z+off,.041,1.08,.74);
     k.box(root,'#bfaa85',face-Math.sign(x)*.03,1.42,z+off,.025,.86,.56);
     for(const h of [1.2,1.5,1.74])k.box(root,p.dark,face-Math.sign(x)*.05,h,z+off,.03,.035,.61);
     for(const d of [-.16,.16])k.box(root,p.dark,face-Math.sign(x)*.052,1.43,z+off+d,.032,.88,.035);
    }
    for(let tile=-1.9;tile<1.96;tile+=.19)for(const side of [-1,1])
     k.beam(root,'#7b8877',[x,3.23,z+tile],[x+side*1.24,2.74,z+tile],.031);
    const eave=x-Math.sign(x)*1.08;
    k.cyl(root,'#6e5146',eave,2.48,z+1.34,.035,.47);k.ball(root,'#ba7656',eave,2.12,z+1.34,.15,.24,.15);
    k.cyl(root,'#cbb472',eave,1.87,z+1.34,.037,.12);
   }
  }
  const inkRack=l.stations[2].at;
  for(const d of [-.69,.69])k.cyl(root,p.dark,inkRack[0]+d,1.88,inkRack[2]-.63,.045,1.38);
  k.box(root,p.dark,inkRack[0],2.49,inkRack[2]-.63,1.54,.08,.08);
  for(let j=0;j<3;j++)k.box(root,'#eee3bf',inkRack[0]-.46+j*.46,2.10,inkRack[2]-.63,.36,.69,.028);
  for(let i=0;i<40;i++){const x=r.range(-1.4,1.4),z=-3.2+(i+r.range(.12,.88))*6.3/40;k.box(root,'#c3d3c0',x,-.232,z,.22,.008,.019);}
 }else{
  for(const sign of [-1,1])for(let j=0;j<6;j++){
   const z=-5.5+j*2.12,x=sign*(Math.abs(l.stations[0].at[0])+1.20);
   k.cyl(root,'#dad8c4',x,.37,z,.17,.74);k.ball(root,'#fff3d4',x,.79,z,.12,.14,.12,'glow');
   k.box(root,p.dark,x,.18,z-.86,.26,.17,1.02);
  }
  for(let i=0;i<24;i++){
   const x=r.range(-1.29,1.29),z=r.range(-3.3,3.3);k.cyl(root,'#849c84',x,-.59,z,.22,.038);
   if(i%3===0)for(let j=0;j<5;j++)k.ball(root,'#f8f3dd',x+.1*Math.cos(j*1.26),-.52,z+.1*Math.sin(j*1.26),.085,.06,.085);
  }
 }
 for(let i=0;i<38;i++){
   const x=r.range(-34,34),z=r.range(-42,-16),h=r.range(2,6);
   k.rock(root,studio?'#78878a':'#9eafa1',x,-1,z,h*1.5,h*.62,h,i);
   if(!studio){
     const top=h*.48-.69;k.cyl(root,'#746f58',x,top+.20,z,.14,1.26);
     k.ball(root,'#6e8069',x,top+1.43,z,.68,1.03,.64);
     k.ball(root,'#899b7d',x+.42,top+1.1,z+.08,.63,.69,.53);
   }
 }
 const origin:Vec=[l.end[0],0,-8];const landmark=buildModeLandmark(stage,l.day,origin);
 sign(root,0,1.15,-6.1,ink?'落款  ·  钤印':'纪念庭院  ·  献花');
 const rings=(points:Vec[],colour:string)=>points.map(([x,y,z])=>{
   const g=k.group(root,x,y+.028,z);k.ring(g,colour,0,.02,0,.69,Math.PI/2,0,'glow');k.cyl(g,p.trim,0,.008,0,.56,.02);
   return g;
 });
 const stations=rings(l.stations.map(s=>s.at),peace?'#f6eedc':'#ead083');
 l.stations.forEach((s,i)=>{
   const [x,y,z]=s.at;if(ink){k.box(root,'#a04639',x,y+.18,z,.34,.32,.34);k.ball(root,p.glow,x,y+.40,z,.13);}
   if(peace)for(let j=0;j<6;j++)k.ball(root,'#fff8e4',x+.12*Math.cos(j),y+.26,z+.12*Math.sin(j),.10,.065,.10);
 });
 const end=rings([l.end],p.glow)[0];
 // Workbench facing the player: the final interaction physically moves the lever, seal or bouquet.
 const bench=k.group(root,0,0,-5.89),prop=k.group(bench,0,.67,0);
 k.box(bench,p.dark,0,.28,-.02,1.54,.55,.62);k.box(bench,p.trim,0,.59,0,1.65,.10,.73);
 if(ink){
   k.box(bench,'#f4e7c6',0,.655,0,1.14,.025,.55);k.box(prop,'#b63e2f',0,.055,0,.28,.11,.26);
   k.taper(prop,'#705741',0,.22,0,.1,.28);k.ball(prop,p.glow,0,.39,0,.09);
 }else{
   for(let i=0;i<7;i++){
     const x=Math.sin(i*2.41)*(i+1)*.026,z=Math.cos(i*2.41)*(i+1)*.024,y=.39+(i%3)*.10;
     k.beam(prop,'#7c966b',[0,0,0],[x,y,z],.013);
     for(let j=0;j<5;j++)k.ball(prop,'#fff9dd',x+.057*Math.cos(j*1.26),y,z+.057*Math.sin(j*1.26),.055,.032,.051);
   }
 }
 const guide=k.group(root,-1.1,0,5.12);
 if(!shot){
   const g=guide;k.cyl(g,ink?'#707566':p.dark,0,.51,0,.24,.85);k.ball(g,'#c09d83',0,1.11,0,.195,.21,.18);
   k.cyl(g,ink?'#343c39':'#536c65',0,1.29,0,.22,.12);k.box(g,p.trim,.21,.77,.12,.23,.31,.06);
   for(const side of [-1,1]){
    k.beam(g,ink?'#566552':p.dark,[side*.15,.86,0],[side*.25,.63,.09],.074);
    k.ball(g,'#c09d83',side*.25,.63,.11,.062);
    k.ball(g,p.dark,side*.069,1.13,.17,.022);
   }
   if(ink){k.taper(g,'#ded8be',0,.94,.121,.09,.22,true);k.beam(g,p.dark,[.22,.63,.09],[.36,.99,.10],.016);}
   if(peace){k.cyl(g,'#887956',-.25,.43,.11,.10,.20);k.ball(g,p.glow,-.25,.48,.11,.072,.08,.072,'glow');}
   sign(g,0,1.83,0,ink?'齐白石 · 画室':'讲解员 · 花径');
 }
 k.flush();
 let guideMoved=0,lastTime=0,guideRoute:Vec[]|null=null;
 return {update(time:number,progress:number,finale:number,visited:Set<number>,active:boolean[],positions:Vec[],health:number[],pulse:number[],given:boolean,body:Vec){
   landmark.update(time,progress,finale);end.scale.setScalar(progress>=1?1+.07*Math.sin(time*4):.73);
   const f=Math.min(1,finale/.9);
   if(ink){prop.position.y=.94-.29*Math.sin(Math.PI*Math.min(1,finale*.92));prop.rotation.y=.15;}
   else{prop.position.set(.24*(1-f),.68+.42*(1-f),.18*(1-f));prop.rotation.z=.83-.37*f;}
   if(peace&&!shot&&given){
     if(!guideRoute&&Math.abs(body[0])>.75)guideRoute=body[0]*l.stations[0].at[0]>0?l.mainPath:l.sidePath;
     const route=guideRoute??l.mainPath;
     if(guideRoute)guideMoved=Math.min(1,guideMoved+(time-lastTime)*.09);
     const ft=Math.min(route.length-1-.001,guideMoved*(route.length-1)),i=Math.floor(ft),a=route[i],b=route[i+1],t=ft-i;
     guide.position.set(a[0]*(1-t)+b[0]*t-.5,a[1]*(1-t)+b[1]*t+.025*Math.sin(time*7),a[2]*(1-t)+b[2]*t-.27);
   }
   lastTime=time;
   stations.forEach((g,i)=>{g.visible=!visited.has(i);});
 }};
}
