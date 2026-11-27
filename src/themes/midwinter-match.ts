import * as T from 'three';
import type {Kit} from './folio-landmarks';
import type {MidDay} from '../templates/midwinter-defense';
import {brass,steel,slate,ivory,red,globe,spacecraft,unit} from './winter-boards';
import {trainSet,tunnelPortal} from './december-defense';
import {winch,channel,karst} from './midwinter-boards';
type Motion=(t:number,p:number,f:number,contacts:readonly boolean[],branch:number)=>void;

function climatePlate(part:number){
 const cn=document.createElement('canvas');cn.width=320;cn.height=320;const c=cn.getContext('2d')!;
 c.fillStyle='#b3d1c0';c.fillRect(0,0,320,320);c.save();c.translate(-part*320,0);
 const coast=(x:number)=>139+52*Math.sin(x*.015)+29*Math.sin(x*.034)+14*Math.cos(x*.081);
 for(let n=0;n<14;n++){c.beginPath();for(let x=0;x<645;x+=4){const y=coast(x)+11+n*9+3*Math.sin(x*.024+n);if(x)c.lineTo(x,y);else c.moveTo(x,y);}
   c.strokeStyle=n%3?'#94b8aa':'#87aa9b';c.lineWidth=n%3?1:2;c.stroke();}
 c.beginPath();c.moveTo(0,0);c.lineTo(640,0);for(let x=640;x>=0;x-=4)c.lineTo(x,coast(x));c.closePath();c.fillStyle='#d1c59a';c.fill();c.save();c.clip();
 for(let j=0;j<25;j++){const x=(j*97)%640,y=(j*47)%190;c.fillStyle=j%2?'#878f65':'#93a377';c.beginPath();c.ellipse(x,y,50-j%7*4,19+j%5*4,j*.49,0,Math.PI*2);c.fill();}
 c.beginPath();c.moveTo(53,-10);c.bezierCurveTo(126,58,122,6,201,44);c.bezierCurveTo(282,85,258,46,337,101);c.bezierCurveTo(366,120,387,119,398,208);c.strokeStyle='#769e99';c.lineWidth=7;c.stroke();c.restore();
 for(let i=0;i<640;i+=32){c.fillStyle='#ecdfbd44';c.fillRect(i,0,1,320);if(i<320)c.fillRect(0,i,640,1);}
 c.restore();c.lineWidth=2;c.strokeStyle='#e9dcb7';c.strokeRect(7,7,306,306);
 const tex=new T.CanvasTexture(cn);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return new T.MeshBasicMaterial({map:tex});
}
function transportBadge(k:Kit,g:T.Group,kind:number){
 if(kind===0){k.ball(g,'#597e87',0,.12,0,.63,.20,.24);k.box(g,ivory,-.13,.32,0,.47,.23,.29);k.cyl(g,red,-.26,.51,0,.066,.20);}
 else if(kind===1){k.ball(g,ivory,0,.20,0,.59,.12,.12);for(const s of [-1,1])k.beam(g,steel,[0,.21,0],[-.29,.28,s*.51],.074);
   k.beam(g,red,[-.38,.25,0],[-.48,.48,0],.066);}
 else{k.box(g,'#d1b485',0,.16,0,.77,.25,.47);for(const s of [-1,1])k.box(g,'#ad8261',s*.24,.297,0,.043,.025,.47);
   k.box(g,ivory,.04,.294,.018,.26,.018,.21);}
}
function track(k:Kit,g:T.Group,z:number,length:number){
 k.box(g,'#a69e89',0,0,z,length,.15,.60);
 for(const s of [-1,1])k.box(g,steel,0,.105,z+s*.17,length,.051,.047);
 for(let i=0;i<19;i++)k.box(g,'#887964',-length*.46+i*length*.051,.086,z,.064,.033,.46);
}
export function buildMidMatch(k:Kit,g:T.Group,day:MidDay):Motion{
 const end=k.group(g);end.name='mid-end';
 if(day==='1212'){
   k.box(g,'#a68d6c',0,.15,0,5.66,.30,2.93);
   for(const x of [-1.78,1.78]){k.beam(g,'#82745c',[x,.30,-1.01],[x,1.39,-.78],.061);k.beam(g,brass,[x,.30,.74],[x,1.36,-.78],.045);}
   const table=k.group(g,0,.88,-.13,.34);const sides=[-1,1].map((s,i)=>{
     const panel=k.group(i?end:table);if(i)table.add(end);
     k.box(panel,'#846e54',s*1.13,0,0,2.23,.14,2.22);
     const image=new T.Mesh(new T.PlaneGeometry(2.16,2.13),climatePlate(i));image.rotation.x=-Math.PI/2;image.position.set(s*1.13,.083,0);panel.add(image);
     for(const z of [-1.02,.97])k.cyl(panel,brass,s*2.12,.103,z,.037,.041);return panel;
   });
   const seal=k.group(table,.12,.102,.83);k.cyl(seal,red,0,.05,0,.22,.08);
   for(let i=0;i<4;i++){k.box(seal,ivory,-.10+i*.062,.101,0,.016,.016,.22);}
   return(t,p,f,c,branch)=>{sides[0].rotation.z=-.56*(1-unit(p*2.71));end.rotation.z=.52*(1-unit(p*1.07+f*.55));end.position.z=.40*(1-unit(p*.75+f*.71));
     seal.visible=f>0;seal.rotation.y=branch===2?.25:-.15;};
 }
 if(day==='1213'){
   k.box(g,'#524f55',0,.17,0,5.68,.34,2.83);for(const x of [-1.95,1.83]){k.taper(g,'#968865',x,.53,0,.36,.35);k.cyl(g,brass,x,.84,0,.056,.40);}
   const moon=k.group(g,-1.94,1.15,0);k.ball(moon,'#c5c1aa',0,0,0,.49);for(let i=0;i<5;i++)k.ball(moon,'#aaa99c',-.32+i*.13,-.13+.18*Math.sin(i),.40,.073,.054,.048);
   const earth=k.group(g,1.84,1.34,.02);globe(k,earth,.66);
   const rails=[0,1].map(n=>{const rail=k.group(g);for(let i=0;i<28;i++){
     const point=(i:number):[number,number,number]=>{const t=i/28;return [-1.61+3.09*t,1.13+Math.sin(t*Math.PI)*(.35+n*.77),-.03+(n?-.39:.35)*Math.sin(t*Math.PI)];};
     k.beam(rail,n?'#b9c5ae':'#a59976',point(i),point(i+1),.027);}
     return rail;});
   const craft=k.group(end,0,0,0,0,0,0,.39);spacecraft(k,craft,'relay');k.ball(craft,ivory,0,.46,0,.24,.19,.24);
   return(t,p,f,c,branch)=>{const u=Math.min(1,p*.72+unit(f)*.28);end.position.set(-1.62+3.14*u,1.23+Math.sin(Math.PI*u)*(.43+(branch===2?.82:0)),-.03+(branch===2?-.36:.36)*Math.sin(Math.PI*u));
     end.rotation.z=.23*Math.cos(Math.PI*u);earth.rotation.y=t*.13;rails.forEach((r,i)=>r.visible=!branch||p<.64||i===branch-1);};
 }
 if(day==='1214'){
   k.box(g,'#958c70',0,.14,0,5.62,.28,2.84);
   channel(k,g,[[-2.66,.32,.29],[-1.64,.32,.56],[-.32,.32,.62],[1.05,.32,.10],[2.67,.32,.20]],.70,'#81aaa4','#ae9f7d');
   for(let n=0;n<11;n++){const x=-2.54+n*.50;k.rock(g,n%2?'#949479':'#aeaa86',x,.38,-1.12,.31,.19+n%4*.080,.27,n);}
   const spans=[-1,0,1].map((s,i)=>{const block=k.group(g,s*1.01,.62,-.18);k.taper(block,'#c1af89',0,.37,0,.53,.75);
     for(let j=0;j<4;j++)k.box(block,i%2?'#a4997d':'#b2aa8e',0,.085+j*.179,.28,.88,.151,.21);return block;});
   const posts=[-.51,.52];for(const x of posts){k.box(g,steel,x,1.09,.02,.13,1.47,.34);k.box(g,brass,x,1.88,.02,.29,.13,.45);}
   k.box(g,'#b4a588',0,1.83,.02,1.26,.13,.38);
   end.position.set(0,.63,.10);k.box(end,'#7d958b',0,.36,0,.87,.76,.12);for(let i=0;i<4;i++)k.box(end,ivory,0,.11+i*.15,.077,.74,.027,.019);
   const wheel=k.group(g,1.97,.36,-.79);const turn=winch(k,wheel);
   return(t,p,f)=>{spans.forEach((b,i)=>b.position.y=.25+.37*unit(p*3-i));end.position.y=.63+.70*unit(f*.9);turn.rotation.x=p*.60+unit(f)*4.13;};
 }
 if(day==='1215'){
   k.box(g,'#937d65',0,.15,0,5.57,.30,2.82);k.box(g,'#73979a',0,.35,-.17,5.34,.10,2.10);
   for(const s of [-1,1]){k.box(g,'#c3b385',s*2.24,.46,-.17,.76,.14,2.10);
     for(let i=0;i<4;i++){const x=s*(1.96+i*.15);k.box(g,i%2?'#87988a':'#ad9c7a',x,.62+i*.04,-.96,.15,.29+i*.08,.25);}}
   const post=k.group(g,-1.86,.52,-.84);k.box(post,'#c8ad7f',0,.30,0,.75,.60,.46);
   for(const side of [-1,1])k.put('box',post,'toon','#7b997e',0,.64,side*.15,.84,.065,.38,side*.41);
   k.box(post,'#5a736b',-.16,.24,.246,.18,.39,.036);k.box(post,'#9ab9b3',.17,.36,.246,.20,.17,.033);
   const crane=k.group(g,1.75,.51,-.83);for(const dx of [-.16,.16])k.box(crane,steel,dx,.61,0,.069,1.20,.10);
   k.beam(crane,brass,[-.52,1.08,0],[.24,1.51,0],.046);k.beam(crane,steel,[-.52,1.08,0],[-.52,.76,0],.018);
   for(let lane=0;lane<3;lane++){const z=-.75+lane*.60;
     for(let i=0;i<16;i++)k.box(g,'#d6c59a',-1.77+i*.238,.413,z,.133,.022,.036);
     const dock=.44+lane*.29;k.box(g,'#ac9775',(dock+2.12)*.50,.45,z,2.12-dock,.109,.37);
     for(let i=0;i<4;i++)k.box(g,ivory,dock+.09+i*.19,.514,z,.033,.018,.31);}
   const tokens=[0,1,2].map((kind)=>{const token=k.group(end,-1.83,.45,-.74+kind*.60,0,0,0,.88);transportBadge(k,token,kind);return token;});
   return(t,p,f,c)=>{tokens.forEach((v,i)=>{const arrived=p>.66||p>=.33&&c[i];
     v.position.x=-1.83+(arrived?1.83+i*.29:0)+unit(f*.90)*.66;
     v.position.y=.54+(i===1?Math.sin(Math.PI*unit(p))*.83:0);});end.position.z=unit(f)*.10;};
 }
 k.box(g,'#829075',0,.14,0,5.68,.28,2.86);const land=k.group(g,0,.30,-.02);
 for(let i=0;i<5;i++)karst(k,land,-2.33+i*1.00,-.97-.11*Math.cos(i),.62+i%2*.13,1.52+(i*3%5)*.25,i);
 for(const x of [-2.33,-1.46,-.57,.48,1.47,2.35]){k.box(land,'#a9a88d',x,.27,.28,.22,.55,1.18);k.box(land,'#b4b096',x,.60,.28,.33,.11,1.31);}
 const rail=k.group(land,0,.70,.24);track(k,rail,.36,5.51);track(k,rail,-.36,5.51);
 tunnelPortal(k,rail,-1.54,-.36,.47,'#a29c81');
 for(const x of [1.2,2.1]){k.box(rail,steel,x,.57,-.86,.083,1.17,.10);}
 k.box(rail,'#8ca49c',1.66,1.17,-.78,1.42,.12,.49);
 const train=k.group(end,0,1.18,0,0,0,0,.59);trainSet(k,train,'#59877d');
 return(t,p,f,c,branch)=>{const u=p*.54+unit(f*.9)*.46;end.position.x=-1.85+2.54*u;end.position.z=.24+(branch===2?-.36:.36)*unit((p-.28)*2.6);};
}

