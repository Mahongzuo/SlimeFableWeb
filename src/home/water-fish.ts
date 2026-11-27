import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {LAKE} from '../world/map';
import {expansionHeight,slotForTile} from '../world/expansion';
import type {ExpandedTile} from '../life/state';
import {riverCenter,riverLevel} from './waterway';
import {spawnSimPondActor,type SimPondActorHandle,type SimPondSpeciesId} from './simpond-assets';
import {stepFishBoidFsm,type FishBoidAgent} from './simpond-ai';

type Species='fish-koi'|'fish-stream-trout';
interface School {key:string;id:Species;x:number;z:number;level:number;rx:number;rz:number;size:number;river?:boolean}
export function lotusPond(tile:ExpandedTile){
  const slot=slotForTile(tile);
  if(!slot||tile.theme!=='jiangnan')return null;
  const x=(slot.min[0]+slot.max[0])/2,z=(slot.min[1]+slot.max[1])/2;
  return {x,z,level:expansionHeight(x,z,slot,tile.theme)+.18,radius:Math.min(slot.max[0]-slot.min[0],slot.max[1]-slot.min[1])*.20};
}

// Fallback procedural mesh kept for instant visibility before GLBs stream in & headless Node tests.
function fishShape(id:Species){
  const body:any[]=[],tail:any[]=[],koi=id==='fish-koi';
  const base=koi?0xffe5ac:0x81b3a1,mark=koi?0xe25939:0xde9687;
  function oval(out:any[],x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number,tilt=0){
    const geo=new T.SphereGeometry(1,12,8);
    geo.scale(sx,sy,sz);geo.rotateX(tilt);geo.translate(x,y,z);
    const tint=new T.Color(color),colors=new Float32Array(geo.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3) tint.toArray(colors,i);
    geo.setAttribute('color',new T.BufferAttribute(colors,3));out.push(geo);
  }
  oval(body,0,.025,0,.21,.128,.49,base);
  oval(body,.026,.12,.13,.115,.055,.15,mark);oval(body,-.05,.107,-.18,.10,.052,.10,mark);
  for(const side of [-1,1]){
    oval(body,side*.178,-.022,.095,.14,.025,.085,mark);
    oval(body,side*.116,.078,.352,.035,.034,.034,0x263c3a);
    oval(tail,0,side*.068,-.15,.034,.075,.18,mark,side*.49);
  }
  return [mergeGeometries(body),mergeGeometries(tail)];
}
const schools:School[]=[
  {key:'pier',id:'fish-koi',x:4.2,z:110.6,level:LAKE.level,rx:2.6,rz:2.1,size:.85},
  {key:'lilies',id:'fish-koi',x:-7.5,z:114.5,level:LAKE.level,rx:3.5,rz:2.7,size:.94},
  ...[-13,5.8].map((z,i)=>({key:'river'+i,id:'fish-stream-trout' as Species,x:0,z,level:riverLevel,rx:.95,rz:3.3,size:.68,river:true})),
];
const KOI_MODELS: SimPondSpeciesId[] = ['koi-kohaku', 'koi-showa', 'goldfish-comet'];
const RIVER_MODELS: SimPondSpeciesId[] = ['perch', 'golden-orfe', 'bluegill'];

interface FishEntry {
  body: T.Group;
  fallbackBody: T.Mesh;
  fallbackTail: T.Mesh;
  actor: SimPondActorHandle;
  boid: FishBoidAgent;
  baseDepth: number;
}

export class WaterFish {
  private schools=new Map<string,{school:School; fish:FishEntry[]}>();
  private shapes={'fish-koi':fishShape('fish-koi'),'fish-stream-trout':fishShape('fish-stream-trout')};
  private mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.55});
  private lastT:number|null=null;
  private rngSeed=17321;
  constructor(private scene:any,private discover:(id:Species)=>void){for(const s of schools)this.add(s);}
  private rand=()=>{this.rngSeed=(Math.imul(1664525,this.rngSeed)+1013904223)|0;return (this.rngSeed>>>0)/4294967296;};
  private add(s:School){
    const [shape,fin]=this.shapes[s.id],fish:FishEntry[]=[];
    const variants=s.id==='fish-koi'?KOI_MODELS:RIVER_MODELS;
    for(let i=0;i<3;i++){
      const body=new T.Group();
      body.name=s.id;
      const sc=s.size*(.84+i*.11);
      body.scale.setScalar(sc);
      const fallbackBody=new T.Mesh(shape,this.mat),fallbackTail=new T.Mesh(fin,this.mat);
      fallbackTail.position.set(0,.04,-.33);
      fallbackBody.add(fallbackTail);
      body.add(fallbackBody);

      // Stream in real textured SimPond GLB + GPU spine-wave swim shader; hide fallback once ready
      const modelId=variants[i%variants.length];
      const actor=spawnSimPondActor(modelId,{
        scale:1.15,
        layer:1,
        groundOnFeet:false,
        onReady:()=>{fallbackBody.visible=false;},
      });
      body.add(actor.group);

      // Deterministic initial position matches orbital spawn at t=0
      const a0=i*1.47+s.z*.14;
      const z0=s.z+s.rz*Math.sin(a0),x0=(s.river?riverCenter(z0):s.x)+s.rx*Math.cos(a0);
      const baseDepth=Math.min(0.14,s.size*.245);
      body.position.set(x0,s.level-baseDepth,z0);
      const boid:FishBoidAgent={
        x:x0,y:s.level-baseDepth,z:z0,
        vx:-Math.sin(a0)*0.65,vz:Math.cos(a0)*0.65,
        yaw:Math.atan2(-Math.sin(a0),Math.cos(a0)),
        state:i===0?'school':'cruise',
        timer:1.5+i*0.9,
        depthOffset:baseDepth,
        targetDepth:baseDepth,
        cruiseSpeed:0.62+i*0.09,
      };
      this.scene.add(body);
      fish.push({body,fallbackBody,fallbackTail,actor,boid,baseDepth});
    }
    this.schools.set(s.key,{school:s,fish});
  }
  sync(expansions:ExpandedTile[]){
    const ponds=new Set<string>();
    for(const tile of expansions){
      const p=lotusPond(tile);if(!p)continue;
      const key='pond-'+tile.id;ponds.add(key);
      if(!this.schools.has(key))this.add({key,id:'fish-koi',x:p.x,z:p.z,level:p.level,rx:p.radius*.25,rz:p.radius*.20,size:.40});
    }
    for(const [key,group] of this.schools)if(key.startsWith('pond-')&&!ponds.has(key)){
      for(const f of group.fish){f.actor.dispose();f.body.removeFromParent();}
      this.schools.delete(key);
    }
  }
  update(t:number,player:number[]|null){
    const rawDt=this.lastT===null?0:Math.max(0,t-this.lastT);
    this.lastT=t;
    const dt=Math.min(rawDt,0.05);
    const threat=player?{x:player[0],y:player[1],z:player[2],speed:2.5,spread:0}:null;
    for(const {school:s,fish} of this.schools.values()){
      const peers=fish.map(f=>f.boid);
      for(let i=0;i<fish.length;i++){
        const f=fish[i],{body,fallbackTail,actor,boid}=f;
        let swimFreq=7.8,swimAmp=0.14;
        if(dt>1e-5){
          const cx=s.river?riverCenter(boid.z):s.x;
          const res=stepFishBoidFsm(boid,peers,dt,{
            cx,cz:s.z,rx:s.rx,rz:s.rz,waterLevel:s.level,baseDepth:f.baseDepth,
          },threat,this.rand);
          swimFreq=res.swimFreq;swimAmp=res.swimAmp;
          // Keep pond depth strictly inside [level-0.175, level-0.05] for shallow lotus ponds
          boid.y=Math.max(s.level-Math.min(0.17,s.size*.28),Math.min(s.level-0.06,boid.y));
          if(s.river){
            const rc=riverCenter(boid.z);
            boid.x=Math.max(rc-s.rx*1.15,Math.min(rc+s.rx*1.15,boid.x));
          }
        }
        body.position.set(boid.x,boid.y,boid.z);
        body.rotation.y=boid.yaw;
        fallbackTail.rotation.y=Math.sin(t*swimFreq+i)*.42;
        actor.update(dt||1/60,swimFreq,swimAmp);

        if(player && player[1]<=body.position.y+.18*s.size+.04 && player[1]+.48>=body.position.y-.12*s.size){
          const ox=player[0]-boid.x,oz=player[2]-boid.z,heading=body.rotation.y;
          const side=ox*Math.cos(heading)-oz*Math.sin(heading),along=ox*Math.sin(heading)+oz*Math.cos(heading);
          if(Math.hypot(side/(.27+.20*s.size),along/(.27+.49*s.size))<=1)this.discover(s.id);
        }
      }
    }
  }
}
