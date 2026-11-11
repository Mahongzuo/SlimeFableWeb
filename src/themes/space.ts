import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {Stage, StageLook} from '../level/stage';
import type {LanderSpec} from '../../content/levels/types';
import {landerTriangles, terrainHeight, sunlightCenter, type LanderLayout} from '../templates/lander';
import {rng} from '../templates/random';

/** Shared, texture-free parts for the 1969 / 1970 / 1980 / 2014 space chapters. */
export const spaceLook: StageLook = {skyTop: '#050b1d', skyHorizon: '#101b30', fog: [130, 260], sun: '#fff0cc', sunIntensity: 2.5, hemiSky: '#8093b5', hemiGround: '#252937', ink: '#080e1b', wash: '#172238'};
const silver = '#c7d3d9', blue = '#164675', gold = '#b49a67';
function part(stage: Stage, root: any, geometry: any, color: string, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, stage.toon(color)); m.position.set(x, y, z); root.add(m); return m;
}
/** Static parts sharing a material become one draw each; animation stays at the parent pivot. */
function compact(root: any) {
  root.updateMatrixWorld(true);
  const groups = new Map<any, any[]>();
  root.traverse((m: any) => { if (m.isMesh) { const a = groups.get(m.material) ?? []; a.push(m.geometry.clone().applyMatrix4(m.matrixWorld)); groups.set(m.material, a); } });
  root.clear();
  for (const [material, geometries] of groups) {
    const geometry = mergeGeometries(geometries.map(g => g.index ? g.toNonIndexed() : g));
    const m = new THREE.Mesh(geometry, material); m.castShadow = true; m.receiveShadow = true; root.add(m);
    geometries.forEach(g => g.dispose());
  }
  return root;
}
export function createSolarWing(stage: Stage, width = 6, depth = 2.6) {
  const g = new THREE.Group(); g.name = 'solar-wing-fx';
  part(stage, g, new THREE.BoxGeometry(width, .10, depth), silver);
  for (let x = 0; x < 8; x++) for (let z = 0; z < 4; z++) part(stage, g, new THREE.BoxGeometry(width / 8 - .035, .025, depth / 4 - .035), (x + z) % 2 ? blue : '#235d90', -width / 2 + (x + .5) * width / 8, .065, -depth / 2 + (z + .5) * depth / 4);
  return compact(g);
}
export function createAntennaDish(stage: Stage, radius = 1) {
  const g = new THREE.Group(); g.name = 'antenna-dish-fx';
  const profile = Array.from({length: 9}, (_, i) => { const r = radius * i / 8; return new THREE.Vector2(r, r * r / radius * .45); });
  const bowl = part(stage, g, new THREE.LatheGeometry(profile, 20), silver); bowl.material = stage.toon(silver, {side: THREE.DoubleSide});
  part(stage, g, new THREE.CylinderGeometry(.025, .025, radius * .9, 6), gold, 0, radius * .35);
  part(stage, g, new THREE.SphereGeometry(radius * .09, 8, 6), blue, 0, radius * .8);
  return compact(g);
}
export function createTruss(stage: Stage, length = 4, width = .5) {
  const g = new THREE.Group(); g.name = 'truss-fx';
  for (const z of [-1, 1]) part(stage, g, new THREE.BoxGeometry(length, .045, .045), silver, 0, 0, z * width / 2);
  const count = Math.ceil(length / width), step = length / count;
  for (let i = 0; i < count; i++) { const beam = part(stage, g, new THREE.BoxGeometry(Math.hypot(step, width), .035, .035), silver, -length / 2 + (i + .5) * step); beam.rotation.y = (i % 2 ? 1 : -1) * Math.atan2(width, step); }
  return compact(g);
}
export function createStarDome(seed = 'space', radius = 150) {
  const r = rng(seed), positions: number[] = [], colors: number[] = [];
  for (let i = 0; i < 2200; i++) {
    const a = r.range(0, Math.PI * 2), h = i < 1200 ? r.range(-1, 1) : Math.max(-.95, Math.min(.95, Math.sin(a) * .48 + r.range(-.09, .09)));
    const s = Math.sqrt(1 - h * h), light = r.range(.42, 1);
    positions.push(radius * s * Math.cos(a), radius * h, radius * s * Math.sin(a)); colors.push(light * .8, light * .88, light);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({size: .23, vertexColors: true, transparent: true, opacity: .9, depthWrite: false, fog: false})); stars.name = 'star-dome-fx'; stars.layers.set(1); return stars;
}
export function createSun(stage: Stage, position: [number, number, number] = [-80, 75, -85], radius = 3) {
  const g = new THREE.Group(); g.name = 'distant-sun-fx';
  const sun = part(stage, g, new THREE.SphereGeometry(radius, 16, 12), '#fff2d0'); sun.material = stage.toon('#fff2d0', {emissive: '#ffe8b0', emissiveIntensity: 2});
  const halo = stage.glow('#ffe0a0', radius * 7, .65); g.add(halo); g.position.fromArray(position); return g;
}
export function createRosetta(stage: Stage) {
  const g = new THREE.Group(); g.name = 'rosetta-fx';
  part(stage, g, new THREE.BoxGeometry(1.8, 1.5, 1.8), gold);
  part(stage, g, new THREE.BoxGeometry(1.85, .25, 1.85), blue, 0, .65);
  for (const side of [-1, 1]) { const wing = createSolarWing(stage, 8, 2.8); wing.position.x = side * 5.2; g.add(wing); const truss = createTruss(stage, 2.2); truss.position.x = side * 1.6; g.add(truss); }
  const dish = createAntennaDish(stage, .8); dish.position.y = 1; dish.rotation.z = .45; g.add(dish);
  return compact(g);
}
export function createPhilaeShell(stage: Stage) {
  const g = new THREE.Group(); g.name = 'philae-shell-fx';
  // An open harness leaves the jelly face and deformation visible.
  part(stage, g, new THREE.BoxGeometry(.65, .28, .14), blue, 0, .45, .28);
  for (const s of [-1, 1]) part(stage, g, new THREE.BoxGeometry(.12, .32, .45), gold, s * .34, .38, .10);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3, leg = part(stage, g, new THREE.CylinderGeometry(.025, .035, .65, 6), silver, Math.sin(a) * .43, .16, Math.cos(a) * .43); leg.rotation.z = Math.sin(a) * .7; leg.rotation.x = -Math.cos(a) * .7;
    part(stage, g, new THREE.CylinderGeometry(.12, .14, .035, 6), blue, Math.sin(a) * .62, -.05, Math.cos(a) * .62);
  }
  part(stage, g, new THREE.CylinderGeometry(.02, .02, .45, 6), silver, -.22, .78, .22);
  part(stage, g, new THREE.ConeGeometry(.055, .35, 6), silver, .31, .07, .18).rotation.z = Math.PI;
  return compact(g);
}
function label(stage: Stage, text: string, x: number, y: number, z: number) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const c = canvas.getContext('2d')!; c.fillStyle = '#122d4c'; c.fillRect(0, 0, 512, 96); c.strokeStyle = '#c8d9e4'; c.strokeRect(5, 5, 502, 86); c.fillStyle = '#f1e8d1'; c.font = '600 36px "Microsoft YaHei",sans-serif'; c.textAlign = 'center'; c.fillText(text, 256, 60);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, .79), stage.toon('#ffffff', {map: texture, side: THREE.DoubleSide})); m.position.set(x, y, z); m.name = 'site-label-fx'; stage.scene.add(m); return m;
}
export function buildLanderSpace(stage: Stage, l: LanderLayout, spec: LanderSpec) {
  const r = rng(l.seed + '-art'), root = new THREE.Group(); root.name = 'comet-surface'; stage.scene.add(root);
  const geo = new THREE.BufferGeometry(), triangles = landerTriangles(l); geo.setAttribute('position', new THREE.Float32BufferAttribute(triangles, 3)); geo.computeVertexNormals();
  const colors: number[] = [], color = new THREE.Color();
  for (let i = 0; i < triangles.length; i += 9) {
    const y = Math.max(triangles[i+1], triangles[i+4], triangles[i+7]); color.set(y > 1 ? '#8dabb8' : '#777b80'); color.multiplyScalar(r.range(.95, 1.05));
    for (let k = 0; k < 3; k++) colors.push(color.r, color.g, color.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = stage.toon('#ffffff').clone(); mat.vertexColors = true;
  const centers = l.platforms.map(p => new THREE.Vector3(...p.position));
  // The painted sunlight uses precisely the same moving circles and terrace bounds as the battery rule.
  mat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uCenters = {value: centers}; shader.uniforms.uRadius = {value: spec.sunlight.radius};
    shader.uniforms.uSites = {value: l.platforms.map(p => new THREE.Vector3(...p.position))};
    shader.vertexShader = 'varying vec3 vComet;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvComet = position;');
    shader.fragmentShader = 'varying vec3 vComet; uniform vec3 uCenters[3]; uniform vec3 uSites[3]; uniform float uRadius;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float lit = 0.;
      for (int i=0;i<3;i++) { vec3 q = vComet-uSites[i]; if (abs(q.y)<.08 && abs(q.x)<=5.01 && abs(q.z)<=5.01) lit=max(lit,1.-smoothstep(uRadius-.18,uRadius,length(vComet.xz-uCenters[i].xz))); }
      diffuseColor.rgb *= mix(vec3(.61,.67,.81),vec3(1.35,1.22,.91),lit);`);
  };
  const surface = new THREE.Mesh(geo, mat); surface.name = 'comet-heightfield'; stage.add(surface, root);
  stage.scene.add(createStarDome(l.seed), createSun(stage));
  // Only the distant silhouette is bilobed; traversable terrain remains a height field.
  const far = new THREE.Group(); far.name = 'bilobed-comet-fx';
  for (const [x,y,z,sx,sy,sz] of [[-9,0,0,22,17,16],[15,10,0,15,12,13],[3,3,0,11,9,10]]) { const m = part(stage, far, new THREE.IcosahedronGeometry(1, 1), '#4e5967', x,y,z); m.scale.set(sx,sy,sz); }
  compact(far); far.position.set(28, 3, -100); stage.scene.add(far);
  const dust = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7, 1, true), stage.toon('#b0cbdb', {transparent: true, opacity: .10, side: THREE.DoubleSide}), 12); dust.name = 'comet-jets-fx'; dust.layers.set(1);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 12; i++) { dummy.position.set(r.range(-10, 58), r.range(6, 20), r.range(-100, -80)); dummy.scale.set(3+i*.3, 24+i*2, 3+i*.3); dummy.rotation.set(0, 0, .35); dummy.updateMatrix(); dust.setMatrixAt(i, dummy.matrix); } stage.scene.add(dust);
  const pebbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), stage.toon('#69717d'), 520); pebbles.name = 'pebbles-fx';
  for (let i = 0; i < 520; i++) { const x = r.range(-12, 64), z = r.range(-22, 22), s = r.range(.08, .32); dummy.position.set(x, terrainHeight(l,x,z)+s*.35,z); dummy.scale.set(s*1.7,s*.65,s); dummy.rotation.set(r.next(),r.next()*6,r.next()); dummy.updateMatrix(); pebbles.setMatrixAt(i,dummy.matrix); pebbles.setColorAt(i,new THREE.Color('#89929b').multiplyScalar(r.range(.95,1.05))); } stage.scene.add(pebbles);
  const striations = new THREE.InstancedMesh(new THREE.BoxGeometry(.035, 1, .025), stage.toon('#d3e1e4'), 90); striations.name = 'ice-veins-fx';
  l.platforms.forEach((p,i) => { for (let k=0;k<30;k++) { dummy.position.set(p.cliff.min[0]-.016,p.position[1]*(.15+.7*r.next()),p.position[2]+r.range(-4.8,4.8)); dummy.scale.set(1,r.range(.4,2),1); dummy.rotation.set(r.range(-.25,.25),0,0); dummy.updateMatrix(); striations.setMatrixAt(i*30+k,dummy.matrix); } }); stage.scene.add(striations);
  const rings = [l.agilkia,...l.platforms,l.abydos].map((p,i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(p.radius-.09,p.radius,64), stage.toon(i===0?'#e8c27a':'#91d7e7',{emissive:i===0?'#e8c27a':'#91d7e7',emissiveIntensity:.5,side:THREE.DoubleSide})); m.rotation.x=-Math.PI/2; m.position.set(p.position[0],p.position[1]+.035,p.position[2]); m.name='landing-ring-fx'; stage.scene.add(m); return m;
  });
  label(stage,'Agilkia · 初次着陆',0,1.3,-4.8); label(stage,'Abydos · 数据回传',59,1.4,-2.8);
  const panels = l.platforms.map((p,i) => { const g=createSolarWing(stage,1.8,1.1); g.position.set(p.position[0],p.position[1]+.7,p.position[2]); g.scale.x=.15; stage.scene.add(g); label(stage,`科学平台 ${i+1}`,p.position[0],p.position[1]+1.6,p.position[2]-3); return g; });
  const duck = new THREE.Group(); duck.name='duck-rock-fx';
  const body=part(stage,duck,new THREE.IcosahedronGeometry(1,1),'#afa790'); body.scale.set(1,.65,.7);
  part(stage,duck,new THREE.IcosahedronGeometry(.48,1),'#c2b9a0',.65,.65,0); const beak=part(stage,duck,new THREE.ConeGeometry(.24,.5,5),'#b69a6e',1.1,.65,0); beak.rotation.z=-Math.PI/2;
  compact(duck); duck.position.set(l.hidden.position[0],terrainHeight(l,l.hidden.position[0],l.hidden.position[2])+.6,l.hidden.position[2]); stage.scene.add(duck);
  const glint=stage.glow('#e8c27a',1.8,.6); glint.position.set(0,1.2,0); duck.add(glint);
  const rosetta=createRosetta(stage); rosetta.position.set(1,38,-4); stage.scene.add(rosetta);
  const shell=createPhilaeShell(stage); stage.scene.add(shell);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.18,.9,10),stage.toon('#ffb854',{emissive:'#ff8b38',emissiveIntensity:2,transparent:true,opacity:.8})); flame.rotation.z=Math.PI; flame.name='thruster-fx'; flame.visible=false; stage.scene.add(flame);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.10,.45,1,12,1,true),stage.toon('#aadfff',{emissive:'#aadfff',transparent:true,opacity:.5,side:THREE.DoubleSide})); beam.name='transmission-fx'; beam.layers.set(1); beam.visible=false; stage.scene.add(beam);
  const beamAxis = new THREE.Vector3(0,1,0), beamDirection = new THREE.Vector3();
  return {root, rosetta, shell, flame, duck, beam, panels,
    update(time: number, p: number[], spread: number, collected: boolean[], jet: boolean, transmission: number) {
      for(let i=0;i<3;i++){ const c=sunlightCenter(spec,l.platforms[i],time); centers[i].set(c[0],c[1],c[2]); panels[i].scale.x=Math.min(1,panels[i].scale.x+(collected[i]?.025:0)); rings[i+1].rotation.z=time*.12; }
      shell.position.set(p[0],p[1]+.1,p[2]); shell.scale.set(1+spread*.35,1-spread*.35,1+spread*.35);
      flame.visible=jet; flame.position.set(p[0],p[1]-.3,p[2]);
      rosetta.position.set(transmission>=0?59+(transmission-.5)*24:6+Math.sin(time*.045)*18,transmission>=0?23:38,transmission>=0?1:-10);
      rosetta.rotation.y=time*.025; dust.rotation.z=Math.sin(time*.08)*.02;
      beam.visible=transmission>=0;
      if(beam.visible){ beamDirection.set(rosetta.position.x-59,rosetta.position.y-.7,rosetta.position.z-1); beam.scale.y=beamDirection.length(); beam.position.set((59+rosetta.position.x)/2,(.7+rosetta.position.y)/2,(1+rosetta.position.z)/2); beam.quaternion.setFromUnitVectors(beamAxis,beamDirection.normalize()); }
    },
  };
}
