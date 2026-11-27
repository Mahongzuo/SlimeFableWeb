// 画虾、印面和木匣均为原创。案头与揭纸动画属于游戏演绎。
import * as T from 'three';
import type {Stage} from '../level/stage';
import {workbench,bakeDesk,batch,fibers,texture} from './jan01-chapter';
import {hiddenImprint,sealStations,sealCorner,type Stamp} from '../templates/jan01-seal';

function wood(g:CanvasRenderingContext2D){g.fillStyle='#865738';g.fillRect(0,0,512,256);
  for(let i=0;i<185;i++){const y=i*1.51;g.strokeStyle=i%5?'#502d2225':'#edd49d43';g.lineWidth=(i%4+1)*.38;
    g.beginPath();g.moveTo(0,y);g.bezierCurveTo(160,y+Math.sin(i*.2)*7,300,y-6,512,y+Math.sin(i)*2);g.stroke();}
  for(const x of [75,356]){g.strokeStyle='#3e241f3b';for(let i=1;i<7;i++){g.beginPath();g.ellipse(x,145,i*5,i*1.1,.12,0,Math.PI*2);g.stroke();}}
}
function shrimp(g:CanvasRenderingContext2D){
  g.save();g.translate(385,306);g.rotate(-.42);g.scale(1.26,1.26);
  function stroke(x:number,y:number,cx:number,cy:number,toX:number,toY:number,width:number,color:string){
    g.lineCap='round';g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(cx,cy,toX,toY);g.stroke();}
  // Ink washes overlap at the joints but the rice paper remains visible through the shell.
  for(let i=0;i<6;i++){const x=i*26,y=Math.pow(i,1.55)*4.5;g.save();g.translate(x,y);g.rotate(.18+i*.09);
    g.fillStyle=i%2?'#42596379':'#60747890';g.beginPath();g.ellipse(0,0,28-i*2.1,16-i*.9,0,0,Math.PI*2);g.fill();
    stroke(6,-12,14,-4,9,10,2.4,'#30484b9c');g.restore();stroke(x,y+9,x-4,y+30,x-19,y+38,1.7,'#435454a0');}
  for(const a of [-.5,0,.6]){g.save();g.translate(143,55);g.rotate(.8+a);g.fillStyle='#5265659c';g.beginPath();g.ellipse(16,0,25,6,0,0,Math.PI*2);g.fill();g.restore();}
  g.fillStyle='#364d53ac';g.beginPath();g.moveTo(14,-12);g.quadraticCurveTo(-30,-43,-92,-29);g.quadraticCurveTo(-69,-17,-30,7);g.quadraticCurveTo(-3,17,14,8);g.fill();
  for(const s of [-1,1]){stroke(-53,-19,-70,-27,-75,-33+s*6,3,'#273b3d');g.beginPath();g.arc(-75,-33+s*6,3.3,0,Math.PI*2);g.fillStyle='#263b3b';g.fill();}
  stroke(-60,-22,-172,-121,-261,-37,1.9,'#526663');stroke(-64,-18,-221,-48,-249,80,1.5,'#435b5b');
  stroke(-46,0,-99,24,-121,6,2,'#49605f');stroke(-34,4,-67,45,-120,57,1.7,'#526663');g.restore();
}
export function stampGlyph(g:CanvasRenderingContext2D,x:number,y:number,size:number,complete:boolean,alternate:boolean,rich:boolean){
  g.save();g.translate(x,y);g.rotate(alternate?-.11:.045);g.scale(size/100,size/100);
  g.beginPath();g.moveTo(0,0);g.lineTo(100,0);g.lineTo(100,complete?100:57);if(!complete){g.lineTo(84,68);g.lineTo(72,61);g.lineTo(62,82);g.lineTo(52,87);g.lineTo(44,100);}g.lineTo(0,100);g.closePath();g.clip();
  g.fillStyle=rich?'#9d271e':'#a15e51';g.fillRect(0,0,100,100);g.strokeStyle='#f8eac9';g.lineWidth=4;g.strokeRect(7,7,86,86);
  g.lineWidth=5;g.lineJoin='round';const lines=alternate?[[18,20,45,20,45,39,24,39,24,76,44,76],[80,20,59,20,59,49,81,49,81,75,59,75],[35,56,48,56],[68,35,81,35]]:[[19,20,42,20,42,46,19,46,19,80,42,80,42,61],[56,20,81,20,81,36,58,36,58,50,81,50,81,79,57,79,57,64],[30,30,30,36],[68,60,72,60]];
  for(const l of lines){g.beginPath();g.moveTo(l[0],l[1]);for(let i=2;i<l.length;i+=2)g.lineTo(l[i],l[i+1]);g.stroke();}
  for(let i=0;i<120;i++){g.fillStyle='#efe2c0ae';g.fillRect(i*73%101,i*31%97,(i%3)+.3,.9);}g.restore();
}
export function sealDesk(stage:Stage){
  const k=workbench(stage),woodMat=stage.toon('#fff',{map:texture(512,256,wood)});
  const sheetCanvas=document.createElement('canvas');sheetCanvas.width=768;sheetCanvas.height=640;
  const sg=sheetCanvas.getContext('2d')!,paperTex=new T.CanvasTexture(sheetCanvas);paperTex.colorSpace=T.SRGBColorSpace;paperTex.anisotropy=4;
  const underpainting=document.createElement('canvas');underpainting.width=768;underpainting.height=640;
  const ug=underpainting.getContext('2d')!;ug.fillStyle='#efdfb8';ug.fillRect(0,0,768,640);fibers(ug,768,640,3000);shrimp(ug);
  const paint=(s?:Stamp)=>{sg.drawImage(underpainting,0,0);
    if(s&&(s.phase==='lifting'||s.phase==='done'||s.phase==='proof')){const i=s.station;stampGlyph(sg,i===1?128:575,i===1?478:105,64,s.printed,s.hidden,s.phase!=='proof');}paperTex.needsUpdate=true;};
  paint();
  k.box(woodMat,0,-.34,0,14,.64,9,k.fixed,'solid-desk');
  const sheet=k.group();sheet.position.set(-.25,.07,2.64);
  const paperGeom=new T.PlaneGeometry(5.15,4.95,24,22);paperGeom.rotateX(-Math.PI/2);paperGeom.translate(2.575,0,-2.475);
  const paper=new T.Mesh(paperGeom,stage.toon('#fff',{map:paperTex,side:T.DoubleSide}));paper.name='rice-paper';paper.castShadow=paper.receiveShadow=true;sheet.add(paper);paper.userData.walkTarget=true;
  const coords=paperGeom.attributes.position,base=Float32Array.from(coords.array);
  const felt=texture(256,128,g=>{g.fillStyle='#756b51';g.fillRect(0,0,256,128);fibers(g,256,128,1200);});
  k.box(stage.toon('#fff',{map:felt}),2.35,.014,.15,5.5,.06,5.35,k.fixed,'solid-felt');
  k.box('#c7a977',-2.85,.055,.48,2.6,.1,2.55,k.fixed,'solid-scrap');
  // Hinged wood case, open front edge, worn lip and inset lid with a spare die.
  k.box(woodMat,-4.6,.06,2.83,3.8,.15,2.4,k.fixed,'solid-case');
  for(const x of [-6.42,-2.78])k.box(woodMat,x,.22,2.83,.16,.32,2.4,k.fixed,'solid-case-side');
  k.box(woodMat,-4.6,.28,3.96,3.48,.44,.16,k.fixed,'solid-case-rim');
  const lid=k.box(woodMat,-5.93,.82,2.76,.17,1.6,1.98);lid.rotation.z=.28;
  for(const z of [2.08,3.45]){k.cylinder('#ad9159',-6.1,.19,z,.12,.12,.28).rotation.x=1.57;}
  k.box('#837a5e',hiddenImprint[0],.18,hiddenImprint[2],.63,.21,.57,k.fixed,'solid-die');
  k.box('#d3b06d',-4.6,.3,3.99,.36,.2,.07);
  const saucer=k.cylinder('#bac7b7',-2.3,.15,-2.17,.99,.77,.34);saucer.name='solid-saucer';
  k.cylinder('#a74c3a',-2.3,.34,-2.17,.82,.82,.075);
  for(let i=0;i<5;i++)k.oval('#773c34',-2.64+i*.14,.387,-2.15+Math.sin(i)*.08,.09,.009,.05);
  const ink=k.oval('#414a43',.15,.22,-3.24,1.55,.25,.74);ink.name='solid-inkstone';k.oval('#202e2f',.19,.45,-3.25,.97,.04,.42);
  for(let i=0;i<2;i++){const g=k.group(k.fixed);g.position.set(3.25+i*.45,.22,-3.23+i*.28);g.rotation.z=1.54;g.rotation.x=.26;
    k.cylinder('#bc914d',0,0,0,.09,.12,3.6,g);k.cylinder('#323c38',0,-1.9,0,.13,.095,.28,g);
    k.cylinder('#54645e',0,-2.36,0,.13,.012,.65,g);batch(g);}
  // Lattice window and the light filtering through it frame the rear of the desk.
  const windowPaper=texture(1000,420,g=>{
    const light=g.createLinearGradient(0,0,0,420);light.addColorStop(0,'#ded9bc');light.addColorStop(.63,'#f5edd1');light.addColorStop(1,'#e7d3ae');
    g.fillStyle=light;g.fillRect(0,0,1000,420);fibers(g,1000,420,600);
    for(let layer=0;layer<2;layer++){g.fillStyle=['#afb8a34a','#889d8e55'][layer];g.beginPath();g.moveTo(0,420);
      for(let x=0;x<=1000;x+=5){const y=270+layer*45-58*Math.cos(x*.008+layer)-24*Math.sin(x*.023+layer*.4)-7*Math.sin(x*.051);g.lineTo(x,y);}g.lineTo(1000,420);g.fill();}
    for(const shift of [30,810,950]){g.save();g.translate(shift,420);g.rotate(shift===30?.32:-.29);g.strokeStyle='#566b5b68';g.lineWidth=3;
      g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(8,-140,-24,-300);g.stroke();
      for(let i=0;i<10;i++){const x=-i*1.9,y=-35-i*24,dir=i%2?1:-1;g.beginPath();g.moveTo(x,y);g.lineTo(x+dir*45,y-29);g.stroke();
        for(let j=1;j<=4;j++){g.fillStyle='#697d6768';g.beginPath();g.ellipse(x+dir*(9+j*9),y-j*6-7,3,12,dir*.54,0,Math.PI*2);g.fill();}}g.restore();}
  });
  k.box(stage.toon('#fff',{map:windowPaper}),0,2.3,-5.2,15,5.5,.25);
  for(let i=-4;i<=4;i++)k.box('#68523e',i*1.7,2.25,-5.01,.095,5.3,.13);
  for(let i=0;i<3;i++)k.box('#745d43',0,.55+i*1.57,-5.01,15,.09,.16);
  const corners:T.Mesh[]=[],stamps:T.Group[]=[];
  const chipped=new T.Shape();
  chipped.moveTo(-.39,-.38);chipped.lineTo(.39,-.38);chipped.lineTo(.39,.22);chipped.lineTo(.27,.38);chipped.lineTo(-.39,.38);chipped.closePath();
  const stoneGeometry=new T.ExtrudeGeometry(chipped,{depth:.76,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.017,bevelThickness:.018});
  stoneGeometry.rotateX(-Math.PI/2);
  sealStations.forEach(([x,,z],i)=>{
    const stone=k.group();stone.position.set(x,.12,z);const material=i?'#8f9c83':'#a9aa8d';
    const foot=k.part(stoneGeometry,material,0,-.075,0,1,1,1,stone,'solid-seal-stone');
    const loop=k.part(new T.TorusGeometry(.18,.068,7,18),i?'#657b67':'#898875',0,.95,0,1.12,.88,1,stone);
    loop.rotation.y=.28;const stem=k.oval('#748974',0,.81,0,.30,.095,.25,stone);stem.rotation.z=.08;
    const collar=k.box('#a69d75',0,.742,0,.70,.078,.66,stone,'solid-seal-collar');
    collar.userData.walkTarget=true;stem.name='solid-seal-handle';
    k.box('#8f7354',0,-.095,0,.83,.052,.80,stone);stamps.push(stone);
    const [cx,,cz]=sealCorner(i);const curl=k.box('#dec99c',cx,.17,cz,.38,.065,.45,k.root);curl.rotation.z=.39;corners.push(curl);foot.userData.walkTarget=true;
  });
  const proofs=[false,true].map(full=>stage.toon('#fff',{map:texture(160,160,g=>{g.fillStyle='#f2ddb9';g.fillRect(0,0,160,160);stampGlyph(g,25,25,106,full,false,false);})}));
  const proofTile=k.box(proofs[0],-3.18,.14,1.14,.92,.031,.78,k.root);proofTile.visible=false;
  const flag=k.oval('#d5ab63',0,0,0,.12,.08,.12,k.root);
  const world=bakeDesk(stage,k.root);batch(k.fixed);for(const c of k.fixed.children)c.userData.walkTarget=true;
  for(const stone of stamps){batch(stone);for(const child of stone.children)child.userData.walkTarget=true;}
  let last='',oldLift=-1;
  return {world,root:k.root,update(s:Stamp,time:number,trialFull:boolean){const key=s.phase+s.station+s.printed+s.hidden;if(key!==last){paint(s);last=key;}
    stamps.forEach((m,i)=>{const [x,,z]=sealStations[i],park=i?Math.min(1,s.lift*3):0;
      const curve=park*park*(3-2*park);m.position.set(x+curve*(i===1?-2.3:2.0),.12+Math.sin(park*Math.PI)*1.45-(s.station===i?s.pressure*.115:0),z+curve*(i===1?1.35:-1.75));});
    corners.forEach((m,i)=>{m.rotation.z=s.station===i&&s.pinned?.02:.39;m.visible=i===0||s.lift===0;});
    proofTile.visible=s.trialLift>.01;proofTile.material=proofs[+trialFull];
    const flap=Math.sin(s.trialLift*Math.PI);proofTile.rotation.x=-flap*.76;proofTile.position.y=.14+flap*.33;
    flag.visible=s.phase!=='done'&&s.phase!=='lifting';const p=sealCorner(s.station);
    flag.position.set(p[0],.37+Math.sin(time*3)*.075,p[2]);flag.material=stage.toon(s.pinned?'#5e9576':'#ca9251');
    if(s.lift!==oldLift){const lift=s.lift;for(let i=0;i<coords.count;i++){const x=base[i*3],z=base[i*3+2],bend=lift*(.23+.72*x/5.15);
      coords.setXYZ(i,x+.03*Math.sin(bend*4),(-z)*Math.sin(bend),z*Math.cos(bend));}coords.needsUpdate=true;paperGeom.computeVertexNormals();
      sheet.rotation.z=.06*lift;oldLift=lift;}
    // A single ink stroke moves across the paper when it is lifted.
    if(s.phase==='lifting'){paint(s);sg.save();sg.translate(385,306);sg.rotate(-.42);sg.scale(1.26,1.26);sg.strokeStyle='#506664';sg.lineWidth=1.6;sg.beginPath();sg.moveTo(-60,-22);sg.quadraticCurveTo(-166,-105+16*Math.sin(s.lift*Math.PI*2),-239,-28);sg.stroke();sg.restore();paperTex.needsUpdate=true;}
  }};
}
