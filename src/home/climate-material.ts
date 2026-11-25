// Shared uniforms keep streamed models, the build preview and native scenery in sync.
export const surfaceClimate = {season:{value:0}, snow:{value:0}, wet:{value:0}};
type Surface = 'terrain' | 'leaves' | 'structure';
const patched = new WeakSet<object>();

export function climateMaterial(mat:any, surface:Surface) {
  if (patched.has(mat)) return mat;
  patched.add(mat);
  const previous = mat.onBeforeCompile, key = mat.customProgramCacheKey();
  mat.onBeforeCompile = function(shader:any, renderer:any) {
    previous.call(this,shader,renderer);
    shader.uniforms.seasonIndex=surfaceClimate.season;
    shader.uniforms.snowCover=surfaceClimate.snow;
    shader.uniforms.surfaceWet=surfaceClimate.wet;
    shader.vertexShader = 'varying vec3 climatePoint;\n' + shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 climateLocal=vec4(transformed,1.);
      #ifdef USE_INSTANCING
        climateLocal=instanceMatrix*climateLocal;
      #endif
      climatePoint=(modelMatrix*climateLocal).xyz;`);
    shader.fragmentShader = 'varying vec3 climatePoint; uniform float seasonIndex,snowCover,surfaceWet;\n' + shader.fragmentShader.replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
      vec3 baseColor=diffuseColor.rgb;
      float green=smoothstep(.005,.09,baseColor.g-baseColor.b)*smoothstep(-.035,.055,baseColor.g-baseColor.r);
      float fleck=.5+.5*sin(dot(climatePoint.xz,vec2(.63,.47))+sin(climatePoint.z*1.4));
      float lum=dot(baseColor,vec3(.26,.59,.15));
      ${surface==='structure'?'':`
      vec3 seasonal=baseColor*vec3(1.13,1.27,.91)+vec3(.022,.043,.009)*fleck;
      if(seasonIndex>.5)seasonal=baseColor*vec3(.63,.95,.78);
      if(seasonIndex>1.5)seasonal=mix(vec3(.94,.36,.07),vec3(1.08,.72,.19),fleck)*(lum+.045);
      if(seasonIndex>2.5)seasonal=mix(baseColor,vec3(lum)*vec3(.92,1.04,1.13),.70);
      diffuseColor.rgb=mix(baseColor,seasonal,green*${surface==='terrain'?'.83':'1.'});`}
      vec3 face=cross(dFdx(climatePoint),dFdy(climatePoint));
      float upward=smoothstep(.13,.74,face.y/max(length(face),.000001));
      ${surface==='terrain'?`
      if(seasonIndex<.5){
        vec2 meadowUV=climatePoint.xz*3.6;
        vec2 cell=floor(meadowUV);
        vec2 center=.23+.54*fract(sin(vec2(dot(cell,vec2(2.7,8.3)),dot(cell,vec2(4.9,3.2))))*2871.3);
        float petal=1.-smoothstep(.052,.14,length(fract(meadowUV)-center));
        float meadow=smoothstep(.70,.90,fleck)*upward*green;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.88,.83,.61),petal*meadow*.68);
      }`:''}
      diffuseColor.rgb*=1.-surfaceWet*(.06+.15*upward);
      float mantle=snowCover*upward*clamp(.75+fleck*.33,0.,1.);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.79,.88,.93),mantle*.94);`);
  };
  mat.customProgramCacheKey=()=>key+'-home-climate-'+surface;
  mat.needsUpdate=true;
  return mat;
}
