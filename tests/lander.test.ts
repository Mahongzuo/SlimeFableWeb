import test from 'node:test';
import assert from 'node:assert/strict';
import spec from '../content/levels/1112-2014';
import {levels} from '../content/levels/registry';
import {day1112} from '../content/days/1112';
import {generateLander, validateLander, landerTriangles, platformApproach, terrainHeight, sunlightCenter, inSunlight, batteryAfter, landingBounce, batteryMedal, LANDER_MOTION} from '../src/templates/lander';
import {bakeHeightField} from '../src/slime/height-field';
import {createWorld} from '../src/slime/world';
import {tryAttach, stepCling, type ClingState} from '../src/slime/cling';
import type {Vec} from '../src/slime/types';

test('Philae is registered, deterministic, and contains terrain, three terraces and both named sites', () => {
  const l = generateLander(spec);
  assert.deepEqual(generateLander(spec), l);
  assert.notDeepEqual(generateLander({...spec, seed: 'different'}).terrain, l.terrain);
  assert.equal(levels[spec.id], spec);
  assert.equal(day1112.chapters.find(c => c.id === spec.id)?.status, 'web');
  assert.equal(l.agilkia.id, 'Agilkia'); assert.equal(l.abydos.id, 'Abydos');
  assert.equal(l.platforms.length, 3); assert.equal(l.cracks.length, 3);
  assert.ok(Math.min(...l.terrain.heights) < -4);
  assert.equal(terrainHeight(l,0,0),0);
  assert.ok(l.craters.every(c => terrainHeight(l,c.x,c.z) < .5));
  assert.ok(validateLander(l).ok);
});

test('40 seeds: actual baked terrain permits low-gravity jumps, ice-wall attachment and mantle to every platform', () => {
  for (let seed=0;seed<40;seed++) {
    const l = generateLander({...spec,seed:`lander-probe-${seed}`}), check = validateLander(l);
    assert.ok(check.ok, `seed ${seed}: ${check.errors.join('; ')}`);
    const t = l.terrain, triangles = landerTriangles(l);
    // Identical solid triangle stream, cell size and fill classification to the runtime bake.
    const height = bakeHeightField([], {x0:t.x0,z0:t.z0,size:(t.width-1)*t.cell,sizeZ:(t.depth-1)*t.cell,cell:.1,ground:()=>null,filled:triangles});
    const world = createWorld({boxes:[],surfaces:[],height,bounds:l.bounds});
    assert.ok(Math.abs(world.support(0,0)! ) < .1);
    for (let i=0;i<3;i++) {
      const approach = platformApproach(l,i), target = l.platforms[i];
      let p:Vec=[...approach.start], velocity=LANDER_MOTION.jump;
      let cling:ClingState|null=null;
      const dt=1/120, gravity=LANDER_MOTION.gravity*l.gravityScale;
      for(let time=0;time<approach.duration+.3&&!cling;time+=dt) {
        const fraction = Math.max(0,Math.min(1,(time+dt-approach.wait)/approach.travel));
        const desiredX = approach.start[0]+(approach.wall[0]-approach.start[0])*fraction;
        const desiredZ = approach.start[2]+(approach.wall[2]-approach.start[2])*fraction;
        const moved=world.moveCapsule(p,[desiredX-p[0],0,desiredZ-p[2]],.22,.52).position;
        velocity-=gravity*dt; moved[1]+=velocity*dt;
        const floor=world.support(moved[0],moved[2],p[1]);
        assert.ok(floor===null||moved[1]>=floor-.04,`seed ${seed} platform ${i}: premature ground collision at ${moved}`);
        p=moved;
        if(fraction>.8) cling=tryAttach(world,p,[1,0]);
      }
      assert.ok(cling,`seed ${seed} platform ${i}: attached after jump at ${p}`);
      // Runtime onCling seats the body at the face before the first climb probe.
      p=[cling!.point[0]+cling!.normal[0]*.26,p[1],cling!.point[2]+cling!.normal[2]*.26];
      let event='none';
      for(let time=0;time<8&&cling;time+=dt) {const next=stepCling(world,cling,p,{move:[1,0],jump:false,detach:false},dt);p=next.position;cling=next.state;event=next.event;}
      assert.equal(event,'mantle',`seed ${seed} platform ${i}: ${event} at ${p}`);
      assert.ok(p[0]>target.cliff.min[0] && Math.abs(p[1]-target.position[1])<.1);
      assert.ok(Math.abs(world.support(target.position[0],target.position[2])!-target.position[1])<.1);
    }
    // The last terrace has a safe descending route into the final sheltered plain.
    assert.equal(world.support(l.abydos.position[0],l.abydos.position[2]),0);
  }
});

test('validator rejects impossible gravity, displaced platforms and missing ice-wall tops', () => {
  const heavy=generateLander({...spec,gravityScale:2}); assert.equal(validateLander(heavy).ok,false);
  const far=generateLander(spec); far.platforms[1].cliff.min[0]+=200; far.platforms[1].cliff.max[0]+=200; far.platforms[1].position[0]+=200;
  assert.equal(validateLander(far).ok,false);
  const broken=generateLander(spec); broken.platforms[0].cliff.max[1]=1;
  assert.equal(validateLander(broken).ok,false);
});

test('moving sunlight matches platform boundaries, cycles, and leaves Abydos in shadow', () => {
  const l=generateLander(spec), p=l.platforms[0];
  assert.deepEqual(sunlightCenter(spec,p,0),p.position);
  assert.ok(inSunlight(spec,l,p.position,0));
  assert.equal(inSunlight(spec,l,p.position,spec.sunlight.period/4),false);
  assert.ok(inSunlight(spec,l,p.position,spec.sunlight.period));
  assert.equal(inSunlight(spec,l,[p.position[0],p.position[1]+2,p.position[2]],0),false);
  for(let time=0;time<spec.sunlight.period;time++) assert.equal(inSunlight(spec,l,l.abydos.position,time),false);
  for(const platform of l.platforms) {
    const samples=Array.from({length:64},(_,time)=>inSunlight(spec,l,platform.position,time));
    assert.ok(samples.some(Boolean) && samples.some(v=>!v),'every platform gets both sunlight and shadow');
  }
});

test('impact absorption, battery bounds, and medal thresholds', () => {
  assert.ok(landingBounce(5,0)>0); assert.equal(landingBounce(5,.51),0); assert.ok(landingBounce(5,.5)>0);
  assert.equal(landingBounce(2,0),0); assert.ok(landingBounce(100,0)<=5.4);
  assert.equal(batteryAfter(spec,1,false,100),0); assert.equal(batteryAfter(spec,99,true,100),100);
  assert.ok(batteryAfter(spec,50,false,1)<50); assert.ok(batteryAfter(spec,50,true,1)>50);
  assert.equal(batteryMedal(spec,75),3); assert.equal(batteryMedal(spec,74),2); assert.equal(batteryMedal(spec,40),2); assert.equal(batteryMedal(spec,39),1);
});

// Geometry checks complement, rather than replace, the user's three-camera visual review.
import * as THREE from 'three';
import {LANDER_SHOTS, horizonHeight, horizonTriangles, onPlatform} from '../src/templates/lander';
import {buildLanderSpace} from '../src/themes/space';

test('curved horizon meets the playable boundary and stays beyond every shot far plane', () => {
  const l=generateLander(spec), t=l.terrain;
  for(let i=0;i<t.width;i++) for(const z of [t.z0,t.z0+t.depth-1]) {
    const x=t.x0+i;
    assert.ok(Math.abs(horizonHeight(l,x,z)-terrainHeight(l,x,z))<1e-8);
  }
  for(let i=0;i<t.depth;i++) for(const x of [t.x0,t.x0+t.width-1]) {
    const z=t.z0+i;
    assert.ok(Math.abs(horizonHeight(l,x,z)-terrainHeight(l,x,z))<1e-8);
  }
  assert.ok(horizonHeight(l,30,-160)<horizonHeight(l,30,-60));
  const mesh=horizonTriangles(l);
  assert.ok(mesh.every(Number.isFinite));
  for(let i=0;i<mesh.length;i+=3) if(Math.abs(mesh[i])>900||Math.abs(mesh[i+2])>900) {
    for(const shot of Object.values(LANDER_SHOTS)) assert.ok(Math.hypot(mesh[i]-shot.position[0],mesh[i+1]-shot.position[1],mesh[i+2]-shot.position[2])>220);
  }
  for(const p of l.platforms) {
    assert.ok(onPlatform(p,p.position[0],p.position[2]));
    assert.equal(onPlatform(p,p.cliff.min[0]+.1,p.cliff.min[2]+.1),false,'cut-away corners must not have invisible floors');
  }
});

function makeArt() {
  const original=Object.getOwnPropertyDescriptor(globalThis,'document');
  const context={fillRect(){},strokeRect(){},fillText(){}};
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>context})}});
  try {
    const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(60,16/9,.04,220), sun=new THREE.DirectionalLight();
    scene.add(sun,new THREE.HemisphereLight());
    const materials=new Map<string,THREE.MeshToonMaterial>();
    const stage={scene,camera,sun,
      toon(color:string,opts:any={}) {if(opts.map)return new THREE.MeshToonMaterial({color,...opts});const key=JSON.stringify([color,opts]);if(!materials.has(key))materials.set(key,new THREE.MeshToonMaterial({color,...opts}));return materials.get(key)!;},
      glow(color:string,scale:number,opacity:number) {const sprite=new THREE.Sprite(new THREE.SpriteMaterial({color,opacity,transparent:true,depthWrite:false}));sprite.scale.setScalar(scale);sprite.layers.set(1);return sprite;},
      add(mesh:THREE.Object3D,parent=scene) {mesh.traverse((m:any)=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});parent.add(mesh);return mesh;},
    };
    const l=generateLander(spec),art=buildLanderSpace(stage as any,l,spec);
    art.update(0,l.spawn,0,[false,false,false],false,-1);scene.updateMatrixWorld(true);
    return {scene,camera,l,art};
  } finally {
    if(original)Object.defineProperty(globalThis,'document',original);else delete (globalThis as any).document;
  }
}

test('art budget, clear finale sightlines, prominent lobe, shell following and rising dust', () => {
  const {scene,camera,l,art}=makeArt();
  let draws=0,normalDraws=0,shadowDraws=0;
  scene.traverse((o:any)=>{if(o.isMesh||o.isSprite||o.isPoints) {
    const count=Array.isArray(o.material)?o.material.length:1;
    draws+=count;if(o.layers.mask&1)normalDraws+=count;if(o.castShadow)shadowDraws+=count;
  }});
  assert.ok(draws<=150,`un-culled scene submission budget: ${draws}`);
  // Stage renders the normal buffer and colour buffer; conservatively count both shadow updates.
  const frameBudget=draws+normalDraws+shadowDraws*2;
  assert.ok(frameBudget<=150,`art multi-pass budget: ${frameBudget}`);
  console.log(`Philae art: ${draws} submissions, <= ${frameBudget} draws including normals and two shadow passes`);
  const ray=new THREE.Raycaster(),end=new THREE.Vector3();
  for(const shot of Object.values(LANDER_SHOTS)) {
    camera.position.fromArray(shot.position);camera.lookAt(...shot.target);camera.updateMatrixWorld(true);
    end.fromArray(shot.target);ray.set(camera.position,end.clone().sub(camera.position).normalize());
    assert.equal(ray.intersectObject(art.root,true).filter(hit=>hit.distance<camera.position.distanceTo(end)).length,0,'shot looks through a cliff');
  }
  art.update(20,l.abydos.position,1,[true,true,true],false,.5);scene.updateMatrixWorld(true);
  camera.position.fromArray(LANDER_SHOTS.finale.position);
  for(const target of [new THREE.Vector3(59,.8,1),art.rosetta.position]) {
    ray.set(camera.position,target.clone().sub(camera.position).normalize());
    assert.equal(ray.intersectObject(art.root,true).filter(hit=>hit.distance<camera.position.distanceTo(target)).length,0,'finale must see both Abydos and Rosetta');
  }
  ray.set(new THREE.Vector3(59,.2,1),new THREE.Vector3(-65,75,5).normalize());
  assert.ok(ray.intersectObject(art.root,true).length>0,'Abydos must physically lie in the cliff solar shadow');
  assert.equal(art.beam.visible,true);
  assert.equal(art.shell.position.x,59);assert.equal(art.shell.position.y,.1);assert.ok(art.shell.scale.y<1);
  const dust=scene.getObjectsByProperty('name','rising-dust-fx'),before=dust.map(o=>o.position.y);
  art.update(21,l.abydos.position,0,[true,true,true],false,.5);
  assert.ok(dust.some((o,i)=>o.position.y>before[i]));
  const shot=LANDER_SHOTS.opening;camera.position.fromArray(shot.position);camera.lookAt(...shot.target);camera.updateMatrixWorld(true);
  const lobe=scene.getObjectByName('duck-head-lobe-fx')!,bounds=new THREE.Box2(),v=new THREE.Vector3();
  lobe.traverse((o:any)=>{if(o.isMesh) {const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(camera);bounds.expandByPoint(new THREE.Vector2(v.x,v.y));}}});
  const width=(Math.min(1,bounds.max.x)-Math.max(-1,bounds.min.x))/2;
  const height=(Math.min(1,bounds.max.y)-Math.max(-1,bounds.min.y))/2;
  console.log(`Philae opening lobe bounds: ${(width*100).toFixed(1)}% width, ${(height*100).toFixed(1)}% height`);
  assert.ok(width*height>=1/3,'second lobe projected bounds must cover at least a third of the opening');
});
