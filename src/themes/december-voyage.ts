import * as T from 'three';
import type {Stage} from '../level/stage';
import type {Voyage,VoyageDay} from '../templates/december-voyage';
import {batch,bakeDesk,texture,workbench} from './jan01-chapter';

const floors:Record<VoyageDay,[string,string]>={'1202':['#a6654b','#df9e6e'],'1203':['#243644','#55696e'],'1204':['#45576b','#849999'],'1205':['#94b9c0','#e5e4ce'],'1206':['#a28265','#dcc39b']};
function surface(day:VoyageDay){
  return texture(512,1024,g=>{
    const colors=floors[day],wash=g.createLinearGradient(0,0,512,1024);
    wash.addColorStop(0,colors[0]);wash.addColorStop(1,colors[1]);g.fillStyle=wash;g.fillRect(0,0,512,1024);
    const line=(x:number,y:number,ex:number,ey:number,c:string,w=1)=>{g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.lineTo(ex,ey);g.stroke();};
    for(let i=0;i<720;i++){
      const x=i*73%512,y=i*297%1024;
      if(day==='1202')line(x,y,x+5+i%29,y-i%4,'#6c3c2a48');
      else if(day==='1205'){line(x,y,x+12+i%51,y+i%13,'#648e9e60');line(x+12+i%51,y+i%13,x+28+i%51,y+i%13-5,'#638c9755');}
      else if(day==='1206'){const sx=Math.floor(x/52)*52+3;line(sx,y,sx+44,y+i%4,'#8e674b38');}
      else {g.fillStyle=i%2?'#d5dbd048':'#041e3433';g.fillRect(x,y,2,2);}
    }
    if(day==='1206')for(let i=0;i<=10;i++){line(i*52,0,i*52,1024,'#5e5140',2);for(let j=0;j<8;j++)line(i*52,j*162+(i%3)*53,(i+1)*52,j*162+(i%3)*53,'#68513e',2);}
    if(day==='1205'){
      const bank=(y:number)=>250+54*Math.sin(y*.014+1.3)+26*Math.sin(y*.041);
      g.fillStyle='#548f9a';g.beginPath();
      for(let y=0;y<=1024;y+=4){const x=bank(y)-38-10*Math.cos(y*.06);if(y)g.lineTo(x,y);else g.moveTo(x,y);}
      for(let y=1024;y>=0;y-=4)g.lineTo(bank(y)+38+4*Math.sin(y*.05),y);
      g.closePath();g.fill();
      for(let i=0;i<140;i++){const y=i*97%1024,x=bank(y)-29+(i*23%51);line(x,y,x+4+i%9,y-1,'#b1d5cd99');}
    }
    if(day==='1203'||day==='1204')for(let i=0;i<8;i++){
      const y=i*133;line(0,y,512,y,'#1c2f38',3);for(let k=0;k<8;k++)line(k*77,y+5,k*77+13,y+5,'#edb867',3);
      line(i%2?139:315,y+2,i%2?139:315,y+132,'#223b4b',2);
    }
  });
}
export function buildVoyageSet(stage:Stage,game:Voyage){
  const {day}=game,{root,fixed,part,group,box,cylinder,oval}=workbench(stage);
  root.name='voyage-'+day;
  const snow='#eeeeda',brass='#d6a35a',ink='#364753',copper='#b96245',steel='#9daeb3',lamp='#ffda83';
  box(stage.toon('#ffffff',{map:surface(day)}),0,-.21,-.8,13,.42,26,fixed,'solid-deck');
  const dyn:T.Group[]=[];
  function moving(x=0,y=0,z=0){const o=group();o.position.set(x,y,z);dyn.push(o);return o;}
  function rod(c:string,a:number[],b:number[],r:number,parent:T.Object3D=fixed){
    const d=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    const m=cylinder(c,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,r,d.length(),parent);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;
  }
  const hoop=(color:string,r:number,w:number,x:number,y:number,z:number,o:T.Object3D=fixed)=>part(new T.TorusGeometry(r,w,7,40),color,x,y,z,1,1,1,o);
  const rock=new T.IcosahedronGeometry(1,0);
  const crag=(c:string,x:number,y:number,z:number,w:number,h:number,d:number,o:T.Object3D=fixed)=>part(rock,c,x,y,z,w,h,d,o);
  function stars(){for(let i=0;i<125;i++)oval(i%4?snow:lamp,-39+i*67%79,1+i*43%23,-30-i%12,.045+i%3*.018,.07,.04);}
  const hero=moving(0,0,-11.7);
  const motions:((t:number,final:number)=>void)[]=[];
  const legZ=(i:number)=>.1-i*3.05;
  const legSide=(i:number)=>game.initialSide*(i%2?-1:1);
  if(day==='1202'){
    box('#af7056',0,-1.2,-15,115,1.5,100);
    for(let i=0;i<53;i++){
      const side=i%2?1:-1,z=8-i%22*2;crag(i%3?'#ae7156':'#824a3c',side*(7+i*7%18),-.2,z,1+i%5,.5+i%4*.66,1.3+i%4);
    }
    cylinder(steel,0,1,0,1.15,1.5,1.1,hero);oval('#cab78c',0,1.69,0,1.09,.72,1.09,hero);
    for(let j=0;j<4;j++){const a=j*Math.PI/2+.52,x=Math.cos(a),z=Math.sin(a);
      rod(ink,[x*.85,.91,z*.85],[x*1.76,.24,z*1.76],.11,hero);oval(brass,x*1.76,.18,z*1.76,.46,.13,.4,hero);}
    for(let i=0;i<3;i++){
      const a=i*2.094+.2,petal=moving(Math.sin(a)*1.04,1.2,-11.7+Math.cos(a)*1.04);
      oval('#d1b78a',0,0,.94,.79,.14,1.26,petal);rod('#8a7a60',[0,.14,.14],[0,.15,1.94],.055,petal);
      petal.rotation.order='YXZ';petal.rotation.y=a;
      const flag=moving(-2.65*legSide(i),.67,legZ(i)+.65);
      rod(ink,[flag.position.x,0,flag.position.z],[flag.position.x,1.03,flag.position.z],.05);
      box(copper,.31,.17,0,.63,.24,.05,flag);
      motions.push((_,f)=>{const target=game.round>i||f?-.10:-1.03;petal.rotation.x+=.105*(target-petal.rotation.x);flag.rotation.z=game.wind*.77;});
    }
    const mast=moving(0,2,-11.7);rod(brass,[0,0,0],[0,1.6,0],.058,mast);hoop(snow,.39,.045,0,1.32,0,mast);
    motions.push((_,f)=>{mast.rotation.z=1.2*(1-Math.min(1,f));});
  }else if(day==='1203'){
    stars();
    const planet=texture(640,320,g=>{
      g.fillStyle='#dbba91';g.fillRect(0,0,640,320);
      const bands=['#dcc4ac','#bb8662','#f3deae','#ab6955','#e8cc9f','#cf9273'];
      for(let j=0;j<37;j++){g.beginPath();for(let x=0;x<=643;x+=4){const y=j*9+3*Math.sin(x*.032+j*.5)+2*Math.sin(x*.067+j);if(!x)g.moveTo(x,y);else g.lineTo(x,y);}
        g.strokeStyle=bands[j%6];g.lineWidth=5+j%5;g.stroke();}
      for(let i=0;i<4;i++){g.fillStyle=['#ddbc94','#b36c57','#cb8760','#d29a74'][i];g.beginPath();g.ellipse(470,212,36-i*6,15-i*3,-.08,0,Math.PI*2);g.fill();}
    });
    const jovian=moving(-2.6,5,-21);part(new T.SphereGeometry(1,56,32),stage.toon('#fff',{map:planet}),0,0,0,7.8,7.5,7.8,jovian);jovian.rotation.z=.13;
    box('#8a8272',0,.35,-11.3,3.65,.7,.79);
    box(ink,0,.76,-11.3,3.42,.13,.48);
    for(let i=0;i<3;i++){
      const strip=moving((i-1)*1.05,.8,-11.29);
      const map=planet.clone();map.repeat.set(.16,.62);map.offset.set(.36+i*.16,.19);map.needsUpdate=true;
      box(snow,0,.83,0,1.04,1.69,.074,strip);
      box(stage.toon('#fff',{map}),0,.84,.047,.93,1.48,.018,strip);
      motions.push((_,f)=>{strip.visible=f>.04;strip.scale.y=Math.max(.012,Math.min(1,(f-i*.13)*1.28));});
    }
    const probe=moving(4.4,3.2,-11);cylinder(brass,0,0,0,.48,.65,.94,probe);
    const dish=part(new T.SphereGeometry(1,32,14,0,Math.PI*2,0,1.15),snow,0,.65,0,1.5,.73,1.5,probe);dish.rotation.z=-.5;
    for(const s of [-1,1]){rod(steel,[s*.3,0,0],[s*2.2,-.68,0],.06,probe);cylinder(ink,s*2.17,-.67,0,.24,.24,.59,probe);}
    for(const s of [-1,1])for(let j=0;j<7;j++){
      const z=8-j*3;
      rod(steel,[s*5.88,.04,z],[s*6.18,.65,z],.052);
      if(j<6)rod('#9aaabb',[s*6.18,.65,z],[s*6.18,.65,z-3],.039);
      box('#c28e5e',s*5.91,.27,z,.18,.15,.21);
    }
    for(let i=0;i<3;i++){
      const z=legZ(i),s=legSide(i);
      box('#829295',-3.49*s,.23,z+.64,.73,.46,.89);
      cylinder(ink,-3.49*s,.61,z+.64,.32,.35,.3);
      const lens=oval('#85c3ca',-3.49*s,.84,z+.64,.21,.09,.21);
      lens.rotation.x=.24;
      box('#bd9871',3.5*s,.35,z,.56,.7,.74);
      box('#efdcad',3.5*s,.77,z,.69,.13,.81);
    }
    for(let i=0;i<3;i++)for(let j=0;j<11;j++){
      const tile=moving((-2.65+.53*j)*legSide(i),.055,legZ(i)+.38);box(['#ddbe91','#f2d1ab','#d89472'][i],0,0,0,.43,.067,.53,tile);
      motions.push(()=>{tile.visible=game.round>i||(game.round===i&&game.engaged&&j/10<=game.fill);});
    }
    motions.push((t,f)=>{jovian.rotation.y=t*.012+f*.17;probe.rotation.y=.3*Math.sin(t*.26);});
  }else if(day==='1204'){
    stars();
    const earth=texture(512,256,g=>{
      g.fillStyle='#5787a2';g.fillRect(0,0,512,256);
      for(let i=0;i<26;i++){
        const x=i*83%512,y=i*107%215;g.fillStyle=i%3?'#9db4a4':'#d3d2b3';
        g.beginPath();g.moveTo(x-24,y);g.bezierCurveTo(x-12,y-24,x+26,y-15,x+32,y);
        g.bezierCurveTo(x+18,y+6,x+7,y+16,x-24,y);g.fill();
      }
      for(let i=0;i<72;i++){
        const x=i*149%512,y=i*97%246;g.strokeStyle='#e6eee1aa';g.lineWidth=2+i%4;
        g.beginPath();g.moveTo(x-18,y);g.quadraticCurveTo(x,y+7,x+27,y-4);g.stroke();
      }
    });
    part(new T.SphereGeometry(1,48,24),stage.toon('#fff',{map:earth}),-11,-14,-27,20,19.8,20);
    for(const side of [-1,1]){
      const x=side*3.5;rod(steel,[x,2,-12],[x,2,-18],1.12);
      for(let i=0;i<7;i++)hoop(i%3?snow:brass,1.18,.073,x,2,-12.25-i*.82);
      for(let j=0;j<4;j++){
        const px=x+side*(1.78+j*1.19);box('#314f73',px,2.17,-15.8,1.11,.13,3.5);
        for(let l=0;l<5;l++)box('#7194a6',px,2.251,-17.08+l*.59,.97,.019,.025);
      }
      rod(ink,[x,2.18,-15.8],[x+side*6,2.18,-15.8],.072);
    }
    const module=moving(0,2.1,-11.8);rod('#b9c6c6',[-2.14,0,0],[2.14,0,0],.99,module);
    const windows=moving(0,2.09,-11.8);
    for(let i=-1;i<=1;i++){
      hoop(ink,.19,.045,i*.74,0,.98,windows);
      oval(lamp,i*.74,0,.995,.164,.164,.06,windows);
    }
    for(const x of [-2,-1.65,-.78,.78,1.65,2]){const ring=hoop(ink,1.01,.068,x,0,0,module);ring.rotation.y=Math.PI/2;}
    for(let i=0;i<3;i++){
      const wheel=moving(-2.65*legSide(i),.57,legZ(i)+.65);hoop(brass,.41,.066,0,0,0,wheel);
      rod(snow,[0,0,0],[0,.39,0],.05,wheel);rod(ink,[wheel.position.x-.4,.65,wheel.position.z-.15],[wheel.position.x-.4,1.02,wheel.position.z-.15],.047);
      motions.push(()=>{wheel.rotation.z=game.engaged||game.round>i?0:(game.wind-.22)*2.5;});
    }
    motions.push((t,f)=>{
      module.rotation.z=game.engaged||game.round>=3?0:.1*Math.sin(t*1.3);
      module.position.z=-11.8-game.round*.34-f*.13;
      windows.position.z=module.position.z;windows.visible=f>.4;
    });
  }else if(day==='1205'){
    box('#478396',0,-1.01,-14,130,1.16,110);
    for(let j=0;j<31;j++)for(const side of [-1,1]){
      const x=side*(7.4+(j*7%19)),z=12-j*1.6;
      crag(j%3?snow:'#aac3cc',x,-.36,z,1.5+j%3,.45+j%4*.32,1+j%4);
    }
    const hull=new T.Shape();hull.moveTo(-1.4,2.3);hull.lineTo(-1.65,-1.7);hull.quadraticCurveTo(-1,-3.3,0,-4);hull.quadraticCurveTo(1,-3.3,1.65,-1.7);hull.lineTo(1.4,2.3);hull.closePath();
    const shell=part(new T.ExtrudeGeometry(hull,{depth:1.08,bevelEnabled:true,bevelSize:.19,bevelThickness:.2,bevelSegments:2}),ink,0,-.14,0,1,1,1,hero);shell.rotation.x=-Math.PI/2;
    box(snow,0,1.33,-.45,2.26,.94,2.69,hero);box('#d3c7a6',0,1.99,-.54,1.94,.42,1.9,hero);
    for(let i=0;i<6;i++)box('#416373',-.82+i*.325,2.02,.44,.21,.2,.048,hero);
    cylinder(copper,0,2.59,-1.23,.37,.43,.95,hero);cylinder(ink,0,3.12,-1.23,.39,.38,.13,hero);
    rod(brass,[0,.98,1.34],[0,3.69,1.34],.069,hero);rod(steel,[-.62,3.01,1.34],[.62,3.01,1.34],.043,hero);
    for(let i=0;i<3;i++){
      const s=legSide(i),z=legZ(i);
      rod(ink,[-2.65*s,0,z+.64],[-2.65*s,.74,z+.64],.1);rod(snow,[-2.65*s,.41,z+.64],[-2.65*s,.57,z+.64],.111);
      for(const edge of [-1,1]){
        const floe=moving(2.65*s+edge*.55,.13,z);crag('#deedeb',0,0,0,.58,.23,1.23,floe);
        motions.push(()=>{const open=game.round>i||game.round===i&&game.engaged;floe.position.x+=(2.65*s+edge*(open?.97:.55)-floe.position.x)*.14;});
      }
    }
    motions.push((t,f)=>{hero.position.z=-13+game.round*.39+f*.91;hero.rotation.z=.035*Math.sin(t*1.05);hero.rotation.y=.16-f*.085;});
  }else{
    box('#93a78a',0,-1.08,-14,110,1.25,99);
    for(let j=0;j<42;j++){
      const s=j%2?-1:1,x=s*(8+j*11%25),z=5-j%20*1.9;
      rod('#746652',[x,-.5,z],[x,1+j%3*.25,z],.16);crag(j%3?'#88977a':'#a79266',x,1.5,z,1.2+j%3*.35,1.35,1.2);
    }
    const stone=new T.CylinderGeometry(1.38,1.91,5.9,4);const shaft=part(stone,'#e1d2b5',0,2.79,-11.6,1,1,1);shaft.rotation.y=Math.PI/4;
    for(const s of [-1,1])for(const v of [-1,1]){
      const x=s*1.82,z=-11.6+v*1.82;rod('#815c42',[x,0,z],[x,7.73,z],.103);
      for(let j=0;j<4;j++)rod('#a47b52',[x,j*1.38+.33,z],[-x,(j+1)*1.38+.18,z],.053);
    }
    for(const side of [-1,1])box('#997252',side*1.82,7.83,-11.6,.28,.2,3.94);
    box('#8c674d',.65,8.04,-11.6,5.64,.22,.42);
    const rope=moving();cylinder(ink,0,-.5,0,.041,.041,1,rope);
    const cap=moving(0,6.72,-11.6);const tip=part(new T.ConeGeometry(1.36,1.55,4,1,true),'#d5dede',0,.775,0,1,1,1,cap);tip.rotation.y=Math.PI/4;
    for(let i=0;i<3;i++){
      const z=legZ(i)+.65,drum=moving(0,.33,z);cylinder('#805943',0,0,0,.38,.38,.56,drum);rod(brass,[-.87,0,0],[.87,0,0],.08,drum);
      const guide=hoop('#dab378',1.32,.04,0,.064,z);guide.rotation.x=-Math.PI/2;
      motions.push(()=>{if(game.round===i)drum.rotation.y=game.fill*6.28;});
    }
    motions.push((_,f)=>{
      const progress=Math.min(1,(game.round+(game.engaged?1:game.fill))/3);
      cap.position.x=2.65*(1-progress);cap.position.y=3.9+2.45*progress-.61*Math.min(1,f);
      rope.position.set(cap.position.x,7.91,-11.6);rope.scale.y=Math.max(.04,7.91-cap.position.y-1.55);
    });
  }
  const marker=moving();const ring=hoop(lamp,.89,.047,0,.072,0,marker);ring.rotation.x=-Math.PI/2;
  const branches=game.layout.branches.map(([x,,z],i)=>{const o=moving(x,.06,z);hoop(i?brass:'#83c4b8',.78,.066,0,0,0,o).rotation.x=-Math.PI/2;return o;});
  const world=bakeDesk(stage,root);world.bounds={min:[-6.15,-2,-12.75],max:[6.15,12,11.4]};
  [fixed,...dyn].forEach(batch);
  return {world,update(t:number,f:number){
    const pos=game.phase==='warmup'?game.layout.warm:game.phase==='finale'||game.phase==='curtain'?game.layout.end:game.nextSpot;
    marker.position.set(pos[0],0,pos[2]);marker.visible=game.phase!=='route'&&game.phase!=='curtain';
    branches.forEach(o=>o.visible=game.phase==='route');for(const motion of motions)motion(t,Math.min(1.8,f));
  }};
}
