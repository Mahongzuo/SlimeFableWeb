import * as T from 'three';
import {rainBodyHit, rainDrift, type RainBody} from './rain-body';

export interface RainSurface {height: number; water: boolean}

export function gardenRain(scene: T.Scene, camera: T.PerspectiveCamera, U: any,
  surfaceAt: (x:number,z:number)=>RainSurface, getBody: ()=>RainBody|null, bufferHeight: ()=>number) {
  const count=260, landingPhase=.72, fallScale=14;
  let state=3821;
  const random=()=>(state=state*16807%2147483647)/2147483647;
  const seeds=Float32Array.from({length:count},random);
  const anchor=new T.InstancedBufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage);
  const stopped=new T.InstancedBufferAttribute(new Float32Array(count),1).setUsage(T.DynamicDrawUsage);
  const streakGeo=new T.InstancedBufferGeometry();
  streakGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,.38,0],3));
  streakGeo.setAttribute('anchor',anchor);
  streakGeo.setAttribute('seed',new T.InstancedBufferAttribute(seeds,1));
  streakGeo.setAttribute('stopped',stopped);
  streakGeo.instanceCount=count;
  const streakMat=new T.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:U,
    vertexShader:`
      attribute vec3 anchor; attribute float seed,stopped;
      uniform float uTime,uRain; varying float vAlpha;
      void main(){
        float phase=fract(uTime*(.78+seed*.32)+seed*71.);
        float fall=max(0.,${landingPhase}-phase)*${fallScale.toFixed(1)};
        vec3 p=anchor+vec3(${rainDrift[0]},1.,${rainDrift[1]})*(fall+position.y);
        vAlpha=(1.-stopped)*step(phase,${landingPhase})*(.44-.30*position.y/.38)*uRain;
        gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
      }`,
    fragmentShader:`varying float vAlpha;void main(){if(vAlpha<.01)discard;gl_FragColor=vec4(.80,.91,.98,vAlpha);}`,
  });
  const rain=new T.LineSegments(streakGeo,streakMat);
  rain.name='garden-rain-contacts';rain.layers.set(1);rain.frustumCulled=false;scene.add(rain);

  // Each impact draws one momentary contact and four airborne beads in a single draw call.
  const splashGeo=new T.InstancedBufferGeometry();
  splashGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,2,0,0,3,0,0,4,0,0],3));
  const impacts=new T.InstancedBufferAttribute(new Float32Array(count*4),4).setUsage(T.DynamicDrawUsage);
  const impactKind=new T.InstancedBufferAttribute(new Float32Array(count),1).setUsage(T.DynamicDrawUsage);
  for(let i=0;i<count;i++)impacts.setW(i,-100);
  splashGeo.setAttribute('impact',impacts);
  splashGeo.setAttribute('seed',new T.InstancedBufferAttribute(seeds,1));
  splashGeo.setAttribute('bodyHit',impactKind);
  splashGeo.instanceCount=count;
  const resolution={value:1};
  const splashMat=new T.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{uTime:U.uTime,uRain:U.uRain,uHeight:resolution},
    vertexShader:`
      attribute vec4 impact; attribute float seed,bodyHit; uniform float uTime,uRain,uHeight;
      varying float vAlpha,vCenter,vView;
      void main(){
        float t=(uTime-impact.w)/(.24+.10*seed);
        if(t<0.||t>=1.||(bodyHit>.5&&position.x<.5)){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=1.;vAlpha=0.;return;}
        float j=position.x;vCenter=1.-step(.5,j);
        vec3 p=impact.xyz;float angle=j*2.39996+seed*63.;
        float sc=mix(1.,.68,bodyHit);
        p.y+=.018;
        if(j>.5){
          float travel=(.07+.075*fract(j*.37+seed))*t*sc;
          p.xz+=vec2(cos(angle),sin(angle))*travel;
          p.y+=4.*t*(1.-t)*(.065+.09*fract(j*.61+seed))*sc;
        }
        vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        float proj=.5*uHeight*projectionMatrix[1][1]/max(.2,-mv.z);
        float diameter=mix((.018+.014*fract(j*.39+seed))*(1.-.42*t),.058+.12*t,vCenter)*sc;
        vView=clamp(normalize(cameraPosition-p).y,.32,1.);
        gl_PointSize=clamp(diameter*proj,1.8,35.);
        vAlpha=uRain*(1.-smoothstep(.52,1.,t))*(1.-smoothstep(12.,26.,-mv.z));
      }`,
    fragmentShader:`
      varying float vAlpha,vCenter,vView;
      void main(){
        if(vAlpha<.015)discard;
        vec2 q=2.*gl_PointCoord-1.;q.y/=mix(1.,vView,vCenter);
        float r=length(q);
        float aa=max(.075,fwidth(r));
        float edge=1.-smoothstep(1.-aa,1.,r);
        if(edge<=.001)discard;
        float glint=vCenter>.5 ? smoothstep(.38,.82,r)*(.52+.45*dot(q,vec2(.82,-.57))) : 1.-smoothstep(.35,1.,r);
        vec3 col=mix(vec3(.14,.28,.32),vec3(1.55,1.75,1.88),glint);
        gl_FragColor=vec4(col,vAlpha*edge*mix(.57,.94,glint));
      }`,
  });
  const splashes = new T.Points(splashGeo, splashMat);
  splashes.name='garden-rain-splashes-fx';splashes.layers.set(1);splashes.frustumCulled=false;
  scene.add(splashes);

  const cycleIds=new Int32Array(count).fill(-1), landed=new Uint8Array(count), water=new Uint8Array(count);
  const forward=new T.Vector3();
  let lastTime=-1, generation=-1, hitCursor=0;
  const hits: T.Vector4[]=U.uBodyRainHits.value;
  const clearBody=()=>{for(const hit of hits)hit.w=-100;};
  function impact(i:number,x:number,y:number,z:number,time:number,bodyHit:boolean) {
    impacts.setXYZW(i,x,y,z,time);
    impactKind.setX(i,Number(bodyHit));
    impactKind.needsUpdate=true;
    impacts.needsUpdate=true;
  }
  return function update(time:number) {
    rain.visible=splashes.visible=U.uRain.value>.012;
    if (!rain.visible) {
      if(lastTime>=0){
        cycleIds.fill(-1);clearBody();lastTime=-1;
        for(let i=0;i<count;i++)impacts.setW(i,-100);
        impacts.needsUpdate=true;
      }
      return;
    }
    resolution.value=bufferHeight();
    const body=getBody();
    if((body?.generation??-1)!==generation){clearBody();generation=body?.generation??-1;}
    camera.getWorldDirection(forward);
    const horizontal=Math.hypot(forward.x,forward.z);
    const ahead=horizontal>.001 ? 5/horizontal : 0;
    for (let i=0;i<count;i++) {
      const seed=seeds[i], speed=.78+seed*.32;
      const clock=time*speed+seed*71, cycle=Math.floor(clock), phase=clock-cycle;
      const fresh=cycle!==cycleIds[i];
      if(fresh){
        cycleIds[i]=cycle;landed[i]=0;
        stopped.setX(i,0);stopped.needsUpdate=true;
        const nearBody=i<16 && body && Math.hypot(body.center[0]+body.offset[0]-camera.position.x,
          body.center[2]+body.offset[2]-camera.position.z)<18;
        const near=i<count*.7;
        const width=nearBody?2.2:near?14:36;
        const cx=nearBody?body.center[0]+body.offset[0]:camera.position.x+forward.x*ahead;
        const cz=nearBody?body.center[2]+body.offset[2]:camera.position.z+forward.z*ahead;
        const x=cx+(random()-.5)*width, z=cz+(random()-.5)*width;
        const surface=surfaceAt(x,z);
        anchor.setXYZ(i,x,surface.height,z);anchor.needsUpdate=true;
        water[i]=Number(surface.water);
        // Starting a shower must not replay impacts from the unobserved part of a cycle.
        if(phase>=landingPhase)landed[i]=1;
      }
      if(landed[i])continue;
      const x=anchor.getX(i),floor=anchor.getY(i),z=anchor.getZ(i);
      const low=floor+Math.max(0,landingPhase-phase)*fallScale;
      const prevPhase=fresh?phase:phase-(time-lastTime)*speed;
      const high=floor+Math.max(0,landingPhase-prevPhase)*fallScale;
      const hit=body && rainBodyHit(body,x,z,floor,low,high);
      if(hit && body){
        landed[i]=1;stopped.setX(i,1);stopped.needsUpdate=true;
        const stamp=time-(phase-landingPhase+(hit[1]-floor)/fallScale)/speed;
        impact(i,...hit,stamp,true);
        hits[hitCursor].set((hit[0]-body.offset[0]-body.center[0])/body.radii[0],
          (hit[1]-body.offset[1]-body.center[1])/body.radii[1],
          (hit[2]-body.offset[2]-body.center[2])/body.radii[2],stamp);
        hitCursor=(hitCursor+1)%hits.length;
      }else if(phase>=landingPhase){
        landed[i]=1;
        if(!water[i])impact(i,x,floor,z,time-(phase-landingPhase)/speed,false);
      }
    }
    lastTime=time;
  };
}
