import * as T from 'three';
import {rng} from '../templates/random';
import type {AlmanacSpec} from '../../content/levels/types';
import type {Place} from '../templates/almanac';

const palettes = {
  coast:['#12334a','#497d84','#254e5b','#62e1ca','#efb967'],
  space:['#080f2a','#393957','#333753','#8ceafa','#ffc477'],
  city:['#252943','#9b6967','#415263','#89e5ca','#efb77a'],
  garden:['#193839','#639282','#43695d','#acf2a5','#f4c777'],
  desert:['#39273b','#ad7466','#a97c61','#8df0de','#ffd197'],
  gold:['#251634','#75516e','#58425e','#8be6da','#facb77'],
  field:['#12372f','#477457','#406b58','#b5f6b5','#f8d27d'],
};
const families:Record<string,keyof typeof palettes>={clipper:'coast',steamer:'coast',moon:'space',venus:'space',station:'space',probe:'space',rover:'space',rocket:'space',mars:'desert',tomb:'desert',forest:'garden',rotor:'garden',balloon:'city',street:'city',stage:'city',stadium:'field',arcade:'gold',chip:'gold',lab:'gold',observatory:'space',press:'city',library:'city',chapel:'city',studio:'gold'};
export function buildTheatre(scene:any,spec:AlmanacSpec,stops:Place[]){
 const random=rng(spec.id),family=families[spec.theme], [night,haze,ground,mint,gold]=palettes[family];
 const sea=family==='coast',space=family==='space', brass='#c28a53',ivory='#efdcad',iron='#354752';
 const geo={box:new T.BoxGeometry(1,1,1), round:new T.CylinderGeometry(1,1,1,24),cone:new T.ConeGeometry(1,1,10),ball:new T.SphereGeometry(1,18,12),rock:new T.IcosahedronGeometry(1,0),ring:new T.TorusGeometry(1,.065,6,48)};
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.72,metalness:.12});
 const scenery=new T.Group(),hero=new T.Group(),moving=new T.Group();scene.add(scenery,hero);hero.add(moving);hero.position.set(0,.06,-3.6);
 const batches=new Map<any,Map<string,{mat:any[],col:string[]}>>(),dummy=new T.Object3D();
 function shape(k:keyof typeof geo,c:string,x:number,y:number,z:number,w:number,h:number,d:number,rx=0,ry=0,rz=0,parent=scenery){
   let batch=batches.get(parent);if(!batch){batch=new Map();batches.set(parent,batch);}
   let part=batch.get(k);if(!part){part={mat:[],col:[]};batch.set(k,part);}
   dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();part.mat.push(dummy.matrix.clone());part.col.push(c);
 }
 function beam(a:number[],b:number[],r:number,c:string,parent=hero){
   const v=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),len=v.length();dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());
   const e=dummy.rotation;shape('round',c,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,len,r,e.x,e.y,e.z,parent);
 }
 const box=(c:string,x:number,y:number,z:number,w:number,h:number,d:number,p=hero)=>shape('box',c,x,y,z,w,h,d,0,0,0,p);
 const cyl=(c:string,x:number,y:number,z:number,w:number,h:number,d=w,p=hero)=>shape('round',c,x,y,z,w,h,d,0,0,0,p);
 const ball=(c:string,x:number,y:number,z:number,w:number,h=w,d=w,p=hero)=>shape('ball',c,x,y,z,w,h,d,0,0,0,p);
 const ring=(c:string,x:number,y:number,z:number,r:number,p=hero,rx=0)=>shape('ring',c,x,y,z,r,r,r,rx,0,0,p);
 // Cutaway base, brass rim and inset lamps keep the play surface legible.
 cyl('#172d38',0,-1,0,10.7,1.35,9,scenery);cyl(brass,0,-.42,0,10.85,.11,9.13,scenery);
 cyl(ground,0,-.21,0,10.8,.44,9.1,scenery);
 for(let i=0;i<96;i++){const a=i*Math.PI/48;shape('box',i%4===0?gold:iron,10.78*Math.cos(a),-.58,9.09*Math.sin(a),.08,i%4===0?.32:.15,.08);}
 const detailColors=[ivory,ground,iron];for(let i=0;i<190;i++){const a=random.range(0,6.28),r=Math.sqrt(random.next())*9.6;
  shape('box',sea?mint:detailColors[i%3],r*Math.cos(a),.024,r*.82*Math.sin(a),random.range(.05,.36),.018,sea?.035:.055,0,random.range(-.3,.3));}
 // Distant landscape is detached from the playable tabletop.
 for(let i=0;i<44;i++){const x=random.range(-38,38),z=random.range(-33,-16);
  if(space)shape('rock','#656179',x,-3,z,random.range(2,5),random.range(2,7),4);
  else if(family==='city'||family==='gold'){const h=random.range(2,10);box('#615769',x,h/2-3,z,2,h,2,scenery);for(let j=0;j<5;j++)box(gold,x-.5+(j%2)*.7, j*.67-1,z+1.02,.22,.28,.04,scenery);}
  else shape('rock',i%2?'#537477':'#68817a',x,-2,z,random.range(3,8),random.range(4,11),5);
 }
 // Theme-specific principal silhouettes. All attachments move with the relevant machine.
 const kind=spec.theme,ship=kind==='clipper'||kind==='steamer';
 if(ship){
  // Continuous flared hull, plank strakes, a raised bow and a stepped quarterdeck.
  const hullPoints:number[]=[],hullIndex:number[]=[],hullColors:number[]=[];
  for(let j=0;j<=32;j++){const u=j/32,x=(u-.5)*8.7,w=.06+1.23*Math.sin(Math.PI*u)**.67,sheer=.42*(2*u-1)**4;
   const section=[[-w,1.88],[w,1.88],[w*.96,1.67],[w*.91,1.39],[w*.72,.91],[w*.4,.56],[0,.38],[-w*.4,.56],[-w*.72,.91],[-w*.91,1.39],[-w*.96,1.67],[-w,1.88]];
   for(const [n,[z,y]] of section.entries()){hullPoints.push(x,y+sheer,z);const color=new T.Color(['#c99860','#c99860','#ebbe76','#28363c','#43454b','#916542','#b47d4f','#916542','#43454b','#28363c','#ebbe76','#c99860'][n]);hullColors.push(color.r,color.g,color.b);
    if(j&&n){const k=j*12+n;hullIndex.push(k-13,k-1,k,k-13,k,k-12);}}
   if(j%2===0)for(const s of [-1,1]){ball(gold,x,1.56+sheer,s*w*.95,.07,.07,.035,moving);
    beam([x,1.89+sheer,s*w],[x,2.15+sheer,s*w],.023,ivory,moving);}
  }
  const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(hullPoints,3));hull.setAttribute('color',new T.Float32BufferAttribute(hullColors,3));hull.setIndex(hullIndex);hull.computeVertexNormals();moving.add(new T.Mesh(hull,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide})));
  box(brass,-2.85,2.12,0,1.35,.36,1.38,moving);box(ivory,-2.85,2.36,0,1.47,.12,1.45,moving);
  beam([3.1,1.9,0],[5.5,2.8,0],.078,brass,moving);beam([5.4,2.8,0],[2.35,5.8,0],.025,ivory,moving);
  for(let i=0;i<(kind==='clipper'?3:1);i++){const x=(i-1)*2.25,h=6.7-Math.abs(i-1)*.65;
   beam([x,1.9,0],[x,h,0],.08,brass,moving);beam([x,h,0],[x-1.25,1.9,.95],.024,ivory,moving);beam([x,h,0],[x+1.25,1.9,-.95],.024,ivory,moving);
   for(let j=0;j<3;j++){const y=2.7+j*1.04,w=1.77-j*.31;beam([x,y+.72,-w*.65],[x,y+.72,w*.65],.06,brass,moving);
    const sail=new T.PlaneGeometry(w*1.3,.92,10,5),v=sail.attributes.position;
    for(let n=0;n<v.count;n++){const xx=v.getX(n),yy=v.getY(n);v.setXYZ(n,xx*(.92+yy*.17),yy+.12*(xx/w)**2,.27*Math.cos(yy*Math.PI)*Math.cos(xx/w*1.8));}
    sail.computeVertexNormals();const cloth=new T.Mesh(sail,new T.MeshStandardMaterial({color:j%2?'#f6dfaa':'#efd296',side:T.DoubleSide}));cloth.position.set(x,y+.24,0);cloth.rotation.y=.63;moving.add(cloth);
    beam([x-w*.53,y+.71,w*.36],[x+w*.53,y+.71,-w*.36],.045,brass,moving);
   }}
  if(kind==='steamer'){box(ivory,1,2.45,0,2.1,1.1,1.5,moving);cyl(iron,1,3.7,0,.38,2,.38,moving);ring(gold,0,1.3,1.45,1,moving);}
  for(let i=0;i<7;i++){box('#8f674d',-8+i*.74,.14,2.7,.69,.3,2.1,scenery);cyl('#846953',-8+i*.74,.4,3.65,.11,1,.11,scenery);}
  for(let i=0;i<16;i++){const x=-8.3+(i%8)*.43,z=2.63+Math.floor(i/8)*.48;box(i%3?'#a77749':'#c5955e',x,.47,z,.41,.5,.44,scenery);box(ivory,x,.73,z,.05,.04,.43,scenery);}
  for(let i=0;i<8;i++){const x=-7+i*1.8;beam([x,0,-6.1],[x,2.1,-6.1],.11,brass,scenery);beam([x,2.1,-6.1],[x+1.8,.3,-6.1],.07,ivory,scenery);}
  beam([-7,2.1,-6.1],[6.1,2.1,-6.1],.1,brass,scenery);
  for(let j=0;j<5;j++)cyl(j%2?'#a7624f':ivory,7.4,j*.64+.34,-4.6,.48-j*.04,.65,.48-j*.04,scenery);
  cyl(iron,7.4,3.35,-4.6,.48,.14,.48,scenery);ball(gold,7.4,3.61,-4.6,.29,.34,.29,scenery);
  shape('cone',iron,7.4,4,-4.6,.56,.44,.56);
  for(let i=0;i<5;i++){const x=-8+i*3.4;box(i%2?'#a77659':'#b99d77',x,.8,-8.5,2.8,1.6,2,scenery);
    shape('cone',iron,x,1.98,-8.5,2.04,.86,1.55,0,.76);for(let j=0;j<3;j++)box(gold,x-.8+j*.78,1,-7.48,.33,.48,.045,scenery);}
  for(let i=0;i<3;i++){const [px,pz]=stops[i];cyl(iron,px+.95,.37,pz,.24,.63,.24,scenery);cyl(brass,px+.95,.69,pz,.33,.08,.33,scenery);}
 }else if(['rocket','station','probe','moon','venus'].includes(kind)){
  if(kind==='rocket'){cyl(ivory,0,3,0,.99,6, .99,moving);for(const y of [1,3.3,5.5])cyl(iron,0,y,0,1,.38,1,moving);
   shape('cone',ivory,0,6.85,0,.94,1.8,.94,0,0,0,moving);for(let i=0;i<6;i++)box(brass,-2,i+.4,0,.25,.9,.25);
   beam([-2,6,0],[0,5,0],.12,brass);}
  else {ball(ivory,0,3,0,1.3,.99,1,moving);for(const s of [-1,1]){beam([0,3,0],[s*4.5,3,0],.08,gold,moving);
    for(let n=0;n<5;n++)for(let j=0;j<3;j++)box(j%2?'#3b6095':'#467da3',s*(1.5+n*.55),3+(j-1)*.52,0,.51,.48,.1,moving);}
    beam([0,3,0],[0,4.6,0],.055,brass,moving);ring(gold,0,4.5,0,.56,moving);}
  if(kind!=='rocket'){const c=kind==='venus'?'#ffc16f':kind==='moon'?'#a9acc7':'#83a8bc';ball(c,-5,6,-7,2,2,2);shape('ring',ivory,-5,6,-7,2.9,2.9,2.9,1.12,.22,.4,hero);}
 }else if(kind==='rover'||kind==='mars'||kind==='rotor'){
  if(kind==='rotor'){for(const s of [-1,1]){beam([0,1.4,0],[s*3,2,0],.11,brass);ring(brass,s*2.6,2,0,1.1,hero,Math.PI/2);
    box(ivory,s*2.6,2.2,0,3.1,.1,.33,moving);box(ivory,s*2.6,2.21,0,.33,.1,3.1,moving);}box(iron,0,1.4,0,1.8,.65,1.1);}
  else{box(kind==='mars'?'#d7ab68':ivory,0,1.5,0,3.5,1.2,2,moving);beam([.8,2,0],[.8,3.2,0],.12,iron,moving);
   box(iron,.8,3.3,0,1,.47,.54,moving);ball(mint,.95,3.3,.31,.16,.14,.08,moving);shape('round',gold,-1.1,2.62,0,1.2,.14,1.2,.72,0,0,moving);}
  for(let i=0;i<4;i++)for(const s of [-1,1]){shape('round',iron,i*.85-1.3,.7,s*1.05,.56,.28,.56,Math.PI/2,0,0,moving);ring(brass,i*.85-1.3,.7,s*1.22,.35,moving);}
 }else if(kind==='balloon'){ball('#c56958',0,5.5,0,2.2,2.6,2.2,moving);for(let i=0;i<10;i++) {const a=i*.628;ball(i%2?gold:ivory,1.77*Math.cos(a),5.52,1.77*Math.sin(a),.51,2,.51,moving);
   beam([1.2*Math.cos(a),3.6,1.2*Math.sin(a)],[.63*Math.cos(a),1.95,.63*Math.sin(a)],.032,ivory,moving);}box(brass,0,1.55,0,1.4,.9,1.3,moving);
 }else if(kind==='chip'||kind==='arcade'){
  box(iron,0,1.1,0,5.2,2.1,2.4);box('#162f40',0,2,1.24,4.3,2,.12);
  for(let i=0;i<8;i++){for(const s of [-1,1]){box(gold,-2.1+i*.6,.45,s*1.6,.2,.55,.8);box(mint,-2.1+i*.6,1.91,1.34,.18,.22,.1);}}
  if(kind==='arcade'){box(ivory,-1.5,2,1.38,.12,.83,.08);box(ivory,1.5,2.45,1.38,.12,.83,.08);ball(gold,.3,2.18,1.4,.12);}
  else{box(brass,0,2.4,0,2.8,.4,1.5);for(let j=0;j<8;j++)beam([-2+j*.55,.21,1.8],[-4+j, .21,3],.055,gold);}
 }else if(kind==='stadium'){for(const x of [-3,3])beam([x,0,0],[x,3,0],.1,ivory);beam([-3,3,0],[3,3,0],.1,ivory);
  for(let i=0;i<14;i++)beam([-3+i*.46,3,0],[-3+i*.46,.2,-1.2],.025,ivory);
  for(let j=0;j<4;j++)beam([-3,j*.7,-1+j*.24],[3,j*.7,-1+j*.24],.025,ivory);
  for(let j=0;j<3;j++)for(let i=0;i<13;i++){box(i%3?brass:ivory,-5+i*.82,.3+j*.55,-2-j*.7,.72,.42,.5);}
 }else if(kind==='forest'){for(let i=0;i<17;i++){const x=random.range(-5.7,5.7),z=random.range(-3,1),h=random.range(2.5,4.4);
  cyl(brass,x,h*.42,z,.17,h*.85);shape('rock',i%2?'#819952':'#4f966f',x,h,z,1.5,1.85,1.45,0,i,0,hero);}
 }else if(kind==='tomb'||kind==='chapel'||kind==='library'||kind==='street'){
  const stone=kind==='tomb'?'#d9af71':kind==='chapel'?'#bc9d91':'#bd836e';
  for(let i=0;i<6;i++){box(stone,(i-2.5)*1.2,1.6,0,1.16,3.2,2.2);box(iron,(i-2.5)*1.2,2,1.12,.64,1,.05);
   box(ivory,(i-2.5)*1.2,1.48,1.22,.82,.12,.18);box(gold,(i-2.5)*1.2,2.1,1.17,.06,.8,.05);}
  box(ivory,0,3.33,0,7.65,.27,2.65);
  if(kind==='chapel'){for(let i=0;i<5;i++)shape('ring',ivory,-3+i*1.52,3.25,0,1.17,1.45,1.17,0,Math.PI/2,0,hero);ball('#79968e',0,3.4,0,2,1.55,1.35);}
  if(kind==='tomb'){for(let i=0;i<6;i++)box('#dcb778',0,i*.43+.2,-1,7.7-i, .43,4.8-i*.7);for(const x of [-3.7,3.7])shape('cone',gold,x,2.2,1,.77,4.4,.77,0,0,0,hero);}
  if(kind==='library')for(let i=0;i<31;i++)box(i%3===0?brass:iron,-3+i*.21,1.8,1.27,.16,1.4,.4);
 }else if(kind==='observatory'){cyl('#648789',0,1.1,0,2.1,2.2);ball('#9dafae',0,2.1,0,2.1,1.6,2.1);
  beam([-1.4,2.4,0],[1.65,4.35,0],.45,brass,moving);ring(gold,0,3.1,0,2.05,moving);ring(ivory,0,3.1,0,1.6,moving,1.05);
 }else if(kind==='lab'){box(brass,0,1.2,0,6.2,.25,2.3);for(let i=0;i<5;i++){const x=-2.4+i*1.2;
  ball(i%2?'#68bcb4':'#d6ad7b',x,1.94,0,.45,.57,.45);cyl(ivory,x,2.6,0,.16,.8);ring(brass,x,2.98,0,.2,hero,Math.PI/2);}
  for(const x of [-2.8,2.8])box(iron,x,.6,0,.24,1.2,1.6);
 }else if(kind==='press'){for(const x of [-2,2])box(brass,x,1.9,0,.44,3.8,2);box(iron,0,3.65,0,4.6,.44,2);box(ivory,0,1.25,0,4,.2,2);
  box(brass,0,2.2,0,3.4,.28,1.8,moving);cyl(iron,0,3,0,.24,1.6);ring(gold,0,3.65,0,1.15,hero,Math.PI/2);
 }else{for(const x of [-2.8,2.8]){cyl(iron,x,1.5,0,.12,3);box(brass,x,3.45,0,1.5,.9,.9);ball(ivory,x,3.45,.51,.45,.34,.1);}
  box('#336781',0,1.75,0,1.65,3.5,1.7);for(const x of [-.4,.4])box(ivory,x,2.45,.87,.54,.78,.08);box(iron,0,3.6,0,1.93,.2,1.93);}
 // Near-field furniture, station rings and the connecting engraved route.
 for(const [i,[x,z]] of stops.entries()){cyl(iron,x,.065,z,.95,.13,.95,scenery);shape('ring',gold,x,.15,z,.82,.82,.82,Math.PI/2);
   if(space||kind==='mars'){const px=x+1.16;cyl(iron,px,.29,z,.35,.48,.35,scenery);
    beam([px,.42,z],[px+.1,.95,z],.065,ivory,scenery);shape('round',gold,px+.15,1.02,z,.48,.1,.48,.58,0,0,scenery);
    box(ivory,px+.63,.22,z+.2,.45,.38,.39,scenery);}
   else if(family==='gold'||family==='city'){box(iron,x+1.25,.39,z,.55,.78,.62,scenery);
    for(let n=0;n<3;n++)box(n===i?mint:brass,x+1.1+n*.15,.8,z,.1,.06,.19,scenery);
    beam([x+1.25,.8,z-.2],[x+1.25,1.22,z-.2],.034,brass,scenery);ball(gold,x+1.25,1.26,z-.2,.104,.104,.104,scenery);}
   else if(family==='field'){for(let n=0;n<5;n++)shape('cone',n%2?ivory:gold,x+.96+n*.23,.19,z-.55,.1,.34,.1);}
   else if(!sea){for(let n=0;n<4;n++)shape('rock',family==='garden'?'#659a67':'#ba8c68',x+1.15+n*.14,.19,z+.3*Math.sin(n),.32,.42,.35,0,n,0);}
   for(let j=0;j<6;j++){const a=j*Math.PI/3;box(mint,x+Math.cos(a)*.91,.19,z+Math.sin(a)*.91,.1,.15,.1,scenery);}
   if(i){const [px,pz]=stops[i-1];for(let n=1;n<18;n++){let t=n/18;box(ivory,px+(x-px)*t,.055,pz+(z-pz)*t,.08,.035,.08,scenery);}}}
 for(const [parent,batch] of batches)for(const [k,b] of batch){const mesh=new T.InstancedMesh(geo[k as keyof typeof geo],material,b.mat.length);
  b.mat.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,new T.Color(b.col[i]));});mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);}
 const light=new T.DirectionalLight('#fff2d2',2.7);light.position.set(-8,19,9);light.castShadow=true;light.shadow.mapSize.set(1024,1024);
 Object.assign(light.shadow.camera,{left:-14,right:14,top:13,bottom:-13});light.shadow.normalBias=.036;
 scene.add(light,new T.HemisphereLight('#e5eeff',haze,1.65));
 scene.fog=new T.FogExp2(haze,.017);
 const stars=new Float32Array(720);for(let i=0;i<stars.length;i+=3){stars[i]=random.range(-40,40);stars[i+1]=random.range(1,24);stars[i+2]=random.range(-34,2);}
 const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(stars,3));scene.add(new T.Points(sg,new T.PointsMaterial({color:ivory,size:.06,transparent:true,opacity:.8})));
 const ribbons=new T.Group();hero.add(ribbons);
 const traceMaterial=new T.MeshBasicMaterial({color:mint,transparent:true,opacity:.72,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
 for(let j=0;j<5;j++){
  const coords:number[]=[],idx:number[]=[];
  for(let i=0;i<=64;i++){
   const t=i/64,angle=t*Math.PI*1.8+j*1.25;
   let x=Math.cos(angle)*(2+t*2),y=.2+t*5,z=Math.sin(angle)*(2+t*2);
   if(ship||family==='field'){x=(t-.5)*11;z=Math.sin(t*8+j*.64)*.45+j*.57-1;y=.18;}
   if(kind==='chip'||kind==='arcade'||kind==='lab'){x=(t-.5)*9;z=j*.56-1+Math.round(t*4)%2*.66;y=.28;}
   if(kind==='observatory'||kind==='chapel'){x=(j-2)*.8*(1-t);y=t*8;z=Math.cos(t*2+j)*.8;}
   const width=.04+.12*Math.sin(t*Math.PI);coords.push(x,y,z,x+width,y+(ship?.015:width*.65),z+width);
   if(i){const k=i*2;idx.push(k-2,k-1,k,k,k-1,k+1);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(coords,3));geometry.setIndex(idx);ribbons.add(new T.Mesh(geometry,traceMaterial));
 }
 const lens=document.createElement('canvas');lens.width=lens.height=64;const g=lens.getContext('2d')!,gradient=g.createRadialGradient(32,32,0,32,32,32);
 gradient.addColorStop(0,'#ffffef');gradient.addColorStop(.12,'#fff2ad');gradient.addColorStop(.36,'#ffeab755');gradient.addColorStop(1,'#ffeab700');g.fillStyle=gradient;g.fillRect(0,0,64,64);
 const flare=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(lens),transparent:true,blending:T.AdditiveBlending,depthWrite:false}));hero.add(flare);
 function animate(time:number,lift:number){if(ship){moving.rotation.z=.018*Math.sin(time);moving.position.x=lift*2.2;moving.position.y=lift*.4;}
  ribbons.visible=flare.visible=lift>0;
  if(lift>0){ribbons.scale.setScalar(.35+lift*.8);ribbons.rotation.y=ship?0:Math.sin(time)*.18;
    traceMaterial.opacity=.55+.38*Math.sin(time*4)**2;flare.position.set(moving.position.x,ship?.9:2.5+lift,1);flare.scale.setScalar(2.1+4.3*Math.sin(lift*Math.PI)**2);}
  if(['rocket','balloon','rotor'].includes(kind)){moving.position.y=lift*3.4+.08*Math.sin(time*1.5);if(kind==='rotor')moving.rotation.y=Math.sin(time*10)*.1;}
  if(['station','venus','probe','moon','observatory'].includes(kind))moving.rotation.y=time*.16;
  if(['mars','rover'].includes(kind))moving.position.x=lift*2.4;
  if(kind==='press')moving.position.y=-.5*Math.sin(time*2)**2;}
 return {night,haze,mint,gold,sun:light,animate};
}
