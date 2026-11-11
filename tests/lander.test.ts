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
