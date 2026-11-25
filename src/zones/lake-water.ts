import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {LAKE} from '../world/map';
let reflecting=false;

/** One mirrored view and a world-space ripple pattern shared by the canal and lake. */
export function valleyWater(ctx:any,geometry:any,x:number,y:number,z:number){
  const T=ctx.THREE, water=new Reflector(geometry,{color:0x84b9aa,textureWidth:640,textureHeight:384,clipBias:.003});
  water.camera.layers.enable(1);water.camera.layers.enable(4);
  water.rotation.x=-Math.PI/2;water.position.set(x,y,z);water.layers.set(1);water.name='garden-water';
  const mat=water.material;
  mat.uniforms.uBody={value:new T.Vector2(1e4,1e4)};
  ctx.onUpdate(()=>{const p=(window as any).__slime?.position;if(p)mat.uniforms.uBody.value.set(p[0],p[2]);});
  mat.uniforms.uWind=ctx.U.uWind;mat.uniforms.uTime=ctx.U.uTime;mat.uniforms.uRain=ctx.U.uRain;
  mat.vertexShader='varying vec3 vWaterPoint;\n'+mat.vertexShader.replace('vUv = textureMatrix','vWaterPoint=(modelMatrix*vec4(position,1.)).xyz; vUv = textureMatrix');
  mat.fragmentShader='varying vec3 vWaterPoint;uniform vec2 uBody;uniform float uTime,uRain,uWind;\n'+mat.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );',`
    vec2 p=vWaterPoint.xz;
    float wave=sin(p.x*2.+p.y*3.2+uTime*1.8)+sin(p.y*5.1-uTime);
    wave*=.77+.63*uWind;
    float bodyDist=distance(p,uBody);wave+=sin(bodyDist*18.-uTime*5.)*max(0.,1.-bodyDist/1.5);
    vec2 uv=vUv.xy/vUv.w+vec2(wave*.0017,cos(p.x*4.+uTime)*.001);
    vec4 base=texture2D(tDiffuse,uv);`).replace('blendOverlay( base.rgb, color )',`
    mix(vec3(.07,.235,.205),base.rgb,.32)+vec3(.08,.11,.08)*smoothstep(1.78,1.99,wave)
    +uRain*.07*(1.-smoothstep(.014,.05,abs(length(fract(p*1.4)-.5)-fract(uTime*.85+sin(dot(floor(p*1.4),vec2(5.3,1.9))))*.48)))`);
  const render=water.onBeforeRender.bind(water);
  water.onBeforeRender=(...args:any[])=>{
    if(reflecting || ctx.scene.overrideMaterial)return;
    reflecting=true;try{render(...args);}finally{reflecting=false;}
  };
  return water;
}
export function lakeWater(ctx:any){
  const mesh=valleyWater(ctx,new ctx.THREE.CircleGeometry(1,96),LAKE.center[0],LAKE.level,LAKE.center[1]);
  mesh.scale.set(LAKE.rx*1.04,LAKE.rz*1.04,1);
  return {mesh,update(){mesh.visible=ctx.camera.position.distanceTo(mesh.position)<125;}};
}
