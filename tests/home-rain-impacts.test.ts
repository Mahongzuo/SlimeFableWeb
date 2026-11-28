import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {gardenRain} from '../src/home/rain-contact';
import {rainBodyHit, type RainBody} from '../src/home/rain-body';

function body(): RainBody {
  return {positions:new Float32Array([-1,.4,-1,1,.4,-1,0,.7,1, -1,1,-1,1,1,-1,0,1,1]),
    clusters:new Float32Array([0,0,0,1,1,1]),count:6,radii:[1,.4,1],center:[0,.4,0],offset:[2,.5,3],generation:1};
}

test('falling segment hits the translated deforming display triangle and ignores separated clusters',()=>{
  const b=body();
  const hit=rainBodyHit(b,2,3,0,.3,2);
  assert.ok(hit && hit[1]>.9 && hit[1]<1.21);
  assert.ok(Math.abs(hit[1]-(.9+.15*(hit[2]-3+1)))<.0001);
  assert.equal(rainBodyHit(b,2,3,0,1.40,2),null);
  assert.equal(rainBodyHit(b,2,3,0,.2,.89),null);
  assert.equal(rainBodyHit(b,4,3,0,0,2),null);
});

test('a drop lands once on the first surface, water receives no land specks, and dry weather clears hits',()=>{
  const scene=new T.Scene(),camera=new T.PerspectiveCamera();
  camera.position.set(2,2,5);
  const u={uTime:{value:0},uRain:{value:1},uBodyRainHits:{value:Array.from({length:6},()=>new T.Vector4(0,0,0,-100))}};
  let height=0,water=false;
  const update=gardenRain(scene,camera,u,()=>({height,water}),body,()=>720);
  const streak=scene.getObjectByName('garden-rain-contacts') as T.LineSegments;
  const splashes=scene.getObjectByName('garden-rain-splashes-fx') as T.Points;
  const contact=splashes.geometry.getAttribute('impact'),kind=splashes.geometry.getAttribute('bodyHit');
  const phase=streak.geometry.getAttribute('seed');
  function sample(start:number,seconds:number){
    const seen=new Map<string,number>(),stats={body:0,ground:0};
    for(let frame=0;frame<seconds*60;frame++){
      const t=start+frame/60;u.uTime.value=t;update(t);
      for(let i=0;i<contact.count;i++){
        const stamp=contact.getW(i);
        if(stamp<start)continue;
        const s=phase.getX(i),key=i+':'+Math.floor(stamp*(.78+s*.32)+s*71);
        if(seen.has(key)){assert.equal(stamp,seen.get(key));continue;}
        seen.set(key,stamp);
        if(kind.getX(i)===1){stats.body++;assert.ok(contact.getY(i)>.89);}
        else {stats.ground++;assert.ok(Math.abs(contact.getY(i)-height)<.001);}
      }
    }
    return stats;
  }
  const open=sample(0,3);assert.ok(open.body>2 && open.ground>200);
  water=true;height=2;assert.deepEqual(sample(4,3),{body:0,ground:0});
  water=false;height=3;const covered=sample(8,3);assert.ok(covered.ground>0 && covered.body===0);
  u.uRain.value=0;update(12);
  assert.ok(!streak.visible && !splashes.visible);
  assert.ok(u.uBodyRainHits.value.every(h=>h.w<0) && contact.getW(0)<0);
});
