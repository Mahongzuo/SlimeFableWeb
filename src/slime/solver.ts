import {CannonImpact,CannonLaunchSpec,firstBattleContact,FrameInput,ShotView,Vec,cannonPositionAt,clamp,distance,mix,smooth,solveCannonLaunch} from './types';
import {advanceGlideForm,UMBRELLA} from './umbrella';
import {CollisionWorld,flatWorld} from './world';

export interface Particle {p:Vec;old:Vec;v:Vec;rest:Vec;group:number;lambda:number;flat?:Vec}
interface Shot {
  id:number;phase:ShotView['phase'];center:Vec;v:Vec;start:Vec;target:Vec;
  age:number;phaseAge:number;radius:number;grounded:boolean;umbrella:boolean;glideAmount:number;
  cannon?:CannonLaunchSpec;
}
const SPACING=.046,H=SPACING*2.4,H2=H*H;
const POLY=315/(64*Math.PI*Math.pow(H,9)),SPIKY=45/(Math.PI*Math.pow(H,6));
const kernel=(r2:number)=>r2>=H2?0:POLY*Math.pow(H2-r2,3);
let restDensity=0;for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)for(let z=-3;z<=3;z++)restDensity+=kernel((x*x+y*y+z*z)*SPACING*SPACING);
const pressureDenom=kernel((.2*H)**2);
const gridKey=(x:number,y:number,z:number)=>(x+1024)*4194304+(y+1024)*2048+z+1024;

// UE Dome / Bell shape defaults: round glossy dome top + smooth flared skirt from surface.ts
const DOME = {widthScale: 1.14, heightScale: 0.86, upwardRestore: 0.72, anchorHeightScale: 0.84};

/** PBF density/XSPH/pressure/membrane port of UE FSlimeSolver with Dome/Ball shape, snappy anchor spring & cannon launch. */
export class SlimeSolver {
 particles:Particle[]=[]; shots:Shot[]=[];center:Vec=[0,.2,0];centerVelocity:Vec=[0,0,0];nextId=1;time=0;spread=0;grounded=true;foot:Vec=[3,0,19];
 shapeBlend=1;
 ridePlane:{point:Vec;normal:Vec}|null=null;
 private impacts:CannonImpact[]=[];
 takeImpacts(){return this.impacts.splice(0)}
 private inertiaForward:Vec=[0,0,-1];private inertiaAmount=0;
 private neighbors:number[][]=[];private grid=new Map<number,number[]>();private restCenterY=.20;
 constructor(foot:Vec=[0,0,0],public readonly world:CollisionWorld=flatWorld){this.reset(foot)}
 private lattice(count:number):Vec[]{const candidates:{p:Vec;d:number}[]=[];for(let x=-10;x<=10;x++)for(let y=-10;y<=10;y++)for(let z=-10;z<=10;z++){let p:Vec=[x*SPACING,y*SPACING*.92,z*SPACING];candidates.push({p,d:p[0]**2+p[2]**2+(p[1]*1.05)**2})}candidates.sort((a,b)=>a.d-b.d);let pts=candidates.slice(0,count).map(v=>v.p);let cy=pts.reduce((s,p)=>s+p[1],0)/count;return pts.map(p=>[p[0],p[1]-cy,p[2]] as Vec)}
 reset(foot:Vec){this.shots=[];this.impacts.length=0;this.foot=[...foot];this.spread=0;this.shapeBlend=1;this.ridePlane=null;this.restCenterY=.20;const startY=this.restCenterY*DOME.anchorHeightScale;this.center=[foot[0],foot[1]+startY,foot[2]];this.centerVelocity=[0,0,0];this.inertiaForward=[0,0,-1];this.inertiaAmount=0;this.particles=this.lattice(384).map((rest,index)=>{const p=rest.map((v,i)=>v+this.center[i]) as Vec;const r=1.30*Math.sqrt((index+.5)/384),angle=index*2.399963229728653;return {p,old:[...p],v:[0,0,0],rest,flat:[Math.cos(angle)*r,0,Math.sin(angle)*r] as Vec,group:0,lambda:0}});this.nextId=1;this.time=0}

 launch(target:Vec,forward:Vec,cannon?:CannonLaunchSpec):boolean {
  if(this.shots.length>=5)return false;
  const id=this.nextId++,radius=.27*Math.cbrt(.3);
  const out:Vec=cannon?[...cannon.muzzle]:[this.center[0]+forward[0]*.58,this.center[1]+.08,this.center[2]+forward[2]*.58];
  const sepStart:Vec=cannon?[...cannon.start]:[...this.center];
  const s:Shot={id,phase:'separating',center:[...sepStart],v:[0,0,0],start:out,target:[...target],age:0,phaseAge:0,radius,grounded:false,umbrella:false,glideAmount:0,cannon};
  const rest=this.lattice(115);
  for(const r of rest){const p=r.map((v,k)=>v+sepStart[k]) as Vec;this.particles.push({p,old:[...p],v:[0,0,0],rest:r,group:id,lambda:0})}
  this.shots.push(s);return true;
 }

 private shotStep(dt:number,input:FrameInput){
  const gone=new Set<number>();
  for(const s of this.shots){
   s.age+=dt;s.phaseAge+=dt;const prev:Vec=[...s.center];
   if(input.recalling&&s.phase!=='returning'&&s.phase!=='merging'){s.phase='returning';s.phaseAge=0;s.start=[...s.center]}
   if(s.phase==='separating'){
    s.umbrella=false;
    const t=smooth(s.phaseAge/.22);
    const origin=s.cannon?s.cannon.start:this.center;
    s.center=[mix(origin[0],s.start[0],t),mix(origin[1],s.start[1],t),mix(origin[2],s.start[2],t)];
    if(s.phaseAge>=.22){
     s.phase='flying';s.phaseAge=0;
     if(s.cannon){
      s.start=[...s.center];
      s.v=[...s.cannon.velocity];
     }else{
      const d=distance(s.center,s.target),flight=clamp(d/12,.28,1.2);
      s.v=[(s.target[0]-s.center[0])/flight,(s.target[1]-s.center[1])/flight+4.9*flight,(s.target[2]-s.center[2])/flight];
     }
    }
   }else if(s.phase==='flying'){
    s.umbrella=false;
    let next:Vec;
    if(s.cannon){
     next=cannonPositionAt(s.start,s.cannon.velocity,s.cannon.gravity,s.phaseAge);
     s.v=[s.cannon.velocity[0],s.cannon.velocity[1]-s.cannon.gravity*s.phaseAge,s.cannon.velocity[2]];
    }else{
     s.v[1]-=9.8*dt;
     next=s.center.map((v,k)=>v+s.v[k]*dt) as Vec;
    }
    const hit=this.world.cast(s.center,next,s.radius*.45);
    const contact=input.battleTargets?.length&&s.cannon?firstBattleContact(s.center,next,s.radius,input.battleTargets,hit?.t??Infinity):null;
    if(contact){
     s.center=contact.center;s.phase='active';s.phaseAge=0;s.v=[0,0,0];
     this.impacts.push({shotId:s.id,targetId:contact.id,point:contact.point,element:s.cannon!.element??0});
     if(s.cannon!.burstOnEnemy){gone.add(s.id);continue;}
    }else if(hit){
     if(input.battleTargets&&s.cannon)this.impacts.push({shotId:s.id,targetId:null,point:[...hit.point],element:s.cannon.element??0});
     s.center=hit.point;
     const floor=this.world.support(s.center[0],s.center[2],s.center[1]+.4);
     if(floor!==null)s.center[1]=Math.max(s.center[1],floor+s.radius*.65);
     s.v=[0,0,0];s.grounded=floor!==null;s.phase='active';s.phaseAge=0;
    }else s.center=next;
    if(s.center[1]<-8||s.age>7){s.phase='returning';s.phaseAge=0}
   }else if(s.phase==='active'){
    s.umbrella=false;
    if(distance(s.center,this.center)<.45&&s.age>.6){s.phase='merging';s.phaseAge=0;s.start=[...s.center]}
    else if(s.age>7&&!s.cannon?.burstOnEnemy){s.phase='returning';s.phaseAge=0}
   }else if(s.phase==='returning'){
    const target:Vec=[...this.center];
    const floor=this.world.support(s.center[0],s.center[2],s.center[1]+.3);
    const heightAbove=floor===null?99:s.center[1]-floor;
    // UE shot umbrella: high airborne returning mini-slime opens its own canopy unless actively force-recalled.
    const useUmbrella=!input.recalling&&heightAbove>UMBRELLA.shotOpenHeight&&s.center[1]>this.center[1]+.35;
    s.umbrella=useUmbrella;
    if(useUmbrella){
     const dx=target[0]-s.center[0],dz=target[2]-s.center[2],hd=Math.hypot(dx,dz);
     if(hd>.001){
      const stepH=Math.min(hd,UMBRELLA.shotFollowSpeed*dt);
      s.center[0]+=(dx/hd)*stepH;s.center[2]+=(dz/hd)*stepH;
     }
     const dy=Math.max(0,s.center[1]-target[1]);
     const fall=clamp(UMBRELLA.shotFallSpeed+dy*.35,UMBRELLA.shotFallSpeed,UMBRELLA.shotMaxFallSpeed);
     s.center[1]-=fall*dt;
    }else{
     const d=distance(s.center,target),step=Math.min(d,clamp(d*2.8,.45,8.0)*dt);
     if(d>.001)for(let k=0;k<3;k++)s.center[k]+=(target[k]-s.center[k])*step/d;
    }
    const dNow=distance(s.center,target);
    // Align with UE AbsorbMergeRadius (~0.45m): merge only once close to the body surface
    if(dNow<.46||s.phaseAge>7){s.phase='merging';s.phaseAge=0;s.start=[...s.center];s.umbrella=false}
   }else if(s.phase==='merging'){
    s.umbrella=false;
    const t=smooth(s.phaseAge/1.8);
    s.center=s.start.map((v,k)=>mix(v,this.center[k],t)) as Vec;
    if(s.phaseAge>1.8)gone.add(s.id);
   }
   s.v=s.phase==='flying'?s.v:s.center.map((v,k)=>(v-prev[k])/dt) as Vec;
  }
  if(gone.size){this.shots=this.shots.filter(s=>!gone.has(s.id));this.particles=this.particles.filter(p=>!gone.has(p.group))}
 }

 private buildNeighbors(){this.grid.clear();const ps=this.particles;for(let i=0;i<ps.length;i++){const p=ps[i].p,x=Math.floor(p[0]/H),y=Math.floor(p[1]/H),z=Math.floor(p[2]/H),key=gridKey(x,y,z);let bucket=this.grid.get(key);if(!bucket)this.grid.set(key,bucket=[]);bucket.push(i)}this.neighbors.length=ps.length;for(let i=0;i<ps.length;i++){const a=ps[i];let list=this.neighbors[i];if(!list)this.neighbors[i]=list=[];list.length=0;const x=Math.floor(a.p[0]/H),y=Math.floor(a.p[1]/H),z=Math.floor(a.p[2]/H);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const cell=this.grid.get(gridKey(x+dx,y+dy,z+dz));if(!cell)continue;for(const j of cell){if(a.group!==ps[j].group)continue;const b=ps[j].p,r2=(a.p[0]-b[0])**2+(a.p[1]-b[1])**2+(a.p[2]-b[2])**2;if(r2<H2)list.push(j)}}}}
 /** UE SetClingPlane: the wall plane replaces the floor; particles near it are drawn into a flat contact patch. */
 private clingPlane(p:Vec,cl:{point:Vec;normal:Vec}){const n=cl.normal,d=(p[0]-cl.point[0])*n[0]+(p[2]-cl.point[2])*n[2],r=SPACING*.48;if(d<r){p[0]+=n[0]*(r-d);p[2]+=n[2]*(r-d)}else if(d<r+.1){const pull=(d-r)*.35;p[0]-=n[0]*pull;p[2]-=n[2]*pull}}
 /** Hard one-sided plane constraint for moving/tilted seats (e.g. swing plank) so jelly sits flush and never clips underneath. */
 private ridePlaneProject(p:Vec,rp:{point:Vec;normal:Vec}){const n=rp.normal,d=(p[0]-rp.point[0])*n[0]+(p[1]-rp.point[1])*n[1]+(p[2]-rp.point[2])*n[2],r=SPACING*.48;if(d<r){const push=r-d;p[0]+=n[0]*push;p[1]+=n[1]*push;p[2]+=n[2]*push}}

 step(dt:number,input:FrameInput){
  dt=Math.min(dt,1/60);
  const cl=input.cling??null;
  const rp=input.ridePlane??null;
  this.ridePlane=rp?{point:[...rp.point],normal:[...rp.normal]}:null;
  this.time+=dt;this.spread=input.spread;this.grounded=input.grounded;this.foot=[...input.anchor];
  const rawShape=input.shapeBlend??1;
  this.shapeBlend=clamp(rawShape,0,1);
  // Dome relaxes gently toward ball in mid-air / while clinging so jumps read springy and elastic.
  const effectiveDome=smooth(this.shapeBlend)*(1-this.spread)*(cl?0:input.grounded?1:.18);
  const jumpStretch=clamp(input.jumpStretch??0,0,1);
  const airBounce=clamp(input.airBounce??0,0,1);
  this.shotStep(dt,input);
  const bodyGlide=smooth(input.glideAmount??0);
  for(const shot of this.shots)shot.glideAmount=advanceGlideForm(shot.glideAmount,shot.umbrella,dt);


  const ps=this.particles;
  const domeAnchorY=this.restCenterY*mix(1,DOME.anchorHeightScale,effectiveDome);
  const rideOff=mix(domeAnchorY,.035,input.spread);
  const desired:Vec=rp
   ?[input.anchor[0]+rp.normal[0]*rideOff,input.anchor[1]+rp.normal[1]*rideOff,input.anchor[2]+rp.normal[2]*rideOff]
   :[input.anchor[0],input.anchor[1]+rideOff,input.anchor[2]];
  if(rp){
   // Unconditionally stable exponential follow while riding a moving seat (zero Euler Nyquist jitter!)
   const follow=1-Math.exp(-dt*24);
   for(let k=0;k<3;k++){
    const prev=this.center[k];
    this.center[k]=mix(prev,desired[k],follow);
    this.centerVelocity[k]=clamp((this.center[k]-prev)/Math.max(dt,1/240),-6,6);
   }
  }else{
   // Snappier spring eliminates perceived lag while preserving jelly follow-through.
   const freq=input.grounded?5.4:6.8;
   const w=2*Math.PI*freq;
   for(let k=0;k<3;k++){
    const damp=k===1&&!input.grounded?1.05:.92;
    this.centerVelocity[k]+=(w*w*(desired[k]-this.center[k])-2*damp*w*this.centerVelocity[k])*dt;
    this.center[k]+=this.centerVelocity[k]*dt;
   }
   const maxLag=.18;
   for(let k=0;k<3;k++)this.center[k]=clamp(this.center[k],desired[k]-maxLag,desired[k]+maxLag);
  }

  // UE InertiaStretch (0.55) / InertiaResponse (10)
  const hSpeed=Math.hypot(input.velocity[0],input.velocity[2]);
  const targetInertia=clamp(hSpeed/4.2,0,1)*.55;
  const alpha=1-Math.exp(-dt*10);
  this.inertiaAmount=mix(this.inertiaAmount,targetInertia,alpha);
  if(hSpeed>.15){
   const nx=input.velocity[0]/hSpeed,nz=input.velocity[2]/hSpeed;
   const ix=mix(this.inertiaForward[0],nx,alpha),iz=mix(this.inertiaForward[2],nz,alpha);
   const il=Math.hypot(ix,iz)||1;
   this.inertiaForward=[ix/il,0,iz/il];
  }
  const stretch=1+this.inertiaAmount*.36;
  const sidePinch=1-this.inertiaAmount*.12;
  const f=hSpeed>.15?this.inertiaForward:input.forward;

  const shotMap=new Map(this.shots.map(s=>[s.id,s]));
  let attract:Shot|undefined,attraction=0;
  for(const shot of this.shots){
   if(shot.phase!=='returning'&&shot.phase!=='merging')continue;
   const d=distance(shot.center,this.center),a=smooth((.62-d)/.24)*(shot.phase==='merging'?1-smooth(shot.phaseAge/1.8):1);
   if(a>attraction){attraction=a;attract=shot}
  }

  const domeWidth=mix(1,DOME.widthScale,effectiveDome);
  const domeHeight=mix(1,DOME.heightScale,effectiveDome);
  const upwardRestore=mix(1,DOME.upwardRestore,effectiveDome);
  const waveNorm=input.waterNormal??null;
  const tiltNorm=rp?rp.normal:waveNorm;
  const ignoreFluid=!!waveNorm||!!input.submerged;
  // Build tilted surface orthonormal frame so the slime naturally pitches & rolls on swells or a swinging seat
  let wUpX=0,wUpY=1,wUpZ=0,wRx=1,wRy=0,wRz=0,wFx=0,wFy=0,wFz=1;
  const hasSurfaceTilt=!!tiltNorm&&(Math.abs(tiltNorm[0])>1e-4||Math.abs(tiltNorm[2])>1e-4);
  if(hasSurfaceTilt&&tiltNorm){
   const scale=rp?1.0:.85;
   const tx=tiltNorm[0]*scale,tz=tiltNorm[2]*scale,ty=Math.max(.35,tiltNorm[1]),tl=Math.hypot(tx,ty,tz)||1;
   wUpX=tx/tl;wUpY=ty/tl;wUpZ=tz/tl;
   // Right = normalize(cross(wUp, [0,0,1])) = [wUpY, -wUpX, 0] / len
   const rl=Math.hypot(wUpY,wUpX)||1;
   wRx=wUpY/rl;wRy=-wUpX/rl;wRz=0;
   // Forward = cross(wR, wUp)
   wFx=wRy*wUpZ-wRz*wUpY;wFy=wRz*wUpX-wRx*wUpZ;wFz=wRx*wUpY-wRy*wUpX;
  }
  const waveHeave=waveNorm?clamp((input.waterWaveVelY??0)*.085,-.10,.10):0;

  for(const p of ps){
   p.old=[...p.p];
   const s=p.group?shotMap.get(p.group):null;
   const c=s?s.center:this.center;
   let rx=p.rest[0],ry=p.rest[1],rz=p.rest[2];
   let sx=p.group?1:domeWidth,sy=p.group?1:mix(domeHeight,.035,input.spread);
   if(!s&&p.flat){
    rx=mix(rx*domeWidth,p.flat[0],input.spread);
    rz=mix(rz*domeWidth,p.flat[2],input.spread);
    sx=1;
   }
   if(s?.phase==='merging'){
    const shrink=1-smooth(s.phaseAge/1.8)*.9;
    rx*=shrink;ry*=shrink;rz*=shrink;
   }
   if(!s&&attract){
    const dx=attract.center[0]-this.center[0],dz=attract.center[2]-this.center[2],d=Math.hypot(dx,dz)||1,restLength=Math.hypot(rx,rz)||1,facing=Math.max(0,(rx*dx+rz*dz)/(restLength*d)),lobe=Math.pow(facing,3)*attraction;
    rx+=dx/d*.10*lobe;rz+=dz/d*.10*lobe;ry+=.018*lobe;
   }
   // Forward stretch & gentle lateral pinch along movement direction
   const localForward=rx*f[0]+rz*f[2];
   const localSide=rx*f[2]-rz*f[0];
   rx=f[0]*localForward*stretch+f[2]*localSide*sidePinch;
   rz=f[2]*localForward*stretch-f[0]*localSide*sidePinch;

   // Jump vertical stretch / mid-air double-jump "duang"
   if(!s){
    if(jumpStretch>0){sy*=1+jumpStretch*.38;sx*=1-jumpStretch*.14}
    if(airBounce>0){const wave=Math.sin(airBounce*Math.PI);sy*=1-wave*.22;sx*=1+wave*.16}
    if(input.pose.active){
     const side=rx*f[2]-rz*f[0],fw=rx*f[0]+rz*f[2];
     rx=f[0]*fw*input.pose.stretch[0]+f[2]*side*input.pose.stretch[2];
     rz=f[2]*fw*input.pose.stretch[0]-f[0]*side*input.pose.stretch[2];
     sy*=input.pose.stretch[1]*(1-input.pose.flatten*.6);sx*=1+input.pose.pulse*.20;
    }
    if(input.impact>0){sy*=1-Math.min(input.impact,.55);sx*=1+Math.min(input.impact,.5)*.38}
    if(cl){const n=cl.normal,dn=rx*n[0]+rz*n[2];rx-=n[0]*dn*.5;rz-=n[2]*dn*.5;rx+=-n[0]*.06;rz+=-n[2]*.06;sy=Math.max(sy,1.15)}
   }

   const glide=s?smooth(s.glideAmount):bodyGlide;
   if(glide>0){
    // Fan the same rest lattice into a shallow, scalloped vault; each lobe stays joined to its neighbours.
    const radius=s?s.radius*.76:.205;
    const radial=Math.min(1.12,Math.hypot(p.rest[0],p.rest[2])/radius);
    const rim=radial*radial,flute=Math.cos(6*Math.atan2(p.rest[2],p.rest[0]));
    const crown=.78-1.27*rim+.30*Math.exp(-11*rim);
    const lip=.20*rim*flute;
    sx=mix(sx,2.16+.09*rim*flute,glide);
    ry=mix(ry*sy,p.rest[1]*(.34-.10*Math.min(1,rim))+radius*(crown+lip),glide);
    sy=1;
   }
   let ox=rx*sx,oy=ry*sy,oz=rz*sx;
   if(!s&&tiltNorm){
    // Soft vertical heave squash/stretch on waves + tilt along wave slope or swinging seat plane
    if(waveNorm&&!rp){oy*=1-waveHeave;ox*=1+waveHeave*.42;oz*=1+waveHeave*.42;}
    if(hasSurfaceTilt){
     const nx=wRx*ox+wUpX*oy+wFx*oz;
     const ny=wRy*ox+wUpY*oy+wFy*oz;
     const nz=wRz*ox+wUpZ*oy+wFz*oz;
     ox=nx;oy=ny;oz=nz;
    }
   }
   const target:Vec=[c[0]+ox,c[1]+oy,c[2]+oz];
   if(!s&&input.grounded&&!waveNorm&&!rp){
    const localFloor=this.world.support(target[0],target[2],input.anchor[1]+.05,ignoreFluid);
    const drop=input.anchor[1]-(localFloor??input.anchor[1]-1);
    if(drop>.08){
     const lower=clamp((.18-ry)/.36,0,1);
     target[1]-=Math.min(.35,drop)*(.35+.65*lower);
     target[1]=Math.max(target[1],input.anchor[1]-.35+.023);
    }else if(input.spread>.2&&localFloor!==null)target[1]=mix(target[1],localFloor+.028,input.spread);
   }

   for(let k=0;k<3;k++){
    let stiffness=(s?380:140)*(1+.72*glide);
    if(!s&&k===1&&p.p[1]<target[1])stiffness*=upwardRestore;
    const carrier=s?s.v[k]:this.centerVelocity[k];
    const acc=(target[k]-p.p[k])*stiffness+(carrier-p.v[k])*(s?26:16)+(k===1&&!s&&!input.submerged?-2.2:0);
    p.v[k]=clamp(p.v[k]+acc*dt,-16,16);
    p.p[k]+=p.v[k]*dt;
   }
   if(!s||s.grounded)this.world.projectPoint(p.p,SPACING*.48,ignoreFluid);
   if(!s&&cl)this.clingPlane(p.p,cl);
   if(!s&&rp)this.ridePlaneProject(p.p,rp);
  }

  // Spread lateral compression for density solve
  const lateral=mix(1,2.2,input.spread);
  if(lateral>1.001)for(const p of ps)if(!p.group){p.p[0]=this.center[0]+(p.p[0]-this.center[0])/lateral;p.p[2]=this.center[2]+(p.p[2]-this.center[2])/lateral;}
  this.buildNeighbors();
  for(let iteration=0;iteration<2;iteration++){
   for(let i=0;i<ps.length;i++){const a=ps[i];let density=0,gx=0,gy=0,gz=0,sum=0;for(const j of this.neighbors[i]){const b=ps[j],dx=a.p[0]-b.p[0],dy=a.p[1]-b.p[1],dz=a.p[2]-b.p[2],r2=dx*dx+dy*dy+dz*dz;density+=kernel(r2);if(i===j||r2<1e-10||r2>=H2)continue;const r=Math.sqrt(r2),g=-SPIKY*(H-r)**2/(r*restDensity),x=dx*g,y=dy*g,z=dz*g;gx+=x;gy+=y;gz+=z;sum+=x*x+y*y+z*z}sum+=gx*gx+gy*gy+gz*gz;const constraint=Math.max(density/restDensity-1,-.05);a.lambda=clamp(-constraint/(sum+1e-4),-.0006,.0006)}
   const deltas:Vec[]=new Array(ps.length);
   for(let i=0;i<ps.length;i++){const a=ps[i];let x=0,y=0,z=0;for(const j of this.neighbors[i]){if(j===i)continue;const b=ps[j],dx=a.p[0]-b.p[0],dy=a.p[1]-b.p[1],dz=a.p[2]-b.p[2],r2=dx*dx+dy*dy+dz*dz;if(r2<1e-10||r2>=H2)continue;const r=Math.sqrt(r2),ratio=kernel(r2)/pressureDenom,corr=-.0000064*Math.pow(ratio,4),g=-SPIKY*(H-r)**2/(r*restDensity)*(a.lambda+b.lambda+corr);x+=dx*g;y+=dy*g;z+=dz*g}const mag=Math.hypot(x,y,z),sc=mag>.012?.012/mag:1;deltas[i]=[x*sc,y*sc,z*sc]}
   for(let i=0;i<ps.length;i++){for(let k=0;k<3;k++)ps[i].p[k]+=deltas[i][k];const s=shotMap.get(ps[i].group);if((!s&&lateral<=1.001)||s?.grounded)this.world.projectPoint(ps[i].p,SPACING*.48,ignoreFluid);if(!s&&rp)this.ridePlaneProject(ps[i].p,rp);}
  }
  if(lateral>1.001)for(const p of ps)if(!p.group){p.p[0]=this.center[0]+(p.p[0]-this.center[0])*lateral;p.p[2]=this.center[2]+(p.p[2]-this.center[2])*lateral;this.world.projectPoint(p.p,SPACING*.48,ignoreFluid);if(rp)this.ridePlaneProject(p.p,rp);}

  // Hard ellipsoid membrane prevents spray while keeping the Dome/Ball silhouette.
  for(const p of ps){
   const s=shotMap.get(p.group),c=s?s.center:this.center;
   const shrink=s?.phase==='merging'?1-smooth(s.phaseAge/1.8)*.9:1;
   const bodyRx=mix(.29*domeWidth,1.485,input.spread)+attraction*.22;
   const bodyRy=mix(.28*domeHeight,.05,input.spread)*(1+jumpStretch*.32);
   const axes:Vec=s?[s.radius*1.18*shrink,s.radius*.95*shrink,s.radius*1.18*shrink]:[bodyRx,bodyRy,bodyRx];
   if(!s&&input.pose.active){axes[0]*=Math.max(input.pose.stretch[0],input.pose.stretch[2]);axes[2]*=Math.max(input.pose.stretch[0],input.pose.stretch[2]);axes[1]*=input.pose.stretch[1]}
   const glide=s?smooth(s.glideAmount):bodyGlide;
   axes[0]*=1+glide;axes[2]*=1+glide;
   if(!s&&cl)axes[1]=Math.max(axes[1],.42);
   if(!s&&input.grounded&&!waveNorm&&!rp){const ground=this.world.support(p.p[0],p.p[2],input.anchor[1]+.05,ignoreFluid);if(ground===null||ground<input.anchor[1]-.08){axes[1]+=.35;p.p[1]=Math.max(p.p[1],input.anchor[1]-.35+.023)}}
   const ell=Math.hypot((p.p[0]-c[0])/axes[0],(p.p[1]-c[1])/axes[1],(p.p[2]-c[2])/axes[2]);
   if(ell>1.18)for(let k=0;k<3;k++)p.p[k]=c[k]+(p.p[k]-c[k])*1.18/ell;
   if(!s||s.grounded)this.world.projectPoint(p.p,SPACING*.48,ignoreFluid);
   if(!s&&cl)this.clingPlane(p.p,cl);
   if(!s&&rp)this.ridePlaneProject(p.p,rp);
   for(let k=0;k<3;k++)p.v[k]=clamp((p.p[k]-p.old[k])/dt,-16,16);
  }
  const visc:Vec[]=new Array(ps.length);
  for(let i=0;i<ps.length;i++){const a=ps[i];let x=0,y=0,z=0;for(const j of this.neighbors[i]){const b=ps[j],w=kernel((a.p[0]-b.p[0])**2+(a.p[1]-b.p[1])**2+(a.p[2]-b.p[2])**2)/restDensity*.22;x+=(b.v[0]-a.v[0])*w;y+=(b.v[1]-a.v[1])*w;z+=(b.v[2]-a.v[2])*w}visc[i]=[x,y,z]}
  for(let i=0;i<ps.length;i++)for(let k=0;k<3;k++)ps[i].v[k]+=visc[i][k];
 }
 views():ShotView[]{return this.shots.map(s=>({id:s.id,phase:s.phase,center:[...s.center],radius:s.radius,age:s.age,mergeProgress:s.phase==='merging'?smooth(s.phaseAge/1.8):0,umbrella:s.umbrella}))}
}
