import * as T from 'three';
import atlasEntries from '../../../public/models/companions/preserve-impostors.json';
import {spawnPackModel,type SpawnedPackModel} from '../model-pack';
import type {RanchPose} from '../ranch-models';
import {climateMaterial} from '../climate-material';

const entries:Record<string,{row:number;span:number;center:number;tile:number[]}>=atlasEntries;
const noise='fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))';
export const detailAt=(d:number,near:number,far:number)=>1-T.MathUtils.smoothstep(d,near,far);
export interface PlantPose {x:number;y:number;z:number;height:number;yaw:number}
export interface Impostor extends PlantPose {asset:string;weight:number;owner?:T.Group}

/** Cutout geometry writes scene depth. Near and far representations claim complementary pixels. */
export function detailMaterial(source:T.Material,range:{value:T.Vector2},instanced=false){
  const mat=source.clone(),compile=source.onBeforeCompile,key=source.customProgramCacheKey();
  mat.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);
    shader.uniforms.detailInterval=range;
    shader.fragmentShader='uniform vec2 detailInterval; varying float vDetail;\n'+shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
      float grain=${noise}; if(grain<detailInterval.x || grain>=min(vDetail,detailInterval.y))discard;`);
    shader.vertexShader='varying float vDetail;\n'+shader.vertexShader.replace('#include <color_vertex>',
      instanced?T.ShaderChunk.color_vertex.replace('vColor.xyz *= instanceColor.xyz;', 'vDetail=instanceColor.r;'):'#include <color_vertex>\n vDetail=1.;');
  };
  mat.customProgramCacheKey=()=>key+'-preserve-dither-'+Number(instanced);
  return mat;
}

let atlas:T.Texture|undefined;
export class PreserveImpostors{
  readonly mesh:T.InstancedMesh;
  private frame:T.InstancedBufferAttribute;
  private rect:T.InstancedBufferAttribute;
  private matrix=new T.Matrix4();
  constructor(private items:Impostor[],ctx:any){
    atlas??=new T.TextureLoader().load('/models/companions/preserve-impostors.webp');
    atlas.colorSpace=T.SRGBColorSpace;
    const geo=new T.PlaneGeometry(1,1);
    this.frame=new T.InstancedBufferAttribute(new Float32Array(items.length*4),4).setUsage(T.DynamicDrawUsage);
    geo.setAttribute('frameData',this.frame);
    this.rect=new T.InstancedBufferAttribute(new Float32Array(items.length*4),4).setUsage(T.DynamicDrawUsage);
    geo.setAttribute('tileRect',this.rect);
    const mat=new T.ShaderMaterial({uniforms:{map:{value:atlas},sun:ctx.U.uSunDir},
      vertexShader:`attribute vec4 frameData,tileRect; varying vec2 tile; varying vec2 nextTile; varying float turn; varying float cut; varying float canopy;
      void main(){
        vec3 root=instanceMatrix[3].xyz;
        vec2 delta=cameraPosition.xz-root.xz;
        vec2 dir=delta/max(.0001,length(delta)), right=vec2(dir.y,-dir.x);
        vec3 world=root+vec3(right.x*position.x,position.y,right.y*position.x)*instanceMatrix[0].x;
        float angle=(atan(dir.x,dir.y)-frameData.y)*1.27323954;
        float column=mod(floor(angle),8.);
        tile=tileRect.xy+(uv+vec2(column,0.))*tileRect.zw;
        nextTile=tileRect.xy+(uv+vec2(mod(column+1.,8.),0.))*tileRect.zw; turn=smoothstep(.16,.84,fract(angle));
        cut=frameData.z;canopy=frameData.w;climatePoint=world;
        gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
      }`,fragmentShader:`uniform sampler2D map;uniform vec3 sun;varying vec2 tile;varying vec2 nextTile;varying float turn;varying float cut;varying float canopy;
        void main(){vec4 a=texture2D(map,tile), b=texture2D(map,nextTile);
        float alpha=mix(a.a,b.a,turn);if(alpha<.28||${noise}<1.-cut)discard;
        vec4 c=vec4(mix(a.rgb*a.a,b.rgb*b.a,turn)/alpha,1.);
        vec4 diffuseColor=c;
        #include <alphamap_fragment>
        vec3 light=mix(vec3(.065,.095,.15),vec3(.95,.99,.94),smoothstep(-.08,.42,sun.y));
        gl_FragColor=vec4(mix(c.rgb,diffuseColor.rgb,canopy)*light,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`});
    climateMaterial(mat,'leaves');
    this.mesh=new T.InstancedMesh(geo,mat,items.length);this.mesh.name='preserve-horizon';
    this.mesh.layers.set(1);this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.update();
  }
  update(){
    let count=0;
    for(const p of this.items){
      if(p.weight<=.001||p.owner?.visible===false)continue;
      const entry=entries[p.asset],span=p.height*entry.span;
      this.matrix.makeScale(span,span,span).setPosition(p.x,p.y+p.height*entry.center,p.z);
      this.mesh.setMatrixAt(count,this.matrix);
      const [u,v,du,dv]=entry.tile;this.rect.setXYZW(count,u,v,du,dv);
      this.frame.setXYZW(count,entry.row,p.yaw,p.weight,p.asset==='redwood-tree'||p.asset.startsWith('nature-')?1:0);count++;
    }
    this.mesh.count=count;this.mesh.visible=count>0;
    if(count){this.mesh.instanceMatrix.needsUpdate=true;this.frame.needsUpdate=true;this.rect.needsUpdate=true;}
  }
  dispose(){this.mesh.removeFromParent();this.mesh.dispose();this.mesh.geometry.dispose();(this.mesh.material as T.Material).dispose();}
}

type Tier='near'|'far';
interface Rig {tier:Tier;model:SpawnedPackModel;range:{value:T.Vector2};materials:T.Material[];ready:boolean}
export class WildlifeLod{
  readonly group=new T.Group();
  private current?:Rig;private incoming?:Rig;private blend=0;private coverage=0;private retry=0;
  constructor(readonly sprite:Impostor,private phase:number,private hasFar:boolean){sprite.owner=this.group;}
  private load(tier:Tier){
    const materials:T.Material[]=[],range={value:new T.Vector2(0,0)};
    const model=spawnPackModel(T,'ranch-'+this.sprite.asset+(tier==='far'?'-far':''),this.sprite.height,{
      outline:false,castShadow:tier==='near',phaseOffset:this.phase,placeholder:false,
      onLoaded:(root:T.Group)=>{
        const copies=new Map<T.Material,T.Material>();
        const clone=(m:T.Material)=>{let copy=copies.get(m);if(!copy){copy=detailMaterial(m,range);copies.set(m,copy);materials.push(copy);}return copy;};
        root.traverse(o=>{if(o instanceof T.Mesh)o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);});
        rig.ready=true;
      },onError:()=>{if(this.incoming===rig){this.drop(rig);this.incoming=undefined;this.retry=3;}}
    });
    const rig:Rig={tier,model,range,materials,ready:false};
    this.group.add(model.group);return rig;
  }
  private drop(r?:Rig){if(r){r.model.dispose();r.materials.forEach(m=>m.dispose());}}
  update(d:number,dt:number,pose:RanchPose){
    this.retry=Math.max(0,this.retry-dt);
    const tier:Tier=this.hasFar && d>(this.current?.tier==='near'?29:23)?'far':'near';
    if(d<69&&!this.incoming&&this.current?.tier!==tier&&!this.retry){this.incoming=this.load(tier);this.blend=0;}
    if(this.incoming?.ready&&!this.current){this.current=this.incoming;this.incoming=undefined;}
    const target=this.current?detailAt(d,43,64):0;
    this.coverage=T.MathUtils.clamp(target,this.coverage-2.4*dt,this.coverage+2.4*dt);
    if(this.incoming?.ready){
      this.blend=Math.min(1,this.blend+dt*2.2);
      this.incoming.range.value.set(0,this.coverage*this.blend);
      if(this.blend===1){this.drop(this.current);this.current=this.incoming;this.incoming=undefined;this.blend=0;}
    }
    this.current?.range.value.set(this.coverage*this.blend,this.coverage);
    for(const rig of [this.current,this.incoming])if(rig){rig.model.setPose?.(pose);rig.model.group.visible=rig.ready&&rig.range.value.y>rig.range.value.x;}
    this.sprite.weight=1-this.coverage;
    if(d>77&&this.coverage===0){this.drop(this.current);this.drop(this.incoming);this.current=this.incoming=undefined;this.blend=0;}
  }
  dispose(){this.drop(this.current);this.drop(this.incoming);this.group.removeFromParent();this.sprite.weight=0;}
}
