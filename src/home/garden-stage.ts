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
  skyMat.uniforms.cloudTime={value:0};skyMat.uniforms.cloudRain={value:0};skyMat.uniforms.daylight={value:1};
  skyMat.fragmentShader=`uniform vec3 uTop,uHorizon;uniform float cloudTime,cloudRain,daylight;varying vec3 vP;
    float hash(vec2 p){return fract(sin(dot(p,vec2(71.2,173.1)))*42758.32);}
    float noise(vec2 p){vec2 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(a),hash(a+vec2(1,0)),f.x),mix(hash(a+vec2(0,1)),hash(a+1.),f.x),f.y);}
    void main(){vec3 d=normalize(vP);float h=max(.0,d.y);
      vec2 p=d.xz/(h+.16)*2.5+vec2(cloudTime*.013,0);
      float n=noise(p)*.56+noise(p*2.1)*.28+noise(p*4.1)*.16;
      vec3 sky=mix(uHorizon,uTop,smoothstep(.0,.68,h));
      float light=pow(max(0.,dot(d,normalize(vec3(-.48,.44,.72)))),14.);
      sky+=vec3(.19,.14,.07)*light;float cloud=smoothstep(.44-.10*cloudRain,.76,n)*smoothstep(.015,.26,h);
      sky=mix(sky,mix(vec3(.90,.91,.83),vec3(.50,.59,.59),cloudRain),cloud*.82);
      vec3 toSun=normalize(vec3(-.48,.44,.72));
      float shafts=noise(vec2(atan(d.x,d.z)*28.,cloudTime*.009))*
        pow(max(0.,dot(d,toSun)),7.)*smoothstep(.02,.24,h)*(1.-cloudRain);
      sky+=vec3(.13,.10,.055)*shafts;
      sky=mix(mix(vec3(.085,.13,.19),vec3(.028,.057,.115),h),sky,daylight);
      gl_FragColor=vec4(sky,1.);
    }`;
  const controls={enabled:false,target:new T.Vector3(),update(){camera.lookAt(this.target);camera.updateMatrixWorld();}};
  const U={uTime:{value:0},uSun:{value:1},uWind:{value:.5},uRain:{value:0},uShaft:{value:.5}};
  const weather={time:0,rain:0,rainbow:0,sun:1,wind:.5,shaft:.5};
  // A complete front passes over the valley in just over two minutes.
  const clamp=(v:number)=>Math.min(1,Math.max(0,v));
  const director={update(t:number){
    const phase=t%146;
    weather.rain=clamp((phase-34)/13)*clamp((91-phase)/15);
    weather.rainbow=clamp((phase-83)/8)*clamp((124-phase)/14);
    const day=t%370, dusk=clamp((day-264)/30)*clamp((367-day)/30);
    weather.sun=(1-.47*weather.rain)*(1-.86*dusk);weather.shaft=(.45+.45*weather.rainbow)*(1-dusk);
    weather.rainbow*=1-dusk;
    weather.wind=.45+.18*Math.sin(t*.22)+.25*weather.rain;
  }};
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
  const spectrum=[0xdd8885,0xe7ab7e,0xe6cd8a,0xaace92,0x8bbfca,0x9f9ac7];
  const bow=new T.Group();bow.position.set(2,-5,-65);
  for(let i=0;i<spectrum.length;i++){
    const mat=new T.MeshBasicMaterial({color:spectrum[i],transparent:true,depthWrite:false,side:T.DoubleSide,opacity:0,fog:false});
    const strip=new T.Mesh(new T.RingGeometry(38-i*.56,38.55-i*.56,100,1,0,Math.PI),mat);strip.layers.set(1);bow.add(strip);
  }
  scene.add(bow);
  const tint=new T.Color(),fogColor=new T.Color(0xe3e9d8),storm=new T.Color(0xa6bcba);
  const nightFog=new T.Color(0x697e86),hemisphere=scene.children.find((light:any)=>light.isHemisphereLight);
  let time=0;
  function step(dt:number){
    time+=dt;weather.time=time;director.update(time);
    U.uTime.value=time;U.uRain.value=weather.rain;U.uWind.value=weather.wind;U.uSun.value=weather.sun;U.uShaft.value=weather.shaft;
    sun.intensity=2.05*weather.sun;scene.fog.color.copy(tint.copy(fogColor).lerp(storm,weather.rain));
    const daylight=clamp((weather.sun-.14)/.44);
    scene.fog.color.lerp(nightFog,1-daylight);hemisphere.intensity=.43+.92*daylight;
    skyMat.uniforms.daylight.value=daylight;scene.fog.density=.007+.0035*weather.rain;
    for(const fn of hooks)fn(time,dt);
    sky.position.copy(camera.position);skyMat.uniforms.cloudTime.value=time;skyMat.uniforms.cloudRain.value=weather.rain;
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
