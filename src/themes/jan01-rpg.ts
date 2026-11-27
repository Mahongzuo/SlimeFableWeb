import * as T from 'three';
import type {Stage} from '../level/stage';
import type {ArenaEncounter} from '../templates/january-rpg';
import type {Vec} from '../slime/types';
import {Kit} from './folio-landmarks';

// A fictional goalie, spectators and training rink commemorating the game.
export function buildWinterRink(stage: Stage, root: T.Group, ice: T.CanvasTexture) {
  const paint=stage.toon('#ffffff');
  const k=new Kit({toon:paint,lit:paint,glass:paint,glow:paint,lamp:paint},'outdoor-ice');
  const navy='#243f52',brick='#a84943',linen='#eae4d4',brass='#c09461';
  // Open roof framing at the entrance keeps the chase camera clear.
  for(const side of [-1,1]){
    k.box(root,navy,side*2.55,1.47,8.65,.24,2.94,4.7);
    for(let i=0;i<5;i++){
      k.box(root,'#7c958b',side*2.38,1.46,6.57+i*.99,.09,2.92,.085);
      k.box(root,linen,side*2.39,.4,6.98+i*.86,.1,.32,.7);
    }
    k.beam(root,brass,[side*2.31,1.08,6.42],[side*2.31,1.08,10.85],.04);
  }
  for(const z of [7.1,8.7,10.3])k.box(root,navy,0,3.03,z,5.38,.18,.13);
  // Hockey mask, chest protector, catching glove, blocker and runner blades
  // each have their own silhouette, so the lateral tell reads at phone scale.
  const keeper=k.group(root,0,0,-7.8);
  const torso=k.group(keeper,0,.82,0);
  k.ball(torso,brick,0,.06,0,.6,.53,.34);
  k.box(torso,linen,0,-.1,.28,.84,.1,.085);
  k.ball(torso,linen,0,.72,.04,.34,.35,.30);
  k.ball(torso,navy,0,.75,.277,.26,.115,.086);
  for(const x of [-.16,0,.16])k.beam(torso,brass,[x,.81,.36],[x*.7,.54,.316],.014);
  for(const y of [.58,.67])k.beam(torso,brass,[-.18,y,.333],[.18,y,.333],.014);
  const gloves=[-1,1].map(side=>{
    const joint=k.group(torso,side*.44,.24,0);
    k.ball(joint,brick,side*.18,-.06,0,.26,.22,.2);
    if(side<0){
      k.ball(joint,brass,-.39,.02,.12,.275,.25,.145);
      k.ball(joint,'#785c40',-.43,.055,.234,.157,.13,.037);
    }else{
      k.box(joint,linen,.37,-.06,.15,.37,.4,.20);
      k.beam(joint,'#8c674b',[.43,-.10,.04],[.82,-.93,.31],.036);
      k.beam(joint,navy,[.82,-.93,.31],[1.10,-.93,.36],.058);
    }
    return joint;
  });
  for(const side of [-1,1]){
    k.box(keeper,linen,side*.3,.40,.06,.37,.55,.31);
    for(const y of [.30,.48])k.box(keeper,'#bac8c4',side*.3,y,.23,.33,.038,.035);
    k.box(keeper,navy,side*.33,.12,.08,.33,.18,.49);
    k.box(keeper,'#aabdc4',side*.33,.026,.10,.055,.048,.53);
  }
  // Flexible net, strung between the front posts and the low rear crossbar.
  const coords:number[]=[];
  const segment=(a:number[],b:number[])=>coords.push(...a,...b);
  for(let i=0;i<=18;i++){
    const x=-2.04+i*4.08/18;
    segment([x,1.42,-8.54],[x,1.03,-9.57]);segment([x,1.03,-9.57],[x,.06,-9.57]);
  }
  for(let i=0;i<=7;i++){
    const y=.06+i*.97/7;
    // Split rear mesh at each knot so the impact can bow near one post.
    for(let j=0;j<18;j++)segment([-2.04+j*4.08/18,y,-9.57],[-2.04+(j+1)*4.08/18,y,-9.57]);
    for(const side of [-1,1])segment([side*2.04,y*1.36,-8.54],[side*2.04,y,-9.57]);
  }
  const geo=new T.BufferGeometry(),positions=new T.Float32BufferAttribute(coords,3);
  geo.setAttribute('position',positions);
  root.add(new T.LineSegments(geo,new T.LineBasicMaterial({color:'#e7eeee'})));
  const crowd=k.group(root);
  for(const side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<19;i++){
    const x=side*(8.4+row*1.1),y=1.01+row*.63,z=-10.6+i*1.16+(row%2)*.31;
    const coat=[navy,brick,'#a58d61','#3e6368',linen][(i*3+row+(side+1))%5];
    k.ball(crowd,coat,x,y,z,.235,.30,.24);
    k.ball(crowd,'#bd9774',x,y+.32,z,.15,.15,.16);
    k.ball(crowd,coat,x,y+.43,z,.17,.095,.17);
    k.box(crowd,'#ddbe8d',x-side*.11,y+.17,z,.19,.07,.29);
  }
  k.flush();
  let lastX=Infinity,lastZ=Infinity,lastTrack=-1,lastPulse=0;
  const surface=ice.image as HTMLCanvasElement,ctx=surface.getContext('2d')!;
  const speed=new T.Vector2();
  function skateTrace(t:number,p:Vec) {
    if(t-lastTrack<.15)return;
    const dx=p[0]-lastX,dz=p[2]-lastZ,length=Math.hypot(dx,dz);
    if(length>.10&&length<1.6&&p[1]<.12){
      speed.set(dx,dz).normalize();
      ctx.strokeStyle='#fcffffb8';ctx.lineWidth=1.6;ctx.beginPath();
      for(const s of [-1,1]){
        const ox=s*speed.y*.13,oz=-s*speed.x*.13;
        ctx.moveTo(((lastX+ox)/13+.5)*surface.width,((lastZ+oz)/24+.5)*surface.height);
        ctx.lineTo(((p[0]+ox)/13+.5)*surface.width,((p[2]+oz)/24+.5)*surface.height);
      }
      ctx.stroke();ice.needsUpdate=true;
    }
    lastX=p[0];lastZ=p[2];lastTrack=t;
  }
  return {
    skateTrace,
    update(b:ArenaEncounter,t:number,shotAge:number,shotSide:number,goal:boolean,finale:number){
      const lane=b.blocked, clock=b.phase==='duel'?b.clock:0;
      const edge=T.MathUtils.smoothstep(clock,.22,.46), dive=T.MathUtils.smoothstep(clock,.46,.62);
      keeper.position.x=lane*(.18+edge*.58+dive*1.05);
      keeper.rotation.z=-lane*(.035+.29*dive);
      keeper.position.y=.04+.035*Math.sin(t*2.1)-dive*.08;
      torso.rotation.y=lane*(.04+.34*T.MathUtils.smoothstep(clock,0,.22));
      torso.rotation.z=lane*(-.04-.13*edge);
      gloves.forEach((g,i)=>{g.rotation.z=(i?1:-1)*(.07+(i===(lane>0?1:0)?.58:.2)*dive);});
      const pulse=goal&&shotAge>.74&&shotAge<1?Math.sin((shotAge-.74)/.26*Math.PI):0;
      if(pulse||lastPulse){
        for(let i=0;i<positions.count;i++){
          const x=coords[i*3],z=coords[i*3+2], weight=z<-9.55?Math.max(0,1-Math.abs(x-shotSide*1.15)/1.8):0;
          positions.setZ(i,z-weight*pulse*.25);
        }
        positions.needsUpdate=true;
      }
      lastPulse=pulse;
      crowd.position.y=finale?Math.min(.29,finale*.8):goal&&shotAge>.81&&shotAge<1?.24*Math.sin((shotAge-.81)/.19*Math.PI):0;
    },
  };
}
