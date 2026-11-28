import {MeshFrame,Quality,Vec} from './types';
import {DEFAULT_ELEMENT,elements} from './elements';
import {CollisionWorld,flatWorld} from './world';
import {FizzBubbles} from './bubbles';
import {FaceDirector} from './face';
import {ssrGLSL} from './ssr';

const vertex=`attribute float cluster;varying vec3 vWorld;varying vec3 vNormal;varying float vCluster;
uniform vec3 uOffset;
void main(){vWorld=position+(cluster<.5?uOffset:vec3(0.));vNormal=normalize(normal);vCluster=cluster;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;

const fragment=`precision highp float;uniform mat4 projectionMatrix;
uniform sampler2D uBackground;uniform sampler2D uDepth;uniform vec2 uResolution;uniform vec3 uCenters[6];uniform vec3 uRadii[6];uniform vec3 uColor;uniform vec3 uRim;uniform vec3 uForward;uniform vec3 uSun;uniform float uDaylight;uniform vec3 uSkyHorizon;uniform vec3 uSkyZenith;uniform vec3 uSunColor;uniform float uTime;uniform float uNear;uniform float uFar;uniform float uReflectionPass;uniform float uXray;uniform float uQuality;uniform float uElement;uniform float uBlink;uniform float uSpread;uniform float uDome;uniform vec4 uFacePose;uniform vec4 uFaceMouth;uniform vec3 uFaceExtra;uniform vec4 uBubbles[64];uniform vec2 uBubbleStates[64];
varying vec3 vWorld;varying vec3 vNormal;varying float vCluster;
float linearDepth(float d){return uNear*uFar/(uFar+(uNear-uFar)*d);}
float disk(vec2 p,vec2 c,vec2 size){return 1.-smoothstep(.82,1.,length((p-c)/size));}
// Physical thin-film interference spectrum (cyan -> emerald -> gold -> violet)
vec3 thinFilm(float opd){
  return clamp(vec3(.5)+vec3(.5)*cos(6.2831853*(opd+vec3(.0,.33,.67))),0.,1.);
}
vec3 sampleBg(vec2 ruv,vec2 fallbackUv,float ourDepth){
  vec2 cuv=clamp(ruv,vec2(.003),vec2(.997));
  if(uReflectionPass<.5&&linearDepth(texture2D(uDepth,cuv).x)<ourDepth-.045)return texture2D(uBackground,fallbackUv).rgb;
  return texture2D(uBackground,cuv).rgb;
}
${ssrGLSL}
#ifdef HOME_RAIN_CONTACT
uniform vec4 uBodyRainHits[6];
uniform float uRainClock,uHomeRain;
#endif
void main(){
  vec2 uv=gl_FragCoord.xy/uResolution;
  float sceneDepth=linearDepth(texture2D(uDepth,uv).x),ourDepth=linearDepth(gl_FragCoord.z);
  bool occluded=uReflectionPass<.5&&ourDepth>sceneDepth+.004;
  vec3 N=normalize(vNormal),V=normalize(cameraPosition-vWorld);
  float ndv=clamp(dot(N,V),0.,1.);
  float grazing=1.-ndv;

  if(uXray>.5){if(ourDepth<sceneDepth+.06)discard;float edge=pow(grazing,2.5);gl_FragColor=vec4(mix(uRim,vec3(.9,1.,1.),.35),edge*.65+.035);return;}
  if(occluded)discard;

  int slot=int(clamp(floor(vCluster+.5),0.,5.));
  vec3 center=uCenters[slot],radii=max(uRadii[slot],vec3(.05));
  #ifdef HOME_RAIN_CONTACT
  float rainGlint=0., rainDimple=0.;
  if(slot==0 && uHomeRain>.012 && N.y>0.){
    vec3 surfaceNormal=N;
    for(int i=0;i<6;i++){
      vec4 hit=uBodyRainHits[i];float age=(uRainClock-hit.w)/.30;
      if(age<0.||age>=1.)continue;
      vec3 delta=vWorld-(center+hit.xyz*radii);
      float d=length(delta), radius=.012+.083*age, w=.008+fwidth(d);
      if(d>radius+w)continue;
      vec3 tangent=delta-surfaceNormal*dot(delta,surfaceNormal);
      vec3 radial=tangent/max(.001,length(tangent));
      float edge=(d-radius)/w;
      float crest=1.-smoothstep(.12,1.,abs(edge));
      float fade=(1.-age)*uHomeRain*smoothstep(0.,.36,surfaceNormal.y);
      // The receding and leading slopes refract the background in opposite directions.
      N+=radial*(edge*crest*.29)*fade;
      float lightSide=.15+.85*smoothstep(-.35,.85,dot(radial,normalize(uSun+V)));
      rainGlint+=crest*lightSide*fade;
      rainDimple+=(1.-smoothstep(0.,radius,d))*fade;
    }
    N=normalize(N);
  }
  #endif
  vec3 I=-V;
  float relH=clamp((vWorld.y-(center.y-radii.y))/max(radii.y*2.,.08),0.,1.);

  // ---- 1. UE Pixel-Normal Water-Drop Refraction + Fine Prism Dispersion ----
  vec3 R=refract(I,N,1./1.333);
  if(dot(R,R)<.001)R=reflect(I,N);
  // Smooth, seam-free liquid thickness estimate
  float thickness=clamp((.45+.55*ndv)*mix(1.0,.30,uSpread),.14,1.0);

  // View-space normal drives genuine convex-dome magnification on top & horizontal ripple wrap across the bell skirt
  vec3 viewN=normalize((viewMatrix*vec4(N,0.)).xyz);
  float aspect=uResolution.x/max(uResolution.y,1.);
  // Subtle controlled lens warp keeps background landmarks (stripes, buildings, sky) vividly visible inside the dome
  // while curving them smoothly along the surface normal (positive Y bends sky/horizon down into the upper dome).
  vec2 lensDir=vec2(-viewN.x/aspect,viewN.y*.65);
  float curv=(.038+.048*pow(grazing,1.35))*mix(1.,.35,uSpread);
  // Subtle organic liquid ripple near the bell-flare waist (matches UE glass-water horizontal bands)
  float waistWave=sin(relH*22.+viewN.x*3.5)*.0035*smoothstep(.65,.12,relH)*(1.-uSpread);
  vec2 lensOffset=lensDir*curv+vec2(0.,waistWave);
  float edgeFade=smoothstep(0.,.035,min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y)));
  vec2 refrUV=uv+lensOffset*edgeFade;

  // Fine chromatic dispersion (crisp rainbow prism fringes on high-contrast refracted edges)
  vec2 disp=(lensDir*(.0045+.012*pow(grazing,1.45)))*edgeFade;
  vec3 scene;
  if(uQuality>.5){
    float sR=sampleBg(refrUV-disp,uv,ourDepth).r;
    float sG=sampleBg(refrUV,uv,ourDepth).g;
    float sB=sampleBg(refrUV+disp*1.15,uv,ourDepth).b;
    scene=vec3(sR,sG,sB);
  }else{
    scene=sampleBg(refrUV,uv,ourDepth);
  }

  // ---- 2. Ultra-Clear Liquid Glass Beer-Lambert Absorption (No Milky Wash!) ----
  // Water is crystal-transparent: centre transmits ~90% of the refracted scene; thick rim & meniscus tint cool emerald-aqua.
  vec3 absorbCoeff=uElement<.5
    ? vec3(.97,.46,.025)
    : uElement<1.5 ? vec3(.34,.06,.09)
    : uElement>4.5 ? vec3(.08,.26,.95)
    : (vec3(1.)-uColor)*1.30;
  float pathLen=(.32+thickness*.65+pow(grazing,2.0)*1.15+(1.-relH)*.55);
  vec3 transmittance=exp(-pathLen*absorbCoeff);
  // Slight contrast deepening gives real wet-glass depth rather than flat paste
  vec3 body=pow(max(scene,vec3(.001)),vec3(1.08))*transmittance;
  if(uElement<.5)body+=vec3(.012,.085,.25)*(1.-transmittance.r);
  else if(uElement>4.5)body+=vec3(.24,.17,.03)*(1.-transmittance.b)*.65;

  // Crisp dark glass refraction band right along the silhouette & base contact meniscus (critical for "liquid volume"!)
  float rimDepth=pow(grazing,2.6);
  body*=mix(1.,.58,rimDepth*(1.-uSpread*.45));
  float baseShadow=smoothstep(.0,.085,relH);
  body*=mix(.52,1.,baseShadow);
  // Subtle caustic light trapped along the lower contact skirt (pure tint, no chalkiness)
  float skirtBand=smoothstep(.20,.025,relH)*smoothstep(.0,.045,relH);
  body*=mix(vec3(1.),uElement<.5?vec3(.57,.85,1.25):uElement<1.5?vec3(.72,1.08,.96):uElement>4.5?vec3(1.22,1.04,.62):mix(vec3(1.),uColor*1.35,.55),skirtBand*.75);

  // ---- 3. Real SSR Environment Reflection + Delicate Thin-Film Iridescence ----
  float f0=.028;
  float fres=f0+(1.-f0)*pow(grazing,4.2);
  vec3 reflDir=reflect(I,N);
  // Live day/night sky reflection gradient so grazing reflection stays grounded at night
  vec3 skyRefl=mix(uSkyHorizon*.52,uSkyZenith*1.15,smoothstep(-.15,.85,reflDir.y));
  vec4 screenRefl=uReflectionPass>.5?vec4(0.):traceSSR(vWorld+N*.015,reflDir);
  vec3 envRefl=mix(skyRefl,screenRefl.rgb*1.05,clamp(screenRefl.a*1.15,0.,1.));

  // Thin-film soap-bubble iridescence modulates ONLY the Fresnel surface sheen
  float opd=grazing*2.6+relH*.55+thickness*.35;
  vec3 film=thinFilm(opd);
  vec3 surfaceSheen=envRefl*mix(vec3(1.),film*1.55,.42*smoothstep(.15,.85,grazing));
  body=mix(body,surfaceSheen,clamp(fres*.82,0.,.68));

  // Crisp bright liquid edge specular rim
  body+=mix(uRim,film,.55)*pow(grazing,5.8)*mix(.15,.34,uDaylight);

  // ---- 4. Single Sharp Sun/Moon Specular Catchlight (Clean Glass Drop) ----
  vec3 L=normalize(uSun);
  vec3 halfV=normalize(L+V);
  float specSharp=pow(max(dot(N,halfV),0.),560.)*2.4;
  float specHalo=pow(max(dot(N,halfV),0.),90.)*.12;
  body+=uSunColor*(specSharp*mix(.32,1.,uDaylight)+specHalo*mix(.24,1.,uDaylight));

  #ifdef HOME_RAIN_CONTACT
  body=body*(1.-.27*min(1.,rainDimple))+vec3(.56,.72,.80)*rainGlint;
  #endif

  // ---- 5. Procedural Face (clean & readable inside clear jelly) ----
  vec3 right=normalize(vec3(uForward.z,0.,-uForward.x));
  float scale=clamp((radii.x+radii.z)*.5,.055,.263);
  vec3 local=vWorld-center;
  vec2 face=vec2(dot(local,right)/scale,local.y/min(scale,max(radii.y*1.32,.065)));
  float front=dot(normalize(vec3(local.x,0.,local.z)+vec3(.000001,0.,0.)),uForward);
  float visible=smoothstep(.45,.72,front)*(1.-smoothstep(.45,.95,uSpread));
  float ink=0.;
  if(visible>.001 && abs(face.x)<.93 && abs(face.y)<.68){
    vec3 painted=body;
    for(int side=-1;side<=1;side+=2){
      float signX=float(side),sx=signX*.35;
      vec2 cheek=(face-vec2(signX*.57,-.075))/vec2(.172,.091);
      float rose=exp(-dot(cheek,cheek)*1.8)*uFaceExtra.x;
      painted=mix(painted,vec3(.99,.32,.41),rose*.78);
      float closed=max(uBlink,side==1?uFaceExtra.z:0.);
      float halfWidth=.141*uFacePose.x;
      float height=mix(max(.019,.182*uFacePose.y),.022,closed);
      vec2 ep=face-vec2(sx,.11+uFacePose.w);
      float nx=clamp(ep.x/halfWidth,-1.,1.);
      ep.y-=(1.-nx*nx)*mix(.079*uFacePose.z,.055,closed);
      vec2 eye=ep/vec2(halfWidth,height);
      float d=length(eye),aa=clamp(fwidth(d),.035,.36);
      float pupil=1.-smoothstep(1.-aa,1.+aa,d);
      float bevel=1.-smoothstep(1.+aa,1.18+aa,d);
      painted=mix(painted,vec3(.81,.76,.81),bevel*.70);
      vec3 iris=mix(vec3(.034,.025,.052),vec3(.13,.084,.13),(1.-smoothstep(-.90,.05,eye.y)));
      painted=mix(painted,iris,pupil);
      float awake=smoothstep(.055,.12,height);
      float glint=disk(eye,vec2(-.30,.34),vec2(.32,.28));
      float glimmer=disk(eye,vec2(.32,-.38),vec2(.14,.12));
      painted=mix(painted,vec3(1.,.98,.94),awake*(glint+.68*glimmer)*pupil);
      ink=max(ink,pupil);
    }
    float w=uFaceMouth.x,h=.022+.117*uFaceMouth.y;
    float mx=clamp(face.x/w,-1.,1.);
    float cupid=uFaceMouth.w*.055*(1.-smoothstep(0.,.77,abs(mx)));
    float lip=-.18+uFaceMouth.z*(mx*mx-.45)+cupid;
    vec2 mouth=vec2(face.x/w,(face.y-lip)/h);
    float md=length(mouth),aa=clamp(fwidth(md),.04,.30);
    float opening=1.-smoothstep(1.-aa,1.+aa,md);
    float tongue=(1.-smoothstep(.68,1.06,length((mouth-vec2(.07,-.87))/vec2(.78,.59))))*smoothstep(.16,.59,uFaceMouth.y);
    painted=mix(painted,mix(vec3(.085,.036,.057),vec3(.96,.32,.41),tongue),opening);
    vec2 drop=face-vec2(.435,-.12);
    float tear=uFaceExtra.y*disk(drop,vec2(0.),vec2(.044,.060));
    painted=mix(painted,vec3(.60,.85,.99),tear);
    painted=mix(painted,vec3(.99),tear*disk(drop,vec2(-.014,.016),vec2(.014)));
    ink=max(ink,opening)*visible;
    body=mix(body,painted,visible);
  }

  // ---- 6. Crisp Fine Carbonated Fizz Bubbles ----
  for(int i=0;i<64;i++){
    if(uQuality<.5&&i>=32)break;
    vec4 bdata=uBubbles[i];
    vec3 bubble=center+bdata.xyz*radii;
    float radius=bdata.w*(slot==0?1.:.65);
    vec3 oc=vWorld+R*.001-bubble;
    float bb=dot(oc,R),dd=bb*bb-dot(oc,oc)+radius*radius;
    if(dd>0.&&bb<0.){
      float t=-bb-sqrt(dd);
      if(t>0.&&t<thickness+.08){
        vec3 bn=normalize(vWorld+R*t-bubble);
        float br=pow(1.-abs(dot(bn,-R)),2.0);
        float gloss=pow(max(dot(bn,normalize(L+V)),0.),64.);
        float vis=uBubbleStates[i].y*(1.-ink);
        body=mix(body,body*.34,br*.70*vis);
        body+=(vec3(.84,.98,1.)*br*.38+uSunColor*gloss*1.45)*vis*mix(.26,1.,uDaylight);
      }
    }
  }

  if(uElement>2.5&&uElement<3.5)body+=uColor*.06*(.5+.5*sin(uTime*22.));

  gl_FragColor=vec4(max(body,vec3(0.)),1.);
  #include <colorspace_fragment>
}`;

export class SlimeRenderer {
 scene:any;mesh:any;xray:any;geometry:any;material:any;xrayMaterial:any;frame:MeshFrame|null=null;private shadows:any[]=[];private proxy:any;private color:any;private drawingSize:any;private bubbles:FizzBubbles;private actorTarget:any;private compositeScene:any;private compositeMat:any;private compositeGeo:any;private compositeCamera:any;private reflectionCopy:any;private reflectionCopyMat:any;private reflectionCopyScene:any;
 constructor(private ctx:any,private world:CollisionWorld=flatWorld){
  const T=ctx.THREE;this.scene=new T.Scene();
  this.geometry=new T.BufferGeometry();
  this.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(27000),3).setUsage(T.DynamicDrawUsage));
  this.geometry.setAttribute('normal',new T.BufferAttribute(new Float32Array(27000),3).setUsage(T.DynamicDrawUsage));
  this.geometry.setAttribute('cluster',new T.BufferAttribute(new Float32Array(9000),1).setUsage(T.DynamicDrawUsage));
  this.geometry.setDrawRange(0,0);
  const uniforms={uOffset:{value:new T.Vector3()},uBackground:{value:null},uDepth:{value:null},uResolution:{value:new T.Vector2()},uCenters:{value:Array.from({length:6},()=>new T.Vector3())},uRadii:{value:Array.from({length:6},()=>new T.Vector3(.3,.2,.3))},uColor:{value:new T.Color(elements[DEFAULT_ELEMENT].color)},uRim:{value:new T.Color(elements[DEFAULT_ELEMENT].rim)},uForward:{value:new T.Vector3(0,0,-1)},uSun:{value:ctx.sun.position.clone().normalize()},uDaylight:ctx.U?.uDaylight??{value:1},uSkyHorizon:ctx.U?.uSkyHorizon??{value:new T.Color().setRGB(.24,.40,.48)},uSkyZenith:ctx.U?.uSkyZenith??{value:new T.Color().setRGB(.36,.56,.68)},uSunColor:ctx.U?.uSunColor??{value:new T.Color(0xfff1d5)},uTime:{value:0},uNear:{value:.05},uFar:{value:1500},uReflectionPass:{value:0},uXray:{value:0},uQuality:{value:1},uElement:{value:DEFAULT_ELEMENT},uBlink:{value:0},uSpread:{value:0},uDome:{value:1},uFacePose:{value:new T.Vector4(1,.92,.05,0)},uFaceMouth:{value:new T.Vector4(.115,.04,.085,0)},uFaceExtra:{value:new T.Vector3(.46,0,0)}};
  this.bubbles=new FizzBubbles(T,this.scene,uniforms);
  this.material=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,depthTest:true,depthWrite:true});
  if(ctx.U?.uBodyRainHits){
    this.material.defines.HOME_RAIN_CONTACT=1;
    Object.assign(this.material.uniforms,{uBodyRainHits:ctx.U.uBodyRainHits,uRainClock:ctx.U.uTime,uHomeRain:ctx.U.uRain});
  }
  this.mesh=new T.Mesh(this.geometry,this.material);this.mesh.name='PBF Slime';this.mesh.frustumCulled=false;this.mesh.renderOrder=1;this.scene.add(this.mesh);
  this.xrayMaterial=new T.ShaderMaterial({uniforms:{...uniforms,uXray:{value:1}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthTest:false,depthWrite:false});
  this.xray=new T.Mesh(this.geometry,this.xrayMaterial);this.xray.frustumCulled=false;this.xray.renderOrder=2;this.scene.add(this.xray);this.drawingSize=new T.Vector2();
  this.proxy=new T.Mesh(this.geometry,new T.MeshBasicMaterial({colorWrite:false,depthWrite:false}));this.proxy.layers.set(1);this.proxy.castShadow=true;this.proxy.frustumCulled=false;ctx.sun.shadow?.camera.layers.enable(1);ctx.scene.add(this.proxy);
  const shadowMat=new T.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{uOpacity:{value:.42},uTint:{value:new T.Color(0x22a88c)}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uOpacity;uniform vec3 uTint;varying vec2 vUv;void main(){
      float d=length(vUv*2.-1.);
      float core=pow(max(0.,1.-d),1.8)*uOpacity;
      float ring=smoothstep(.48,.74,d)*(1.-smoothstep(.74,.98,d))*uOpacity*.65;
      vec3 col=mix(vec3(.04,.12,.14),uTint,clamp(ring*1.6,0.,1.));
      gl_FragColor=vec4(col,clamp(core+ring*.48,0.,.62));
    }`,
  });
  for(let i=0;i<6;i++){const mesh=new T.Mesh(new T.PlaneGeometry(1,1),shadowMat.clone());mesh.rotation.x=-Math.PI/2;mesh.layers.set(1);mesh.renderOrder=3;ctx.scene.add(mesh);this.shadows.push(mesh)}
  shadowMat.dispose();this.color=new T.Color();
  this.actorTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});this.actorTarget.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  this.compositeScene=new T.Scene();this.compositeCamera=new T.Camera();this.compositeGeo=new T.PlaneGeometry(2,2);
  this.compositeMat=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{uImage:{value:this.actorTarget.texture},uActorDepth:{value:this.actorTarget.depthTexture}},vertexShader:"varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}",fragmentShader:"uniform sampler2D uImage;uniform sampler2D uActorDepth;varying vec2 vUv;void main(){gl_FragColor=texture2D(uImage,vUv);if(gl_FragColor.a<0.001)discard;gl_FragDepth=texture2D(uActorDepth,vUv).r;\n#include <colorspace_fragment>\n}"});
  this.compositeScene.add(new T.Mesh(this.compositeGeo,this.compositeMat));
 }
 receive(frame:MeshFrame){
  this.frame=frame;
  this.geometry.attributes.position.array.set(frame.positions.subarray(0,frame.count*3));
  this.geometry.attributes.normal.array.set(frame.normals.subarray(0,frame.count*3));
  this.geometry.attributes.cluster.array.set(frame.slots.subarray(0,frame.count));
  for(const a of Object.values(this.geometry.attributes) as any[])a.needsUpdate=true;
  this.geometry.setDrawRange(0,frame.count);
  for(let i=0;i<6;i++){
   if(frame.centers[i]){this.material.uniforms.uCenters.value[i].fromArray(frame.centers[i]);this.material.uniforms.uRadii.value[i].fromArray(frame.radii[i])}
   const shadow=this.shadows[i],c=frame.centers[i],r=frame.radii[i];shadow.visible=!!c;
   if(c&&r){
    const solidFloor=this.world.support(c[0],c[2],c[1]+.1,true);
    const fluidLevel=this.world.fluid(c[0],c[2]);
    const inOpenWater=fluidLevel!==null&&(solidFloor===null||solidFloor<fluidLevel-.18);
    const floor=inOpenWater?null:solidFloor;
    shadow.visible=floor!==null;
    if(floor!==null){
     shadow.position.set(c[0],floor+.006,c[2]);shadow.userData.base=[c[0],floor+.006,c[2]];
     const domeScale=i===0?1+(frame.shapeBlend??1)*.32:1;
     shadow.scale.set(r[0]*2.9*domeScale,r[2]*2.9*domeScale,1);
     shadow.material.uniforms.uOpacity.value=.44*Math.max(0,1-(c[1]-floor)/2);
    }
   }
  }
 }
 renderReflection(renderer:any,camera:any,target:any){if(!this.frame)return;const T=this.ctx.THREE,u=this.material.uniforms;if(!this.reflectionCopy){this.reflectionCopy=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});this.reflectionCopyMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uImage:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D uImage;varying vec2 vUv;void main(){gl_FragColor=texture2D(uImage,vUv);}'});this.reflectionCopyScene=new T.Scene();this.reflectionCopyScene.add(new T.Mesh(this.compositeGeo,this.reflectionCopyMat));}if(this.reflectionCopy.width!==target.width||this.reflectionCopy.height!==target.height)this.reflectionCopy.setSize(target.width,target.height);this.reflectionCopyMat.uniforms.uImage.value=target.texture;const auto=renderer.autoClear;renderer.autoClear=true;renderer.setRenderTarget(this.reflectionCopy);renderer.render(this.reflectionCopyScene,this.compositeCamera);u.uBackground.value=this.reflectionCopy.texture;u.uResolution.value.set(target.width,target.height);u.uNear.value=camera.near;u.uFar.value=camera.far;u.uReflectionPass.value=1;this.xray.visible=false;renderer.autoClear=false;renderer.setRenderTarget(target);renderer.render(this.scene,camera);this.xray.visible=true;u.uReflectionPass.value=0;renderer.autoClear=auto;}
 setFace(face:FaceDirector){
  const u=this.material.uniforms,p=face.pose;
  u.uFacePose.value.set(p.eyeWidth,p.eyeOpen,p.eyeArc,p.gazeY);
  u.uFaceMouth.value.set(p.mouthWidth,p.mouthOpen,p.smile,p.doubleSmile);
  u.uFaceExtra.value.set(p.blush,p.tear,p.wink);
  u.uBlink.value=face.blink;
 }
 setOffset(o:Vec){this.offset=o;}
 private offset:Vec=[0,0,0];
 render(pass:any,forward:Vec,element:number,quality:Quality,underlay?:(actor:{color:any;depth:any})=>void){
  if(!this.frame)return;const u=this.material.uniforms,T=this.ctx.THREE;
  {const o=this.offset;u.uOffset.value.set(o[0],o[1],o[2]);for(let i=0;i<6;i++){const c=this.frame.centers[i];if(c){u.uCenters.value[i].fromArray(c);if(!i)u.uCenters.value[i].add(u.uOffset.value);}const sh=this.shadows[i],b=sh.userData.base;if(b)sh.position.set(b[0]+(i?0:o[0]),b[1],b[2]+(i?0:o[2]));sh.material.uniforms.uTint.value.set(element===1?0x22a88c:elements[element].color);}this.proxy.position.set(o[0],o[1],o[2]);}
  u.uBackground.value=pass.color;u.uDepth.value=pass.depth;this.ctx.renderer.getDrawingBufferSize(this.drawingSize);u.uResolution.value.copy(this.drawingSize);u.uForward.value.fromArray(forward);u.uColor.value.set(elements[element].color);u.uRim.value.set(elements[element].rim);u.uTime.value=pass.time;u.uNear.value=this.ctx.camera.near;u.uFar.value=this.ctx.camera.far;u.uQuality.value=quality==='high'?1:0;u.uElement.value=element;u.uSpread.value=this.frame.spread;u.uDome.value=this.frame.shapeBlend??1;if(this.ctx.U?.uSunDir?.value){const s=this.ctx.U.uSunDir.value;const flip=s.y<0?-1:1;u.uSun.value.set(s.x*flip,Math.max(.18,s.y*flip),s.z*flip).normalize();}else if(this.ctx.sun?.position){u.uSun.value.copy(this.ctx.sun.position).normalize();}
  this.bubbles.update(pass.time,this.frame.spread,forward);
  const renderer=this.ctx.renderer,auto=renderer.autoClear,clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();
  if(this.actorTarget.width!==this.drawingSize.x||this.actorTarget.height!==this.drawingSize.y)this.actorTarget.setSize(this.drawingSize.x,this.drawingSize.y);
  renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(this.actorTarget);renderer.clear();renderer.render(this.scene,this.ctx.camera);
  renderer.setClearColor(clear,alpha);renderer.setRenderTarget(pass.target??null);
  this.compositeMat.depthWrite=this.compositeMat.depthTest=!!pass.target;
  if(underlay)underlay({color:this.actorTarget.texture,depth:this.actorTarget.depthTexture});
  renderer.autoClear=false;renderer.render(this.compositeScene,this.compositeCamera);renderer.autoClear=auto;
 }
 dispose(){this.reflectionCopy?.dispose();this.reflectionCopyMat?.dispose();this.actorTarget.dispose();this.compositeGeo.dispose();this.compositeMat.dispose();this.bubbles.dispose();this.proxy.removeFromParent();this.proxy.material.dispose();for(const s of this.shadows){s.removeFromParent();s.geometry.dispose();s.material.dispose()}this.geometry.dispose();this.material.dispose();this.xrayMaterial.dispose();this.frame=null;}
}
