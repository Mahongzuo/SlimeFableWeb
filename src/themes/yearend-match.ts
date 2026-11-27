import type * as T from 'three';
import type {Kit} from './folio-landmarks';
import type {YearendDay} from '../templates/yearend-defense';
import {ivory,slate,steel,brass,red,unit} from './winter-boards';
import {bark,copper,gold,green,desk,folio,turbine} from './yearend-boards';
type Motion=(t:number,p:number,f:number,contacts:readonly boolean[],branch:number)=>void;

export function buildYearendMatch(k:Kit,g:T.Group,day:YearendDay):Motion{
 const end=k.group(g);end.name='yearend-finale';
 if(day==='1217'){
   k.box(g,slate,0,.16,0,5.52,.32,2.67);
   for(const x of [-1.65,1.65])for(const z of [-.88,.88]){
     k.cyl(g,steel,x,1.27,z,.062,2.20);k.taper(g,brass,x,.44,z,.18,.33);}
   for(let j=0;j<4;j++){const y=.57+j*.43;
     for(const s of [-1,1])k.box(g,'#979996',0,y-.10,s*.79,3.31,.075,.079);
     for(let i=0;i<9;i++){
       if(j%2)k.box(g,i%2?'#98bcaa':'#aacbbb',-1.27+i*.32,y,0,.28,.16,1.48);
       else k.box(g,i%2?'#909cbc':'#a9afca',0,y,-.67+i*.168,2.94,.16,.142);
     }
   }
   const trail=k.group(end);k.beam(trail,'#ffe49b',[-.88,2.62,-.69],[.72,.31,.83],.051,'lamp');
   for(let j=0;j<4;j++){
     const y=.57+.43*j,u=(y-.31)/2.31,x=.72-1.60*u,z=.83-1.52*u;
     k.ball(trail,'#fff1a2',x,y+.089,z,.11,.058,.11,'lamp');
     if(j%2){
       const ix=Math.round((x+1.27)/.32);k.box(trail,'#e8d698',-1.27+ix*.32,y+.089,0,.255,.013,1.44,0,'lamp');
     }else{
       const iz=Math.round((z+.67)/.168);k.box(trail,'#e8d698',0,y+.089,-.67+iz*.168,2.90,.013,.123,0,'lamp');
     }
   }
   const lights=[0,1,2].map((_,i)=>{const light=k.group(g,1.87,.59+i*.47,.67);
     k.box(light,'#ffdc87',0,0,0,.26,.072,.21,0,'lamp');return light;});
   return(t,p,f,c)=>{end.scale.y=.07+.93*unit(f);trail.visible=f>0;lights.forEach((v,i)=>v.visible=p*3>i+.45||p>.30&&c[i]);};
 }
 if(day==='1218'){
   k.box(g,'#9c927b',0,.17,0,5.58,.34,2.84);
   const tray=k.group(g,-1.28,.46,-.22,.29);k.box(tray,green,0,.10,0,2.39,.20,1.95);
   for(let i=0;i<2;i++)for(let j=0;j<2;j++){const x=-.54+i*1.07,z=-.42+j*.85;
     k.box(tray,i===j?'#c5b49a':'#a3aaa0',x,.26,z,1.01,.102,.78);
     for(let n=0;n<3;n++)k.rock(tray,['#847e77','#a59c88','#5b6365'][(i+j+n)%3],x-.28+n*.25,.39+n%2*.08,z-.03,.15+n*.024,.14+.04*j,.12+.036*i,i+.6*j+n);
     k.box(tray,ivory,x,.321,z+.28,.45,.018,.105);}
   for(const z of [-.97,.97])k.box(tray,bark,0,.36,z,2.42,.26,.075);
   for(const x of [-1.20,1.20])k.box(tray,bark,x,.36,0,.065,.26,1.89);
   const mount=k.group(g,1.14,.43,.09,.21);
   const cover=folio(k,mount,'#617b76',1.96,1.76);mount.add(end);end.add(cover);
   const tabs=[-1,1].map((s,i)=>{const tab=k.group(mount,.63,.163,s*.54);k.box(tab,i?'#87acb5':'#aea382',0,0,0,.53,.04,.27);return tab;});
   return(t,p,f,c,branch)=>{cover.rotation.z=2.08-.32*p-1.76*unit(f);end.position.y=.014*unit(f);tabs.forEach((v,i)=>v.visible=!branch||branch===i+1);};
 }
 if(day==='1219'){
   k.box(g,bark,0,.15,0,5.63,.30,2.76);
   for(const x of [-2.13,.68]){k.box(g,'#684e41',x,1.33,0,.21,2.36,.32);k.box(g,brass,x,.36,0,.41,.15,.64);}
   k.box(g,bark,-.72,2.51,0,3.18,.20,.41);
   for(const s of [-1,1])k.beam(g,brass,[-.72+s*.84,2.48,0],[-.72+s*.50,2.05,.02],.027);
   const disc=k.group(g,-.72,1.34,.02);k.put('round',disc,'toon',copper,0,0,0,.94,.117,.94,Math.PI/2);
   k.ring(disc,gold,0,0,.073,.81);k.ring(disc,'#be9062',0,0,.085,.65);k.ball(disc,brass,0,0,.095,.25,.25,.11);
   const clock=k.group(g,1.75,1.41,-.06);k.box(clock,green,0,-.22,0,1.41,1.86,.59);
   k.put('round',clock,'toon',brass,0,.32,.32,.65,.12,.65,Math.PI/2);k.put('round',clock,'toon',ivory,0,.32,.398,.56,.035,.56,Math.PI/2);
   for(let j=0;j<12;j++){const a=j*Math.PI/6;k.put('box',clock,'toon',slate,.47*Math.cos(a),.32+.47*Math.sin(a),.427,.087,.029,.018,0,0,a);}
   const hands=k.group(clock,0,.32,.45);k.beam(hands,slate,[0,0,0],[0,.41,0],.024);k.beam(hands,slate,[0,0,.018],[-.22,.09,.018],.033);
   end.position.set(.42,1.14,.49);k.beam(end,bark,[0,0,0],[-.77,.14,0],.052);k.ball(end,'#954f41',-.85,.16,-.028,.15,.15,.12);
   return(t,p,f)=>{hands.rotation.z=-p*Math.PI*1.67;end.rotation.y=.82-1.06*unit(f)+.32*Math.sin(f*9)*Math.exp(-2.7*f);
     disc.rotation.x=f>0?Math.sin(f*13)*.18*Math.exp(-2*f):0;};
 }
 if(day==='1220'){
   k.box(g,'#769894',0,.16,0,5.70,.32,2.86);
   k.box(g,'#78b3b2',0,.35,0,5.58,.058,.57);
   for(const s of [-1,1]){k.box(g,'#a7a48d',0,.46,s*.86,5.43,.22,.96);
     k.box(g,'#d5cab0',0,.606,s*1.29,5.49,.068,.079);}
   const station=k.group(g,0,.49,-1.19);
   for(const x of [-2.48,-1.28,0,1.28,2.48]){k.taper(station,'#a9a58d',x,.57,-.09,.16,1.14);k.box(station,brass,x,1.18,-.09,.28,.11,.35);}
   k.box(station,'#919888',0,1.31,-.14,5.36,.15,.48);
   for(let i=0;i<8;i++){const x=-2.25+i*.64;k.box(station,'#788e8b',x,.63,-.15,.54,.88,.19);
     for(let h=0;h<4;h++)k.box(station,'#aab2a2',x,.35+h*.17,-.034,.46,.026,.022);
     k.beam(g,'#97aaa3',[x,.61,-.57],[x,.36,-.19],.061);k.beam(g,'#97aaa3',[x,.61,.57],[x,.36,.19],.061);}
   const wheels:T.Group[]=[],lamps:T.Group[]=[];
   for(let j=0;j<2;j++)for(let i=0;i<8;i++){
     const x=-2.25+i*.64,z=j?.83:-.83,part=k.group(g,x,.59,z);turbine(k,part,0,0,.27);wheels.push(part);
     const light=k.group(g,x,.64,z+(j?.35:-.35));light.name='connected-unit';k.cyl(light,gold,0,0,0,.050,.046,'lamp');lamps.push(light);
   }
   k.box(g,slate,-.21,.56,0,.28,.41,.65);k.box(end,brass,.16,.67,0,.39,.17,.49);
   return(t,p,f,c,branch)=>{const near=branch===2?1:0;
     wheels.forEach((v,i)=>{const rank=i%8+(Math.floor(i/8)===near?0:8),active=rank<Math.floor(p*12+unit(f)*4+.001);
       lamps[i].visible=active;if(active)v.rotation.y=t*1.88+i*.38;});end.position.x=.77*unit(f);};
 }
 k.box(g,'#536674',0,.15,0,5.61,.30,2.78);
 k.box(g,'#a7a597',-2.18,.76,-.03,.69,.97,1.24);k.cyl(g,brass,-2.18,.48,-.08,.57,.18);
 const root=k.group(g,-2.02,1.15,.01);const leaves:T.Group[]=[];let parent=root;
 for(let i=0;i<5;i++){const panel=i===4?end:k.group(parent);
   if(i===4)parent.add(end);if(i)panel.position.x=.83;
   k.box(panel,brass,.40,0,0,.79,.086,1.32);k.box(panel,i%2?'#596779':'#495c74',.40,.060,0,.73,.028,1.22);
   for(let j=0;j<4;j++)for(let m=0;m<6;m++)k.box(panel,i%2?'#8194b2':'#7789ab',.14+j*.17,.083,-.50+m*.20,.146,.013,.173);
   for(const s of [-1,1])k.put('round',panel,'toon',steel,0,0,s*.60,.075,.17,.075,Math.PI/2);
   leaves.push(panel);parent=panel;
 }
 return(t,p,f,c)=>{const tilt=1.26*(1-unit(p*.69+unit(f)*.31));leaves.forEach((v,i)=>v.rotation.z=i?(i%2?-2:2)*tilt:tilt);};
}
