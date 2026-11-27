import * as T from 'three';
import type {Stage} from '../level/stage';
import type {MonthendDay,MonthendVoyage} from '../templates/monthend-voyage';
import {batch,bakeDesk,texture,workbench} from './jan01-chapter';
import type {Vec} from '../slime/types';
const ink='#34464d',brass='#c99b58',gold='#ffce72',wood='#8b664c',cream='#ecdfbf',blue='#7297a7',leaf='#729476',red='#b6745c',slate='#667f83';
const palettes:Record<MonthendDay,[string,string,string,string]>={
 '1222':['#607887','#cbcabb','#d8cbbb','#ad967a'],'1223':['#82aabb','#eadcb8','#dedccc','#a7b6ac'],
 '1224':['#59918c','#ded3a3','#c8d3ac','#ad9878'],'1225':['#81a5a5','#e8d9ab','#ded7aa','#aa9f79'],
 '1226':['#776858','#d8b998','#cfbda4','#967d65'],'1227':['#2f4562','#a6a9a3','#c8c8b8','#89918d'],
 '1228':['#7c9e9f','#e9d4ae','#eadbc4','#b39a7d'],'1229':['#8b7c72','#dfc7a8','#dbcbb2','#a89882'],
 '1230':['#536e60','#c0bd90','#c6c9a0','#a58c6b'],'1231':['#394968','#c28e82','#d8c3ac','#978176']
};
export const monthendLooks=Object.fromEntries(Object.entries(palettes).map(([d,[skyTop,skyHorizon,wash]])=>[d,{skyTop,skyHorizon,wash}]));
const lookSides:Record<MonthendDay,number>={'1222':-1,'1223':1,'1224':-1,'1225':1,'1226':-1,'1227':1,'1228':-1,'1229':1,'1230':-1,'1231':1};
export const monthendEntrySide=(day:MonthendDay)=>lookSides[day];
export function buildMonthendVoyageSet(stage:Stage,b:MonthendVoyage){
 const {root,fixed,part,box,cylinder,oval,group}=workbench(stage),d=b.day,idx=Number(d)-1222,side=lookSides[d];
 root.name='voyage-'+d;
 const width=[2.50,2.87,4.86,4.93,4.41,4.53,3.89],zs=[11.46,7.99,6.48,2.03,-2.8,-8.4,-13.87];
 const border: [number,number][]=[];
 for(const s of [1,-1])for(let j=0;j<zs.length;j++){const i=s===1?j:zs.length-1-j;
   const offset=.32*Math.cos(i*(1.2+idx*.22)+s*idx);
   border.push([s*(width[i]+offset),zs[i]+(i===0||i===6?0:.34*Math.sin(i+idx+s))]);}
 const floor=new T.ShapeGeometry(new T.Shape(border.map(([x,z])=>new T.Vector2(x,-z))));floor.rotateX(-Math.PI/2);
 const uv=floor.getAttribute('uv'),pos=floor.getAttribute('position');for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+6)/12,(pos.getZ(i)+14)/26);
 const floorMap=texture(512,1024,g=>{g.fillStyle=palettes[d][3];g.fillRect(0,0,512,1024);
   for(let j=0;j<690;j++){g.fillStyle=j%2?'#efdaac40':'#544b482f';g.fillRect(j*137%510,j*271%1023,3+j%6,2);}
   g.strokeStyle='#5c534741';g.lineWidth=2;
   for(let j=0;j<25;j++){g.beginPath();g.moveTo(0,j*44);g.lineTo(512,j*44+idx%2*4);g.stroke();for(let n=0;n<7;n++)g.fillRect(n*83+j%2*38,j*44,2,41);}
   if(d==='1222'||d==='1228'){for(let x=12;x<512;x+=28)for(let y=12;y<1024;y+=28){g.fillStyle='#efe0b18c';g.fillRect(x,y,3,3);}}
   if(d==='1223'||d==='1227'){for(let j=0;j<5;j++){g.beginPath();g.strokeStyle='#e4c58d88';g.ellipse(255,481,67+j*38,161+j*81,.18*j,0,2*Math.PI);g.stroke();}}
   if(d==='1222'){
     const panes=['#e6b783','#d79677','#94adb1','#cbc894','#92b2a1','#d2ad9d'];
     for(let j=0;j<13;j++){const x=152+(j%5)*24+Math.floor(j/5)*13,y=619+j%5*13+Math.floor(j/5)*19;
       g.fillStyle=panes[j%6];g.beginPath();g.moveTo(x,y);g.lineTo(x+31,y+8);g.lineTo(x+39,y+28);g.lineTo(x+9,y+19);g.fill();}
   }
   if(d==='1229'){for(let j=0;j<8;j++){g.beginPath();g.strokeStyle='#938568';g.arc(128+j%2*241,78+j*126,17+j%3*8,0,2*Math.PI);g.stroke();}}
   if(d==='1230'){for(let i=0;i<39;i++){g.fillStyle='#705b476e';g.beginPath();g.ellipse(128+110*Math.sin(i*.48),30+i*26,8,12,.4*Math.cos(i),0,2*Math.PI);g.fill();}}
 });
 part(floor,stage.toon('#fff',{map:floorMap}),0,0,0,1,1,1,fixed,'solid-deck');
 const verts:number[]=[];for(let i=0;i<border.length;i++){const [x,z]=border[i],[u,v]=border[(i+1)%border.length];verts.push(x,0,z,u,0,v,u,-.47,v,x,0,z,u,-.47,v,x,-.47,z);}
 const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.Float32BufferAttribute(verts,3));skirt.computeVertexNormals();part(skirt,stage.toon(wood,{side:T.DoubleSide}),0,0,0,1,1,1);
 const groups:T.Group[]=[],events:((t:number,f:number)=>void)[]=[];
 const at=(x=0,y=0,z=0,scale=1,parent=root)=>{const g=group(parent);g.position.set(x,y,z);g.scale.setScalar(scale);groups.push(g);return g;};
 const tile=(o:T.Group,c:string,x:number,y:number,z:number,w:number,h:number,l:number)=>box(c,x,y,z,w,h,l,o);
 const bowl=(o:T.Group,c:string,x:number,y:number,z:number,a:number,h:number,l:number)=>oval(c,x,y,z,a,h,l,o);
 const rod=(o:T.Group,c:string,a:Vec,b:Vec,w=.047)=>{const v=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
   const m=cylinder(c,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,w,w,v.length(),o);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;};
 const ring=(o:T.Group,c:string,x:number,y:number,z:number,r:number,w=.048)=>part(new T.TorusGeometry(r,w,7,44),c,x,y,z,1,1,1,o);
 const peg=(o:T.Group,c:string,x:number,y:number,z:number,r:number,h:number)=>cylinder(c,x,y,z,r,r,h,o);
 const rock=(o:T.Group,c:string,x:number,y:number,z:number,w:number,h:number,l:number)=>part(new T.IcosahedronGeometry(1,0),c,x,y,z,w,h,l,o);
 const cone=(o:T.Group,c:string,x:number,y:number,z:number,w:number,h:number,l:number)=>part(new T.ConeGeometry(1,1,7),c,x,y,z,w,h,l,o);
 function counter(o:T.Group,w:number,h:number,l:number){tile(o,wood,0,h,0,w,.18,l);for(const x of [-1,1])for(const z of [-1,1])tile(o,wood,x*(w/2-.14),h/2-.28,z*(l/2-.14),.18,h+.60,.18);}
 function path(o:T.Group,c:string,points:Vec[],w=.035){for(let j=1;j<points.length;j++)rod(o,c,points[j-1],points[j],w);}
 const near=at(side*3.52,.02,4.35,.91);near.rotation.y=-side*.33;
 const end=at(0,.02,-11.67,1.27);
 const backdrop=at(0,-.97,-4);tile(backdrop,['#968773','#8ca5a1','#8ca18b','#9ba282','#8b8174','#757e83','#b3a38b','#a49c8d','#859274','#827576'][idx],0,0,0,66,.68,68);
 const q=(f:number)=>Math.min(1,f/1.58);
 function leaves(o:T.Group,x:number,z:number,s:number,fruit=false){rod(o,wood,[x,-.76,z],[x,2.54*s,z],.14*s);
   for(let j=0;j<7;j++){const a=j*2.39,xx=x+Math.cos(a)*.79*s,zz=z+Math.sin(a)*.67*s,y=(2.08+j%3*.43)*s;
     rod(o,wood,[x,1.53*s,z],[xx,y,zz],.074*s);rock(o,j%2?'#86a17c':'#617f65',xx,y+.18*s,zz,.92*s,.61*s,.76*s);
     if(fruit)bowl(o,red,xx+.31*s,y-.25*s,zz+.33*s,.115*s,.133*s,.105*s);}}
 function hall(o:T.Group,col:string,h:number){for(const s of [-1,1])for(let j=0;j<5;j++){const z=5.38-j*3.97;
   tile(o,col,s*5.45,h/2-.40,z,.23,h+.75,.26);if(j<4)tile(o,col,s*5.45,h,z-1.98,.24,.22,3.97);}}
 if(d==='1222'){
   hall(fixed,wood,3.45);
   function lattice(o:T.Group,n:number){
     tile(o,ink,0,1.30,0,2.98,2.60,.25);
     const palette=['#d98767','#edbf77','#96b7aa','#76a3ad','#c0a4b6','#aabe89'];
     function pane(points:[number,number][],color:string,depth:number){
       const shape=new T.Shape(points.map(([x,y])=>new T.Vector2(x,y)));
       part(new T.ShapeGeometry(shape),stage.toon(color,{side:T.DoubleSide}),0,0,depth,1,1,1,o);
       const corners=points.map(([x,y]):Vec=>[x,y,depth+.027]);path(o,brass,[...corners,corners[0]],.026);
     }
     const hub:[number,number]=[0,1.32];
     const crown:[number,number][]=[[0,2.47],[1.18,1.34],[0,.18],[-1.18,1.34]];
     for(let j=0;j<4;j++)pane([hub,crown[j],crown[(j+1)%4]],palette[(j+n)%6],.145);
     for(const sx of [-1,1])for(const sy of [-1,1]){
       const cx=sx*1.03,cy=1.32+sy*.91;
       pane([[cx-.16,cy-.16],[cx+.16,cy-.16],[cx+.16,cy+.16],[cx-.16,cy+.16]],palette[(sx+sy+5)%6],.15);
     }
     for(let j=0;j<7;j++)for(let i=0;i<7;i++)if((i+2*j)%3===0)bowl(o,cream,(i-3)*.33,1.32+(j-3)*.29,.198,.036,.036,.018);
     path(o,cream,[[-.61,.93,.215],[0,2.07,.215],[.61,.93,.215],[-.61,.93,.215]],.036);
     for(const sx of [-1,1]){tile(o,brass,sx*1.53,1.30,0,.14,2.81,.33);tile(o,brass,0,1.30+sx*1.36,0,3.18,.12,.32);}
     path(o,wood,[[-1.58,2.69,0],[-.81,2.96,0],[0,3.08,0],[.81,2.96,0],[1.58,2.69,0]],.073);
   }
   lattice(near,0);lattice(end,1);const web=at(0,.02,.224,1,end);
   for(let j=0;j<3;j++){const n=3+j,points:Vec[]=[];for(let a=0;a<=n;a++)points.push([(.48+j*.30)*Math.sin(2*Math.PI*a/n),1.29+(.43+j*.25)*Math.cos(2*Math.PI*a/n),0]);path(web,[gold,red,cream][j],points,.028);}
   for(let j=0;j<5;j++){const x=(j-2)*1.22;rod(fixed,wood,[x,-.32,-13.25],[x,3.01,-13.25],.087);ring(fixed,brass,x,3.25,-13.25,.39);}
   events.push((_,f)=>{web.scale.x=.46+.16*b.round+.16*q(f);end.rotation.x=-.22+.22*q(f);});
 }else if(d==='1223'){
   function glider(o:T.Group){
     bowl(o,cream,0,1.15,.22,.29,.25,1.33);bowl(o,blue,0,1.34,.43,.23,.14,.46);
     tile(o,cream,0,1.23,.10,4.28,.12,.62);
     for(const s of [-1,1]){
       bowl(o,'#dabf94',s*1.12,1.19,-.39,.16,.16,1.37);
       tile(o,cream,s*1.12,1.43,-1.56,.102,.54,.40);
       tile(o,red,s*1.12,1.72,-1.54,.115,.070,.39);
       tile(o,red,s*2.10,1.29,.10,.14,.026,.62);
     }
     tile(o,cream,0,1.33,-1.57,2.58,.081,.49);
     for(let i=0;i<14;i++)tile(o,brass,(i-6.5)*.285,1.301,.10,.031,.023,.60);
     peg(o,ink,0,1.16,1.54,.106,.13).rotation.x=Math.PI/2;
     const blade=tile(o,wood,0,1.16,1.63,.085,.72,.045);blade.rotation.z=.52;
   }
   const mount=at(0,0,0,1,near);peg(mount,wood,0,.12,0,.41,.24);rod(mount,brass,[0,.22,0],[0,1.02,0],.075);glider(near);near.scale.setScalar(1.11);near.position.x=3.18;near.rotation.y=-.43;near.rotation.x=.16;
   for(let j=0;j<11;j++){const s=j%2?1:-1;rock(fixed,'#c7d4cc',s*(8+j%3*2.21),2.70+j%4*1.09,-3-j*2.28,2.1,.61,1.30);}
   bowl(end,blue,0,1.46,0,1.10,1.10,1.10);for(let j=0;j<11;j++){const a=j*2.4,lat=Math.sin(j*.9)*.65;
     rock(end,leaf,Math.cos(a)*Math.sqrt(1-lat*lat)*1.03,1.46+lat,Math.sin(a)*Math.sqrt(1-lat*lat)*1.03,.28,.18,.16);}
   const flight:Vec[]=[];for(let j=0;j<=80;j++){const a=j*Math.PI/40,x=1.12*Math.cos(a),y=.44*Math.sin(a),z=1.03*Math.sin(a);flight.push([x,1.46+y,z]);}
   path(end,red,flight,.055);for(let j=0;j<flight.length-1;j+=10){const [x,y,z]=flight[j];bowl(end,gold,x,y,z,.088,.088,.088);}
   ring(end,brass,0,1.46,0,1.38,.067).rotation.z=.28;peg(end,wood,0,.17,0,.73,.32);
   const orbit=at(0,1.46,0,1,end);ring(orbit,gold,0,0,0,1.17,.024).rotation.x=1.23;const plane=at(1.15,-.22,0,.32,orbit);glider(plane);
   events.push((t,f)=>{orbit.rotation.y=.23+b.round*.31+q(f)*2.75;near.rotation.z=.034*Math.sin(t*1.31);});
 }else if(d==='1224'){
   for(let j=0;j<16;j++)leaves(fixed,(j%2?1:-1)*(6.01+j%3*.91),6.16-j*1.65,.85+j%4*.15);
   const stamp=(o:T.Group,n:number)=>{if(n===0){for(let j=0;j<5;j++)rock(o,leaf,(j-2)*.19,.13*Math.sin(j),0,.22,.086,.035);}
    if(n===1){for(let j=0;j<4;j++)bowl(o,cream,(j-1.5)*.19,.14*(j%2),0,.23,.15,.055);}
    if(n===2)for(let j=0;j<6;j++)bowl(o,gold,(j-2.5)*.17,.22*Math.cos(j),0,.051,.051,.042);};
   counter(near,2.66,.75,1.35);tile(near,leaf,0,1.92,-.36,2.76,.26,1.55);for(const x of [-1.16,1.16])tile(near,wood,x,1.34,-.31,.14,1.26,.14);
   for(let j=0;j<3;j++){const p=at(-.78+j*.78,1.10,.05,.57,near);tile(p,cream,0,0,0,1.24,.76,.10);const q=at(0,.04,.078,.83,p);stamp(q,j);}
   counter(end,3.86,.61,1.29);const letter=at(0,1.64,0,1,end);tile(letter,'#ddd0aa',0,0,0,3.42,1.89,.15);
   path(letter,wood,[[-1.52,.75,.10],[0,-.26,.10],[1.52,.75,.10]],.032);
   for(let j=0;j<3;j++){const p=at((j-1)*.95,.21,.122,.72,letter);tile(p,[cream,blue,slate][j],0,0,0,1.20,.93,.042);const over=at(0,0,.039,1,p);stamp(over,j);}
   events.push((_,f)=>{letter.rotation.x=-.88+.69*q(f);letter.position.y=1.17+.13*b.round+.16*q(f);});
 }else if(d==='1225'){
   for(let j=0;j<12;j++)leaves(fixed,(j%2?1:-1)*(6.47+j%3*1.41),6.46-j*2.06,.82+j%3*.25,true);
   const ray=['#bf664d','#d98b52','#e3ba65','#a4b773','#74aaa2','#6c93b3','#9687a8'];
   function optics(o:T.Group){
     counter(o,4.22,.77,1.53);
     tile(o,ink,-1.63,1.17,0,.42,.70,.52);ring(o,brass,-1.385,1.24,0,.163,.028).rotation.y=Math.PI/2;
     bowl(o,gold,-1.40,1.24,0,.09,.10,.09);
     // A triangular end face looks back towards the visitor. Its three thick edges make the glass legible from the aisle.
     const prism=at(-.34,1.40,0,1,o);
     const triangle=new T.Shape([new T.Vector2(0,.57),new T.Vector2(.493,-.285),new T.Vector2(-.493,-.285)]);
     part(new T.ExtrudeGeometry(triangle,{depth:.55,bevelEnabled:false}),'#9ec6c6',0,0,-.275,1,1,1,prism);
     for(const z of [-.29,.29])path(prism,cream,[[0,.57,z],[.493,-.285,z],[-.493,-.285,z],[0,.57,z]],.022);
     for(const [x,y] of [[0,.57],[.493,-.285],[-.493,-.285]])rod(prism,blue,[x,y,-.29],[x,y,.29],.027);
     rod(o,cream,[-1.37,1.25,0],[-.72,1.25,0],.045);
     const strip=at(0,0,0,1,o);for(let j=0;j<7;j++){
       const y=1.32+(j-3)*.121,z=(j-3)*.111;rod(strip,ray[j],[.045,1.26,.03],[1.47,y,z],.052);
       tile(strip,ray[j],1.48,y+.02,z,.18,.104,.122);
     }
     return {prism,strip};
   }
   const input=optics(near),bright=optics(end);near.scale.setScalar(1.03);near.position.x=3.37;near.rotation.y=.16;
   const screen=at(1.64,1.35,0,1,end);tile(screen,cream,0,0,0,.12,1.36,1.45);
   for(let k=0;k<4;k++)bowl(near,red,-1.26-(k%2)*.28,.96+Math.floor(k/2)*.17,.49-(k%2)*.17,.115,.123,.12);
   events.push((_,f)=>{input.prism.rotation.y=.12+b.wave*.23;bright.prism.rotation.y=.13+.08*b.round;
     bright.strip.scale.y=.82+.06*b.round+.04*q(f);screen.position.x=1.74-q(f)*.18;});
 }else if(d==='1226'){
   hall(fixed,wood,3.08);
   function gear(o:T.Group,r:number){ring(o,brass,0,0,0,r,.095);peg(o,wood,0,0,0,.133,.20).rotation.x=Math.PI/2;
    for(let j=0;j<16;j++){const a=j*Math.PI/8;tile(o,brass,r*Math.cos(a),r*Math.sin(a),0,.14,.13,.21).rotation.z=a;
      if(j%3===0)rod(o,brass,[0,0,0],[r*.93*Math.cos(a),r*.93*Math.sin(a),0],.043);}}
   function engine(o:T.Group){counter(o,3.52,.55,1.57);
     for(const x of [-1.44,1.44]){tile(o,ink,x,1.47,-.23,.19,1.80,.29);tile(o,brass,x,2.43,-.19,.34,.14,.44);}
     tile(o,ink,0,2.56,-.23,3.26,.16,.35);
     const wheels:T.Group[]=[];for(let i=0;i<3;i++){const g=at((i-1)*.94,1.57,.10+(i%2)*.21,.82,o);gear(g,.51);wheels.push(g);}
     return wheels;}
   const wheels=engine(near),out=engine(end);const slip=at(.04,.92,.76,1,end);tile(slip,cream,0,-.32,0,.93,.64,.051);
   for(let j=0;j<3;j++)for(let n=0;n<4;n++)tile(slip,ink,(n-1.5)*.16,-.14-j*.16,.037,.051,.079,.020);
   events.push((_,f)=>{[...wheels,...out].forEach((v,i)=>v.rotation.z=(i%2?-1:1)*(b.round*.63+b.steps*.24+q(f)*2.23));slip.scale.y=.27+.13*b.round+.49*q(f);});
 }else if(d==='1227'){
   for(let j=0;j<140;j++)bowl(fixed,j%3?cream:gold,j*79%85-42,1+(j*37%20),-19-j%17,.039+j%3*.017,.047,.049);
   function orrery(o:T.Group){
     peg(o,wood,0,.18,0,.83,.36);peg(o,brass,0,.50,0,.19,.56);
     const dial=at(0,1.16,0,1,o);dial.rotation.x=.69;
     const casing=peg(dial,ink,0,-.046,0,1.51,.20);casing.scale.z=.76;
     const rim=ring(dial,brass,0,.082,0,1.43,.055);rim.rotation.x=Math.PI/2;rim.scale.y=.76;
     const ellipse=ring(dial,cream,0,.109,0,1.19,.032);ellipse.rotation.x=Math.PI/2;ellipse.scale.y=.69;
     for(let j=0;j<40;j++){const t=j*Math.PI/20,x=1.36*Math.cos(t),z=.99*Math.sin(t);
       rod(dial,j%5===0?gold:'#809da1',[x,.088,z],[x*(j%5?.97:.92),.091,z*(j%5?.97:.92)],j%5?.017:.024);}
     const focus=-.67;
     bowl(dial,gold,focus,.19,0,.15,.14,.15);bowl(dial,brass,-focus,.14,0,.048,.043,.048);
     const arm=at(focus,.185,0,1,dial);rod(arm,red,[0,0,0],[1,0,0],.036);const planet=at(0,.203,0,1,dial);bowl(planet,blue,0,0,0,.135,.130,.135);
     return {dial,place(t:number){const x=1.19*Math.cos(t),z=.82*Math.sin(t);arm.rotation.y=-Math.atan2(z,x-focus);arm.scale.x=Math.hypot(x-focus,z);planet.position.set(x,.203,z);}};
   }
   const a=orrery(near),whole=orrery(end);near.scale.setScalar(1.08);
   for(let j=0;j<3;j++){const g=at(0,.128+j*.013,0,1,whole.dial);const fan=new T.Shape();fan.moveTo(-.67,0);
     for(let i=0;i<=18;i++){const t=j*1.99-.30+i*[.040,.060,.070][j];fan.lineTo(1.19*Math.cos(t),-.82*Math.sin(t));}fan.closePath();
     const face=part(new T.ShapeGeometry(fan),stage.toon([brass,red,blue][j],{side:T.DoubleSide}),0,0,0,1,1,1,g);face.rotation.x=-Math.PI/2;events.push((_,f)=>g.visible=b.round>j||f>0);}
   for(const s of [-1,1])for(let j=0;j<3;j++){const z=4.55-j*5.78;
     tile(fixed,slate,s*5.36,.28,z,.36,1.82,.42);const arc=ring(fixed,brass,s*5.36,1.64,z,.57,.035);arc.rotation.y=-s*.36;}
   events.push((t,f)=>{a.place(t*.71);whole.place(.27+b.round*1.27+q(f)*2.71);});
 }else if(d==='1228'){
   const penguin=(o:T.Group)=>{bowl(o,ink,0,.74,0,.51,.71,.31);bowl(o,cream,.02,.64,.238,.36,.46,.10);bowl(o,ink,0,1.43,0,.40,.42,.32);
     for(const s of [-1,1]){bowl(o,cream,s*.15,1.48,.26,.097,.12,.064);bowl(o,ink,s*.15,1.50,.313,.041,.048,.024);
       bowl(o,ink,s*.49,.84,0,.15,.43,.16).rotation.z=s*.28;bowl(o,gold,s*.26,.16,.12,.25,.13,.24);}
     cone(o,gold,.02,1.34,.328,.127,.29,.12).rotation.x=1.27;};
   hall(fixed,leaf,2.79);counter(near,2.63,.62,1.53);const mascot=at(-.46,.76,.04,.88,near);penguin(mascot);
   for(let j=0;j<3;j++){const x=.45+j*.13;tile(near,[blue,cream,gold][j],x,.79+j*.12,.05,.50,.10,.48);bowl(near,leaf,x+.23,.8+j*.12,.05,.094,.052,.095);}
   tile(end,wood,0,.79,0,3.62,1.58,1.39);tile(end,leaf,0,2.17,-.41,3.74,2.43,.22);
   const portrait=at(0,1.48,.05,1.24,end);penguin(portrait);
   const shutters=[-1,1].map(s=>{const g=at(s*.90,2.23,.62,1,end);tile(g,brass,0,0,0,.89,1.80,.11);for(let i=0;i<5;i++)tile(g,wood,0,(i-2)*.31,.079,.72,.045,.028);return g;});
   events.push((_,f)=>{shutters.forEach((o,j)=>o.position.x=(j?1:-1)*(.66+.14*b.round+.49*q(f)));portrait.position.y=1.43+.15*q(f);});
 }else if(d==='1229'){
   hall(fixed,slate,3.20);function mold(o:T.Group){counter(o,2.90,.69,1.48);for(const x of [-1.12,1.12]){peg(o,brass,x,1.41,0,.095,1.45);}
     tile(o,ink,0,2.19,0,2.67,.22,.57);peg(o,brass,0,1.85,0,.12,.53);const block=at(0,1.29,0,1,o);peg(block,'#695f53',0,0,0,.51,.38);peg(o,red,0,.83,0,.57,.14);return block;}
   const press=mold(near);counter(end,3.78,.63,1.59);const tray=at(0,1.25,0,1,end);tile(tray,wood,0,0,0,3.54,1.39,.20);
   for(let j=0;j<3;j++){const x=(j-1)*1.02;bowl(tray,j%2?slate:'#776251',x,.03,.16,.42,.46,.051);for(let k=0;k<=j;k++)ring(tray,cream,x,.03,.227,.17+k*.074,.019);}
   events.push((_,f)=>{press.position.y=1.32-b.displacement*.27;tray.rotation.x=-1.12+.94*q(f);});
 }else if(d==='1230'){
   for(let j=0;j<20;j++)leaves(fixed,(j%2?1:-1)*(5.93+j%3*1.14),6.73-j*1.15,.91+j%3*.28);
   function book(o:T.Group){for(const s of [-1,1]){const page=tile(o,cream,s*.85,.61,0,1.69,.22,1.87);page.rotation.z=s*.08;const cover=tile(o,wood,s*.87,.44,0,1.76,.12,1.99);cover.rotation.z=s*.08;}
     for(let j=0;j<6;j++)ring(o,brass,0,.64,(j-2.5)*.29,.127,.031).rotation.y=Math.PI/2;}
   book(near);book(end);const cut=at(0,.72,0,1,end);
   for(let j=0;j<6;j++){const x=(j-2.5)*.48;rod(cut,wood,[x,0,-.26],[x,.91+j%2*.25,-.26],.063);
     for(let h=0;h<3;h++)rock(cut,j%2?leaf:'#869276',x+(h-1)*.19,1.07+j%2*.25,-.26,.31,.23,.11);}
   const cat=at(-.65,.82,.37,.74,end);bowl(cat,ink,0,.26,0,.45,.18,.10);bowl(cat,ink,.37,.42,0,.19,.20,.11);
   for(const x of [-.26,.26])rod(cat,ink,[x,.24,0],[x-.09,0,0],.046);for(const x of [.27,.43])cone(cat,ink,x,.61,0,.068,.17,.054);
   path(cat,ink,[[-.37,.28,0],[-.66,.42,0],[-.71,.62,0],[-.56,.70,0]],.046);
   for(let j=0;j<8;j++)bowl(near,ink,(j-3.5)*.26,.757,.13*Math.cos(j),.096,.013,.073);
   events.push((_,f)=>{cut.scale.y=.29+.16*b.round+.22*q(f);cat.position.x=-.74+q(f)*1.41;});
 }else{
   function shop(o:T.Group,number:number){tile(o,number%2?'#a47964':'#998572',0,.94,0,2.04,1.88,1.46);
     for(const s of [-1,1])tile(o,ink,s*.55,2.02,0,1.22,.16,1.80).rotation.z=-s*.30;
     tile(o,wood,0,.72,.774,.54,1.37,.12);for(const s of [-1,1]){tile(o,cream,s*.71,1.02,.79,.53,.72,.15);tile(o,ink,s*.71,1.03,.883,.40,.59,.031);
        tile(o,brass,s*.71,1.03,.913,.036,.59,.022);}
     tile(o,leaf,0,1.64,.87,2.11,.14,.54);}
   for(let j=0;j<10;j++){const s=j%2?1:-1;const g=at(s*(6.26+j%3*.35),-.45,5.90-Math.floor(j/2)*4.24,1.26);g.rotation.y=-s*.62;shop(g,j);}
   shop(near,0);for(let j=0;j<3;j++){const g=at((j-1)*1.76,.04,j%2*-.33,.79,end);shop(g,j+1);
     const lights=at(0,1.59,1.17,1,g);for(let n=0;n<7;n++)bowl(lights,gold,(n-3)*.24,-.21+.016*(n-3)**2,0,.071,.091,.061);
     events.push((_,f)=>lights.visible=b.round>j||f>j*.22);}
   const span=at(0,2.37,-.12,1,end);const nodes:Vec[]=[];for(let j=0;j<=16;j++){const x=(j-8)*.25;nodes.push([x,-.38+.10*x*x,0]);bowl(span,gold,x,-.49+.10*x*x,0,.061,.09,.061);}
   path(span,ink,nodes,.022);events.push((_,f)=>span.scale.x=.18+.13*b.round+.43*q(f));
 }
 // Quiet, low-profile work surfaces beside the walking line show exactly what the current gesture did.
 for(let i=0;i<3;i++){
   const z=.15-i*3.02,s=b.initialSide*(i%2?-1:1),station=at(-s*2.71,.025,z-.83,.73);
   const clamps=at(s*2.83,.025,z-.79,.70);peg(clamps,brass,0,.045,0,.35,.087);
   const piece=at(0,.16,.02,1,station);
   if(d==='1222'){
     tile(station,wood,0,.085,0,1.39,.17,.68);for(const x of [-.55,0,.55])peg(station,brass,x,.28,0,.053,.37);
     path(piece,gold,[[-.55,0,0],[0,.40,-.02],[.55,0,0]],.030);ring(clamps,brass,0,.29,0,.16);
   }else if(d==='1223'){
     rod(station,wood,[0,-.02,0],[0,.97,0],.074);piece.position.y=.83;tile(piece,red,.32,0,0,.61,.16,.055);
     bowl(clamps,blue,0,.31,0,.24,.24,.24);ring(clamps,brass,0,.31,0,.29,.021).rotation.x=1.13;
   }else if(d==='1224'){
     tile(station,wood,0,.19,0,1.08,.38,.68);tile(piece,cream,0,.27,0,.80,.055,.51);
     for(let n=0;n<=i;n++)peg(piece,[leaf,blue,brass][i],(n-i/2)*.20,.32,0,.087,.045);
     peg(clamps,red,0,.17,0,.19,.23);bowl(clamps,wood,0,.35,0,.15,.15,.14);
   }else if(d==='1225'){
     tile(station,ink,0,.1,0,1.47,.20,.60);part(new T.CylinderGeometry(.23,.23,.44,3),blue,-.32,.41,0,1,1,1,station);
     rod(piece,[red,leaf,blue][i],[-.24,.24,0],[.72,.34,0],.035);tile(clamps,cream,0,.40,0,.59,.62,.12);
   }else if(d==='1226'){
     tile(station,wood,0,.15,0,1.21,.30,.67);ring(piece,brass,0,.43,0,.35,.065);
     for(let n=0;n<9;n++){const a=n*Math.PI*2/9;tile(piece,brass,.35*Math.cos(a),.43+.35*Math.sin(a),0,.09,.12,.13).rotation.z=a;}
     peg(clamps,ink,0,.22,0,.19,.29);
   }else if(d==='1227'){
     peg(station,slate,0,.085,0,.67,.17);const edge=ring(station,brass,0,.19,0,.52,.024);edge.rotation.x=Math.PI/2;edge.scale.y=.65;
     rod(piece,gold,[-.20,.06,0],[.50,.06,0],.033);bowl(piece,blue,.52,.06,0,.107,.107,.107);
     bowl(clamps,gold,0,.20,0,.13,.13,.13);
   }else if(d==='1228'){
     tile(station,wood,0,.07,0,1.25,.14,.67);tile(piece,[cream,ink,gold][i],0,.09,0,.53,.11,.41);
     bowl(piece,[cream,ink,gold][i],.26,.09,0,.12,.052,.12);tile(clamps,leaf,0,.18,0,.60,.16,.41);
   }else if(d==='1229'){
     tile(station,slate,0,.13,0,1.22,.26,.69);bowl(piece,i%2?blue:wood,0,.19,0,.39,.23,.25);
     for(let n=0;n<=i;n++)ring(clamps,cream,0,.114+n*.03,0,.14+n*.061,.023).rotation.x=Math.PI/2;
   }else if(d==='1230'){
     for(let n=0;n<3;n++){bowl(station,wood,(n-1)*.32,.063,.14*(n%2),.14,.036,.12);
       for(let a=0;a<3;a++)bowl(piece,ink,(n-1)*.32+(a-1)*.070,-.06,.14*(n%2)-.13,.041,.021,.053);}
     tile(clamps,cream,0,.18,0,.64,.09,.49).rotation.z=.11;
   }else{
     tile(station,wood,0,.12,0,1.10,.24,.67);rod(station,ink,[-.41,.24,0],[-.41,.91,0],.050);rod(station,ink,[-.41,.91,0],[.19,.91,0],.045);
     piece.position.y=.71;bowl(piece,gold,.13,0,0,.13,.17,.13);ring(clamps,brass,0,.33,0,.19);
   }
   events.push((t,f)=>{
     const active=b.round===i&&b.engaged,amount=b.round>i||f>0?1:active?b.fill||b.displacement:0;
     if(d==='1222'||d==='1225')piece.scale.x=.12+.88*amount;
     else if(d==='1223')piece.rotation.z=active?Math.sin(t*1.19)*.28:0;
     else if(d==='1226'||d==='1227'||d==='1228')piece.rotation.y=amount*1.65;
     else if(d==='1229')piece.scale.y=1-.47*amount;
     else if(d==='1231')piece.scale.setScalar(.46+.54*amount);
     else piece.position.y=.16+.11*amount;
   });
 }
 for(const z of [7.6,2.6,-3.4,-8.4,-12.1])for(const s of [-1,1]){
   tile(fixed,idx===2||idx===8?leaf:wood,s*(z>7?1.84:3.31),-.57,z,.30,.62,.41);
 }
 const marker=at();ring(marker,gold,0,.086,0,.78,.054).rotation.x=-Math.PI/2;
 const branches=b.layout.branches.map(([x,,z],i)=>{const o=at(x,.080,z);ring(o,i?brass:'#9dc6ac',0,0,0,.80,.056).rotation.x=-Math.PI/2;return o;});
 const world=bakeDesk(stage,root);world.bounds={min:[-6.15,-2,-12.75],max:[6.15,12,11.4]};
 [fixed,...groups].forEach(batch);
 return {world,update(t:number,f:number){const p=b.phase==='warmup'?b.layout.warm:b.phase==='finale'?b.layout.end:b.nextSpot;
   marker.position.set(p[0],0,p[2]);marker.visible=b.phase!=='route'&&b.phase!=='curtain';branches.forEach(o=>o.visible=b.phase==='route');events.forEach(fn=>fn(t,f));}};
}
