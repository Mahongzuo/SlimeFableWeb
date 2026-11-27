import {inland, pathDistance, TERRACE} from '../world/map';
import {fence, signpost, trees, tufts} from './kit';
import {climateMaterial} from '../home/climate-material';
import type {Box} from '../slime/types';
import type {ZoneBuilder, ZoneContext} from './types';
import {farmLoop, type PlotSpot} from './farm-loop';
import {critterField} from './critter-field';

/**
 * Builds an articulated 3-stalk wheat/rice clump geometry (curved stems + drooping narrow leaves + golden grain ears).
 * UV.y encodes height fraction (0 = rooted in soil, 1 = heavy grain tip) for GPU wind waves & slime parting interaction.
 */
function buildInteractiveWheatGeometry(T: any) {
  const pos: number[] = [];
  const norm: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];

  const pushTri = (
    a: [number, number, number], b: [number, number, number], c: [number, number, number],
    ua: number, ub: number, uc: number,
    ca: [number, number, number], cb: [number, number, number], cc: [number, number, number],
  ) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    // Blend geometric face normal softly upward so wheat stays luminous and never turns black on backfaces
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx = nx / l * 0.45; ny = ny / l * 0.45 + 0.85; nz = nz / l * 0.45;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    for (const [p, v, cl] of [[a, ua, ca], [b, ub, cb], [c, uc, cc]] as const) {
      pos.push(p[0], p[1], p[2]);
      norm.push(nx, ny, nz);
      uv.push(0.5, v);
      col.push(cl[0], cl[1], cl[2]);
    }
  };

  const cRoot: [number, number, number] = [0.34, 0.48, 0.22];
  const cMid: [number, number, number] = [0.56, 0.66, 0.30];
  const cLeaf: [number, number, number] = [0.46, 0.62, 0.26];
  const cEarBase: [number, number, number] = [0.80, 0.68, 0.28];
  const cEarTip: [number, number, number] = [0.96, 0.82, 0.36];

  const stalks = [
    {ox: -0.10, oz: -0.05, ang: 2.4, h: 0.66, lean: 0.14},
    {ox: 0.00, oz: 0.06, ang: 0.6, h: 0.76, lean: 0.16},
    {ox: 0.10, oz: -0.04, ang: -1.1, h: 0.69, lean: 0.15},
  ];

  for (const st of stalks) {
    const dx = Math.cos(st.ang), dz = Math.sin(st.ang);
    const px = -dz, pz = dx;
    const w0 = 0.022;
    // 3-segment curved stalk (cross-fin quads so visible from every azimuth)
    const rings = [0, 0.32, 0.64, 0.84].map(t => {
      const l = st.lean * t * t;
      return {x: st.ox + dx * l, y: st.h * t, z: st.oz + dz * l, w: w0 * (1 - t * 0.35), t};
    });
    for (let i = 0; i < rings.length - 1; i++) {
      const r0 = rings[i], r1 = rings[i + 1];
      const ca: [number, number, number] = i === 0 ? cRoot : cMid;
      const cb: [number, number, number] = i === 2 ? cEarBase : cMid;
      for (const [ax, az] of [[px, pz], [dx, dz]] as const) {
        const a0: [number, number, number] = [r0.x - ax * r0.w, r0.y, r0.z - az * r0.w];
        const b0: [number, number, number] = [r0.x + ax * r0.w, r0.y, r0.z + az * r0.w];
        const a1: [number, number, number] = [r1.x - ax * r1.w, r1.y, r1.z - az * r1.w];
        const b1: [number, number, number] = [r1.x + ax * r1.w, r1.y, r1.z + az * r1.w];
        pushTri(a0, b0, b1, r0.t, r0.t, r1.t, ca, ca, cb);
        pushTri(a0, b1, a1, r0.t, r1.t, r1.t, ca, cb, cb);
      }
    }

    // 2 graceful arching wheat leaves sprouting mid-stalk
    for (const side of [-1, 1]) {
      const base = rings[1];
      const lx = dx * 0.4 + px * side * 0.9, lz = dz * 0.4 + pz * side * 0.9;
      const ll = Math.hypot(lx, lz) || 1;
      const nx = lx / ll, nz = lz / ll, tx = -nz, tz = nx;
      const lBaseL: [number, number, number] = [base.x - tx * 0.018, base.y, base.z - tz * 0.018];
      const lBaseR: [number, number, number] = [base.x + tx * 0.018, base.y, base.z + tz * 0.018];
      const lMidL: [number, number, number] = [base.x + nx * 0.11 - tx * 0.014, base.y + 0.08, base.z + nz * 0.11 - tz * 0.014];
      const lMidR: [number, number, number] = [base.x + nx * 0.11 + tx * 0.014, base.y + 0.08, base.z + nz * 0.11 + tz * 0.014];
      const lTip: [number, number, number] = [base.x + nx * 0.22, base.y + 0.03, base.z + nz * 0.22];
      pushTri(lBaseL, lBaseR, lMidR, 0.32, 0.32, 0.52, cRoot, cRoot, cLeaf);
      pushTri(lBaseL, lMidR, lMidL, 0.32, 0.52, 0.52, cRoot, cLeaf, cLeaf);
      pushTri(lMidL, lMidR, lTip, 0.52, 0.52, 0.62, cLeaf, cLeaf, cMid);
    }

    // Plump drooping golden wheat ear (6-sided bipyramid cluster at top of stalk)
    const neck = rings[3];
    const earMidX = neck.x + dx * 0.075, earMidY = neck.y + 0.095, earMidZ = neck.z + dz * 0.075;
    const earTipX = neck.x + dx * 0.155, earTipY = neck.y + 0.135, earTipZ = neck.z + dz * 0.155;
    const earR = 0.044;
    const sides = 6;
    const midPts: [number, number, number][] = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      const ca = Math.cos(a) * earR, sa = Math.sin(a) * earR;
      midPts.push([earMidX + px * ca + dx * sa * 0.45, earMidY + sa * 0.55, earMidZ + pz * ca + dz * sa * 0.45]);
    }
    const basePt: [number, number, number] = [neck.x, neck.y, neck.z];
    const tipPt: [number, number, number] = [earTipX, earTipY, earTipZ];
    for (let k = 0; k < sides; k++) {
      const p0 = midPts[k], p1 = midPts[(k + 1) % sides];
      pushTri(basePt, p0, p1, 0.84, 0.94, 0.94, cEarBase, cEarTip, cEarTip);
      pushTri(p0, tipPt, p1, 0.94, 1.0, 0.94, cEarTip, cEarTip, cEarTip);
    }
  }

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(norm, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  return geo;
}

function buildInteractiveWheatField(z: ZoneContext) {
  const {T} = z;
  const U = z.ctx.U;
  const spots: [number, number, number, number, number][] = [];
  for (const [cx, cz] of [[-46, -13], [-57, -15], [-68, -16], [-79, -19]]) {
    for (let row = 0; row < 8; row++) {
      for (let hill = 0; hill < 15; hill++) {
        const x = cx + (row - 3.5) * .74 + .13 * Math.sin(hill * .34);
        const zz = cz + (hill - 7) * .54;
        const y = inland(x, zz);
        const yaw = Math.sin(row * 1.7 + hill * 2.3) * Math.PI;
        const scale = 0.92 + 0.18 * Math.sin(hill * 0.9 + row * 1.3);
        spots.push([x, y, zz, yaw, scale]);
      }
    }
  }

  const geo = buildInteractiveWheatGeometry(T);
  const mat = new T.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.80,
    metalness: 0.0,
    side: T.DoubleSide,
  });

  mat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uTime = U.uTime;
    shader.uniforms.uWind = U.uWind ?? {value: 0.5};
    shader.uniforms.uSlimePos = U.uSlimePos ?? {value: new T.Vector4(0, -99, 0, 0.6)};
    shader.uniforms.uSunDir = U.uSunDir ?? {value: new T.Vector3(0.4, 0.7, 0.5)};
    shader.uniforms.uSunColor = U.uSunColor ?? {value: new T.Color(0xfff1d5)};

    shader.vertexShader =
      `uniform float uTime, uWind;
       uniform vec4 uSlimePos;
       varying float vWheatTip;
       varying float vWheatWave;
       varying vec3 vWheatWorld;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWheatTip = uv.y;
        #ifdef USE_INSTANCING
          vec3 instPos = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 instPos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        float bend = vWheatTip * vWheatTip;
        float wCoord = dot(instPos.xz, vec2(0.16, 0.11)) - uTime * (1.45 + uWind * 1.2);
        float wave = sin(wCoord) * 0.5 + 0.5;
        vWheatWave = smoothstep(0.35, 0.92, wave);
        float sway = (wave - 0.35) * (0.14 + 0.24 * uWind) * bend;
        transformed.x += sway * 0.85;
        transformed.z += sway * 0.48;
        transformed.y -= abs(sway) * 0.22;

        // Real-time parting & bowing around the slime (zero clipping through slime body!)
        vec2 toStalk = instPos.xz - uSlimePos.xz;
        float dSlime = length(toStalk);
        float pushRad = uSlimePos.w + 0.82;
        if (dSlime < pushRad && abs(instPos.y - uSlimePos.y) < 1.6) {
          float push = 1.0 - dSlime / pushRad;
          float push2 = push * push;
          vec2 pushDir = dSlime > 0.01 ? toStalk / dSlime : vec2(1.0, 0.0);
          // Transform world push direction into instance-local XZ so rotated clumps part outward accurately
          #ifdef USE_INSTANCING
            vec2 localPush = vec2(
              dot(pushDir, normalize(instanceMatrix[0].xz)),
              dot(pushDir, normalize(instanceMatrix[2].xz))
            );
          #else
            vec2 localPush = pushDir;
          #endif
          transformed.xz += localPush * push2 * 0.82 * vWheatTip;
          transformed.y *= 1.0 - push2 * 0.62 * vWheatTip;
        }
        #ifdef USE_INSTANCING
          vWheatWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vWheatWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`,
      );

    shader.fragmentShader =
      `uniform vec3 uSunDir, uSunColor;
       varying float vWheatTip;
       varying float vWheatWave;
       varying vec3 vWheatWorld;\n` +
      shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        vec3 wV = normalize(cameraPosition - vWheatWorld);
        vec3 wL = normalize(uSunDir);
        float sunUp = smoothstep(-0.04, 0.12, wL.y);
        float back = pow(max(dot(wV, -wL), 0.0), 2.2);
        vec3 goldGlow = vec3(1.0, 0.84, 0.34);
        reflectedLight.directDiffuse += goldGlow * (back * 0.42 + vWheatWave * 0.28) * smoothstep(0.45, 1.0, vWheatTip) * uSunColor * sunUp;`,
      );
  };
  mat.customProgramCacheKey = () => 'interactive-wheat-field-v1';
  climateMaterial(mat, 'terrain');

  const mesh = new T.InstancedMesh(geo, mat, spots.length);
  mesh.name = 'rice-wheat-field-fx';
  mesh.userData.walkThrough = true;
  mesh.userData.skipHeightBake = true;
  const dummy = new T.Object3D(), tint = new T.Color();
  spots.forEach(([x, y, zz, yaw, sc], i) => {
    dummy.position.set(x, y - 0.02, zz);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tint.setHSL(0.11 + (i % 7) * 0.004, 0.18, 0.94 + (i % 5) * 0.02));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.layers.set(1);
  return mesh;
}

/** farm zone (starter content; see tasks/cards). */
export const farm: ZoneBuilder = z => {
  const {T} = z, root = new T.Group(), zoneBoxes: Box[] = [];
  // Repeated solid details share a draw call; all dimensions are in metres.
  type Block = {position: number[]; size: number[]; color: number; rz: number; rx: number; ry: number};
  const batches = new Map<string, Block[]>();
  const block = (name: string, color: number, x: number, y: number, zz: number, w: number, h: number, d: number, rz = 0, rx = 0, ry = 0) => {
    if (!batches.has(name)) batches.set(name, []);
    batches.get(name)!.push({position: [x, y, zz], size: [w, h, d], color, rz, rx, ry});
  };
  const P = z.ctx.P, wood = P.wood, trim = P.sand, straw = P.safetyYellow;
  const clay = 0xb99471, tile = P.tileRoofDark;
  // Curved details share geometry batches too; decorative tools never obstruct paths.
  const curved = new Map<string, {geometry: any; parts: Block[]}>();
  const round = (kind: 'ring' | 'cone' | 'round', color: number, x: number, y: number, zz: number,
    w: number, h: number, d: number, rx = 0, rz = 0, solid = false, ry = 0) => {
    const key = kind + (solid ? '-solid' : '-fx');
    if (!curved.has(key)) curved.set(key, {geometry: kind === 'ring' ? new T.TorusGeometry(1, .06, 5, 16) :
      kind === 'cone' ? new T.ConeGeometry(1, 1, 16) : new T.IcosahedronGeometry(1, 1), parts: []});
    curved.get(key)!.parts.push({position: [x, y, zz], size: [w, h, d], color, rx, rz, ry});
  };
  const basket = (x: number, y: number, zz: number, radius = .32, height = .5) => {
    for (let row = 0; row < 5; row++) round('ring', wood, x, y + .04 + row * height / 4, zz,
      radius * (.8 + row * .05), radius * (.8 + row * .05), .6, Math.PI / 2);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      block('basket-weave-fx', wood, x + Math.cos(a) * radius * .9, y + height / 2, zz + Math.sin(a) * radius * .9, .025, height, .025);
    }
  };
  // Preserve the original wall envelope and the exact path openings.
  for (let k = 0; k < TERRACE.count; k++) {
    const x = TERRACE.first - k * TERRACE.width, lo = k * TERRACE.rise, hi = (k + 1) * TERRACE.rise;
    let gz = 0, best = Infinity; for (let zz = -30; zz <= 30; zz += .25) { const d = pathDistance(x + .5, zz); if (d < best) { best = d; gz = zz; } }
    for (const [z0, z1] of [[-30.5, gz - 2.2], [gz + 2.2, 30]] as const) {
      const bottom = lo - .2, top = hi + .12;
      let y = bottom;
      for (let row = 0; row < 4; row++) {
        const h = row === 3 ? top - y : (top - bottom) * (.22 + z.rand() * .06);
        let zz = z0;
        while (zz < z1) {
          const length = Math.min(z1 - zz, .65 + z.rand() * .7);
          const depth = zz === z0 ? 1 : .88 + z.rand() * .12;
          block('terrace-wall', [0xb9ad97, 0xa89c89, 0xc7baa3, 0xb1a48f][Math.floor(z.rand() * 4)],
            x + depth / 2, y + h / 2, zz + length / 2, depth, h, length);
          zz += length;
        }
        y += h;
      }
    }
    // Follow the lowered path terrain, rather than the taller wall cap.
    // Five full-depth steps bridge the actual terrain discontinuity.
    const low = inland(x + 2.5, gz), high = inland(x - .05, gz);
    for (let step = 0; step < 5; step++) {
      const top = low + (high - low) * (step + 1) / 5;
      block('terrace-stairs', 0xc4b8a1, x + 2.25 - step * .5, (low - .15 + top) / 2, gz,
        .5, top - low + .15, 4.4);
    }
  }
  root.add(signpost(z, -33, 8, -Math.PI / 2, '梯田农场', '播种 · 浇水 · 收获'));
  const soil = z.toon(0x8b6b4a), plots: PlotSpot[] = [];
  for (let k = 1; k <= 3; k++) for (let r = 0; r < 3; r++) {
    const x = TERRACE.first - (k - .5) * TERRACE.width, zz = 8 + r * 6, plot = new T.Mesh(new T.BoxGeometry(7, .16, 4), soil); plot.name = 'farm-plot';
    const y = inland(x, zz) + .02; plot.position.set(x, y, zz); plot.receiveShadow = true; root.add(plot); plots.push({id: `farm-${k}-${r}`, x, z: zz, y: y + .08});
  }
  // Standing wheat/rice fields are built as live interactive InstancedMesh below (post-consolidate) so they sway & part around the slime!
  // Low bed frames leave the original crop coordinates and heights intact.
  for (const p of plots) {
    for (const side of [-1, 1]) {
      block('plot-frame', wood, p.x, p.y + .075, p.z + side * 2.1, 7.4, .15, .2);
      block('plot-frame', wood, p.x + side * 3.6, p.y + .075, p.z, .2, .15, 4);
    }
  }
  // Short fence runs behind the beds; the paths and harvesting sides stay open.
  for (let k = 1; k <= TERRACE.count; k++) {
    const x = TERRACE.first - (k - .5) * TERRACE.width;
    root.add(fence(z, [[x - 4, 25], [x + 4, 25]], trim, .55));
    const zz = 23, y = inland(x, zz);
    block('scarecrow-timber', wood, x, y + 1, zz, .12, 2, .12);
    block('scarecrow-shirt', k % 2 ? 0xbd7155 : 0x729c92, x, y + 1.35, zz, .55, .65, .3);
    block('scarecrow-shirt', 0xbd7155, x, y + 1.55, zz, 1.5, .18, .2, -.08);
    block('scarecrow-head', straw, x, y + 1.92, zz, .38, .38, .35);
    round('cone', wood, x, y + 2.22, zz, .53, .32, .53);
    round('ring', straw, x, y + 2.08, zz, .5, .5, .45, Math.PI / 2);
    for (const dx of [-.09, .09]) block('scarecrow-eyes', 0x40362e, x + dx, y + 1.96, zz + .181, .045, .045, .02);
  }
  // Rammed-earth courses, granite footings, timber lattice and a thick blue-tile roof.
  const bx = -77, bz = 15, by = inland(bx, bz);
  zoneBoxes.push(
    {name: 'farm-barn-wl', min: [bx - 2.86, by, bz - 3.15], max: [bx - 2.54, by + 3.05, bz + 3.15], camera: true},
    {name: 'farm-barn-wr', min: [bx + 2.54, by, bz - 3.15], max: [bx + 2.86, by + 3.05, bz + 3.15], camera: true},
    {name: 'farm-barn-wb', min: [bx - 2.85, by, bz - 3.16], max: [bx + 2.85, by + 3.05, bz - 2.84], camera: true},
    {name: 'farm-barn-wfl', min: [bx - 2.85, by, bz + 2.84], max: [bx - 1.12, by + 3.05, bz + 3.16], camera: true},
    {name: 'farm-barn-wfr', min: [bx + 1.12, by, bz + 2.84], max: [bx + 2.85, by + 3.05, bz + 3.16], camera: true},
    {name: 'farm-barn-lintel', min: [bx - 1.15, by + 2.70, bz + 2.84], max: [bx + 1.15, by + 3.05, bz + 3.16], camera: true},
    // Lightweight 2-tier gable roof matching actual eave-to-ridge slope (prevents hovering over eaves)
    {name: 'farm-barn-roof-eave', min: [bx - 3.15, by + 3.02, bz - 3.60], max: [bx + 3.15, by + 3.70, bz + 3.60], camera: true},
    {name: 'farm-barn-roof-ridge', min: [bx - 1.55, by + 3.68, bz - 3.60], max: [bx + 1.55, by + 4.46, bz + 3.60], camera: true},
  );
  for (let row = 0; row < 10; row++) {
    const y = by + .15 + row * .3, color = row < 2 ? P.gravel : clay;
    for (let i = 0; i < 12; i++) for (const side of [-1, 1])
      block('barn-wall', color, bx + side * 2.7, y, bz - 2.75 + i * .5, .3, .3, .49);
    for (let i = 0; i < 11; i++) {
      const dx = -2.5 + i * .5;
      block('barn-wall', color, bx + dx, y, bz - 3, .49, .3, .3);
      if (Math.abs(dx) > 1.1 || row === 9) block('barn-wall', color, bx + dx, y, bz + 3, .49, .3, .3);
    }
  }
  for (const side of [-1, 1]) {
    block('barn-trim', wood, bx + side * 1.1, by + 1.4, bz + 3.13, .18, 2.8, .2);
    for (const dz of [-3, 3]) block('barn-trim', wood, bx + side * 2.72, by + 1.5, bz + dz, .2, 3, .2);
    const slope = -side * Math.atan2(1.4, 2.9);
    block('barn-roof', tile, bx + side * 1.45, by + 3.7, bz, 3.45, .2, 7, slope);
    // Individual overlapping tile courses and raised eaves read at middle distance.
    for (let r = 0; r < 8; r++) for (let c = 0; c < 23; c++) {
      const dx = .2 + r * .4;
      block('roof-tiles', tile, bx + side * dx, by + 4.47 - dx * 1.4 / 2.9, bz - 3.3 + c * .3,
        .47, .08, .24, slope);
    }
    block('barn-eave', tile, bx + side * 3.05, by + 3.08, bz, .22, .22, 7.2);
    block('barn-door', wood, bx + side * 1.28, by + 1.3, bz + 3.65, .16, 2.6, 1.3);
    // Wooden windows are on the front, clear of the doorway.
    block('window-inset', 0x403e38, bx + side * 1.95, by + 1.85, bz + 3.17, 1, .9, .05);
    for (let i = 0; i < 5; i++) block('window-lattice', wood, bx + side * 1.95 - .5 + i * .25, by + 1.85, bz + 3.22, .045, .98, .05);
    for (const dy of [-.48, 0, .48]) block('window-lattice', wood, bx + side * 1.95, by + 1.85 + dy, bz + 3.22, 1.1, .06, .06);
  }
  block('barn-ridge', tile, bx, by + 4.5, bz, .3, .23, 7.3);
  block('barn-trim', wood, bx, by + 2.85, bz + 3.12, 2.3, .18, .2);
  const shape = new T.Shape(); shape.moveTo(-2.7, 0); shape.lineTo(2.7, 0); shape.lineTo(0, 1.3); shape.closePath();
  for (const dz of [-3, 2.85]) {
    const gable = new T.Mesh(new T.ExtrudeGeometry(shape, {depth: .15, bevelEnabled: false}), z.toon(clay));
    gable.name = 'barn-gable'; gable.position.set(bx, by + 3, bz + dz); root.add(gable);
  }
  // Paved drying yard leaves the central entrance open.
  for (let ix = 0; ix < 9; ix++) for (let iz = 0; iz < 6; iz++) {
    const x = bx - 3.2 + ix * .8, zz = bz + 4.3 + iz * .7;
    block('drying-yard', P.concrete, x, inland(x, zz) + .075, zz, .77, .15, .67);
  }
  for (const dx of [-2.2, 2.1]) for (const dz of [5, 7]) {
    const x = bx + dx, zz = bz + dz, y = inland(x, zz) + .18;
    basket(x, y, zz, .67, .12);
    for (let i = -5; i <= 5; i++) block('tray-weave-fx', wood, x + i * .1, y + .035, zz, .035, .025, 1.05);
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4, r = .12 + .1 * (i % 4);
      round('round', straw, x + Math.cos(a) * r, y + .09, zz + Math.sin(a) * r, .07, .055, .18, 0, .1);
    }
  }
  for (const dx of [-2.45, 2.45]) {
    block('chili-cord-fx', wood, bx + dx, by + 2.12, bz + 3.32, .02, 1.1, .02);
    for (let i = 0; i < 9; i++) round('cone', 0xba4d39, bx + dx + (i % 2 ? .07 : -.07), by + 2.6 - i * .11, bz + 3.36,
      .055, .22, .055, Math.PI, i % 2 ? .3 : -.3);
  }
  for (let i = 0; i < 5; i++) {
    const x = bx - 1.6 + (i % 2) * 1.2, y = by + .35 + Math.floor(i / 2) * .65;
    block('barn-hay', straw, x, y, bz - 1.8, 1.1, .65, 1.2);
    block('barn-hay-binding', wood, x, y, bz - 1.8, .08, .67, 1.22);
  }
  for (let i = 0; i < 12; i++) {
    const height = (i + 1) * .25;
    block('barn-roof-stairs', wood, bx + 3.2, by + height / 2, bz + 3.2 - i * .45, .8, height, .45);
  }
  // Small wheelbarrow beside the barn.
  const cx = -80, cz = 21, cy = inland(cx, cz);
  block('cart-bed', wood, cx, cy + .5, cz, 1.1, .12, 1.4);
  for (const side of [-1, 1]) {
    block('cart-sides', wood, cx + side * .53, cy + .75, cz, .1, .5, 1.4);
    block('cart-handles', wood, cx + side * .4, cy + .5, cz + 1, .08, .08, 1.2);
    block('cart-legs', wood, cx + side * .4, cy + .22, cz + .45, .1, .45, .1);
  }
  block('cart-sides', wood, cx, cy + .75, cz - .65, 1.1, .5, .1);
  const wheel = new T.Mesh(new T.CylinderGeometry(.36, .36, .18, 12), z.toon(0x51483c));
  wheel.name = 'cart-wheel'; wheel.rotation.z = Math.PI / 2; wheel.position.set(cx, cy + .36, cz - .8); root.add(wheel);
  // Stone ring is solid; the inset water is explicitly excluded from baking.
  const wx = -58, wz = -12, wy = inland(wx, wz);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
    const angle = (i + row * .5) * Math.PI / 6;
    block('well-stone', P.gravel, wx + Math.sin(angle) * .95, wy + .15 + row * .3, wz + Math.cos(angle) * .95, .5, .3, .32, 0, 0, angle);
  }
  const water = new T.Mesh(new T.CircleGeometry(.78, 24), z.toon(0x629fa7));
  water.name = 'well-water'; water.rotation.x = -Math.PI / 2; water.position.set(wx, wy + .35, wz); root.add(water);
  for (const side of [-1, 1]) block('well-post', wood, wx + side * 1.2, wy + 1.2, wz, .15, 2.4, .15);
  block('well-beam', wood, wx, wy + 2.4, wz, 2.6, .18, .2);
  block('well-axle', wood, wx, wy + 1.7, wz, 2.8, .18, .18);
  for (let i = 0; i < 11; i++) round('ring', wood, wx - .3 + i * .06, wy + 1.7, wz, .2, .2, .6, 0, 0, false, Math.PI / 2);
  block('well-rope-fx', wood, wx, wy + 1.05, wz + .17, .025, 1.3, .025);
  block('well-crank', wood, wx + 1.48, wy + 1.5, wz, .15, .5, .15);
  block('well-grip', wood, wx + 1.65, wy + 1.25, wz, .35, .15, .15);
  basket(wx + 1.7, wy, wz + .6);
  for (const r of [.25, .48, .68]) round('ring', 0xaccfc6, wx, wy + .36, wz, r, r, .12, Math.PI / 2);
  // Copper weathercock swivels as one non-solid assembly.
  const vx = -79, vz = 10, vy = inland(vx, vz);
  block('weathervane-pole', wood, vx, vy + 2, vz, .12, 4, .12);
  const rooster = new T.Group(); rooster.name = 'weathercock-fx'; rooster.position.set(vx, vy + 4.15, vz); root.add(rooster);
  for (const [x, y, w, h, color] of [[0, 0, .65, .4, 0xc39347], [.32, .3, .25, .3, 0xc39347], [.36, .5, .22, .12, 0xb64c3c], [.53, .3, .22, .1, 0xe3b453], [-.42, .2, .35, .48, 0x6c8c79]]) {
    const part = new T.Mesh(new T.BoxGeometry(w, h, .12), z.toon(color)); part.name = 'rooster-fx'; part.position.set(x, y, 0); rooster.add(part);
  }
  const stall = {x: -35, z: -8};
  for (const dx of [0, 3]) {
    const x = stall.x + dx, y = inland(x, stall.z);
    zoneBoxes.push(
      {name: `farm-stall-counter-${dx}`, min: [x - 1.1, y, stall.z - .45], max: [x + 1.1, y + .98, stall.z + .45], camera: true},
      {name: `farm-stall-roof-${dx}`, min: [x - 1.35, y + 2.10, stall.z - .72], max: [x + 1.35, y + 2.42, stall.z + 1.12], camera: true},
    );
    block('stall-counter', wood, x, y + .9, stall.z, 2.2, .16, .9);
    for (const sx of [-.95, .95]) for (const dz of [-.35, .65]) block('stall-post', wood, x + sx, y + 1.1, stall.z + dz, .12, 2.2, .12);
    for (let i = 0; i < 8; i++) block('stall-front', wood, x - .96 + i * .275, y + .45, stall.z + .43, .24, .75, .08);
    for (let i = 0; i < 26; i++) block('stall-bamboo-roof', wood,
      x - 1.25 + i * .1, y + 2.3, stall.z + .2, .09, .16, 1.8, 0, -.2);
    for (const dz of [-.45, .8]) block('stall-bamboo-beam', wood, x, y + 2.16, stall.z + dz, 2.7, .16, .16);
    for (const sx of [-.95, .95]) {
      block('stall-brace', wood, x + sx * .8, y + 1.98, stall.z - .35, .1, .65, .1, sx * .65);
      block('stall-footing', P.gravel, x + sx, y + .1, stall.z + .65, .3, .2, .3);
    }
    const sign = signpost(z, x, stall.z, 0, dx ? '种子铺' : '收购站', dx ? '随机种子 · 5 贝壳／包' : '作物鲜鱼 · 按图鉴价');
    // Reuse the shared canvas sign, hanging just the board under the canopy.
    const board = sign.children[sign.children.length - 1]; sign.remove(board); board.position.set(x, y + 1.7, stall.z + .85); root.add(board);
    for (let i = 0; i < 3; i++) block('stall-goods', dx ? straw : 0x8d9e58, x - .65 + i * .65, y + 1.08, stall.z, .45, .22, .5);
  }
  // Tools along the bed ends; no decoration changes a plot or a trading position.
  for (const p of plots) {
    const x = p.x - 2.8, zz = p.z + 2.65, y = inland(x, zz);
    basket(x, y, zz);
    block('hoe-handle-fx', wood, x + .8, y + .62, zz, .045, 1.3, .045, -.3);
    block('hoe-blade-fx', tile, x + .99, y + .05, zz + .08, .24, .08, .33);
    round('round', wood, x + .4, y + .12, zz + .22, .17, .08, .22);
    block('ladle-handle-fx', wood, x + .4, y + .15, zz + .48, .05, .045, .4);
  }
  // Old banyan: a high, broad crown and buttress roots, framed by a distant tree line.
  const treeSpots: [number, number, number][] = [[-90, -14, 3.2]];
  for (let i = 0; i < 18; i++) treeSpots.push([-102 + i * 3.8, i % 2 ? -27 : 28, 1.1 + z.rand() * .5]);
  const grove = trees(z, treeSpots, [0x63885b, 0x70945f, 0x567d58]); root.add(grove);
  const ty = inland(-90, -14);
  for (let i = 0; i < 9; i++) {
    const a = i * Math.PI * 2 / 9;
    round('cone', wood, -90 + Math.cos(a) * .65, ty + .8, -14 + Math.sin(a) * .65, .4, 1.6, .4, 0, 0, true);
    block('banyan-root-fx', wood, -90 + Math.cos(a) * 2.2, ty + 4.8, -14 + Math.sin(a) * 2.2, .04, 3.3, .04);
  }
  for (const dx of [-1.4, 1.4]) block('tree-bench-foot', P.gravel, -90 + dx, ty + .3, -10.5, .4, .6, .6);
  block('tree-bench', P.gravel, -90, ty + .65, -10.5, 3.6, .2, .7);
  // Ground contact: scattered pebbles, leaf litter and bundled firewood across all terraces.
  for (let i = 0; i < 450; i++) {
    const x = -103 + z.rand() * 71, zz = -29 + z.rand() * 57;
    if (pathDistance(x, zz) < 2.4 || plots.some(p => Math.abs(x - p.x) < 4 && Math.abs(zz - p.z) < 2.5) ||
      (Math.abs(x - bx) < 4 && Math.abs(zz - bz) < 9)) continue;
    const y = inland(x, zz);
    round('round', i % 3 ? P.gravel : wood, x, y + .035, zz, .09 + z.rand() * .12, .04, .08 + z.rand() * .1);
    if (i % 12 === 0) {
      for (let k = 0; k < 4; k++) block('bundled-sticks-fx', wood, x + k * .07, y + .07, zz, .055, .08, .6, 0, .05);
      round('ring', trim, x + .1, y + .08, zz, .19, .1, .4);
    }
  }
  for (const [name, {geometry, parts}] of curved) {
    const mesh = new T.InstancedMesh(geometry, z.toon(0xffffff), parts.length), matrix = new T.Matrix4(), rotation = new T.Quaternion();
    mesh.name = name;
    parts.forEach((b, i) => {
      rotation.setFromEuler(new T.Euler(b.rx, b.ry, b.rz));
      matrix.compose(new T.Vector3(...b.position), rotation, new T.Vector3(...b.size));
      mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, new T.Color(b.color).multiplyScalar(.95 + z.rand() * .1));
    });
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
  }
  for (const [name, blocks] of batches) {
    const mesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), z.toon(0xffffff), blocks.length);
    mesh.name = name; mesh.castShadow = mesh.receiveShadow = true;
    const matrix = new T.Matrix4(), rotation = new T.Quaternion();
    blocks.forEach((b, i) => {
      rotation.setFromEuler(new T.Euler(b.rx, b.ry, b.rz));
      matrix.compose(new T.Vector3(...b.position), rotation, new T.Vector3(...b.size));
      mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, new T.Color(b.color).multiplyScalar(.95 + z.rand() * .1));
    });
    root.add(mesh);
  }
  root.add(fence(z, [[-31, -29], [-31, -6], ], 0xe9dfc9));
  // Bake static instance transforms once into two coloured meshes. Keep foliage instanced
  // for kit wind, and keep the weathercock local so its existing animation still works.
  // Three canvas signs share one in-memory atlas; no texture assets are needed.
  const atlas = document.createElement('canvas'); atlas.width = 1536; atlas.height = 256;
  const ink = atlas.getContext('2d')!, maps = new Map<any, number>();
  const atlasTexture = new T.CanvasTexture(atlas); atlasTexture.colorSpace = T.SRGBColorSpace;
  atlasTexture.anisotropy = 4;
  type Surface = {position: number[]; normal: number[]; color: number[]; uv: number[]};
  const consolidate = (parent: any, keepFoliage: boolean) => {
    const surfaces = new Map<string, Surface>(), remove: any[] = [], geometries = new Set<any>();
    const vertex = new T.Vector3(), normal = new T.Vector3(), matrix = new T.Matrix4(),
      instance = new T.Matrix4(), normalMatrix = new T.Matrix3(), tint = new T.Color(), base = new T.Color();
    parent.updateMatrixWorld(true);
    const inverse = parent.matrixWorld.clone().invert();
    parent.traverse((mesh: any) => {
      if (!mesh.isMesh || (keepFoliage && mesh.name.includes('foliage'))) return;
      // The rotating assembly is handled separately in its own coordinate space.
      if (parent === root && mesh.parent === rooster) return;
      const geometry = mesh.geometry, pos = geometry.attributes.position, normals = geometry.attributes.normal,
        uv = geometry.attributes.uv, index = geometry.index;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const groups = Array.isArray(mesh.material) ? geometry.groups : [{start: 0, count: index?.count ?? pos.count, materialIndex: 0}];
      let passable = false;
      for (let node = mesh; node; node = node.parent) {
        if (/leaf|foliage|grass|flower|crop|water|fx/.test(node.name) || node.userData.walkThrough) passable = true;
        if (node === parent) break;
      }
      for (let i = 0; i < (mesh.isInstancedMesh ? mesh.count : 1); i++) {
        matrix.multiplyMatrices(inverse, mesh.matrixWorld); tint.setHex(0xffffff);
        if (mesh.isInstancedMesh) {
          mesh.getMatrixAt(i, instance); matrix.multiply(instance);
          if (mesh.instanceColor) mesh.getColorAt(i, tint);
        }
        normalMatrix.getNormalMatrix(matrix);
        for (const group of groups) {
          const material = materials[group.materialIndex], map = material.map;
          const key = map ? 'farm-signs' : passable ? 'farm-details-fx' : 'farm-structures';
          if (!surfaces.has(key)) surfaces.set(key, {position: [], normal: [], color: [], uv: []});
          const surface = surfaces.get(key)!;
          let slot = 0;
          if (map) {
            if (!maps.has(map)) { const next = maps.size; maps.set(map, next); ink.drawImage(map.image, next * 512, 0, 512, 256); }
            slot = maps.get(map)!;
          }
          base.copy(material.color).multiply(tint);
          for (let j = group.start; j < group.start + group.count; j++) {
            const k = index ? index.getX(j) : j;
            vertex.fromBufferAttribute(pos, k).applyMatrix4(matrix);
            normal.fromBufferAttribute(normals, k).applyMatrix3(normalMatrix).normalize();
            surface.position.push(vertex.x, vertex.y, vertex.z); surface.normal.push(normal.x, normal.y, normal.z);
            surface.color.push(base.r, base.g, base.b);
            surface.uv.push(map ? (slot + uv.getX(k)) / 3 : 0, map ? uv.getY(k) : 0);
          }
        }
      }
      remove.push(mesh); geometries.add(geometry);
    });
    for (const mesh of remove) mesh.removeFromParent();
    for (const geometry of geometries) geometry.dispose();
    for (const [name, data] of surfaces) {
      const geometry = new T.BufferGeometry();
      for (const [key, values] of Object.entries(data)) geometry.setAttribute(key, new T.Float32BufferAttribute(values, key === 'uv' ? 2 : 3));
      geometry.computeBoundingSphere();
      const material = z.toon(0xffffff, {noCache: true, ...(name === 'farm-signs' ? {map: atlasTexture} : {})});
      material.vertexColors = true;
      const mesh = new T.Mesh(geometry, material); mesh.name = name;
      mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
    }
  };
  consolidate(rooster, false);
  consolidate(root, true);
  atlasTexture.needsUpdate = true;
  root.add(buildInteractiveWheatField(z));
  // Eight scenery submissions: solid, detail, signs, rooster, canopy and three grass batches.
  // farmLoop + critterField add at most 36 + 36, keeping the colour pass at 80 calls.
  const update = farmLoop(z, root, plots, {x: stall.x, z: stall.z + 1.4});
  const farmNativeTrees = [[-76, 20, 1.05], [-51, 28.1, 1.05], [-86, -19, 1.05]] as const;
  root.add(tufts(z, 4500, {min: [-105, -30], max: [-31, 29]}, (x, zz) => pathDistance(x, zz) < 2.4 ||
    plots.some(p => Math.abs(x - p.x) < 4.18 && Math.abs(zz - p.z) < 2.62) ||
    treeSpots.some(([tx, tz, ts]) => Math.hypot(x - tx, zz - tz) < Math.max(0.82, ts * 0.58 + 0.38)) ||
    farmNativeTrees.some(([tx, tz, r]) => Math.hypot(x - tx, zz - tz) < r) ||
    (Math.abs(x - bx) < 3.7 && zz > bz - 3.4 && zz < bz + 8.3)));
  const bugs = critterField(z, root, 'farm', plots.map(p => [p.x + 2, p.z - 1.4] as [number, number]));
  return {root, boxes: zoneBoxes, update: (t, dt, p) => { update(t, dt, p); bugs(t, dt, p); rooster.rotation.y = .35 + Math.sin(t * .22) * .6; }};
};
