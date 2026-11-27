/** Each hall is an original, non-combat miniature. */
import * as T from 'three';
import {floor,paint,label,rod,ring,batch,wood,jade,brass,cream,red,iron} from './december-chapters';
import {grain,peaked} from './winter-chapters';
import {tiles,ripples,skyline,ease,folded} from './midwinter-chapters';
import {arc,pennant} from './yearend-chapters';
import {type Exhibit,ink,props,backdrop,table,spool,pairCards,sheet,frame,register,penn} from './monthend-chapters';
export const rubbing:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#b4a38a','#958d77'));backdrop(b,'#bca586','#aa886a');for(const k of [-1,1]){b.box('#885c46',k*2.88,1.28,-2.91,.26,2.56,.48);}
 for(let j=0;j<16;j++)rod(b,j%2?'#55695e':'#68796b',[-3.31+j*.44,2.8,-3.32],[-3.31+j*.44,2.54,-2.43],.22);
 b.box(ink(st,'cloud','#8d8d79','#646f63'),0,1.30,-2.75,3.98,1.89,.28);
 const panels=[-1,1].map(k=>b.box(ink(st,'cloud','#e5d8b4','#636957'),k*.70,1.28,-2.52,1.37,1.16,.045,b.root));
 const cover=props(b,[1.80,.09,1.22],g=>{b.box(jade,0,0,0,1.47,.12,.85,g);b.box(cream,0,.083,0,1.36,.044,.75,g);});
 const lifted=b.box(ink(st,'cloud'),0,0,0,2.65,.035,1.04,b.root);for(const x of [-1.9,1.9])b.box('#9b866b',x,.097,-.46,.25,.17,.72);
 return(s,t)=>{panels.forEach((p,i)=>p.visible=s.count>(s.chosen===1?1-i:i));const k=ease(s.end);lifted.visible=s.end>=0;lifted.position.set(.09+k*1.01,.22+k*.85,-.44+k*.58);lifted.rotation.x=k*.97;};
};
export const arch:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#998e75','#857d69'));b.box(ripples(st,'#759792','#a0b5a7'),0,-.18,-3.8,11,.25,3.1);
 for(const k of [-1,1]){b.box('#a69c82',k*2.57,.35,-2.42,2.40,.7,1.25);skyline(b,k*3.11,-4.15,.78,'#b5ac8f');}
 const leaves=[-1,1].map(k=>{const p=b.group();p.position.set(k*1.56,.34,-2.24);
  for(let n=0;n<5;n++){const f=(n+.5)/5;b.box(n%2?'#b6aa8b':'#c3b597',-k*f*1.43,.25+.58*Math.sin(f*1.53),0,.30,.36,.93,p).rotation.z=k*(f-1)*.48;}
  rod(b,iron,[-k*.06,.48,.29],[-k*1.43,1.01,.29],.03,p);batch(p);return p;});
 const key=b.box('#d4bd8d',0,1,-2.22,.34,.45,.97,b.root);
 for(const k of [-1,1]){b.cylinder(wood,k*1.96,.13,-.40,.30,.35,.26);ring(b,brass,k*1.96,.28,-.4,.29,.04);}
 return(s,t)=>{leaves.forEach((g,i)=>{const k=i?1:-1,n=i?s.right:s.left;g.rotation.z=k*(2-n)*.18;});key.visible=s.end>=0;key.position.y=1.22+(1-ease(s.end))*.93;};
};
export const binding:Exhibit=(b,st)=>{
 floor(b,grain(st,'#a18b6d'));backdrop(b,'#a8987e','#866e56');for(let j=0;j<16;j++){const x=-3.92+j*.52;
 b.box(j%3===0?jade:j%3===1?'#977664':'#ad987a',x,1.54,-3.64,.35,1.03+(j%4)*.12,.28);b.box(cream,x,1.70,-3.48,.16,.45,.031);}
 table(b,0,.64,-2.05,3.66,1.20);const pages=pairCards(b,st,['leaf','frost']);
 const book=props(b,[0,.81,-2.06],g=>{b.box(wood,0,0,0,2.70,.18,1.12,g);b.box(cream,0,.12,0,2.59,.08,1.05,g);});
 const cover=props(b,[0,.99,-2.08],g=>{b.box(jade,0,0,0,2.62,.09,1.05,g);b.box(label(st,cream,'生 死 场',iron),.61,.064,0,.76,.029,.63,g);});
 const thread=props(b,[0,.095,-.64],g=>{arc(b,g,[[-.84,0,0],[-.24,.02,.16],[.23,.02,-.12],[.79,0,0]],brass,.023);});
 return(s,t,x,z)=>{pages.forEach((m,i)=>{const p=register(s,i,x,z);m.position.set(p[0],p[1],p[2]);});thread.visible=s.count>0;
 const k=ease(s.end);cover.visible=s.end>=0;cover.rotation.x=(1-k)*1.30;cover.position.z=-2.08+(1-k)*.48;};
};
export const dispatch:Exhibit=(b,st)=>{
 floor(b,grain(st,'#ac9777'));backdrop(b,'#b7a78a','#927e66');table(b,0,.68,-2.10,4.62,1.06);
 const machines=[-1,1].map(k=>props(b,[k*1.23,.77,-2.05],g=>{b.box(iron,0,.18,0,1.20,.35,.72,g);spool(b,g,-.26,.60,0,.32);spool(b,g,.40,.57,.03,.25);rod(b,brass,[-.42,.44,.40],[.38,.43,.4],.025,g);}));
 const strips=[-1,1].map(k=>b.box(ink(st,'rows'),k*1.22,.97,-1.61,.93,.039,.60,b.root));
 const copy=b.box(ink(st,'rows'),0,.09,.64,1.06,.06,.74,b.root);
 const stamp=props(b,[1.76,.56,-.53],g=>{b.box(wood,0,0,0,1.39,.98,.89,g);b.box(label(st,cream,'收 讫',red),0,.52,0,.88,.055,.51,g);});
 return(s,t,x,z)=>{strips.forEach((m,i)=>{m.visible=s.carry===i||!!(s.mask&(1<<i));m.position.set(s.carry===i?x:(i?.36:-.36),s.carry===i?.48:.16,s.carry===i?z-.25:.64);});
 copy.position.set(1.76*ease(s.end),.08+ease(s.end)*1.05,.64-ease(s.end)*1.17);stamp.rotation.y=-.1*ease(s.end);};
};
export const phonics:Exhibit=(b,st)=>{
 floor(b,grain(st,'#aa8d70'));backdrop(b,'#a19480','#82735e');for(let i=0;i<12;i++){const x=-2.94+i%6*1.17,y=1.05+Math.floor(i/6)*.75;
 b.box(wood,x,y,-3.62,1.11,.66,.47);b.box(label(st,'#cdbb93',['b','p','m','f','d','t','n','l','g','k','h','r'][i],iron),x,y,-3.35,.72,.35,.05);}
 const types=['sh','w','ān'].map((txt,i)=>b.box(label(st,'#b1afa2',txt,iron),i===2?.06:i?2.05:-2.05,.16,i===2?.65:-.44,.64,.28,.54,b.root));
 const slips=['山 shān','湾 wān'].map(v=>b.box(label(st,cream,v,iron),0,0,0,2.01,.78,.055,b.root));
 table(b,0,.54,-2.00,3.47,1.25);const lever=props(b,[1.29,.65,-1.99],g=>rod(b,wood,[0,0,0],[.23,.76,.15],.067,g));
 return(s,t,x,z)=>{types.forEach((m,i)=>{if(i===s.chosen&&s.step)m.position.set(s.step===1?x:-.38,s.step===1?.48:.72,s.step===1?z-.22:-1.95);if(i===2&&s.step>=2)m.position.set(.32,.72,-1.95);});
 slips.forEach((m,i)=>{m.visible=s.end>=0&&s.chosen===i;m.position.set(0,.86+.29*ease(s.end),-1.48+.62*ease(s.end));});lever.rotation.x=-ease(s.end)*.89;};
};
export const aqueduct:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#9f9f83','#8c8d78'));
 for(let j=0;j<6;j++)peaked(b,j%2?'#819781':'#9ba68a',-4.86+j*1.85,.66,-4.31,2.8,1.63+(j%3)*.26,.4);
 const river=ripples(st,'#328e92','#c9ede1');
 for(const k of [-1,1]){
   for(let j=0;j<3;j++)b.box('#aa9273',k*(.43+j*.83),.56,-2.25,.43,1.12,.69);
   b.box('#cdba93',k*1.49,1.48,-2.68,1.92,.24,.14);
   b.box('#c5b18d',k*.81,1.44,-1.83,1.62,.23,.13);
   b.box('#c5b18d',k*2.29,1.44,-1.83,.34,.23,.13);
   b.box('#a99a7f',k*.64,1.29,-3.29,.19,.58,1.06);
 }
 b.box('#bba887',0,1.20,-2.24,4.97,.25,.98);
 b.box(river,0,1.35,-2.25,4.8,.045,.70);
 b.box(river,0,1.37,-3.25,1.07,.055,1.29);
 const branches=[-1,1].map(k=>{
   const x=k*1.86;
   for(const j of [-1,1])b.box('#ad9677',x+j*.255,1.34,-1.61,.068,.19,.49);
   b.box('#a59478',x,1.21,-1.59,.56,.14,.49);
   b.box(river,x,1.30,-1.61,.44,.034,.53);
   b.oval('#599895',x,.055,-1.15,.61,.051,.43);
   const flow=props(b,[x,1.28,-1.345],g=>{
     b.box('#67bcc0',0,-.60,.039,.40,1.20,.10,g);
     for(const j of [-1,0,1])rod(b,'#d9efde',[j*.12,-.04,.105],[j*.13,-1.16,.115],.018,g);
   });
   const foam=props(b,[x,.11,-1.27],g=>{for(let i=0;i<5;i++)b.oval('#d8eddf',-.22+i*.10,.026,(i%3)*.062,.084,.047,.11,g);});
   return {flow,foam};
 });
 // Two taut hangers keep the moving blade visibly attached to the trestle throughout its lift.
 for(const k of [-1,1]){
   b.box('#715740',k*.68,1.93,-2.58,.16,1.95,.19);
   rod(b,'#926b46',[k*.65,2.40,-2.56],[k*.37,2.74,-2.55],.057);
 }
 b.box('#805a3d',0,2.85,-2.58,1.61,.20,.25);
 const blade=props(b,[0,1.59,-2.56],g=>{
   for(let i=0;i<5;i++)b.box(i%2?'#8b6b4b':'#a17b54',(i-2)*.218,0,0,.208,.65,.16,g);
   for(const y of [-.20,.17])b.box(iron,0,y,.105,1.13,.05,.05,g);
 });
 const hangers=[-1,1].map(k=>b.cylinder('#665440',k*.37,2.30,-2.55,.033,.033,1,b.root));
 ring(b,brass,0,2.84,-2.411,.154,.031,b.fixed,false);
 for(let j=0;j<4;j++){const a=j*Math.PI/4;rod(b,brass,[-.15*Math.cos(a),2.84-.15*Math.sin(a),-2.41],[.15*Math.cos(a),2.84+.15*Math.sin(a),-2.41],.013);}
 const gauges=[-1,1].map(k=>{b.box(cream,k*2.34,.64,-.93,.36,1.24,.15);
 b.box(brass,k*2.34,.14+(k>0?.69:.37),-.83,.39,.075,.04);return b.box(jade,k*2.34,.18,-.79,.32,.037,.032,b.root);});
 return(s,t)=>{
   const u=ease(s.end);blade.position.y=1.58+u*.57;
   const rim=blade.position.y+.32;
   hangers.forEach(m=>{m.scale.y=2.76-rim;m.position.y=(2.76+rim)/2;});
   branches.forEach(({flow,foam},i)=>{const active=!!(s.mask&(1<<i));flow.visible=active;foam.visible=active;
     foam.scale.x=.87+.15*Math.sin(t*5+i);foam.scale.z=1+.12*Math.cos(t*4.3+i);});
   gauges.forEach((m,i)=>{m.position.y=.14+((s.mask&(1<<i))?(i?.69:.37):s.step&&s.goal[0]*(i?1:-1)>0?s.meter:.055);});
 };
};
export const stagePhoto:Exhibit=(b,st)=>{
 floor(b,grain(st,'#9c8065'));backdrop(b,'#aa917b','#85634e');b.box('#8b5446',0,1.51,-2.95,5.11,2.85,.29);
 b.box('#e8caa0',0,1.53,-2.76,4.55,2.40,.06);for(const k of [-1,1])for(let j=0;j<5;j++)b.cylinder(j%2?'#a36050':'#885242',k*(2.0+j*.17),1.53,-2.58,.14,.18,2.82);
 const cloth=(points:number[][],color:string,p:T.Group,z=0)=>{const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return b.part(new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false}),color,0,0,z,1,1,1,p);};
 const actor=props(b,[0,.48,-2.56],g=>{
   cloth([[-.19,1.05],[-.36,.89],[-.15,.62],[-.39,.17],[-.51,.09],[-.34,.04],[.28,.11],[.40,.21],[.17,.63],[.32,.91],[.13,1.06]],'#713e44',g);
   cloth([[-.14,.95],[.13,.96],[.17,.71],[.04,.51],[-.13,.19],[-.29,.15],[-.09,.62]],'#d79563',g,.045);
   b.oval('#e3b987',0,1.23,.045,.178,.224,.068,g);
   b.oval('#5c3c42',-.017,1.39,.015,.217,.130,.095,g);
   for(let j=-2;j<=2;j++){const x=j*.079,y=1.56-.021*Math.abs(j);rod(b,brass,[x*.75,1.42,.08],[x*1.35,y,.08],.023,g);b.oval(j%2?'#b45b50':cream,x*1.35,y,.09,.05,.055,.035,g);}
   for(const k of [-1,1]){rod(b,'#55414a',[k*.17,1.41,.04],[k*.32,1.54,.04],.036,g);b.oval(brass,k*.35,1.56,.05,.05,.047,.03,g);}
   b.oval('#4b3c3a',.065,1.26,.107,.032,.018,.012,g);b.oval(red,.096,1.17,.10,.029,.012,.010,g);
   for(const k of [-1,1])b.oval('#4b4141',k*.16,.04,.03,.14,.048,.056,g);
 });
 const arms=[-1,1].map(k=>props(b,[k*.20,1.42,-2.45],g=>{
   cloth([[0,.06],[k*.22,.09],[k*.45,.23],[k*.57,.11],[k*.29,-.14],[k*.07,-.12]],'#8e4844',g);
   if(k<0)cloth([[-.44,.18],[-.54,.25],[-.70,.18],[-.78,-.02],[-.89,-.12],[-1.13,-.16],[-1.29,-.09],[-1.13,-.25],[-.91,-.31],[-.69,-.24],[-.55,-.04]],'#e9d1aa',g,.051);
   else{const leaf:number[][]=[[.49,.16]];for(let j=0;j<=12;j++){const a=.08+j*.19;leaf.push([.49+Math.cos(a)*.52,.16+Math.sin(a)*.52]);}
     cloth(leaf,'#ca925b',g,.047);for(let j=0;j<7;j++){const a=.1+j*.37;rod(b,'#6f5144',[.49,.16,.094],[.49+Math.cos(a)*.48,.16+Math.sin(a)*.48,.094],.011,g);}}
 }));
 const film=pairCards(b,st,['sleeve','fan'],.98,.67);
 for(const x of [-.41,.41])rod(b,wood,[x,.02,1.02],[0,.69,1.09],.04);b.box(iron,0,.78,1.07,.71,.48,.45);
 return(s,t)=>{arms.forEach((m,i)=>m.rotation.z=(i?1:-1)*(.10+s.wave*.54));actor.rotation.z=s.wave*.035;
 film.forEach((m,i)=>{m.visible=!!(s.mask&(1<<i));m.position.set(i?.52:-.52,.12+ease(s.end)*.82,.64-ease(s.end)*.59);m.rotation.x=ease(s.end)*1.04;});};
};
export const archive:Exhibit=(b,st)=>{
 floor(b,grain(st,'#a58a6a'));backdrop(b,'#b9ac91','#a09278');table(b,0,.59,-2.01,4.67,1.24);
 const box=props(b,[0,.69,-2.01],g=>{b.box('#8e6449',0,.36,0,2.42,.72,1.02,g);b.box(brass,0,.39,.539,.29,.28,.046,g);});
 const lid=props(b,[0,1.47,-2.49],g=>{b.box(wood,0,0,.49,2.47,.11,1.10,g);b.box(iron,0,.072,.53,.96,.033,.105,g);});
 const cards=pairCards(b,st,['round','diamond']);const seals=[-1,1].map(k=>b.box(ink(st,k<0?'round':'diamond','#be9b74','#8c5143'),k*.75,.09,-.73,.76,.065,.52,b.root));
 return(s,t,x,z)=>{const k=ease(s.end);lid.rotation.x=-(1-k)*1.02;cards.forEach((m,i)=>{const v=register(s,i,x,z);m.position.set(v[0]*(1-k),v[1]+k, v[2]-k*2.08);m.visible=k<.82;});
 seals.forEach((m,i)=>m.rotation.y=s.carry===i?.13*s.wave:0);};
};
export const studio:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#ac967c','#94826b'));const shade='#b6a186';for(let i=0;i<3;i++){const x=-2.27+i*2.27;
 b.box(shade,x,1.11,-3.27,2.20,2.22,.94);const top=b.cylinder(shade,x,2.23,-3.27,1.10,1.10,.94);top.rotation.x=Math.PI/2;
 b.box('#685f51',x,.75,-2.76,1.08,1.50,.09);b.oval('#685f51',x,1.52,-2.76,.54,.53,.05);}
 table(b,0,.62,-1.88,3.35,1.13);const mic=props(b,[0,.78,-1.82],g=>{rod(b,brass,[0,0,0],[0,.69,0],.061,g);b.oval(iron,0,1.00,0,.29,.39,.18,g);for(let i=0;i<5;i++)b.box(cream,0,.83+i*.079,.16,.36,.023,.026,g);});
 const record=props(b,[1.09,.77,-1.75],g=>{b.cylinder(iron,0,0,0,.43,.43,.068,g);b.cylinder(brass,0,.045,0,.13,.13,.018,g);});
 const strips=[-1,1].map(k=>sheet(b,st,k*.69,1.32,-2.62,1.08,.46,'wave'));
 return(s,t)=>{record.rotation.y=s.pin?t*1.53:0;strips.forEach((m,i)=>m.visible=!!(s.mask&(1<<i)));mic.rotation.z=s.end>=0?.033*Math.sin(s.end*13):0;};
};
export const station:Exhibit=(b,st)=>{
 floor(b,ripples(st,'#c6d2cb','#abbdb9'));for(let i=0;i<7;i++)peaked(b,i%2?'#afc1bd':'#cbd7ce',-5.67+i*1.88,.63,-4.45,2.98,1.47+(i%3)*.27,.43);
 for(const k of [-1,1]){const x=k*2.58;b.box('#9b7056',x,.58,-2.76,1.29,1.16,.91);b.box('#b1b5a4',x,1.22,-2.76,1.53,.15,1.0);b.box('#566c70',x,.68,-2.27,.61,.47,.05);}
 const base=b.box('#a29780',0,.24,-1.78,2.73,.48,1.36,b.root);
 const block=props(b,[0,.79,-1.78],g=>{b.box('#c5baa0',0,0,0,1.94,.66,.99,g);b.box(label(st,'#bcac83','长 城 站',iron),0,.03,.53,1.32,.39,.04,g);});
 rod(b,wood,[-2.91,0,-.78],[-2.91,2.30,-.78],.048);const flag=props(b,[-2.91,2.18,-.78],g=>folded(b,'#b87958',[[0,0,0],[.91,-.05,0],[.76,-.29,.02],[0,-.21,0]],g));
 return(s,t)=>{flag.scale.x=s.wave*.94;base.rotation.z=s.mask===1?.05:s.mask===2?-.05:0;block.position.y=1.39-.58*ease(s.end);block.visible=s.ready;};
};
