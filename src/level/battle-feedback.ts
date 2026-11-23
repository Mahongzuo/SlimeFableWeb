import * as T from 'three';
import type {SlimeCharacter} from '../slime/character';
import {elements} from '../slime/elements';
import {LAYER} from './stage';

export class FluidEchoes {
 private ghosts:{mesh:T.Mesh<T.BufferGeometry,T.ShaderMaterial>;age:number;duration:number}[]=[];
 readonly reduced=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private scene:T.Scene,private actor:SlimeCharacter){}
 capture(outline=false){
  if(this.reduced.matches&&!outline)return;
  const surface=this.actor.renderer.geometry;
  const count=surface.drawRange.count;
  if(!count)return;
  const vertices=surface.attributes.position.array,normal=surface.attributes.normal.array,slot=surface.attributes.cluster.array;
  const positions:number[]=[],normals:number[]=[];
  for(let i=0;i<count;i++){
   if(slot[i]!==0)continue;
   const k=i*3;
   positions.push(vertices[k],vertices[k+1],vertices[k+2]);
   normals.push(normal[k],normal[k+1],normal[k+2]);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  const element=elements[this.actor.element];
  const material=new T.ShaderMaterial({
   transparent:true,depthWrite:false,
   uniforms:{tint:{value:new T.Color(element.color)},rim:{value:new T.Color(element.rim)},alpha:{value:1},outline:{value:outline?1:0}},
   vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalMatrix*normal;v=-p.xyz;gl_Position=projectionMatrix*p;}',
   fragmentShader:'varying vec3 n;varying vec3 v;uniform vec3 tint,rim;uniform float alpha,outline;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),1.2);gl_FragColor=vec4(mix(tint,rim,f),alpha*mix(.21+.77*f,smoothstep(.38,.83,f),outline));}'
  });
  const mesh=new T.Mesh(geometry,material);mesh.name=outline?'dodge-outline-fx':'fluid-afterimage-fx';mesh.layers.set(LAYER.NO_OUTLINE);
  mesh.position.fromArray(this.actor.surfaceOffset());
  if(outline){geometry.computeBoundingSphere();const center=geometry.boundingSphere!.center;mesh.scale.setScalar(1.12);mesh.position.addScaledVector(center,-.12);}
  this.scene.add(mesh);this.ghosts.push({mesh,age:0,duration:outline?.22:.54});
 }
 step(dt:number){
  for(let i=this.ghosts.length-1;i>=0;i--){
   const g=this.ghosts[i];g.age+=dt;
   if(g.age>=g.duration){g.mesh.removeFromParent();g.mesh.material.dispose();g.mesh.geometry.dispose();this.ghosts.splice(i,1);}
   else g.mesh.material.uniforms.alpha.value=1-g.age/g.duration;
  }
 }
 clear(){this.step(Infinity);}
}

export class DodgeAudio {
 private audio?:AudioContext;
 private air?:GainNode;
 constructor(private ship:boolean){}
 play(){
  if(!this.audio){
   const ctx=this.audio=new AudioContext();
   const len=ctx.sampleRate*2,buffer=ctx.createBuffer(1,len,ctx.sampleRate),samples=buffer.getChannelData(0);
   let previous=0;
   for(let i=0;i<len;i++){previous=.97*previous+.03*(Math.random()*2-1);samples[i]=previous;}
   const wind=ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;
   const filter=ctx.createBiquadFilter();filter.frequency.value=this.ship?680:1200;
   this.air=ctx.createGain();this.air.gain.value=.12;
   wind.connect(filter).connect(this.air).connect(ctx.destination);wind.start();
  }
  void this.audio.resume().catch(()=>{});
 }
 perfect(){
  const a=this.audio;if(!a||!this.air)return;
  const t=a.currentTime,g=this.air.gain;g.cancelScheduledValues(t);g.setTargetAtTime(.016,t,.015);g.setTargetAtTime(.12,t+.19,.07);
  for(const [delay,pitch,amp] of [[0,740,.11],[.055,1110,.06],[.15,1480,.026]]){
   const tone=a.createOscillator(),env=a.createGain(),start=t+delay;tone.frequency.value=pitch;
   env.gain.setValueAtTime(.0001,start);env.gain.exponentialRampToValueAtTime(amp,start+.009);env.gain.exponentialRampToValueAtTime(.0001,start+.29);
   tone.connect(env).connect(a.destination);tone.start(start);tone.stop(start+.31);
  }
 }
 pause(){void this.audio?.suspend().catch(()=>{});}
}

