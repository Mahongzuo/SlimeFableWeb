import * as T from 'three';
import {type Builder,rod,ring,paint,floor,panel,label,postcard,batch,brass,cream,iron,wood,jade,red} from './december-chapters';
export const mail:Builder=(b,st)=>{
  const timber=paint(st,'#a67b55',g=>{g.strokeStyle='#876449';g.lineWidth=2;for(let i=0;i<9;i++){g.beginPath();g.moveTo(0,i*48);g.bezierCurveTo(163,i*48-9,480,i*48+12,768,i*48+3);g.stroke();}});floor(b,timber);
  b.box('#4b665d',0,1.54,-3.20,9.1,3.1,.42);
  panel(b,label(st,'#c3c28c','邮  政','#365b4f'),0,3.48,-3.2,4.1,.66,jade);
  for(let i=0;i<8;i++)b.box(wood,i*1.03-3.6,1.57,-2.89,.102,2.73,.68);
  for(let i=0;i<4;i++)b.box(wood,0,.21+i*.92,-2.89,7.33,.11,.68);
  for(let i=0;i<11;i++){
    const col=i%7,row=(i*2)%3;b.box(i%2?'#e0c899':'#a5b39a',(col-3)*1.03,.35+row*.92,-2.77,.70,.12,.38).rotation.y=(i%3-1)*.095;
  }
  for(const [i,x] of [-2.35,2.35].entries()){b.box('#607e69',x,.27,-1.68,1.60,.54,.70);
    const plate=label(st,cream,i?'□':'○',jade);panel(b,plate,x,.32,-1.30,.45,.23,'#75694d');}
  const bag=b.group();bag.position.set(-3.20,0,1.38);
  b.oval(jade,0,.41,0,.75,.47,.62,bag);ring(b,cream,0,.78,0,.33,.035,bag);b.oval(iron,0,.76,0,.31,.055,.31,bag);
  for(let i=0;i<6;i++)rod(b,'#93a77e',[-.57+i*.21,.16,.32],[-.28+i*.10,.70,.18],.025,bag);batch(bag);
  const envelopes=[-1.5,1.42].map((x,i)=>{const p=b.group();p.position.set(x,.043,.28);postcard(b,st,p,cream,0,0,0,i===0);batch(p);return p;});
  const posted=[-2.35,2.35].map((x,i)=>{const p=b.group();p.position.set(x,.58,-1.67);p.rotation.x=.23;postcard(b,st,p,cream,0,0,0,i===0);batch(p);return p;});
  for(let i=0;i<3;i++){const x=3.4+i*.19;b.box('#d1b88a',x,.10+i*.07,1.76,.65,.07,.4).rotation.y=i*.1;}
  const tram=b.group();tram.position.set(-3.48,-.07,3.05);tram.scale.setScalar(.55);b.box(jade,0,.52,0,2.5,.8,.83,tram);
  b.box(cream,0,1.01,0,2.64,.16,.97,tram);for(let i=0;i<4;i++)b.box('#a7c2b5',-.86+i*.55,.62,.43,.38,.32,.04,tram);batch(tram);
  for(const z of [2.91,3.19])rod(b,iron,[-4.78,-.04,z],[4.78,-.04,z],.041);
  for(let i=0;i<19;i++)b.box(wood,-4.56+i*.51,-.12,3.05,.16,.10,.54);
  return(s)=>{envelopes.forEach((p,i)=>{p.visible=!(s.mask&(1<<i))||s.step===2&&s.selected===i;posted[i].visible=!p.visible;
    p.position.y=s.step===2&&s.selected===i?.17:.043;});bag.scale.y=s.end<0?1:1-Math.min(1,s.end)*.24;tram.position.x=-3.48+Math.max(0,s.end)**2*1.98;};
};
export const lens:Builder=(b,st)=>{
  floor(b,paint(st,'#71898a',g=>{g.strokeStyle='#b8bfa6';g.strokeRect(40,39,688,306);for(let n=0;n<14;n++)g.fillRect(50+n*46,330,2,n%3?9:21);}));
  b.box('#97b0a8',0,2.06,-4.6,11,4.4,.23);for(const x of [-3.9,3.85])panel(b,label(st,'#cdd1bd',x<0?'光 学':'观 察',iron),x,2.76,-4.41,1.66,.68,'#577475');
  const frame=b.group();frame.position.set(0,2.09,-2.92);ring(b,iron,0,0,0,1.51,.22,frame,false);
  b.cylinder(iron,-1.75,1.48,-3.62,.21,.28,2.96);rod(b,iron,[-1.75,2.9,-3.62],[0,3.43,-2.94],.23);
  b.oval('#c3d3bc',0,0,-.11,1.46,1.46,.12,frame);for(const side of [-1,1]){b.box('#7b8d77',side*.88,0,.07,.3,.026,.04,frame);}
  batch(frame);
  const slide=b.group();slide.position.set(0,2.05,-2.62);
  ring(b,'#517f73',0,0,0,.23,.055,slide,false);ring(b,'#9bb78a',-.32,.35,0,.11,.025,slide,false);
  const leaf=b.oval('#c89163',.78,-.38,.01,.24,.13,.065,slide);leaf.rotation.z=.38;
  rod(b,'#885d48',[.57,-.46,.07],[.97,-.30,.07],.014,slide);
  for(let n=0;n<3;n++){const x=.67+n*.081;rod(b,'#ab7356',[x,-.414+n*.03,.077],[x+.025,-.34+n*.021,.077],.010,slide);}batch(slide);
  for(const x of [-3.42,3.53]){b.cylinder('#55827e',x,.43,-1.9,.24,.33,.78);b.cylinder(cream,x,.93,-1.9,.27,.27,.20);}
  b.cylinder(iron,-2.78,.14,1.22,.40,.45,.25);for(let j=0;j<12;j++){const a=j*Math.PI/6;b.oval(brass,-2.78+.38*Math.cos(a),.22,1.22+.38*Math.sin(a),.055,.07,.054);}
  b.box('#aac8bc',0,.047,.11,4.08,.085,2.55,b.fixed,'solid-glass-slide');
  const notebook=b.group();notebook.position.set(3.4,.09,1.2);b.box(red,0,0,0,1.28,.12,.95,notebook);b.box(cream,0,.08,0,1.22,.035,.9,notebook);batch(notebook);
  const sampleRing=ring(b,'#527e76',3.12,.21,1.2,.13,.027,b.root);
  const sampleLeaf=b.oval('#b8845e',3.68,.209,1.20,.17,.019,.093,b.root);sampleLeaf.rotation.y=.45;
  return(s,t,x,z)=>{slide.position.set((x+1.6)*-.254,2.06+(z-.60)*-.267,-2.62);slide.scale.setScalar(s.step<2?.84:1.12);
    sampleRing.visible=s.step>=1;sampleLeaf.visible=s.step>=3;frame.rotation.z=(s.flat?0:.014*Math.sin(t*3));};
};
export const lantern:Builder=(b,st)=>{
  floor(b,paint(st,'#aa9372',g=>{g.strokeStyle='#82775f';for(let j=0;j<6;j++)for(let i=-1;i<9;i++)g.strokeRect(i*106+(j%2)*53,j*75,106,75);}));
  b.box('#c7a987',0,1.42,-3.77,10.8,2.86,.30);b.box('#546565',0,2.97,-3.78,11.26,.22,1.10);
  for(let i=0;i<6;i++){const x=i*1.72-4.3;panel(b,'#796b58',x,1.68,-3.54,1.29,1.45,wood);
    for(let j=0;j<4;j++)b.box(cream,x-.43+j*.29,1.66,-3.35,.035,1.36,.032);b.box(cream,x,1.65,-3.31,1.23,.055,.05);}
  for(const x of [-3.35,3.35]){b.cylinder(red,x,1.57,-1.93,.12,.17,3.14);b.cylinder('#b7a784',x,.18,-1.93,.29,.34,.35);}
  b.box(wood,0,3.18,-1.94,7.15,.22,.59);
  for(let i=0;i<26;i++)b.cylinder('#4d6564',-3.51+i*.28,3.40,-1.94,.13,.13,1.02).rotation.x=Math.PI/2;
  const body=b.group();body.position.set(0,1.04,-1.3);
  b.oval('#c75441',0,0,0,.86,.80,.66,body);for(const y of [-.64,.66])b.cylinder(brass,0,y,0,.49,.49,.12,body);
  b.cylinder(brass,0,-.91,0,.09,.19,.31,body);batch(body);
  const wings=[-1,1].map(k=>{const p=b.group();for(let j=0;j<5;j++){const a=(j-2)*.26;
    rod(b,brass,[k*.40,-.59,0],[k*(.67+.11*Math.cos(a)),0,a],.035,p);rod(b,brass,[k*(.67+.11*Math.cos(a)),0,a],[k*.38,.55,0],.035,p);}batch(p);return p;});
  for(let j=0;j<5;j++)rod(b,'#b79558',[-3.78+j*.14,.08,.1],[-3.21+j*.15,.11,1.2],.041);
  const lanternGlows=[-1,1].map(k=>{const glow=st.glow('#ffc579',1.75,.58);glow.position.set(k*2.55,1.66,-3.26);b.root.add(glow);return glow;});
  return(s)=>{const lift=Math.min(1,Math.max(0,s.end))*1.10;body.position.y=1.04+lift;body.scale.x=s.mask===3?1:.63;
    lanternGlows.forEach((m,i)=>m.visible=s.end>.25+i*.32);
    wings.forEach((m,i)=>{const k=i?1:-1;m.position.set(k*((s.mask&(1<<i))?.05:1.46),1.03+lift,-1.3);m.rotation.z=s.mask&(1<<i)?0:-k*.34;});};
};
export const bridge:Builder=(b,st)=>{
  // The deck and the two banks meet at shared edges; the shallow stream sits below.
  const banks=paint(st,'#a18a66',g=>{g.strokeStyle='#c1a580';g.lineWidth=5;
    for(let j=0;j<6;j++){g.beginPath();g.moveTo(0,45+j*57);g.bezierCurveTo(144,j*57+62,457,j*57+28,768,j*57+66);g.stroke();}});
  floor(b,banks,-3.12,0,3.18,5.4);floor(b,banks,3.12,0,3.18,5.4);
  const river=paint(st,'#719f9b',g=>{g.strokeStyle='#bdd2bc';g.lineWidth=4;for(let j=0;j<25;j++){
    const x=j*209%680,y=j*131%384;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+18,y+7,x+41,y-2);g.stroke();}});
  floor(b,'#bc9768',0,-.57,3.06,1.42);b.box(river,0,-.70,0,3.02,.13,5.39);
  for(let i=0;i<13;i++){const x=-1.42+i*.24;b.box('#90704c',x,.016,-.57,.018,.023,1.40);}
  for(const z of [-1.34,.23]){for(let i=0;i<6;i++){const x=i*.60-1.50;b.box(wood,x,.29,z,.11,.70,.11);}
    rod(b,wood,[-1.55,.62,z],[1.55,.62,z],.062);}
  for(const x of [-3.1,3.32]){b.box(cream,x,1.03,-3.13,2.45,2.06,1.4);
    const roof=b.part(new T.ConeGeometry(1,1,4),'#626d68',x,2.42,-3.13,2.1,.78,1.54);roof.rotation.y=Math.PI/4;
    b.box('#54635e',x,2.12,-3.13,2.75,.13,1.72);
    panel(b,wood,x,.85,-2.36,.72,1.32,'#715945');for(const k of [-1,1]){
      panel(b,'#99b1a4',x+.85*k,1.12,-2.368,.47,.63,wood);b.box(wood,x+.85*k,1.12,-2.23,.038,.62,.06);}}
  for(let i=0;i<7;i++){const hill=b.part(new T.DodecahedronGeometry(1,0),i%2?'#86a59a':'#688e82',-5.8+i*2.1,.25,-6.41-i%2,2.63,1.68+i%3*.53,2.14);hill.rotation.y=i*.54;}
  for(const k of [-1,1])for(let i=0;i<3;i++){
    const x=k*(1.6+i*.27);b.oval('#9d9c83',x,-.04,1.88+i*.21,.39,.11,.26);
    rod(b,jade,[x,.04,1.76],[x+k*.08,.27+i*.1,1.72],.019);}
  // The bridge model is held by two temporary trestles. Their release exposes
  // the polygonal compression arch below the deck along both visible edges.
  for(const z of [-1.32,.21])for(let i=0;i<6;i++){
    const xx=-1.76+i*.59,yy=(x:number)=>-.56+.50*(1-(x/1.78)**2);
    rod(b,'#8a6447',[xx,yy(xx),z],[xx+.58,yy(xx+.58),z],.087);}
  const shoring=b.group();for(const x of [-.74,.74]){rod(b,brass,[x,-.64,.24],[x,-.08,.24],.047,shoring);b.box(wood,x,-.66,.24,.44,.07,.37,shoring);}batch(shoring);
  const pegs=[-1,1].map(k=>b.cylinder(brass,k*.4,.17,-1.18,.07,.07,.28,b.root));
  const members=[-1,1].map(side=>{const p=b.group();rod(b,wood,[-.69,0,0],[.68,.22,0],.14,p);rod(b,brass,[.52,.17,0],[.75,.17,0],.064,p);batch(p);p.position.x=side*2.1;return p;});
  return(s,t,x,z)=>{members.forEach((m,i)=>{const side=i?1:-1,held=s.step===2&&s.selected===i,done=!!(s.mask&(1<<i))&&!held;
    m.position.set(held?x:side*(done?.69:2.1),held?.36:done?.20:.14,held?z-.38:done?-1.22:.02);m.rotation.z=done?-side*.22:held?.05*Math.sin(t*6):0;});
    const k=T.MathUtils.smoothstep(s.end,.05,1.22);shoring.position.y=-.53*k;pegs.forEach((p,i)=>{p.position.y=.17+k*(.35+i*.12);p.visible=k<.98;});};
};
export const falls:Builder=(b,st)=>{
  floor(b,paint(st,'#8a9877',g=>{g.strokeStyle='#c2b58b';g.lineWidth=17;g.beginPath();g.moveTo(44,290);g.bezierCurveTo(240,195,435,297,705,64);g.stroke();}));
  function landscape(g:CanvasRenderingContext2D,start:number){
    for(let row=0;row<4;row++){
      g.fillStyle=['#b7cac1','#91aaa5','#79988f','#5c8078'][row];
      g.beginPath();g.moveTo(0,384);for(let x=0;x<=768;x+=7){
        const u=x+start,y=157+row*47-39*Math.sin(u*.016+row)-19*Math.cos(u*.032+row*2)-14*Math.sin(u*.006+1);g.lineTo(x,y);}
      g.lineTo(768,384);g.closePath();g.fill();
    }
    g.strokeStyle='#d5e0ce';g.lineWidth=4;for(let j=0;j<5;j++){g.beginPath();const y=108+j*29;
      g.moveTo(50+j*70,y);g.bezierCurveTo(180+j*50,y+13,222+j*62,y-8,329+j*64,y+1);g.stroke();}
  }
  b.box(paint(st,'#d4ddc9',g=>landscape(g,0)),0,2.33,-5.88,12.7,5.9,.19);
  // Each cliff has a broken skyline and a narrow projecting lip. Water follows a
  // curved sheet onto the lip below, where a low ring of foam forms a plunge pool.
  const rocks=[[-.42,2.78,-3.69],[.12,1.90,-3.14],[.58,1.01,-2.60]];
  const water=paint(st,'#a2c5ba',g=>{g.lineWidth=7;
    for(let i=0;i<15;i++){const x=29+i*51,y=(i*173)%352;g.strokeStyle=i%3?'#bed9c7':'#dce5ce';
      g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x-9,y+19,x+3,y+34);g.stroke();}});
  water.map.wrapT=T.RepeatWrapping;
  for(const [j,[x,y,z]] of rocks.entries()){
    const profile=new T.Shape();profile.moveTo(-1.51,-.66);profile.lineTo(-1.24,.03);profile.lineTo(-.64,.19);
    profile.lineTo(.16,.09);profile.lineTo(.81,.22);profile.lineTo(1.31,-.02);profile.lineTo(1.49,-.62);profile.lineTo(.92,-1.19);profile.lineTo(-1.16,-1.21);profile.closePath();
    b.part(new T.ExtrudeGeometry(profile,{depth:.76,bevelEnabled:false}),['#687e75','#7e9080','#637b73'][j],x,y-.14,z-.66,1,1,1);
    const vertices:number[]=[],uv:number[]=[],indices:number[]=[];const width=.54+j*.10;
    for(let i=0;i<=8;i++){const t=i/8,xc=x+.20*t,yy=y+.08-1.02*t*t,zz=z+.16+.62*t;
      vertices.push(xc-width/2,yy,zz,xc+width/2,yy-.018*Math.sin(t*6),zz);uv.push(0,t,1,t);if(i){const n=i*2;indices.push(n-2,n,n-1,n,n+1,n-1);}}
    const sheet=new T.BufferGeometry();sheet.setAttribute('position',new T.Float32BufferAttribute(vertices,3));sheet.setAttribute('uv',new T.Float32BufferAttribute(uv,2));sheet.setIndex(indices);sheet.computeVertexNormals();
    b.part(sheet,water,0,0,0,1,1,1);
    b.oval('#9abdb4',x+.18,y-.95,z+.77,.48,.07,.21);
  }
  b.oval('#829e94',0,-.10,-3.08,3.66,.48,1.18);
  for(const side of [-1,1]){const x=side*3.2;rod(b,'#645b46',[x,0,-1.63],[x+side*.18,2.83,-1.72],.14);
    for(let j=0;j<4;j++){const a=side*(j%2?-.6:.63);
      rod(b,'#645b46',[x,1.20+j*.41,-1.7],[x+a,1.6+j*.39,-1.65],.064);b.oval('#4c7866',x+a,1.66+j*.39,-1.65,.62,.16,.39);}}
  const frame=b.group();frame.position.set(0,.75,1.93);for(const k of [-1,1]){b.box(wood,k*1.23,0,0,.08,.90,.09,frame);b.box(wood,0,k*.45,0,2.52,.07,.09,frame);}batch(frame);
  const cards=[-1,1].map((k,i)=>b.box(paint(st,'#d5dbc7',g=>{landscape(g,i*339);g.fillStyle='#e1e7d0';g.fillRect(i?84:566,170,13,125);}),k*.60,.75,1.91,1.16,.81,.035,b.root));
  return(s,t)=>{water.map.offset.y=-t*.28;cards.forEach((m,i)=>{m.visible=s.step>i;m.scale.y=.77*Math.min(1,s.end>=0?.8+s.end:.57);});};
};

