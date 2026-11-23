import * as T from 'three';
import type {Stage} from '../level/stage';
import {Kit} from './folio-landmarks';

/** Scenery for the invented studio, print workshop and memorial garden. Local front faces +Z. */
export function buildModeLandmark(stage:Stage,day:string,origin:[number,number,number]){
 const clay=new T.MeshStandardMaterial({roughness:.75}),glow=new T.MeshBasicMaterial();
 const kit=new Kit({toon:clay,glow,lamp:glow,lit:clay,glass:clay},day+'-keepsake');
 const root=kit.group(stage.scene,...origin);
 const dark='#22353a',wood='#795643',brass='#bd9b68',paper='#f6e7c6';
 function panel(x:number,y:number,z:number,width:number,height:number,paint:(ctx:CanvasRenderingContext2D)=>void){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
   const ctx=canvas.getContext('2d')!;paint(ctx);
   const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
   const mesh=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));
   mesh.position.set(x,y,z);root.add(mesh);return {mesh,ctx,texture};
 }
 const changes:((time:number,progress:number,finale:number,litScreens?:readonly boolean[])=>void)[]=[];
 if(day==='1123'){
   const snow=document.createElement('canvas');snow.width=128;snow.height=64;
   const sc=snow.getContext('2d')!,pixels=sc.createImageData(128,64);
   let rand=1963;
   for(let i=0;i<pixels.data.length;i+=4){rand=(Math.imul(rand,1664525)+1013904223)>>>0;const v=40+(rand>>>25);pixels.data.set([v,v+2,v+4,255],i);}
   sc.putImageData(pixels,0,0);
   kit.box(root,wood,0,.7,-.1,5.4,1.4,1);kit.box(root,brass,0,1.42,0,5.6,.08,1.12);
   for(let i=0;i<3;i++){
     const x=(i-1)*1.75,y=i===1?2.32:2.16;
     kit.box(root,dark,x,y,0,1.68,1.32,.85);
     kit.box(root,'#4f5754',x-.12,y,.434,1.26,1.04,.06);
     for(const k of [-1,1]){kit.ball(root,brass,x+.66,y+k*.16,.46,.076,.076,.05);kit.beam(root,brass,[x, y+.68,-.18],[x+.52*k,y+1.18,-.22],.018);}
     for(let j=0;j<5;j++)kit.box(root,wood,x+.63,y-.47+j*.045,.439,.22,.014,.02);
     const screen=panel(x-.12,y,.478,1.14,.88,()=>{});let last=-10,lastPhase=-1;
     changes.push((t,p,f,litScreens)=>{
       const phase=f>0?2:(litScreens?.[i]??(p>=(i+1)/3))?1:0;
       if(phase===lastPhase&&(phase||t-last<.16))return;
       last=t;lastPhase=phase;
       const c=screen.ctx;c.fillStyle='#213039';c.fillRect(0,0,512,256);
       if(!phase){const off=Math.floor(t*37)%64;c.drawImage(snow,0,-off,512,256);c.drawImage(snow,0,256-off,512,256);}
       else{c.strokeStyle='#c8d6ce';for(let n=0;n<9;n++){c.beginPath();c.ellipse(256,127,238-n*16,114-n*8,0,0,Math.PI*2);c.stroke();}
         c.fillStyle='#233241';c.fillRect(75,75,362,101);c.fillStyle='#fff8e1';c.textAlign='center';c.font='bold 48px SimSun,serif';c.fillText(phase===2?['1963','神秘博士','11月23日'][i]:'信号 '+(i+1),256,141);}
       c.fillStyle='#18252d43';for(let row=0;row<256;row+=6)c.fillRect(0,row,512,2);
       screen.texture.needsUpdate=true;
     });
   }
   const lamp=new T.Mesh(new T.SphereGeometry(.15,16,12),new T.MeshBasicMaterial({color:'#53342e'}));lamp.position.set(0,3.22,.05);root.add(lamp);
   let onAir=false;
   changes.push((_t,_p,f)=>{
     if(f>0&&!onAir){onAir=true;window.dispatchEvent(new Event('studio-transmission'));}
     lamp.material.color.set(f>.3?'#ff5439':'#653d37');
   });
 }else if(day==='0101'){
   // Ink bamboo on a hanging scroll, with a seal applied at each milestone.
   kit.box(root,wood,0,1.03,0,4.9,.2,1.2);
   for(const x of [-2.08,2.08]){kit.box(root,wood,x,.47,0,.16,.94,.88);kit.cyl(root,wood,x,2.45,-.22,.09,2.8);}
   kit.beam(root,brass,[-2.25,3.83,-.22],[2.25,3.83,-.22],.085);
   let seals=-1;
   const scroll=panel(0,2.47,-.17,3.4,2.48,()=>{});
   for(const x of [-1.6,1.6])kit.box(root,'#a14434',x,1.23,.33,.32,.25,.32);
   changes.push((_t,p,f)=>{
     const n=f>0?3:Math.floor(p*3+.0001);if(n===seals)return;seals=n;
     const c=scroll.ctx;c.fillStyle=paper;c.fillRect(0,0,512,256);
     for(let j=0;j<5;j++){const x=32+j*43;c.strokeStyle=j%2?'#50645d':'#304840';c.lineWidth=4-j*.43;c.beginPath();c.moveTo(x,256);c.quadraticCurveTo(x+28,102,x+76,6+j*9);c.stroke();
       for(let h=0;h<4;h++){const yy=55+h*43,xx=x+58-h*11;for(const sign of [-1,1]){
         c.fillStyle=j%2?'#637466':'#3e5149';c.beginPath();c.moveTo(xx,yy);c.quadraticCurveTo(xx+sign*24,yy-29,xx+sign*44,yy-22);c.quadraticCurveTo(xx+sign*29,yy-13,xx,yy);c.fill();}}}
     c.fillStyle=dark;c.font='27px SimSun,serif';c.fillText('齐白石',358,69);c.font='18px SimSun,serif';c.fillText('一月一日',350,98);
     for(let j=0;j<n;j++){const x=349+j*38,y=148+(j%2)*22;c.strokeStyle='#ab422f';c.lineWidth=3;c.strokeRect(x,y,29,32);c.fillStyle='#a2392d';c.font='bold 24px SimSun,serif';c.fillText('水墨印'[j],x+2,y+25);}
     scroll.texture.needsUpdate=true;
   });
 }else{
   kit.box(root,'#78877e',0,.21,0,4.35,.42,1.6);kit.box(root,'#c8c8af',0,.46,0,4.5,.12,1.7);
   kit.box(root,'#52685f',0,1.53,-.48,2.8,2.05,.42);
   panel(0,1.89,-.255,2.4,.95,c=>{c.fillStyle='#52685f';c.fillRect(0,0,512,256);c.textAlign='center';c.fillStyle='#f0eddb';c.font='44px SimSun,serif';c.fillText('一九八五',256,108);c.font='32px SimSun,serif';c.fillText('八月十五日',256,169);});
   for(const side of [-1,1])for(let j=0;j<5;j++){const x=side*(1.48+j*.32);kit.box(root,'#819387',x,1-j*.08,-.75,.28,1.9-j*.16,.33);}
   const bouquet=kit.group(root,0,.53,.35);
   for(let i=0;i<13;i++){const a=i*2.4,x=Math.cos(a)*i*.055,z=Math.sin(a)*i*.034,h=.45+(i%3)*.13;
     kit.beam(bouquet,'#738777',[0,0,0],[x,h,z],.018);
     for(let j=0;j<6;j++){const b=j*Math.PI/3;kit.ball(bouquet,'#fffae7',x+.083*Math.cos(b),h+.016,z+.083*Math.sin(b),.078,.039,.079);}
     kit.ball(bouquet,brass,x,h+.058,z,.037);
   }
   changes.push((t,p,f)=>{bouquet.scale.setScalar(.35+.65*(f>0?1:p));bouquet.rotation.z=Math.sin(t*1.3)*.012;});
 }
 kit.flush();
 return {update(time:number,progress:number,finale:number,litScreens?:readonly boolean[]){for(const change of changes)change(time,Math.max(0,Math.min(1,progress)),finale,litScreens);}};
}

