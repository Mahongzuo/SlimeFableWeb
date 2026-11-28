import {ContactEffects,transientElement} from './contact-fx';
import {WallFilm} from './wall-film';
import {waterUniforms,waterMaskGLSL} from './water-mask';
import {elements} from './elements';
import {MeshFrame,Vec,clamp,distance} from './types';
import {CollisionWorld} from './world';
import {ssrGLSL} from './ssr';
import {Deposit,extractContacts} from './contact';

const SIZE=1536,SPAN=16,MAX=12,BUBBLES=128;
const screenVertex=`varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}`;
const atlasFragment=`precision highp float;uniform sampler2D uPrevious;uniform sampler2D uPreviousDye;uniform vec3 uPalette[6];layout(location=0)out vec4 outFluid;layout(location=1)out vec4 outDye;uniform vec2 uTexel;uniform float uDt;uniform float uTime;uniform vec2 uOrigin;uniform vec2 uPreviousOffset;uniform vec4 uStarts[12];uniform vec4 uSplats[12];uniform vec4 uShape[12];uniform float uContours[384];varying vec2 vUv;
${waterMaskGLSL}
float life(float e){return e>4.5?10.5:8.;}
void main(){vec2 previousUV=vUv+uPreviousOffset;float valid=step(0.,min(previousUV.x,previousUV.y))*step(max(previousUV.x,previousUV.y),1.);vec4 old=texture2D(uPrevious,previousUV)*valid;vec4 oldDye=texture2D(uPreviousDye,previousUV)*valid;float element=floor(old.a/max(old.r,.00001)+.5);vec3 dye=oldDye.rgb/max(old.r,.00001);float ground=oldDye.a/max(old.r,.00001);float depth=old.r*exp(-uDt*2.5/life(element));vec2 world=vUv*16.+uOrigin;float pressure=0.;
for(int i=0;i<12;i++){if(uShape[i].w<=0.)continue;vec2 segment=uSplats[i].xy-uStarts[i].xy;float along=clamp(dot(world-uStarts[i].xy,segment)/max(dot(segment,segment),.000001),0.,1.);vec2 d=world-mix(uStarts[i].xy,uSplats[i].xy,along);float ang=atan(d.y,d.x);float bin=fract(ang/6.2831853+1.)*32.;int ib=int(floor(bin));int nb=ib==31?0:ib+1;int pb=ib==0?31:ib-1;int nn=nb==31?0:nb+1;float t=fract(bin),a=uContours[i*32+pb],b=uContours[i*32+ib],c=uContours[i*32+nb],e=uContours[i*32+nn];float radius=.5*((2.*b)+(-a+c)*t+(2.*a-5.*b+4.*c-e)*t*t+(-a+3.*b-3.*c+e)*t*t*t);if(radius<=0.)radius=uSplats[i].z;float isStone=step(4.5,uSplats[i].w);float edge=radius*(1.+.10*isStone)-length(d);float waterNoise=.023*sin(world.x*5.1+sin(world.y*3.7))+.012*sin(world.y*8.2+world.x*2.8);float rockNoise=.034*sin(ang*7.+world.x*3.3)+.020*cos(ang*13.-world.y*4.7);float noise=mix(waterNoise,rockNoise,isStone);float fresh=smoothstep(-.018,.018,edge+noise)*uShape[i].w;if(fresh>depth){depth=fresh;element=uSplats[i].w;dye=uPalette[int(clamp(element,0.,5.))];ground=uShape[i].y;}pressure=max(pressure,fresh*(1.-isStone));}
depth*=1.-sceneWater(world);float h=old.g,v=old.b;if(element>4.5){h=0.;v=0.;}else{float lap=texture2D(uPrevious,previousUV+vec2(uTexel.x,0.)).g+texture2D(uPrevious,previousUV-vec2(uTexel.x,0.)).g+texture2D(uPrevious,previousUV+vec2(0.,uTexel.y)).g+texture2D(uPrevious,previousUV-vec2(0.,uTexel.y)).g-4.*h;v=(v+lap*9.*uDt)*exp(-uDt*2.5);v+=pressure*sin(uTime*9.+world.x*8.+world.y*7.)*.002*uDt;h=clamp(h+v*uDt,-.018,.018);if(depth<.02){h=0.;v=0.;}}outFluid=vec4(depth,h,v,element*depth);outDye=vec4(dye*depth,ground*depth);}`;
const wetSSR=ssrGLSL.replace('return linearDepth(texture2D(uDepth,uv).r);','return linearDepth(min(texture2D(uDepth,uv).r,texture2D(uActorDepth,uv).r));').replace('return texture2D(uBackground,uv).rgb;','vec4 actor=texture2D(uActorColor,uv);return mix(texture2D(uBackground,uv).rgb,actor.rgb,actor.a);');
const wetFragment=`precision highp float;uniform mat4 projectionMatrix;uniform mat4 uInvProjection;uniform mat4 uInvView;uniform sampler2D uBackground;uniform sampler2D uDepth;uniform sampler2D uActorColor;uniform sampler2D uActorDepth;uniform sampler2D uAtlas;uniform sampler2D uDye;uniform vec2 uOrigin;uniform vec2 uTexel;uniform float uNear;uniform float uFar;uniform float uTime;uniform float uQuality;uniform vec3 uPalette[6];uniform vec3 uSun;uniform float uDaylight;uniform vec3 uSkyHorizon;uniform vec3 uSkyZenith;uniform vec3 uSunColor;varying vec2 vUv;
float linearDepth(float d){return uNear*uFar/(uFar+(uNear-uFar)*d);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 hash2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float voronoiEdge(vec2 p){vec2 n=floor(p),f=fract(p);float md1=8.,md2=8.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 o=hash2(n+g);vec2 r=g+o-f;float d=dot(r,r);if(d<md1){md2=md1;md1=d;}else if(d<md2){md2=d;}}return sqrt(md2)-sqrt(md1);}
vec4 cubicField(sampler2D tex,vec2 uv){vec2 p=uv/uTexel-.5,i=floor(p),f=fract(p),f2=f*f,f3=f2*f;vec2 w0=(1.-3.*f+3.*f2-f3)/6.,w1=(4.-6.*f2+3.*f3)/6.,w2=(1.+3.*f+3.*f2-3.*f3)/6.,w3=f3/6.;vec2 g0=w0+w1,g1=w2+w3,h0=(i-1.+w1/g0+.5)*uTexel,h1=(i+1.+w3/g1+.5)*uTexel;return texture2D(tex,h0)*g0.x*g0.y+texture2D(tex,vec2(h1.x,h0.y))*g1.x*g0.y+texture2D(tex,vec2(h0.x,h1.y))*g0.x*g1.y+texture2D(tex,h1)*g1.x*g1.y;}
// Physical slime Steep Parallax Occlusion crater heightfield: 0 = flush ground, 1 = deep fractured pit bottom
float craterSample(vec2 wxz,out float maskOut,out float crackOut){
  vec2 uv=(wxz-uOrigin)/16.;
  float m=0.;
  if(min(uv.x,uv.y)>=0.&&max(uv.x,uv.y)<=1.)m=texture2D(uAtlas,uv).r;
  maskOut=m;
  float pit=smoothstep(.22,.82,m);
  float e1=voronoiEdge(wxz*4.6);
  float e2=voronoiEdge(wxz*9.8+vec2(3.7,8.1));
  float c1=1.-smoothstep(.022,.095,e1);
  float c2=1.-smoothstep(.014,.070,e2);
  crackOut=clamp(c1*.92+c2*.48,0.,1.)*smoothstep(.16,.40,m);
  float grain=(vnoise(wxz*20.)-.5)*.06*pit;
  float bowl=pow(pit,.78)*.76+crackOut*.26+grain;
  return clamp(bowl,0.,1.);
}
${waterMaskGLSL}
${wetSSR}
void main(){float depth=texture2D(uDepth,vUv).r;if(depth>.999999)discard;vec4 vp=uInvProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);vec3 world=(uInvView*vec4(vp.xyz/vp.w,1.)).xyz;float water=abs(world.y-.012)<.12?sceneWater(world.xz):0.;if(water>.99)discard;vec2 mapUV=(world.xz-uOrigin)/16.;if(min(mapUV.x,mapUV.y)<0.||max(mapUV.x,mapUV.y)>1.)discard;vec4 field=cubicField(uAtlas,mapUV);float aa=max(fwidth(field.r)*.85,.025);float fade=smoothstep(.16-aa,.16+aa,field.r);if(fade<.01)discard;vec4 dyeField=cubicField(uDye,mapUV);float element=floor(field.a/max(field.r,.00001)+.5);float floorY=dyeField.a/max(field.r,.00001);if(abs(world.y-floorY)>.12)discard;vec3 groundN=normalize(cross(dFdx(world),dFdy(world)));if(abs(groundN.y)<.65)discard;

// Physical (element == 5): Steep Parallax Occlusion smashed crater decal (matte stone, Voronoi cracks, self-shadowing, ZERO water sheen)
if(element>4.5){
  vec3 V=normalize(cameraPosition-world);
  vec2 rayXZ=-V.xz/max(V.y,.42);
  float maxDepthM=.125;
  float layers=mix(18.,8.,clamp(V.y,0.,1.));
  float layerStep=1./layers;
  vec2 deltaXZ=rayXZ*maxDepthM*layerStep;
  vec2 curXZ=world.xz;
  float curLayer=0.;
  float m0,c0;
  float curH=craterSample(curXZ,m0,c0);
  vec2 prevXZ=curXZ;
  float prevH=curH;
  for(int i=0;i<18;i++){
    if(float(i)>=layers||curLayer>=curH)break;
    prevXZ=curXZ;prevH=curH;
    curXZ+=deltaXZ;
    curLayer+=layerStep;
    curH=craterSample(curXZ,m0,c0);
  }
  float afterD=curH-curLayer;
  float beforeD=prevH-(curLayer-layerStep);
  float wt=clamp(afterD/max(afterD-beforeD,.0001),0.,1.);
  vec2 hitXZ=mix(curXZ,prevXZ,wt);
  float hitMask,hitCrack;
  float hitDepth=craterSample(hitXZ,hitMask,hitCrack);
  // Flush surface rim ring (no negative height extrusion so grazing edges stay 100% clean)
  float surfRim=smoothstep(.16,.28,field.r)*(1.-smoothstep(.28,.48,field.r));
  // Finite-difference 3D crater wall & fracture normal
  float eps=.022;
  float tm,tc;
  float hxP=craterSample(hitXZ+vec2(eps,0.),tm,tc);
  float hxN=craterSample(hitXZ-vec2(eps,0.),tm,tc);
  float hzP=craterSample(hitXZ+vec2(0.,eps),tm,tc);
  float hzN=craterSample(hitXZ-vec2(0.,eps),tm,tc);
  vec3 Ncr=normalize(vec3((hxP-hxN)*4.2,1.,(hzP-hzN)*4.2));
  // 2-step directional self-shadowing inside the pit toward sun
  vec3 L=normalize(uSun);
  vec2 sunStep=L.xz/max(L.y,.35)*maxDepthM;
  float sh1=craterSample(hitXZ+sunStep*.38,tm,tc);
  float sh2=craterSample(hitXZ+sunStep*.78,tm,tc);
  float occ=max(clamp((hitDepth-.12)-sh1,0.,1.),clamp((hitDepth-.28)-sh2,0.,1.));
  float selfShadow=1.-smoothstep(.02,.24,occ)*.74;
  // Inherit real ground albedo (warped into pit by parallax) + fractured subsoil slabs
  vec2 shiftXZ=hitXZ-world.xz;
  vec2 bgShift=clamp(vec2(shiftXZ.x,-shiftXZ.y)*.028,vec2(-.014),vec2(.014));
  vec3 base=texture2D(uBackground,clamp(vUv+bgShift,vec2(.002),vec2(.998))).rgb;
  float pitBand=smoothstep(.06,.56,hitDepth);
  float rockTex=vnoise(hitXZ*26.)*.14+vnoise(hitXZ*58.)*.07;
  vec3 stoneWall=mix(base*.68,vec3(.30,.27,.23)+rockTex*.24,.38);
  vec3 deepFloor=mix(base*.36,vec3(.13,.11,.095),.52);
  vec3 rimDust=mix(base*1.06,vec3(.62,.58,.50),.32);
  vec3 albedo=mix(base,rimDust,surfRim*.78);
  albedo=mix(albedo,stoneWall,pitBand);
  albedo=mix(albedo,deepFloor,smoothstep(.50,.92,hitDepth));
  albedo=mix(albedo,vec3(.045,.040,.035),hitCrack*.86);
  float ndotl=clamp(dot(Ncr,L),0.,1.);
  float ao=clamp(1.-hitDepth*.56-hitCrack*.48,.22,1.);
  float dayScale=mix(.24,1.,uDaylight);
  vec3 lit=albedo*(mix(.22,.38,uDaylight)+mix(.42,.92,uDaylight)*ndotl*selfShadow)*ao;
  lit+=vec3(.12,.10,.08)*surfRim*ndotl*dayScale;
  float craterAlpha=smoothstep(.16-aa,.26+aa,field.r)*(1.-water);
  gl_FragColor=vec4(lit,clamp(craterAlpha*.95,0.,1.));
  #include <colorspace_fragment>
  return;
}

float left=texture2D(uAtlas,mapUV-vec2(uTexel.x,0.)).r,right=texture2D(uAtlas,mapUV+vec2(uTexel.x,0.)).r,down=texture2D(uAtlas,mapUV-vec2(0.,uTexel.y)).r,up=texture2D(uAtlas,mapUV+vec2(0.,uTexel.y)).r;float dx=(left-right)*.22,dz=(down-up)*.22;float hwx=texture2D(uAtlas,mapUV+vec2(uTexel.x,0.)).g-texture2D(uAtlas,mapUV-vec2(uTexel.x,0.)).g,hwz=texture2D(uAtlas,mapUV+vec2(0.,uTexel.y)).g-texture2D(uAtlas,mapUV-vec2(0.,uTexel.y)).g;
vec2 cells=world.xz/.11,cid=floor(cells),f=fract(cells),bubbleN=vec2(0.);float bubbleLight=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 id=cid+vec2(x,y);float rnd=hash(id);if(rnd>.28)continue;float phase=fract(uTime*(.3+rnd*.7)+hash(id+17.));float rad=mix(.11,.33,hash(id+7.))*smoothstep(0.,.45,phase);vec2 d=f-(vec2(x,y)+.20+vec2(hash(id+3.),hash(id+5.))*.6);float r=length(d),dome=1.-smoothstep(rad*.7,rad,r),pop=smoothstep(.65,.78,phase)*(1.-smoothstep(.78,1.,phase));float ring=exp(-pow((r-rad*(1.+pop*1.8))/.027,2.))*pop;bubbleN+=d/max(rad,.01)*dome*.12;bubbleLight+=dome*.04+ring*.10;}
float ripple=sin(world.x*8.+uTime*.7)*cos(world.z*9.-uTime*.8)*.002;vec3 N=normalize(vec3(dx+hwx*5.+bubbleN.x+ripple,1.,dz+hwz*5.+bubbleN.y+ripple)),V=normalize(cameraPosition-world),R=reflect(-V,N);vec4 reflection=traceSSR(world+N*.025,R);float fres=.035+.965*pow(1.-max(dot(N,V),0.),5.);vec3 tint=dyeField.rgb/max(field.r,.00001),base=texture2D(uBackground,vUv+N.xz*.003).rgb;vec3 wet=base*mix(vec3(.42,.51,.53),tint*.38+vec3(.18),.42),sky=mix(uSkyHorizon,uSkyZenith,clamp(R.y,0.,1.)),refl=mix(sky,reflection.rgb,reflection.a);float rim=clamp(length(vec2(left-right,down-up))*2.5,0.,1.),dry=1.-smoothstep(.1,.65,field.r);float reflWeight=clamp(.20+fres*.56-dry*.22,.08,.74);wet=mix(wet,refl,reflWeight);wet*=1.-rim*.30;float dayLum=mix(.14,1.,uDaylight);float spec=pow(max(dot(N,normalize(uSun+V)),0.),500.)*(1.-dry);wet+=uSunColor*(spec*mix(.20,.82,uDaylight))+tint*rim*.035*dayLum+bubbleLight*dayLum;float opacity=fade*(.88-dry*.12)*(1.-water);
// Deposited element stays in the atlas when the player switches element.
if(element>.5&&element<1.5)opacity*=.76;
else if(element>3.5&&element<4.5){wet=mix(wet,vec3(.003,.004,.008),.84);opacity=fade*.96*(1.-water);}
gl_FragColor=vec4(wet,clamp(opacity,0.,1.));
#include <colorspace_fragment>
}`;

/** Persistent GPU trail decal atlas: liquid film for Water/Wind/Dark and Steep Parallax Occlusion craters for Physical. */
export class TrailDecals {
 readonly wall:WallFilm;readonly contactFX:ContactEffects;
 mesh:any;material:any;geometry:any;stamps=0;last=new Map<number,Vec>();private targets:any[];private current=0;private atlasScene:any;private displayScene:any;private atlasMaterial:any;private screenCamera:any;private live:Deposit[]=[];private queued:Deposit[]=[];private origin:[number,number]=[-8,-8];private previousContacts=new Map<number,Deposit>();private starts=new Map<number,Vec>();private time=0;private lastTime=0;private size:any;private bubbleMesh:any;private bubblePos=new Float32Array(BUBBLES*6*3);private bubbleData=new Float32Array(BUBBLES*6*4);private bubbleCursor=0;private pendingClear=true;
 constructor(private T:any,private world:CollisionWorld,private ctx:any){this.size=new T.Vector2();this.targets=[0,1].map(()=>new T.WebGLRenderTarget(SIZE,SIZE,{count:2,type:T.HalfFloatType,depthBuffer:false,stencilBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter}));this.atlasScene=new T.Scene();this.displayScene=new T.Scene();this.screenCamera=new T.Camera();this.geometry=new T.PlaneGeometry(2,2);this.atlasMaterial=new T.ShaderMaterial({glslVersion:T.GLSL3,depthTest:false,depthWrite:false,uniforms:{...waterUniforms(T,world.definition.water),uOrigin:{value:new T.Vector2(-8,-8)},uPreviousOffset:{value:new T.Vector2()},uStarts:{value:Array.from({length:MAX},()=>new T.Vector4())},uPrevious:{value:this.targets[0].textures[0]},uPreviousDye:{value:this.targets[0].textures[1]},uPalette:{value:elements.map(e=>new T.Color(e.color))},uTexel:{value:new T.Vector2(1/SIZE,1/SIZE)},uDt:{value:0},uTime:{value:0},uSplats:{value:Array.from({length:MAX},()=>new T.Vector4())},uShape:{value:Array.from({length:MAX},()=>new T.Vector4())},uContours:{value:new Float32Array(MAX*32)}},vertexShader:screenVertex,fragmentShader:atlasFragment});this.atlasScene.add(new T.Mesh(this.geometry,this.atlasMaterial));
this.material=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{...waterUniforms(T,world.definition.water),uOrigin:{value:new T.Vector2(-8,-8)},uBackground:{value:null},uDepth:{value:null},uActorColor:{value:null},uActorDepth:{value:null},uAtlas:{value:this.targets[0].textures[0]},uDye:{value:this.targets[0].textures[1]},uInvProjection:{value:new T.Matrix4()},uInvView:{value:new T.Matrix4()},uTexel:{value:new T.Vector2(1/SIZE,1/SIZE)},uNear:{value:.04},uFar:{value:300},uTime:{value:0},uQuality:{value:1},uPalette:{value:elements.map(e=>new T.Color(e.color))},uSun:{value:ctx.sun.position.clone().normalize()},uDaylight:ctx.U?.uDaylight??{value:1},uSkyHorizon:ctx.U?.uSkyHorizon??{value:new T.Color().setRGB(.24,.40,.48)},uSkyZenith:ctx.U?.uSkyZenith??{value:new T.Color().setRGB(.36,.56,.68)},uSunColor:ctx.U?.uSunColor??{value:new T.Color(0xfff1d5)},uResolution:{value:new T.Vector2()}},vertexShader:screenVertex,fragmentShader:wetFragment});this.mesh=new T.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=0;this.displayScene.add(this.mesh);this.createBubbles();this.wall=new WallFilm(T,this.displayScene,this.material.uniforms);this.contactFX=new ContactEffects(T,this.displayScene,world,this.material.uniforms);}
 get contacts(){return this.live;}
 get contactCount(){return this.live.length;}
 feed(frame:MeshFrame,element:number,controllerGrounded:boolean){const contacts=extractContacts(frame,element,controllerGrounded,this.world);
 this.contactFX.contacts=transientElement(element)?contacts:[];
 if(transientElement(element)){this.live=[];this.previousContacts.clear();this.starts.clear();this.last.clear();return;}this.starts.clear();for(const d of contacts){const prev=this.previousContacts.get(d.id);if(prev&&prev.element===d.element&&distance(prev.center,d.center)<.30&&Math.abs(prev.center[1]-d.center[1])<.03)this.starts.set(d.id,[...prev.center]);}this.previousContacts=new Map(contacts.map(d=>[d.id,d]));this.live=contacts;for(const d of this.live)this.walk(d.id,d.center,d.element,this.time,d.radius)}

 stamp(p:Vec,element:number,time:number,radius=.32,strength=1){if(transientElement(element))return false;const floor=this.world.support(p[0],p[2],p[1]+.3);if(floor===null||Math.abs(p[1]-floor)>.5)return false;const source=this.live.find(s=>distance(s.center,p)<.4);this.queued.push({id:source?.id??-1,center:[p[0],floor,p[2]],radius:source?.radius??radius,contour:source?[...source.contour]:new Array(32).fill(radius),element,strength:Math.min(.92,strength)});if(this.queued.length>12)this.queued.shift();if(element!==5)this.spawnBubbles(p,element,time,radius);this.stamps++;return true;}
 walk(id:number,p:Vec,element:number,time:number,radius=.32){const last=this.last.get(id);if(!last||distance(p,last)>.08){if(this.stamp(p,element,time,radius))this.last.set(id,[...p])}}
 prune(ids:number[]){const live=new Set([0,...ids]);for(const id of this.last.keys())if(!live.has(id))this.last.delete(id)}
 update(time:number,element:number,grounded:boolean){this.time=time;this.contactFX.update(time,element,grounded);}
 private createBubbles(){const T=this.T,g=new T.BufferGeometry(),uv=new Float32Array(BUBBLES*6*2),corners=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];this.bubbleData.fill(-100);for(let i=0;i<BUBBLES;i++)for(let k=0;k<6;k++)uv.set(corners[k],(i*6+k)*2);g.setAttribute('position',new T.BufferAttribute(this.bubblePos,3).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('bubble',new T.BufferAttribute(this.bubbleData,4).setUsage(T.DynamicDrawUsage));const mat=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:this.material.uniforms,vertexShader:`attribute vec4 bubble;uniform float uTime;varying vec2 vUv;varying float vFade;varying vec3 vBase;void main(){vBase=position;float t=(uTime-bubble.x)/(1.5+bubble.y);vUv=uv;float rise=max(0.,t-.38)*.12,growth=mix(.3,1.,smoothstep(0.,.5,t)),pop=smoothstep(.65,.85,t);vec3 p=position;p.y+=rise;vec4 v=viewMatrix*vec4(p,1.);v.xy+=uv*bubble.z*growth*(1.+pop*2.);vFade=(1.-smoothstep(.65,1.,t))*step(0.,t)*step(t,1.);gl_Position=projectionMatrix*v;}`,fragmentShader:`uniform sampler2D uDepth;uniform vec2 uResolution;uniform float uNear;uniform float uFar;uniform float uDaylight;varying vec2 vUv;varying float vFade;varying vec3 vBase;${waterMaskGLSL}
float linearDepth(float d){return uNear*uFar/(uFar+(uNear-uFar)*d);}void main(){if(vFade<.01||sceneWater(vBase.xz)>.5)discard;float r=length(vUv);if(r>1.)discard;if(linearDepth(gl_FragCoord.z)>linearDepth(texture2D(uDepth,gl_FragCoord.xy/uResolution).r)+.03)discard;float rim=pow(r,5.)*(1.-smoothstep(.86,1.,r)),highlight=exp(-length(vUv-vec2(-.35,.4))*9.);vec3 bCol=(vec3(.55,.83,.87)+highlight)*mix(vec3(.18,.28,.44),vec3(1.),uDaylight);gl_FragColor=vec4(bCol,(rim*.85+highlight*.7)*vFade*mix(.52,1.,uDaylight));}`});this.bubbleMesh=new T.Mesh(g,mat);this.bubbleMesh.frustumCulled=false;this.bubbleMesh.renderOrder=1;this.displayScene.add(this.bubbleMesh);}
 private spawnBubbles(p:Vec,element:number,time:number,radius:number){if(element===5)return;for(let k=0;k<3;k++){const i=this.bubbleCursor++%BUBBLES,seed=i*37.71+time,angle=Math.sin(seed)*Math.PI*2,reach=radius*Math.sqrt((Math.sin(seed*3.7)+1)*.5)*.85;const x=p[0]+Math.cos(angle)*reach,z=p[2]+Math.sin(angle)*reach,y=this.world.support(x,z,p[1]+.1);if(y===null)continue;for(let v=0;v<6;v++){this.bubblePos.set([x,y+.008,z],(i*6+v)*3);this.bubbleData.set([time+k*.15,.5+.5*Math.sin(seed*2.1),.008+(.5+.5*Math.cos(seed))*.013,element],(i*6+v)*4)}}this.bubbleMesh.geometry.attributes.position.needsUpdate=true;this.bubbleMesh.geometry.attributes.bubble.needsUpdate=true;}
 render(pass:any,actor:{color:any;depth:any},quality:string){const renderer=this.ctx.renderer,T=this.T,dt=this.lastTime?clamp(this.time-this.lastTime,0,.10):1/60;const auto=renderer.autoClear,clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();renderer.autoClear=true;
if(this.pendingClear){renderer.setClearColor(0,0);for(const target of this.targets){renderer.setRenderTarget(target);renderer.clear()}this.pendingClear=false;this.current=0;this.lastTime=0}
if(this.time-this.lastTime>1/30||this.queued.length){const deposits=[...this.live,...this.queued].slice(0,MAX),u=this.atlasMaterial.uniforms;const center=this.live.find(d=>d.id===0)?.center;const nextOrigin:[number,number]=[...this.origin];if(center&&(Math.abs(center[0]-(this.origin[0]+SPAN/2))>3||Math.abs(center[2]-(this.origin[1]+SPAN/2))>3)){nextOrigin[0]=Math.round(center[0]/2)*2-SPAN/2;nextOrigin[1]=Math.round(center[2]/2)*2-SPAN/2;}u.uPreviousOffset.value.set((nextOrigin[0]-this.origin[0])/SPAN,(nextOrigin[1]-this.origin[1])/SPAN);this.origin=nextOrigin;u.uOrigin.value.set(...this.origin);u.uPrevious.value=this.targets[this.current].textures[0];u.uPreviousDye.value=this.targets[this.current].textures[1];u.uDt.value=dt;u.uTime.value=this.time;for(let i=0;i<MAX;i++){const d=deposits[i];u.uShape.value[i].set(0,d?.center[1]??0,0,d?.strength??0);if(d){const start=this.starts.get(d.id)??d.center;u.uStarts.value[i].set(start[0],start[2],0,0);u.uSplats.value[i].set(d.center[0],d.center[2],d.radius,d.element);for(let j=0;j<32;j++)u.uContours.value[i*32+j]=d.contour[j]}}const next=1-this.current;renderer.setRenderTarget(this.targets[next]);renderer.render(this.atlasScene,this.screenCamera);this.current=next;this.queued=[];this.lastTime=this.time;}
const u=this.material.uniforms;u.uOrigin.value.set(...this.origin);u.uAtlas.value=this.targets[this.current].textures[0];u.uDye.value=this.targets[this.current].textures[1];u.uBackground.value=pass.color;u.uDepth.value=pass.depth;u.uActorColor.value=actor.color;u.uActorDepth.value=actor.depth;u.uInvProjection.value.copy(this.ctx.camera.projectionMatrixInverse);u.uInvView.value.copy(this.ctx.camera.matrixWorld);u.uNear.value=this.ctx.camera.near;u.uFar.value=this.ctx.camera.far;u.uTime.value=this.time;u.uQuality.value=quality==='high'?1:0;if(this.ctx.U?.uSunDir?.value){const s=this.ctx.U.uSunDir.value;const flip=s.y<0?-1:1;u.uSun.value.set(s.x*flip,Math.max(.18,s.y*flip),s.z*flip).normalize();}else if(this.ctx.sun?.position){u.uSun.value.copy(this.ctx.sun.position).normalize();}renderer.getDrawingBufferSize(this.size);u.uResolution.value.copy(this.size);renderer.setClearColor(clear,alpha);renderer.setRenderTarget(pass.target??null);renderer.autoClear=false;renderer.render(this.displayScene,this.ctx.camera);renderer.autoClear=auto;}
 reset(){this.wall.reset();this.contactFX.reset();this.pendingClear=true;this.live=[];this.queued=[];this.last.clear();this.previousContacts.clear();this.starts.clear();this.stamps=0;this.bubbleData.fill(-100);this.bubbleMesh.geometry.attributes.bubble.needsUpdate=true;}
 dispose(){this.wall.dispose();this.contactFX.dispose();for(const target of this.targets)target.dispose();this.geometry.dispose();this.material.dispose();this.atlasMaterial.dispose();this.bubbleMesh.geometry.dispose();this.bubbleMesh.material.dispose()}
}
