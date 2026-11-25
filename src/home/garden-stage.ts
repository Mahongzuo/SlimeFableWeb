import {HomeClimate} from './climate';
import {surfaceClimate} from './climate-material';
import * as T from 'three';
import {Stage} from '../level/stage';
import {inland, LAKE, lakeEdge} from '../world/map';
import {riverCenter, riverLevel} from './waterway';

const palette={wood:0x936f50,woodDark:0x66513e,woodWeathered:0x94806a,concrete:0xb5b7a6,concreteWet:0x889d95,
 concreteDark:0x7c8c80,gravel:0xa59e86,grass:0x91a877,iron:0x526560,rope:0xb29b77,ropeWet:0x887b62,
 safetyYellow:0xcbab68,sand:0xcab998,boatOffWhite:0xe3dfca,tileRoof:0x526b62,tileRoofDark:0x405750,tileRoofLight:0x788d7f};

export function createGardenStage(){
  const stage=new Stage({skyTop:'#83b8c3',skyHorizon:'#e4e8d5',fog:[58,167],sun:'#fff0cf',sunIntensity:2.1,
    hemiSky:'#e4efdf',hemiGround:'#939674',ink:'#596d5a',wash:'#e2e9d9'});
  const {renderer,scene,camera,sun}=stage;
  scene.fog=new T.FogExp2(0xdde6d6,.008);
  const sky=scene.children.find((o:any)=>o.material?.uniforms?.uTop);
  const skyMat=sky.material;
  const director = new HomeClimate();
  const weather = director.weather;
  const atmosphere = {
    drift:{value:0}, cloudAmount:{value:0}, daylight:{value:1}, twilight:{value:0},
    sunDir:{value:new T.Vector3()}, storminess:{value:0},
  };
  Object.assign(skyMat.uniforms,atmosphere);
  skyMat.fragmentShader=`uniform vec3 uTop,uHorizon,sunDir;
    uniform float drift,cloudAmount,daylight,twilight,storminess;
    varying vec3 vP;
    float hash(vec2 p){return fract(sin(dot(p,vec2(71.2,173.1)))*42758.32);}
    float noise(vec2 p){vec2 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(a),hash(a+vec2(1,0)),f.x),mix(hash(a+vec2(0,1)),hash(a+1.),f.x),f.y);}
    float layer(vec2 p){return .56*noise(p)+.28*noise(p*2.03)+.16*noise(p*4.1);}
    void main(){
      vec3 d=normalize(vP);float h=max(0.,d.y),sunDot=dot(d,sunDir),moonDot=dot(d,-sunDir);
      vec3 horizon=mix(uHorizon,vec3(.94,.52,.29),twilight*(.3+.7*max(0.,sunDot)));
      vec3 sky=mix(horizon,uTop,smoothstep(.0,.68,h));
      vec3 night=mix(vec3(.087,.122,.17),vec3(.013,.029,.071),smoothstep(.0,.6,h));
      vec2 stars=vec2(atan(d.z,d.x),asin(clamp(d.y,-1.,1.)))*120.;
      float star=step(.986,hash(floor(stars)))*(1.-smoothstep(.04,.23,length(fract(stars)-.5)));
      night+=vec3(.76,.84,1.)*(star*smoothstep(.08,.38,h)+smoothstep(.9993,.99975,moonDot));
      sky=mix(night,sky,daylight);
      sky+=daylight*vec3(1.,.71,.38)*(pow(max(sunDot,0.),24.)*.34+smoothstep(.9991,.99965,sunDot));
      vec2 p=d.xz/(h+.16)*2.35;
      float low=layer(p+vec2(drift,.22*drift)), high=layer(p*.66-vec2(.4*drift,.16*drift));
      float density=smoothstep(.69-.47*cloudAmount,.94-.45*cloudAmount,low*.75+high*.25);
      float cover=density*smoothstep(.012,.20,h);
      vec3 cloud=mix(vec3(.83,.86,.85),vec3(.26,.33,.38),storminess);
      cloud*=.85+.24*high;cloud+=vec3(.22,.13,.045)*twilight*max(sunDot,0.);
      sky=mix(sky,mix(vec3(.08,.10,.15),cloud,daylight),cover);
      float shafts=noise(vec2(atan(d.x,d.z)*28.,drift))*pow(max(sunDot,0.),9.)*(1.-cover);
      sky+=vec3(.13,.10,.055)*shafts*daylight*(1.-storminess);
      gl_FragColor=vec4(sky,1.);
    }`;
  const controls={enabled:false,target:new T.Vector3(),update(){camera.lookAt(this.target);camera.updateMatrixWorld();}};
  const U={uTime:{value:0},uSun:{value:1},uWind:{value:.5},uRain:{value:0},uShaft:{value:.5}};
  const hooks:((t:number,dt:number)=>void)[]=[];
  const ctx={THREE:T,renderer,scene,camera,controls,sun,P:palette,U,weather,puddles:[{x:6.1,z:15.4,rx:1.25,rz:.55,rot:.3},{x:12.6,z:19.2,rx:1.45,rz:.57,rot:-.5},{x:3.2,z:18.8,rx:.7,rz:.34,rot:.1}],renderSlime:null as any,
    groundY:(x:number,z:number)=>lakeEdge(x,z)<1?Math.max(inland(x,z),LAKE.level):Math.abs(x-riverCenter(z))<4&&z<30?Math.max(inland(x,z),riverLevel):inland(x,z),
    onUpdate:(fn:(t:number,dt:number)=>void)=>hooks.push(fn),
    mats:{toon:(color:any,options:any={})=>{
      const {noCache, ...opts}=options;
      const base=stage.toon(color,opts);
      const mat=noCache?base.clone():base;
      if('vertexColors' in opts)mat.vertexColors=opts.vertexColors;
      if('depthWrite' in opts)mat.depthWrite=opts.depthWrite;
      return mat;
    },flat:(color:any,opts:any={})=>new T.MeshBasicMaterial({color,...opts}),glowSprite:stage.glow.bind(stage)}};
  // Reuse each raindrop in a camera-centred volume; the shader advances both ends together.
  const positions:number[]=[];
  let seed=379;const random=()=>(seed=seed*16807%2147483647)/2147483647;
  for(let i=0;i<850;i++){const x=random()*48-24,y=random()*21,z=random()*48-24;positions.push(x,y,z,x+.045,y-.42,z+.015);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  const rainMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:U,
    vertexShader:`uniform float uTime;void main(){vec3 p=position;float head=position.y+(mod(float(gl_VertexID),2.)>.5?.42:0.);p.y-=floor((head-uTime*9.)/21.)*21.+uTime*9.;p.y-=8.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:'uniform float uRain;void main(){gl_FragColor=vec4(.73,.85,.85,.36*uRain);}'});
  const rain=new T.LineSegments(geo,rainMat);rain.layers.set(1);rain.frustumCulled=false;scene.add(rain);
  const flakePos=new Float32Array(720*3);
  for(let i=0;i<flakePos.length;i+=3){
    flakePos[i]=random()*30-15;flakePos[i+1]=random()*18;flakePos[i+2]=random()*30-15;
  }
  const flakes=new T.BufferGeometry();
  flakes.setAttribute('position',new T.BufferAttribute(flakePos,3));
  const flakeMat=new T.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:{uTime:U.uTime,uWind:U.uWind,amount:{value:0}},
    vertexShader:`uniform float uTime,uWind;void main(){
      vec3 p=position;p.y=mod(p.y-uTime*(1.0+.32*sin(position.x)),18.)-6.;
      p.x=mod(p.x+15.+uTime*uWind+sin(uTime*.8+p.z)*.52,30.)-15.;
      vec4 eye=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*eye;
      gl_PointSize=clamp(19./max(1.,-eye.z),1.5,5.5);}`,
    fragmentShader:`uniform float amount;void main(){
      float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));
      gl_FragColor=vec4(.93,.97,1.,a*amount*.93);}`
  });
  const snow=new T.Points(flakes,flakeMat);
  snow.layers.set(1);snow.frustumCulled=false;scene.add(snow);
  const spectrum=[0xdd8885,0xe7ab7e,0xe6cd8a,0xaace92,0x8bbfca,0x9f9ac7];
  const bow=new T.Group();bow.position.set(2,-5,-65);
  for(let i=0;i<spectrum.length;i++){
    const mat=new T.MeshBasicMaterial({color:spectrum[i],transparent:true,depthWrite:false,side:T.DoubleSide,opacity:0,fog:false});
    const strip=new T.Mesh(new T.RingGeometry(38-i*.56,38.55-i*.56,100,1,0,Math.PI),mat);strip.layers.set(1);bow.add(strip);
  }
  scene.add(bow);
  const tint=new T.Color(),fogColor=new T.Color(0xe3e9d8),storm=new T.Color(0xa6bcba);
  const nightFog=new T.Color(0x697e86),hemisphere=scene.children.find((light:any)=>light.isHemisphereLight);
  const skyTops=[0x92c2ce,0x64aaca,0x849fb9,0x94adbd].map(c=>new T.Color(c));
  const skyRims=[0xe5efda,0xe4eddb,0xf2debd,0xe3e8e8].map(c=>new T.Color(c));
  const sunDay=new T.Color(0xfff1d5),sunset=new T.Color(0xffb584),moon=new T.Color(0xb3ceea);
  const sunOffset=sun.userData.offset=new T.Vector3();
  let time=0;
  function step(dt:number){
    time+=dt;director.update(time);
    const {season,daylight,twilight,east,up,north}=director.sky;
    U.uTime.value=time;U.uRain.value=weather.rain;U.uWind.value=weather.wind;U.uSun.value=weather.sun;U.uShaft.value=weather.shaft;
    surfaceClimate.season.value=season;surfaceClimate.snow.value=weather.cover;surfaceClimate.wet.value=weather.wet;
    atmosphere.sunDir.value.set(east,up,-north);
    // Moonlight takes over after sunset; keep the shadow camera within its depth range.
    sunOffset.copy(atmosphere.sunDir.value).multiplyScalar(up<0?-1:1);
    sunOffset.y=Math.max(.19,sunOffset.y);sunOffset.normalize().multiplyScalar(31);
    sun.color.copy(moon).lerp(tint.copy(sunDay).lerp(sunset,twilight),daylight);
    sun.intensity=(.31+1.85*daylight)*(1-.64*weather.cloud);
    const overcast=Math.max(weather.rain,weather.cloud*.64,weather.snow*.74);
    scene.fog.color.copy(fogColor).lerp(skyRims[season],.6).lerp(storm,overcast).lerp(nightFog,1-daylight);
    hemisphere.intensity=.62+.75*daylight;
    scene.fog.density=.0065+.020*weather.fog+.002*weather.rain;
    atmosphere.daylight.value=daylight;atmosphere.twilight.value=twilight;
    atmosphere.drift.value+=dt*(.006+.019*weather.wind);
    atmosphere.cloudAmount.value=weather.cloud;atmosphere.storminess.value=overcast;
    skyMat.uniforms.uTop.value.copy(skyTops[season]);skyMat.uniforms.uHorizon.value.copy(skyRims[season]);
    for(const fn of hooks)fn(time,dt);
    sky.position.copy(camera.position);
    snow.position.copy(camera.position);snow.visible=weather.snow>.012;flakeMat.uniforms.amount.value=weather.snow;
    rain.position.copy(camera.position);rain.visible=weather.rain>.012;
    bow.visible=weather.rainbow>.01;for(const band of bow.children)(band as any).material.opacity=.24*weather.rainbow;
    stage.render(dt,{render:(pass:any)=>ctx.renderSlime?.(pass)});
  }
  function run(){let last=performance.now();renderer.setAnimationLoop(()=>{const now=performance.now();step(Math.min(.05,(now-last)/1000));last=now;});}
  function bench(frames=8){const t=performance.now();for(let i=0;i<frames;i++)step(1/60);renderer.getContext().finish();return (performance.now()-t)/frames;}
  const refresh=()=>{renderer.setPixelRatio((globalThis as any).__renderScale??1);renderer.setSize(innerWidth,innerHeight);};
  (globalThis as any).__harborResize=refresh;
  return {ctx,camera,renderer,scene,controls,director,step,run,bench};
}
