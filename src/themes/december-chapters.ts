/** Miniature displays and their mechanisms are fictional. All paint is generated in the browser. */
import * as T from 'three';
import type {Stage} from '../level/stage';
import {workbench,bakeDesk,batch,texture,fibers,deskLight} from './jan01-chapter';
import {type DecemberRun} from '../templates/december-chapters';
export type Bench=ReturnType<typeof workbench>;
export type Motion<S=DecemberRun>=(s:S,t:number,x:number,z:number)=>void;
export type Builder<S=DecemberRun>=(b:Bench,st:Stage)=>Motion<S>;
export const brass='#d5ad67',cream='#ead9af',iron='#3c4d50',wood='#966747',jade='#41776a',red='#a9473f';
export {batch,texture};
export function rod(b:Bench,c:string,a:number[],p:number[],r=.05,parent:T.Object3D=b.fixed){
  const v=new T.Vector3(...a),difference=new T.Vector3(...p).sub(v);v.addScaledVector(difference,.5);
  const m=b.cylinder(c,v.x,v.y,v.z,r,r,difference.length(),parent);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),difference.normalize());return m;
}
export function ring(b:Bench,c:string,x:number,y:number,z:number,r:number,wire=.035,parent:T.Object3D=b.fixed,flat=true){
  const m=b.part(new T.TorusGeometry(r,wire,7,48),c,x,y,z,1,1,1,parent);if(flat)m.rotation.x=Math.PI/2;return m;
}
export function paint(st:Stage,c:string,draw:(g:CanvasRenderingContext2D)=>void){
  return st.toon('#fff',{map:texture(768,384,g=>{g.fillStyle=c;g.fillRect(0,0,768,384);fibers(g,768,384,1700);draw(g);})});
}
export function floor(b:Bench,c:string|T.Material,x=0,z=0,w=9.2,d=5.4,y=0){
  return b.box(c,x,y-.24,z,w,.48,d,b.fixed,'solid-deck');
}
export function panel(b:Bench,mat:string|T.Material,x:number,y:number,z:number,w:number,h:number,rim:string){
  b.box(rim,x,y,z,w+.18,h+.18,.18);b.box(mat,x,y,z+.116,w,h,.044);
}
export function label(st:Stage,background:string,word:string,ink:string){
  return paint(st,background,g=>{g.fillStyle=ink;g.font='bold 158px serif';g.textAlign='center';g.fillText(word,384,245,674);g.lineWidth=3;g.strokeStyle=ink;g.strokeRect(23,30,722,324);});
}
export function postcard(b:Bench,st:Stage,p:T.Group,c:string,x:number,y:number,z:number,round:boolean){
  const ink=round?'#577568':'#a0634c',m=paint(st,c,g=>{g.strokeStyle=ink;g.lineWidth=11;
    if(round){g.beginPath();g.arc(523,131,70,0,7);g.stroke();}else g.strokeRect(447,62,145,139);
    for(let i=0;i<3;i++)g.fillRect(83,136+i*40,214-i*29,6);});
  b.box(m,x,y,z,1.12,.065,.68,p);
}
export function scope(k:string){
  const skies:Record<string,[string,string]>={mail:['#9ab1a7','#dfd2ab'],archive:['#999e9a','#d7ceb4'],lens:['#9cb8bb','#e1e3ce'],message:['#182c44','#839698'],lantern:['#3c5263','#a9a99b'],rover:['#916d6a','#d6a781'],bridge:['#93b0ab','#d7c8a0'],drum:['#a08c80','#dfc799'],falls:['#80a7ae','#c2d3c4'],foil:['#7e8d89','#cfc0a1']};
  const [top,horizon]=skies[k];return {...deskLight,skyTop:top,skyHorizon:horizon,wash:horizon,fog:[22,60] as [number,number]};
}
type DisplayRun=Pick<DecemberRun,'goal'|'alternative'|'collectibles'|'marks'|'markCount'|'pin'|'end'>&{spec:{pin?:[number,number]}};
export function theatre<S extends DisplayRun>(st:Stage,s:S,make:Builder<S>){
  const b=workbench(st),move=make(b,st);
  const goldRing=ring(b,'#e8be68',0,.104,0,.43,.029,b.root),inside=ring(b,'#fff0c0',0,.102,0,.49,.014,b.root);
  const secondRing=ring(b,'#e8be68',0,.104,0,.43,.029,b.root);
  const pin=s.spec.pin?b.cylinder(brass,...[s.spec.pin[0],.095,s.spec.pin[1],.34,.42,.18,b.root] as const):undefined;
  const signs=s.collectibles.slice(0,s.markCount).map(([x,z])=>b.part(new T.OctahedronGeometry(.082),s.spec.pin?'#a4c2a8':'#e0b975',x,.76,z,1,1,1,b.root));
  const world=bakeDesk(st,b.root);batch(b.fixed);
  function update(t:number,x:number,z:number){move(s,t,x,z);
    const [gx,gz]=s.goal;goldRing.position.set(gx,.106,gz);inside.position.set(gx,.103,gz);inside.scale.setScalar(1+.045*Math.sin(t*3));goldRing.visible=inside.visible=s.end<0;
    const choice=s.alternative;secondRing.visible=!!choice;if(choice)secondRing.position.set(choice[0],.105,choice[1]);
    if(pin)pin.scale.y=s.pin?.57:1;signs.forEach((m,i)=>{m.visible=!s.marks.has(i)&&s.end<0;m.rotation.y=t*.83+i;m.position.y=.78+.07*Math.sin(t*2+i);});}
  return {world,root:b.root,update};
}

