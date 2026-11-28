import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {HomeMeadows} from '../src/home/foliage/grass-ism';
import {MeadowSurface} from '../src/home/foliage/meadow-field';
import {expansionSegments,expansionFenceRuns,expansionGroundAt,expansionHeight,expansionSurfaceWeights,makeExpansionSlot} from '../src/world/expansion';
import {inland} from '../src/world/map';
import {IslandCoastSystem,collectTerritoryRects} from '../src/world/island-coast';
import {MarineModels} from '../src/home/marine-models';
import type {ExpandedTile,ExpansionThemeId} from '../src/life/state';

const themes:ExpansionThemeId[]=['farmland','jiangnan','meadow','coast'];
function tile(i:number):ExpandedTile {
  const slot=makeExpansionSlot(-3-i,0);
  return {id:slot.id,gx:slot.gx,gz:slot.gz,theme:themes[i],unlockedAt:1};
}
test('each owned theme mounts stable, populated grass and flower fields and leaves an open split fence',()=>{
  const scene=new THREE.Scene(), ctx={THREE,scene,U:{uTime:{value:0},uGrassDensity:{value:1}}};
  const meadows=new HomeMeadows(ctx),tiles=themes.map((_,i)=>tile(i));
  meadows.syncExpansions(tiles);
  const camera=new THREE.PerspectiveCamera(55,1.5,.1,260);
  for(const t of tiles){
    const slot=makeExpansionSlot(t.gx!,t.gz!);
    const cx=(slot.min[0]+slot.max[0])/2,cz=(slot.min[1]+slot.max[1])/2;
    const ground=expansionGroundAt(cx,cz,slot,t.theme);
    camera.position.set(cx,ground+3,cz+10);camera.lookAt(cx,ground,cz);
    const field=scene.getObjectByName('grass-expansion-'+t.id)!;
    for(const quality of [.25,.55,.85,1]){
      meadows.update(camera,new THREE.Vector4(cx,ground,cz+3,.7),quality);
      assert.ok(field.userData.activeTufts>0);
      assert.ok(field.userData.flowerCount>60);
      assert.equal(field.userData.candidatesPerSquareMetre,176);
      assert.ok(field.children.some((c:any)=>c.isInstancedMesh&&c.visible&&c.count>0));
    }
    const runs=expansionFenceRuns(slot,t.theme);
    assert.equal(runs.length,2);
    assert.ok(Math.hypot(runs[0].at(-1)![0]-runs[1][0][0],runs[0].at(-1)![1]-runs[1][0][1])>=8);
    for(const [x,z] of runs.flat())assert.ok(x>slot.min[0]+1&&x<slot.max[0]-1&&z>slot.min[1]+1&&z<slot.max[1]-1);
    if(t.theme==='coast')assert.ok(expansionSurfaceWeights(cx,slot.max[1]-.1,slot,t.theme).sand>.9);
    if(t.theme==='jiangnan')assert.ok(expansionSurfaceWeights(cx,cz,slot,t.theme).pond>.9);
    meadows.syncExpansions(tiles);assert.equal(scene.getObjectByName('grass-expansion-'+t.id),field);
  }
  meadows.syncExpansions([]);assert.equal(scene.children.length,0);
});

test('field samples actual triangle heights and locally restores the previous footprint, including masks beyond 48 objects',()=>{
  const surface=new MeadowSurface({min:[0,0],max:[10,10]},(x,z)=>x+2*z,()=>1);
  const boxes=Array.from({length:52},(_,i)=>({x:-20-i,z:-12,hx:1,hz:2,yaw:0}));
  surface.setExclusions([...boxes,{x:3,z:4,hx:1,hz:.6,yaw:.53}]);
  assert.equal(surface.sample(3,4,3),0);
  assert.equal(surface.sample(7,6,3),1);
  surface.setExclusions([...boxes,{x:7,z:6,hx:1,hz:.6,yaw:.53}]);
  assert.equal(surface.sample(3,4,3),1);
  assert.equal(surface.sample(7,6,3),0);
  assert.ok(Math.abs(surface.sample(2.13,3.65)-(2.13+2*3.65))<.00001);
  surface.texture.dispose();

  const slot=makeExpansionSlot(-3,0), w=slot.max[0]-slot.min[0],h=slot.max[1]-slot.min[1];
  const geo=new THREE.PlaneGeometry(w,h,expansionSegments(slot.min[0],slot.max[0],0),expansionSegments(slot.min[1],slot.max[1],1)).rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i)+(slot.min[0]+slot.max[0])/2,z=pos.getZ(i)+(slot.min[1]+slot.max[1])/2;
    pos.setXYZ(i,x,expansionHeight(x,z,slot,'meadow'),z);}
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial());
  for(const t of [.11,.36,.612,.913]){
    const x=slot.min[0]+w*t,z=slot.min[1]+h*(1-t*.46);
    const hit=new THREE.Raycaster(new THREE.Vector3(x,50,z),new THREE.Vector3(0,-1,0)).intersectObject(mesh)[0];
    assert.ok(hit&&Math.abs(hit.point.y-expansionGroundAt(x,z,slot,'meadow'))<1e-5);
  }
});

test('coastal shelf never draws beneath original or purchased land, including every internal seam',t=>{
  t.mock.method(MarineModels.prototype,'load',()=>new Promise(()=>{}));
  const tiles=[tile(0),tile(1)];
  const ctx={THREE,scene:new THREE.Scene(),mats:{toon:(color:number)=>new THREE.MeshStandardMaterial({color})}};
  const coast=new IslandCoastSystem(ctx,tiles);
  const geo=(coast.root.getObjectByName('island-coastal-shelf') as THREE.Mesh).geometry;
  const p=geo.attributes.position, index=geo.index!, land=collectTerritoryRects(tiles);
  for(let i=0;i<index.count;i+=3){
    const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
    const x=(p.getX(a)+p.getX(b)+p.getX(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;
    assert.ok(!land.some(r=>x>r.minX&&x<r.maxX&&z>r.minZ&&z<r.maxZ),'coastal triangle overlaps land at '+x+','+z);
  }
});

test('native terrace and forest borders meet the frontier at every original terrain vertex and between vertices',()=>{
  for(const [gx,gz] of [[-3,-1],[-3,0],[-3,1],[-2,2],[-1,2],[0,2]]){
    const slot=makeExpansionSlot(gx,gz),west=gx===-3;
    const lo=slot.min[west?1:0],hi=slot.max[west?1:0];
    for(let d=lo;d<=hi;d+=.25){
      const base=Math.floor(d),f=d-base;
      const x=west?slot.max[0]:d,z=west?d:slot.min[1];
      const actual=west?inland(x,base)*(1-f)+inland(x,base+1)*f:inland(base,z)*(1-f)+inland(base+1,z)*f;
      assert.ok(Math.abs(expansionGroundAt(x,z,slot,'meadow')-actual)<1e-8);
    }
  }
});
