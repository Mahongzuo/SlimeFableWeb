/** Festival boatyard, model canal, archive balance, lotus shore and navigation sand table. */
import * as T from 'three';
import {floor,paint,label,rod,ring,batch,wood,jade,brass,cream,red,iron} from './december-chapters';
import {grain,peaked} from './winter-chapters';
import {tiles,ripples,tree,skyline,folded,ease} from './midwinter-chapters';
import {type Exhibit,boatHull,pennant,arc,groundMark} from './yearend-chapters';
export const boat:Exhibit=(b,st)=>{
 floor(b,paint(st,'#c1ac87',g=>{g.lineWidth=5;g.strokeStyle='#907959';g.beginPath();g.ellipse(384,212,182,90,0,Math.PI,2*Math.PI);g.stroke();
 g.lineWidth=3;g.strokeStyle='#aa694d';for(let i=0;i<14;i++){const a=Math.PI+i*Math.PI/13;g.beginPath();g.arc(384+182*Math.cos(a),212+90*Math.sin(a),5,0,7);g.stroke();}}));
 b.box(ripples(st,'#669191','#a0b8a6'),0,-.32,-4.89,12,.24,4.45);
 for(const x of [-3.65,-.46]){rod(b,wood,[x,.01,-2.70],[x,2.68,-2.70],.096);rod(b,wood,[x,1.82,-2.71],[x+.51,2.51,-2.71],.064);}
 const canopy=b.box('#795e4d',-2.0,2.65,-2.68,4.04,.20,1.48);canopy.rotation.z=.025;
 for(let i=0;i<9;i++)pennant(b,-3.75+i*.39,2.51,-1.99,i%2?'#b86047':'#d5b66e',b.fixed);
 const ship=b.group();boatHull(b,ship,'#995342',3.96,.47);
 b.box(cream,0,.77,0,1.29,.68,.60,ship);b.box('#4e796d',0,1.15,0,1.56,.10,.83,ship);
 for(const x of [-.45,0,.45])b.box('#566966',x,.83,.316,.21,.27,.035,ship);
 for(const x of [-1.02,1.03])rod(b,wood,[x,.45,0],[x,1.89,0],.035,ship);
 rod(b,brass,[-1.33,1.77,0],[1.39,1.73,0],.022,ship);for(let j=0;j<9;j++)pennant(b,-1.29+j*.30,1.74,0,j%3===0?red:j%3===1?jade:brass,ship);
 folded(b,'#bf694b',[[1.54,.62,0],[1.88,1.10,0],[1.98,1.05,.08],[1.72,.50,.06]],ship);batch(ship);
 const rope=rod(b,cream,[0,0,0],[0,1,0],.024,b.root),a=new T.Vector3(),v=new T.Vector3(),up=new T.Vector3(0,1,0);
 for(let i=0;i<5;i++){const angle=Math.PI+i*Math.PI/4;const x=2.12*Math.cos(angle),z=.43+1.24*Math.sin(angle);groundMark(b,x,z,.16,'#ab8059');}
 return(s,t,x,z)=>{const f=ease(s.end),route=s.chosen===1?-1:1;ship.position.set(-1.62+s.count*.28+f*1.91,.17+.025*Math.sin(t*2),-2.45+f*.47);
  ship.rotation.y=.14+route*.20*s.count/4-f*.36;ship.rotation.z=.019*Math.sin(t*2);a.set(ship.position.x+1.55,ship.position.y+.62,ship.position.z+.40);
  v.set(s.chosen<0?.05:x,s.end>=0?.13:.25,s.chosen<0?.57:z).sub(a);rope.position.copy(a).addScaledVector(v,.5);rope.scale.y=v.length();rope.quaternion.setFromUnitVectors(up,v.normalize());};
};
export const locks:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#aa9679','#93846f'));const water=ripples(st,'#668b88','#a1b8a5');
 for(const k of [-1,1]){b.box('#857963',k*2.78,.23,-2.14,1.62,.46,2.12);skyline(b,k*3.01,-3.39,.92,'#c3b293');}
 b.box('#897c68',0,1.84,-3.67,3.59,.56,.71);for(const k of [-1,1])b.box('#9b8c73',k*1.36,.89,-3.67,.88,1.77,.77);
 const roof=b.part(new T.ConeGeometry(1.87,.84,4),'#52665e',0,2.48,-3.63,1.44,1,.78);roof.rotation.y=Math.PI/4;
 const channel=b.box(water,0,.04,-1.99,3.32,.065,2.81,b.root);
 const gates=[-1,1].map((k,i)=>{const p=b.group();p.position.set(k*.81,.47,-1.65-i*.72);
  b.box('#937655',0,0,0,1.30,.75,.15,p);for(const j of [-1,1])b.box(brass,j*.45,0,.09,.07,.71,.04,p);batch(p);return p;});
 const floats=[-1,1].map(k=>{const gauge=paint(st,cream,g=>{g.fillStyle=iron;for(let j=0;j<12;j++)g.fillRect(98,j*34,280+(j%2)*130,8);});b.box(gauge,k*2.24,.69,-1.19,.26,1.30,.10);
  b.box(brass,k*2.24,.17+(k<0?.38:.72),-1.12,.40,.091,.048);
  return b.box('#437b85',k*2.24,.17,-1.072,.31,.045,.038,b.root);});
 const boat=b.group();boatHull(b,boat,'#795a46',1.74,.32);b.box('#b69a70',0,.47,0,.77,.24,.43,boat);batch(boat);
 return(s,t)=>{const k=ease(s.end);channel.position.y=.037+s.water*.23;floats.forEach(m=>m.position.y=.17+s.water);
  gates.forEach((m,i)=>{const order=s.chosen===1?1-i:i;m.position.y=.43+(s.step>=order+2?.72:0);});
  boat.position.set((s.chosen===1?1:-1)*(.67-.49*k),.06+s.water*.23+.018*Math.sin(t*2),-.97-Math.max(0,s.step-1)*.27-k*1.89);
  boat.rotation.y=-1.40+(s.chosen===1?.18:-.18)*(1-k);};
};
export const balance:Exhibit=(b,st)=>{
 floor(b,grain(st,'#a58c6e'));b.box(tiles(st,'#b8b6a4','#a7a58f'),0,1.69,-3.91,9.2,3.38,.23);
 const moon=paint(st,'#5a6b68',g=>{g.fillStyle='#c1bfaa';g.beginPath();g.arc(384,192,151,0,7);g.fill();g.fillStyle='#a5a595';for(let i=0;i<17;i++){const a=i*2.39,r=20+i*6;g.beginPath();g.ellipse(384+Math.cos(a)*r,192+Math.sin(a)*r,8+i%7,6+i%5,0,0,7);g.fill();}});
 b.box(moon,0,1.76,-3.73,4.10,2.77,.09);b.box(wood,0,.36,-1.80,3.23,.72,1.08);b.cylinder(brass,0,1.19,-1.85,.14,.28,1.18);
 const beam=b.group();beam.position.set(0,1.76,-1.85);rod(b,iron,[-1.65,0,0],[1.65,0,0],.064,beam);rod(b,red,[0,-.71,0],[0,.16,0],.032,beam);batch(beam);
 const pans=[-1,1].map(k=>{const p=b.group();for(const d of [-1,1])rod(b,brass,[0,.62,0],[d*.38,0,.08],.019,p);b.cylinder('#ac9870',0,0,0,.44,.32,.09,p);batch(p);return p;});
 const cases=[-1,1].map((k,i)=>{const p=b.group();b.box(i?'#b89e76':'#b5b3a2',0,.19,0,.52,.32,.43,p);rod(b,brass,[-.18,.37,0],[.18,.37,0],.024,p);batch(p);return p;});
 const tray=b.group();tray.position.set(3.21,.56,-.55);b.box(wood,0,0,0,1.48,.96,.90,tray);b.box('#c2ac88',0,.52,0,1.56,.075,.97,tray);
 b.box(label(st,'#d9c69d','1731 g',iron),0,.13,.475,.94,.30,.045,tray);batch(tray);
 const stamp=b.group();b.box(label(st,cream,'交 接',iron),0,0,0,.94,.047,.35,stamp);b.oval(red,.36,.049,.02,.092,.026,.086,stamp);batch(stamp);
 return(s,t,x,z)=>{const tilt=s.step===0?s.shake*.22*Math.sin(t*2.9):s.mask===1?-.12:s.mask===2?.12:0;beam.rotation.z=tilt;
  pans.forEach((m,i)=>{const k=i?1:-1;m.position.set(k*1.48,1.11+k*1.48*Math.sin(tilt),-1.82);
   const c=cases[i],put=!!(s.mask&(1<<i));c.position.set(put?m.position.x:s.carry===i?x:k*2.15,put?m.position.y+.06:s.carry===i?.43:.09,put?-1.82:s.carry===i?z-.24:.64);
   if(s.end>=0){const f=ease(s.end*1.72);c.position.x+=(3.21+k*.29-c.position.x)*f;
    c.position.y+=(1.13-c.position.y)*f+.22*Math.sin(f*Math.PI);c.position.z+=(-.55-c.position.z)*f;}});
  stamp.visible=s.end>=.60;stamp.position.set(3.21,1.53+.47*(1-ease(Math.max(0,s.end-.56)*1.8)),-.55);};
};
export const lotus:Exhibit=(b,st)=>{
 floor(b,ripples(st,'#668e8e','#a5b9a7'));
 for(const parity of [0,1]){
  const sample=skyline(b,0,0,1,parity?'#c4aa86':'#a59d82'),model=sample.children[0] as T.Mesh;
  const facades=new T.InstancedMesh(model.geometry,model.material,4);facades.castShadow=facades.receiveShadow=true;
  const matrix=new T.Matrix4();for(let j=0;j<4;j++){const i=2*j+parity,k=.68+(i%3)*.12;
   matrix.makeScale(k,k,k).setPosition(-5.15+i*1.51,0,-4.03);facades.setMatrixAt(j,matrix);}
  sample.removeFromParent();b.root.add(facades);
 }
 for(const k of [-1,1]){b.box('#a79273',k*3.44,.12,-.38,2.02,.24,4.19);b.box('#a89170',k*2.75,.21,-2.68,2.59,.42,.61);}
 b.cylinder('#93866c',0,.22,-1.91,1.03,1.24,.44);b.cylinder(brass,0,.52,-1.91,.64,.83,.25);
 const petals=Array.from({length:13},(_,i)=>{const p=b.group();const outer=i<8,angle=outer?i*Math.PI/4:(i-8)*Math.PI*2/5+.28;
  p.position.set(Math.sin(angle)*(outer?.32:.11),.61+(outer?0:.07),-1.91+Math.cos(angle)*(outer?.32:.11));p.rotation.y=angle;
  const leaf=b.group(p);folded(b,outer?'#ca9c59':'#e1ba70',[[0,0,0],[-.39,.64,.20],[0,1.25,.31],[.09,.56,.33]],leaf);
  folded(b,outer?'#d9ad62':'#eac783',[[0,0,0],[.09,.56,.33],[0,1.25,.31],[.39,.65,.19]],leaf);batch(leaf);return leaf;});
 const trails=[-1,1].map(k=>{const p=b.group();arc(b,p,[[k*1.89,.072,-.53],[k*1.14,.072,.04],[k*.43,.072,-.69],[k*.19,.072,-1.42]],brass,.032);batch(p);return p;});
 const waves=[0,1].map(i=>{const m=ring(b,'#b1c7b6',0,.052,-1.91,.92+i*.21,.019,b.root);return m;});
 return(s,t)=>{trails.forEach((p,i)=>p.visible=s.carry===i||!!(s.mask&(1<<i)));petals.forEach((p,i)=>{const lit=s.mask?1:0;p.rotation.x=.07+lit*.12+(i<8?1.03:.61)*ease(s.end);});
 waves.forEach((w,i)=>{const a=1.13+(.5+.5*s.cycle)*.92+i*.15;w.scale.set(a,a,1);});};
};
export const compass:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#b5a885','#a29677'));const table=b.group();table.position.set(0,.50,-2.13);table.rotation.x=.23;
 b.box(wood,0,0,0,5.61,.37,2.23,table);b.box(ripples(st,'#78988f','#a1b9a1'),0,.217,0,5.40,.055,2.07,table);
 for(let i=0;i<8;i++)b.part(new T.ConeGeometry(.31+(i%2)*.11,.55+(i%3)*.13,5),i%2?'#829272':'#a0a380',-2.23+i*.47,.43+(i%3)*.045,-.26+Math.sin(i)*.35,1,1,1,table);
 batch(table);b.box(wood,0,.22,-2.13,2.35,.44,.96);
 const beams=[-1,1].map(k=>{const p=b.group();p.position.set(k*2.08,.76,-1.81);
  const line=Array.from({length:13},(_,i)=>{const f=i/12;return [-k*2.08*f,.81*Math.sin(f*Math.PI),.12*f];});arc(b,p,line,k>0?'#6b9f98':brass,.045);batch(p);return p;});
 b.cylinder(brass,0,.78,-1.70,.075,.11,.39);const beacons=Array.from({length:6},(_,i)=>b.oval('#efd18b',-.45+i*.41,.81+.03*Math.sin(i),-1.60+.22*Math.sin(i*.75),.07,.13,.07,b.root));
 for(const k of [-1,1]){rod(b,iron,[k*2.60,.10,-.58],[k*1.40,.10,-.58],.036);}
 return(s,t,x)=>{beams.forEach((m,i)=>{const picked=!!(s.mask&(1<<i)),active=(x<0?0:1)===i;
  m.rotation.y=picked?0:active?(s.aim-(i?-.34:.34))*.6:(i?.46:-.46);});
  beacons.forEach((m,i)=>m.visible=s.end>=i*.16);};
};
