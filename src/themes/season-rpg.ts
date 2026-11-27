import * as T from 'three';
import type {Stage} from '../level/stage';
import type {Expedition,ExpeditionDay} from '../templates/season-rpg';
import {batch,bakeDesk,texture,workbench} from './jan01-chapter';

/** Fictional tabletop cutaways. All marks on a walk surface live in its material. */
function path(g:CanvasRenderingContext2D,points:number[][],ink:string,width:number){
  g.beginPath();g.strokeStyle=ink;g.lineWidth=width;
  points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
}
function surface(day:ExpeditionDay){
  return texture(768,1344,g=>{
    const wash=g.createLinearGradient(0,0,768,1344);
    const colors={1127:['#8b6754','#cd9d6d'],1128:['#246777','#75b8a8'],1129:['#c7e5e7','#92bdcc'],1130:['#427777','#b5b692'],1201:['#737276','#a18c79']}[day];
    wash.addColorStop(0,colors[0]);wash.addColorStop(1,colors[1]);g.fillStyle=wash;g.fillRect(0,0,768,1344);
    for(let j=0;j<310;j++){
      const x=(j*239)%768,y=(j*573)%1344,w=11+(j*17)%81;
      path(g,[[x,y],[x+w*.5,y+(j%7)-3],[x+w,y-2]],j%2?'#ffffff30':'#263e4626',1+j%3);
    }
    if(day==='1127'){
      for(let i=1;i<8;i++)path(g,[[i*96,0],[i*96,1344]],'#72503b',3);
      g.fillStyle='#c49758';g.fillRect(333,76,102,1160);g.fillStyle='#574a3d';
      for(let i=0;i<100;i++){const y=100+11*i;g.fillRect(335,y,i%10===0?49:i%5===0?32:18,2);if(i%10===0){g.font='16px Georgia';g.fillText(String(i),390,y+5);}}
    }else if(day==='1201'){
      for(const x of [246,514]){g.fillStyle='#3a4044';g.fillRect(x,0,12,1344);g.fillStyle='#bcb4a5';g.fillRect(x+3,0,3,1344);}
      for(let i=0;i<33;i++){const y=43*i;g.fillStyle='#625349';g.fillRect(202,y,42,10);g.fillRect(260,y,253,10);g.fillRect(527,y,37,10);}
    }else if(day==='1129'){
      for(let i=0;i<16;i++)path(g,[[i*73-213,4],[i*69-113,386],[i*74-57,774],[i*95-62,1344]],'#f3ffff80',3);
      for(let i=0;i<10;i++)path(g,[[0,95+i*132],[264,113+i*131],[534,90+i*133],[768,94+i*132]],'#668b9c60',2);
    }else{
      for(let i=0;i<17;i++){
        g.beginPath();g.strokeStyle=i%3?'#a6dfcb5c':'#214f6659';g.lineWidth=i%3?3:6;
        const x=i*58-65;g.moveTo(x,0);g.bezierCurveTo(x+178,405,x-98,700,x+16,1344);g.stroke();
      }
    }
  });
}
export function buildExpeditionSet(stage:Stage,game:Expedition){
  const {day}=game,k=workbench(stage),{root,fixed,box,oval,cylinder,part,group}=k;
  root.name='expedition-'+day;
  const wood='#835439',brass='#dca95e',ivory='#f5e8c9',blue='#467586',iron='#404b54',red='#b9533d';
  const floor=surface(day);
  box(stage.toon('#ffffff',{map:floor}),0,-.22,-.85,13,.44,25.7,fixed,'solid-map');
  const cyl=(c:string,x:number,y:number,z:number,r:number,h:number,p:T.Object3D=fixed)=>cylinder(c,x,y,z,r,r,h,p);
  const cone=(c:string,x:number,y:number,z:number,r:number,h:number,p:T.Object3D=fixed)=>cylinder(c,x,y,z,0,r,h,p);
  function bar(c:string,a:number[],b:number[],r:number,p:T.Object3D=fixed){
    const m=cyl(c,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]),p);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize());return m;
  }
  function ring(c:string,x:number,y:number,z:number,r:number,tube:number,p:T.Object3D=fixed){
    return part(new T.TorusGeometry(r,tube,7,36),c,x,y,z,1,1,1,p);
  }
  const horizon=new T.IcosahedronGeometry(1,0);
  function crag(c:string,x:number,y:number,z:number,w:number,h:number,d:number,p:T.Object3D=fixed){
    return part(horizon,c,x,y,z,w,h,d,p);
  }
  // Joined triangle ridges give the sea and snow sets a continuous horizon below the silhouettes.
  function ridge(c:string,z:number,base:number,heights:number[],shift:number){
    const xyz:number[]=[];
    for(let i=0;i<heights.length-1;i++){
      const a=-40+i*8+shift,b=a+8,ha=heights[i],hb=heights[i+1];
      xyz.push(a,base,z+4,b,base,z+4,b,hb,z, a,base,z+4,b,hb,z,a,ha,z);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(xyz,3));geo.computeVertexNormals();
    part(geo,c,0,0,0,1,1,1);
  }
  const sea=day==='1128'||day==='1130',polar=day==='1129';
  if(sea||polar){
    box(polar?'#bed7da':day==='1128'?'#579793':'#7f9b89',0,-1.22,-20,129,.56,110);
    if(day==='1128'){
      ridge('#78969b',-43,-1,[4,8,4,10,7,3,2,4,9,7,4],0);
      ridge('#658485',-32,-1,[8,4,7,3,.65,.2,.35,2.3,5,7,6],3);
    }else if(polar){
      ridge('#9fbdc8',-40,-1,[6,10,5,8,4,10,5,9,4,6,9],0);
      ridge('#769eb1',-28,-1,[6,3,8,5,2.9,1.7,4.2,5.5,9,4,6],2);
    }else{
      ridge('#8d9e86',-32,-1,[3,2,3.6,3,2.5,1.6,2.4,3.1,1.5,2.4,4],0);
    }
  }
  const active=group(),hero=group(),dial=group(),detail=group();
  let move:(t:number,final:number)=>void;
  if(day==='1127'){
    // A graduated standing thermometer, spirit burner, ice chips and two hammered pans.
    box('#52483e',0,-.88,-.85,19.5,.82,26.5);
    for(const s of [-1,1])box('#845d47',s*7.85,-.19,-.85,2.7,.32,25.7);
    const glass=texture(840,360,g=>{
      const grad=g.createLinearGradient(0,0,0,360);grad.addColorStop(0,'#65858f');grad.addColorStop(.64,'#cfddcf');grad.addColorStop(1,'#eef0da');
      g.fillStyle=grad;g.fillRect(0,0,840,360);
      for(let pass=0;pass<2;pass++)for(let j=0;j<32;j++){
        const x=(j*181+pass*51)%850,h=25+(j*43)%81,y=265+pass*53+(j*11)%23;
        g.fillStyle=pass?'#829389':'#a6b5ab';g.beginPath();g.moveTo(x,y-h);g.lineTo(x-h*.23,y);g.lineTo(x+h*.23,y);g.fill();
      }
      for(let j=0;j<270;j++){g.fillStyle='#f2f2e5';g.fillRect((j*67)%840,(j*97)%360,1+j%2,2);}
    });
    box('#67584b',0,3.73,-15.15,31,8.64,.61);
    box(stage.toon('#ffffff',{map:glass}),0,4.35,-14.79,25.6,6.22,.08);
    for(let i=0;i<=6;i++)box(wood,-12.8+i*4.27,4.35,-14.65,.14,6.48,.18);
    for(const y of [1.18,4.22,7.49])box(wood,0,y,-14.51,26,.14,.26);
    box('#976d4e',0,1.03,-14.37,26.7,.18,.86);
    box('#584436',0,3,-11.5,3,6,1);box('#d8b57a',0,3,-10.92,2.6,5.66,.16);
    for(let i=0;i<29;i++)box(iron,-.84+(i%5?0:.12),.55+i*.167,-10.81,i%5?.27:.52,.027,.05);
    cyl('#e8d6ac',.3,3.25,-10.65,.18,4.75);
    oval(red,.3,.73,-10.42,.39,.4,.31);
    cyl(red,0,.5,0,.098,1,dial);dial.position.set(.3,.81,-10.43);
    for(const s of [-1,1]){
      const x=s*5.3,z=s===-1?.1:-3.05;
      cylinder('#8e6654',x,.45,z,1.12,.82,.85);
      cyl(brass,x,.92,z,1.14,.12);cyl(s<0?'#8cbfc8':'#c1734b',x,1,z,1,.06);
      if(s<0)for(let n=0;n<7;n++)crag(n%2?'#d7f1eb':'#b3d9d9',x+Math.cos(n*2)*.6,1.14,z+Math.sin(n*2)*.65,.3,.24,.32);
      else for(let n=0;n<3;n++)oval('#e1c4a5',n*.36-.34,0,n*.12,.14,.28,.16,detail);
      bar(iron,[x,.7,z+.91],[x,.7,z+1.82],.09);
    }
    detail.position.set(5.3,1.5,-3.05);
    for(const s of [-1,1])for(let i=0;i<5;i++){
      const x=s*(7+i%2*.6),z=4.6-i*3.25;
      if(i%2===0){
        const h=.87+i*.13;
        cyl(i===2?'#698a80':'#8f6255',x,h*.52,z,.37,h);
        cylinder('#8e8272',x,h+.12,z,.16,.36,.22);cyl(ivory,x,h+.33,z,.13,.18);
        box('#dbceb2',x,h*.61,z+.363,.32,.33,.035);
      }else{
        for(let n=0;n<3;n++){
          box(n%2?'#54645d':'#9b6448',x,.09+n*.23,z,1.29,.14,1.68).rotation.y=n*.10;
          box('#d9c4a1',x,.198+n*.23,z,1.22,.073,1.59).rotation.y=n*.10;
        }
      }
    }
    const spiral=new T.CatmullRomCurve3(Array.from({length:94},(_,i)=>new T.Vector3(5.05+Math.cos(i*.19)*.48,1.78+i*.018,-4.65+Math.sin(i*.19)*.48)));
    part(new T.TubeGeometry(spiral,88,.059,7,false),brass,0,0,0,1,1,1);
    bar(brass,[5.48,1.8,-4.65],[5.03,1.52,-3.67],.057);
    for(const s of [-1,1]){bar(wood,[s*4.5,.08,-8],[s*5.15,.08,-10.14],.10);cone(iron,s*5.17,.09,-10.16,.13,.42).rotation.x=-1.27;}
    cyl(brass,0,.09,0,.59,.16,active);cyl(red,0,.21,0,.28,.10,active);
    for(const side of [-1,1]){
      const z=side<0?.1:-3.05;
      bar(brass,[side*4.29,.79,z],[side*3.74,.19,z],.083);
      cyl('#8b7056',side*3.5,.115,z,.42,.23);
    }
    cyl(brass,0,.09,-6.2,.39,.18);
    move=(t)=>{detail.position.y=1.55+.23*Math.sin(t*2);dial.scale.y=.55+4*(game.phase==='duel'?(game.sampled?game.column:game.fill*game.column):game.round>=3?.68:.26);};
  }else if(day==='1128'){
    // A three-dimensional strait: steep outer capes, a sheltered inlet and a working lateen sail.
    for(const s of [-1,1])for(let i=0;i<10;i++){
      const x=s*(8.1+(i%3)*.74),z=9-i*2.9,h=1.45+(i*7%5)*.66;
      crag(i%2?'#756f67':'#737e78',x,h*.26,z,2.25,h,2.6);
      crag('#919678',x+.12,h*.74,z-.18,1.41,h*.54,1.73);
    }
    for(const s of [-1,1])for(let j=0;j<8;j++){
      const z=5.4-j*2.85,x=s*(5.87+Math.sin(j*.92)*.45);
      crag(j%3?'#97a99d':'#dad8bc',x,.075,z,.31+j%3*.13,.16,.76);
    }
    for(let leg=0;leg<3;leg++){
      const bank=(leg%2?-game.initialSide:game.initialSide)*(leg===1?1.65:2.45);
      for(const side of [-1,1]){const x=bank+side*1.03,z=.1-leg*3.15;
        cylinder(side<0?red:'#eee7cd',x,.35,z,.12,.27,.63);cyl(iron,x,.77,z,.052,.36);}
    }
    oval('#704638',0,.04,0,.75,.33,1.5,hero);oval('#b99663',0,.22,.05,.64,.15,1.28,hero);
    bar(wood,[0,.25,0],[0,2.86,0],.07,hero);
    const sail=new T.Shape();sail.moveTo(-.98,0);sail.quadraticCurveTo(-.02,-.33,.95,-.03);sail.lineTo(.13,2.01);sail.closePath();
    part(new T.ExtrudeGeometry(sail,{depth:.07,bevelEnabled:false}),ivory,0,.65,.02,1,1,1,dial);
    bar(brass,[-1,.65,.02],[.13,2.7,.02],.046,dial);hero.add(dial);
    for(const s of [-1,1])bar(wood,[0,2.7,0],[s*.56,.3,.75],.018,hero);
    bar('#774d33',[0,.28,-.8],[0,1.68,-1.28],.045,hero);
    const jib=new T.Shape();jib.moveTo(0,0);jib.lineTo(.84,.08);jib.lineTo(.09,1.18);jib.closePath();
    part(new T.ExtrudeGeometry(jib,{depth:.039,bevelEnabled:false}),'#d4b37c',-.23,.37,-1.23,1,1,1,hero).rotation.y=.88;
    hero.scale.setScalar(1.46);
    hero.position.set(0,0,-10);
    ring(ivory,0,.14,0,.76,.052,active).rotation.x=Math.PI/2;
    bar(wood,[0,0,0],[0,1.13,0],.048,detail);
    const tell=group(detail);tell.position.y=1.05;
    part(new T.PlaneGeometry(.72,.2),stage.toon('#f2bd73',{side:T.DoubleSide}),.36,0,0,1,1,1,tell);
    move=(t,final)=>{hero.position.set(game.phase==='duel'?game.shoreX*.68:0,.16+.07*Math.sin(t*2),Math.max(-18,-8.7-final*2));hero.rotation.z=Math.sin(t*1.05)*.10;dial.rotation.x=-game.tide*.89;
      tell.rotation.z=-1.05+game.tide;detail.position.set(game.shoreX+1.03,0,game.z);};
  }else if(day==='1129'){
    for(const s of [-1,1])for(let i=0;i<12;i++){
      const x=s*(8.7+(i%3)*1.3),z=8-i*2.4,h=2+(i*3%7)*.61;
      crag(i%2?'#83acbc':'#698da3',x,h*.29,z,2.8,h*.74,2.4);
      crag('#d2e6e7',x-.25,h*.73,z,1.58,h*.45,1.8);
    }
    oval('#aebdc3',0,0,.05,.52,.52,1.97,hero);
    box('#a9b9c4',0,.42,0,5.3,.19,.85,hero);box('#8396a2',0,.24,1.42,1.93,.13,.53,hero);
    oval('#bc664b',0,.31,1.66,.095,.66,.47,hero);
    for(const x of [-1.15,0,1.15]){oval(iron,x,.04,-.57,.24,.25,.69,hero);bar(ivory,[x-.54,.04,-1.25],[x+.54,.04,-1.25],.055,hero);}
    for(let i=0;i<3;i++)box('#475965',(i-1)*.23,.36,-1.04,.17,.22,.11,hero);
    hero.scale.setScalar(1.38);
    for(let j=0;j<9;j++)for(const s of [-1,1]){
      const x=s*(3.74+j%3*.48),z=7-j*1.95;
      crag('#d4e8eb',x,.085,z,.58,.17,1.25);
    }
    for(let i=0;i<3;i++){const z=.1-i*3.15;
      for(const x of [-3.3,3.3]){cyl(iron,x,.65,z,.056,1.3);cone('#e09255',x,1.47,z,.18,.36);}
    }
    bar('#dd9a52',[-.55,.08,0],[0,.08,.43],.07,active);bar('#dd9a52',[.55,.08,0],[0,.08,.43],.07,active);
    move=(t,final)=>{hero.position.set(Math.sin(t*.57)*1.55,2.74+Math.sin(t*.9)*.16+Math.min(3,final),-8.9-Math.min(7,final*2));hero.rotation.z=Math.cos(t*.57)*.14;};
  }else if(day==='1130'){
    for(const s of [-1,1])for(let i=0;i<13;i++){
      const x=s*(8.1+Math.sin(i*.8)*.68),z=10.6-i*2.22;
      crag(i%2?'#abab75':'#af9567',x,.0,z,2.3,.94,2.07);
      if(i%3===1){cyl(wood,x,1.43,z,.14,2.6);oval('#78905b',x,2.68,z,.83,1.3,.69);}
    }
    for(let i=0;i<3;i++)for(const s of [-1,1]){const x=s*(i===1?1.65:2.45),z=1.75-i*3.15;
      for(let j=0;j<4;j++)cyl(j%2?ivory:iron,x,.115+.23*j,z,.066,.23);}
    for(let j=0;j<15;j++)box(j%3?'#957a59':'#a68d67',5.2,.47,1.7-j*.35,2.15,.14,.34);
    for(const x of [4.25,6.12])for(const z of [1.7,-.72,-3.2]){
      cyl(wood,x,.25,z,.13,1.65);ring('#c5ab7a',x,.82,z,.146,.029).rotation.x=Math.PI/2;
    }
    for(let j=0;j<4;j++){
      const x=-7.4-j*.35,z=2.7-j*3.82,h=1.65+j%2*.55;
      box(j%2?'#ae7655':'#c19c74',x,h*.5,z,1.86,h,2.37);
      for(const s of [-1,1])box('#67594e',x+s*.54,h+.28,z,1.31,.16,2.66).rotation.z=-s*.39;
      for(const f of [-1,1])box('#668583',x+.956,h*.59,z+f*.56,.08,.46,.49);
    }
    oval(wood,0,0,.08,1.02,.31,2,hero);box(ivory,0,.34,0,1.8,.23,3.48,hero);
    box('#c4c3a6',0,.79,.05,1.38,.66,2.52,hero);box(wood,0,1.18,.05,1.71,.14,2.76,hero);
    for(const x of [-.48,.48]){cyl(iron,x,1.97,-.79,.16,1.48,hero);cyl(brass,x,2.73,-.79,.207,.16,hero);}
    for(let i=0;i<5;i++)for(const s of [-1,1])box(blue,s*.705,.82,-.84+i*.41,.044,.34,.21,hero);
    hero.scale.setScalar(1.27);dial.position.set(0,.36,1.75);hero.add(dial);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;box(red,0,Math.sin(a)*.61,Math.cos(a)*.61,1.5,.14,.27,dial).rotation.x=-a;}
    cyl(brass,0,.19,0,.29,.36,active);bar(iron,[0,.32,0],[.29,.68,0],.059,active);
    const lead=group(detail);bar('#685442',[0,0,0],[0,-1.05,0],.025,lead);
    oval(iron,0,-1.09,0,.105,.14,.105,lead);
    move=(t,final)=>{hero.position.set(game.phase==='duel'?Math.sin(game.round+game.elapsed*.35)*.9:0,.12+Math.sin(t)*.05,-9-final*1.8);dial.rotation.x=t*1.66;
      detail.visible=game.sounded;detail.position.set(game.lastProbe*Math.abs(game.shoreX)+.19,1.35,game.z+1.65);
      lead.scale.y=Math.min(1,(game.elapsed-game.probeTime)*2.3)*(.3+game.depth*.115);};
  }else{
    // Chalk strata and partial lining rings surround a cutaway tunnel and its boring shield.
    for(const s of [-1,1])for(let i=0;i<15;i++){
      const z=10.6-i*1.68,h=2.8+(i*3%5)*.45;
      crag(i%2?'#b4ab93':'#cfc6b1',s*7.5,h*.4,z,1.47,h*.7,1.49);
      bar('#867461',[s*6.52,h*.68,z-.59],[s*6.48,h*.62,z+.75],.09);
      if(i%3===1){box(iron,s*6.04,1.68,z,.25,3.36,.33);bar(iron,[s*6.04,3.4,z],[s*5.1,4.27,z],.14);}
    }
    box('#a99e87',0,2.18,-16.1,35,8.2,3.6);
    for(let j=0;j<5;j++)bar(j%2?'#ccc4ae':'#887e70',[-14,j*1.08-.36,-14.22],[13,j*.96+.26,-14.22],.15);
    for(const s of [-1,1])for(let j=0;j<5;j++){
      const z=4.2-j*3.1;
      bar('#65534c',[s*6.25,2.05,z+1.35],[s*6.25,1.93,z-1.71],.059);
      box('#c79e5d',s*5.88,2.11,z,.24,.4,.26);
      box('#f0d897',s*5.71,2.12,z,.074,.24,.18);
    }
    ring(iron,0,2.45,-12.32,3.6,.27);ring('#ba8849',0,2.45,-12,2.71,.26);
    const face=cyl('#73634c',0,2.45,-12.32,2.62,.65);face.rotation.x=Math.PI/2;
    dial.position.set(0,2.45,-11.86);
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7,co=Math.cos(a),si=Math.sin(a);
      bar('#dfad62',[co*.28,si*.28,.16],[co*2.31,si*2.31,.16],.16,dial);
      for(let j=1;j<4;j++)oval(iron,co*(j*.61),si*(j*.61),.34,.19,.19,.14,dial);
    }
    oval(brass,0,0,.24,.48,.48,.28,dial);
    for(let leg=0;leg<3;leg++){
      const s=(leg%2?-1:1)*game.initialSide,x=(leg===1?1.65:2.45)*s,z=.1-leg*3.15;
      bar('#9d7953',[-x-.6,.08,z+.95],[-x+.6,.08,z+.95],.09);
      box('#a2a09a',x,.12,z,.8,.24,.9);bar(iron,[x,.24,z],[x,.24,z-.75],.12);
    }
    box(brass,0,.09,0,.66,.16,.65,active);
    move=(t,final)=>{dial.rotation.z=game.round*.8+t*(game.braced?.77:.07)+final*1.3;dial.position.z=-11.86+Math.min(.9,final*.55);};
  }
  const routePosts=[-1,1].map(s=>{
    const g=group();g.position.set(s*3.45,0,1.5);
    ring(s<0?'#78baae':'#d6a45e',0,.39,0,.37,.061,g);return g;
  });
  const targetRing=ring('#f7d282',0,.075,0,.94,.042,active);targetRing.rotation.x=-Math.PI/2;
  const world=bakeDesk(stage,root);world.bounds={min:[-6.1,-2,-12.5],max:[6.1,12,11.4]};
  [fixed,hero,dial,active,detail,...routePosts].forEach(group=>batch(group));
  return {world,shot(){},update(battle:Expedition,t:number,_dt:number,final:number){
    const point=battle.phase==='warmup'?battle.layout.warm:battle.phase==='finale'||battle.phase==='curtain'?battle.layout.end:battle.nextSpot;
    active.position.set(point[0],0,point[2]);active.visible=battle.phase!=='route';
    routePosts.forEach(post=>post.visible=battle.phase==='route');move(t,Math.min(final,3));
  }};
}
