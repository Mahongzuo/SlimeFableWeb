import * as THREE from 'three';
import type {ThemeKit} from './kit';
import {plainKit} from './plain';

const baseKit = plainKit('ellis-1954',
  {skyTop: '#9eafb9', skyHorizon: '#c9cfd0', fog: [38, 150], sun: '#dee3e5', sunIntensity: 1.25, hemiSky: '#cbd6dd', hemiGround: '#827e77', ink: '#282e32', wash: '#e3e5e2'},
  {ground: '#a9a59a', lane: '#b6b2a6', plaza: '#c2bdb0', yard: '#8f9488', walls: ['#a5553f', '#a95a43', '#9c4e3b', '#a15742'], roof: '#6f9a8a', trim: '#e2dccb', door: '#3d3a36', glass: '#3c4b55', wood: '#7a5a3f', metal: '#4a4744', brick: '#a5553f', accent: '#a5553f', lamp: '#f2e2b0'});

/** Decorative only: plainKit retains ownership of geometry, collision and handles. */
export const ellisKit: ThemeKit = {
  id: baseKit.id,
  look: baseKit.look,
  build(stage, layout, spec) {
    const handles = baseKit.build(stage, layout, spec);
    const root = new THREE.Group();
    root.name = 'ellis-fx-details';
    root.userData.walkThrough = true;
    stage.add(root);

    // One draw call per shared geometry/material, independent of the number of lots.
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
    const batches = new Map<string, {geometry: THREE.BufferGeometry; color: string; matrices: THREE.Matrix4[]}>();
    const transform = new THREE.Object3D();
    const frame = new THREE.Object3D();
    const origin = (x = 0, y = 0, z = 0, yaw = 0) => {
      frame.position.set(x, y, z); frame.rotation.set(0, yaw, 0); frame.updateMatrix();
    };
    const part = (key: string, geometry: THREE.BufferGeometry, color: string,
      x: number, y: number, z: number, w: number, h: number, d: number, rz = 0) => {
      transform.position.set(x, y, z); transform.scale.set(w, h, d); transform.rotation.set(0, 0, rz); transform.updateMatrix();
      if (!batches.has(key)) batches.set(key, {geometry, color, matrices: []});
      batches.get(key)!.matrices.push(new THREE.Matrix4().multiplyMatrices(frame.matrix, transform.matrix));
    };
    const colors = {stone: '#ded7c6', brick: '#a25340', iron: '#43494a', wood: '#74604c', leather: '#614b39', copper: '#608d80', glass: '#35464e', lamp: '#ddd4aa', skyline: '#414e58'};
    const box = (kind: keyof typeof colors, x: number, y: number, z: number, w: number, h: number, d: number) =>
      part(kind, cube, colors[kind], x, y, z, w, h, d);
    const post = (x: number, y: number, z: number, radius: number, height: number) =>
      part('iron-round', cylinder, colors.iron, x, y, z, radius, height, radius);

    // A true annular arch leaves the doorway visible and open.
    const arch = new THREE.Shape();
    arch.absarc(0, 0, .89, 0, Math.PI, false);
    arch.lineTo(-.65, 0); arch.absarc(0, 0, .65, Math.PI, 0, true); arch.closePath();
    const archGeometry = new THREE.ExtrudeGeometry(arch, {depth: .22, bevelEnabled: false});
    const doors = layout.lots.filter(l => l.door);
    const main = doors.reduce<(typeof doors)[number] | undefined>((largest, lot) =>
      !largest || (lot.max[0] - lot.min[0]) * (lot.max[1] - lot.min[1]) >
      (largest.max[0] - largest.min[0]) * (largest.max[1] - largest.min[1]) ? lot : largest, undefined);
    for (const lot of doors) {
      const w = lot.max[0] - lot.min[0], d = lot.max[1] - lot.min[1];
      const cx = (lot.min[0] + lot.max[0]) / 2, cz = (lot.min[1] + lot.max[1]) / 2;
      origin();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        for (let y = .5; y < lot.height - .25; y += .48)
          box('stone', cx + sx * (w / 2 - .13), y, cz + sz * (d / 2 - .13), .38, .26, .38);
      }
      for (const z of [lot.min[1] - .05, lot.max[1] + .05]) {
        box('stone', cx, lot.height - .35, z, w + .28, .16, .23);
        // Broken horizontal brick courses give the existing red wall a masonry scale.
        for (let y = .65; y < lot.height - .5; y += .24)
          box('brick', cx, y, z, w - .4, .025, .035);
      }
      const door = lot.door!, f = door.facing[2];
      origin(door.x, 0, door.z, f > 0 ? 0 : Math.PI);
      for (const s of [-1, 1]) box('stone', s * .77, 1.08, .13, .24, 2.16, .28);
      part('entrance-arches', archGeometry, colors.stone, 0, 2.12, .05, 1, 1, 1);
      box('copper', 0, 3.08, .63, 2.1, .16, 1.3);
      for (const s of [-1, 1]) {
        part('canopy-brackets', cube, colors.iron, s * .89, 2.76, .4, .055, .65, .055, s * .25);
      }
      const window = (x: number, y: number) => {
        for (const s of [-1, 1]) {
          box('stone', x + s * .46, y, .13, .13, 1.17, .18);
          box('stone', x, y + s * .53, .13, 1.05, .13, .22);
        }
        box('stone', x, y, .15, .045, .96, .12);
        box('stone', x, y, .15, .8, .045, .12);
      };
      for (const y of lot.height > 4.6 ? [1.75, 3.6] : [1.75])
        for (const dx of [-w / 2 + .9, w / 2 - .9]) if (Math.abs(dx) > .9) window(dx, y);
      if (lot.height > 4.6) window(0, 3.6);
    }

    if (main) {
      origin();
      const profile = [[0, 0], [.54, 0], [.62, .17], [.73, .4], [.69, .68], [.51, .93], [.27, 1.14], [.1, 1.38], [0, 1.62]];
      const dome = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 20);
      const roofRise = main.roof === 'gable' ? Math.min((main.max[1] - main.min[1]) * .32, 1.9) : .45;
      for (const x of [main.min[0] + .53, main.max[0] - .53]) for (const z of [main.min[1] + .53, main.max[1] - .53]) {
        const y = main.height + roofRise;
        box('brick', x, main.height + roofRise / 2 + .45, z, 1.02, roofRise + .9, 1.02);
        box('stone', x, y + .92, z, 1.25, .18, 1.25);
        box('stone', x, y + .18, z, 1.12, .16, 1.12);
        for (const f of [-1, 1]) box('glass', x, y + .57, z + f * .517, .36, .48, .025);
        part('copper-domes', dome, colors.copper, x, y + 1.01, z, 1, 1, 1);
      }
      const door = main.door!, f = door.facing[2];
      const plaque = (name: string, lines: string[], x: number, y: number, w: number, h: number) => {
        const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 384;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#c9c1a9'; ctx.fillRect(0, 0, 1536, 384);
        ctx.strokeStyle = '#686352'; ctx.lineWidth = 10; ctx.strokeRect(18, 18, 1500, 348);
        // Deterministic rubbed paint; no external texture or historical additions.
        ctx.fillStyle = '#b1a991';
        for (let i = 0; i < 75; i++) ctx.fillRect((i * 137) % 1500, (i * 71) % 370, 10 + i % 21, 3);
        ctx.fillStyle = '#343d3d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        lines.forEach((line, i) => {
          ctx.font = `${i === 0 ? 60 : 46}px "Noto Serif SC","SimSun",serif`;
          ctx.fillText(line, 768, lines.length === 1 ? 192 : 152 + i * 113, 1440);
        });
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, .045), stage.toon('#ffffff', {map: texture}));
        mesh.name = name; mesh.userData.walkThrough = true;
        mesh.position.set(x, y, door.z + f * .23); mesh.rotation.y = f > 0 ? 0 : Math.PI;
        stage.add(mesh, root);
      };
      plaque('ellis-fx-station-sign', ['ELLIS ISLAND — IMMIGRATION STATION', '埃利斯岛移民站'], door.x, main.height - .62, Math.min(5.3, main.max[0] - main.min[0] - .4), .68);
      plaque('ellis-fx-closing-notice', ['本站将于 1954 年 11 月 12 日关闭'], door.x + 1.27, 2.48, .88, .3);
    }

    // Keep new furniture beside existing prop footprints and out of the central lane.
    for (const p of layout.props.filter(p => p.kind === 'bench')) {
      origin(p.x, p.y, p.z, p.rot);
      for (const x of [-p.w / 2 + .15, p.w / 2 - .15]) box('iron', x, .7, -p.d / 2, .07, .7, .07);
      for (const y of [.69, .86]) box('wood', 0, y, -p.d / 2, p.w, .12, .08);
      for (const x of [-.42, .39]) {
        box('leather', x, p.h + .25, .02, .59, .43, .35);
        for (const s of [-1, 1]) box('iron', x + s * .19, p.h + .25, .02, .035, .45, .37);
        box('wood', x, p.h + .49, .02, .2, .055, .07);
      }
    }
    const anchor = layout.props.find(p => p.kind === 'bench');
    if (anchor) {
      origin(anchor.x, anchor.y, anchor.z - 1.2, anchor.rot);
      box('wood', 0, .29, 0, 1.4, .16, .72);
      for (const x of [-.5, .5]) for (const z of [-.3, .3])
        part('cart-wheels', cylinder, colors.iron, x, .16, z, .16, .095, .16, Math.PI / 2);
      for (const z of [-.3, .3]) box('iron', -.65, .65, z, .055, .9, .055);
      box('iron', -.65, 1.1, 0, .07, .07, .7);
      box('leather', .1, .61, 0, .85, .48, .55);
      box('leather', -.03, .98, 0, .64, .24, .43);
    }

    const [x0, z0] = layout.bounds.min, [x1, z1] = layout.bounds.max;
    const quayX = x1 + .65, quayZ = (z0 + z1) / 2;
    origin(quayX, 0, quayZ);
    for (let z = -5.5; z <= 5.5; z += 1) {
      box('stone', 0, .1, z, 1.1, .6, .98);
      post(.35, .85, z, .035, 1.2);
    }
    for (const y of [.65, 1.35]) box('iron', .35, y, 0, .06, .07, 12);
    for (const z of [-4, 0, 4]) {
      post(-.1, .56, z, .13, .5); post(-.1, .84, z, .22, .09);
    }
    post(0, 1.9, 5.3, .075, 3.4);
    box('stone', 0, .42, 5.3, .4, .25, .4);
    box('iron', 0, 3.4, 5.3, 1.4, .08, .08);
    for (const x of [-.6, .6]) {
      box('lamp', x, 3.62, 5.3, .25, .38, .25);
      box('iron', x, 3.86, 5.3, .38, .12, .38);
      for (const s of [-1, 1]) box('iron', x + s * .14, 3.62, 5.3, .035, .4, .28);
    }

    origin();
    // Four flat panels surround the bounds; slightly above plainKit's outer ground.
    const water = new THREE.PlaneGeometry(1, 1); water.rotateX(-Math.PI / 2);
    for (const [x, z, w, d] of [
      [x0 - 65, (z0 + z1) / 2, 128, z1 - z0 + 260],
      [x1 + 65, (z0 + z1) / 2, 128, z1 - z0 + 260],
      [(x0 + x1) / 2, z0 - 65, x1 - x0 + 2, 128],
      [(x0 + x1) / 2, z1 + 65, x1 - x0 + 2, 128],
    ]) part('water-harbour', water, '#718b99', x, -.004, z, w, 1, d);
    for (let i = 0; i < 32; i++) {
      const x = x0 - 40 + i * 3.8, z = z1 + 68 + (i % 3) * 2;
      const h = 4 + (i * 7 % 13);
      box('skyline', x, h / 2, z, 2.7 + i % 2, h, 4);
      if (i % 5 === 0) {
        box('skyline', x, h + 1.5, z, 1.7, 3, 2);
        box('skyline', x, h + 4, z, .22, 2, .22);
      }
    }
    // These batches plus the two plaques keep added mesh count below 20.
    for (const [name, batch] of batches) {
      const mesh = new THREE.InstancedMesh(batch.geometry, stage.toon(batch.color), batch.matrices.length);
      mesh.name = `ellis-fx-${name}`; mesh.userData.walkThrough = true;
      batch.matrices.forEach((matrix, i) => {
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, new THREE.Color(batch.color).multiplyScalar(.96 + ((i * 17) % 9) * .01));
      });
      // Instance colours contain the palette already; avoid multiplying it twice.
      mesh.material = stage.toon('#ffffff');
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      stage.add(mesh, root);
      if (name.includes('water') || name === 'skyline') mesh.castShadow = false;
    }
    return handles;
  },
};
