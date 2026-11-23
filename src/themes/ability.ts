import * as T from 'three';
import {Kit,buildLandmark} from './folio-landmarks';
import type {AbilitySpec} from '../../content/levels/types';
import type {Layout,Puzzle} from '../templates/ability';
import type {Stage,StageLook} from '../level/stage';
import {rng} from '../templates/random';

const stone='#c8bb9c',copper='#ad7650',ink='#354652',cream='#ffedc2',mint='#72e1c6';
export function workshopLook(s:AbilitySpec):StageLook{
  const skies={ink:'#596470',score:'#44375c',orbit:'#1d2955',race:'#3a6279',atelier:'#6d5264',span:'#45665d',signal:'#375961',flight:'#355d78',field:'#4f705f',memorial:'#526d65'};
  const dark=skies[s.kind];
  return {skyTop:dark,skyHorizon:s.kind==='memorial'?'#bdd1bd':'#dbc6ab',fog:[24,72],sun:'#ffe6ba',sunIntensity:2.4,hemiSky:'#f9f5e4',hemiGround:dark,ink:dark,wash:'#d6cab1'};
}
export function workshopArt(stage:Stage,s:AbilitySpec,l:Layout){
  const r=rng(s.id),solid=new T.MeshStandardMaterial({roughness:.62,metalness:.17});
  const light=new T.MeshBasicMaterial(),kit=new Kit({toon:solid,glow:light,lamp:light,lit:solid,glass:new T.MeshStandardMaterial({transparent:true,opacity:.64})},s.id);
  const root=stage.scene,hero=kit.group(root,.6,-.1,-8,0,-.15),move=kit.group(hero),bridge=kit.group(root);
  const sprig=s.kind==='memorial',launch=s.id==='0804-2007';
  const deck={ink:'#b59877',score:'#997c76',orbit:'#6b8397',race:'#919c95',atelier:'#bb9d8a',span:'#a29576',signal:'#8eaaa8',flight:'#7d979d',field:'#9eaa83',memorial:'#acbaac'}[s.kind];
  const accent={ink:'#4f6667',score:'#644364',orbit:'#6f9bbc',race:'#be7355',atelier:'#986668',span:'#67796c',signal:'#4c8885',flight:'#517c91',field:'#647c5c',memorial:'#69887b'}[s.kind];
  const plume=kit.group(move,0,.12,0),striker=kit.group(hero,1.9,2.05,.28);
  if(launch){
    for(let i=0;i<15;i++){const a=i*2.4;kit.ball(plume,i%3===0?'#e99259':'#ffe7a6',Math.cos(a)*.12,-i*.13,Math.sin(a)*.12,.26-i*.012,.38,.26-i*.012,'glow');}
    kit.cyl(hero,ink,0,-.2,0,2.4,.45);kit.ring(hero,cream,0,.04,0,1.8,Math.PI/2);
    hero.scale.setScalar(.86);
    kit.cyl(move,'#79a9bc',0,2.95,0,.48,5.6);kit.cone(move,cream,0,6.1,0,.54,1.1);
    kit.cyl(move,cream,0,5.28,0,.54,.85);
    for(let i=0;i<9;i++){const a=i*.698;kit.cyl(move,cream,.53*Math.cos(a),1.33,.53*Math.sin(a),.13,2.46);}
    for(let j=0;j<7;j++){kit.box(hero,ink,-1.8,j+.4,0,.13,1,.13);kit.box(hero,copper,-2.6,j+.4,0,.13,1,.13);kit.beam(hero,cream,[-2.6,j,0],[-1.8,j+1,0],.047);kit.box(hero,stone,-2.18,j+.92,0,1.14,.12,.9);}
  }else if(sprig){
    for(const x of [-2.4,2.4])kit.box(hero,'#626b63',x,2,0,.35,4,.6);kit.box(hero,copper,0,4,0,5.5,.4,.75);
    kit.taper(move,'#677d72',0,2.35,0,1.28,1.9);kit.ring(move,copper,0,1.44,0,1.29,Math.PI/2);
    kit.beam(hero,ink,[0,3.2,0],[0,4,0],.1);
    kit.box(hero,'#69766e',0,-.25,.15,6.7,.5,3.1);kit.box(hero,'#a4ac93',0,-.06,.15,6.2,.18,2.8);
    kit.cyl(move,copper,0,1.29,0,.14,.5);kit.ball(move,ink,0,1.04,0,.21);
    for(const [height,rad] of [[1.58,1.25],[1.78,1.19],[2.74,.87],[2.91,.83]])kit.ring(move,copper,0,height,0,rad,Math.PI/2);
    for(let i=0;i<18;i++){const a=i*Math.PI/9;kit.ball(move,'#bc9c69',1.04*Math.cos(a),2.27,1.04*Math.sin(a),.06,.10,.06);}
    for(const x of [-2.4,2.4]){
      kit.box(hero,ink,x,.13,0,.58,.25,.78);kit.box(hero,copper,x,3.72,0,.7,.18,.71);
      kit.beam(hero,copper,[x,3.13,0],[x*.69,3.9,0],.095);
    }
    kit.beam(striker,'#826852',[-.71,0,.72],[.71,0,-.72],.17);
    for(const k of [-.6,.6])kit.beam(hero,'#8a8173',[1.9+k,2.05,.28-k],[1.9+k*.55,3.9,.28-k*.8],.027);
    for(const sign of [-1,1])for(let i=0;i<7;i++){
      const x=sign*(3.7+i*.64),z=-1.45-Math.sin(i*.3)*.32;
      kit.box(hero,i%2?'#819086':'#748679',x,.86,z,.61,1.75+i*.06,.4);
      for(let j=0;j<4;j++)kit.box(hero,'#a1aba0',x,.5+j*.26,z+.21,.38,.018,.016);
      kit.cyl(hero,'#b8bc99',x,.19,z+.49,.095,.22);kit.ball(hero,'#ffe9ba',x,.34,z+.49,.055,.09,.055,'glow');
    }
  }else{
    const shapes={score:['piano','record','opera'],race:['pulse','mast'],atelier:['studio','theatre'],orbit:['meridian','moon','kepler'],span:['eiffel'],ink:['post','studio'],signal:['bulb','arpanet'],flight:['x1'],field:['cauldron'],memorial:['gate']};
    const mini=kit.group(hero,0,0,0,0,0,0,.41);buildLandmark(kit,mini,r.pick(shapes[s.kind]));
  }
  // Foundation piers, brass inlay and routed deck panels make the playable edges legible.
  kit.box(root,'#6e979d',0,-3.55,-9,95,.12,85);
  for(let i=0;i<130;i++)kit.box(root,i%3?'#85a6a5':'#adc3b7',r.range(-29,29),-3.47,-38+(i+r.range(.12,.88))*51/130,r.range(.4,2.9),.014,.034);
  for(const g of l.world.surfaces){
    const w=g.max[0]-g.min[0],d=g.max[1]-g.min[1],z=(g.max[1]+g.min[1])/2;
    // The deck overhangs the pier foundation. Their vertical sides must not share a plane.
    kit.box(root,ink,0,g.height-.42,z,w-.12,.75,d-.12);kit.box(root,deck,0,g.height-.06,z,w,.12,d);
    for(const sign of [-1,1]){
      const x=sign*4.12;
      kit.box(root,accent,x,g.height+.006,z,.39,.012,d-.08);
      kit.box(root,cream,x-sign*.26,g.height+.009,z,.028,.013,d-.11);
      for(const cap of [g.min[1]+.45,g.max[1]-.45]){
        kit.cyl(root,ink,x,-1.65,cap,.24,3.35);kit.cyl(root,copper,x,-.52,cap,.3,.13);
      }
    }
    for(let seam=g.min[1]+.48;seam<g.max[1]-.1;seam+=.74){
      for(const x of [-3.3,3.3]){kit.box(root,accent,x,g.height+.012,seam,.9,.012,.022);kit.cyl(root,cream,x+.25,g.height+.02,seam,.034,.014);}
    }
    for(let j=0;j<d*2;j++)kit.box(root,cream,-4.68,g.height+.005,g.min[1]+j*.5,.24,.012,.055);
  }
  if(s.mode==='relay'){for(let i=0;i<11;i++)kit.box(bridge,i%3===0?copper:stone,0,-.09,-1.05+i*.21,2,.18,.2);}
  if(s.mode==='climb'){kit.box(root,ink,0,.9,-2.75,3.4,1.8,3.5);for(let i=0;i<6;i++)kit.box(root,copper,0,.16+i*.29,-.98,1.3,.07,.05);}
  if(s.mode==='tide'){kit.box(root,'#69b9bb',0,-.11,-.6,10,.024,4);for(let i=0;i<28;i++)kit.box(root,'#c4e9d9',r.range(-4.8,4.8),-.085,r.range(-2.5,1.3),r.range(.15,.56),.012,.03);}
  for(const v of [l.end,...(s.mode==='circuit'||s.mode==='tide'?[l.first]:[])]){kit.ring(root,cream,v[0],v[1]+.055,v[2],.76,Math.PI/2,0,'glow');for(const x of [-1,1])kit.cyl(root,copper,v[0]+x*.64,v[1]+.12,v[2],.11,.24);}
  if(s.mode==='tide')for(const [x,y,z] of l.buoy){kit.ring(root,mint,x,y+.24,z,.63,Math.PI/2);kit.ball(root,cream,x+.58,.12,z,.12);}
  const lamps=l.pads.map(([x,,z])=>{
    const group=kit.group(root,x,0,z);group.visible=['duet','relay'].includes(s.mode);
    kit.cyl(group,copper,0,.055,0,.7,.11);kit.ring(group,cream,0,.13,0,.63,Math.PI/2,0,'glow');
    const bulb=new T.Mesh(new T.SphereGeometry(.15,14,10),new T.MeshBasicMaterial({color:'#b68e61'}));bulb.position.set(.52,.38,0);group.add(bulb);return {group,bulb};
  });if(s.mode==='relay')lamps[1].group.position.set(l.end[0],l.end[1],l.end[2]);
  const flowers=l.marks.map(([x,,z])=>{const g=kit.group(root,x,0,z);kit.cyl(g,'#648370',0,.24,0,.035,.45);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;kit.ball(g,sprig?'#fffcef':'#f5c575',.12*Math.cos(a),.52,.12*Math.sin(a),.13,.07,.13);}
    kit.ball(g,copper,0,.56,0,.08);return g;});
  for(let i=0;i<70;i++){const x=r.range(-26,26),z=r.range(-38,-17),h=r.range(1.4,sprig?3.9:5.2);
    kit.rock(root,i%2?'#77918c':'#949d93',x,-2,z,h,h*.79,h*.8,i);
    if(i%3===0){const base=h*.79-2;kit.cyl(root,copper,x,base+.3,z,.13,.8);kit.cone(root,'#647f73',x,base+.61+h*.22,z,.62+h*.09,h*.58);}}
  for(const side of [-1,1])for(let i=0;i<10;i++){const z=4.7-i*1.06;if(s.mode==='relay'&&Math.abs(z)<1.2)continue;
    kit.box(root,ink,side*4.67,.24,z,.16,.47,.14);kit.ball(root,cream,side*4.67,.52,z,.09,.09,.09,'glow');}
  // Each workshop leaves a different silhouette behind the controls.
  if(s.kind==='score'){
   for(let row=0;row<5;row++)kit.beam(hero,copper,[-4,.65+row*.24,.35],[4,.65+row*.24,.35],.018);
   for(let i=0;i<9;i++){const x=-3.7+i*.86,y=.75+r.int(0,5)*.17;kit.ball(hero,cream,x,y,.36,.13,.075,.075);kit.beam(hero,cream,[x+.1,y,.36],[x+.1,y+.54,.36],.024);}
  }else if(s.kind==='orbit'){
   for(let i=0;i<3;i++)kit.ring(hero,i%2?cream:copper,0,1.7,0,2.1+i*.32,.45+i*.49,.4+i*.7,'glow');
  }else if(s.kind==='race'){
   for(let i=0;i<12;i++)for(let j=0;j<2;j++)kit.box(hero,(i+j)%2?ink:cream,i*.53-3.1,2.8+j*.42,0,.53,.42,.08);
   for(const x of [-3.45,3.1])kit.cyl(hero,copper,x,1.45,0,.07,3.3);
  }else if(s.kind==='ink'||s.kind==='atelier'){
   for(let i=0;i<3;i++){const x=-3.5+i*3.3;kit.box(hero,copper,x,.95,-.6,1.12,1.48,.11);kit.box(hero,cream,x,.95,-.52,.96,1.3,.04);
    for(let row=0;row<4;row++)kit.box(hero,accent,x,.59+row*.23,-.482,r.range(.25,.73),s.kind==='ink'?.035:.12,.02);}
  }
  const halo=kit.group(hero,0,1,0);
  for(let i=0;i<(sprig?38:85);i++){const a=i*.53,rad=1.2+i*.024;kit.ball(halo,sprig||i%3?cream:mint,rad*Math.cos(a),i*(sprig?.082:.049),rad*Math.sin(a),.035,.066,.035,'glow');}
  kit.flush();
  return {update(p:Puzzle,t:number,finale:number){
    bridge.visible=p.contact[0];lamps.forEach(({bulb},i)=>bulb.material.color.set((s.mode==='relay'&&i===1?p.step>=2:p.contact[i])?mint:'#b68e61'));
    flowers.forEach((g,i)=>{g.visible=s.mode==='duet'&&!(p.flowers&(1<<i));g.rotation.y=t*.4;});
    halo.visible=finale>0;halo.rotation.y=finale*.7;halo.scale.setScalar(.4+Math.min(1,finale));
    plume.visible=launch&&finale>0;if(launch){move.position.y=finale*finale*.67;plume.scale.y=.7+.32*Math.sin(t*39);}else if(sprig){move.rotation.z=.14*Math.sin(finale*5)*Math.exp(-finale*.7);striker.position.x=1.9-.24*Math.sin(finale*5)*Math.exp(-finale*.6);}
  }};
}
