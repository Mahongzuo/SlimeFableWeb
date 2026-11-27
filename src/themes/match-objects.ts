import * as T from 'three';
import type {Stage} from '../level/stage';
import {Kit} from './folio-landmarks';

/** Fictional interactive counter and tabletop canal; currency and ship are stylised props. */
export function buildMatchObjects(stage:Stage,day:string){
 const clay=new T.MeshStandardMaterial({roughness:.6}),light=new T.MeshBasicMaterial();
 const k=new Kit({toon:clay,glow:light,lamp:light,lit:clay,glass:clay},'match-'+day);
 const root=k.group(stage.scene,0,0,-1.5);
 const dark='#24474c',gold='#e9bc65',ivory='#f9ecd0',teal='#397f81',red='#c35a41';
 const target=new T.Vector3();
 const updates:((t:number,p:number,f:number)=>void)[]=[];
 function placard(p:T.Object3D,x:number,y:number,z:number,w:number,h:number,main:string,small:string,bg=dark,fg=ivory){
   const c=document.createElement('canvas');c.width=640;c.height=224;const pen=c.getContext('2d')!;
   pen.fillStyle=bg;pen.fillRect(0,0,c.width,c.height);pen.strokeStyle=fg;pen.lineWidth=4;pen.strokeRect(10,10,620,204);
   pen.textAlign='center';pen.fillStyle=fg;pen.font='bold 83px Georgia,SimSun,serif';pen.fillText(main,320,119,588);
   pen.font='bold 35px Georgia,SimSun,serif';pen.fillText(small,320,178,590);
   const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
   const plate=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex}));
   plate.position.set(x,y,z);p.add(plate);
 }
 if(day==='0101'){
   root.name='coin-counter';
   const wood='#a96647',jade='#7bb1a3';
   // Shop window, ribbed canvas awning and a shelf of wrapped rolls. The
   // counter floats in a miniature shop with a recognisable front and back.
   k.box(root,'#76948a',0,2.65,-2.3,7.8,5.3,.2);
   for(let i=0;i<8;i++){
     const x=(i-3.5)*.83;
     k.box(root,i%2?'#c3d9c1':'#d1dfc9',x,2.55,-2.16,.78,2.3,.075);
     k.put('box',root,'toon',i%2?'#bd5946':'#f4d8a0',x,4.05,-1.57,.83,.12,1.58,.19);
     k.box(root,i%2?'#a34339':'#e5c98c',x,3.81,-.81,.82,.27,.12);
   }
   k.box(root,'#866248',0,1.25,-1.88,7.3,.16,.63);
   for(let i=0;i<12;i++){
     const x=-2.95+(i%6)*.42, y=1.51+Math.floor(i/6)*.37;
     k.put('round',root,'toon','#dfbc8b',x,y,-1.81,.175,.46,.175,Math.PI/2);
     k.put('round',root,'toon','#b1966b',x,y,-1.568,.13,.02,.13,Math.PI/2);
   }
   k.box(root,wood,1.7,.65,.85,9,1.3,3.72);k.box(root,ivory,1.7,1.35,.85,9.14,.13,3.84);
   for(let x=-2.5;x<6.1;x+=.46)k.box(root,'#d39364',x,.66,2.724,.04,1.06,.036);
   k.box(root,teal,1.7,1.17,2.719,9.02,.09,.016);
   for(const side of [-1,1]){k.cyl(root,gold,side*2.34,2.19,-.56,.055,1.64);k.ball(root,ivory,side*2.34,3.05,-.56,.13);}
   k.beam(root,gold,[-2.34,3.01,-.56],[2.34,3.01,-.56],.05);
   placard(root,0,2.57,-.52,2.95,.83,'€　零钱柜台','01 · 01 · 2002',teal);
   const register=k.group(root,.80,1.43,-.08);
   k.box(register,jade,0,.32,0,1.08,.64,.75);k.box(register,teal,0,.73,-.12,.92,.33,.48);
   placard(register,0,.75,.128,.78,.23,'€','EURO',dark);
   for(let x=0;x<4;x++)for(let z=0;z<2;z++)k.cyl(register,ivory,-.32+x*.21,.658,.12+z*.13,.057,.041);
   k.box(register,'#283f38',0,.14,.387,.9,.14,.023);
   for(let i=0;i<3;i++)k.box(register,gold,-.26+i*.26,.665,.245,.076,.055,.052);
   const stacks:T.Group[]=[];
   for(let i=0;i<3;i++){
     const x=-1.6+i*.74;
     k.cyl(root,dark,x,1.45,.3,.33,.065);k.ring(root,gold,x,1.49,.3,.33,Math.PI/2);
     const pile=k.group(root,x,1.5,.3);stacks.push(pile);
     k.cyl(pile,i===1?ivory:gold,0,.032,0,.237,.06);
     k.cyl(pile,i===1?gold:ivory,0,.067,0,.145,.012);
     for(let j=0;j<=i;j++)k.box(pile,wood,-.06+j*.043,.079,0,.014,.009,.12);
   }
   // A printed stack of change envelopes beside the till.
   for(let i=0;i<5;i++){k.box(root,i===4?jade:ivory,-1.62,1.442+i*.028,-.37,.88,.025,.4,.07);}
   const landing=[-1,-1,-1];
   updates.push((t,p,f)=>{
     for(let i=0;i<3;i++){
       const pile=stacks[i];pile.visible=p*3>=i+.95;
       if(!pile.visible){landing[i]=-1;continue;}
       if(landing[i]<0)landing[i]=t;
       const age=t-landing[i],amplitude=Math.exp(-4*age);
       pile.rotation.z=amplitude*Math.sin(age*18)*.45;
       pile.position.y=1.5+amplitude*.19*Math.abs(Math.sin(age*9));
     }
   });
   return finish((step:number)=>target.set(-1.6+step*.74,1.71,-1.2));
 }
 const sea='#4cbdba',stone='#c5ac85',iron='#3d6469',wood='#916b4b';
 k.box(root,stone,0,.36,0,6.2,.72,2.5);
 k.box(root,sea,0,.77,0,6.05,.15,2.1);
 for(const s of [-1,1]){
   const lip=s>0?.73:1.15;
   k.box(root,stone,0,lip-.18,s*1.13,6.15,.36,.23);
   k.box(root,ivory,0,lip,s*1.13,6.2,.075,.27);
   for(let j=0;j<10;j++)k.cyl(root,iron,-2.85+j*.63,lip+.12,s*1.14,.031,.2);
   k.beam(root,iron,[-2.87,lip+.21,s*1.14],[2.88,lip+.21,s*1.14],.017);
 }
 for(let j=0;j<4;j++){
   const x=-2.8+j*1.73;
   k.box(root,'#668e6b',x,.95,-1.64,1.7,.37,.65);
   k.rock(root,'#7ca082',x,1.31,-1.77,.79,.56,.4);
   k.rock(root,'#9db38b',x+.41,1.3,-1.87,.57,.4,.36);
 }
 placard(root,0,1.97,-1.68,2.82,.73,'巴拿马运河','15  /  VIII  /  1914',teal);
 for(const s of [-1,1])k.cyl(root,ivory,s*1.31,1.48,-1.72,.04,1.32);
 const gates:T.Group[][]=[];
 for(let j=0;j<3;j++){
   const x=-.83+j*.99;
   const doors:T.Group[]=[];gates.push(doors);
   for(const side of [-1,1]){
     const hinge=k.group(root,x,.8,side*.99);doors.push(hinge);
     k.box(hinge,iron,0,.22,-side*.49,.12,.44,.99);
     for(let l=0;l<3;l++)k.box(hinge,gold,.069,.1+l*.13,-side*.5,.028,.026,.87);
     k.cyl(root,red,x,1.2,side*1.12,.085,.27);
   }
 }
 const ship=k.group(root,-2,1,0,0,0,0,1.13);
 // Longitudinal hull sections make a pointed foredeck and rounded transom.
 const xStations=[-.82,-.66,-.35,.37,.67,.92],width=[.12,.245,.285,.28,.21,.01];
 const coords:number[]=[];
 for(let i=0;i<xStations.length-1;i++){
   for(const sign of [-1,1]){
     const a=xStations[i],b=xStations[i+1],wa=width[i]*sign,wb=width[i+1]*sign;
     coords.push(a,0,wa,b,0,wb,b,-.22,wb*.6,a,0,wa,b,-.22,wb*.6,a,-.22,wa*.6);
     coords.push(a,0,0,b,0,0,b,0,wb,a,0,0,b,0,wb,a,0,wa);
   }
 }
 const hullGeo=new T.BufferGeometry();hullGeo.setAttribute('position',new T.Float32BufferAttribute(coords,3));hullGeo.computeVertexNormals();
 ship.add(new T.Mesh(hullGeo,new T.MeshStandardMaterial({color:dark,roughness:.68,side:T.DoubleSide})));
 k.box(ship,ivory,-.02,.12,0,1.01,.24,.39);k.box(ship,wood,-.02,.265,0,1.08,.045,.48);
 k.box(ship,ivory,.08,.38,0,.65,.19,.31);k.box(ship,dark,.08,.49,0,.75,.045,.4);
 for(const side of [-1,1])for(let j=0;j<5;j++)k.box(ship,teal,-.39+j*.18,.14,side*.201,.073,.075,.017);
 k.cyl(ship,'#b9623e',-.2,.58,0,.087,.54);k.cyl(ship,dark,-.2,.85,0,.093,.08);
 for(const x of [-.58,.58]){k.cyl(ship,wood,x,.47,0,.024,.95);k.beam(ship,'#ab9676',[x,.87,0],[x>0?.84:-.77,.08,0],.01);}
 placard(ship,0,.09,.293,.54,.145,'ANCON','1914',dark);
 const foam=k.group(ship,-.88,-.09,0);
 for(let i=0;i<7;i++)k.ball(foam,'#e1f3d9',-i*.085,0,(i%2?1:-1)*i*.029,.1,.012,.047);
 let along=0,last=0;
 updates.push((t,p,f)=>{
   const dt=Math.max(0,Math.min(.1,t-last));last=t;
   along+=((f>0?1:p)-along)*(1-Math.exp(-1.7*dt));
   ship.position.x=-2.07+along*3.97;ship.position.y=1.075+Math.sin(t*2.3)*.014;ship.rotation.x=Math.sin(t*1.8)*.014;
   ship.rotation.y=-.04*Math.sin(along*Math.PI);foam.scale.z=.78+.2*Math.sin(t*4);
   gates.forEach((doors,j)=>doors.forEach((hinge,n)=>{hinge.rotation.y=(n?1:-1)*Math.min(1,Math.max(0,p*3-j))*1.39;}));
 });
 return finish((step:number)=>target.set(-.83+step*.99,1.12,-.54),()=>along>.96);
 
 function finish(destination:(step:number)=>T.Vector3,passed=()=>true){k.flush();return {
   destination,passed,update(t:number,p:number,f:number){for(const animate of updates)animate(t,p,f);}
 };}
}
