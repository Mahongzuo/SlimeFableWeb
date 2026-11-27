import * as T from 'three';
import type {Stage} from '../level/stage';
import type {MidwinterDay,MidwinterVoyage} from '../templates/midwinter-voyage';
import {batch,bakeDesk,texture,workbench} from './jan01-chapter';
export const midwinterLooks:Record<MidwinterDay,{skyTop:string;skyHorizon:string;wash:string}>={
 '1212':{skyTop:'#132842',skyHorizon:'#8a9ca7',wash:'#c6c9c2'},
 '1213':{skyTop:'#17293c',skyHorizon:'#546170',wash:'#c5bab1'},
 '1214':{skyTop:'#425367',skyHorizon:'#bba99e',wash:'#d5c8b9'},
 '1215':{skyTop:'#84664f',skyHorizon:'#dcba83',wash:'#e1cbb1'},
 '1216':{skyTop:'#4f5963',skyHorizon:'#b9ada0',wash:'#d5c6ab'}
};
const floorTones=['#607f87','#988b82','#807b84','#a08869','#967e64'];
export function buildMidwinterVoyageSet(stage:Stage,b:MidwinterVoyage){
 const {root,fixed,part,box,cylinder,oval,group}=workbench(stage),day=b.day;
 root.name='voyage-'+day;
 const cream='#e9e0c7',blue='#658f9f',ink='#334855',brass='#cf9c5b',orange='#cc7d4e',gold='#ffda81',wood='#88684f';
 const surface=texture(512,1024,g=>{g.fillStyle=floorTones[Number(day)-1212];g.fillRect(0,0,512,1024);
   for(let i=0;i<850;i++){const x=i*181%512,y=i*173%1024;g.fillStyle=i%3?'#e4d8ac30':'#413f452e';g.fillRect(x,y,day==='1213'?2+i%5:4,2);}
   if(day==='1212'){
     g.fillStyle='#557982';g.fillRect(0,0,512,1024);
     for(let j=0;j<38;j++){const y=j*29;g.fillStyle='#263f4a';g.fillRect(0,y,512,2);g.fillStyle='#bed0ba77';
       for(let i=0;i<12;i++)g.fillRect(14+i*47,y+4,2,2);}
     for(const x of [93,414]){g.fillStyle='#dfad68';g.fillRect(x,0,4,1024);}
   }else if(day==='1214'){
     g.fillStyle='#76594a';g.fillRect(0,0,512,1024);
     for(let row=0;row<12;row++){g.fillStyle='#55453b';g.fillRect(row*45,0,2,1024);
       for(let i=0;i<26;i++){const y=(i*157+row*37)%1024;g.fillStyle='#b99a72a0';g.fillRect(row*45+5+i%12,y,9+i%11,1);}}
     g.fillStyle='#c8a05e';g.fillRect(78,0,8,1024);for(let n=0;n<90;n++)g.fillRect(83,n*12,n%5?7:14,2);
   }else if(day!=='1213')for(let j=0;j<24;j++){g.fillStyle='#413f474f';g.fillRect(0,j*46,512,2);for(let i=0;i<5;i++)g.fillRect(i*115+j%2*42,j*46,2,44);}
   for(let i=0;i<3;i++){const y=460+i*118;g.strokeStyle=day==='1213'?'#dec49e':'#dcc38f';g.lineWidth=3;g.beginPath();g.moveTo(150,y);
     if(day==='1216')g.quadraticCurveTo(256,y+125,362,y);else g.lineTo(362,y);g.stroke();}
 });
 const mat=stage.toon('#fff',{map:surface});
 if(day==='1212'||day==='1214'){
   const outline:number[][]=day==='1212'?[[-2.51,11.6],[2.51,11.6],[2.51,7.04],[4.5,5.8],[4.5,1.35],[5.76,.21],[5.76,-6.62],[4.08,-8.21],[4.08,-12.78],[3.25,-13.8],[-3.25,-13.8],[-4.18,-12.78],[-4.18,-9.25],[-5.8,-7.79],[-5.8,4.89],[-3.91,6.85],[-2.51,7.4]]
    :[[-3.12,11.67],[3.35,11.67],[3.84,11.17],[3.84,7.21],[5.55,7.21],[5.55,-7.7],[4.73,-8.44],[4.73,-13.52],[-5.63,-13.52],[-5.63,-2.82],[-6.04,-2.38],[-6.04,7.12],[-3.69,7.12],[-3.69,11.15]];
   const geom=new T.ShapeGeometry(new T.Shape(outline.map(([x,z])=>new T.Vector2(x,-z))));geom.rotateX(-Math.PI/2);
   const xyz=geom.getAttribute('position'),uv=geom.getAttribute('uv');for(let n=0;n<xyz.count;n++)uv.setXY(n,(xyz.getX(n)+6.5)/13,(xyz.getZ(n)+13.8)/26);
   part(geom,mat,0,0,0,1,1,1,fixed,'solid-deck');
   const sides:number[]=[],depth=day==='1212'?.51:.34;
   for(let i=0;i<outline.length;i++){const [x,z]=outline[i],[u,v]=outline[(i+1)%outline.length];sides.push(x,0,z,u,0,v,u,-depth,v,x,0,z,u,-depth,v,x,-depth,z);}
   const sideGeo=new T.BufferGeometry();sideGeo.setAttribute('position',new T.Float32BufferAttribute(sides,3));sideGeo.computeVertexNormals();
   part(sideGeo,stage.toon(day==='1212'?ink:wood,{side:T.DoubleSide}),0,0,0,1,1,1);
 }else box(mat,0,-.21,-.8,13,.42,26,fixed,'solid-deck');
 const objects:T.Group[]=[],effects:((t:number,f:number)=>void)[]=[];
 const move=(x=0,y=0,z=0)=>{const o=group();o.position.set(x,y,z);objects.push(o);return o;};
 const blank=(c:string,x:number,y:number,z:number,r:number,o:T.Group=fixed,w=.062)=>part(new T.TorusGeometry(r,w,8,44),c,x,y,z,1,1,1,o);
 function rod(c:string,a:number[],z:number[],r:number,o:T.Group=fixed){const v=new T.Vector3(z[0]-a[0],z[1]-a[1],z[2]-a[2]);
   const m=cylinder(c,(a[0]+z[0])/2,(a[1]+z[1])/2,(a[2]+z[2])/2,r,r,v.length(),o);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
 const hill=(c:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,o:T.Group=fixed)=>part(new T.IcosahedronGeometry(1,0),c,x,y,z,sx,sy,sz,o);
 const stars=()=>{for(let i=0;i<110;i++)oval(i%5?cream:gold,(i*67%75)-37,1+i*37%22,-25-i%17,.041,.041,.041);};
 if(day==='1212'){
   stars();box('#527f89',0,-1.28,-5,100,.44,97);
   // The scanner sits on the widened port side. Its counterweight, yoke and aperture read from the gangway.
   const mx=-4.2,mz=3.67;cylinder(ink,mx,.16,mz,1.05,1.16,.31);cylinder(brass,mx,.37,mz,.77,.88,.13);
   for(const zz of [-.59,.59]){rod(cream,[mx-.54,.41,mz+zz],[mx,1.91,mz+zz],.16);rod(cream,[mx+.57,.41,mz+zz],[mx,1.91,mz+zz],.14);}
   const barrel=move(mx,1.91,mz);rod(ink,[-.09,0,-.73],[-.09,0,.73],.19,barrel);
   rod(blue,[-.88,-.03,0],[.82,.19,0],.39,barrel);rod(cream,[.34,.13,0],[1.34,.34,0],.45,barrel);
   const collar=rod(ink,[1.29,.33,0],[1.46,.37,0],.49,barrel);collar.name='scanner-aperture';
   rod('#829fa6',[1.46,.37,0],[1.49,.38,0],.37,barrel);box(ink,-.97,-.25,0,.64,.64,.69,barrel);
   effects.push((t)=>{barrel.rotation.z=.40+.22*(b.engaged?b.fill:Math.sin(t*.34)*.5);});
   for(const [x,z] of [[-2.01,8.0],[2.03,7.9],[3.86,3.83],[-3.65,-8.6]]){
     cylinder(ink,x,.19,z,.16,.22,.38);box(cream,x,.40,z,.61,.12,.17);
     for(let i=0;i<4;i++){const coil=blank('#ba9661',x-.32,.056+i*.046,z+.48,.25+i*.008,fixed,.026);coil.rotation.x=Math.PI/2;}
   }
   for(const [x,z] of [[-2.24,8.68],[2.22,8.68],[-5.39,1.82],[4.14,2.47],[-5.36,-5.26],[5.38,-5.26],[-3.61,-11.1],[3.59,-11.1]]){
     cylinder(ink,x,-.97,z,.15,.22,1.23);rod('#ac835d',[x,-.90,z],[x*.83,-.40,z+1.10],.096);
   }
   for(let j=0;j<3;j++){const x=-7.7+j%2*1.35,z=-9.7-j*2.8;oval(ink,x,-.97,z,.21,.18,.29);cylinder(orange,x,-.58,z,.16,.24,.62);
      cylinder(cream,x,-.17,z,.067,.08,.24);}
   box(blue,4.48,.61,-4.70,1.25,1.22,2.14);box(cream,4.48,1.28,-4.70,1.48,.14,2.36);
   for(const dz of [-.53,0,.53])box('#364d5b',3.831,.84,-4.70+dz,.047,.45,.38);
   for(let j=0;j<96;j++){const x=j*67%65-32,z=12-j*19%43;if(Math.abs(x)>7||z<-14)box('#a9bfb8',x,-.874,z,.48+j%5*.29,.022,.046);}
   for(const [x,front,rear] of [[-5.64,4.18,-6.4],[5.54,.05,-6.12],[4.25,5.33,1.55],[-3.92,-9.62,-12.36]]){
     const n=Math.ceil((front-rear)/1.73);for(let j=0;j<=n;j++){const z=front+(rear-front)*j/n;cylinder(ink,x,.42,z,.041,.059,.84);}
     rod(cream,[x,.83,front],[x,.83,rear],.038);rod(blue,[x,.45,front],[x,.45,rear],.026);
   }
   const scope=move(-2.35,1.73,-11.63);cylinder(blue,-2.35,.71,-11.63,.44,.67,1.38);
   rod(cream,[-.81,-.18,0],[.71,.34,0],.36,scope);oval(ink,.76,.38,0,.18,.32,.32,scope);
   const chart=move(.72,2.01,-12.45);box(ink,0,0,0,3.84,2.85,.14,chart);box(blue,0,0,.091,3.54,2.55,.035,chart);
   for(let i=0;i<30;i++)oval(cream,i*41%32/10-1.58,i*13%22/10-1.02,.126,.033,.033,.015,chart);
   for(let j=0;j<3;j++){const v=move(-.31+j*.92,1.73+(j%2)*.70,-12.28);blank(gold,0,0,0,.24,v,.045);effects.push((_,f)=>{v.visible=b.round>j||f>.12+j*.21;v.scale.setScalar(1+Math.min(1,f)*.29);});}
   const ribbon=move(.72,.95,-12.15);box(cream,0,-.53,0,2.52,1.06,.065,ribbon);
   for(let i=0;i<16;i++)oval(ink,-1.07+(i*17%22)*.098,-.16-(i*11%15)*.046,.045,.027,.027,.012,ribbon);
   effects.push((_,f)=>{ribbon.visible=f>0;ribbon.scale.y=Math.max(.001,Math.min(1,f/1.42));});
   for(let j=0;j<3;j++){const l=.24+j*.6;rod('#9cb5ab',[-1.31+j*.7,-.52+l*.6,.12],[-.83+j*.7,-.14+l*.35,.12],.013,chart);}
   const scan=move(-.76,2.10,-12.27);box('#b5d3c8',0,0,0,.031,2.17,.038,scan);
   effects.push((t,f)=>{scope.rotation.y=.21+.48*Math.sin(t*.86);scan.visible=f===0;scan.position.x=-.90+3.29*(b.engaged?b.fill:.5+.48*Math.sin(t*.55));});
 }else if(day==='1213'){
   stars();box('#786f67',0,-1.05,-10,95,.72,90);
   for(let i=0;i<58;i++){const s=i%2?1:-1,x=s*(8.3+i*7%17),z=8-i*11%39;hill(i%4?'#897b70':'#9d8571',x,-.35,z,1.6+i%3,1+i%5*.82,2.15+i%4);}
   for(let i=0;i<28;i++){const s=i%2?1:-1;hill('#776e68',s*(4.9+i%3*.32),.06,8-i*.72,.18+i%4*.15,.11+i%3*.09,.29);}
   const tray=move(0,.83,-11.5);box(ink,0,0,0,4.52,.29,1.89,tray);
   for(let j=0;j<3;j++){const x=(j-1)*1.38;box('#9a8a70',x,.19,0,1.24,.14,1.54,tray);
     for(let i=0;i<7;i++){const xx=x+((i*13%9)-4)*.105,zz=((i*7%11)-5)*.10;
       if(j===2)oval(i%2?'#a84e29':'#c76a36',xx,.37,zz,.116,.11,.116,tray);else hill(j?'#8e8174':'#9e978a',xx,.32,zz,.15,.09,.12,tray);}}
   for(const x of [-2.01,2.01])rod(ink,[x,0,-11.55],[x,.69,-11.55],.13);
   const lid=move(0,1.15,-12.39);box(cream,0,.05,.91,4.37,.10,1.82,lid);
   for(let j=0;j<3;j++)box(blue,(j-1)*1.36,.113,.92,1.08,.016,1.32,lid);
   for(let j=0;j<3;j++){const x=(j-1)*1.36;box(brass,x,-.014,1.01,.89,.023,.53,lid);
     for(let n=0;n<=j;n++)oval(ink,x+(n-j/2)*.19,-.034,1.01,.061,.017,.071,lid);}
   effects.push((_,f)=>lid.rotation.x=-Math.min(1,f/1.49)*1.62);
 }else if(day==='1214'){
   box('#6f6358',0,-1.96,-5,55,.74,58);
   for(const s of [-1,1])for(const zz of [6.35,.1,-6.2,-11.9]){
     const xx=s*3.24;box(wood,xx,-.93,zz,.30,1.30,.40);rod(brass,[xx,-1.11,zz],[xx-s*.86,-.31,zz-.52],.052);}
   for(const s of [-1,1])for(let j=0;j<4;j++){const x=s*8.8,z=5.65-j*5.78;box('#876f5d',x,1.60,z,.39,6.32,5.73);
     box(wood,x-s*.25,3.84,z,.12,1.25,4.06);box('#a4aca0',x-s*.34,3.83,z,.048,1.03,3.77);
     for(const dz of [-.88,.88])box(wood,x-s*.39,3.83,z+dz,.055,1.08,.085);}
   for(let j=0;j<4;j++){const z=5.7-j*5.78;box('#73604f',0,4.85,z,17.9,.29,.31);}
   // The continuous optical rail is read along the left edge of the worktop from the entrance.
   const rx=-4.15;box(ink,rx,.13,3.05,1.50,.25,6.92);
   for(const xx of [rx-.48,rx+.48])rod(brass,[xx,.32,6.31],[xx,.32,-.37],.046);
   const source=move(rx,1.06,5.73);box(ink,0,-.39,0,1.05,.60,.94,source);
   rod('#a37048',[0,0,.34],[0,0,-.30],.52,source);rod(cream,[0,0,-.31],[0,0,-.44],.46,source);
   oval(gold,0,.01,-.46,.36,.36,.115,source);
   for(let j=0;j<5;j++)box(ink,-.37+j*.183,.49,0,.055,.13,.70,source);
   rod(cream,[rx,.27,4.25],[rx,1.05,4.25],.089);
   for(const s of [-1,1])box(ink,rx+s*.277,1.09,4.25,.426,.85,.12);
   rod(gold,[rx,1.08,5.24],[rx,1.08,4.33],.067);rod('#f1d490',[rx,1.08,4.18],[rx,1.08,2.28],.044);
   cylinder(brass,rx,.48,2.09,.42,.50,.31);
   const crystal=part(new T.CylinderGeometry(.65,.65,.92,3),stage.toon('#97ccd1',{transparent:true,opacity:.80}),rx,1.07,2.09,1,1,1);
   crystal.rotation.y=.23;
   for(let j=0;j<3;j++){
     const a=.23+Math.PI*2*j/3,aa=.23+Math.PI*2*(j+1)/3;
     const x=rx+Math.sin(a)*.65,z=2.09+Math.cos(a)*.65;
     rod(cream,[x,.605,z],[x,1.535,z],.029);rod(brass,[x,1.54,z],[rx+Math.sin(aa)*.65,1.54,2.09+Math.cos(aa)*.65],.030);
   }
   box(ink,rx,.95,-.88,2.15,1.50,.17);
   const hues=['#dc835e','#e0a660','#c8c06c','#8bb6a0','#76a8bc','#9381ad'];
   for(let j=0;j<hues.length;j++){
     const xx=rx+(j-2.5)*.273;rod(hues[j],[rx+(j-2.5)*.041,1.08,1.71],[xx,1.08,-.762],.037);
     box(hues[j],xx,1.08,-.773,.205,.86,.033);
   }
   const rack=move(3.48,.16,3.6);box(wood,0,.37,0,2.38,.72,1.57,rack);box(ink,0,.79,0,2.27,.12,1.46,rack);
   for(let j=0;j<3;j++){const x=3.48+(j-1)*.68;box(brass,x,.98,3.62,.55,.09,.80);
     const feed=move(x,1.22,3.61);box(hues[j*2],0,0,0,.38,.32,.55,feed);
     effects.push((_,f)=>{feed.position.y=1.19+(b.round===j?b.fill*.36:0);feed.visible=f<.15;});}
   for(const [x,z] of [[4.1,5.49],[-5.28,6.37],[4.74,-6.55],[-4.75,-10.21]]){cylinder(brass,x,.047,z,.083,.088,.08);box(ink,x,.092,z,.095,.013,.017);}

   for(const s of [-1,1])for(let n=0;n<5;n++){const x=s*7.31,z=6-n*3.88;box(wood,x,.82,z,1.37,.19,2.57);for(const zz of [-.96,.96])cylinder(wood,x,-.42,z+zz,.11,.16,2.29);
     for(let j=0;j<3;j++){const xx=x+(j-1)*.35;cylinder(blue,xx,1.22,z,.14,.20,.52);cylinder(cream,xx,1.58,z,.07,.12,.19);}}
   box(ink,0,.69,-11.51,5.85,.33,2.14);for(const x of [-2.38,2.38])cylinder(wood,x,.29,-11.51,.18,.26,.59);
   const prism=move(-1.85,1.48,-11.62);part(new T.CylinderGeometry(.70,.70,1.19,3),'#88aeb3',0,0,0,1,1,1,prism);
   box(ink,.69,1.80,-12.54,3.8,1.98,.19);
   for(let i=0;i<9;i++){const x=-.82+i*.39,col=['#d68357','#d89d56','#e1b869','#afb16e','#78a787','#6eaca3','#698da5','#827fa2','#9b80a0'][i];
     const band=move(x,1.80,-12.39);box(col,0,0,0,.34,1.56,.09,band);
     effects.push((_,f)=>{band.scale.y=.055+.945*Math.min(1,Math.max(0,(b.round-(i/3))*.78+f*.85));});}
   const shade=move(.69,1.81,-12.26);box(ink,0,0,0,3.68,1.76,.08,shade);
   effects.push((t,f)=>{shade.scale.y=Math.max(.03,1-Math.min(1,f/1.42));shade.position.y=1.81+.85*(1-shade.scale.y);prism.rotation.y=t*.18;});
 }else if(day==='1215'){
   box('#b6966e',0,-.91,0,76,.63,76);
   for(let j=0;j<34;j++){const s=j%2?1:-1;hill(j%3?'#b49874':'#a68a6c',s*(8+j*7%15),-.55,8-j*17%37,.9+j%4,.3+j%3*.5,1.2+j%4);}
   const capsule=move(-2.46,1.04,-11.42);oval('#ae8964',0,0,0,.83,.85,.83,capsule);blank(cream,0,.03,0,.88,capsule,.05).rotation.x=Math.PI/2;
   for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(ink,[Math.cos(a)*.5,-.42,Math.sin(a)*.5],[Math.cos(a)*.91,-.96,Math.sin(a)*.91],.061,capsule);}
   rod(cream,[0,.72,0],[.21,1.71,0],.047,capsule);box(ink,1.05,.65,-11.61,2.69,1.31,1.37);
   const drum=move(1.03,1.53,-11.64);const roll=cylinder(cream,0,0,0,.44,.44,1.68,drum);roll.rotation.z=Math.PI/2;
   const waveTexture=texture(128,512,g=>{g.fillStyle='#ede1bd';g.fillRect(0,0,128,512);g.strokeStyle='#cdbb98';g.lineWidth=1;
     for(let n=0;n<32;n++){g.beginPath();g.moveTo(0,n*16);g.lineTo(128,n*16);g.stroke();}
     g.strokeStyle='#565f62';g.lineWidth=3;g.beginPath();for(let i=0;i<512;i++){const x=64+Math.sin(i*.26)*Math.max(4,40-i*.065);if(i)g.lineTo(x,i);else g.moveTo(x,i);}g.stroke();});
   const strip=move(1.02,1.30,-11.19);box(stage.toon('#fff',{map:waveTexture}),0,-.13,.92,1.33,.08,1.89,strip);
   effects.push((t,f)=>{drum.rotation.x=t*(b.engaged?.98:.22);strip.scale.z=.14+b.round*.16+Math.min(1,f)*1.42;strip.rotation.x=.18;});
 }else{
   box('#8a7968',0,-.75,-5,42,.67,52);
   for(const s of [-1,1])for(let i=0;i<5;i++){const x=s*7.12,z=6-i*4.12;box(wood,x,1.47,z,1.43,3.77,3.40);
     for(let r=0;r<3;r++){box(ink,x-s*.73,.41+r*.94,z,.055,.78,3.06);
       for(let n=0;n<9;n++)box([blue,'#ad785d','#c3a46c'][n%3],x-s*.79,.36+r*.94,z+(n-4)*.32,.098,.56+n%3*.054,.24);}}
   for(const x of [-1.4,1.4])cylinder(wood,x,.46,-11.76,.16,.22,.91);box(wood,0,1.02,-11.75,3.72,.24,2.14);
   const globe=move(0,2.43,-11.92);const map=texture(256,128,g=>{g.fillStyle='#68939c';g.fillRect(0,0,256,128);
     for(const [x,y,rx,ry,angle] of [[77,50,25,11,-.25],[94,75,11,25,-.31],[136,54,17,24,-.29],[162,41,35,12,.20],[200,87,13,8,-.23]]){
       g.fillStyle='#c0b385';g.beginPath();g.ellipse(x,y,rx,ry,angle,0,Math.PI*2);g.fill();}
     for(let i=0;i<16;i++){g.fillStyle='#e5d4aa88';g.fillRect(i*16,0,1,128);g.fillRect(0,i*16,256,1);}});
   part(new T.SphereGeometry(1,48,28),stage.toon('#fff',{map}),0,0,0,1.13,1.13,1.13,globe);
   blank(brass,0,2.42,-11.92,1.35,fixed,.073).rotation.z=-.33;
   for(let j=0;j<3;j++){const ring=move(0,2.43,-11.92);
     part(new T.TorusGeometry(1.43,.045,8,32,Math.PI*.86),j===1?cream:brass,0,0,0,1,1,1,ring);ring.rotation.set(.4+j*.48,j*1.53,j*.63);
     effects.push((_,f)=>{ring.visible=b.round>j;ring.rotation.y=j*1.53+Math.min(1,f)*.54;});}
   effects.push((t,f)=>globe.rotation.y=t*.08+Math.min(1,f/1.65)*1.19);
 }
 for(let j=0;j<3;j++){
   const x=-2.68*b.initialSide*(j%2?-1:1),z=.30-j*3.03,o=move(x,.10,z-.72);
   if(day==='1212'){cylinder(ink,0,.19,0,.29,.37,.38,o);rod(cream,[-.22,.44,0],[.32,.64,0],.16,o);}
   else if(day==='1213'){effects.push((t)=>{o.rotation.z=b.round===j&&b.engaged?Math.sin(t*5)*(.06+b.fill*.11):0;});cylinder(wood,0,.13,0,.38,.32,.19,o);for(let n=0;n<4;n++)hill('#ab8f74',-.19+n*.12,.26,-.07+n%2*.12,.086,.07,.093,o);}
   else if(day==='1214'){box(ink,0,.14,0,.70,.28,.53,o);for(let n=0;n<=j;n++){
     oval(blue,(n-j/2)*.16,.34,0,.063,.052,.065,o);const bulb=move(x+(n-j/2)*.16,.47,z-.72);oval(gold,0,0,0,.060,.055,.063,bulb);
     effects.push(()=>bulb.visible=b.round>j||b.round===j&&b.steps>n);}}
   else if(day==='1215'){box(blue,0,.18,0,.70,.36,.56,o);blank(cream,0,.47,0,.20,o);}
   else{cylinder(wood,0,.14,0,.31,.34,.27,o);blank(brass,0,.47,0,.25,o).rotation.y=.26;}
 }
 const cursor=move();blank(gold,0,.09,0,.80,cursor,.052).rotation.x=-Math.PI/2;
 const routes=b.layout.branches.map(([x,,z],i)=>{const o=move(x,.07,z);blank(i?brass:'#99ccbc',0,0,0,.79,o,.061).rotation.x=-Math.PI/2;return o;});
 const world=bakeDesk(stage,root);world.bounds={min:[-6.15,-2,-12.75],max:[6.15,12,11.4]};[fixed,...objects].forEach(batch);
 return {world,update(t:number,f:number){const q=b.phase==='warmup'?b.layout.warm:b.phase==='finale'?b.layout.end:b.nextSpot;
   cursor.position.set(q[0],0,q[2]);cursor.visible=b.phase!=='route'&&b.phase!=='curtain';routes.forEach(o=>o.visible=b.phase==='route');effects.forEach(fn=>fn(t,f));}};
}
