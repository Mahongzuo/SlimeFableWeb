import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import spec from '../content/levels/1112-1980';
import {levels} from '../content/levels/registry';
import {day1112} from '../content/days/1112';
import {FLYBY,generateFlyby,validateFlyby,createFlight,advanceFlight,boost,photograph,photoAvailable,photoCount,predictFlight,ringZone,findRecord,fuelMedal} from '../src/templates/flyby';
import {buildFlybySpace} from '../src/themes/space';

// Fixed wall-clock inputs in simulation seconds; no steering, teleport, adaptive aim or auto-photo.
const pulses=[18,196,202],shutters=[16,55,96,117,138,170];
function replay(seed:string) {
  const l=generateFlyby({...spec,seed}),s=createFlight(l);let pulse=0,photo=0;
  for(let tick=0;tick<spec.timeLimit*120&&s.status==='flying';tick++) {
    if(tick===pulses[pulse]*120){assert.ok(boost(s));pulse++;}
    if(tick===shutters[photo]*120){assert.equal(photograph(l,s),photo,`missed photo ${photo} at ${s.time}`);photo++;}
    if(tick===108*120)assert.ok(findRecord(l,s));
    advanceFlight(l,s);
  }
  assert.equal(pulse,3);assert.equal(photo,6);return s;
}
test('forty seeds complete all six photos and escape using the same fixed thrust sequence',()=>{
  for(let seed=0;seed<40;seed++) {
    const l=generateFlyby({...spec,seed:'voyager-'+seed});assert.deepEqual(validateFlyby(l),{ok:true,errors:[]});
    const s=replay(l.spec.seed);assert.equal(s.status,'won');assert.equal(photoCount(s),6);
    assert.equal(s.fuel,9);assert.ok(s.shield>70);assert.ok(s.encounter&&s.departing&&s.gap&&s.hidden);assert.ok(s.height>=5);
  }
});
test('zero-thrust challenge is physically reachable and all photo windows remain accessible',()=>{
  const l=generateFlyby(spec),s=createFlight(l);
  while(s.status==='flying') {photograph(l,s);advanceFlight(l,s);}
  assert.equal(s.status,'won');assert.equal(s.fuel,12);assert.equal(photoCount(s),6);assert.ok(s.gap);assert.ok(s.time<300);
});
test('prediction uses the actual six-second motion, preserves live state, and responds to thrust',()=>{
  const l=generateFlyby(spec),s=createFlight(l),scratch=createFlight(l),out=new Float32Array(FLYBY.predictionSamples*3);
  advanceFlight(l,s,110);const before={...s};predictFlight(l,s,out,scratch);assert.deepEqual(s,before);
  const actual={...s};advanceFlight(l,actual,6);assert.ok(Math.abs(actual.x-out.at(-3)!)<1e-5);assert.ok(Math.abs(actual.z-out.at(-1)!)<1e-5);
  const oldX=out.at(-3)!;assert.ok(boost(s));predictFlight(l,s,out,scratch);assert.ok(Math.abs(out.at(-3)!-oldX)>.1);
  for(let i=3;i<out.length;i+=3)assert.ok(Math.hypot(out[i]-out[i-3],out[i+2]-out[i-1])<.1,'prediction has a jump');
});
test('Cassini gap has no drag or damage; jelly absorbs half the ring damage; height clears the belt',()=>{
  const l=generateFlyby({...spec,bodies:spec.bodies.map(b=>({...b,mass:0}))});
  const safe=createFlight(l);safe.x=0;safe.z=-18;safe.vx=.01;safe.vz=0;
  assert.equal(ringZone(l,safe),2);advanceFlight(l,safe,1.1);assert.equal(safe.shield,100);assert.equal(safe.vx,.01);assert.ok(safe.gap);
  const dust=createFlight(l);dust.x=0;dust.z=-21;dust.vx=.01;
  assert.equal(ringZone(l,dust),1);advanceFlight(l,dust,1);assert.ok(Math.abs(dust.shield-99.5)<1e-8);assert.ok(dust.vx<.01);
  dust.height=3;assert.equal(ringZone(l,dust),0);const shield=dust.shield;advanceFlight(l,dust,1);assert.equal(dust.shield,shield);
});
test('fuel cap, cooldown, shutter boundaries, duplicates, collisions and missed encounters',()=>{
  const l=generateFlyby(spec),s=createFlight(l);
  assert.equal(photograph(l,s),-1);assert.ok(boost(s));assert.equal(boost(s),false);
  for(let i=0;i<11;i++){s.cooldown=0;assert.ok(boost(s));}s.cooldown=0;assert.equal(boost(s),false);assert.equal(s.fuel,0);
  const p=spec.photos[0];s.x=p.center[0]+p.radius;s.z=p.center[1];assert.ok(photoAvailable(l,s,0));assert.equal(photograph(l,s),0);assert.equal(photograph(l,s),-1);
  const crashed=createFlight(l);crashed.x=0;crashed.z=0;advanceFlight(l,crashed);assert.equal(crashed.status,'lost');assert.equal(boost(crashed),false);assert.equal(photograph(l,crashed),-1);
  const missed=createFlight(l);for(let tick=0;missed.status==='flying';tick++){if([18,56,88].includes(tick/120))boost(missed);advanceFlight(l,missed);}
  assert.equal(missed.status,'lost');assert.equal(missed.encounter,false);
  assert.equal(fuelMedal(spec,9),3);assert.equal(fuelMedal(spec,8),2);assert.equal(fuelMedal(spec,5),2);assert.equal(fuelMedal(spec,4),1);
});
test('validation rejects malformed data and the chapter is registered as playable',()=>{
  assert.equal(levels[spec.id],spec);assert.equal(day1112.chapters.find(c=>c.id===spec.id)?.status,'web');
  assert.equal(validateFlyby(generateFlyby({...spec,photos:spec.photos.slice(1)})).ok,false);
  assert.equal(validateFlyby(generateFlyby({...spec,rings:{...spec.rings,gap:[24,25]}})).ok,false);
  assert.equal(validateFlyby(generateFlyby({...spec,velocity:[NaN,0]})).ok,false);
});
test('procedural flyby art stays inside draw budget and follows flight without affecting lander helpers',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),sun=new THREE.DirectionalLight();scene.add(sun);
  const materials=new Map<string,THREE.MeshToonMaterial>();
  const stage={scene,camera,sun,toon(color:string,opts:any={}){const key=JSON.stringify([color,opts]);if(!materials.has(key))materials.set(key,new THREE.MeshToonMaterial({color,...opts}));return materials.get(key)!;},
    glow(color:string,scale:number,opacity:number){const s=new THREE.Sprite(new THREE.SpriteMaterial({color,opacity,transparent:true}));s.scale.setScalar(scale);s.layers.set(1);return s;}};
  const l=generateFlyby(spec),s=createFlight(l),art=buildFlybySpace(stage as any,l);
  let draws=0,normals=0,shadows=0;
  scene.traverse((o:any)=>{if(o.isMesh||o.isPoints||o.isLine||o.isSprite){draws++;if(o.layers.mask&1)normals++;if(o.castShadow)shadows++;}});
  const budget=draws+normals+2*shadows;assert.ok(budget<=150,`multi-pass draws: ${budget}`);
  console.log(`Voyager art: ${draws} submissions, <= ${budget} multi-pass draws`);
  s.x=30;s.z=7;s.height=3;s.photos=1;s.hidden=true;art.update(s,.5,1);
  assert.deepEqual(art.probe.position.toArray(),[30,3.7,7]);assert.equal(art.windows[0].visible,false);assert.equal(art.signal.visible,false);
  const rings=scene.getObjectByName('saturn-rings-fx') as THREE.Mesh;
  const p=rings.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const radius=Math.hypot(p.getX(i),p.getZ(i));assert.ok(radius<=17.001||radius>=18.999,'rendered particle band blocks the safe gap');}
});
