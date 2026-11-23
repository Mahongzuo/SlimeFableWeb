import type {AlmanacSpec} from '../../content/levels/types';
/** The animated instrument gives each station a physical readout of the input being tested. */
export function drawInstrument(canvas:HTMLCanvasElement,mode:AlmanacSpec['activity'],value:number,goal:number,time:number,station:number,a:boolean,b:boolean){
 const g=canvas.getContext('2d')!,w=canvas.width,h=canvas.height;
 g.clearRect(0,0,w,h);g.fillStyle='#102a33';g.fillRect(0,0,w,h);
 const sea='#87ead1',gold='#ffd597',white='#e7e7c9';
 function line(x:number,y:number,u:number,v:number,col=sea,thick=2){g.strokeStyle=col;g.lineWidth=thick;g.beginPath();g.moveTo(x,y);g.lineTo(u,v);g.stroke();}
 function circle(x:number,y:number,r:number,col:string){g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}
 for(let i=0;i<w;i+=15)line(i,0,i,h,'#1c3942',1);
 for(let j=0;j<h;j+=15)line(0,j,w,j,'#1c3942',1);
 const end=24+goal*(w-48),pos=24+value*(w-48),cy=h/2;
 if(mode==='hover'||mode==='dock'){
  const y=h-10-value*(h-20),target=h-10-goal*(h-20);
  g.fillStyle='#d4a35a35';g.fillRect(0,target-8,w,16);line(w*.65,target,w-10,target,gold);
  const cx=w*.41;line(cx-22,y,cx+22,y,white,3);circle(cx,y,7,gold);
  if(mode==='hover'){const span=14+26*Math.abs(Math.cos(time*17));line(cx-span,y-11,cx+span,y-11,sea,2);line(cx,y-10,cx,y,sea);}
  else{g.fillStyle='#568bad';g.fillRect(cx-28,y-6,14,12);g.fillRect(cx+14,y-6,14,12);}
 }else if(mode==='pong'||mode==='kick'){
  const p=mode==='pong'?Math.min(1,time/3.4):1;
  g.strokeStyle='#b4d5af';g.strokeRect(12,8,w-24,h-16);
  if(mode==='pong'){line(pos-19,h-9,pos+19,h-9,sea,5);const offset=(1-p)*48*Math.sin(time*3);circle(end+offset,12+p*(h-27),5,white);}
  else{line(end-30,17,end+30,17,gold,5);line(pos,h-15,pos,22,sea,1);circle(pos,h-14,7,white);}
 }else if(mode==='logic'||mode==='aux'){
  for(const [i,on] of [a,b].entries()){const y=24+38*i,col=on?sea:'#53666a';circle(35,y,7,col);line(42,y,105,y,col,3);line(105,y,129,cy,col,3);}
  g.strokeStyle=gold;g.strokeRect(130,cy-14,57,28);g.font='bold 13px monospace';g.fillStyle=white;
  g.fillText(mode==='logic'?['AND','XOR','NOT A'][station]:'SCE',136,cy+4);line(187,cy,w-42,cy);circle(w-34,cy,8,gold);
 }else if(mode==='tide'){
  g.beginPath();g.moveTo(0,h);for(let i=0;i<=w;i+=3)g.lineTo(i,cy+10*Math.sin(i/32+time*2)+8*(value-.5));g.lineTo(w,h);g.fillStyle='#326a70';g.fill();
  line(end,12,end,h-8,gold);const y=cy+10*Math.sin(pos/32+time*2);circle(pos,y,7,sea);line(pos,y,pos,y-19,white,3);
 }else if(mode==='drive'){
  g.strokeStyle=gold;g.strokeRect(end-13,22,26,h-35);line(8,h-18,w-8,h-18,'#a58669',3);
  g.fillStyle=white;g.fillRect(pos-14,h-39,28,13);for(let i=-1;i<=1;i++)circle(pos+i*10,h-24,5,'#80a8ad');
 }else if(mode==='beat'){
  for(let i=0;i<22;i++){const x=12+i*(w-24)/22;line(x,cy+7,x,cy+7-8-7*Math.cos(i*1.8+time*2),'#46746e',5);}
  line(end,9,end,h-9,gold,3);circle(pos,cy,8,sea);
 }else{
  line(15,h-12,end,15,gold,1);line(15,h-12,pos,15,sea,3);circle(15,h-12,7,white);circle(end,15,4,gold);
  for(let i=0;i<4;i++){const t=(time*.5+i*.25)%1;circle(15+(pos-15)*t,h-12+(27-h)*t,2.3,white);}
 }
}
