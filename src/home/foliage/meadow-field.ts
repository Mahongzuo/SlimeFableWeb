import * as THREE from 'three';
import type {GrassExcludeBox} from './grass-ism';

export type MeadowArea = {min: [number, number]; max: [number, number]};
export const CELL_METRES = 8;
export const CANDIDATES_PER_METRE = 176;
const FIELD_STEP = .5;

/** Half-metre samples. Heights are interpolated on the actual diagonal of the ground mesh. */
export class MeadowSurface {
  readonly data: Float32Array;
  readonly texture: THREE.DataTexture;
  readonly width: number;
  readonly height: number;
  readonly cells: THREE.Vector3[] = [];
  private exclusions = new Map<string, GrassExcludeBox>();

  constructor(readonly area: MeadowArea, ground: (x: number,z: number) => number,
    cover: (x: number,z: number) => number) {
    this.width = Math.ceil((area.max[0]-area.min[0])/FIELD_STEP)+1;
    this.height = Math.ceil((area.max[1]-area.min[1])/FIELD_STEP)+1;
    this.data = new Float32Array(this.width*this.height*4);
    const viable = new Map<string, THREE.Vector3>();
    for (let j=0; j<this.height; j++) for (let i=0; i<this.width; i++) {
      const x=area.min[0]+i*FIELD_STEP, z=area.min[1]+j*FIELD_STEP;
      const k=(j*this.width+i)*4;
      this.data[k]=ground(x,z);
      this.data[k+1]=Math.max(0,Math.min(1,cover(x,z)));
      this.data[k+3]=1;
      if (this.data[k+1]>.02) {
        const cx=Math.floor(x/CELL_METRES)*CELL_METRES, cz=Math.floor(z/CELL_METRES)*CELL_METRES;
        const key=cx+','+cz;
        if (!viable.has(key)) viable.set(key,new THREE.Vector3(cx+CELL_METRES/2,this.data[k]+.4,cz+CELL_METRES/2));
      }
    }
    this.cells.push(...viable.values());
    for(let j=0;j<this.height;j++) for(let i=0;i<this.width;i++){
      const k=(j*this.width+i)*4;
      const dx=(this.data[(j*this.width+Math.min(this.width-1,i+1))*4]-this.data[(j*this.width+Math.max(0,i-1))*4]);
      const dz=(this.data[(Math.min(this.height-1,j+1)*this.width+i)*4]-this.data[(Math.max(0,j-1)*this.width+i)*4]);
      this.data[k+2]=Math.max(.4,1-.3*Math.hypot(dx,dz));
    }
    this.texture=new THREE.DataTexture(this.data,this.width,this.height,THREE.RGBAFormat,THREE.FloatType);
    this.texture.needsUpdate=true;
  }

  sample(x:number,z:number,channel=0):number {
    const gx=Math.max(0,Math.min(this.width-1,(x-this.area.min[0])/FIELD_STEP));
    const gz=Math.max(0,Math.min(this.height-1,(z-this.area.min[1])/FIELD_STEP));
    const i=Math.min(this.width-2,Math.floor(gx)),j=Math.min(this.height-2,Math.floor(gz));
    const fx=gx-i, fz=gz-j,k=(j*this.width+i)*4+channel;
    const east=this.data[k+4],south=this.data[k+this.width*4];
    return fx+fz<=1 ? this.data[k]*(1-fx-fz)+east*fx+south*fz
      : this.data[k+(this.width+1)*4]*(fx+fz-1)+east*(1-fz)+south*(1-fx);
  }

  /** Rasterize only footprints that moved, disappeared or were newly built on this field. */
  setExclusions(boxes: readonly GrassExcludeBox[]) {
    const next = new Map<string,GrassExcludeBox>();
    const bounds = (b:GrassExcludeBox) => {
      const c=Math.abs(Math.cos(b.yaw??0)), s=Math.abs(Math.sin(b.yaw??0));
      const hx=b.hx*c+b.hz*s+.7, hz=b.hx*s+b.hz*c+.7;
      return [b.x-hx,b.z-hz,b.x+hx,b.z+hz];
    };
    for(const box of boxes) {
      const [x0,z0,x1,z1]=bounds(box);
      if(x1<this.area.min[0]||z1<this.area.min[1]||x0>this.area.max[0]||z0>this.area.max[1])continue;
      next.set([box.x,box.z,box.hx,box.hz,box.yaw??0].join(','),box);
    }
    const changed=[...next].filter(([k])=>!this.exclusions.has(k)).concat([...this.exclusions].filter(([k])=>!next.has(k)));
    if(!changed.length)return;
    this.exclusions=next;
    const prepared=Array.from(next.values(),b=>({...b,c:Math.cos(b.yaw??0),s:Math.sin(b.yaw??0)}));
    for (const [,box] of changed) {
      const [x0,z0,x1,z1]=bounds(box);
      for(let j=Math.max(0,Math.floor((z0-this.area.min[1])/FIELD_STEP));j<=Math.min(this.height-1,Math.ceil((z1-this.area.min[1])/FIELD_STEP));j++)
        for(let i=Math.max(0,Math.floor((x0-this.area.min[0])/FIELD_STEP));i<=Math.min(this.width-1,Math.ceil((x1-this.area.min[0])/FIELD_STEP));i++){
          const x=this.area.min[0]+i*FIELD_STEP,z=this.area.min[1]+j*FIELD_STEP;
          let keep=1;
          for(const b of prepared){
            const dx=x-b.x,dz=z-b.z;
            const outside=Math.max(Math.abs(dx*b.c-dz*b.s)-b.hx,Math.abs(dx*b.s+dz*b.c)-b.hz);
            keep=Math.min(keep,Math.max(0,(outside-.22)/.28));
            if(!keep)break;
          }
          this.data[(j*this.width+i)*4+3]=keep;
        }
    }
    this.texture.needsUpdate=true;
  }
}

/** Native terrain planes are sampled on a 1 m vertex grid. Cache grid vertices for the denser meadow field. */
export function triangleGround(ground:(x:number,z:number)=>number) {
  const rows=new Map<number,Map<number,number>>();
  const at=(x:number,z:number)=>{
    let row=rows.get(z);
    if(!row){row=new Map();rows.set(z,row);}
    let h=row.get(x);
    if(h===undefined){h=ground(x,z);row.set(x,h);}
    return h;
  };
  return (x:number,z:number)=>{
    const i=Math.floor(x),j=Math.floor(z),fx=x-i,fz=z-j;
    return fx+fz<=1 ? at(i,j)*(1-fx-fz)+at(i+1,j)*fx+at(i,j+1)*fz
      : at(i+1,j+1)*(fx+fz-1)+at(i+1,j)*(1-fz)+at(i,j+1)*(1-fx);
  };
}

export function meadowViewDistance(quality:number) {
  return quality<.4?32:quality<.75?50:quality<.95?72:96;
}

export const FIELD_GLSL = `
uniform sampler2D uMeadowField;
uniform vec4 uFieldRect;
vec4 meadowSample(vec2 xz) {
  vec2 raw=(xz-uFieldRect.xy)*2.;
  ivec2 sz=textureSize(uMeadowField,0);
  vec2 p=clamp(raw,vec2(0),vec2(sz-1));
  ivec2 q=min(ivec2(floor(p)),sz-2);
  vec2 f=p-vec2(q);
  vec4 a=texelFetch(uMeadowField,q,0);
  vec4 b=texelFetch(uMeadowField,q+ivec2(1,0),0),c=texelFetch(uMeadowField,q+ivec2(0,1),0);
  vec4 d=texelFetch(uMeadowField,q+ivec2(1,1),0);
  vec4 v=f.x+f.y<=1.?a*(1.-f.x-f.y)+b*f.x+c*f.y:d*(f.x+f.y-1.)+b*(1.-f.y)+c*(1.-f.x);
  if(any(lessThan(xz,uFieldRect.xy))||any(greaterThanEqual(xz,uFieldRect.zw)))v.y=0.;
  return v;
}`;
