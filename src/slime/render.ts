import {MeshFrame,Quality,Vec} from './types';
import {elements} from './elements';
import {CollisionWorld,flatWorld} from './world';
import {FizzBubbles} from './bubbles';
import {FaceDirector} from './face';
import {ssrGLSL} from './ssr';

const vertex=`attribute float cluster;varying vec3 vWorld;varying vec3 vNormal;varying float vCluster;
uniform vec3 uOffset;
void main(){vWorld=position+uOffset;vNormal=normalize(normal);vCluster=cluster;gl_Position=projectionMatrix*viewMatrix*vec4(position+uOffset,1.);}`;

const fragment=`precision highp float;uniform mat4 projectionMatrix;
uniform sampler2D uBackground;uniform sampler2D uDepth;uniform vec2 uResolution;uniform vec3 uCenters[6];uniform vec3 uRadii[6];uniform vec3 uColor;uniform vec3 uRim;uniform vec3 uForward;uniform vec3 uSun;uniform float uTime;uniform float uNear;uniform float uFar;uniform float uReflectionPass;uniform float uXray;uniform float uQuality;uniform float uElement;uniform float uBlink;uniform float uSpread;uniform float uDome;uniform vec4 uFacePose;uniform vec2 uFaceExtra;uniform vec4 uBubbles[64];uniform vec2 uBubbleStates[64];
varying vec3 vWorld;varying vec3 vNormal;varying float vCluster;
float linearDepth(float d){return uNear*uFar/(uFar+(uNear-uFar)*d);}
float disk(vec2 p,vec2 c,vec2 size){return 1.-smoothstep(.82,1.,length((p-c)/size));}
float stroke(vec2 p,vec2 a,vec2 b,float width){vec2 d=b-a;float t=clamp(dot(p-a,d)/max(dot(d,d),.00001),0.,1.);return 1.-smoothstep(width*.55,width,length(p-a-d*t));}
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
    ? vec3(.34,.06,.09)
    : (vec3(1.)-uColor)*1.30;
  float pathLen=(.32+thickness*.65+pow(grazing,2.0)*1.15+(1.-relH)*.55);
  vec3 transmittance=exp(-pathLen*absorbCoeff);
  // Slight contrast deepening gives real wet-glass depth rather than flat paste
  vec3 body=pow(max(scene,vec3(.001)),vec3(1.08))*transmittance;

  // Crisp dark glass refraction band right along the silhouette & base contact meniscus (critical for "liquid volume"!)
  float rimDepth=pow(grazing,2.6);
  body*=mix(1.,.58,rimDepth*(1.-uSpread*.45));
  float baseShadow=smoothstep(.0,.085,relH);
  body*=mix(.52,1.,baseShadow);
  // Subtle emerald-teal caustic light trapped along the lower contact skirt (pure tint, no chalkiness)
  float skirtBand=smoothstep(.20,.025,relH)*smoothstep(.0,.045,relH);
  body*=mix(vec3(1.),uElement<.5?vec3(.72,1.08,.96):mix(vec3(1.),uColor*1.35,.55),skirtBand*.75);

  // ---- 3. Real SSR Environment Reflection + Delicate Thin-Film Iridescence ----
  float f0=.028;
  float fres=f0+(1.-f0)*pow(grazing,4.2);
  vec3 reflDir=reflect(I,N);
  // Neutral dark-to-sky studio gradient so grazing reflection adds contrast, never white fog
  vec3 skyRefl=mix(vec3(.12,.22,.24),vec3(.78,.89,.93),smoothstep(-.15,.85,reflDir.y));
  vec4 screenRefl=uReflectionPass>.5?vec4(0.):traceSSR(vWorld+N*.015,reflDir);
  vec3 envRefl=mix(skyRefl,screenRefl.rgb*1.05,clamp(screenRefl.a*1.15,0.,1.));

  // Thin-film soap-bubble iridescence modulates ONLY the Fresnel surface sheen
  float opd=grazing*2.6+relH*.55+thickness*.35;
  vec3 film=thinFilm(opd);
  vec3 surfaceSheen=envRefl*mix(vec3(1.),film*1.55,.42*smoothstep(.15,.85,grazing));
  body=mix(body,surfaceSheen,clamp(fres*.82,0.,.68));

  // Crisp bright liquid edge specular rim
  body+=mix(uRim,film,.55)*pow(grazing,5.8)*.34;

  // ---- 4. Single Sharp Sun Specular Catchlight (Clean Glass Drop) ----
  vec3 L=normalize(uSun);
  vec3 halfV=normalize(L+V);
  float specSharp=pow(max(dot(N,halfV),0.),560.)*2.4;
  float specHalo=pow(max(dot(N,halfV),0.),90.)*.12;
  body+=vec3(1.,.99,.97)*(specSharp+specHalo);

  // ---- 5. Procedural Face (clean & readable inside clear jelly) ----
  vec3 right=normalize(vec3(uForward.z,0.,-uForward.x));
  float domeComp=slot==0?uDome:0.;
  vec2 face=vec2(dot(vWorld-center,right)/min(radii.x,.27*mix(1.,1.06,domeComp)),(vWorld.y-center.y)/min(radii.y,.20*mix(1.,.92,domeComp)));
  float front=dot(normalize(vec3(vWorld.x-center.x,0.,vWorld.z-center.z)),uForward);
  float eyes=0.,shine=0.,brows=0.;float mouthKind=uFacePose.w;
  for(int side=-1;side<=1;side+=2){
    float sx=float(side)*.33;vec2 ep=face-vec2(sx,.14);
    float eh=.20*uFacePose.x/3.8*max(.08,1.-uBlink)*mix(1.,1.08,domeComp),ew=.11*uFacePose.y/3.2*mix(1.,.95,domeComp);
    if(mouthKind>6.5){eyes+=stroke(ep,vec2(-float(side)*.07,.09),vec2(float(side)*.04,0.),.027)+stroke(ep,vec2(float(side)*.04,0.),vec2(-float(side)*.07,-.09),.027);}
    else eyes+=disk(face,vec2(sx,.14),vec2(ew,eh));
    shine+=disk(face,vec2(sx-.025,.21),vec2(.032,.044))*step(.10,eh);
    if(abs(uFacePose.z)>.05)brows+=stroke(face,vec2(sx-.12,.41-float(side)*uFacePose.z*.07),vec2(sx+.12,.41+float(side)*uFacePose.z*.07),.018)*smoothstep(.05,.25,abs(uFacePose.z));
  }
  float mouth=(1.-smoothstep(.026,.055,abs(length((face-vec2(0.,-.19))*vec2(1.,1.5))-.12)))*(1.-smoothstep(-.18,-.13,face.y));
  if(mouthKind>.5&&mouthKind<1.5)mouth=stroke(face,vec2(-.1,-.25),vec2(.1,-.25),.027);
  else if(mouthKind>1.5&&mouthKind<2.5)mouth=disk(face,vec2(0.,-.25),vec2(.075,.095));
  else if(mouthKind>2.5&&mouthKind<3.5)mouth=(1.-smoothstep(.02,.04,abs(face.y-(-.26+.9*face.x*face.x))))*(1.-smoothstep(.1,.14,abs(face.x)));
  else if(mouthKind>3.5&&mouthKind<4.5)mouth=disk(face,vec2(0.,-.26),vec2(.15,.07))*(1.-smoothstep(-.23,-.19,face.y));
  else if(mouthKind>4.5&&mouthKind<5.5)mouth=stroke(face,vec2(-.08,-.25),vec2(.08,-.25),.02);
  else if(mouthKind>5.5){vec2 mp=face-vec2(0.,-.21);mouth=stroke(mp,vec2(-.12,0.),vec2(-.06,-.08),.025)+stroke(mp,vec2(-.06,-.08),vec2(0.,-.025),.025)+stroke(mp,vec2(0.,-.025),vec2(.06,-.08),.025)+stroke(mp,vec2(.06,-.08),vec2(.12,0.),.025);}
  float faceVisible=smoothstep(.46,.70,front)*(1.-smoothstep(.45,.95,uSpread));
  float ink=clamp((eyes+mouth+brows)*faceVisible,0.,1.);
  body=mix(body,vec3(.018,.040,.068),ink*.92);
  body+=vec3(.92,.98,1.)*shine*ink*.92;
  float blush=(disk(face,vec2(-.52,-.08),vec2(.13,.055))+disk(face,vec2(.52,-.08),vec2(.13,.055)))*uFaceExtra.y*faceVisible;
  body=mix(body,vec3(.85,.26,.38),blush*.42);

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
        body+=(vec3(.84,.98,1.)*br*.38+vec3(1.)*gloss*1.45)*vis;
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
  const uniforms={uOffset:{value:new T.Vector3()},uBackground:{value:null},uDepth:{value:null},uResolution:{value:new T.Vector2()},uCenters:{value:Array.from({length:6},()=>new T.Vector3())},uRadii:{value:Array.from({length:6},()=>new T.Vector3(.3,.2,.3))},uColor:{value:new T.Color(elements[0].color)},uRim:{value:new T.Color(elements[0].rim)},uForward:{value:new T.Vector3(0,0,-1)},uSun:{value:ctx.sun.position.clone().normalize()},uTime:{value:0},uNear:{value:.05},uFar:{value:1500},uReflectionPass:{value:0},uXray:{value:0},uQuality:{value:1},uElement:{value:0},uBlink:{value:0},uSpread:{value:0},uDome:{value:1},uFacePose:{value:new T.Vector4(3.8,3.2,0,0)},uFaceExtra:{value:new T.Vector2(10.5,0)}};
  this.bubbles=new FizzBubbles(T,this.scene,uniforms);
  this.material=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,depthTest:true,depthWrite:true});
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
  this.compositeMat=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{uImage:{value:this.actorTarget.texture}},vertexShader:"varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}",fragmentShader:"uniform sampler2D uImage;varying vec2 vUv;void main(){gl_FragColor=texture2D(uImage,vUv);\n#include <colorspace_fragment>\n}"});
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
    const floor=this.world.support(c[0],c[2],c[1]+.1);shadow.visible=floor!==null;
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
 setFace(face:FaceDirector){const u=this.material.uniforms;u.uFacePose.value.set(...face.pose.slice(0,4));u.uFaceExtra.value.set(face.pose[4],face.pose[5]);u.uBlink.value=face.blink;}
 setOffset(o:Vec){this.offset=o;}
 private offset:Vec=[0,0,0];
 render(pass:any,forward:Vec,element:number,quality:Quality,underlay?:(actor:{color:any;depth:any})=>void){
  if(!this.frame)return;const u=this.material.uniforms,T=this.ctx.THREE;
  {const o=this.offset;u.uOffset.value.set(o[0],o[1],o[2]);for(let i=0;i<6;i++){const c=this.frame.centers[i];if(c)u.uCenters.value[i].set(c[0]+o[0],c[1]+o[1],c[2]+o[2]);const sh=this.shadows[i],b=sh.userData.base;if(b)sh.position.set(b[0]+o[0],b[1],b[2]+o[2]);sh.material.uniforms.uTint.value.set(element===0?0x22a88c:elements[element].color);}this.proxy.position.set(o[0],o[1],o[2]);}
  u.uBackground.value=pass.color;u.uDepth.value=pass.depth;this.ctx.renderer.getDrawingBufferSize(this.drawingSize);u.uResolution.value.copy(this.drawingSize);u.uForward.value.fromArray(forward);u.uColor.value.set(elements[element].color);u.uRim.value.set(elements[element].rim);u.uTime.value=pass.time;u.uNear.value=this.ctx.camera.near;u.uFar.value=this.ctx.camera.far;u.uQuality.value=quality==='high'?1:0;u.uElement.value=element;u.uSpread.value=this.frame.spread;u.uDome.value=this.frame.shapeBlend??1;
  this.bubbles.update(pass.time,this.frame.spread,forward);
  const renderer=this.ctx.renderer,auto=renderer.autoClear,clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();
  if(this.actorTarget.width!==this.drawingSize.x||this.actorTarget.height!==this.drawingSize.y)this.actorTarget.setSize(this.drawingSize.x,this.drawingSize.y);
  renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(this.actorTarget);renderer.clear();renderer.render(this.scene,this.ctx.camera);
  renderer.setClearColor(clear,alpha);renderer.setRenderTarget(null);
  if(underlay)underlay({color:this.actorTarget.texture,depth:this.actorTarget.depthTexture});
  renderer.autoClear=false;renderer.render(this.compositeScene,this.compositeCamera);renderer.autoClear=auto;
 }
 dispose(){this.reflectionCopy?.dispose();this.reflectionCopyMat?.dispose();this.actorTarget.dispose();this.compositeGeo.dispose();this.compositeMat.dispose();this.bubbles.dispose();this.proxy.removeFromParent();this.proxy.material.dispose();for(const s of this.shadows){s.removeFromParent();s.geometry.dispose();s.material.dispose()}this.geometry.dispose();this.material.dispose();this.xrayMaterial.dispose();this.frame=null;}
}
