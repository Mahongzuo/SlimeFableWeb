import * as T from 'three';

/** The map follows the player but samples its previous frame in world coordinates. */
const SIZE = 512;
export const WAKE_SPAN = 128;
const VERT = `
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}
`;
const ADVECT = `
varying vec2 vUv;
uniform sampler2D uHistory, uNoise;
uniform vec2 uOrigin, uLastOrigin;
uniform vec4 uHull[2], uImpact[8];
uniform float uDt, uTime, uRead;
const float span = ${WAKE_SPAN.toFixed(1)};
const float texel = 1.0 / ${SIZE.toFixed(1)};

// The local longitudinal profile follows the narrowing bow and the square transom.
// r is surface bubbles, g is entrained air, ba store the positive crest and negative trough.
vec4 source(vec2 world, vec4 emitter){
  if(emitter.w<0.)return vec4(0.);
  vec2 rel=world-emitter.xy;
  if(dot(rel,rel)>1000.)return vec4(0.);
  vec2 f=vec2(sin(emitter.z),cos(emitter.z));
  float along=dot(rel,f), side=abs(dot(rel,vec2(f.y,-f.x)));
  float speed=clamp(emitter.w/19.,0.,1.35);
  float halfBeam=mix(1.34,0.05,smoothstep(1.7,4.85,along));
  halfBeam*=mix(.66,1.,smoothstep(-4.35,-2.55,along));
  float aft=4.55-along, behind=max(aft,0.);
  float hullMask=smoothstep(-4.6,-4.1,along)*(1.-smoothstep(4.55,4.98,along));
  float collar=exp(-pow((side-halfBeam-.07)/.33,2.))*hullMask;
  float branch=side-halfBeam-.14-behind*.155;
  float bow=exp(-pow(branch/(.32+.045*behind),2.))*exp(-behind*.16)*smoothstep(-.55,.35,aft);
  float back=max(-along-4.,0.);
  float stern=exp(-pow((along+4.95)/1.22,2.)-pow(side/1.32,2.));
  float wedge=exp(-pow((side-1.12-.31*back)/(.46+.036*back),2.))*exp(-back*.095)*smoothstep(0.,1.,back);
  float wave=sin(2.5*(side-.29*back)+.1*back)*wedge;
  float trough=exp(-pow((along+1.4)/3.6,2.)-pow((side-1.5)/.7,2.));
  float height=.29*bow+.125*wave+.14*stern-.10*trough;
  float outwash=exp(-pow((along+5.4)/2.1,2.)-pow(side/1.52,2.));
  return vec4(collar*(.10+.63*speed)+(bow*1.4+stern+.5*wedge)*speed,
      (outwash+bow*.6+wedge*.4)*speed, max(0.,height)*2.8*speed,max(0.,-height)*2.8*speed);
}
void main(){
  vec2 world=uOrigin+(vUv-.5)*span;
  vec2 drift=vec2(sin(world.y*.45+uTime*.42)+cos(world.y*.17-world.x*.14),
                 cos(world.x*.48-uTime*.31)+sin(world.x*.21+world.y*.16))*.34;
  vec2 prev=(world-uLastOrigin-drift*uDt)/span+.5;
  vec4 history=vec4(0.);
  if(uRead>.5 && all(greaterThan(prev,vec2(texel))) && all(lessThan(prev,vec2(1.-texel)))){
    history=texture2D(uHistory,prev);
    vec4 neighbors=(texture2D(uHistory,prev+vec2(texel,0.))+texture2D(uHistory,prev-vec2(texel,0.))
                 +texture2D(uHistory,prev+vec2(0.,texel))+texture2D(uHistory,prev-vec2(0.,texel)))*.25;
    history=mix(history,neighbors,min(.45,uDt*3.));
    history=max(vec4(0.),history*exp(-uDt*vec4(.31,.13,1.35,1.4))-uDt*vec4(.045,.037,.07,.07));
  }
  vec4 s=max(source(world,uHull[0]),source(world,uHull[1]));
  for(int j=0;j<8;j++){
    vec4 i=uImpact[j];
    if(i.w<=0.)continue;
    float d=length(world-i.xy);
    float ring=exp(-pow((d-i.z*2.9)/(.23+i.z*.16),2.))*i.w;
    s+=ring*vec4(.66,.45,.12,0.);
  }
  float breakup=texture2D(uNoise,world*.11+drift*.035).g;
  s.r*=.65+.54*breakup;
  gl_FragColor=clamp(max(history,s),0.,1.);
}`;

// Short wind waves ride on top of the existing long FFT/Gerstner swell. Both the
// renderer and boat/bobber buoyancy sample these same world-space phases.
const WIND_SEA = [
  [.39,.21,.28,1.94,.7], [.55,.02,.17,2.38,2.4], [-.23,.67,.13,2.63,1.1],
  [.93,.45,.078,3.13,4.1], [.58,-1.18,.049,3.5,.3], [1.56,.81,.031,4.12,2.9],
] as const;
export function voyageChop(x:number,z:number,t:number){
  let height=0,slopeX=0,slopeZ=0,velocity=0;
  for(const [kx,kz,amplitude,omega,offset] of WIND_SEA){
    const phase=x*kx+z*kz-t*omega+offset;
    const gradient=amplitude*(Math.cos(phase)+.28*Math.cos(2*phase));
    height+=amplitude*(Math.sin(phase)+.14*Math.sin(2*phase));
    slopeX+=gradient*kx;slopeZ+=gradient*kz;velocity-=gradient*omega;
  }
  return {height,slopeX,slopeZ,velocity};
}
const chopLines=WIND_SEA.map(([kx,kz,amplitude,omega,offset])=>
  `{vec2 k=vec2(${kx.toFixed(4)},${kz.toFixed(4)});float phase=dot(p,k)-t*${omega.toFixed(4)}+${offset.toFixed(4)};
    h+=${amplitude.toFixed(4)}*vec3(sin(phase)+.14*sin(2.*phase),k*(cos(phase)+.28*cos(2.*phase)));}`).join('\n');
export const WAKE_SAMPLE = `
uniform sampler2D tVoyageWake;
uniform vec2 uWakeCenter;
uniform float uWakeOn;
vec3 voyageChopAt(vec2 p,float t){vec3 h=vec3(0.);
${chopLines}
return h;}
vec4 voyageField(vec2 p){
  if(uWakeOn<.5)return vec4(0.);
  vec2 uv=(p-uWakeCenter)/${WAKE_SPAN.toFixed(1)}+.5;
  if(any(lessThan(uv,vec2(.002)))||any(greaterThan(uv,vec2(.998))))return vec4(0.);
  float fade=1.-smoothstep(.44,.495,max(abs(uv.x-.5),abs(uv.y-.5)));
  return texture2D(tVoyageWake,uv)*fade;
}
float voyageHeight(vec4 f){return (f.b-f.a)*.36;}
`;

export class VoyageWake {
  readonly targets = [0, 1].map(
    () =>
      new T.WebGLRenderTarget(SIZE, SIZE, {
        depthBuffer: false,
        stencilBuffer: false,
        minFilter: T.LinearFilter,
        magFilter: T.LinearFilter,
        type: T.UnsignedByteType,
      }),
  );
  private scene = new T.Scene();
  private camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private source = [new T.Vector4(0, 0, 0, -1), new T.Vector4(0, 0, 0, -1)];
  private impacts = Array.from({length: 8}, () => new T.Vector4());
  private impactIndex = 0;
  private center = new T.Vector2();
  private previous = new T.Vector2();
  private material: T.ShaderMaterial;
  private quad: T.Mesh;
  private current = 0;
  private valid = false;
  private elapsed = 0;
  constructor(noise: T.Texture) {
    this.material = new T.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: ADVECT,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uHistory: {value: null},
        uOrigin: {value: this.center},
        uLastOrigin: {value: this.previous},
        uNoise: {value: noise},
        uHull: {value: this.source},
        uImpact: {value: this.impacts},
        uDt: {value: 0},
        uTime: {value: 0},
        uRead: {value: 0},
      },
    });
    this.quad = new T.Mesh(new T.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }
  hull(id: 0 | 1, x: number, z: number, yaw: number, speed: number) {
    this.source[id].set(x, z, speed < 0 ? yaw + Math.PI : yaw, Math.abs(speed));
  }
  hideHull(id: 0 | 1) {
    this.source[id].w = -1;
  }
  impact(x: number, z: number, size: number) {
    this.impacts[this.impactIndex].set(x, z, 0, size);
    this.impactIndex = (this.impactIndex + 1) % this.impacts.length;
  }
  update(renderer: T.WebGLRenderer, time: number, dt: number) {
    if (this.source[0].w < 0) return;
    this.elapsed += dt;
    if (this.valid && this.elapsed < 1 / 30) return;
    const step = Math.min(0.12, this.elapsed);
    this.elapsed = 0;
    // A moving integer texel window never smears the tail when crossing a cell boundary.
    const unit = WAKE_SPAN / SIZE;
    this.center.set(Math.round(this.source[0].x / unit) * unit, Math.round(this.source[0].y / unit) * unit);
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uDt.value = step;
    u.uRead.value = this.valid ? 1 : 0;
    u.uHistory.value = this.targets[this.current].texture;
    const next = 1 - this.current,
      old = renderer.getRenderTarget();
    renderer.setRenderTarget(this.targets[next]);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(old);
    this.current = next;
    this.valid = true;
    this.previous.copy(this.center);
    for (const p of this.impacts) {
      p.z += step;
      p.w = Math.max(0, p.w - step * 1.35);
    }
  }
  bind(uniforms: Record<string, T.IUniform>) {
    uniforms.tVoyageWake.value = this.targets[this.current].texture;
    uniforms.uWakeCenter.value.copy(this.previous);
    uniforms.uWakeOn.value = Number(this.valid);
  }
  dispose() {
    this.targets.forEach((t) => t.dispose());
    this.quad.geometry.dispose();
    this.material.dispose();
  }
}
