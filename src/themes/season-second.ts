/** Original miniature stage properties and apparitions. No historical artifact is reproduced. */
import * as T from 'three';
import type {Stage} from '../level/stage';
import {workbench,bakeDesk,batch,texture,fibers,deskLight} from './jan01-chapter';
import {paperCreases,passes,iceAnchors,stations,scopeMarks,type SecondRun,type Point} from '../templates/season-second';
type Bench=ReturnType<typeof workbench>;
const ochre='#d0a14e',gold='#f5c665',ink='#302e32',bone='#ede2c4',steel='#5e8490';
const backdrop=[['#807e80','#e5c593'],['#111a37','#46516e'],['#3b384a','#89654f'],['#8eadaf','#d7cc9b'],['#263754','#9bbec6']];
export function secondLook(k:number){const [skyTop,skyHorizon]=backdrop[k];return {...deskLight,skyTop,skyHorizon,wash:skyHorizon,fog:[19,54] as [number,number]};}
function rod(b:Bench,c:string,p:number[],q:number[],r=.05,parent:T.Object3D=b.fixed){
  const a=new T.Vector3(...p),v=new T.Vector3(...q).sub(a);a.addScaledVector(v,.5);
  const m=b.cylinder(c,a.x,a.y,a.z,r,r,v.length(),parent);
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;
}
function ring(b:Bench,c:string,x:number,y:number,z:number,r:number,wire:number,parent:T.Object3D=b.fixed,flat=true){
  const m=b.part(new T.TorusGeometry(r,wire,8,44),c,x,y,z,1,1,1,parent);if(flat)m.rotation.x=Math.PI*.5;return m;
}
function surface(stage:Stage,base:string,fn:(g:CanvasRenderingContext2D)=>void){
  return stage.toon('#fff',{map:texture(768,448,g=>{g.fillStyle=base;g.fillRect(0,0,768,448);fn(g);})});
}
function floor(b:Bench,mat:T.Material|string,x:number,z:number,w:number,d:number,h=.36){
  return b.box(mat,x,-h/2,z,w,h,d,b.fixed,'solid-stage');
}
function surround(b:Bench,x:number,y:number,z:number,w:number,h:number,c:string){
  for(const side of [-1,1]){b.box(c,x+side*w/2,y,z,.14,h+.14,.20);b.box(c,x,y+side*h/2,z,w-.14,.14,.20);}
}
function paper(b:Bench,stage:Stage){
  const wood=surface(stage,'#9d6445',g=>{g.strokeStyle='#6e4539';g.lineWidth=2;
    for(let j=12;j<448;j+=31){g.beginPath();g.moveTo(0,j);g.bezierCurveTo(140,j-15,400,j+19,768,j-4);g.stroke();}});
  floor(b,wood,0,0,11,6.5,.65);
  const manuscript=surface(stage,'#f5e1ad',g=>{fibers(g,768,448,2900);g.strokeStyle='#6b574c';g.lineWidth=2;
    for(let j=0;j<9;j++){g.beginPath();for(let i=0;i<100-j%3*8;i++){const x=82+5.4*i,y=59+j*23+Math.sin(i*1.8+j)*2.2+Math.sin(i*.45)*2.4;if(i===0||i%13===0)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();}
    g.strokeStyle='#bf8a48';g.setLineDash([7,7]);g.beginPath();g.moveTo(175,169);g.lineTo(581,169);g.lineTo(581,360);g.stroke();});
  b.box(manuscript,0,.018,0,6.7,.036,4.7,b.fixed,'solid-manuscript');
  // Wainscot, leaded Paris window, and the holders of a recently used nib.
  b.box('#69575b',0,2.1,-5.3,16,5,.25);
  const light=surface(stage,'#adab94',g=>{for(let i=0;i<18;i++){g.fillStyle=i%2?'#847f84':'#a99794';const h=50+(i*67)%180;g.fillRect(i*48,448-h,53,h);g.beginPath();g.moveTo(i*48-4,448-h);g.lineTo(i*48+20,412-h);g.lineTo(i*48+56,448-h);g.fill();}});
  b.box(light,-2.65,2.45,-5.05,5,3.65,.14);surround(b,-2.65,2.45,-4.92,5,3.65,ink);
  b.box(ink,-2.65,2.45,-4.88,.09,3.53,.13);b.box(ink,-2.65,2.62,-4.78,4.85,.10,.11);
  for(let i=0;i<8;i++){const x=1.1+i*.49,h=2+i%3*.24;
    b.box(['#644b40','#78564b','#4f6463'][i%3],x,h*.5,-3.85,.43,h,.67);
    for(const dy of [.28,h-.3])b.box(ochre,x,dy,-3.495,.36,.06,.045);}
  for(const x of [-4.15,3.99]){b.cylinder('#92723b',x,.16,-1.64,.47,.64,.29);b.cylinder(ochre,x,.6,-1.64,.11,.26,.68);b.cylinder(ochre,x,.99,-1.64,.35,.14,.16);b.cylinder(bone,x,1.43,-1.64,.19,.21,.80);b.oval('#ffc566',x,2,-1.64,.10,.23,.10);}
  b.cylinder(ink,-3.72,.25,1.78,.31,.38,.5);rod(b,ochre,[-3.72,.4,1.78],[-4.16,1.65,1.35],.045);
  const feather=b.oval(bone,-4.26,1.75,1.33,.14,.47,.07);feather.rotation.z=.37;
  const hinge=b.group();hinge.position.set(0,.061,-.72);
  b.box(manuscript,0,0,-.53,3.7,.045,1.06,hinge);batch(hinge);
  const wing=b.group();wing.position.set(1.70,.10,.25);b.box('#eed4a3',.42,0,0,.84,.042,1.85,wing);batch(wing);
  // The loose flap clears the fixed page even at its lowest endpoint.
  return (s:SecondRun)=>{hinge.rotation.x=-.62*(1-s.flattened)-.03;wing.rotation.z=.35+Math.min(1,Math.max(0,s.ending))*2.62;};
}
function space(b:Bench,stage:Stage){
  const deck=surface(stage,'#3b5466',g=>{g.strokeStyle='#87b1ab';g.lineWidth=2;
    for(let i=0;i<12;i++){g.beginPath();g.moveTo(i*65,0);g.lineTo(i*65,448);g.stroke();}
    for(let i=0;i<8;i++)g.fillRect(20,22+i*55,13,2);g.strokeRect(27,21,714,407);});
  floor(b,deck,0,0,9.1,5.8,.6);
  const stars=surface(stage,'#16283b',g=>{for(let i=0;i<150;i++){const x=(i*227+43)%768,y=(i*321+73)%448;g.fillStyle=i%8?'#b6c7c1':'#ffe4a2';g.fillRect(x,y,i%8?2:5,i%8?2:5);}g.fillStyle='#a45e46';g.beginPath();g.arc(693,100,58,0,2*Math.PI);g.fill();g.fillStyle='#874f43';g.beginPath();g.ellipse(692,105,43,12,-.3,0,7);g.fill();});
  b.box(stars,0,2.83,-3.75,10.7,5.8,.3);surround(b,0,2.83,-3.52,10.8,5.8,'#769293');
  for(const x of [-4.93,4.93]){for(let j=0;j<7;j++)b.oval(ochre,x,.50+j*.73,-3.40,.07,.07,.04);}
  // A planar star chart viewed over a dish, faceted bus and grid-lined solar panels.
  const probe=b.group();probe.position.set(-3.1,2.8,-2.85);
  b.part(new T.CylinderGeometry(.43,.52,.72,8),'#d3b67a',0,0,0,1,1,1,probe);rod(b,bone,[0,.1,0],[0,.96,0],.035,probe);
  for(const side of [-1,1]){b.box('#38637d',side*.98,0,0,1.05,.48,.08,probe);for(let i=0;i<5;i++)b.box('#aba980',side*(.55+i*.19),0,.06,.021,.47,.025,probe);}
  const dish=b.part(new T.SphereGeometry(.37,18,7,0,Math.PI*2,0,.48*Math.PI),'#e5dbc1',0,.52,0,1,.48,1,probe);dish.rotation.z=-.55;batch(probe);
  function chart(p:Point):Point{return [p[0]*1.02+.35,2.35-p[1]*.72];}
  const targets=scopeMarks.map(p=>{const [x,y]=chart(p);return b.oval('#ffe099',x,y,-3.50,.10,.10,.08,b.root);});
  const track=scopeMarks.slice(1).map((p,i)=>{
    const a=chart(scopeMarks[i]),q=chart(p);
    return rod(b,'#a9c9b6',[...a,-3.56],[...q,-3.56],.022,b.root);
  });
  b.oval('#d2dacc',targets[0].position.x-.23,targets[0].position.y+.19,-3.49,.048,.048,.04);
  const cursor=b.group();ring(b,'#f7ce6f',0,0,0,.24,.025,cursor,false);for(const side of [-1,1])b.box(bone,side*.33,0,0,.13,.024,.03,cursor);batch(cursor);
  for(const s of [-1,1]){rod(b,steel,[s*3.65,.09,-2.18],[s*3.65,.09,1.98],.09);
    b.box('#31434e',s*4.13,.32,.6,.57,.64,2);for(let i=0;i<3;i++)b.oval(i===2?gold:'#67a8b6',s*4.13,.67,.1+i*.42,.13,.055,.10);}
  return (s:SecondRun,t:number,x:number,z:number)=>{const [cx,cy]=chart([x+s.cursorShift,z]);cursor.position.set(cx,cy,-3.31);
    targets.forEach((m,i)=>m.scale.setScalar(i===s.step?.13+.035*Math.sin(t*5):.075));
    track.forEach((m,i)=>m.visible=s.step>=i+2);
    const leave=T.MathUtils.smoothstep(s.ending,0,1.3);cursor.visible=s.ending<0;
    probe.position.set(-3.1+3.4*leave,2.8+.98*leave,-2.85-.39*leave);probe.scale.setScalar(1-leave*.57);
    probe.rotation.z=.1*Math.sin(t*.6)+leave*.28;probe.rotation.y=-.18+t*.06;};
}
function arcade(b:Bench,stage:Stage){
  const court=surface(stage,'#253c3e',g=>{g.strokeStyle='#b5d6bd';g.lineWidth=5;g.strokeRect(65,34,638,378);g.setLineDash([16,14]);g.beginPath();g.moveTo(65,224);g.lineTo(703,224);g.stroke();});
  floor(b,court,0,0,7.9,5.6,.58);
  for(const side of [-1,1]){b.box('#aa6342',side*4.15,.06,0,.38,.90,5.95);b.box('#d28e42',side*4.16,1.75,-3.06,.4,3.9,.73);}
  b.box('#865739',0,1.93,-3.39,8.53,4.1,.53);
  const sign=surface(stage,'#edb654',g=>{g.fillStyle='#443d38';g.textAlign='center';g.font='bold 180px monospace';g.fillText('P O N G',384,279);g.fillRect(100,315,568,10);});
  b.box(sign,0,3.28,-3.045,7.65,1.18,.11);
  b.box('#263b3e',0,1.53,-3.04,6.68,1.73,.12);
  for(let i=0;i<15;i++)b.box(ink,-1.91+i*.27,.33,2.78,.12,.10,.18);
  for(const x of [-3.3,3.28]){b.cylinder('#322d2b',x,.16,2.38,.37,.42,.30);b.cylinder(ochre,x,.35,2.38,.29,.34,.12);}
  const ball=b.box('#ffe493',0,.33,0,.19,.19,.19,b.root);
  const paddle=b.box('#f1e9ca',0,.14,1.79,1.25,.14,.16,b.root),other=b.box('#caa273',0,.14,-2.2,1.14,.14,.16,b.root);
  const digits=Array.from({length:3},(_,i)=>b.box('#b2d9ac',-1.1+i*1.1,1.51,-2.94,.64,.59,.06,b.root));
  return (s:SecondRun,t:number,x:number)=>{ball.position.set(s.ball[0],.32,s.ball[1]);ball.visible=!s.approach;
    paddle.position.x=Math.max(-3.25,Math.min(3.25,x));paddle.scale.x=s.spread?2.22:1.25;other.position.x=s.ball[0]*.66;
    digits.forEach((m,i)=>{m.scale.y=i<s.step?.71:.11;});if(s.ending>=0)other.position.x=Math.sin(t*3)*2;};
}
function pitch(b:Bench,stage:Stage){
  const turf=surface(stage,'#729069',g=>{for(let i=0;i<8;i+=2){g.fillStyle='#76996e';g.fillRect(0,i*56,768,56);}fibers(g,768,448,1800);
    g.strokeStyle='#e8dbb4';g.lineWidth=4;g.strokeRect(42,35,684,370);g.beginPath();g.moveTo(42,224);g.lineTo(726,224);g.stroke();g.beginPath();g.ellipse(384,224,67,52,0,0,7);g.stroke();g.strokeRect(246,35,276,50);});
  floor(b,turf,0,0,9.45,6.42);
  for(let row=0;row<3;row++){
    const z=-4.55-row*.68;b.box('#926d49',0,.25+row*.45,z,12,.30,.62);
    for(let i=0;i<16;i++){const x=(i-7.5)*.71+(row%2)*.16;
      b.oval(['#625a55','#4a6067','#916751','#61796f'][(i*3+row)%4],x,.60+row*.45,z,.21,.30,.16);b.oval('#ccae86',x,.91+row*.45,z,.13,.14,.13);}}
  for(const x of [-5.35,-2.65,0,2.65,5.35])rod(b,'#5a5448',[x,0,-6.17],[x,3.45,-6.17],.075);
  b.box('#445b58',0,3.37,-5.78,12,.18,1.54).rotation.x=-.09;
  for(const x of [-1.55,1.55]){rod(b,bone,[x,0,-2.83],[x,1.65,-2.83],.045);rod(b,'#958d72',[x,1.65,-2.83],[x,0,-3.46],.04);}
  rod(b,bone,[-1.55,1.65,-2.83],[1.55,1.65,-2.83],.045);
  for(let i=0;i<14;i++)rod(b,'#c3b995',[-1.5+i*.23,1.60,-2.87],[-1.5+i*.23,0,-3.44],.012);
  const ball=b.oval('#c8aa77',0,.19,0,.19,.19,.19,b.root);
  const runner=b.group(),defender=b.group();
  for(const [p,c] of [[runner,'#486c83'],[defender,'#a16b50']] as const){
    b.oval(c,0,.42,0,.22,.31,.17,p);b.oval('#d3b891',0,.77,0,.14,.16,.14,p);
    for(const x of [-.088,.088])b.oval(ink,x,.13,0,.075,.15,.084,p);batch(p);}
  return (s:SecondRun,t:number)=>{const p=passes[Math.min(3,s.step)],q=s.receiver;
    runner.position.set(q[0],.025*Math.sin(t*9)+.24*Math.sin(Math.PI*T.MathUtils.smoothstep(s.ending,0,1.3)),q[1]);
    const k=s.flight>0?1-s.flight/.68:0;ball.position.set(p[0]+(q[0]-p[0])*k,.19+Math.sin(k*Math.PI)*(s.highPass?1.45:.24),p[1]+(q[1]-p[1])*k);
    defender.position.set((p[0]+q[0])*.5+Math.cos(t*1.45+s.step)*.78,0,(p[1]+q[1])*.5);
  };
}
function polar(b:Bench,stage:Stage){
  const ice=surface(stage,'#c9dad5',g=>{g.strokeStyle='#9bbbc2';g.lineWidth=2;for(let i=0;i<12;i++){g.beginPath();g.moveTo(i*79,0);g.lineTo(i*79-24,28);g.lineTo(i*79+21,61);g.stroke();}fibers(g,768,448);});
  floor(b,ice,-2.58,0,3.9,5.2,.8);floor(b,ice,2.58,0,3.9,5.2,.8);
  floor(b,'#b0cfd2',0,0,1.26,1.14,.56);b.box('#447586',0,-1.14,0,13,.22,8);
  for(let i=0;i<10;i++){const x=-8+i*1.84,h=1.6+(i*13%5)*.49;
    b.part(new T.ConeGeometry(1,1,5),'#7899aa',x,.48,-5.9-i%3,2,h,2);
    b.part(new T.ConeGeometry(1,1,5),'#d8e5df',x,.48+h*.33+.012,-5.9-i%3,.72,h*.34,.72);}
  for(const [x,z] of iceAnchors){for(let i=0;i<3;i++){const a=i*2.094;rod(b,'#826b53',[x+.42*Math.cos(a),0,z+.42*Math.sin(a)],[x,1.31,z],.055);}
    const tube=rod(b,steel,[x-.35,1.35,z],[x+.38,1.52,z],.125);tube.name='observation-scope';}
  b.box('#6c8d94',-3.76,.53,-2.03,1.19,1.06,.73);
  b.part(new T.ConeGeometry(1,1,4),bone,-3.76,1.27,-2.03,.98,.44,.77).rotation.y=Math.PI/4;
  for(let i=0;i<4;i++)b.box('#a5714d',-3.48+i*.25,.15,2.26,.19,.27,.42);
  const rays=stations.map(([x,z],i)=>rod(b,'#dfa563',[iceAnchors[i][0],1.32,iceAnchors[i][1]],[x,.18,z],.026,b.root));
  const aurora=b.group();
  const curtain=texture(512,128,g=>{
    for(let i=0;i<512;i++){const wave=.53+.20*Math.sin(i*.018)+.17*Math.sin(i*.043);
      const fade=(.34+.19*Math.sin(i*.21)**2)*Math.min(1,i/42,(511-i)/42);
      const ray=g.createLinearGradient(0,0,0,128);ray.addColorStop(0,'#87c2a400');
      ray.addColorStop(wave,'rgba(139,237,190,'+fade+')');ray.addColorStop(1,'#93d6cd00');
      g.fillStyle=ray;g.fillRect(i,0,1,128);}
  });
  const ribbon=new T.Mesh(new T.PlaneGeometry(17,3.45),new T.MeshBasicMaterial({map:curtain,transparent:true,depthWrite:false}));
  ribbon.position.set(0,4.32,-8.37);ribbon.layers.set(1);aurora.add(ribbon);
  b.oval('#a8c0c6',0,-.98,-6.15,11.8,.42,2.5);
  for(const side of [-1,1]){
    for(let i=0;i<4;i++){const berg=b.cylinder(i%2?'#bfdbd8':'#a7c8ca',side*(4.6+.25*i),-.39,-1.51+i*.96,.52,.31,.32);
      berg.scale.z=.61;berg.rotation.y=i*.77;}
  }
  for(const x of [-3.52,-3.24]){const ski=b.box('#b17d55',x,.075,-1.89,.12,.10,.92);ski.rotation.y=-.13;}
  for(let j=0;j<3;j++){const x=1.72+j*.65,z=2.29;rod(b,'#826d54',[x,.01,z],[x,.72,z],.025);
    if(j<2){rod(b,'#aa9772',[x,.56,z],[x+.33,.45,z],.016);rod(b,'#aa9772',[x+.33,.45,z],[x+.65,.56,z],.016);}}
  const lanterns=Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return b.oval('#bde2ab',2.70+.50*Math.cos(a),.20,-.9+.50*Math.sin(a),.075,.13,.075,b.root);});
  return (s:SecondRun,t:number)=>{rays.forEach((m,i)=>m.visible=s.step>i+1||s.step===i+1&&s.pin);
    lanterns.forEach((m,i)=>m.visible=s.ending>i*.08);
    aurora.rotation.z=.025*Math.sin(t*.65);};
}
export function buildSecond(stage:Stage,s:SecondRun){
  const b=workbench(stage),animate=[paper,space,arcade,pitch,polar][s.kind](b,stage),k=s.kind;
  const goal=ring(b,k===1?'#e6b770':'#f7c963',0,.10,0,.46,.034,b.root),goalOuter=ring(b,'#fbedd2',0,.096,0,.56,.015,b.root);
  const anchor=k===0||k===4?b.cylinder('#a38148',s.anchor[0],.09,s.anchor[1],.40,.44,.16,b.root):undefined;
  const crystals=s.marks.map(([x,z])=>b.part(new T.OctahedronGeometry(.095),k===4?'#7ab7c4':ochre,x,.68,z,1,1,1,b.root));
  const world=bakeDesk(stage,b.root);batch(b.fixed);
  function update(t:number,x:number,z:number){animate(s,t,x,z);
    const [px,pz]=s.goal;goal.position.set(px,.11,pz);goalOuter.position.set(px,.10,pz);goalOuter.scale.setScalar(.99+.045*Math.sin(t*3.7));goal.visible=goalOuter.visible=!s.approach&&k!==1;
    if(k===3&&!s.approach){const q=s.receiver;goal.position.set(q[0],.085,q[1]);goal.scale.setScalar(s.canPass?.95:.70);}
    if(anchor){anchor.position.set(s.anchor[0],.09,s.anchor[1]);anchor.scale.y=s.pin?.62:1;}
    crystals.forEach((m,i)=>{m.visible=!s.finds.has(i);m.rotation.y=t+i;m.position.y=.72+.07*Math.sin(t*2+i);});
  }
  return {world,root:b.root,update};
}
