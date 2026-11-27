import * as T from 'three';
import {Kit} from './folio-landmarks';
import type {JanuaryDefense} from '../templates/january-defense';

export const decemberDefensePalette={
 '1202':['#2a3249','#c5af9f','#7e7d83','#aaa397','#bd9365','#ebc785'],
 '1203':['#5a8b8c','#e3d7ad','#82a383','#c8c2a4','#996039','#ddb77c'],
 '1204':['#273855','#8da1b2','#717e91','#a5aea8','#d98360','#f3d487'],
 '1205':['#587783','#e6bc90','#709b9a','#c4ad83','#ac7860','#a4d7b2'],
 '1206':['#282c47','#9a99af','#737b8f','#9e9fa7','#b19a78','#ddce95'],
} as const;
export type DecemberDefenseDay=keyof typeof decemberDefensePalette;
export function isDecemberDefense(day:string):day is DecemberDefenseDay {return Object.hasOwn(decemberDefensePalette,day);}

function rover(k:Kit,g:T.Group){
 k.box(g,'#bc9557',0,.53,0,1.12,.38,.81);
 for(const s of [-1,1]){
   for(const x of [-.49,0,.49]){
     k.put('round',g,'toon','#485257',x,.26,.48*s,.236,.15,.236,Math.PI/2);
     k.put('round',g,'toon','#c5ad78',x,.26,.57*s,.141,.043,.141,Math.PI/2);
     k.beam(g,'#b4ad8f',[x,.34,.40*s],[x+.13,.49,.33*s],.037);}
   k.box(g,'#3c5874',0,.815,s*.78,1.24,.071,.63);
   for(let i=0;i<6;i++)k.box(g,'#c8aa77',-.54+i*.211,.86,s*.78,.024,.018,.60);
 }
 k.cyl(g,'#dad6be',.37,1.03,0,.047,.63);k.box(g,'#8b9493',.37,1.40,0,.30,.19,.31);
 for(const z of [-.08,.08])k.ball(g,'#323e47',.525,1.4,z,.028,.057,.055);
}
export function trainSet(k:Kit,g:T.Group,tone:string){
 for(let n=0;n<2;n++){const x=n*1.52-.75;
   k.box(g,'#deddd0',x,.53,0,1.44,.6,.59);
   k.box(g,tone,x,.43,.301,1.41,.12,.027);
   for(let i=0;i<5;i++)k.box(g,'#516572',x-.57+i*.28,.65,.309,.19,.18,.022);
   k.box(g,'#838e90',x,.86,0,1.41,.05,.58);
   for(const dx of [-.48,.48])k.put('round',g,'toon','#404c51',x+dx,.18,0,.16,.49,.16,Math.PI/2);
 }
 k.ball(g,'#d6ded3',1.45,.46,0,.47,.34,.30);k.ball(g,'#587582',1.53,.64,0,.25,.16,.27);
 k.ball(g,'#ffd58a',1.80,.45,.15,.043,.039,.045,'lamp');
}
function rails(k:Kit,g:T.Group,x:number,z:number,length:number){
 for(const dz of [-.30,.30])k.box(g,'#65716d',x,.14,z+dz,length,.089,.073);
 for(let i=0;i<Math.floor(length/.39);i++)k.box(g,'#9f8f74',x-length/2+.21+i*.39,.051,z,.14,.10,.93);
}
type V3=[number,number,number];
/** Skin a continuous section with vertex-coloured quads; adjacent courses have no hidden overlapping faces. */
export function sectionMesh(k:Kit,parent:T.Group,build:(quad:(a:V3,b:V3,c:V3,d:V3,color:string)=>void)=>void){
 const positions:number[]=[],colors:number[]=[],tone=new T.Color();
 build((a,b,c,d,color)=>{
   tone.set(color);for(const v of [a,b,c,a,c,d]){positions.push(...v);colors.push(tone.r,tone.g,tone.b);}
 });
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
 const material=k.mats.toon.clone();material.vertexColors=true;material.side=T.DoubleSide;
 const body=new T.Mesh(geo,material);body.castShadow=body.receiveShadow=true;parent.add(body);
}
export function tunnelPortal(k:Kit,g:T.Group,x:number,z:number,r:number,shade:string){
 const wall=.34;
 for(const side of [-1,1])k.box(g,shade,x,.47,z+side*(r+wall/2),1.07,.94,wall);
 sectionMesh(k,g,quad=>{
   const point=(angle:number,radius:number,side:number):V3=>[x+side*.535,.94+radius*Math.sin(angle),z+radius*Math.cos(angle)];
   for(let i=0;i<14;i++){
     const a=i*Math.PI/14,b=(i+1)*Math.PI/14,stone=i%4===1?'#b9aa91':shade;
     for(const edge of [-1,1])quad(point(a,r,edge),point(a,r+wall,edge),point(b,r+wall,edge),point(b,r,edge),stone);
     quad(point(a,r,-1),point(b,r,-1),point(b,r,1),point(a,r,1),'#817e70');
     quad(point(a,r+wall,-1),point(b,r+wall,-1),point(b,r+wall,1),point(a,r+wall,1),stone);
   }
 });
}
function capsule(k:Kit,g:T.Group){
 k.taper(g,'#cbb18b',0,.42,0,.49,.65);k.ball(g,'#d9ccb5',0,.75,0,.27,.12,.29);
 k.cyl(g,'#755d4c',0,.13,0,.51,.16);k.ball(g,'#455560',.12,.55,.34,.14,.13,.068);
}
export function solarWing(k:Kit,g:T.Group,x:number,y:number,z:number,w:number,d:number){
 k.box(g,'#a39474',x,y,z,w,.081,d);k.box(g,'#344f70',x,y+.052,z,w-.066,.028,d-.066);
 for(let i=1;i<8;i++)k.box(g,'#a6abb0',x-w/2+w*i/8,y+.074,z,.018,.015,d-.06);
 k.box(g,'#a6abb0',x,y+.074,z,w-.06,.014,.027);
}
export function buildDecemberDefenseTable(k:Kit,root:T.Group,game:JanuaryDefense,day:DecemberDefenseDay){
 const control=game.control!,scene=k.group(root,0,0,-4.77),controlTable=k.group(root,1.95,.045,3.84);
 const moving=k.group(scene),device=k.group(controlTable);
 const activeLights:T.Group[]=[];
 let animate:(t:number,p:number,f:number)=>void;
 if(day==='1202'){
   const landing=k.group(scene,-3.43,.05,0);
   k.box(landing,'#c2a06b',0,1.36,0,2.13,1.15,1.75);
   k.taper(landing,'#af9160',0,.67,0,.61,.43,true);
   for(const s of [-1,1])for(const z of [-1,1]){k.beam(landing,'#b39463',[s*.88,1.22,z*.64],[s*1.53,.16,z*1.12],.078);k.cyl(landing,'#d8c18e',1.54*s,.105,1.14*z,.26,.16);}
   for(let i=0;i<15;i++){const x=-2.45+i*.20;k.box(scene,'#cbbd97',x,1.51-i*.095,.16,.16,.063,1.03);}
   solarWing(k,landing,-1.54,1.95,0,1.17,1.54);
   k.put('taperDown',landing,'toon','#e0d7bf',.49,2.33,-.30,.48,.20,.48,.43);
   rover(k,moving);
   for(let n=0;n<3;n++){const x=2.42+n*1.88;
     k.taper(scene,'#aa9d80',x,.13,-.05,.48,.26);k.cyl(scene,'#908778',x,1.15,-.05,.083,2.10);
     k.box(scene,'#b59b6e',x,2.13,-.05,.49,.31,.32);const glow=k.group(scene,x,2.15,.145);
     k.ball(glow,'#ffe3a0',0,0,0,.17,.11,.05,'lamp');activeLights.push(glow);}
   for(let i=0;i<12;i++)k.rock(controlTable,i%3?'#888486':'#b5a99b',-5+i*.74,.12,Math.sin(i*2)*.62,.35+i%3*.15,.20+i%3*.07,.35,i);
   k.box(controlTable,'#80745f',0,.30,.05,2.04,.60,.80);
   for(let i=0;i<6;i++)k.box(controlTable,'#b7aa83',-.8+i*.32,.62,.05,.13,.055,.59);
   k.cyl(device,'#e1c390',0,.84,0,.06,.41);
   k.box(device,'#556273',0,1.12,0,.70,.31,.25);k.ball(device,'#f1d48c',.19,1.12,.14,.10,.10,.035,'lamp');
   animate=(t,p,f)=>{const d=Math.min(1,p*.75+Math.min(1,f)*.25);
     moving.position.set(-3.35+d*7.4,Math.max(.18,1.97-d*3.76),.14);moving.rotation.z=d<.53?-.26:0;
     device.rotation.y=(Math.floor(control.focus/2)-1)*.52;activeLights.forEach((v,i)=>v.visible=p>.95||control.active>0&&i===Math.floor(control.focus/2));};
 }else if(day==='1203'){
   rails(k,scene,0,.12,16);trainSet(k,moving,'#b25b4e');
   for(const s of [-1,1]){
     const x=3.6*s;tunnelPortal(k,scene,x,.12,1.08,'#a39880');
     for(let n=0;n<5;n++){const xx=x+Math.cos(n*1.8)*.87;k.rock(scene,n%2?'#68836c':'#94a07e',xx,1.0,-1.91-n*.10,.90,1.37+n%3*.27,.75,n);}
     for(let n=0;n<4;n++){const xx=s*(5.3+n*.60);k.cyl(scene,'#85795a',xx,.66,-1.47,.068,1.32);k.ball(scene,'#799370',xx,1.58+n%2*.12,-1.49,.51,.67,.43);}
     const sig=k.group(scene,x+s*.78,1.24,1.37);k.box(sig,'#53645d',0,0,0,.34,.72,.28);
     k.cyl(scene,'#8c8f78',x+s*.78,.58,1.37,.067,1.16);
     const light=k.group(sig,0,.13,.16);k.ball(light,'#9bde96',0,0,0,.099,.099,.043,'lamp');activeLights.push(light);}
   rails(k,controlTable,-1.17,0,7.15);
   for(const x of [-1.55,1.55]){k.box(controlTable,'#96a194',x,.38,-.73,.83,.76,.56);
     k.box(controlTable,'#dfd0a4',x,.74,-.73,.93,.12,.64);}
   k.cyl(device,'#67756a',0,.80,.05,.098,1.59);k.beam(device,'#ca8653',[0,1.52,.05],[.92,1.63,.05],.066);
   animate=(t,p,f)=>{moving.position.set(-6.40+p*10.68+Math.min(1.5,f)*.53,.17,.12);
     activeLights.forEach((v,i)=>v.visible=i===control.side);device.rotation.y=control.side?.79:-.79;};
 }else if(day==='1204'){
   const c=k.group(moving);capsule(k,c);
   const door=k.group(moving,.27,.49,.37);door.name='rescue-hatch';k.box(door,'#b7a282',-.19,0,0,.35,.32,.09);
   k.box(door,'#947b5e',-.28,.05,.058,.09,.04,.026);
   for(let i=0;i<14;i++){const a=i*2*Math.PI/14,x=Math.cos(a),z=Math.sin(a);
     k.ball(moving,i%2?'#c7836a':'#e2ceb0',x*.60,2.52,z*.60,.42,.36,.44);
     k.beam(moving,'#d4c9b0',[x*.26,.70,z*.26],[x*.90,2.49,z*.90],.015);}
   k.ball(moving,'#d3ae87',0,2.65,0,.67,.35,.67);
   for(const side of [-1,1]){const vehicle=k.group(scene,3.87*side,.06,.40);
     k.box(vehicle,'#a49d78',0,.60,0,1.84,.77,1.02);k.box(vehicle,'#c4b897',.62,1.13,0,.62,.46,.91);
     k.box(vehicle,'#5d747a',.68,1.20,.466,.34,.19,.026);
     for(const x of [-.61,.61])for(const z of [-.51,.51])k.put('round',vehicle,'toon','#434d55',x,.28,z,.27,.18,.27,Math.PI/2);
     const light=k.group(vehicle,-.29,1.17,0);k.put('round',light,'toon','#b0a17c',0,.19,.04,.30,.39,.30,Math.PI/2);
     k.ball(light,'#ffe2a0',0,.19,.25,.28,.25,.043,'lamp');activeLights.push(light);}
   for(const s of [-1,1]){const x=s*1.21;k.cyl(controlTable,'#96978a',x,.73,-.04,.064,1.47);k.box(controlTable,'#647079',x,1.45,-.04,.43,.24,.42);}
   k.box(device,'#71818b',0,.31,0,1.37,.63,.81);k.put('round',device,'toon','#d4c397',0,.68,0,.38,.08,.38);
   k.beam(device,'#b67757',[0,.76,0],[.34,.76,0],.039);
   animate=(t,p,f)=>{moving.position.set((1-p)*2.53*Math.sin(.6+t*.62),.09+2.47*(1-p),.10);moving.rotation.z=(1-p)*.14*Math.sin(t);door.rotation.y=Math.min(1,f*.94)*1.48;
     activeLights.forEach((l,i)=>l.rotation.y=(i?-.67:.67)+(control.focus%2?.57:-.33)+Math.sin(t*1.4)*.14);device.rotation.y=control.focus*.73;};
 }else if(day==='1205'){
   const harbor=k.group(scene);for(const s of [-1,1]){
     for(let n=0;n<5;n++){const x=s*(3.32+.82*n),height=1.64+((n*3+s+5)%5)*.48;
       k.box(harbor,n%2?'#799290':'#5e838b',x,height/2,-.51+n%2*.28,.68,height,1.0);
       for(let floor=0;floor<height*2;floor++)k.box(harbor,'#c3c8aa',x,.31+floor*.43,.014+n%2*.28,.46,.078,.029);}
     const towerX=s*2.43;for(const z of [-.58,.58])k.box(harbor,'#ab8065',towerX,1.52,z,.17,3.02,.19);
     k.box(harbor,'#d6b98e',towerX,2.97,.01,.27,.17,1.46);
     for(let q=1;q<6;q++){const x=towerX-s*q*.49;for(const z of [-.58,.58])k.beam(harbor,'#bc9c78',[towerX,2.85,z],[x,1.15,z],.028);}
   }
   k.box(harbor,'#8a8c7f',0,1.02,0,8.76,.26,1.34);
   const mallets=[-1,1].map(s=>{
     const gong=k.group(harbor,3.36*s,1.19,.72);
     for(const x of [-.56,.56])k.box(gong,'#736750',x,.62,0,.073,1.24,.073);
     k.box(gong,'#ac8962',0,1.23,0,1.23,.08,.09);k.beam(gong,'#786b56',[0,1.20,0],[0,.98,0],.022);
     k.put('round',gong,'toon','#ceac6d',0,.65,0,.39,.085,.39,Math.PI/2);
     const mallet=k.group(gong,.48,.85,.18);k.beam(mallet,'#8e6d51',[0,0,0],[-.39,-.21,0],.036);
     k.ball(mallet,'#ac6c50',-.40,-.21,0,.083);return mallet;
   });
   for(const s of [-1,1]){const packet=k.group(moving);k.box(packet,s<0?'#c6775a':'#599883',0,0,0,.64,.32,.35);
     k.box(packet,'#f1dfb7',0,.178,0,.44,.031,.27);activeLights.push(packet);}
   for(const s of [-1,1]){k.box(controlTable,'#636f68',s*1.22,.41,0,1.88,.82,.76);
     for(let i=0;i<4;i++)k.box(controlTable,'#d3b88d',s*1.22-.60+i*.40,.63,.40,.22,.115,.035);}
   for(let n=0;n<4;n++)k.box(device,'#c5c3a4',0,.12+n*.14,.15,.68,.12,.50);
   animate=(t,p,f)=>{activeLights.forEach((q,i)=>{const u=(t*.15+i*.39)%1;q.position.set((i?1:-1)*(3.70-7.4*u),1.34,(i?.31:-.31));});
     device.scale.y=.18+control.reserve*.205;mallets.forEach((m,i)=>m.rotation.x=f>0?.27*Math.sin(f*13-i*.3)*Math.exp(-f):.39);}; 
 }else{
   const chaser=k.group(moving),host=k.group(scene,1.16,1.93,0);
   for(const [g,x,r] of [[host,.87,.78],[chaser,-.24,.55]] as const){
     k.put('round',g,'toon','#a5ada7',x,0,0,r,1.38,r,0,0,Math.PI/2);
     for(let n=0;n<3;n++)k.ring(g,'#bfa779',x-.55+n*.51,0,0,r+.035,0,Math.PI/2);
     for(const side of [-1,1]){solarWing(k,g,x,.02,side*(r+.80),1.45,1.36);k.beam(g,'#ae9772',[x,0,side*r],[x,0,side*(r+1.05)],.054);}
   }
   k.ring(host,'#d9c490',-.07,0,0,.55,0,Math.PI/2);
   for(let i=0;i<3;i++){const a=i*2.094,claw=k.group(host,-.11,.52*Math.cos(a),.52*Math.sin(a));
     k.beam(claw,'#d0ac73',[0,0,0],[-.34,-.12*Math.cos(a),-.12*Math.sin(a)],.065);activeLights.push(claw);}
   k.box(device,'#c1985b',0,.39,0,.66,.72,.57);k.ring(device,'#d7ca9c',0,.56,0,.38,Math.PI/2);
   for(const sign of [-1,1]){
     const x=sign*2.15;k.put('round',controlTable,'toon','#9aa9a7',x,.64,0,.63,1.45,.63,0,0,Math.PI/2);
     k.ring(controlTable,'#bfa679',x-sign*.76,.64,0,.63,0,Math.PI/2);}
   k.box(controlTable,'#7a8583',0,.095,0,3.52,.19,.60);
   animate=(t,p,f)=>{chaser.position.set(-5.30+p*5.65,1.93+(1-p)*.45*Math.sin(t),0);chaser.rotation.x=(1-p)*t*.15;
     activeLights.forEach((a,i)=>a.rotation.x=(f>0||control.active>0?.57:.13)+i*.06);
     device.position.x=-1.17+Math.min(1,f*.89)*2.34;};
 }
 for(let i=0;i<6;i++){
   const [x,z]=game.map.pads[i],post=k.group(root,x+(i%2?.50:-.50),.01,z+.50);
   k.taper(post,'#7c8175',0,.11,0,.175,.21);k.cyl(post,'#bcb698',0,.38,0,.049,.36);
   k.ball(post,i%2?'#d49874':'#a3cbb7',0,.61,0,.107,.092,.107,'lamp');
 }
 for(const s of [-1,1]){k.box(root,'#6f796d',0,-.16,s*6.295,20.06,.17,.09);k.box(root,'#7d8375',s*10.045,-.16,0,.09,.17,12.50);}
 return {update:animate};
}

