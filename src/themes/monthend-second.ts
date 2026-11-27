/** Mechanical and optical exhibits are original miniatures, including the photographic observation cabinet. */
import * as T from 'three';
import {floor,paint,label,rod,ring,batch,wood,jade,brass,cream,red,iron} from './december-chapters';
import {grain,starwall,peaked} from './winter-chapters';
import {tiles,ripples,ease,folded,skyline} from './midwinter-chapters';
import {boatHull,arc,globe} from './yearend-chapters';
import {type Exhibit,ink,props,backdrop,table,spool,pairCards,sheet,frame,register,penn} from './monthend-chapters';
export const concert:Exhibit=(b,st)=>{
 floor(b,grain(st,'#ac8967'));backdrop(b,'#987463','#815f52');for(const k of [-1,1])for(let j=0;j<4;j++)b.cylinder(j%2?'#935b52':'#aa6c59',k*(3.2+j*.24),1.66,-3.48,.17,.19,3.32);
 b.box(wood,0,.39,-2.25,5.33,.78,1.10);const pipes=[-1,1].map(k=>props(b,[k*1.33,.82,-2.22],g=>{for(let i=0;i<6;i++){const x=(i-2.5)*.28,h=.83+i*.22;b.cylinder(brass,x,h*.5,0,.096,.12,h,g);b.box(iron,x,h-.095,.092,.095,.13,.026,g);}}));
 const bellows=props(b,[0,.18,.64],g=>{for(let i=0;i<7;i++)b.box(i%2?wood:'#bd9470',0,i*.074,0,1.17-(i%2)*.13,.082,.75-(i%2)*.10,g);});
 const hand=props(b,[0,1.15,-1.67],g=>{rod(b,iron,[0,-.10,0],[0,.69,0],.035,g);b.oval(brass,0,.51,0,.074,.085,.055,g);});
 const notes=sheet(b,st,0,1.54,-3.63,2.39,1.16,'notes');return(s,t)=>{hand.rotation.z=s.wave*.66;bellows.scale.y=.63+.73*s.meter;
 notes.visible=s.count>0;pipes.forEach((m,i)=>m.position.y=.82+(s.end>=0?.05*Math.abs(Math.sin(t*6+i)):0));};
};
export const contacts:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#9b9f89','#818a79'));backdrop(b,'#b7b59e','#9d9d88');table(b,0,.57,-2.02,4.92,1.24);
 b.cylinder(iron,0,.71,-2.08,1.14,1.27,.20);b.box('#99988a',0,.89,-2.08,.85,.25,.65);
 for(const k of [-1,1]){rod(b,'#737d70',[k*.98,.78,-2.53],[k*.98,2.52,-2.53],.034);rod(b,'#9aa592',[k*.98,2.52,-2.53],[k*.66,2.73,-2.53],.031);}
 rod(b,'#919e8b',[-.67,2.73,-2.53],[.67,2.73,-2.53],.030);
 const needles=[-1,1].map(k=>props(b,[k*.78,1.89,-2.14],g=>{rod(b,brass,[0,.08,0],[-k*.60,-.70,.06],.028,g);b.oval(brass,0,.09,0,.12,.12,.09,g);}));
 const display=sheet(b,st,2.04,1.33,-2.10,1.13,.92,'wave','#c0cabc');
 const paper=sheet(b,st,0,.72,-1.81,2.04,.85,'wave');
 return(s,t)=>{needles.forEach((m,i)=>m.rotation.z=!!(s.mask&(1<<i))?0:(i?1:-1)*(.30-(s.carry===i?s.aim:0)));
 display.visible=s.mask!==0;paper.visible=s.end>=0;paper.position.y=.70+.42*ease(s.end);paper.position.z=-1.66+.57*ease(s.end);};
};
export const layers:Exhibit=(b,st)=>{
 floor(b,grain(st,'#74685b'));backdrop(b,'#605c57','#534f4a');for(const k of [-1,1]){b.box('#665447',k*3.14,1.43,-3.52,.52,2.76,.26);b.oval('#ae6652',k*3.13,2.40,-3.28,.14,.15,.11);}
 table(b,0,.65,-2.08,4.70,1.23);const box=props(b,[0,1.55,-2.35],g=>{b.box(iron,0,0,0,3.51,1.95,.28,g);b.box('#435764',0,0,.17,3.26,1.73,.05,g);});
 const cross=[-1,1].map(k=>props(b,[k*.81,1.55,-2.10],g=>{rod(b,brass,[-.38,0,0],[.38,0,0],.014,g);rod(b,brass,[0,-.34,0],[0,.34,0],.014,g);}));
 const prints=pairCards(b,st,['moon','earth']);const final=b.box(paint(st,'#283f52',g=>{g.fillStyle='#7fa5b1';g.beginPath();g.arc(453,111,61,0,7);g.fill();g.fillStyle='#aebfa6';g.beginPath();g.ellipse(440,98,32,12,-.4,0,7);g.fill();
 g.fillStyle='#c5c4b2';g.beginPath();g.ellipse(388,407,536,170,-.12,0,7);g.fill();g.strokeStyle='#e2d6bd';g.lineWidth=18;g.strokeRect(10,9,748,366);}),0,0,0,2.79,1.39,.04,b.root);
 const plateMoon=b.oval('#b9b8a8',0,1.00,-2.14,1.45,.31,.02,b.root),plateEarth=b.oval('#819eae',.41,1.82,-2.13,.24,.24,.02,b.root);
 return(s,t,x,z)=>{prints.forEach((m,i)=>{const p=register(s,i,x,z);m.position.set(p[0],p[1],p[2]);});cross.forEach((c,i)=>{c.visible=s.carry===i;c.position.x=(i?.81:-.81)+(s.aligned?0:s.aim-.27);});
 plateMoon.visible=!!(s.mask&1);plateEarth.visible=!!(s.mask&2);final.visible=s.end>=0;final.position.set(0,.56+ease(s.end)*.83,.97-ease(s.end)*.99);};
};
export const mirrors:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#718285','#61777d'));starwall(b,st,'#27374b');const groups=[-1,0,1].map(k=>b.group());const panelGeom=new T.CylinderGeometry(.38,.38,.09,6);
 const cells:number[][]=[];for(let row=0;row<5;row++){const n=5-Math.abs(row-2);for(let j=0;j<n;j++){
  if(row!==2||j!==2)cells.push([(j-(n-1)/2)*.686,(row-2)*.582]);}}
 for(const [x,y] of cells){const i=x<-.49?0:x>.49?2:1;const m=b.part(panelGeom,i===1?'#d1ac61':i?'#dcb76d':'#c69e5b',x,1.95+y,-2.61,1,1,1,groups[i]);m.rotation.x=Math.PI/2;}
 groups.forEach(g=>batch(g));for(const k of [-1,1])rod(b,iron,[k*1.03,.65,-2.60],[0,1.80,-1.45],.031);
 b.oval(iron,0,1.81,-1.46,.16,.15,.12);b.box(wood,0,.27,-.95,2.07,.54,.75);
 const spots=[-1,1].map(k=>b.oval(k<0?'#cbaa62':'#83aaa6',0,.61,-.95,.092,.045,.091,b.root));
 const halo=ring(b,cream,0,.606,-.95,.29,.015,b.root);
 return(s,t)=>{[0,1].forEach(i=>{const value=s.wings[i];groups[i?2:0].rotation.y=(value-.53)*.39;
  spots[i].position.x=(value-.5)*2.62;});halo.position.x=((s.step===2?s.focalSpot:s.mirrorGoal)-.5)*2.62;
  halo.scale.setScalar(s.step<2?.51:.31+Math.abs(s.focusDepth-s.bestFocus)*2.45);halo.visible=s.carry>=0||s.mask!==0;};
};
export const cabinet:Exhibit=(b,st)=>{
 floor(b,grain(st,'#766c5e'));backdrop(b,'#68675f','#575b55');b.box(wood,0,1.35,-2.85,5.59,2.70,.73);
 for(const k of [-1,1]){b.box('#354c55',k*1.21,1.45,-2.44,2.09,1.63,.055);for(const j of [-1,1])b.box(brass,k*1.21+j*.99,1.45,-2.38,.042,1.53,.04);}
 const icons=[-1,1].map((k,i)=>sheet(b,st,k*1.21,1.49,-2.33,1.44,1.10,i?'diamond':'round','#abbfb9'));
 const flaps=[-1,1].map(k=>b.box('#5a6762',k*1.21,1.56,-2.24,1.68,1.39,.05,b.root));
 const notes=pairCards(b,st,['round','diamond']);const blue=b.oval('#8dcad8',0,.59,-1.50,.23,.31,.19,b.root);
 return(s,t,x,z)=>{flaps.forEach((m,i)=>{const here=Math.hypot(x-s.spec.sites[i][0],z-s.spec.sites[i][1])<.70;const u=s.mask&(1<<i)?1:here?Math.min(1,s.hold/.68):0;
  m.position.y=1.55+.81*u;m.scale.y=1.39*(1-.83*u);});notes.forEach((m,i)=>{m.visible=s.carry===i||!!(s.mask&(1<<i));const p=register(s,i,x,z);m.position.set(p[0],p[1],p[2]);});
 blue.visible=s.end>=0;};
};
export const sketch:Exhibit=(b,st)=>{
 floor(b,grain(st,'#a78d69'));b.box(ripples(st,'#789da0','#a5beb4'),0,-.25,-4.43,13,.22,3.53);
 for(let i=0;i<4;i++)peaked(b,'#82988b',-5.02+i*1.64,.55,-4.55,2.77,1.53+(i%3)*.29,.36);
 const boat=props(b,[.76,.03,-2.73],g=>{boatHull(b,g,'#84674a',4.27,.48);for(const x of [-.94,.38,1.33]){
 rod(b,wood,[x,.37,0],[x,2.47,0],.038,g);folded(b,'#e1d6b8',[[x-.68,2.13,0],[x+.14,2.22,0],[x+.20,1.13,.12],[x-.61,1.25,.10]],g);}});
 for(const k of [-1,1])rod(b,wood,[k*2.61,.42,-1.71],[k*3.72,.42,-1.71],.061);
 const cards=pairCards(b,st,['rock','sail']);const book=props(b,[0,.09,.76],g=>b.box(jade,0,0,0,1.80,.12,.86,g));
 return(s,t,x,z)=>{boat.rotation.z=.025*Math.sin(t*1.8);cards.forEach((m,i)=>{m.visible=s.carry===i||!!(s.mask&(1<<i));const held=s.carry===i;
 m.position.set(held?x:(s.chosen===i?-.42:.42),held?.49:.20+ease(s.end)*.71,held?z-.23:.76-.61*ease(s.end));m.rotation.x=ease(s.end)*1.04;});};
};
/** Two silent loops drawn for the miniature cinema. Both reels are original game footage. */
function silhouetteFrame(g:CanvasRenderingContext2D,reel:number,time:number){
 const w=768,h=384,black='#302c30',shadow='#83726a',paper='#efdbb0';
 const poly=(coords:number[][])=>{g.beginPath();coords.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
 const circle=(x:number,y:number,r:number)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
 const line=(x:number,y:number,ex:number,ey:number,width:number)=>{g.beginPath();g.lineWidth=width;g.moveTo(x,y);g.lineTo(ex,ey);g.stroke();};
 g.fillStyle=paper;g.fillRect(0,0,w,h);
 const sky=g.createLinearGradient(0,0,0,280);sky.addColorStop(0,'#b5a395');sky.addColorStop(1,'#f1ddb8');g.fillStyle=sky;g.fillRect(8,8,752,309);
 g.strokeStyle=black;g.lineWidth=5;g.strokeRect(8,8,752,368);g.fillStyle='#a99a89';
 poly([[12,230],[90,183],[134,211],[272,123],[390,194],[570,128],[670,172],[756,125],[756,270],[12,270]]);
 if(!reel){
  g.fillStyle=shadow;g.fillRect(17,263,735,16);
  for(const x of [44,197,349]){g.fillRect(x,134,9,129);g.strokeStyle=shadow;line(x+3,165,x+32,143,6);}
  poly([[18,124],[257,124],[398,139],[393,146],[18,146]]);
  g.fillStyle=black;g.fillRect(678,154,5,108);circle(680,142,17);g.fillStyle=paper;circle(680,142,13);
  g.strokeStyle=black;line(680,142,680,132,2);line(680,142,687,145,2);
  const front=361+Math.min(1,time/4.2)*283,ground=291;
  g.save();g.translate(front,ground);
  for(let j=0;j<7;j++){const drift=(j+time*.78)%7,c=-46-drift*20,y=-116-drift*9;
    g.fillStyle=j%2?'#8d7f74':'#96887a';circle(c,y,9+drift*2.1);circle(c-8,y+4,7+drift*1.7);}
  g.fillStyle=black;g.fillRect(-280,-63,83,44);poly([[-283,-62],[-275,-71],[-268,-69],[-256,-77],[-244,-73],[-233,-79],[-217,-69],[-205,-72],[-195,-62]]);
  g.fillRect(-184,-92,68,72);g.fillRect(-191,-98,82,9);g.fillStyle=paper;g.fillRect(-174,-85,22,27);g.fillRect(-146,-85,20,27);
  g.fillStyle=black;g.fillRect(-124,-65,108,42);circle(-19,-45,21);g.fillRect(-94,-74,19,12);circle(-84,-73,8);
  poly([[-50,-62],[-48,-91],[-56,-104],[-56,-112],[-28,-112],[-28,-104],[-34,-92],[-31,-62]]);
  poly([[-23,-29],[-6,-31],[15,-10],[-22,-11]]);g.fillRect(-199,-34,182,14);
  for(const [x,r] of [[-264,13],[-214,13],[-159,20],[-108,20],[-56,20],[-17,11]]){
   g.fillStyle=black;circle(x,-r,r);g.fillStyle='#b9a88b';circle(x,-r,r*.68);
   g.strokeStyle=black;for(let j=0;j<4;j++){const a=time*3+j*Math.PI/4;line(x-Math.cos(a)*r*.70,-r-Math.sin(a)*r*.70,x+Math.cos(a)*r*.70,-r+Math.sin(a)*r*.70,2.8);}
   g.fillStyle=black;circle(x,-r,3);
  }
  const cy=-20+Math.sin(time*4)*8;g.strokeStyle='#b99e78';line(-158,cy,-55,cy,5);g.restore();
  g.fillStyle=black;g.fillRect(16,ground+1,736,6);g.fillRect(16,ground+12,736,3);
 }else{
  g.fillStyle=shadow;for(let j=0;j<13;j++){const x=17+j*58,y=266-(j*31%56);g.fillRect(x,y,40+(j*3%14),295-y);}
  const cx=382,cy=159,r=104;g.strokeStyle=black;g.lineWidth=6;g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.stroke();
  for(let j=0;j<12;j++){const a=time*.28+j*Math.PI/6,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);
   line(cx,cy,x,y,2.5);line(x,y,x-6,y+10,2);line(x,y,x+6,y+10,2);g.fillStyle=black;poly([[x-12,y+10],[x+12,y+10],[x+8,y+21],[x-8,y+21]]);}
  line(cx,cy,cx-62,294,8);line(cx,cy,cx+62,294,8);g.fillStyle=black;circle(cx,cy,11);g.fillRect(19,294,729,7);
 }
 g.fillStyle=black;g.textAlign='center';g.font='bold 24px serif';
 g.fillText(reel?'本关原创剪影 · 晚间摩天轮':'本关原创剪影 · 站台小火车',384,349);
}
export const projector:Exhibit=(b,st)=>{
 floor(b,grain(st,'#a18a70'));backdrop(b,'#897767','#786859');b.box(wood,.40,1.76,-3.69,4.69,2.67,.22);
 b.box(cream,.40,1.76,-3.54,4.48,2.48,.05);props(b,[-2.03,.58,-1.45],g=>{b.box(wood,0,0,0,.88,1.09,.72,g);spool(b,g,-.35,.83,0,.35);spool(b,g,.37,.76,-.02,.31);
 const lens=b.cylinder(iron,.53,.22,0,.19,.20,.30,g);lens.rotation.z=Math.PI/2;});
 const film=props(b,[0,.09,.60],g=>{arc(b,g,[[-.81,0,0],[-.41,0,.18],[.46,0,-.13],[.80,0,0]],iron,.042);});
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
 const pen=canvas.getContext('2d')!,reel=new T.CanvasTexture(canvas);reel.colorSpace=T.SRGBColorSpace;
 const picture=b.box(new T.MeshBasicMaterial({map:reel}),.4,1.77,-3.48,4.24,2.23,.029,b.root);
 picture.castShadow=false;let last=-1;
 const crank=props(b,[-1.99,.82,-1.03],g=>{rod(b,brass,[0,0,0],[.37,0,0],.034,g);rod(b,wood,[.37,0,0],[.37,0,.19],.045,g);});
 for(let i=0;i<5;i++){const x=-1.64+i*.78;b.box('#8e6153',x,.29,1.98,.60,.54,.25);}
 return(s,t)=>{film.visible=s.count>0;crank.rotation.z=s.end>=0?s.t*4:s.count*.80;picture.visible=s.end>=0;
   if(!picture.visible)return;const frame=Math.min(54,Math.floor(s.end*12));
   if(frame!==last){last=frame;silhouetteFrame(pen,s.chosen,frame/12);reel.needsUpdate=true;}
 };
};
export const lattice:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#879c96','#758b83'));backdrop(b,'#91a49b','#788e82');table(b,0,.53,-2.07,4.28,1.51);
 const grid=props(b,[0,1.69,-2.29],g=>{for(const depth of [0,-.47])for(let r=0;r<3;r++)for(let j=0;j<5;j++){
 if(j===2&&r===1)continue;const x=(j-2)*.53,y=(r-1)*.53;b.oval((r+j)%2?jade:brass,x,y,depth,.12,.12,.12,g);
 if(j<4&&!(j===1&&r===1))rod(b,iron,[x,y,depth],[x+.52,y,depth],.025,g);if(r<2&&!(j===2&&r===0))rod(b,iron,[x,y,depth],[x,y+.52,depth],.025,g);
 if(depth===0)rod(b,iron,[x,y,0],[x,y,-.47],.022,g);}});
 const view=ring(b,brass,0,1.68,-2.12,.29,.046,b.root,false);const route=[0,1,2,3].map(i=>b.oval(cream,[-1.7,1.7,-1.7,1.7][i],.087,i<2?.57:-.81,.14,.042,.14,b.root));
 return(s,t)=>{view.scale.setScalar(s.end>=0?1.05+.56*ease(s.end):1);route.forEach((m,i)=>{m.scale.y=.041+((s.chosen===i||s.count>i)?.048:0);});grid.rotation.y=.23+.31*ease(s.end);};
};
export const galaxy:Exhibit=(b,st)=>{
 floor(b,grain(st,'#897f70'));starwall(b,st,'#26374a');
 const fore=props(b,[-.26,1.83,-2.43],g=>{
   frame(b,g,2.51,1.78,'#bb965d');
   const glass=st.toon('#39576a',{transparent:true,opacity:.24});glass.depthWrite=false;
   b.box(glass,0,0,0,2.44,1.70,.015,g);
   const points=[[-.91,-.39],[-.64,.07],[-.28,-.12],[.08,.24],[.52,.13],[.88,.48]];
   for(let i=0;i<points.length;i++){
     const [x,y]=points[i];if(i){const [px,py]=points[i-1];rod(b,'#c39759',[px,py,.036],[x,y,.036],.013,g);}
     b.oval(i===3?'#fff0aa':'#f1bb68',x,y,.061,.040+(i===3?.03:0),.040+(i===3?.03:0),.026,g);
     if(i===1||i===3||i===5){for(const [dx,dy] of [[0,.132],[.089,0]])rod(b,'#ffda83',[x-dx,y-dy,.068],[x+dx,y+dy,.068],.012,g);}
   }
 });
 const chart=paint(st,'#142642',g=>{
   for(let j=0;j<190;j++){
     const x=20+(j*131%726),y=18+(j*67%346);g.fillStyle=j%3?'#74869c':'#c6cacc';
     g.beginPath();g.arc(x,y,j%5===0?1.65:.87,0,Math.PI*2);g.fill();
   }
   g.save();g.translate(384,193);g.rotate(-.25);g.scale(1,.59);
   const glow=g.createRadialGradient(0,0,0,0,0,245);glow.addColorStop(0,'#e5c799');glow.addColorStop(.13,'#aca7b0');glow.addColorStop(.5,'#586b91');glow.addColorStop(1,'#1c305000');
   g.fillStyle=glow;g.fillRect(-249,-249,498,498);
   for(let arm=0;arm<2;arm++)for(let stripe=0;stripe<8;stripe++){
     g.strokeStyle=['#8e9ab5','#b7bbc3','#768aae','#c8bbae'][stripe%4];g.globalAlpha=.35+.045*stripe;g.lineWidth=2.5;
     g.beginPath();for(let j=0;j<110;j++){const f=j/109,angle=arm*Math.PI+.2+f*4.60+stripe*.043;
       const r=7+f*(194+stripe*5),x=Math.cos(angle)*r,y=Math.sin(angle)*r;j?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
   }
   g.globalAlpha=1;const core=g.createRadialGradient(0,0,0,0,0,35);core.addColorStop(0,'#fff5ce');core.addColorStop(.4,'#e8d1a9');core.addColorStop(1,'#ac97a300');g.fillStyle=core;g.fillRect(-38,-38,76,76);g.restore();
 });
 const far=props(b,[.25,1.84,-2.74],g=>{
   b.box(chart,0,0,0,3.10,1.75,.065,g);frame(b,g,3.18,1.83,'#657c88');
 });
 const scales=[-1,1].map((k,i)=>{const p=props(b,[k*1.93,.10,-.55],g=>{b.box(wood,0,0,0,1.50,.15,.30,g);
 for(let j=0;j<8;j++)b.box(brass,-.64+j*.18,.091,0,.024,.024,j%2?.10:.17,g);});p.rotation.y=i?Math.PI/2:0;return p;});
 const cursors=[-1,1].map(k=>b.oval('#d3b77f',k*1.93,.24,-.55,.095,.080,.095,b.root));
 b.box(label(st,cream,'近尺 ×1',iron),-1.93,.22,-.85,1.08,.30,.048);
 b.box(label(st,cream,'远尺 ×4',iron),2.62,.22,-.71,.91,.30,.048);
 b.box(jade,-2.36,.182,-.55,.086,.026,.31);b.box(brass,1.93,.182,-.98,.31,.026,.086);
 const tube=props(b,[2.70,1.21,-2.24],g=>{const barrel=b.cylinder(iron,0,0,0,.21,.29,1.26,g);barrel.rotation.z=.84;rod(b,wood,[0,-.97,0],[0,-.13,0],.062,g);});
 return(s,t)=>{const u=ease(s.end);fore.position.set(-.26-1.03*u,1.83,-2.43+.22*u);far.position.set(.27+1.04*u,1.84,-2.74-.35*u);
 cursors.forEach((m,i)=>{const f=s.rulers[i];m.position.set(i?1.93:-1.93+(f-.5)*1.15,.24,i?-.55-(f-.5)*1.27:-.55);});};
};
export const countdown:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#899193','#757e81'));starwall(b,st,'#2f3e51');
 for(const k of [-1,1])for(let j=0;j<3;j++){const x=k*(1.8+j*1.12),h=1.08+(j%2)*.67;b.box('#777d78',x,h*.5,-3.77,.94,h,.71);
 for(let w=0;w<3;w++)b.box('#b9a782',x-.26+w*.25,h*.64,-3.38,.11,.19,.05);}
 const tower=props(b,[0,0,-2.45],g=>{b.box(iron,0,.32,0,1.08,.64,.78,g);for(const k of [-1,1])rod(b,iron,[k*.33,.55,0],[k*.18,3.25,0],.067,g);
 for(let j=0;j<5;j++)rod(b,brass,[-.29,.63+j*.43,0],[.27,1.07+j*.43,0],.031,g);});
 const orb=props(b,[0,2.91,-2.22],g=>{b.part(new T.IcosahedronGeometry(.41,1),'#d0b776',0,0,0,1,1,1,g);for(const k of [-1,1])ring(b,cream,0,0,0,.43,.019,g,false).rotation.y=k*.84;});
 for(const mark of [.26,.54,.8])b.box(brass,.37,2.94-mark*2.29,-2.24,.24,.055,.09);
 const lights=Array.from({length:8},(_,j)=>b.oval('#efd394',-2.55+j*.72,.78,-3.28,.068,.12,.04,b.root));
 return(s,t)=>{orb.position.y=2.94-s.meter*2.29;orb.rotation.y=t*.52;lights.forEach((m,i)=>m.visible=s.end>=i*.12);};
};
