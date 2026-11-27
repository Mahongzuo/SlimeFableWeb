import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {createAmphibianAgent, stepAmphibianFsm} from '../src/home/simpond-ai';
import {buildCoastalReefBoxes, computeCoastalReefPoses} from '../src/world/island-coast';
import {bakeRegion} from '../src/world/bake';
import {createWorld} from '../src/slime/world';
import {SlimeSolver} from '../src/slime/solver';
import {idlePose} from '../src/slime/types';
import {pathDistance, inland} from '../src/world/map';
import {SlashVfxSystem, computeSwingTrajectory, ELEMENT_SLASH_STYLES} from '../src/slime/slash-vfx';
import {describeItemSource, interactWildEncounter} from '../src/life/ranch';
import {freshLife} from '../src/life/state';
import {park} from '../src/zones/park';
import {forest} from '../src/zones/forest';
import {lake} from '../src/zones/lake';
import {getNativeTreeSpots} from '../src/home/garden-regions';

const TEST_PALETTE: Record<string, number> = new Proxy(
  {wood: 0x8b6b4a, rope: 0xbfa882, concrete: 0x999999, gravel: 0x888888, sand: 0xd8c8a0, rock: 0x777e84},
  {get: (t, k) => (typeof k === 'string' && k in t ? (t as any)[k] : 0x888888)},
);

function withDomStub<T>(fn: () => T): T {
  const hadDoc = 'document' in globalThis;
  const prevDoc = (globalThis as any).document;
  const hadAddEvt = 'addEventListener' in globalThis;
  const prevAddEvt = (globalThis as any).addEventListener;
  const hadRemEvt = 'removeEventListener' in globalThis;
  const prevRemEvt = (globalThis as any).removeEventListener;

  if (!hadDoc) {
    const noop = () => {};
    const grad = {addColorStop: noop};
    const makeCtx = () =>
      new Proxy(
        {
          fillRect: noop,
          clearRect: noop,
          strokeRect: noop,
          beginPath: noop,
          closePath: noop,
          moveTo: noop,
          lineTo: noop,
          arc: noop,
          ellipse: noop,
          fill: noop,
          stroke: noop,
          fillText: noop,
          strokeText: noop,
          measureText: () => ({width: 40}),
          createLinearGradient: () => grad,
          createRadialGradient: () => grad,
          createImageData: (w: number, h: number) => ({data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h}),
          getImageData: (_x: number, _y: number, w: number, h: number) => ({data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h}),
          putImageData: noop,
          save: noop,
          restore: noop,
          translate: noop,
          rotate: noop,
          scale: noop,
          quadraticCurveTo: noop,
          bezierCurveTo: noop,
          roundRect: noop,
          drawImage: noop,
        },
        {get: (t, k) => (k in t ? (t as any)[k] : noop)},
      );
    (globalThis as any).document = {
      createElement: () => ({
        width: 256,
        height: 256,
        getContext: () => makeCtx(),
      }),
    };
  }
  if (!hadAddEvt) (globalThis as any).addEventListener = () => {};
  if (!hadRemEvt) (globalThis as any).removeEventListener = () => {};

  try {
    return fn();
  } finally {
    if (!hadDoc) delete (globalThis as any).document;
    else (globalThis as any).document = prevDoc;
    if (!hadAddEvt) delete (globalThis as any).addEventListener;
    else (globalThis as any).addEventListener = prevAddEvt;
    if (!hadRemEvt) delete (globalThis as any).removeEventListener;
    else (globalThis as any).removeEventListener = prevRemEvt;
  }
}

function makeZoneStub(zoneId: string) {
  let seed = 1337;
  const rand = () => ((seed = (Math.imul(1664525, seed) + 1013904223) | 0) >>> 0) / 4294967296;
  const interacts: any[] = [];
  const dummyTex = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
  const U: any = {
    uTime: {value: 0},
    uWind: {value: 0.4},
    uRain: {value: 0},
    uSnow: {value: 0},
    uDay: {value: 1},
    uSunDir: {value: new THREE.Vector3(0.4, 0.8, 0.4)},
    uSunColor: {value: new THREE.Color(1, 1, 1)},
    uSkyColor: {value: new THREE.Color(0.6, 0.8, 1)},
    uGroundColor: {value: new THREE.Color(0.3, 0.4, 0.25)},
    uFogColor: {value: new THREE.Color(0.7, 0.85, 0.95)},
    uFogDensity: {value: 0.002},
    uRippleCenter: {value: new THREE.Vector3()},
    uRippleTime: {value: -10},
  };
  const waterUniforms: any = {
    tOpaqueColor: {value: dummyTex},
    tOpaqueDepth: {value: dummyTex},
    tMirror: {value: dummyTex},
    tWaterNormal0: {value: dummyTex},
    tWaterNormal1: {value: dummyTex},
    uResolution: {value: new THREE.Vector2(1280, 720)},
    uCameraNear: {value: 0.1},
    uCameraFar: {value: 500},
    uMirrorMatrix: {value: new THREE.Matrix4()},
    uHasMirror: {value: 0},
    uHasOpaque: {value: 0},
  };
  const z: any = {
    T: THREE,
    P: TEST_PALETTE,
    id: zoneId,
    rect: {id: zoneId, min: [-120, -40], max: [120, 140]},
    ground: (x: number, zz: number) => inland(x, zz),
    rand,
    life: freshLife(),
    save: () => {},
    ctx: {
      THREE,
      T: THREE,
      P: TEST_PALETTE,
      U,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      mats: {
        glowSprite: () => new THREE.Sprite(new THREE.SpriteMaterial({color: 0xffffff, transparent: true})),
      },
      pipeline: {
        water: waterUniforms,
        registerWater: () => ({}),
        unregisterWater: () => {},
        captureOpaque: () => {},
      },
    },
    toon: (color: number, opts: any = {}) => {
      const {noCache: _nc, ...rest} = opts || {};
      return new THREE.MeshStandardMaterial({color, ...rest});
    },
    interact: (item: any) => interacts.push(item),
  };
  return {z, interacts};
}

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

test('Fix 1: Frog FSM converges cleanly without 180-deg yaw oscillation or twitching', () => {
  const frog = createAmphibianAgent('frog', 4.0, 2.0, 1.0, 2.0, 0.0, 0.35);
  let seed = 42;
  const rand = () => ((seed = (Math.imul(1664525, seed) + 1013904223) | 0) >>> 0) / 4294967296;
  const sampleGround = (x: number) => (x < 2.2 ? -0.45 : 0.35);

  let maxSwimYawJump = 0;
  let reachedRest = false;
  for (let i = 0; i < 400; i++) {
    const prevYaw = frog.yaw;
    const prevState = frog.state;
    const threat = i < 20 ? {x: 4.5, y: 0.4, z: 2.0, speed: 3.0, spread: 0} : null;
    stepAmphibianFsm(frog, 0.033, threat, sampleGround, rand);
    if (prevState === 'swim' && frog.state === 'swim') {
      maxSwimYawJump = Math.max(maxSwimYawJump, angleDiff(frog.yaw, prevYaw));
    }
    if (i > 120 && (frog.state === 'sit' || frog.state === 'float')) {
      reachedRest = true;
    }
  }
  assert.ok(maxSwimYawJump < 0.6, `Expected smooth yaw in swim, got max jump ${maxSwimYawJump.toFixed(3)} rad`);
  assert.ok(reachedRest, `Expected frog to settle into sit or float, ended in ${frog.state}`);
});

test('Fix 2 & 7: Shoreline foam avoids Voronoi net and rain contact uses mist splashes instead of wireframe rings', () => {
  const waterSrc = fs.readFileSync(path.resolve('src/home/render/water-surface.ts'), 'utf8');
  const rainSrc = fs.readFileSync(path.resolve('src/home/rain-contact.ts'), 'utf8');
  assert.ok(!waterSrc.includes('voronoiFoam'), 'water-surface.ts should not use Voronoi net foam');
  assert.ok(waterSrc.includes('rainRingLayer'), 'water-surface.ts should use sparse two-layer rain ripples');
  assert.ok(
    rainSrc.includes('garden-rain-splashes-fx') && rainSrc.includes('new T.Points(splashGeo, splashMat)') && !rainSrc.includes('ringGeo'),
    'rain-contact.ts should replace wireframe ring geometry with soft mist Points',
  );
});

test('Fix 3: Park bounce mushrooms and forest mushrooms have outward-facing LatheGeometry normals', () => {
  withDomStub(() => {
    const parkStub = makeZoneStub('park');
    const parkBuild = park(parkStub.z);
    const capMeshes: THREE.Mesh[] = [];
    parkBuild.root.traverse((obj: any) => {
      if (obj.isMesh && typeof obj.name === 'string' && obj.name.startsWith('bounce-mushroom-cap-')) {
        capMeshes.push(obj);
      }
    });
    assert.ok(capMeshes.length >= 5, `Expected >= 5 park bounce mushroom caps, got ${capMeshes.length}`);

    for (const cap of capMeshes) {
      const pos = cap.geometry.attributes.position;
      const norm = cap.geometry.attributes.normal;
      assert.ok(pos && norm, `${cap.name} must have position and normal attributes`);
      let topSamples = 0;
      let outwardTop = 0;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const ny = norm.getY(i);
        if (y > 0.35) {
          topSamples++;
          if (ny > 0.2) outwardTop++;
        }
      }
      assert.ok(topSamples > 0 && outwardTop === topSamples, `${cap.name} dome normals must face upward/outward (${outwardTop}/${topSamples})`);
    }

    const forestStub = makeZoneStub('forest');
    const forestBuild = forest(forestStub.z);
    const forestCap = forestBuild.root.getObjectByName('mushroom-caps-fx') as THREE.InstancedMesh;
    assert.ok(forestCap, 'forest must contain mushroom-caps-fx');
    const fPos = forestCap.geometry.attributes.position;
    const fNorm = forestCap.geometry.attributes.normal;
    let fTop = 0, fOut = 0;
    for (let i = 0; i < fPos.count; i++) {
      if (fPos.getY(i) > 0.12) {
        fTop++;
        if (fNorm.getY(i) > 0.25) fOut++;
      }
    }
    assert.ok(fTop > 0 && fOut === fTop, `forest mushroom cap normals must face outward (${fOut}/${fTop})`);
  });
});

test('Fix 4: Swing and park pavilion sit cleanly on grass off stone path; swing frame is skipped from 2.5D heightfield bake', () => {
  assert.ok(pathDistance(-9.5, 70.0) > 4.5, `Swing should sit on grass away from path, dist=${pathDistance(-9.5, 70.0)}`);
  assert.ok(pathDistance(-18.5, 65.0) > 4.5, `Pavilion should sit on grass away from path, dist=${pathDistance(-18.5, 65.0)}`);

  withDomStub(() => {
    const parkStub = makeZoneStub('park');
    const parkBuild = park(parkStub.z);
    const swingGroup = parkBuild.root.getObjectByName('park-swing-set');
    assert.ok(swingGroup, 'park must build park-swing-set');
    assert.equal(swingGroup.userData.skipHeightBake, true, 'park-swing-set must opt out of 2.5D heightfield bake');

    const boxes = parkBuild.boxes ?? [];
    assert.ok(boxes.some(b => b.name === 'park-swing-seat'), 'park must register dynamic 3D park-swing-seat solid box');
    assert.ok(boxes.some(b => b.name === 'park-swing-leg-l-f'), 'park must register swing leg boxes');

    const baked = bakeRegion(parkStub.z.ctx, {
      x0: -13,
      z0: 67,
      w: 7,
      h: 6,
      ground: (x, zz) => inland(x, zz),
      classify: () => 'solid',
      root: swingGroup,
    });
    assert.equal(baked.triangles, 0, 'Heightfield baker must skip swing-frame completely (0 solid triangles)');

    // Verify 1.0s settle delay, locked riding (zero drift without active input), PBF ridePlane zero-clipping, and active dismount!
    const seatBox = boxes.find(b => b.name === 'park-swing-seat')!;
    const pivot = parkBuild.root.getObjectByName('park-swing-pivot')!;
    const restZ = (seatBox.min[2] + seatBox.max[2]) * 0.5;
    const restY = seatBox.max[1];
    const pos: [number, number, number] = [-9.5, restY, restZ];
    const vel: [number, number, number] = [0, 0, 0];
    let refreshCount = 0;
    let launched: [number, number, number] | null = null;
    let activePlane: {point: [number, number, number]; normal: [number, number, number]} | null = null;
    const mockPlayer: any = {
      position: pos,
      velocity: vel,
      grounded: true,
      swimming: false,
      clinging: false,
      hasMoveInput: false,
      isDashing: false,
      element: 0,
      spread: 0,
      launch: (v: [number, number, number]) => {
        launched = v;
      },
      seatAt: (p: [number, number, number], plane: {point: [number, number, number]; normal: [number, number, number]}) => {
        pos[0] = p[0];
        pos[1] = p[1];
        pos[2] = p[2];
        activePlane = plane;
      },
      clearRide: () => {
        activePlane = null;
      },
      refreshBoxes: () => {
        refreshCount++;
      },
      toast: () => {},
      mood: () => {},
      lock: () => {},
    };

    // First 0.9s on swing: stays calm & steady and locked to seat
    let t = 0;
    for (let i = 0; i < 27; i++) {
      t += 1 / 30;
      parkBuild.update?.(t, 1 / 30, mockPlayer);
    }
    assert.ok(activePlane !== null, 'Slime must lock onto seat with active ridePlane');
    assert.ok(Math.abs(pivot.rotation.x) < 0.04, `Swing should wait 1s before swinging, got angle=${pivot.rotation.x}`);
    assert.ok(Math.abs(pos[2] - restZ) < 0.08, `Slime should stay centered during 1s settle, got dz=${pos[2] - restZ}`);

    // Next 2.0s (past 1.0s mark): swing kicks off and carries slime + PBF particles smoothly with ZERO clipping & ZERO jitter!
    const solver = new SlimeSolver([-9.5, restY, restZ]);
    let maxAngle = 0;
    let maxSlimeZDisp = 0;
    let maxSlimeYDisp = 0;
    let minPlaneSignedDist = Infinity;
    let maxCenterVelY = 0;
    let signFlipsY = 0;
    let prevCenterVelY = 0;
    for (let i = 0; i < 60; i++) {
      t += 1 / 30;
      parkBuild.update?.(t, 1 / 30, mockPlayer);
      assert.ok(activePlane !== null, 'Without player input, slime must remain locked on swing');
      maxAngle = Math.max(maxAngle, Math.abs(pivot.rotation.x));
      maxSlimeZDisp = Math.max(maxSlimeZDisp, Math.abs(pos[2] - restZ));
      maxSlimeYDisp = Math.max(maxSlimeYDisp, pos[1] - restY);
      const seatCenterZ = (seatBox.min[2] + seatBox.max[2]) * 0.5;
      assert.ok(Math.abs(pos[2] - seatCenterZ) < 0.01, `Slime must ride lockstep with seat plank (posZ=${pos[2]}, seatZ=${seatCenterZ})`);
      assert.ok(Math.abs(pos[1] - seatBox.max[1]) < 0.01, `Slime Y must track seat top (posY=${pos[1]}, seatY=${seatBox.max[1]})`);

      // Step real PBF solver with active ridePlane over empty ground below -> verify ZERO particles pierce under plank & ZERO Euler vibration!
      solver.step(1 / 60, {
        anchor: [...pos],
        velocity: [0, 0, 0],
        forward: [0, 0, -1],
        spread: 0,
        grounded: true,
        recalling: false,
        impact: 0,
        pose: idlePose(),
        dt: 1 / 60,
        quality: 'high',
        commands: [],
        generation: 0,
        ridePlane: activePlane,
      });
      const vy = solver.centerVelocity[1];
      maxCenterVelY = Math.max(maxCenterVelY, Math.abs(vy));
      if (i > 4 && Math.abs(vy) > 0.25 && Math.sign(vy) !== Math.sign(prevCenterVelY) && prevCenterVelY !== 0) {
        signFlipsY++;
      }
      prevCenterVelY = vy;
      const rp = activePlane!;
      for (const p of solver.particles) {
        const sd =
          (p.p[0] - rp.point[0]) * rp.normal[0] +
          (p.p[1] - rp.point[1]) * rp.normal[1] +
          (p.p[2] - rp.point[2]) * rp.normal[2];
        if (sd < minPlaneSignedDist) minPlaneSignedDist = sd;
      }
    }
    assert.ok(maxAngle > 0.30, `Swing should reach lively arc after 1s, got maxAngle=${maxAngle}`);
    assert.ok(maxSlimeZDisp > 0.65, `Slime must swing horizontally with seat, got maxSlimeZDisp=${maxSlimeZDisp}`);
    assert.ok(maxSlimeYDisp > 0.08, `Slime must rise vertically along swing arc, got maxSlimeYDisp=${maxSlimeYDisp}`);
    assert.ok(minPlaneSignedDist >= 0.015, `All 384 PBF particles must stay strictly above tilted seat plank (minSignedDist=${minPlaneSignedDist.toFixed(4)}m)`);
    assert.ok(signFlipsY <= 4 && maxCenterVelY < 2.5, `PBF center must follow smoothly without Nyquist jitter (signFlipsY=${signFlipsY}, maxCenterVelY=${maxCenterVelY.toFixed(3)})`);
    assert.ok(refreshCount > 10, `Seat collider boxes must refresh dynamically while swinging`);

    // Active jump mid-swing dismounts, clears ridePlane, and triggers tangential launch
    vel[1] = 6.6;
    parkBuild.update?.(t + 1 / 30, 1 / 30, mockPlayer);
    assert.equal(activePlane, null, 'Active jump must immediately clear ridePlane and dismount');
    assert.ok(launched !== null, 'Jumping mid-swing should apply tangential launch');
  });
});

test('Fix 5: Portal vortex shader has no discontinuous atan() branch-cut fed into fbm()', () => {
  const src = fs.readFileSync(path.resolve('src/home/portal-vfx.ts'), 'utf8');
  assert.ok(src.includes('vec2 rot2(vec2 p, float a)'), 'portal-vfx.ts should use continuous Cartesian rot2 spiral rotation');
  assert.ok(!src.includes('atan(uv.y, uv.x)'), 'portal-vfx.ts should not feed discontinuous atan(uv.y, uv.x) into noise');
});

test('Fix 6: 4-hit anime slash VFX produces distinct multi-arc trajectories and valid dual-layer meshes for all 6 elements', () => {
  const t0 = computeSwingTrajectory(0);
  const t1 = computeSwingTrajectory(1);
  const t2 = computeSwingTrajectory(2);
  const t3 = computeSwingTrajectory(3);

  assert.ok(!t0.isFinisher && t3.isFinisher, 'Hit 4 must be finisher');
  assert.ok(t1.secondary && t2.secondary && t3.secondary, 'Hits 2, 3, and 4 must define paired secondary anime arcs');
  assert.ok(Math.abs(t3.endYawDeg - t3.startYawDeg) >= 240, 'Finisher must sweep >= 240 degrees');
  assert.equal(ELEMENT_SLASH_STYLES.length, 6);

  const scene = new THREE.Scene();
  const vfx = new SlashVfxSystem({THREE, scene});
  for (let elem = 0; elem < 6; elem++) {
    for (let combo = 0; combo < 4; combo++) {
      vfx.playSwing(elem, combo, [0, 1.0, 0], [0, 0, -1], 0.24);
      for (let f = 0; f < 10; f++) {
        vfx.update(0.03);
      }
    }
  }
  const vfxRoot = scene.getObjectByName('slime-slash-vfx');
  assert.ok(vfxRoot, 'slime-slash-vfx group must be added to scene');
  vfxRoot.traverse((obj: any) => {
    if (obj.isMesh && obj.geometry?.attributes?.position) {
      const arr = obj.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < arr.length; i++) {
        assert.ok(Number.isFinite(arr[i]), `Found non-finite vertex coordinate in slash VFX`);
      }
    }
  });
  vfx.reset();
  vfx.dispose();
});

test('Fix 8: Pine forest branches are skipped by heightfield baker so no airwalls hang under trees', () => {
  withDomStub(() => {
    const forestStub = makeZoneStub('forest');
    const forestBuild = forest(forestStub.z);
    const pineBranches = forestBuild.root.getObjectByName('pine-branches');
    assert.ok(pineBranches, 'forest must contain pine-branches');
    assert.equal(pineBranches.userData.walkThrough, true);
    assert.equal(pineBranches.userData.skipHeightBake, true);

    const testGroup = new THREE.Group();
    const branchMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 4), new THREE.MeshBasicMaterial());
    branchMesh.name = 'pine-branches';
    branchMesh.position.set(0, 4.0, 0);
    testGroup.add(branchMesh);

    const baked = bakeRegion(forestStub.z.ctx, {
      x0: -3,
      z0: -3,
      w: 6,
      h: 6,
      ground: () => 0,
      classify: () => 'solid',
      root: testGroup,
    });
    assert.equal(baked.triangles, 0, 'pine-branches must never bake into solid heightfield airwall');
  });
});

test('Fix 9: Coastal reefs and lake shore boulders generate solid non-climbable collision boxes', () => {
  const poses = computeCoastalReefPoses([]);
  const reefBoxes = buildCoastalReefBoxes([]);
  assert.ok(poses.length >= 50, `Expected >= 50 coastal reef poses, got ${poses.length}`);
  assert.equal(reefBoxes.length, poses.length);

  const sample = reefBoxes[0];
  assert.equal(sample.climbable, false);
  const cx = (sample.min[0] + sample.max[0]) * 0.5;
  const cz = (sample.min[2] + sample.max[2]) * 0.5;
  const topY = sample.max[1];
  const world = createWorld({
    indexBoxes: true,
    boxes: [sample],
    surfaces: [{min: [cx - 30, cz - 30], max: [cx + 30, cz + 30], height: sample.min[1] - 0.5}],
  });
  const sup = world.support(cx, cz, topY + 0.5);
  assert.ok(sup !== null && Math.abs(sup - topY) < 0.05, `Expected slime to stand on reef top ${topY}, got ${sup}`);

  withDomStub(() => {
    const lakeStub = makeZoneStub('lake');
    const lakeBuild = lake(lakeStub.z);
    const lakeRocks = (lakeBuild.boxes ?? []).filter(b => b.name?.startsWith('lake-shore-boulder-') || b.name === 'lake-east-rock');
    assert.ok(lakeRocks.length >= 10, `Expected >= 10 lake boulder solid boxes, got ${lakeRocks.length}`);
    assert.ok(lakeRocks.every(b => b.climbable === false));
  });
});

test('Fix 10: Wild animal encounters require only favorite item with clear source hint (no C-flatten sneaking)', () => {
  const life = freshLife();
  const miss = interactWildEncounter(life, 'enc-1', 'ranch-white-deer', {sneaking: false, feedFavorite: true});
  assert.equal(miss.tamed, false);
  assert.ok(
    !miss.message.includes('摊开') && !miss.message.includes('潜行') && !miss.message.includes('按 C'),
    `Prompt must not mention C-flatten sneaking: ${miss.message}`,
  );
  assert.ok(miss.message.includes('需要'), `Prompt should directly state required item: ${miss.message}`);
  assert.ok(describeItemSource('crop-starlight').length > 4);

  life.bag['crop-starlight'] = 1;
  const ok = interactWildEncounter(life, 'enc-1', 'ranch-white-deer', {sneaking: false, feedFavorite: true});
  assert.equal(ok.tamed, true);
  assert.equal(life.bag['crop-starlight'] ?? 0, 0);
});

test('Fix 11: Grass tufts exclude procedural and native tree trunk cores across park and forest', () => {
  withDomStub(() => {
    const parkStub = makeZoneStub('park');
    const parkBuild = park(parkStub.z);
    const parkGrass = parkBuild.root.getObjectByName('grass-blades') as THREE.InstancedMesh | null;
    const nativeParkTrees = getNativeTreeSpots('park');
    if (parkGrass) {
      const m = new THREE.Matrix4();
      const p = new THREE.Vector3();
      let violations = 0;
      for (let i = 0; i < parkGrass.count; i++) {
        parkGrass.getMatrixAt(i, m);
        p.setFromMatrixPosition(m);
        for (const [tx, tz] of nativeParkTrees) {
          if (Math.hypot(p.x - tx, p.z - tz) < 0.72) violations++;
        }
      }
      assert.equal(violations, 0, `Found ${violations} grass blades poking into park native tree trunks`);
    }

    const forestStub = makeZoneStub('forest');
    const forestBuild = forest(forestStub.z);
    const forestTrunks = forestBuild.root.getObjectByName('pine-trunks') as THREE.InstancedMesh | null;
    const forestGrass = forestBuild.root.getObjectByName('grass-blades') as THREE.InstancedMesh | null;
    if (forestTrunks && forestGrass) {
      const m = new THREE.Matrix4();
      const p = new THREE.Vector3();
      const trunks: [number, number][] = [];
      for (let i = 0; i < forestTrunks.count; i++) {
        forestTrunks.getMatrixAt(i, m);
        p.setFromMatrixPosition(m);
        trunks.push([p.x, p.z]);
      }
      let violations = 0;
      for (let i = 0; i < forestGrass.count; i++) {
        forestGrass.getMatrixAt(i, m);
        p.setFromMatrixPosition(m);
        for (const [tx, tz] of trunks) {
          if (Math.hypot(p.x - tx, p.z - tz) < 0.75) {
            violations++;
            break;
          }
        }
      }
      assert.equal(violations, 0, `Found ${violations} grass blades poking into pine trunks`);
    }
  });
});
