/** Exhibition props and movement are game interpretations. */
import * as T from 'three';
import type {Stage} from '../level/stage';
import {type Builder,type Bench,paint,brass,cream,iron,rod,batch,ring} from './december-chapters';
import {folded} from './midwinter-chapters';
import type {YearendRun} from '../templates/yearend-chapters';
export type Exhibit=Builder<YearendRun>;
export function boatHull(b:Bench,g:T.Group,col:string,l:number,w:number){
 const profile=[[-.50,.03,.21],[-.38,.78,.05],[0,1,0],[.36,.86,.05],[.50,.04,.27]];
 const pts=profile.map(([x,beam,up])=>[[x*l,.39+up,beam*w],[x*l,.14+up,beam*w*.72],[x*l,.10+up,-beam*w*.72],[x*l,.39+up,-beam*w]]);
 for(let i=1;i<pts.length;i++)for(let j=0;j<4;j++){const n=(j+1)%4;
  folded(b,j===3?'#ae8660':col,[pts[i-1][j],pts[i][j],pts[i][n],pts[i-1][n]],g);}
 for(const side of [-1,1])for(let i=1;i<profile.length;i++){const [x,y,h]=profile[i-1],[xx,yy,hh]=profile[i];
  rod(b,brass,[x*l,.41+h,y*w*side],[xx*l,.41+hh,yy*w*side],.029,g);}
}
export function pennant(b:Bench,x:number,y:number,z:number,c:string,p:T.Object3D){
 folded(b,c,[[x,y,z],[x+.2,y-.04,z],[x+.08,y-.29,z+.02]],p);
}
export function globe(st:Stage){return paint(st,'#5b8b9d',g=>{g.fillStyle='#9eb198';
 for(const [x,y,rx,ry,rot] of [[130,110,99,43,.4],[213,222,36,80,-.4],[418,103,113,37,-.12],[445,198,49,79,-.31],[570,145,100,48,.24],[643,262,44,26,-.18]]){
 g.beginPath();g.ellipse(x,y,rx,ry,rot,0,Math.PI*2);g.fill();}
 g.lineWidth=7;g.strokeStyle='#d1d9cb';for(let i=0;i<18;i++){const x=i*97%720,y=i*43%290;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+18,y-9,x+57,y+11,x+91,y-2);g.stroke();}});}
export function arc(b:Bench,p:T.Group,points:number[][],c:string,r:number){for(let i=1;i<points.length;i++)rod(b,c,points[i-1],points[i],r,p);}
export function castBell(b:Bench,p:T.Group,x:number,y:number,z:number,k:number){
 const bell=b.group(p);bell.position.set(x,y,z);bell.scale.setScalar(k);ring(b,brass,0,0,0,.13,.04,bell,false);
 const seg=[new T.Vector2(.10,-.12),new T.Vector2(.33,-.22),new T.Vector2(.37,-.65),new T.Vector2(.54,-.86),new T.Vector2(.52,-.96)];
 b.part(new T.LatheGeometry(seg,32),'#9b8860',0,0,0,1,1,1,bell);ring(b,brass,0,-.81,0,.47,.028,bell);
 b.oval(iron,0,-.92,0,.07,.14,.07,bell);batch(bell);return bell;
}
export function groundMark(b:Bench,x:number,z:number,k:number,col=cream){return ring(b,col,x,.046,z,k,.021);}

