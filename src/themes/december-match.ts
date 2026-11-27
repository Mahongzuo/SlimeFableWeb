import * as T from 'three';
import {Kit} from './folio-landmarks';
import {solarWing,trainSet,tunnelPortal,sectionMesh,type DecemberDefenseDay} from './december-defense';

const dark='#526469',copper='#b59161',white='#dedccb',steel='#859396';
type Animate=(t:number,progress:number,finale:number,contacts:readonly boolean[],branch:number)=>void;
const stop=(value:number)=>Math.min(1,Math.max(0,value));
function slab(k:Kit,g:T.Group,color:string){k.box(g,color,0,.16,0,5.63,.32,2.98);}
function node(k:Kit,g:T.Group,x:number,y:number,z:number,r:number){
 k.put('round',g,'toon',dark,x,y,z,r,.22,r,Math.PI/2);k.ball(g,copper,x,y,z+.126,r*.62,r*.62,.03);
}
function crate(k:Kit,g:T.Group,x:number,y:number,z:number,color:string){
 k.box(g,color,x,y,z,.55,.40,.47);
 for(const dx of [-.16,.16])k.box(g,'#dfcda8',x+dx,y+.008,z,.057,.413,.477);
}
/** Original sectional models: all five dioramas respond to the active board. */
export function buildDecemberMatchTable(k:Kit,g:T.Group,day:DecemberDefenseDay):Animate{
 if(day==='1202'){
   slab(k,g,'#8a8888');
   for(let i=0;i<6;i++){const x=-2.38+i*.82;
     k.rock(g,i%2?'#8e8987':'#b1a59a',x,.45,-1.05,.61,.25+i%3*.10,.47,i);
     k.box(g,i%2?'#968573':'#92877d',x,.38,.92,.798,.12,.61);
     k.box(g,'#b4a48f',x,.472,.92,.798,.056,.61);}
   for(let i=0;i<12;i++)k.rock(g,i%3?'#766f70':'#a99b8d',-2.60+i*.44,.30,Math.sin(i)*.75,.15+i%4*.07,.12+i%3*.05,.17,i);
   for(const s of [-1,1])k.beam(g,steel,[-1.62+s*.37,.34,-.28],[-1.62+s*.22,2.76,-.28],.059);
   k.box(g,'#a19f8a',-1.62,2.82,-.28,.88,.15,.64);
   const drill=k.group(g,-1.62,.34,-.24);drill.name='drill';
   k.cyl(drill,dark,0,.97,0,.063,1.52);
   for(let n=0;n<24;n++){const a=n*.55;k.beam(drill,'#c2ab7d',[.108*Math.cos(a),.25+n*.044,.108*Math.sin(a)],[.108*Math.cos(a+.55),.25+(n+1)*.044,.108*Math.sin(a+.55)],.035);}
   k.box(drill,'#c1a777',0,1.88,0,.39,.33,.39);
   const base=k.group(g,1.53,.48,-.18);
   k.cyl(base,dark,0,.23,0,.43,.42);const arm=k.group(base,0,.44,0);
   node(k,arm,0,.06,0,.16);k.beam(arm,'#ceae71',[0,.06,0],[-.54,.77,0],.105);node(k,arm,-.54,.77,0,.132);
   k.beam(arm,steel,[-.54,.77,0],[-1.22,.36,.12],.075);
   k.put('taperDown',arm,'toon','#9e9581',-1.28,.23,.15,.21,.34,.23,0,0,-.49);
   const jar=k.group(g,.26,.38,.93);k.put('round',jar,'toon','#a68c66',0,.33,0,.32,.65,.32);
   k.cyl(jar,'#595d58',0,.672,0,.28,.028);k.ring(jar,'#d8bc83',0,.69,0,.30,Math.PI/2);
   const lid=k.group(jar,.34,.70,0);lid.name='lid';k.cyl(lid,'#c9b186',-.32,.055,0,.326,.10);
   return(t,p,f)=>{drill.position.y=.22+.90*stop(p*3);drill.rotation.y=stop(p*3)*6.0;
     base.rotation.y=-.54+1.16*stop(p*3-1);arm.rotation.z=.19+.55*Math.sin(Math.PI*stop(p*3-1));
     lid.rotation.z=-1.64*(1-stop(f*1.25));};
 }
 if(day==='1203'){
   slab(k,g,'#86878d');
   for(let n=0;n<17;n++){const a=n*2.40,r=1.35+n%4*.37;k.rock(g,n%2?'#85818b':'#ada398',r*Math.cos(a),.38,.54*r*Math.sin(a),.25+n%3*.07,.10+n%3*.04,.24,a);}
   const deck=k.group(g,-.09,.39,.04);deck.name='landing-deck';
   k.taper(deck,'#bc9e64',0,.58,0,.87,.77,true);
   for(let n=0;n<4;n++){const a=n*Math.PI/2+.7,x=Math.cos(a),z=Math.sin(a);
     k.beam(deck,copper,[x*.62,.73,z*.62],[x*1.12,.045,z*1.12],.072);
     k.beam(deck,'#8f9284',[x*.58,.29,z*.58],[x*1.02,.15,z*1.02],.042);
     k.cyl(deck,'#c5b891',x*1.12,.065,z*1.12,.25,.106);}
   solarWing(k,deck,-1.36,.89,0,1.34,1.10);solarWing(k,deck,1.36,.89,0,1.34,1.10);
   const ascent=k.group(deck,0,.98,0);ascent.name='ascending-capsule';
   k.taper(ascent,dark,0,.14,0,.33,.26,true);k.cyl(ascent,'#bf9d62',0,.51,0,.52,.49);
   k.box(ascent,white,0,.89,0,.75,.37,.67);k.cyl(ascent,'#a79873',.12,1.19,.06,.23,.27);
   for(const s of [-1,1])k.box(ascent,'#ddd1b5',.27*s,.66,.43,.22,.25,.13);
   const pins=[-1,1].map(s=>{const latch=k.group(deck,s*.63,.91,.43);
     k.box(latch,'#ad7251',-.18*s,0,0,.44,.12,.12);return latch;});
   const flame=k.group(ascent,0,-.02,0);k.put('cone',flame,'lamp','#efac6f',0,-.20,0,.18,.47,.18,Math.PI);
   return(t,p,f,c)=>{const ready=stop(p*3-1);
     deck.rotation.z=(c[0]!==c[1]&&p>.32&&p<.66?(c[0]?1:-1)*.077:0);
     pins.forEach((l,i)=>l.rotation.y=(i?1:-1)*(c[i]||p>.66?1.35:0));
     ascent.position.y=.98+.19*stop(p*3-2)+1.65*stop(f*.73);flame.visible=f>0;flame.scale.y=.86+.12*Math.sin(12*t)+ready*.13;};
 }
 if(day==='1204'){
   slab(k,g,'#666f77');k.box(g,'#899697',0,.37,0,5.34,.10,2.66);
   for(let row=0;row<9;row++)for(let col=0;col<17;col++)k.cyl(g,'#687478',-2.45+col*.306,.423,-1.1+row*.273,.029,.016);
   k.box(g,dark,-2.09,.65,.52,.41,.47,.38);k.box(g,'#506571',-2.09,1.11,.52,.68,.46,.57);k.put('round',g,'toon','#958a74',-1.66,1.14,.51,.135,.24,.135,0,0,Math.PI/2);
   const mirrors=[[-.89,.50],[.24,-.82],[1.13,.54]];
   const mounts=mirrors.map(([x,z])=>{const pivot=k.group(g,x,.43,z);
     k.cyl(pivot,dark,0,.13,0,.22,.23);k.cyl(pivot,copper,0,.42,0,.047,.40);
     k.box(pivot,'#c2bda7',0,.72,0,.64,.55,.09);
     k.box(pivot,'#7cb4ba',0,.72,.059,.54,.44,.022);return pivot;});
   const screen=k.group(g,2.16,.44,-.44);k.box(screen,dark,0,.48,0,.68,.96,.19);k.box(screen,'#b5c9bd',0,.55,.106,.53,.60,.027);
   const light=k.group(screen,0,.70,.14);k.ball(light,'#f3d6a2',0,0,0,.086,.086,.026,'lamp');
   const beam=(a:[number,number],b:[number,number],color:string)=>{const group=k.group(g);
     k.beam(group,color,[a[0],1.14,a[1]],[b[0],1.14,b[1]],.023,'lamp');return group;};
   const paths=[beam([-1.57,.52],[-.89,.50],'#efbf75'),beam([-.89,.50],[.24,-.82],'#efbf75'),beam([.24,-.82],[1.13,.54],'#a3ded5'),beam([1.13,.54],[2.16,-.31],'#ead6ac')];
   return(t,p,f,c)=>{mounts.forEach((m,i)=>{const aligned=p>(i+.67)/3||c[i%2]&&p>i/3;m.rotation.y=aligned?[.56,-.62,.59][i]:[1.31,-1.50,1.52][i];});
     paths.forEach((r,i)=>r.visible=i===0||p>=(i-.38)/3);light.visible=f>0;};
 }
 if(day==='1205'){
   slab(k,g,'#b69a76');
   for(let i=0;i<16;i++)k.box(g,i%3?'#b49b76':'#c2a983',-2.67+i*.354,.34,.01,.342,.041,2.74);
   for(const x of [-1.9,1.75])for(const z of [-.95,.47])k.box(g,'#8a7355',x,1.12,z,.10,1.52,.10);
   for(let n=0;n<12;n++){const x=-1.97+n*.347,color=n%2?'#e4c099':'#a66c56';
     k.put('box',g,'toon',color,x,1.98,-.19,.345,.068,1.76,.12);k.box(g,color,x,1.78,.68,.345,.23,.04);}
   const desk=k.group(g,0,.34,-.20);
   k.box(desk,'#927357',0,.57,0,3.52,.16,.73);
   for(const x of [-1.55,1.55])for(const z of [-.25,.25])k.box(desk,'#78654d',x,.25,z,.095,.50,.09);
   const bins=[-1,1].map(s=>{const bin=k.group(desk,s*.86,.66,0);crate(k,bin,0,.20,0,s<0?'#71999a':'#c08165');return bin;});
   const cart=k.group(g,-1.39,.39,.94);cart.name='supply-cart';
   k.box(cart,'#b9905b',0,.23,0,.93,.13,.52);k.beam(cart,dark,[-.42,.22,0],[-.67,.74,0],.036);
   for(const x of [-.31,.31])for(const z of [-.22,.22])k.put('round',cart,'toon',dark,x,.12,z,.11,.085,.11,Math.PI/2);
   const parcel=k.group(cart);crate(k,parcel,0,.49,0,'#ad8960');
   k.box(g,'#747c68',2.25,1.0,.04,.60,.90,.085);
   for(let i=0;i<4;i++)k.box(g,'#dfdbb6',2.18+i%2*.08,1.30-i*.17,.095,.33-i*.026,.031,.02);
   return(t,p,f,c,branch)=>{const travel=.62*stop((p-.42)/.58)+.38*stop(f*.84);cart.position.x=-1.39+2.76*travel;
     cart.position.z=.94+(branch===2?-.22:.19)*travel;parcel.visible=p>.18;bins.forEach((bin,i)=>bin.position.y=.66+.12*(c[i]?1:0));};
 }
 slab(k,g,'#929577');const railroad=k.group(g,0,.36,.11);
 for(const z of [-.19,.19])k.box(railroad,'#6d7674',0,.07,z,5.47,.074,.048);
 for(let i=0;i<21;i++)k.box(railroad,'#8c8774',-2.60+i*.26,.03,0,.099,.06,.60);
 // A geological slice stands behind the exposed track, so the train stays visible
 // as it passes under the two real arches. Soil bands share edges down the cut face.
 const ridge=(x:number)=>.36+1.19*Math.max(0,1-Math.abs(x+.67)/1.55)+.90*Math.max(0,1-Math.abs(x-.88)/1.27)+.17*Math.sin(3.4*x+.6);
 const bands=['#8a7e66','#b09972','#958970','#c0ac7e','#8e9270','#80906a'];
 sectionMesh(k,railroad,quad=>{
   for(let i=0;i<24;i++){
     const a=-2.29+i*.19,b=a+.19,ha=ridge(a),hb=ridge(b);
     for(let n=0;n<bands.length;n++){
       const level=(x:number,h:number,j:number)=>h*j/bands.length+(j>0&&j<bands.length?.04*Math.sin(x*4.2+j*.4):0);
       quad([a,level(a,ha,n),-.48],[b,level(b,hb,n),-.48],[b,level(b,hb,n+1),-.48],[a,level(a,ha,n+1),-.48],bands[n]);
     }
     quad([a,ha,-.48],[b,hb,-.48],[b,hb+.19,-.90],[a,ha+.19,-.90],i%4?'#81956e':'#91a079');
     quad([a,ha+.19,-.90],[b,hb+.19,-.90],[b,.13,-1.43],[a,.13,-1.43],'#68846b');
     if(i===0||i===23){const end=i===0?a:b,h=i===0?ha:hb;
       quad([end,0,-.48],[end,h,-.48],[end,h+.19,-.90],[end,.13,-1.43],'#9c9678');}
   }
 });
 for(let n=0;n<15;n++){
   const x=-1.91+n*.27,y=ridge(x)+.135,z=-.77-(n%3)*.09;
   k.cyl(railroad,'#756e50',x,y+.10,z,.028,.20);
   k.cone(railroad,n%3?'#55735b':'#6c885f',x,y+.29,z,.133+.025*(n%2),.42+(n%3)*.06);
 }
 for(const x of [-.63,.63]){
   const portal=k.group(railroad,x,0,0,0,0,0,.68);tunnelPortal(k,portal,0,0,.78,'#ad9d7d');
 }
 for(const x of [-2.22,1.65,2.09]){k.cyl(railroad,'#826e50',x,.51,.55,.035,1.02);
   k.box(railroad,'#b9be97',x,.85,.55,.15,.14,.065);}
 const inner=k.group(railroad,-.83,.18,0);inner.name='tunnel-car';inner.scale.setScalar(.49);trainSet(k,inner,'#668f9e');
 const plates=[-1,1].map(s=>{const part=k.group(railroad,s*.88,.09,0);
   for(let n=0;n<4;n++)k.box(part,n%2?'#a69a81':'#948e77',0,.13+n*.22,0,.15,.203,.87-.06*n);
   return part;});
 return(t,p,f)=>{plates.forEach((plate,i)=>plate.position.z=-.88*stop(p*3-i));
   inner.position.x=-1.93+1.68*stop(p*2)+.94*stop(p*3-2)+stop(f*.78)*1.20;};
}

