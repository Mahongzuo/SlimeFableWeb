import {awake, CRITTER_KINDS, logCatch, spawnCritter, stepCritter, type Critter, type CritterKind} from '../life/critters';
import {ITEMS} from '../life/catalog';
import type {PlayerHandle, ZoneContext} from './types';
import {spawnSimPondActor, type SimPondActorHandle} from '../home/simpond-assets';

/** Articulated high-detail storybook critter heights & base palettes. */
const LOOK: Record<string, [number, number, [number, number, number]]> = {
  'critter-butterfly': [0xf2a7b5, 0xfff3d1, [.14, .05, .14]],
  'critter-ladybug': [0xd8392b, 0x252220, [.11, .075, .13]],
  'critter-dragonfly': [0x2fa49e, 0xd8f4ff, [.06, .045, .28]],
  'critter-frog': [0x5da846, 0xf2e8a4, [.16, .11, .18]],
  'critter-rabbit': [0xefe5d6, 0xf6c2c6, [.18, .18, .26]],
  'critter-squirrel': [0xb8622b, 0xf0d6b0, [.14, .15, .22]],
  'critter-hedgehog': [0x6e533d, 0xe2d0b4, [.17, .13, .22]],
  'critter-beetle': [0x27476e, 0x162230, [.11, .08, .15]],
  'critter-firefly': [0x3c342c, 0xffe472, [.055, .05, .095]],
  'critter-owl': [0x8a6d4e, 0xf4e6cb, [.20, .28, .19]],
};

const texCache = new WeakMap<any, Record<string, any>>();

function getCritterTextures(T: any) {
  let cache = texCache.get(T);
  if (cache) return cache;
  cache = {};

  // 1. Detailed Butterfly Wing Texture (gradient + delicate veins + scalloped dark rim + pearl spots)
  {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 256, 256);
    const grad = g.createRadialGradient(36, 128, 12, 130, 128, 175);
    grad.addColorStop(0, '#fff7dc');
    grad.addColorStop(0.32, '#f9c2ce');
    grad.addColorStop(0.68, '#ee8ca6');
    grad.addColorStop(0.86, '#5b3648');
    grad.addColorStop(1, '#2b1b26');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);

    // Subtle golden-pearl iridescence patches
    const glow = g.createRadialGradient(112, 92, 6, 112, 92, 58);
    glow.addColorStop(0, 'rgba(255, 248, 210, 0.72)');
    glow.addColorStop(1, 'rgba(255, 248, 210, 0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, 256, 256);

    // Delicate wing veins radiating from hinge (x=0, y=128)
    g.strokeStyle = 'rgba(58, 30, 44, 0.65)';
    g.lineWidth = 3.2;
    g.lineCap = 'round';
    const rays = [24, 56, 88, 120, 152, 186, 218];
    for (const ry of rays) {
      g.beginPath();
      g.moveTo(8, 128);
      g.quadraticCurveTo(118, (128 + ry) * 0.5 + (ry < 128 ? -16 : 16), 244, ry);
      g.stroke();
    }
    // Outer pearl margin dots & eye spot
    g.fillStyle = '#fff9eb';
    for (let i = 0; i < 8; i++) {
      const y = 32 + i * 27;
      g.beginPath();
      g.arc(224 - Math.abs(i - 3.5) * 6, y, 6.2, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#3a2234';
    g.beginPath();
    g.arc(166, 86, 17, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffd978';
    g.beginPath();
    g.arc(166, 86, 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(162, 82, 3.8, 0, Math.PI * 2);
    g.fill();

    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    cache.butterflyWing = tex;
  }

  // 2. Ladybug Glossy Spotted Elytra Texture
  {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const bg = g.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, '#ee4433');
    bg.addColorStop(0.55, '#d62e20');
    bg.addColorStop(1, '#9e1d16');
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 256);

    // Center elytra split line
    g.strokeStyle = '#1d1917';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(128, 0);
    g.lineTo(128, 256);
    g.stroke();

    // Classic 7 black spots
    g.fillStyle = '#1c1816';
    const spots: [number, number, number][] = [
      [128, 46, 18],
      [78, 86, 19], [178, 86, 19],
      [62, 152, 20], [194, 152, 20],
      [92, 196, 16], [164, 196, 16],
    ];
    for (const [x, y, r] of spots) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    cache.ladybugShell = tex;
  }

  // 3. Gossamer Dragonfly Wing Texture (fine reticulated veins)
  {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 256, 96);
    const grad = g.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(180, 240, 245, 0.72)');
    grad.addColorStop(0.7, 'rgba(218, 248, 255, 0.48)');
    grad.addColorStop(1, 'rgba(160, 232, 240, 0.65)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 96);

    g.strokeStyle = 'rgba(42, 118, 122, 0.62)';
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(0, 26); g.lineTo(252, 22); g.stroke();
    g.beginPath(); g.moveTo(0, 48); g.lineTo(246, 46); g.stroke();
    g.lineWidth = 1.4;
    for (let x = 22; x < 244; x += 22) {
      g.beginPath(); g.moveTo(x, 12); g.lineTo(x + 8, 82); g.stroke();
    }
    // Pterostigma dark tip accent
    g.fillStyle = 'rgba(34, 86, 92, 0.8)';
    g.fillRect(198, 14, 34, 14);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    cache.dragonflyWing = tex;
  }

  texCache.set(T, cache);
  return cache;
}

function makeButterflyWingGeo(T: any, upper: boolean) {
  const sh = new T.Shape();
  if (upper) {
    // Graceful curved forewing pivoting cleanly at x = 0
    sh.moveTo(0, 0);
    sh.bezierCurveTo(0.06, 0.14, 0.22, 0.24, 0.30, 0.16);
    sh.bezierCurveTo(0.34, 0.10, 0.30, -0.02, 0.18, -0.04);
    sh.bezierCurveTo(0.09, -0.05, 0.03, -0.02, 0, 0);
  } else {
    // Rounded hindwing with delicate swallowtail curve
    sh.moveTo(0, -0.01);
    sh.bezierCurveTo(0.08, -0.02, 0.20, -0.04, 0.22, -0.13);
    sh.bezierCurveTo(0.23, -0.20, 0.15, -0.26, 0.11, -0.23);
    sh.bezierCurveTo(0.06, -0.19, 0.02, -0.12, 0, -0.01);
  }
  const geo = new T.ShapeGeometry(sh, 14);
  // Normalize UVs cleanly into [0..1] for the wing texture
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i);
    uv.setXY(i, Math.min(1, Math.max(0, px / 0.32)), Math.min(1, Math.max(0, (py + 0.26) / 0.50)));
  }
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function makeDragonflyWingGeo(T: any, len: number, width: number) {
  const sh = new T.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(len * 0.25, width * 0.65, len * 0.78, width * 0.72, len, width * 0.12);
  sh.bezierCurveTo(len * 0.92, -width * 0.42, len * 0.35, -width * 0.55, 0, 0);
  const geo = new T.ShapeGeometry(sh, 12);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, Math.min(1, Math.max(0, pos.getX(i) / len)), Math.min(1, Math.max(0, (pos.getY(i) + width * 0.6) / (width * 1.3))));
  }
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function addEyes(T: any, g: any, xOff: number, y: number, z: number, r: number, eyeMat: any, glintMat: any, irisMat?: any) {
  for (const side of [-1, 1]) {
    if (irisMat) {
      const iris = new T.Mesh(new T.SphereGeometry(r * 1.35, 10, 8), irisMat);
      iris.position.set(side * xOff, y, z - r * 0.15);
      g.add(iris);
    }
    const eye = new T.Mesh(new T.SphereGeometry(r, 10, 8), eyeMat);
    eye.position.set(side * xOff, y, z);
    g.add(eye);
    const glint = new T.Mesh(new T.SphereGeometry(r * 0.36, 6, 5), glintMat);
    glint.position.set(side * xOff + side * r * 0.22, y + r * 0.32, z + r * 0.78);
    g.add(glint);
  }
}

function addAntennae(T: any, g: any, y: number, z: number, len: number, spread: number, mat: any, club = false) {
  for (const side of [-1, 1]) {
    const piv = new T.Group();
    piv.position.set(side * 0.015, y, z);
    piv.rotation.set(0.55, side * spread, -side * 0.32);
    const stalk = new T.Mesh(new T.CylinderGeometry(0.004, 0.006, len, 6), mat);
    stalk.position.y = len * 0.5;
    piv.add(stalk);
    if (club) {
      const tip = new T.Mesh(new T.SphereGeometry(0.011, 7, 6), mat);
      tip.position.y = len;
      piv.add(tip);
    }
    g.add(piv);
  }
}

function buildCritterMesh(z: ZoneContext, kind: CritterKind) {
  const {T} = z;
  const [body, accent] = LOOK[kind.id];
  const tex = getCritterTextures(T);
  const g = new T.Group();
  const bodyMat = z.toon(body);
  const accMat = z.toon(accent);
  const darkMat = z.toon(0x1f1b18);
  const glintMat = new T.MeshBasicMaterial({color: 0xffffff});

  if (kind.id === 'critter-butterfly') {
    const thoraxMat = z.toon(0x3a2a33);
    // Sculpted head + thorax + segmented tapered abdomen
    const thorax = new T.Mesh(new T.SphereGeometry(0.036, 14, 10), thoraxMat);
    thorax.scale.set(0.85, 0.85, 1.45);
    g.add(thorax);
    const head = new T.Mesh(new T.SphereGeometry(0.028, 12, 10), thoraxMat);
    head.position.set(0, 0.008, 0.062);
    g.add(head);
    for (let seg = 0; seg < 4; seg++) {
      const r = 0.026 * (1 - seg * 0.16);
      const ab = new T.Mesh(new T.SphereGeometry(r, 10, 8), seg % 2 ? thoraxMat : z.toon(0x523b47));
      ab.scale.set(0.85, 0.85, 1.35);
      ab.position.set(0, -0.004 - seg * 0.003, -0.045 - seg * 0.032);
      g.add(ab);
    }
    addEyes(T, g, 0.018, 0.012, 0.078, 0.010, darkMat, glintMat);
    addAntennae(T, g, 0.022, 0.075, 0.095, 0.32, darkMat, true);

    // Dual-lobe swallowtail wings (forewing + hindwing) with painted texture & central hinge pivot
    const wingMat = new T.MeshStandardMaterial({
      map: tex.butterflyWing,
      roughness: 0.45,
      metalness: 0.06,
      side: T.DoubleSide,
      transparent: true,
      alphaTest: 0.05,
    });
    const foreGeo = makeButterflyWingGeo(T, true);
    const hindGeo = makeButterflyWingGeo(T, false);
    for (const side of [-1, 1]) {
      const hinge = new T.Group();
      hinge.position.set(side * 0.022, 0.016, 0.012);
      const fore = new T.Mesh(foreGeo, wingMat);
      const hind = new T.Mesh(hindGeo, wingMat);
      hind.position.y = -0.004;
      if (side < 0) {
        fore.scale.x = -1;
        hind.scale.x = -1;
      }
      hinge.add(fore, hind);
      hinge.userData.wing = side;
      hinge.userData.wingAmp = 1.05;
      hinge.userData.wingFreq = 16;
      g.add(hinge);
    }
  } else if (kind.id === 'critter-ladybug') {
    // High-polish spotted dome elytra + pronotum collar + sculpted head + 6 legs + antennae
    const shellMat = new T.MeshStandardMaterial({
      map: tex.ladybugShell,
      roughness: 0.22,
      metalness: 0.08,
    });
    const shell = new T.Mesh(new T.SphereGeometry(0.115, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), shellMat);
    shell.scale.set(0.95, 0.72, 1.15);
    shell.position.set(0, -0.01, -0.015);
    shell.rotation.y = Math.PI * 0.5;
    g.add(shell);
    // Flat dark underbelly closing the dome cleanly
    const belly = new T.Mesh(new T.CylinderGeometry(0.105, 0.092, 0.022, 18), darkMat);
    belly.scale.set(0.95, 1, 1.12);
    belly.position.set(0, -0.02, -0.015);
    g.add(belly);
    // Pronotum shield with 2 signature cream cheek markings
    const pronotum = new T.Mesh(new T.SphereGeometry(0.068, 16, 12), darkMat);
    pronotum.scale.set(1.08, 0.65, 0.75);
    pronotum.position.set(0, 0.012, 0.088);
    g.add(pronotum);
    for (const side of [-1, 1]) {
      const dot = new T.Mesh(new T.SphereGeometry(0.016, 8, 6), z.toon(0xfff5e4));
      dot.position.set(side * 0.048, 0.032, 0.095);
      g.add(dot);
    }
    const head = new T.Mesh(new T.SphereGeometry(0.044, 14, 10), darkMat);
    head.scale.set(1.05, 0.78, 0.9);
    head.position.set(0, 0.005, 0.132);
    g.add(head);
    addEyes(T, g, 0.025, 0.015, 0.162, 0.011, darkMat, glintMat);
    addAntennae(T, g, 0.012, 0.162, 0.058, 0.45, darkMat, true);
    // 6 delicate articulated legs
    for (const side of [-1, 1]) {
      for (let li = 0; li < 3; li++) {
        const leg = new T.Mesh(new T.CylinderGeometry(0.006, 0.004, 0.075, 5), darkMat);
        leg.position.set(side * 0.095, -0.035, 0.055 - li * 0.058);
        leg.rotation.z = side * 0.85;
        leg.rotation.x = (li - 1) * 0.25;
        g.add(leg);
      }
    }
  } else if (kind.id === 'critter-dragonfly') {
    const iridMat = new T.MeshStandardMaterial({color: 0x269e98, roughness: 0.24, metalness: 0.42});
    const thorax = new T.Mesh(new T.SphereGeometry(0.048, 16, 12), iridMat);
    thorax.scale.set(0.95, 0.92, 1.35);
    thorax.position.set(0, 0.01, 0.04);
    g.add(thorax);
    const head = new T.Mesh(new T.SphereGeometry(0.042, 14, 10), iridMat);
    head.scale.set(1.22, 0.95, 0.88);
    head.position.set(0, 0.016, 0.11);
    g.add(head);
    // Large wrap-around iridescent compound eyes
    const eyeOrbMat = new T.MeshStandardMaterial({color: 0x163842, roughness: 0.14, metalness: 0.35});
    addEyes(T, g, 0.032, 0.022, 0.128, 0.024, eyeOrbMat, glintMat);
    // 6-segment tapered slender tail
    for (let i = 0; i < 6; i++) {
      const seg = new T.Mesh(new T.CylinderGeometry(0.019 - i * 0.0018, 0.021 - i * 0.0018, 0.052, 10), i % 2 ? iridMat : z.toon(0x1b6d72));
      seg.rotation.x = Math.PI / 2;
      seg.position.set(0, 0.004 - i * 0.002, -0.032 - i * 0.048);
      g.add(seg);
    }
    const dWingMat = new T.MeshStandardMaterial({
      map: tex.dragonflyWing,
      transparent: true,
      opacity: 0.86,
      roughness: 0.18,
      metalness: 0.15,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const fGeo = makeDragonflyWingGeo(T, 0.30, 0.068);
    const hGeo = makeDragonflyWingGeo(T, 0.26, 0.062);
    for (const side of [-1, 1]) {
      for (const [idx, geo, zOff] of [[0, fGeo, 0.055], [1, hGeo, 0.012]] as const) {
        const piv = new T.Group();
        piv.position.set(side * 0.032, 0.034, zOff);
        const w = new T.Mesh(geo, dWingMat);
        if (side < 0) w.scale.x = -1;
        piv.add(w);
        piv.userData.wing = side;
        piv.userData.wingAmp = 0.55;
        piv.userData.wingFreq = 38;
        piv.userData.wingPhase = idx * 1.4;
        g.add(piv);
      }
    }
  } else if (kind.id === 'critter-frog') {
    const bellyMat = accMat;
    const spotMat = z.toon(0x3f7c31);
    const torso = new T.Mesh(new T.SphereGeometry(0.14, 18, 14), bodyMat);
    torso.scale.set(1.12, 0.72, 1.24);
    torso.position.set(0, 0.02, -0.01);
    g.add(torso);
    const belly = new T.Mesh(new T.SphereGeometry(0.12, 14, 10), bellyMat);
    belly.scale.set(1.02, 0.52, 1.08);
    belly.position.set(0, -0.022, 0.01);
    g.add(belly);
    // Dorsal green spots
    for (const [sx, sy, sz, sr] of [[0, 0.105, -0.04, 0.038], [-0.075, 0.082, -0.06, 0.028], [0.075, 0.082, -0.06, 0.028]] as const) {
      const sp = new T.Mesh(new T.SphereGeometry(sr, 10, 8), spotMat);
      sp.scale.set(1, 0.45, 1.2);
      sp.position.set(sx, sy, sz);
      g.add(sp);
    }
    const snout = new T.Mesh(new T.SphereGeometry(0.105, 16, 12), bodyMat);
    snout.scale.set(1.15, 0.64, 0.95);
    snout.position.set(0, 0.042, 0.115);
    g.add(snout);
    // Raised frog eye domes + golden irises
    const goldIris = z.toon(0xf6c94c);
    for (const side of [-1, 1]) {
      const brow = new T.Mesh(new T.SphereGeometry(0.044, 12, 10), bodyMat);
      brow.position.set(side * 0.068, 0.115, 0.125);
      g.add(brow);
    }
    addEyes(T, g, 0.070, 0.122, 0.155, 0.020, darkMat, glintMat, goldIris);
    // Muscular folded hind legs + webbed feet + front arms
    for (const side of [-1, 1]) {
      const thigh = new T.Mesh(new T.CapsuleGeometry(0.044, 0.095, 6, 10), bodyMat);
      thigh.position.set(side * 0.145, 0.005, -0.07);
      thigh.rotation.set(0.75, side * 0.35, side * 0.4);
      g.add(thigh);
      const foot = new T.Mesh(new T.SphereGeometry(0.048, 10, 8), spotMat);
      foot.scale.set(0.95, 0.25, 1.45);
      foot.position.set(side * 0.16, -0.065, -0.04);
      g.add(foot);
      const arm = new T.Mesh(new T.CapsuleGeometry(0.022, 0.075, 5, 8), bodyMat);
      arm.position.set(side * 0.105, -0.025, 0.095);
      arm.rotation.set(-0.35, 0, -side * 0.28);
      g.add(arm);
    }
  } else if (kind.id === 'critter-rabbit') {
    const pinkMat = accMat;
    const whiteMat = z.toon(0xffffff);
    const torso = new T.Mesh(new T.SphereGeometry(0.175, 20, 14), bodyMat);
    torso.scale.set(0.96, 0.94, 1.32);
    torso.position.set(0, 0.03, -0.03);
    g.add(torso);
    const chest = new T.Mesh(new T.SphereGeometry(0.12, 14, 10), whiteMat);
    chest.position.set(0, 0.01, 0.10);
    g.add(chest);
    const head = new T.Mesh(new T.SphereGeometry(0.125, 18, 14), bodyMat);
    head.scale.set(1.02, 0.96, 1.08);
    head.position.set(0, 0.145, 0.165);
    g.add(head);
    const nose = new T.Mesh(new T.SphereGeometry(0.022, 10, 8), pinkMat);
    nose.scale.set(1.2, 0.85, 0.8);
    nose.position.set(0, 0.138, 0.292);
    g.add(nose);
    addEyes(T, g, 0.068, 0.175, 0.258, 0.022, darkMat, glintMat);
    // Long ears with inner pink lining
    for (const side of [-1, 1]) {
      const earPivot = new T.Group();
      earPivot.position.set(side * 0.056, 0.245, 0.145);
      earPivot.rotation.set(-0.14, 0, -side * 0.18);
      const ear = new T.Mesh(new T.CapsuleGeometry(0.030, 0.175, 6, 10), bodyMat);
      ear.scale.set(1, 1, 0.52);
      ear.position.y = 0.095;
      const inner = new T.Mesh(new T.CapsuleGeometry(0.018, 0.135, 5, 8), pinkMat);
      inner.scale.set(1, 1, 0.35);
      inner.position.set(0, 0.092, 0.014);
      earPivot.add(ear, inner);
      g.add(earPivot);
      // Plump haunches & front paws
      const haunch = new T.Mesh(new T.SphereGeometry(0.088, 12, 10), bodyMat);
      haunch.scale.set(0.75, 0.95, 1.15);
      haunch.position.set(side * 0.13, -0.02, -0.10);
      g.add(haunch);
      const paw = new T.Mesh(new T.SphereGeometry(0.036, 10, 8), whiteMat);
      paw.scale.set(0.85, 0.55, 1.35);
      paw.position.set(side * 0.072, -0.105, 0.145);
      g.add(paw);
    }
    // Fluffy cotton tail
    const tail = new T.Mesh(new T.SphereGeometry(0.082, 14, 10), whiteMat);
    tail.position.set(0, 0.045, -0.255);
    g.add(tail);
  } else if (kind.id === 'critter-squirrel') {
    const torso = new T.Mesh(new T.SphereGeometry(0.135, 18, 14), bodyMat);
    torso.scale.set(0.95, 1.02, 1.35);
    torso.position.set(0, 0.02, -0.01);
    g.add(torso);
    const belly = new T.Mesh(new T.SphereGeometry(0.105, 14, 10), accMat);
    belly.scale.set(0.85, 0.85, 1.15);
    belly.position.set(0, -0.015, 0.04);
    g.add(belly);
    const head = new T.Mesh(new T.SphereGeometry(0.105, 16, 12), bodyMat);
    head.scale.set(0.96, 0.92, 1.12);
    head.position.set(0, 0.135, 0.145);
    g.add(head);
    const nose = new T.Mesh(new T.SphereGeometry(0.018, 8, 6), darkMat);
    nose.position.set(0, 0.13, 0.26);
    g.add(nose);
    addEyes(T, g, 0.058, 0.158, 0.222, 0.020, darkMat, glintMat);
    for (const side of [-1, 1]) {
      const ear = new T.Mesh(new T.ConeGeometry(0.032, 0.075, 8), bodyMat);
      ear.position.set(side * 0.062, 0.225, 0.12);
      ear.rotation.z = -side * 0.22;
      g.add(ear);
      const paw = new T.Mesh(new T.SphereGeometry(0.030, 8, 6), bodyMat);
      paw.position.set(side * 0.065, -0.085, 0.12);
      g.add(paw);
    }
    // Lush multi-segment S-curved bushy tail
    const tailPts: [number, number, number, number][] = [
      [0, 0.05, -0.18, 0.072],
      [0, 0.14, -0.25, 0.095],
      [0, 0.26, -0.24, 0.108],
      [0, 0.34, -0.16, 0.092],
    ];
    for (let i = 0; i < tailPts.length; i++) {
      const [tx, ty, tz, tr] = tailPts[i];
      const puff = new T.Mesh(new T.SphereGeometry(tr, 14, 10), i === 3 ? accMat : bodyMat);
      puff.scale.set(0.88, 1.05, 1.15);
      puff.position.set(tx, ty, tz);
      g.add(puff);
    }
  } else if (kind.id === 'critter-hedgehog') {
    const faceMat = accMat;
    const quillMat = z.toon(0x5b4432);
    const tipMat = z.toon(0x8d7258);
    const torso = new T.Mesh(new T.SphereGeometry(0.155, 18, 14), quillMat);
    torso.scale.set(1.05, 0.84, 1.25);
    torso.position.set(0, 0.02, -0.02);
    g.add(torso);
    // Warm cream face & cute dark button nose
    const face = new T.Mesh(new T.ConeGeometry(0.10, 0.18, 14), faceMat);
    face.rotation.x = Math.PI / 2;
    face.position.set(0, -0.005, 0.155);
    g.add(face);
    const nose = new T.Mesh(new T.SphereGeometry(0.022, 8, 6), darkMat);
    nose.position.set(0, -0.002, 0.246);
    g.add(nose);
    addEyes(T, g, 0.052, 0.032, 0.168, 0.017, darkMat, glintMat);
    for (const side of [-1, 1]) {
      const ear = new T.Mesh(new T.SphereGeometry(0.028, 10, 8), faceMat);
      ear.scale.set(0.85, 1.0, 0.45);
      ear.position.set(side * 0.075, 0.078, 0.115);
      g.add(ear);
    }
    // Layered dorsal quills
    const qGeo = new T.ConeGeometry(0.022, 0.095, 6);
    for (let ring = 0; ring < 4; ring++) {
      const zPos = 0.06 - ring * 0.078;
      const count = ring === 0 || ring === 3 ? 5 : 7;
      for (let i = 0; i < count; i++) {
        const a = ((i / (count - 1)) - 0.5) * 2.1;
        const q = new T.Mesh(qGeo, (i + ring) % 2 ? quillMat : tipMat);
        q.position.set(Math.sin(a) * 0.135, Math.cos(a) * 0.115 + 0.03, zPos);
        q.rotation.set(-0.68, 0, -a * 0.85);
        g.add(q);
      }
    }
  } else if (kind.id === 'critter-beetle') {
    const carapaceMat = new T.MeshStandardMaterial({color: 0x244672, roughness: 0.20, metalness: 0.55});
    const shieldMat = new T.MeshStandardMaterial({color: 0x1a3052, roughness: 0.24, metalness: 0.5});
    const elytra = new T.Mesh(new T.SphereGeometry(0.115, 20, 14), carapaceMat);
    elytra.scale.set(0.96, 0.72, 1.28);
    elytra.position.set(0, 0.01, -0.025);
    g.add(elytra);
    const pronotum = new T.Mesh(new T.SphereGeometry(0.088, 16, 12), shieldMat);
    pronotum.scale.set(0.95, 0.76, 0.88);
    pronotum.position.set(0, 0.015, 0.085);
    g.add(pronotum);
    // Curved iconic rhinoceros beetle horn + fork tip
    const horn = new T.Mesh(new T.CylinderGeometry(0.010, 0.019, 0.12, 8), shieldMat);
    horn.position.set(0, 0.068, 0.175);
    horn.rotation.x = 0.72;
    g.add(horn);
    for (const side of [-1, 1]) {
      const prong = new T.Mesh(new T.ConeGeometry(0.009, 0.036, 6), shieldMat);
      prong.position.set(side * 0.014, 0.118, 0.218);
      prong.rotation.set(0.4, 0, -side * 0.55);
      g.add(prong);
      for (let li = 0; li < 3; li++) {
        const leg = new T.Mesh(new T.CylinderGeometry(0.007, 0.005, 0.085, 5), darkMat);
        leg.position.set(side * 0.105, -0.032, 0.06 - li * 0.06);
        leg.rotation.z = side * 0.85;
        g.add(leg);
      }
    }
    addEyes(T, g, 0.044, 0.022, 0.138, 0.013, darkMat, glintMat);
  } else if (kind.id === 'critter-firefly') {
    const thorax = new T.Mesh(new T.SphereGeometry(0.036, 14, 10), bodyMat);
    thorax.scale.set(0.95, 0.85, 1.3);
    thorax.position.set(0, 0.005, 0.03);
    g.add(thorax);
    const head = new T.Mesh(new T.SphereGeometry(0.026, 12, 8), darkMat);
    head.position.set(0, 0.008, 0.072);
    g.add(head);
    addAntennae(T, g, 0.018, 0.085, 0.055, 0.35, darkMat, false);
    // HDR glowing lantern abdomen
    const lanternMat = new T.MeshStandardMaterial({
      color: 0xfff8b5,
      emissive: 0xffd24a,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const lantern = new T.Mesh(new T.SphereGeometry(0.044, 14, 10), lanternMat);
    lantern.scale.set(0.92, 0.85, 1.38);
    lantern.position.set(0, -0.002, -0.042);
    lantern.userData.lantern = true;
    g.add(lantern);
    // Translucent miniature wings
    const fwMat = new T.MeshStandardMaterial({
      color: 0xf7f0c8,
      transparent: true,
      opacity: 0.58,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const fwGeo = makeDragonflyWingGeo(T, 0.13, 0.044);
    for (const side of [-1, 1]) {
      const piv = new T.Group();
      piv.position.set(side * 0.024, 0.022, 0.025);
      const w = new T.Mesh(fwGeo, fwMat);
      if (side < 0) w.scale.x = -1;
      piv.add(w);
      piv.userData.wing = side;
      piv.userData.wingAmp = 0.85;
      piv.userData.wingFreq = 30;
      g.add(piv);
    }
  } else {
    // Owl: plump feathered body, pale speckled breast, heart-shaped facial disc, golden eyes, ear tufts, folded wings
    const wingMat = z.toon(0x6e553b);
    const beakMat = z.toon(0xe8a432);
    const goldIris = z.toon(0xf5c842);
    const torso = new T.Mesh(new T.SphereGeometry(0.19, 20, 14), bodyMat);
    torso.scale.set(1.02, 1.32, 0.96);
    torso.position.set(0, 0.02, 0);
    g.add(torso);
    const breast = new T.Mesh(new T.SphereGeometry(0.155, 16, 12), accMat);
    breast.scale.set(0.92, 1.05, 0.72);
    breast.position.set(0, -0.01, 0.088);
    g.add(breast);
    const head = new T.Mesh(new T.SphereGeometry(0.145, 18, 14), bodyMat);
    head.scale.set(1.08, 0.92, 0.96);
    head.position.set(0, 0.255, 0.02);
    g.add(head);
    // Heart-shaped cream facial discs
    for (const side of [-1, 1]) {
      const disc = new T.Mesh(new T.SphereGeometry(0.068, 12, 10), accMat);
      disc.scale.set(1.0, 1.02, 0.42);
      disc.position.set(side * 0.058, 0.265, 0.135);
      g.add(disc);
      // Ear tufts
      const tuft = new T.Mesh(new T.ConeGeometry(0.038, 0.105, 7), wingMat);
      tuft.position.set(side * 0.108, 0.365, 0.01);
      tuft.rotation.z = -side * 0.32;
      g.add(tuft);
      // Folded layered wing on sides
      const wing = new T.Mesh(new T.SphereGeometry(0.14, 14, 10), wingMat);
      wing.scale.set(0.42, 1.22, 0.85);
      wing.position.set(side * 0.175, 0.01, -0.015);
      wing.rotation.z = side * 0.12;
      wing.userData.wing = side;
      wing.userData.wingAmp = 0.55;
      wing.userData.wingFreq = 12;
      g.add(wing);
    }
    addEyes(T, g, 0.058, 0.270, 0.160, 0.022, darkMat, glintMat, goldIris);
    const beak = new T.Mesh(new T.ConeGeometry(0.028, 0.072, 7), beakMat);
    beak.rotation.x = Math.PI * 0.62;
    beak.position.set(0, 0.232, 0.175);
    g.add(beak);
    const tail = new T.Mesh(new T.ConeGeometry(0.085, 0.18, 8), wingMat);
    tail.rotation.x = -Math.PI * 0.72;
    tail.position.set(0, -0.15, -0.14);
    g.add(tail);
  }

  g.traverse((m: any) => { if (m.isMesh && !m.material?.transparent) m.castShadow = true; });
  return g;
}

/** Spawn the zone's critters around `homes`, run them every frame, catch on touch. */
export function critterField(z: ZoneContext, root: any, zone: 'forest' | 'farm' | 'lake' | 'park', homes: [number, number][]) {
  const {T, life} = z, kinds = CRITTER_KINDS.filter(k => k.zone === zone); if (!kinds.length) return () => {};
  const group = new T.Group(); group.name = 'critters-fx'; root.add(group);
  const items = homes.map((h, i) => {
    const kind = kinds[i % kinds.length], c = spawnCritter(kind, h);
    const g = buildCritterMesh(z, kind);
    // Upgrade frogs & dragonflies asynchronously with SimPond's high-detail GLB models + skeletal/wing rigs
    let simpond: SimPondActorHandle | null = null;
    if (kind.id === 'critter-frog' || kind.id === 'critter-dragonfly') {
      const spId = kind.id === 'critter-frog' ? 'common-frog' : (i % 2 === 0 ? 'dragonfly-emperor' : 'dragonfly-darter');
      const fallbackChildren = [...g.children];
      simpond = spawnSimPondActor(spId, {
        scale: kind.id === 'critter-frog' ? 0.95 : 1.05,
        layer: 1,
        groundOnFeet: kind.id === 'critter-frog',
        castShadow: kind.id === 'critter-frog',
        onReady: () => {
          for (const ch of fallbackChildren) ch.visible = false;
        },
      });
      g.add(simpond.group);
    }
    group.add(g);
    return {c, g, simpond, phase: Math.random() * 6};
  });
  return (t: number, dt: number, p: PlayerHandle) => {
    const hour = new Date().getHours(), speed = Math.hypot(p.velocity[0], p.velocity[2]);
    for (const it of items) {
      const {c, g, simpond} = it, live = awake(c.kind, hour); g.visible = live && c.mood !== 'caught'; if (!live) continue;
      const near = Math.hypot(c.pos[0] - p.position[0], c.pos[1] - p.position[2]) < 40; if (!near && c.mood !== 'caught') continue;
      const before = [...c.pos];
      if (stepCritter(c, {pos: [p.position[0], p.position[2]], speed, spread: p.spread}, dt, Math.random) === 'caught') {
        const first = logCatch(life, c.kind.id); z.save(); const item = ITEMS[c.kind.id];
        p.toast(`${item.icon} 捉到${item.name}！${first ? '图鉴新增 · ' : ''}轻轻放走了`, 2600); p.mood('Happy', 1.2);
      }
      const y = z.ground(c.pos[0], c.pos[1]), moveDist = Math.hypot(c.pos[0] - before[0], c.pos[1] - before[1]), moving = moveDist > 0.004;
      const hop = c.kind.hop && moving ? Math.abs(Math.sin((t + it.phase) * 9)) * c.kind.hop : 0;
      const fly = c.kind.fly ? c.kind.fly + Math.sin((t + it.phase) * 2.4) * .25 : 0;
      const yBase = simpond?.ready && c.kind.id === 'critter-frog' ? 0 : LOOK[c.kind.id][2][1];
      g.position.set(c.pos[0], y + yBase + hop + fly, c.pos[1]);
      if (moving) {
        const targetYaw = Math.atan2(c.dir[0], c.dir[1]);
        let diff = targetYaw - g.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        g.rotation.y += diff * Math.min(1, dt * 8);
      }
      // Subtle walking waddle for ground bugs/animals (never shake rigged frogs while idling)
      g.rotation.z = !c.kind.fly && moving && !simpond?.ready ? Math.sin((t + it.phase) * 14) * 0.06 : 0;
      const targetScale = c.mood === 'alert' && !simpond?.ready ? 1.12 : 1;
      g.scale.setScalar(targetScale);
      if (simpond) {
        if (c.kind.id === 'critter-frog') {
          const clip = moving || c.mood === 'flee' ? 'hop' : c.mood === 'alert' ? 'croak' : 'sit';
          simpond.setAnim(clip, 0.16, c.mood === 'flee' ? 1.5 : 1.0);
          simpond.update(dt);
        } else {
          simpond.update(dt, c.mood === 'flee' ? 52 : 36, c.mood === 'flee' ? 0.82 : 0.60);
        }
      }
      for (const w of g.children) {
        if (w.userData.wing) {
          const freq = w.userData.wingFreq ?? 24;
          const amp = w.userData.wingAmp ?? 0.9;
          const ph = w.userData.wingPhase ?? 0;
          w.rotation.z = w.userData.wing * (Math.sin((t + it.phase) * freq + ph) * amp + 0.12);
        } else if (w.userData.lantern && w.material) {
          w.material.emissiveIntensity = 1.6 + 1.1 * (0.5 + 0.5 * Math.sin((t + it.phase) * 4.2));
        }
      }
    }
  };
}
export type {Critter};
