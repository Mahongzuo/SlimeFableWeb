import * as T from 'three';
import {LAYER, type Stage, type StageLook} from '../level/stage';
import type {SolsticeBiome, SolsticeSpec} from '../../content/levels/types';
import type {SolsticeLayout} from '../templates/solstice';
import {elements as slimeElements} from '../slime/elements';
import {rng} from '../templates/random';
import {buildMonument} from './solstice-monuments';

const TAU = Math.PI * 2;

function softParticleTex(star = false) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.32, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  if (star) {
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(30, 8, 4, 48);
    g.fillRect(8, 30, 48, 4);
  }
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export const biomeLooks: Record<SolsticeBiome, StageLook> = {
  aurora: {
    skyTop: '#0b1936', skyHorizon: '#2b6777', fog: [42, 138],
    sun: '#d8f3ff', sunIntensity: 1.75, hemiSky: '#72efdd', hemiGround: '#274060', ink: '#14263b', wash: '#b8d8e0',
  },
  cosmos: {
    skyTop: '#090b22', skyHorizon: '#3c2a5e', fog: [48, 150],
    sun: '#ffe3b3', sunIntensity: 1.85, hemiSky: '#98c1ff', hemiGround: '#2c1e4a', ink: '#15122b', wash: '#c5bddb',
  },
  lantern: {
    skyTop: '#162040', skyHorizon: '#d97a54', fog: [40, 132],
    sun: '#ffd49b', sunIntensity: 2.0, hemiSky: '#ffbe86', hemiGround: '#3b334f', ink: '#261e30', wash: '#e4cbb5',
  },
  clockwork: {
    skyTop: '#1a3644', skyHorizon: '#e8b36b', fog: [42, 136],
    sun: '#ffe2a8', sunIntensity: 2.05, hemiSky: '#c7ecee', hemiGround: '#544130', ink: '#232f33', wash: '#ded5bd',
  },
  ocean: {
    skyTop: '#12355b', skyHorizon: '#f29f74', fog: [44, 140],
    sun: '#ffdfb0', sunIntensity: 2.0, hemiSky: '#9be3ff', hemiGround: '#264d63', ink: '#172d40', wash: '#cfe0df',
  },
  sanctuary: {
    skyTop: '#1c2b3a', skyHorizon: '#9fb4c0', fog: [44, 145],
    sun: '#f5e6cc', sunIntensity: 1.6, hemiSky: '#d9e4ec', hemiGround: '#50606b', ink: '#26323c', wash: '#d5dde0',
  },
};

const biomePalette: Record<SolsticeBiome, {top: string; side: string; trim: string; seaA: string; seaB: string; snow: string; propA: string; propB: string}> = {
  aurora:    {top: '#dceef5', side: '#4f7a96', trim: '#7ef2d4', seaA: '#0f304d', seaB: '#287a8c', snow: '#e8fbff', propA: '#2a6f75', propB: '#7ad3d9'},
  cosmos:    {top: '#d5d2e8', side: '#3d3766', trim: '#ffd166', seaA: '#0b0e29', seaB: '#2b2459', snow: '#fff2be', propA: '#54478c', propB: '#8e7cc3'},
  lantern:   {top: '#e7dac6', side: '#6d504d', trim: '#ffbe55', seaA: '#17223b', seaB: '#4a304d', snow: '#ffe6b8', propA: '#7a4448', propB: '#c97b55'},
  clockwork: {top: '#e6dcc5', side: '#5a5047', trim: '#f4b942', seaA: '#162f38', seaB: '#385c63', snow: '#ffdf9e', propA: '#7f6244', propB: '#b88b4a'},
  ocean:     {top: '#ede3cf', side: '#46697e', trim: '#72efdd', seaA: '#0d3b66', seaB: '#1d7899', snow: '#dff9ff', propA: '#2c6975', propB: '#e08e67'},
  sanctuary: {top: '#e8ecef', side: '#72828e', trim: '#f2d7a7', seaA: '#1b2b38', seaB: '#3a5366', snow: '#fff3d6', propA: '#4e6b66', propB: '#b5c2c9'},
};

export interface SolsticeWorldHandle {
  root: any;
  triggerNodeBurst(index: number): void;
  triggerStarBurst(pos: [number, number, number]): void;
  setSplitBridge(openK: number, padAK: number, padBK: number): void;
  update(time: number, dt: number, state: {
    slimePos: [number, number, number];
    doneNodes: boolean[];
    collectedStars: boolean[];
    allDone: boolean;
    finaleT: number;
  }): void;
}

export function buildSolsticeWorld(stage: Stage, spec: SolsticeSpec, layout: SolsticeLayout): SolsticeWorldHandle {
  const root = new T.Group();
  stage.scene.add(root);
  stage.camera.far = 360;
  stage.camera.updateProjectionMatrix();

  const random = rng(spec.id + '-art');
  const bp = biomePalette[spec.biome];
  const [colPrimary, colAccent] = spec.palette;
  const cube = new T.BoxGeometry(1, 1, 1);
  const cyl = new T.CylinderGeometry(1, 1, 1, 10);
  const cone = new T.ConeGeometry(1, 1, 7);
  const oct = new T.OctahedronGeometry(1, 0);

  // Batching helper for crisp InstancedMesh scenery (ultra-low draw calls)
  const dummy = new T.Object3D();
  const batches = new Map<any, {matrices: any[]; colors: string[]}>();
  const stamp = (geo: any, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(rx, ry, rz);
    dummy.updateMatrix();
    let b = batches.get(geo);
    if (!b) {
      b = {matrices: [], colors: []};
      batches.set(geo, b);
    }
    b.matrices.push(dummy.matrix.clone());
    b.colors.push(color);
  };

  // 1. Sculpted floating islands & stepped platforms with bevelled trim and undersides
  for (const p of layout.platforms) {
    const topCol = p.accent ? '#f4f0e4' : bp.top;
    // Main top slab
    stamp(cube, topCol, p.x, p.y - 0.14, p.z, p.w, 0.28, p.d);
    // Decorative underside stone/ice body
    stamp(cube, bp.side, p.x, p.y - p.thickness / 2 - 0.12, p.z, p.w * 0.92, Math.max(0.4, p.thickness - 0.24), p.d * 0.92);
    // Crisp glowing edge trim on key plazas / islands / stages / ring decks
    if (p.kind === 'stage' || p.kind === 'island' || p.kind === 'plaza' || p.kind === 'ring-deck') {
      stamp(cube, p.accent ? colAccent : bp.trim, p.x, p.y - 0.3, p.z, p.w + 0.18, 0.11, p.d + 0.18);
      // Tapered floating crystal/rock keel beneath island
      if (p.kind === 'island' || p.kind === 'stage') {
        stamp(cone, bp.side, p.x, p.y - p.thickness - 1.3, p.z, p.w * 0.42, 2.8, p.d * 0.42, Math.PI, Math.PI / 4, 0);
      }
    }
    // Corner ornamental lamp posts & inlaid medallion / pathway details on bridges & plazas
    if (p.kind === 'bridge' || p.kind === 'plaza') {
      const lx = p.w * 0.44;
      const lz = p.d * 0.36;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          stamp(cyl, '#3f4e5a', p.x + sx * lx, p.y + 0.95, p.z + sz * lz, 0.08, 1.9, 0.08);
          stamp(oct, colAccent, p.x + sx * lx, p.y + 2.02, p.z + sz * lz, 0.2, 0.28, 0.2);
          const g = stage.glow(colAccent, 1.4, 0.6);
          g.position.set(p.x + sx * lx, p.y + 2.05, p.z + sz * lz);
          root.add(g);
        }
      }
      if (p.kind === 'plaza') {
        // Ornamental geometric carpet / mosaic inlay & star compass steps so foreground is rich & postcard-worthy
        stamp(cube, bp.side, p.x, p.y + 0.015, p.z, p.w * 0.72, 0.02, p.d * 0.62);
        stamp(cube, topCol, p.x, p.y + 0.028, p.z, p.w * 0.64, 0.02, p.d * 0.52);
        stamp(cube, colAccent, p.x, p.y + 0.036, p.z - p.d * 0.14, 1.4, 0.02, p.d * 0.68);
        // Sculpted side snow-pines / ornamental stone planters framing the terrace
        for (const sx of [-1, 1]) {
          stamp(cube, '#4c5e6b', p.x + sx * (p.w * 0.42), p.y + 0.28, p.z + 1.2, 0.9, 0.56, 0.9);
          stamp(cone, bp.propA, p.x + sx * (p.w * 0.42), p.y + 1.2, p.z + 1.2, 0.72, 1.55, 0.72, 0, sx);
          stamp(cone, '#edf6f9', p.x + sx * (p.w * 0.42), p.y + 1.65, p.z + 1.2, 0.42, 0.7, 0.42, 0, sx);
        }
      } else {
        // Bridge luminous runner strip & low decorative side curbs
        stamp(cube, colAccent, p.x, p.y + 0.02, p.z, 0.72, 0.02, p.d * 0.9);
        for (const sx of [-1, 1]) {
          stamp(cube, bp.side, p.x + sx * (p.w * 0.47), p.y + 0.16, p.z, 0.24, 0.32, p.d * 0.94);
          stamp(cube, bp.trim, p.x + sx * (p.w * 0.47), p.y + 0.34, p.z, 0.28, 0.06, p.d * 0.94);
        }
      }
    }
  }

  // 2. Living details & themed background vistas (midground + 60m+ dramatic skyline)
  const rotaryProps: {mesh: any; speed: number; axis: 'x' | 'y' | 'z'}[] = [];
  if (spec.biome === 'aurora' || spec.biome === 'sanctuary') {
    // Snow-capped evergreen pines & translucent ice crystal clusters around outer islands
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * TAU + random.range(-0.08, 0.08);
      const r = random.range(26, 48);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = random.range(5, 16);
      stamp(cone, i % 3 === 0 ? bp.propB : bp.propA, x, h * 0.4 - 2.2, z, random.range(2.6, 5.5), h, random.range(2.6, 5.5), 0, a, 0);
      stamp(cone, '#edf6f9', x, h * 0.72 - 2.2, z, random.range(1.4, 2.8), h * 0.42, random.range(1.4, 2.8), 0, a, 0);
    }
    // Distant jagged alpine peaks
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      const r = random.range(72, 108);
      const h = random.range(22, 46);
      stamp(cone, '#21425b', Math.cos(a) * r, h * 0.35 - 4, Math.sin(a) * r, random.range(14, 24), h, random.range(14, 24), 0, a, 0);
    }
  } else if (spec.biome === 'cosmos') {
    // Floating asteroid clusters, orbital brass rings & distant ringed gas giant
    for (let i = 0; i < 42; i++) {
      const a = random.range(0, TAU);
      const r = random.range(25, 68);
      const y = random.range(-4, 22);
      const s = random.range(0.6, 2.4);
      stamp(oct, i % 2 ? bp.propA : bp.propB, Math.cos(a) * r, y, Math.sin(a) * r, s, s * 0.75, s, random.range(0, 3), a, 0);
    }
    const planet = new T.Group();
    planet.position.set(-46, 30, -68);
    const pMesh = new T.Mesh(new T.IcosahedronGeometry(11, 2), stage.toon(colPrimary));
    pMesh.layers.set(LAYER.NO_OUTLINE);
    const pRing = new T.Mesh(
      new T.TorusGeometry(17.5, 1.3, 4, 48),
      new T.MeshBasicMaterial({color: colAccent, transparent: true, opacity: 0.45, depthWrite: false}),
    );
    pRing.rotation.set(1.25, 0.3, 0.2);
    pRing.layers.set(LAYER.NO_OUTLINE);
    planet.add(pMesh, pRing);
    root.add(planet);
    rotaryProps.push({mesh: planet, speed: 0.08, axis: 'y'});
  } else if (spec.biome === 'lantern') {
    // Storybook snow-roofed European spires, warm glowing windows & festive silhouettes
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const r = random.range(30, 58);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = random.range(8, 22);
      const w = random.range(3.2, 6.2);
      stamp(cube, i % 2 ? '#34304a' : '#4a3b52', x, h / 2 - 2.5, z, w, h, w, 0, a, 0);
      stamp(cone, '#2b243b', x, h + 1.8 - 2.5, z, w * 0.82, 4.6, w * 0.82, 0, a + Math.PI / 4, 0);
      // Warm lit windows
      for (let wy = 2; wy < h - 2; wy += 3.2) {
        stamp(cube, '#ffd166', x - Math.cos(a) * (w * 0.51), wy - 2.2, z - Math.sin(a) * (w * 0.51), 0.75, 1.1, 0.75, 0, a, 0);
      }
    }
  } else if (spec.biome === 'clockwork') {
    // Rotating giant brass cogs framing the horizon & copper pylons
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.4;
      const r = 38;
      const cog = new T.Group();
      cog.position.set(Math.cos(a) * r, 7 + (i % 2) * 5, Math.sin(a) * r);
      cog.lookAt(0, 8, 0);
      const ring = new T.Mesh(new T.TorusGeometry(5.5, 0.55, 8, 24), stage.toon(i % 2 ? '#c9933b' : '#586f7c'));
      cog.add(ring);
      for (let k = 0; k < 12; k++) {
        const ta = (k / 12) * TAU;
        const tooth = new T.Mesh(cube, stage.toon('#d4a045'));
        tooth.scale.set(0.85, 1.4, 0.6);
        tooth.position.set(Math.cos(ta) * 6.3, Math.sin(ta) * 6.3, 0);
        tooth.rotation.z = ta + Math.PI / 2;
        cog.add(tooth);
      }
      root.add(cog);
      rotaryProps.push({mesh: cog, speed: (i % 2 ? 0.22 : -0.18), axis: 'z'});
    }
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU;
      const r = random.range(28, 52);
      const h = random.range(6, 15);
      stamp(cyl, bp.propA, Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r, 0.8, h, 0.8);
      stamp(oct, colAccent, Math.cos(a) * r, h - 1.5, Math.sin(a) * r, 0.7, 0.9, 0.7);
    }
  } else {
    // 'ocean': Floating sea stacks, glowing buoys & distant sails
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      const r = random.range(28, 66);
      const h = random.range(4, 17);
      stamp(cone, i % 2 ? '#29576e' : '#3a7185', Math.cos(a) * r, h * 0.35 - 2.5, Math.sin(a) * r, random.range(3.5, 9), h, random.range(3.5, 9), 0, a, 0);
    }
  }

  // Flush instanced geometry batches
  const swatch = new T.Color();
  for (const [geo, batch] of batches) {
    const im = new T.InstancedMesh(geo, stage.toon('#ffffff'), batch.colors.length);
    im.castShadow = true;
    im.receiveShadow = true;
    batch.matrices.forEach((m, i) => {
      im.setMatrixAt(i, m);
      im.setColorAt(i, swatch.set(batch.colors[i]));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    root.add(im);
  }

  // 3. Luminous Animated Mirror Sea / Starry Ice Floor (GLSL ShaderMaterial)
  const seaMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: {value: 0},
      uColA: {value: new T.Color(bp.seaA)},
      uColB: {value: new T.Color(bp.seaB)},
      uGlow: {value: new T.Color(colAccent)},
    },
    vertexShader: `varying vec2 vWorld; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColA, uColB, uGlow; varying vec2 vWorld;
      void main(){
        float d = length(vWorld);
        float w1 = sin(vWorld.x * 0.24 + uTime * 1.1) * cos(vWorld.y * 0.22 - uTime * 0.9);
        float w2 = sin(d * 0.32 - uTime * 1.6);
        float spec = smoothstep(0.76, 0.98, w1 * 0.5 + w2 * 0.5);
        vec3 col = mix(uColA, uColB, 0.45 + 0.35 * sin(d * 0.08 - uTime * 0.5));
        col += uGlow * spec * 0.34;
        float alpha = smoothstep(135.0, 26.0, d) * 0.9;
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const sea = new T.Mesh(new T.PlaneGeometry(280, 280), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -1.6;
  sea.layers.set(LAYER.NO_OUTLINE);
  root.add(sea);

  // 4. Sweeping GLSL Aurora Ribbon / Celestial Veil across the sky
  const auroraMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
    uniforms: {
      uTime: {value: 0},
      uIntensity: {value: spec.biome === 'aurora' || spec.biome === 'cosmos' ? 1.0 : 0.62},
      uC1: {value: new T.Color(spec.biome === 'lantern' ? '#ff9f68' : spec.biome === 'sanctuary' ? '#f5dca8' : '#4ef2d2')},
      uC2: {value: new T.Color(spec.biome === 'cosmos' ? '#a67cff' : colAccent)},
    },
    vertexShader: `
      uniform float uTime; varying vec2 vUv;
      void main(){
        vUv = uv;
        vec3 p = position;
        p.z += sin(uv.x * 12.0 + uTime * 0.7) * 5.0 + cos(uv.x * 6.0 - uTime * 0.45) * 3.5;
        p.y += sin(uv.x * 9.0 + uTime * 0.5) * 2.4;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uIntensity; uniform vec3 uC1, uC2; varying vec2 vUv;
      void main(){
        float band = sin(vUv.x * 22.0 + uTime * 0.9) * 0.5 + 0.5;
        float rays = pow(sin(vUv.x * 48.0 - uTime * 1.4) * 0.5 + 0.5, 2.0);
        float fadeY = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.18, vUv.y);
        float fadeX = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        vec3 col = mix(uC1, uC2, band);
        float a = fadeY * fadeX * (0.28 + 0.42 * rays) * uIntensity;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const auroraArc = new T.Mesh(new T.CylinderGeometry(86, 86, 26, 64, 1, true, Math.PI * 0.18, Math.PI * 1.64), auroraMat);
  auroraArc.position.set(0, 34, -8);
  auroraArc.layers.set(LAYER.NO_OUTLINE);
  root.add(auroraArc);

  // Twinkling starfield dome
  const starCount = 620;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = random.range(0, TAU);
    const h = random.range(0.06, 0.98);
    const r = Math.sqrt(1 - h * h);
    starPos[i * 3] = 148 * r * Math.cos(a);
    starPos[i * 3 + 1] = 148 * h;
    starPos[i * 3 + 2] = 148 * r * Math.sin(a);
  }
  const softDot = softParticleTex(false);
  const softStar = softParticleTex(true);
  const skyStarGeo = new T.BufferGeometry();
  skyStarGeo.setAttribute('position', new T.BufferAttribute(starPos, 3));
  const skyStarMat = new T.PointsMaterial({map: softStar, color: '#fff6d6', size: 1.4, transparent: true, opacity: 0.85, fog: false, depthWrite: false, blending: T.AdditiveBlending});
  const skyStars = new T.Points(skyStarGeo, skyStarMat);
  skyStars.layers.set(LAYER.NO_OUTLINE);
  root.add(skyStars);

  // 5. Central Hero Monument
  const monument = buildMonument(stage, spec.monument, spec.palette);
  monument.group.position.set(layout.monumentPos[0], layout.monumentPos[1], layout.monumentPos[2]);
  root.add(monument.group);

  // Finale Activation Altar Circle in front of monument
  const altarRing = new T.Mesh(
    new T.TorusGeometry(1.55, 0.08, 8, 40),
    new T.MeshBasicMaterial({color: colAccent, transparent: true, opacity: 0.2, depthWrite: false, blending: T.AdditiveBlending}),
  );
  altarRing.rotation.x = Math.PI / 2;
  altarRing.position.set(layout.altarPos[0], layout.altarPos[1] + 0.08, layout.altarPos[2]);
  altarRing.layers.set(LAYER.NO_OUTLINE);
  root.add(altarRing);
  const altarBeam = new T.Mesh(
    new T.CylinderGeometry(1.1, 1.5, 16, 20, 1, true),
    new T.MeshBasicMaterial({color: '#fff3be', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide}),
  );
  altarBeam.position.set(layout.altarPos[0], layout.altarPos[1] + 8, layout.altarPos[2]);
  altarBeam.layers.set(LAYER.NO_OUTLINE);
  root.add(altarBeam);

  // 6. Three Interactive Resonance Nodes / Speed Ring Gates + Flowing Bezier Energy Beams to Monument
  interface NodeVisual {
    ring: any;
    crystal: any;
    beam: any;
    tether: any;
    tetherDots: any[];
    curve: any;
    color: string;
    burst: number;
    shockwave: any;
  }
  const nodeVisuals: NodeVisual[] = layout.nodes.map(n => {
    const elColor = slimeElements[n.element].color;
    const g = new T.Group();
    g.position.set(n.pos[0], n.pos[1], n.pos[2]);
    root.add(g);

    let ring: any;
    let crystal: any;
    if (n.kind === 'ring') {
      // Giant luminous speed ring gate
      ring = new T.Mesh(new T.TorusGeometry(2.55, 0.14, 10, 42), stage.toon(elColor, {emissive: elColor, emissiveIntensity: 0.55}));
      ring.position.y = 2.65;
      ring.rotation.y = Math.atan2(layout.monumentPos[0] - n.pos[0], layout.monumentPos[2] - n.pos[2]) + Math.PI / 2;
      g.add(ring);
      crystal = new T.Mesh(new T.OctahedronGeometry(0.42, 0), stage.toon('#ffffff', {emissive: elColor, emissiveIntensity: 0.7}));
      crystal.position.y = 5.45;
      g.add(crystal);
    } else {
      // Sculpted element resonance pedestal + hovering crystal & glowing ground sigil
      const ped = new T.Mesh(new T.CylinderGeometry(0.95, 1.25, 0.42, 8), stage.toon('#42525e'));
      ped.position.y = 0.21;
      g.add(ped);
      ring = new T.Mesh(
        new T.TorusGeometry(1.48, 0.08, 8, 36),
        new T.MeshBasicMaterial({color: elColor, transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending}),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.12;
      ring.layers.set(LAYER.NO_OUTLINE);
      g.add(ring);
      crystal = new T.Mesh(new T.OctahedronGeometry(0.56, 0), stage.toon(elColor, {emissive: elColor, emissiveIntensity: 0.45}));
      crystal.position.y = 1.85;
      g.add(crystal);
    }

    // Tall sky-reaching guide beacon beam
    const beam = new T.Mesh(
      new T.CylinderGeometry(0.18, 0.85, 22, 14, 1, true),
      new T.MeshBasicMaterial({color: elColor, transparent: true, opacity: 0.26, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide}),
    );
    beam.position.y = 11.2;
    beam.layers.set(LAYER.NO_OUTLINE);
    g.add(beam);

    // Expanding shockwave ring on activation
    const shockwave = new T.Mesh(
      new T.TorusGeometry(1.1, 0.12, 8, 40),
      new T.MeshBasicMaterial({color: elColor, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending}),
    );
    shockwave.rotation.x = Math.PI / 2;
    shockwave.position.y = 0.6;
    shockwave.layers.set(LAYER.NO_OUTLINE);
    g.add(shockwave);

    // Flowing 3D Quadratic Bezier energy tether from node to central monument
    const p0 = new T.Vector3(n.pos[0], n.pos[1] + 2.0, n.pos[2]);
    const p2 = new T.Vector3(layout.monumentPos[0], layout.monumentPos[1] + monument.coreY, layout.monumentPos[2]);
    const mid = p0.clone().lerp(p2, 0.5);
    mid.y += 5.2;
    const curve = new T.QuadraticBezierCurve3(p0, mid, p2);
    const tubeGeo = new T.TubeGeometry(curve, 28, 0.08, 6, false);
    const tether = new T.Mesh(
      tubeGeo,
      new T.MeshBasicMaterial({color: elColor, transparent: true, opacity: 0.72, depthWrite: false, blending: T.AdditiveBlending}),
    );
    tether.layers.set(LAYER.NO_OUTLINE);
    tether.visible = false;
    root.add(tether);

    const tetherDots: any[] = [];
    for (let k = 0; k < 4; k++) {
      const dot = stage.glow(elColor, 1.35, 0.95);
      dot.visible = false;
      root.add(dot);
      tetherDots.push(dot);
    }

    return {ring, crystal, beam, tether, tetherDots, curve, color: elColor, burst: -1, shockwave};
  });

  // 7. Wind Jump Pads (spiralling upward luminous rings)
  const padVisuals = layout.pads.map(p => {
    const g = new T.Group();
    g.position.set(p.pos[0], p.pos[1] + 0.06, p.pos[2]);
    const base = new T.Mesh(new T.CylinderGeometry(1.05, 1.2, 0.16, 14), stage.toon('#3d9b5c', {emissive: '#3d9b5c', emissiveIntensity: 0.35}));
    g.add(base);
    const rings: any[] = [];
    for (let i = 0; i < 3; i++) {
      const r = new T.Mesh(
        new T.TorusGeometry(0.9 - i * 0.12, 0.045, 8, 28),
        new T.MeshBasicMaterial({color: '#a8ffd6', transparent: true, opacity: 0.65, depthWrite: false, blending: T.AdditiveBlending}),
      );
      r.rotation.x = Math.PI / 2;
      r.layers.set(LAYER.NO_OUTLINE);
      g.add(r);
      rings.push(r);
    }
    root.add(g);
    return {g, rings};
  });

  // 8. Split-Bridge Pressure Pads & Materializing Rainbow Key-Bridge
  let splitVisual: {padA: any; padB: any; planks: any[]; link: any} | null = null;
  if (layout.split) {
    const makePad = (pos: [number, number, number]) => {
      const g = new T.Group();
      g.position.set(pos[0], pos[1], pos[2]);
      const rim = new T.Mesh(new T.CylinderGeometry(1.15, 1.28, 0.14, 12), stage.toon('#3e4f5c'));
      rim.position.y = 0.07;
      const plate = new T.Mesh(new T.CylinderGeometry(0.92, 0.92, 0.18, 12), stage.toon(colAccent, {emissive: colAccent, emissiveIntensity: 0.35}));
      plate.position.y = 0.16;
      const halo = stage.glow(colAccent, 2.2, 0.55);
      halo.position.y = 0.45;
      g.add(rim, plate, halo);
      root.add(g);
      return {plate, halo};
    };
    const padA = makePad(layout.split.a);
    const padB = makePad(layout.split.b);
    const planks: any[] = [];
    const [bw, bh, bd] = layout.split.bridgeSize;
    const count = 8;
    const rainbow = ['#72efdd', '#64dfdf', '#56cfe1', '#74c0fc', '#b197fc', '#f783ac', '#ffd166', '#80ed99'];
    for (let i = 0; i < count; i++) {
      const m = new T.Mesh(
        new T.BoxGeometry(bw, bh, (bd / count) * 0.86),
        stage.toon(rainbow[i % rainbow.length], {emissive: rainbow[i % rainbow.length], emissiveIntensity: 0.45, transparent: true, opacity: 0.92}),
      );
      const z = layout.split.bridgePos[2] + bd / 2 - ((i + 0.5) / count) * bd;
      m.position.set(layout.split.bridgePos[0], layout.split.bridgePos[1] - bh / 2, z);
      m.scale.set(0.01, 0.01, 0.01);
      m.visible = false;
      root.add(m);
      planks.push(m);
    }
    const link = new T.Mesh(
      new T.BoxGeometry(Math.hypot(layout.split.b[0] - layout.split.a[0], layout.split.b[2] - layout.split.a[2]), 0.09, 0.14),
      new T.MeshBasicMaterial({color: '#fff3b0', transparent: true, opacity: 0.25, depthWrite: false, blending: T.AdditiveBlending}),
    );
    link.position.set((layout.split.a[0] + layout.split.b[0]) / 2, layout.split.a[1] + 0.18, (layout.split.a[2] + layout.split.b[2]) / 2);
    link.layers.set(LAYER.NO_OUTLINE);
    root.add(link);
    splitVisual = {padA, padB, planks, link};
  }

  // 9. Eight Collectible Luminous Stardust Crystals
  const starVisuals = layout.stars.map(s => {
    const g = new T.Group();
    g.position.set(s.pos[0], s.pos[1], s.pos[2]);
    const gem = new T.Mesh(new T.OctahedronGeometry(0.36, 0), stage.toon('#ffe066', {emissive: '#ffb703', emissiveIntensity: 0.65}));
    const halo = stage.glow('#fff3b0', 1.65, 0.72);
    g.add(gem, halo);
    root.add(g);
    return {g, gem, baseY: s.pos[1], fade: 1};
  });

  // 10. Ambient Winter Snow / Stardust / Lantern Sparkle Particles (440 particles)
  const snowCount = 440;
  const snowPos = new Float32Array(snowCount * 3);
  const snowPhase = new Float32Array(snowCount);
  for (let i = 0; i < snowCount; i++) {
    snowPos[i * 3] = random.range(-34, 34);
    snowPos[i * 3 + 1] = random.range(0, 26);
    snowPos[i * 3 + 2] = random.range(-34, 34);
    snowPhase[i] = random.range(0, TAU);
  }
  const snowGeo = new T.BufferGeometry();
  snowGeo.setAttribute('position', new T.BufferAttribute(snowPos, 3));
  const snowMat = new T.PointsMaterial({
    map: softDot,
    color: bp.snow,
    size: spec.biome === 'aurora' || spec.biome === 'lantern' ? 0.56 : 0.48,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  const snowPoints = new T.Points(snowGeo, snowMat);
  snowPoints.layers.set(LAYER.NO_OUTLINE);
  snowPoints.frustumCulled = false;
  root.add(snowPoints);

  // 11. Finale Spectacle Particle System (3D Fireworks for bright days; Rising Golden Sky Lanterns for solemn days!)
  const fxCount = 240;
  const fxPos = new Float32Array(fxCount * 3);
  const fxCol = new Float32Array(fxCount * 3);
  const fxVel = new Float32Array(fxCount * 3);
  const fxLife = new Float32Array(fxCount);
  const fxGeo = new T.BufferGeometry();
  fxGeo.setAttribute('position', new T.BufferAttribute(fxPos, 3));
  fxGeo.setAttribute('color', new T.BufferAttribute(fxCol, 3));
  const fxMat = new T.PointsMaterial({
    map: softStar,
    size: spec.tone === 'solemn' ? 1.05 : 0.92,
    vertexColors: true,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  const fxPoints = new T.Points(fxGeo, fxMat);
  fxPoints.layers.set(LAYER.NO_OUTLINE);
  fxPoints.frustumCulled = false;
  fxPoints.visible = false;
  root.add(fxPoints);

  const burstColors = [colAccent, '#ffd166', '#72efdd', '#ff9f68', '#c77dff', '#ffffff'].map(c => new T.Color(c));
  let fxCursor = 0;
  let lastFireworkWave = -1;

  function spawnBurst(cx: number, cy: number, cz: number, count: number, speed: number, colorObj: any) {
    fxPoints.visible = true;
    for (let i = 0; i < count; i++) {
      const idx = fxCursor++ % fxCount;
      const theta = random.range(0, TAU);
      const phi = Math.acos(random.range(-1, 1));
      const spd = speed * random.range(0.45, 1.15);
      fxPos[idx * 3] = cx;
      fxPos[idx * 3 + 1] = cy;
      fxPos[idx * 3 + 2] = cz;
      fxVel[idx * 3] = Math.sin(phi) * Math.cos(theta) * spd;
      fxVel[idx * 3 + 1] = Math.cos(phi) * spd + speed * 0.25;
      fxVel[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * spd;
      fxCol[idx * 3] = colorObj.r;
      fxCol[idx * 3 + 1] = colorObj.g;
      fxCol[idx * 3 + 2] = colorObj.b;
      fxLife[idx] = random.range(1.4, 2.5);
    }
  }

  function spawnLanternWave(count: number) {
    fxPoints.visible = true;
    const warm = new T.Color('#ffdca8');
    const gold = new T.Color('#fff5d6');
    for (let i = 0; i < count; i++) {
      const idx = fxCursor++ % fxCount;
      const a = random.range(0, TAU);
      const r = random.range(2.5, 22);
      fxPos[idx * 3] = Math.cos(a) * r;
      fxPos[idx * 3 + 1] = random.range(0.5, 3.0);
      fxPos[idx * 3 + 2] = Math.sin(a) * r - 2;
      fxVel[idx * 3] = random.range(-0.35, 0.35);
      fxVel[idx * 3 + 1] = random.range(1.4, 2.8);
      fxVel[idx * 3 + 2] = random.range(-0.35, 0.35);
      const c = i % 2 ? warm : gold;
      fxCol[idx * 3] = c.r;
      fxCol[idx * 3 + 1] = c.g;
      fxCol[idx * 3 + 2] = c.b;
      fxLife[idx] = random.range(4.5, 7.5);
    }
  }

  function triggerNodeBurst(index: number) {
    const nv = nodeVisuals[index];
    if (!nv) return;
    nv.burst = 0;
    const p = layout.nodes[index].pos;
    spawnBurst(p[0], p[1] + 2.0, p[2], 38, 6.2, new T.Color(nv.color));
  }

  function triggerStarBurst(pos: [number, number, number]) {
    spawnBurst(pos[0], pos[1], pos[2], 18, 4.2, new T.Color('#ffe066'));
  }

  function setSplitBridge(openK: number, padAK: number, padBK: number) {
    if (!splitVisual) return;
    splitVisual.padA.plate.position.y = 0.16 - padAK * 0.09;
    splitVisual.padB.plate.position.y = 0.16 - padBK * 0.09;
    splitVisual.padA.halo.scale.setScalar(2.0 + padAK * 1.4);
    splitVisual.padB.halo.scale.setScalar(2.0 + padBK * 1.4);
    splitVisual.link.material.opacity = 0.18 + Math.min(padAK, padBK) * 0.72;
    splitVisual.planks.forEach((m, i) => {
      const k = Math.max(0, Math.min(1, openK * 1.6 - i * 0.08));
      m.visible = k > 0.01;
      m.scale.set(k, k, k);
    });
  }

  const tmpVec = new T.Vector3();

  function update(
    time: number,
    dt: number,
    state: {
      slimePos: [number, number, number];
      doneNodes: boolean[];
      collectedStars: boolean[];
      allDone: boolean;
      finaleT: number;
    },
  ) {
    seaMat.uniforms.uTime.value = time;
    auroraMat.uniforms.uTime.value = time;
    const charge = state.doneNodes.filter(Boolean).length / 3;
    auroraMat.uniforms.uIntensity.value =
      (spec.biome === 'aurora' || spec.biome === 'cosmos' ? 1.0 : 0.65) +
      charge * 0.35 +
      (state.finaleT >= 0 ? 0.55 : 0);

    monument.update(time, dt, charge, state.finaleT);

    for (const r of rotaryProps) r.mesh.rotation[r.axis] += dt * r.speed;

    // Altar readiness glow
    altarRing.rotation.z = time * (state.allDone ? 1.4 : 0.3);
    altarRing.material.opacity = state.allDone ? 0.85 : 0.16;
    altarRing.scale.setScalar(state.allDone ? 1 + Math.sin(time * 4) * 0.08 : 0.9);
    altarBeam.material.opacity = state.finaleT >= 0 ? 0.45 : state.allDone ? 0.25 + Math.sin(time * 3) * 0.08 : 0;

    // Nodes, guide beacons, shockwaves & bezier energy tethers
    nodeVisuals.forEach((nv, i) => {
      const done = state.doneNodes[i];
      nv.crystal.rotation.y = time * (done ? 2.4 : 1.1) + i;
      nv.crystal.position.y = (layout.nodes[i].kind === 'ring' ? 5.45 : 1.85) + Math.sin(time * 2.4 + i) * 0.18;
      nv.beam.visible = !done;
      nv.beam.material.opacity = 0.2 + Math.sin(time * 3 + i) * 0.07;
      nv.tether.visible = done;
      if (done) {
        nv.tetherDots.forEach((d, k) => {
          d.visible = true;
          const u = (time * 0.55 + k * 0.25) % 1;
          nv.curve.getPoint(u, tmpVec);
          d.position.copy(tmpVec);
        });
      }
      if (nv.burst >= 0) {
        nv.burst += dt;
        const p = nv.burst / 0.85;
        if (p >= 1) {
          nv.burst = -1;
          nv.shockwave.material.opacity = 0;
        } else {
          nv.shockwave.scale.setScalar(1 + p * 7.5);
          nv.shockwave.material.opacity = (1 - p) * 0.85;
        }
      }
    });

    // Wind jump pads animation
    padVisuals.forEach((pv, idx) => {
      pv.rings.forEach((r, i) => {
        const u = (time * 1.4 + i * 0.33 + idx * 0.2) % 1;
        r.position.y = 0.15 + u * 1.65;
        r.scale.setScalar(0.85 + u * 0.45);
        r.material.opacity = (1 - u) * 0.7;
      });
    });

    // Collectible stardust crystals
    starVisuals.forEach((sv, i) => {
      if (state.collectedStars[i]) {
        if (sv.fade > 0) {
          sv.fade = Math.max(0, sv.fade - dt * 3.5);
          sv.g.scale.setScalar(sv.fade);
          sv.g.position.y += dt * 2.5;
        } else {
          sv.g.visible = false;
        }
      } else {
        sv.gem.rotation.y = time * 2.1 + i;
        sv.gem.rotation.x = Math.sin(time * 1.4 + i) * 0.35;
        sv.g.position.y = sv.baseY + Math.sin(time * 2.6 + i) * 0.2;
      }
    });

    // Ambient snow / stardust drift
    const rise = spec.biome === 'lantern' || spec.biome === 'sanctuary';
    for (let i = 0; i < snowCount; i++) {
      const ph = snowPhase[i];
      snowPos[i * 3] += Math.sin(time * 0.7 + ph) * dt * 0.65;
      snowPos[i * 3 + 1] += (rise ? 1 : -1) * dt * (0.9 + (i % 5) * 0.22);
      snowPos[i * 3 + 2] += Math.cos(time * 0.6 + ph) * dt * 0.55;
      if (snowPos[i * 3 + 1] < -1) snowPos[i * 3 + 1] = 25;
      if (snowPos[i * 3 + 1] > 26) snowPos[i * 3 + 1] = 0;
    }
    snowGeo.attributes.position.needsUpdate = true;

    // Finale fireworks or solemn sky lanterns
    if (state.finaleT >= 0) {
      const wave = Math.floor(state.finaleT / (spec.tone === 'solemn' ? 1.4 : 0.75));
      if (wave > lastFireworkWave && state.finaleT < 6.5) {
        lastFireworkWave = wave;
        if (spec.tone === 'solemn') {
          spawnLanternWave(44);
        } else {
          const a = wave * 1.7 + 0.5;
          const r = 7 + (wave % 3) * 4.5;
          spawnBurst(
            Math.cos(a) * r,
            layout.monumentPos[1] + 9.5 + (wave % 3) * 2.6,
            layout.monumentPos[2] + Math.sin(a) * r,
            46,
            8.2,
            burstColors[wave % burstColors.length],
          );
        }
      }
    }

    // Integrate active burst / lantern particles
    if (fxPoints.visible) {
      let alive = false;
      const gravity = spec.tone === 'solemn' && state.finaleT >= 0 ? -0.35 : 4.2;
      for (let i = 0; i < fxCount; i++) {
        if (fxLife[i] <= 0) {
          fxPos[i * 3 + 1] = -999;
          continue;
        }
        alive = true;
        fxLife[i] -= dt;
        fxVel[i * 3 + 1] -= gravity * dt;
        fxVel[i * 3] *= Math.pow(0.96, dt * 60);
        fxVel[i * 3 + 2] *= Math.pow(0.96, dt * 60);
        fxPos[i * 3] += fxVel[i * 3] * dt;
        fxPos[i * 3 + 1] += fxVel[i * 3 + 1] * dt;
        fxPos[i * 3 + 2] += fxVel[i * 3 + 2] * dt;
      }
      fxGeo.attributes.position.needsUpdate = true;
      fxGeo.attributes.color.needsUpdate = true;
      if (!alive && state.finaleT < 0) fxPoints.visible = false;
    }
  }

  return {root, triggerNodeBurst, triggerStarBurst, setSplitBridge, update};
}
