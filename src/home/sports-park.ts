import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {bindSportSite,sportLand,sportsGroundHeight} from '../world/expansion';
import {ensureHome,type LifeData,type PlacedProp} from '../life/state';
import {sportsLog,sportsNames,type Sport} from '../life/sports';
import type {FluidVolume,GroundSurface} from '../slime/world';
import type {Box,Vec} from '../slime/types';
import type {Interactable} from '../zones/types';
import {signpost} from '../zones/kit';
import {inland} from '../world/map';
import {valleyWater} from '../zones/lake-water';
import shapes from './sports-collision.json';

export interface Court {sport:Sport;x:number;z:number;y:number;w:number;d:number;gate:Vec}
const layouts:[Sport,number,number,number,number][]=[
  ['badminton',20,46,19.6,12.8],['basketball',20,75,36,22.4],
  ['tennis',20,102,35,20.8],['swim',20,128,33.4,23.8],['football',100,86,119,85]
];

export class SportsPark {
  courts:Court[]=[];
  boxes:Box[]=[];
  surfaces:GroundSurface[]=[];
  fluids:FluidVolume[]=[];
  footprints:PlacedProp[]=[];
  spots:Interactable[]=[];
  ready:Promise<unknown>;
  constructor(ctx:any,life:LifeData,enter:(c:Court)=>void){
    const home=ensureHome(life),log=sportsLog(life);
    log.site=bindSportSite(home.expansions,log.site,[...home.placed,...home.trees,...home.paving,...(home.voxels??[])]);
    const lands=sportLand(home.expansions),ox=lands[0].minX,loader=new GLTFLoader();
    const signs={T,ground:sportsGroundHeight,toon:ctx.mats.toon} as any;
    const approach=signpost({...signs,ground:inland},28,58.9,-Math.PI/2,'东岸运动公园','沿路向东 · 五项运动');
    ctx.scene.add(approach);
    ctx.scene.add(signpost({...signs,ground:inland},5.8,53.8,-.45,'东岸运动公园 →','经过风车东侧 · 场边邀请动物'));
    const loads:Promise<unknown>[]=[];
    for(const [sport,dx,z,w,d] of layouts){
      const x=ox+dx,y=.79,gate:Vec=sport==='football'?[x-w/2-1,y,58.5]:[x,y,z+(sport==='badminton'?1:-1)*(d/2+1.2)];
      const court={sport,x,y,z,w,d,gate};this.courts.push(court);
      this.footprints.push({id:'native-sports-'+sport,itemId:'build-huizhou',x,y,z,yaw:0,scale:1,nativeFootprint:{name:sportsNames[sport],width:w,depth:d}});
      const sign=signpost(signs,gate[0],gate[2],sport==='football'?-Math.PI/2:0,sportsNames[sport], 'F · 邀请比赛');
      ctx.scene.add(sign);
      this.spots.push({id:'sports-'+sport,position:gate,radius:4,prompt:()=>({title:sportsNames[sport]+' · 邀请比赛',sub:'F 挑选队友和对手'}),act:()=>enter(court)});
      for(const row of shapes[sport]){
        const [group,...coords]=row,[a,b,c,e,f,g]=coords.map(Number);
        if(group==='WaterVolume'){
          this.fluids.push({min:[x+a,z+c],max:[x+e,z+g],level:y+f,sink:.16});continue;
        }
        // The source includes a sloping convex hull in the recessed pool stairs.
        if(sport==='swim'&&group==='Basin'&&e-a>2.5&&e-a<2.8&&g-c>2.9&&f-b>1.5){
          this.surfaces.push({min:[x+a,z+c],max:[x+e,z+g],height:y,slope:[0,-1.6/(g-c)]});continue;
        }
        this.boxes.push({name:'sport-'+sport+'-'+group,min:[x+a,y+b,z+c],max:[x+e,y+f,z+g],camera:f>.9});
      }
      loads.push(loader.loadAsync('/models/sports/'+sport+'.glb').then(({scene})=>{
        scene.name='sport-'+sport;scene.position.set(x,y,z);
        scene.traverse(o=>{
          if(!(o instanceof T.Mesh))return;
          o.castShadow=true;o.receiveShadow=true;
          if(/_Water$|_MatchBall$/.test(o.name))o.visible=false;
          if(o.name.endsWith('_SurfaceDetails')) {
            const geo=o.geometry,pos=geo.attributes.position,index=geo.index,kept:number[]=[];
            for(let i=0;i<(index?.count??pos.count);i+=3){
              const tri=[0,1,2].map(j=>index?index.getX(i+j):i+j);
              if(!tri.every(j=>Math.abs(pos.getY(j)+.146)<.0001||Math.abs(pos.getY(j)+.147)<.0001))kept.push(...tri);
            }
            geo.setIndex(kept);
          }
        });
        ctx.scene.add(scene);
      }));
    }
    const pool=this.courts.find(c=>c.sport==='swim')!;
    const basin={minX:pool.x-12.65,maxX:pool.x+12.65,minZ:pool.z-10.55,maxZ:pool.z+7.65};
    const stairSurfaces=this.surfaces.splice(0);
    const vertices:number[]=[],colors:number[]=[],indices:number[]=[];
    const split=(lo:number,hi:number,extra:number[])=>Array.from(new Set([lo,hi,...extra.filter(v=>v>lo&&v<hi),...Array.from({length:Math.floor((hi-lo)/4)},(_,i)=>lo+4*(i+1))])).sort((a,b)=>a-b);
    for(const r of lands){
      const xs=split(r.minX,r.maxX,[33,ox+19,ox+21.2,ox+38,ox+40,basin.minX,basin.maxX]);
      const zs=split(r.minZ,r.maxZ,[52.6,54.8,56,61,62.4,64.0,89.5,91.5,114.3,116.1,basin.minZ,basin.maxZ]);
      for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){
        const a=xs[i-1],b=xs[i],c=zs[j-1],d=zs[j],cx=(a+b)/2,cz=(c+d)/2;
        if(cx>basin.minX&&cx<basin.maxX&&cz>basin.minZ&&cz<basin.maxZ)continue;
        const n=vertices.length/3,spine=cx>ox+38&&cx<ox+40;
        const branch=cx>ox+19&&cx<ox+40&&[[52.6,54.8],[62.4,64],[89.5,91.5],[114.3,116.1]].some(([a,b])=>cz>a&&cz<b);
        const path=cz>56&&cz<61&&cx<ox+40||spine||branch;
        const tint=new T.Color(path?0xcab790:0x93b37a);
        for(const [wx,wz] of [[a,c],[a,d],[b,d],[b,c]]){
          const shade=1+(path?.018:.075)*Math.sin(wx*.29+wz*.075)*Math.cos(wz*.35);
          vertices.push(wx,sportsGroundHeight(wx,wz),wz);colors.push(tint.r*shade,tint.g*shade,tint.b*shade);
        }
        indices.push(n,n+1,n+2,n,n+2,n+3);
      }
      this.surfaces.push({min:[r.minX,r.minZ],max:[r.maxX,r.maxZ],height:0,grid:{
        width:Math.round(r.maxX-r.minX)+1,height:Math.round(r.maxZ-r.minZ)+1,
        values:Array.from({length:(r.maxX-r.minX+1)*(r.maxZ-r.minZ+1)},(_,i)=>sportsGroundHeight(r.minX+i%(r.maxX-r.minX+1),r.minZ+Math.floor(i/(r.maxX-r.minX+1))))
      }});
    }
    this.surfaces.push({min:[basin.minX,basin.minZ],max:[basin.maxX,basin.maxZ],height:pool.y-1.65},...stairSurfaces);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
    const turf=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));turf.name='运动公园草坪与步道';turf.receiveShadow=true;ctx.scene.add(turf);
    for(const f of this.fluids){
      const w=f.max[0]-f.min[0],d=f.max[1]-f.min[1];
      const geometry=new T.PlaneGeometry(w,d),pos=geometry.attributes.position,depths:number[]=[];
      const z=(f.max[1]+f.min[1])/2;
      for(let i=0;i<pos.count;i++){
        const localZ=z-pos.getY(i)-pool.z;
        const floor=localZ< -7.5?pool.y-(localZ+10.5)*1.6/3:pool.y-1.6;
        depths.push(f.level-floor);
      }
      geometry.setAttribute('aBedDepth',new T.Float32BufferAttribute(depths,1));
      const water=valleyWater(ctx,geometry,(f.max[0]+f.min[0])/2,f.level,z,.025,.015,{mappedBed:true,calm:.82,minReflect:.14,shoreFoam:0});
      water.name='sports-pool-water';ctx.scene.add(water);
    }
    this.ready=Promise.all(loads);
  }
}
