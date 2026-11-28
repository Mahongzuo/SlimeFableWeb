import {DataTexture,LinearFilter,LinearMipmapLinearFilter,RepeatWrapping,Vector4} from 'three';

// A periodic height spectrum baked once on the CPU. The derivatives make normal
// maps, not visible marks. Integer wave vectors keep their mipmapped edges seamless.
function normalField(seed:number) {
  const size=128,bytes=new Uint8Array(size*size*4);
  const random=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296;
  const waves=Array.from({length:21},(_,i)=>{
    const angle=random()*Math.PI,k=2+Math.floor(i*.68);
    return {x:Math.round(k*Math.cos(angle)),z:Math.round(k*Math.sin(angle)),phase:random()*Math.PI*2,amp:.24/(1+k*.23)};
  });
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){
    let dx=0,dz=0;
    for(const w of waves){
      const slope=w.amp*Math.cos((w.x*i+w.z*j)*2*Math.PI/size+w.phase)/Math.max(1,Math.hypot(w.x,w.z));
      dx+=slope*w.x;dz+=slope*w.z;
    }
    const q=1/Math.hypot(dx,dz,1),p=4*(i+size*j);
    bytes[p]=127.5*(1+dx*q);bytes[p+1]=127.5*(1+dz*q);bytes[p+2]=255*q;bytes[p+3]=255;
  }
  const map=new DataTexture(bytes,size,size);
  map.wrapS=map.wrapT=RepeatWrapping;map.generateMipmaps=true;map.minFilter=LinearMipmapLinearFilter;map.magFilter=LinearFilter;map.needsUpdate=true;
  return map;
}
export function waterWaves(ctx:any){
  return ctx.waterWaves??={normals:[normalField(5311),normalField(98761)],events:Array.from({length:8},()=>new Vector4(0,0,-100,0)),cursor:0,animalCursor:0,animalEvents:Array.from({length:8},()=>new Vector4(0,0,-100,0)),surfaces:new Set<any>()};
}
export function disturbWater(ctx:any,x:number,z:number,strength:number){
  const waves=waterWaves(ctx);
  waves.events[waves.cursor].set(x,z,ctx.U.uTime.value,strength);
  waves.cursor=(waves.cursor+1)%waves.events.length;
}

export function disturbAnimalWater(ctx:any,x:number,z:number,strength:number){
  const waves=waterWaves(ctx);
  waves.animalEvents[waves.animalCursor].set(x,z,ctx.U.uTime.value,strength);
  waves.animalCursor=(waves.animalCursor+1)%waves.animalEvents.length;
}
