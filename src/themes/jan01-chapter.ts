import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {bakeRegion} from '../world/bake';
import type {Stage,StageLook} from '../level/stage';
import type {WorldDefinition} from '../slime/world';

export const deskLight: StageLook = {skyTop:'#b4bab1',skyHorizon:'#d9d5be',sun:'#fff5df',sunIntensity:1.8,hemiSky:'#f5f5ee',hemiGround:'#989183',ink:'#373c38',wash:'#ece7da',fog:[23,65]};
export function texture(w:number,h:number,paint:(g:CanvasRenderingContext2D)=>void){
  const c=document.createElement('canvas'); c.width=w;c.height=h;paint(c.getContext('2d')!);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
export function fibers(g:CanvasRenderingContext2D,w:number,h:number,amount=1600){
  let seed=173;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
  for(let i=0;i<amount;i++){const x=rand()*w,y=rand()*h;g.strokeStyle=i%3?'#84704b22':'#fffaf18a';
    g.lineWidth=rand()+.3;g.beginPath();g.moveTo(x,y);g.lineTo(x+1+rand()*6,y+rand()*3);g.stroke();}
}
/** Bake before batching, so the walkable paper and props keep their original names. */
export function bakeDesk(stage:Stage,root:T.Group):WorldDefinition{
  const b=bakeRegion(stage,{root,x0:-12,z0:-14,w:24,h:28,ground:()=>null,classify:m=>m.name.startsWith('solid-')?'filled':null});
  return {boxes:[],surfaces:[],height:b.height??undefined};
}
export function batch(parent:T.Group){
  parent.updateWorldMatrix(true,true);
  const inv=parent.matrixWorld.clone().invert(),groups=new Map<T.Material,T.BufferGeometry[]>();
  const meshes=parent.children.filter((m):m is T.Mesh=>m instanceof T.Mesh&&!Array.isArray(m.material));
  let palette:T.MeshToonMaterial|undefined;
  for(const m of meshes){
    const geom=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(new T.Matrix4().multiplyMatrices(inv,m.matrixWorld));
    if(!geom.attributes.uv)geom.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geom.attributes.position.count*2),2));
    let mat=m.material;
    if(mat instanceof T.MeshToonMaterial&&!mat.map&&!mat.transparent&&mat.side===T.FrontSide){
      if(!palette){palette=mat.clone();palette.color.set(0xffffff);palette.vertexColors=true;}
      const colors=new Float32Array(geom.attributes.position.count*3);
      for(let i=0;i<colors.length;i+=3)mat.color.toArray(colors,i);
      geom.setAttribute('color',new T.BufferAttribute(colors,3));mat=palette;
    }
    const list=groups.get(mat)??[];list.push(geom);groups.set(mat,list);parent.remove(m);
  }
  for(const [mat,geoms] of groups){const geo=mergeGeometries(geoms);if(!geo)throw Error('无法合并场景表面');const m=new T.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;parent.add(m);for(const g of geoms)g.dispose();}
}
export function workbench(stage:Stage){
  const root=new T.Group(),fixed=new T.Group();root.add(fixed);stage.scene.add(root);
  const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,16,10);
  function part(geo:T.BufferGeometry,mat:T.Material|string,x:number,y:number,z:number,w:number,h:number,d:number,parent:T.Object3D=fixed,name=''){
    const m=new T.Mesh(geo,typeof mat==='string'?stage.toon(mat):mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.name=name;
    m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  const box=(mat:T.Material|string,x:number,y:number,z:number,w:number,h:number,d:number,parent:T.Object3D=fixed,name='')=>part(cube,mat,x,y,z,w,h,d,parent,name);
  const oval=(color:string,x:number,y:number,z:number,w:number,h:number,d:number,parent:T.Object3D=fixed)=>part(sphere,color,x,y,z,w,h,d,parent);
  const cylinder=(color:string,x:number,y:number,z:number,top:number,base:number,h:number,parent:T.Object3D=fixed)=>part(new T.CylinderGeometry(top,base,h,24),color,x,y,z,1,1,1,parent);
  const group=(parent:T.Object3D=root)=>{const g=new T.Group();parent.add(g);return g;};
  return {root,fixed,part,box,oval,cylinder,group};
}
