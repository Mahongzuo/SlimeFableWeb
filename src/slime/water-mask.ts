export interface WaterPatch {x:number;z:number;rx:number;rz:number;rot:number}
export function waterUniforms(T:any,patches:WaterPatch[]=[]){return {uWaterCount:{value:Math.min(16,patches.length)},uWaterPatches:{value:Array.from({length:16},(_,i)=>{const p=patches[i];return new T.Vector4(p?.x??0,p?.z??0,p?.rx??1,p?.rz??1)})},uWaterAngles:{value:Array.from({length:16},(_,i)=>new T.Vector2(Math.cos(patches[i]?.rot??0),Math.sin(patches[i]?.rot??0)))}};}
export const waterMaskGLSL=`uniform int uWaterCount;uniform vec4 uWaterPatches[16];uniform vec2 uWaterAngles[16];

uint w_pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float w_hu(uint v){ return float(w_pcg(v)) * (1.0 / 4294967296.0); }
float w_h2i(vec2 c){ ivec2 i = ivec2(floor(c)); return w_hu((uint(i.x) * 1664525u) ^ w_pcg(uint(i.y) + 1013904223u)); }
float w_h3i(vec3 c){ ivec3 i = ivec3(floor(c)); return w_hu(w_pcg(uint(i.x) + w_pcg(uint(i.y) + w_pcg(uint(i.z) + 7919u)))); }
float w_vnoise(vec2 p){
  vec2 i = floor(p), fr = fract(p); vec2 u = fr * fr * (3.0 - 2.0 * fr);
  return mix(mix(w_h2i(i), w_h2i(i + vec2(1.0, 0.0)), u.x), mix(w_h2i(i + vec2(0.0, 1.0)), w_h2i(i + vec2(1.0, 1.0)), u.x), u.y);
}

float sceneWater(vec2 world){float wet=0.;for(int i=0;i<16;i++){if(i>=uWaterCount)break;vec4 p=uWaterPatches[i];vec2 d=world-p.xy,c=uWaterAngles[i];vec2 local=vec2(d.x*c.x-d.y*c.y,d.x*c.y+d.y*c.x)/p.zw;float r=length(local),angle=atan(local.y,local.x),seed=float(i)*.618+.13;vec2 np=local*1.2+vec2(seed*13.1,seed*7.7);float edge=min(1.3,1.+.34*(w_vnoise(np*1.5)-.5)+.16*(w_vnoise(np*3.6+5.)-.5)+.05*sin(angle*3.+seed*20.));wet=max(wet,1.-smoothstep(-.008,.015,r-edge));}return wet;}
`;
