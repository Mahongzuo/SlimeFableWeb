import * as T from 'three';
import type {Stage, StageLook} from '../level/stage';
import type {FolioSpec} from '../../content/levels/types';
import {FOLIO, RITE_ELEMENT, ritePulse} from '../templates/folio';
import {rng} from '../templates/random';
import {elements} from '../slime/elements';
import {Kit, buildLandmark, type Landmark} from './folio-landmarks';
const NO_OUTLINE = 1;
export function folioLook(spec: FolioSpec): StageLook {
  const horizon = new T.Color(spec.palette[0]).lerp(new T.Color('#6c6896'), .55).getStyle();
  return {skyTop: '#060d24', skyHorizon: horizon, fog: [48, 178], sun: '#cdd8ff', sunIntensity: 1.55, hemiSky: '#8f9bd6', hemiGround: '#4a3a30', ink: '#1a1c2c', wash: '#d8d2ea'};
}
export interface FolioState {active: number; done: boolean[]; taken: boolean[]; ready: boolean; finale: number; camera: any}
const glowTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
};
const label = (text: string) => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 72; const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(16,22,44,.82)'; g.strokeStyle = '#e9c27a'; g.lineWidth = 4; g.beginPath(); g.roundRect(6, 8, 244, 56, 26); g.fill(); g.stroke();
  g.fillStyle = '#fff1cf'; g.font = '700 32px "Noto Serif SC","Songti SC","SimSun",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 37);
  const s = new T.Sprite(new T.SpriteMaterial({map: new T.CanvasTexture(c), transparent: true, depthWrite: false})); s.scale.set(1.9, .54, 1); s.layers.set(NO_OUTLINE); return s;
};
const additive = (color: string, opacity = 1) => new T.MeshBasicMaterial({color, transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide});
/** Points that fly out from an origin and fall; driven entirely by one time uniform. */
function burstSystem(count: number, tex: any, spread: number) {
  const pos = new Float32Array(count * 3), vel = new Float32Array(count * 3), r = rng('burst' + count);
  for (let i = 0; i < count; i++) { const a = r.range(0, 6.28), b = r.range(-.2, 1), c = Math.sqrt(1 - b * b), s = spread * r.range(.35, 1);
    vel.set([Math.cos(a) * c * s, b * s * 1.1 + spread * .25, Math.sin(a) * c * s], i * 3); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aVel', new T.BufferAttribute(vel, 3));
  const m = new T.ShaderMaterial({transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: {uT: {value: 99}, uOrigin: {value: new T.Vector3()}, uColor: {value: new T.Color()}, uMap: {value: tex}, uSize: {value: spread * 26}},
    vertexShader: 'uniform float uT,uSize;uniform vec3 uOrigin;attribute vec3 aVel;varying float vA;void main(){float t=uT;vec3 p=uOrigin+aVel*t*(1.-.18*t)+vec3(0.,-1.6,0.)*t*t;vA=clamp(1.-t/2.6,0.,1.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=uSize*vA/-mv.z;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uColor;uniform sampler2D uMap;varying float vA;void main(){vec4 c=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(mix(uColor,vec3(1.),.35)*c.rgb*vA,c.a*vA);}'});
  const points = new T.Points(g, m); points.frustumCulled = false; points.layers.set(NO_OUTLINE); points.name = 'fx-burst';
  return {points, fire(at: any, color: string) { m.uniforms.uOrigin.value.copy(at); m.uniforms.uColor.value.set(color); m.uniforms.uT.value = 0; }, update(dt: number) { m.uniforms.uT.value += dt; }};
}
export function buildFolio(stage: Stage, spec: FolioSpec) {
  const scene = stage.scene, random = rng(spec.id), accent = spec.palette[1], tex = glowTexture();
  stage.camera.far = 260; stage.camera.updateProjectionMatrix();
  const sun = stage.sun; sun.position.set(-22, 34, -2); sun.target.position.set(0, 0, -12);
  Object.assign(sun.shadow.camera, {left: -42, right: 42, top: 44, bottom: -44, near: 1, far: 120}); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -.0012; sun.shadow.normalBias = .08;
  const lamp = new T.MeshBasicMaterial({color: '#ffffff'}), lit = stage.toon('#ffffff', {emissive: accent, emissiveIntensity: 0}).clone();
  const glass = stage.toon('#ffffff', {transparent: true, opacity: .26}).clone(); glass.depthWrite = false;
  const kit = new Kit({toon: stage.toon('#ffffff'), glow: new T.MeshBasicMaterial({color: '#ffffff'}), lamp, lit, glass}, spec.id);
  const scenery = new T.Group(); scenery.name = 'causeway'; const foliage = new T.Group(); foliage.name = 'foliage';
  const root = new T.Group(); root.name = 'landmark'; root.position.set(FOLIO.island[0], 0, FOLIO.island[1]); scene.add(scenery, foliage, root);
  const stone = '#cbc1ab', stone2 = '#b9ae98', brass = '#c99a55', iron = '#2f3444', pale = '#e7dcc4';
  // Surfaces that share a plane flicker, so every deck, lip and cap keeps a gap of at least 2cm.
  const occupied = (z0: number, z1: number) => FOLIO.stations.some(([, sz]) => z1 > sz - 2.75 && z0 < sz + 2.75);
  for (let z = FOLIO.causeway.max[1] - .58, n = 0; z > FOLIO.causeway.min[1] + .5; z -= 1.14, n++) {
    for (const x of [-1.16, 1.16]) {
      const onPad = Math.hypot(x, z - 23.5) < 4.3;
      kit.box(scenery, onPad ? pale : (n + (x > 0 ? 1 : 0)) % 3 ? stone : stone2, x, -.06, z, 2.28, .12, 1.1);
    }
  }
  for (const s of [-1, 1]) kit.box(scenery, pale, s * 3.5, -.06, 23.6, 2.05, .12, 7.2);
  kit.box(scenery, pale, 0, -.06, 27.55, 4.4, .12, 1.05); kit.box(scenery, stone, 0, -.06, -20.945, 4.5, .12, .1);
  const band = (color: string, y: number, z: number, r: number, slot: 'toon' | 'glow' = 'toon') => kit.put('ring', scenery, slot, color, 0, y, z, r, r, .45, Math.PI / 2, 0, 0);
  band(brass, .06, 23.5, 3.7); band('#ffe7b0', .055, 23.5, 2.3, 'glow');
  kit.ball(scenery, '#ffe7b0', -.9, .05, 23.2, 1.3, .02, 1.3, 'glow'); kit.ball(scenery, pale, -.25, .045, 22.9, 1.2, .015, 1.2);
  const curbSpan = (z0: number, z1: number) => {
    let parts: [number, number][] = [[z0, z1]];
    for (const [, sz] of FOLIO.stations) parts = parts.flatMap(([a, b]) => b < sz - 2.9 || a > sz + 2.9 ? [[a, b] as [number, number]] : [...(a < sz - 2.9 ? [[a, sz - 2.9] as [number, number]] : []), ...(b > sz + 2.9 ? [[sz + 2.9, b] as [number, number]] : [])]);
    return parts.filter(([a, b]) => b - a > .5);
  };
  for (const s of [-1, 1]) for (const [a, b] of curbSpan(-20.2, 26.2)) {
    kit.box(scenery, '#8f8778', s * 2.42, .045, (a + b) / 2, .12, .07, b - a);
    kit.box(scenery, '#6c675f', s * 2.55, -.62, (a + b) / 2, .22, .9, b - a);
  }
  for (let z = 22; z > -18; z -= 6) if (!occupied(z - .4, z + .4)) kit.box(scenery, '#5f5b57', 0, -.72, z, 5.1, .9, .7);
  FOLIO.stations.forEach(([x, z]) => { const x0 = Math.min(x, 0) - 2.2, x1 = Math.max(x, 0) + 2.2, cx = (x0 + x1) / 2, w = x1 - x0;
    const seam = 2.3, gap = seam + .04; kit.box(scenery, stone2, 0, -.52, z, Math.min(w, seam * 2), .76, 5.3);
    if (x0 < -gap) kit.box(scenery, stone2, (x0 - gap) / 2, -.45, z, -gap - x0, .9, 5.3);
    if (x1 > gap) kit.box(scenery, stone2, (x1 + gap) / 2, -.45, z, x1 - gap, .9, 5.3);
    kit.box(scenery, stone, cx, .16, z, w - .12, .28, 5.05);
    const lipY = .34, t = .07;
    kit.box(scenery, brass, cx, lipY, z - 2.5, w, .04, t); kit.box(scenery, brass, cx, lipY, z + 2.5, w, .04, t);
    kit.box(scenery, brass, x0 + .02, lipY, z, t, .04, 4.9); kit.box(scenery, brass, x1 - .02, lipY, z, t, .04, 4.9); });
  FOLIO.steles.forEach(s => { const h = s.top - .04; kit.box(scenery, '#9d9586', s.x, .04 + h / 2, s.z, .96, h, 1.16); kit.box(scenery, '#e6dcc4', s.x, s.top + .08, s.z, 1.12, .1, 1.28);
    for (let i = 0; i < 5; i++) kit.box(scenery, '#7d7669', s.x + (s.x > 0 ? -.56 : .56), .45 + i * .28, s.z, .04, .06, .72); });
  const tread = (color: string, x: number, z: number, w: number, d: number, y0: number, y1: number) => kit.box(scenery, color, x, (y0 + y1) / 2, z, w, y1 - y0, d);
  tread(stone, 0, -22, 10, 1.96, -.2, .3); tread(stone, 4.76, -24, .48, 1.96, -.2, .3); tread(stone, -4.76, -24, .48, 1.96, -.2, .3);
  tread(stone2, 0, -24, 8.96, 1.96, -.2, .6); tread(stone2, 4.26, -27, .44, 3.96, -.2, .6); tread(stone2, -4.26, -27, .44, 3.96, -.2, .6);
  tread(stone, 0, -29, 7.92, 7.96, -.2, .9);
  for (const [x, zz, w, d, top] of [[0, -21.02, 9.6, .08, .3], [0, -23.02, 8.6, .08, .6], [0, -25.02, 7.6, .08, .9]] as [number, number, number, number, number][]) kit.box(scenery, brass, x, top + .025, zz, w, .03, d);
  const P = FOLIO.pedestal, pc = new T.Vector3((P.min[0] + P.max[0]) / 2, P.top, (P.min[1] + P.max[1]) / 2);
  kit.box(scenery, '#a79d89', pc.x, (P.top + .94) / 2, pc.z, 3.1, P.top - .94, 2.9); kit.box(scenery, '#e6dcc4', pc.x, P.top + .07, pc.z, 3.4, .08, 3.2);
  for (let i = 0; i < 4; i++) kit.box(scenery, brass, pc.x, 1.25 + i * .3, P.max[1] + .04, 2.5, .04, .03);
  // ---- lamp posts in the water beside the causeway
  const halos: number[] = [], haloColors: number[] = [], warm = new T.Color('#ffc978');
  for (let z = 24; z > -22; z -= 6) for (const s of [-1, 1]) { const x = s * 3.2;
    kit.cyl(scenery, '#5f5b57', x, -.6, z, .45, 1.2); kit.cyl(scenery, iron, x, 1.3, z, .07, 2.6); kit.box(scenery, iron, x, 2.62, z, .5, .08, .5);
    kit.ball(scenery, '#ffd791', x, 2.95, z, .2, .3, .2, 'glow'); kit.cone(scenery, iron, x, 3.35, z, .34, .3); halos.push(x, 2.95, z); haloColors.push(warm.r, warm.g, warm.b); }
  // ---- ginkgo islets
  const golds = ['#f2c14e', '#e9a93a', '#f6d36b', '#d98f2b', '#f0b64a'];
  for (let i = 0; i < 18; i++) { const s = i % 2 ? 1 : -1, x = s * random.range(7, 15), z = 26 - Math.floor(i / 2) * 5.6 + random.range(-1.5, 1.5), h = random.range(4, 6.5);
    kit.rock(scenery, '#5e5a55', x, -.75, z, random.range(1.8, 2.8), .9, random.range(1.8, 2.6), random.range(0, 3));
    kit.beam(scenery, '#5a3f2e', [x, -.3, z], [x + random.range(-.4, .4), h, z + random.range(-.4, .4)], .22);
    for (let n = 0; n < 6; n++) kit.rock(foliage, golds[(i + n) % 5], x + random.range(-1.6, 1.6), h - .6 + random.range(-.6, 1.4), z + random.range(-1.6, 1.6), random.range(1, 1.7), random.range(.8, 1.3), random.range(1, 1.7), random.range(0, 3));
    for (let n = 0; n < 5; n++) kit.cone(foliage, '#8d7a4a', x + random.range(-2, 2), -.05, z + random.range(-2, 2), .06, random.range(.6, 1.2)); }
  for (let i = 0; i < 30; i++) { const x = random.range(-90, 90), z = random.range(-150, -105), h = random.range(10, 34); kit.rock(scenery, i % 3 ? '#1f2748' : '#2a3058', x, -4, z, random.range(14, 28), h, random.range(8, 14), random.range(0, 3)); }
  for (let i = 0; i < 18; i++) { const x = random.range(-26, 26), z = random.range(-38, 30); if (Math.abs(x) < 5) continue; kit.box(scenery, '#f6e2b0', x, .08, z, .34, .1, .34, random.range(0, 3), 'glow'); halos.push(x, .12, z); haloColors.push(1, .74, .42); }
  // ---- landmark island
  const lm: Landmark = buildLandmark(kit, root, spec.landmark);
  if (!lm.water) { kit.cyl(root, '#8c8475', 0, -.64, 0, 11, 1.16); kit.cyl(root, stone, 0, .1, 0, 10.15, .16); kit.put('ring', root, 'toon', brass, 0, .24, 0, 10.35, 10.35, .4, Math.PI / 2, 0, 0);
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; kit.ball(root, '#ffd791', Math.cos(a) * 10.6, .35, Math.sin(a) * 10.6, .14, .14, .14, 'lamp'); } }
  kit.flush();
  scenery.traverse((m: any) => { if (m.isMesh && m.material === kit.mats.glow) m.castShadow = false; });
  // ---- water: moving bands, a moon glade toward the camera, distance fade into the horizon
  const moonPos = new T.Vector3(-46, 52, -150);
  const waterMat = new T.ShaderMaterial({uniforms: {uTime: {value: 0}, uCam: {value: new T.Vector3()}, uMoon: {value: moonPos}, uDeep: {value: new T.Color('#0b1a35')}, uShallow: {value: new T.Color(spec.palette[0]).lerp(new T.Color('#2f5d7c'), .5)}, uHorizon: {value: new T.Color(folioLook(spec).skyHorizon)}, uGlow: {value: new T.Color('#ffe6b8')}},
    vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform float uTime;uniform vec3 uCam,uMoon,uDeep,uShallow,uHorizon,uGlow;varying vec3 vW;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec2 p=vW.xz;float n=sin(p.x*.8+uTime*.6)*sin(p.y*.6-uTime*.45)+.5*sin((p.x+p.y)*2.1+uTime*1.2)+.25*sin(p.x*4.3-p.y*3.1-uTime*2.);
        vec3 col=mix(uDeep,uShallow,.38+.16*n);
        vec2 to=normalize(uMoon.xz-uCam.xz),rel=p-uCam.xz;float along=dot(rel,to),side=abs(rel.x*to.y-rel.y*to.x);
        float glade=smoothstep(0.,30.,along)*exp(-side*side/(3.+along*.12));vec2 q=p*7.;float spark=step(.955,h(floor(q)+floor(uTime*2.5)))*smoothstep(.32,.0,length(fract(q)-.5))*smoothstep(.2,1.,n*.5+.5);
        col+=uGlow*glade*(.24+.42*smoothstep(.1,1.,n))+uGlow*spark*(glade*.7+.04);
        float d=length(vW-uCam);col=mix(col,uHorizon,smoothstep(40.,170.,d));gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`});
  waterMat.polygonOffset = true; waterMat.polygonOffsetFactor = 2; waterMat.polygonOffsetUnits = 2;
  const water = new T.Mesh(new T.PlaneGeometry(420, 420), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = FOLIO.waterLevel; water.name = 'water'; water.layers.set(NO_OUTLINE); scene.add(water);
  // ---- sky: moon, stars
  const moon = new T.Mesh(new T.SphereGeometry(9, 32, 16), new T.MeshBasicMaterial({color: '#fff4d8', fog: false})); moon.position.copy(moonPos); moon.layers.set(NO_OUTLINE); moon.name = 'fx-moon'; scene.add(moon);
  const moonGlow = new T.Sprite(new T.SpriteMaterial({map: tex, color: '#ffe8c0', transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending, fog: false})); moonGlow.scale.setScalar(70); moonGlow.position.copy(moonPos); moonGlow.layers.set(NO_OUTLINE); scene.add(moonGlow);
  const starPos = new Float32Array(1500 * 3); for (let i = 0; i < 1500; i++) { const a = random.range(0, 6.28), b = random.range(.08, 1), c = Math.sqrt(1 - b * b); starPos.set([Math.cos(a) * c * 170, b * 170, Math.sin(a) * c * 170], i * 3); }
  const starGeo = new T.BufferGeometry(); starGeo.setAttribute('position', new T.BufferAttribute(starPos, 3));
  const stars = new T.Points(starGeo, new T.PointsMaterial({color: '#e8ecff', size: .9, sizeAttenuation: true, transparent: true, opacity: .85, fog: false, depthWrite: false})); stars.layers.set(NO_OUTLINE); scene.add(stars);
  // ---- halos (all always-on lanterns in one draw call)
  const haloGeo = new T.BufferGeometry(); haloGeo.setAttribute('position', new T.Float32BufferAttribute(halos, 3)); haloGeo.setAttribute('color', new T.Float32BufferAttribute(haloColors, 3));
  const haloPts = new T.Points(haloGeo, new T.PointsMaterial({map: tex, size: 2.6, vertexColors: true, transparent: true, opacity: .75, depthWrite: false, blending: T.AdditiveBlending})); haloPts.layers.set(NO_OUTLINE); haloPts.name = 'fx-halos'; scene.add(haloPts);
  // ---- fireflies
  const flyN = 160, flyPos = new Float32Array(flyN * 3), flyPh = new Float32Array(flyN);
  for (let i = 0; i < flyN; i++) { const s = i % 2 ? 1 : -1; flyPos.set([s * random.range(3.5, 16), random.range(.3, 4), random.range(-36, 30)], i * 3); flyPh[i] = random.range(0, 50); }
  const flyGeo = new T.BufferGeometry(); flyGeo.setAttribute('position', new T.BufferAttribute(flyPos, 3)); flyGeo.setAttribute('aPh', new T.BufferAttribute(flyPh, 1));
  const flyMat = new T.ShaderMaterial({transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: {uTime: {value: 0}, uMap: {value: tex}, uColor: {value: new T.Color('#d8ff9a')}},
    vertexShader: 'uniform float uTime;attribute float aPh;varying float vB;void main(){vec3 p=position+vec3(sin(uTime*.5+aPh)*.9,sin(uTime*.8+aPh*1.7)*.45,cos(uTime*.4+aPh)*.9);vB=.35+.65*pow(.5+.5*sin(uTime*2.3+aPh*3.),3.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=34.*vB/-mv.z;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform sampler2D uMap;uniform vec3 uColor;varying float vB;void main(){vec4 c=texture2D(uMap,gl_PointCoord);gl_FragColor=vec4(uColor*c.rgb*vB,c.a*vB);}'});
  const flies = new T.Points(flyGeo, flyMat); flies.frustumCulled = false; flies.layers.set(NO_OUTLINE); flies.name = 'fx-fireflies'; scene.add(flies);
  // ---- falling ginkgo leaves
  const leafN = 150, leafSeed = new Float32Array(leafN * 4), leafGeo = new T.CircleGeometry(.16, 7, -.4, 2.2);
  const leaves = new T.InstancedMesh(leafGeo, new T.MeshBasicMaterial({color: '#ffffff', side: T.DoubleSide}), leafN); leaves.name = 'fx-leaves'; leaves.layers.set(NO_OUTLINE); leaves.frustumCulled = false;
  for (let i = 0; i < leafN; i++) { leafSeed.set([random.range(-16, 16), random.range(-34, 30), random.range(0, 9), random.range(.5, 1.4)], i * 4); leaves.setColorAt(i, new T.Color(golds[i % 5])); }
  scene.add(leaves);
  const floatN = 90, floating = new T.InstancedMesh(leafGeo, leaves.material, floatN); floating.name = 'fx-floating-leaves'; floating.layers.set(NO_OUTLINE);
  const dummy = new T.Object3D();
  for (let i = 0; i < floatN; i++) { let x = random.range(-18, 18); if (Math.abs(x) < 2.8) x += Math.sign(x || 1) * 3; dummy.position.set(x, FOLIO.waterLevel + .02, random.range(-40, 30)); dummy.rotation.set(-Math.PI / 2, 0, random.range(0, 6.28)); dummy.scale.setScalar(random.range(.8, 1.4)); dummy.updateMatrix(); floating.setMatrixAt(i, dummy.matrix); floating.setColorAt(i, new T.Color(golds[(i + 2) % 5]).multiplyScalar(.8)); }
  scene.add(floating);
  // ---- warm point lights so the stones read at night
  const pointLights = [new T.PointLight('#ffc27a', 26, 18, 1.6), new T.PointLight('#ffc27a', 22, 18, 1.6), new T.PointLight(accent, 0, 40, 1.4)];
  pointLights[0].position.set(0, 3.5, 21); pointLights[1].position.set(0, 4, -24); pointLights[2].position.set(root.position.x + lm.focus[0], lm.focus[1] + 4, root.position.z + lm.focus[2] + 6); scene.add(...pointLights);
  // ---- rite stations
  const el = elements[RITE_ELEMENT[spec.rite]];
  const stations = FOLIO.stations.map(([x, z], i) => {
    const g = new T.Group(); g.position.set(x, FOLIO.stationTop, z); g.name = 'station-' + i; scene.add(g);
    const mat = (c: string) => stage.toon(c), core = new T.MeshBasicMaterial({color: el.rim}); core.color.multiplyScalar(.25);
    const add = (geo: any, m: any, x0: number, y0: number, z0: number, sx = 1, sy = 1, sz = 1, parent: any = g) => { const mesh = new T.Mesh(geo, m); mesh.position.set(x0, y0, z0); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; parent.add(mesh); return mesh; };
    const box = new T.BoxGeometry(1, 1, 1), cyl = new T.CylinderGeometry(1, 1, 1, 16), ball = new T.SphereGeometry(1, 16, 10);
    let rotor: any = null, arc: any = null, disc: any = null, light: any = null;
    add(cyl, mat('#4b4f63'), 0, .16, 0, .8, .24, .8);
    if (spec.rite === 'lamp') { add(cyl, mat(iron), 0, 1, 0, .07, 1.8, .07); add(box, mat(iron), 0, 1.95, 0, .8, .06, .8); add(ball, core, 0, 2.4, 0, .32, .42, .32);
      for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) add(box, mat('#8a6a3c'), a * .3, 2.4, b * .3, .05, .85, .05); add(new T.ConeGeometry(1, 1, 4), mat('#7a2f2a'), 0, 3.05, 0, .55, .45, .55).rotation.y = Math.PI / 4; }
    if (spec.rite === 'arc') { for (const s of [-1, 1]) { add(new T.CylinderGeometry(.5, 1, 1, 10), mat('#5a5f78'), s * 1.1, 1, 0, .22, 2, .22); add(ball, core, s * 1.1, 2.15, 0, .2, .2, .2); add(new T.TorusGeometry(1, .12, 6, 16), mat(brass), s * 1.1, 1.6, 0, .26, .26, .26).rotation.x = Math.PI / 2; }
      const pts = new Float32Array(16 * 3), geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pts, 3)); arc = new T.Line(geo, new T.LineBasicMaterial({color: '#f2e8ff', transparent: true, opacity: 0, blending: T.AdditiveBlending})); arc.layers.set(NO_OUTLINE); arc.frustumCulled = false; g.add(arc); }
    if (spec.rite === 'wind') { add(cyl, mat(iron), 0, 1.1, 0, .08, 2.2, .08); rotor = new T.Group(); rotor.position.set(0, 2.3, .14); g.add(rotor); add(ball, core, 0, 0, .05, .16, .16, .16, rotor);
      for (let b = 0; b < 5; b++) { const blade = add(box, mat(b % 2 ? '#e9dcc0' : '#d9b46c'), 0, .55, 0, .26, 1.05, .03, new T.Group()); blade.parent.rotation.z = b / 5 * 6.28; rotor.add(blade.parent); } }
    if (spec.rite === 'moon') { add(new T.CylinderGeometry(1.1, .8, .6, 20), mat('#9d9586'), 0, .5, 0); add(new T.TorusGeometry(1, .06, 6, 30), mat(brass), 0, .8, 0, 1.08, 1.08, 1.08).rotation.x = Math.PI / 2;
      disc = add(new T.CylinderGeometry(1, 1, .04, 24), new T.MeshBasicMaterial({color: '#9fd0ff'}), 0, .5, 0, .95, 1, .95); disc.castShadow = false; add(ball, core, 0, 1.9, 0, .22, .22, .22); }
    if (spec.rite === 'lamp' || spec.rite === 'moon') { light = new T.PointLight(el.rim, 0, 9, 1.5); light.position.set(0, 2.4, 0); g.add(light); }
    const target = new T.Mesh(new T.TorusGeometry(1.6, .045, 6, 64), new T.MeshBasicMaterial({color: '#ffd98a'})); target.rotation.x = Math.PI / 2; target.position.y = .06; target.layers.set(NO_OUTLINE); g.add(target);
    const pulse = new T.Mesh(new T.TorusGeometry(1.6, .07, 6, 64), additive(el.color, .9)); pulse.rotation.x = Math.PI / 2; pulse.position.y = .08; pulse.layers.set(NO_OUTLINE); g.add(pulse);
    const tag = label(spec.stops[i]); tag.position.set(0, 3.7, 0); g.add(tag);
    const halo = new T.Sprite(new T.SpriteMaterial({map: tex, color: el.rim, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending})); halo.position.y = 2.2; halo.scale.setScalar(4); halo.layers.set(NO_OUTLINE); g.add(halo);
    return {g, core, rotor, arc, disc, light, target, pulse, halo, done: 0, flash: 0};
  });
  // ---- collectible ginkgo lights
  const lightGeo = new T.CircleGeometry(.34, 14, -.5, 2.4), lightMat = new T.MeshBasicMaterial({color: '#ffd45e', side: T.DoubleSide});
  const lights = FOLIO.lights.map(([x, y, z]) => { const g = new T.Group(); g.position.set(x, y, z); g.name = 'fx-ginkgo';
    const leaf = new T.Mesh(lightGeo, lightMat); leaf.layers.set(NO_OUTLINE); g.add(leaf); const stem = new T.Mesh(new T.BoxGeometry(.03, .3, .03), lightMat); stem.position.y = -.28; stem.layers.set(NO_OUTLINE); g.add(stem);
    const s = new T.Sprite(new T.SpriteMaterial({map: tex, color: '#ffc85a', transparent: true, opacity: .8, depthWrite: false, blending: T.AdditiveBlending})); s.scale.setScalar(1.6); s.layers.set(NO_OUTLINE); g.add(s); scene.add(g); return {g, gone: 0}; });
  // ---- pedestal beacon (lit once all three rites are done)
  const beacon = new T.Mesh(new T.CylinderGeometry(.9, 1.4, 14, 24, 1, true), additive(accent, 0)); beacon.position.set(pc.x, P.top + 7, pc.z); beacon.layers.set(NO_OUTLINE); beacon.name = 'fx-beacon'; scene.add(beacon);
  const crest = new T.Mesh(new T.TorusGeometry(1.2, .06, 6, 48), new T.MeshBasicMaterial({color: '#7d6a4a'})); crest.rotation.x = Math.PI / 2; crest.position.set(pc.x, P.top + .12, pc.z); crest.layers.set(NO_OUTLINE); scene.add(crest);
  // ---- finale effects
  const focus = new T.Vector3(...lm.focus).add(root.position);
  const big = burstSystem(520, tex, 9), small = burstSystem(140, tex, 3.2); scene.add(big.points, small.points);
  const shock = new T.Mesh(new T.TorusGeometry(1, .025, 4, 96), additive('#ffffff', 0)); shock.layers.set(NO_OUTLINE); shock.name = 'fx-shock'; scene.add(shock);
  const flat = new T.Mesh(new T.RingGeometry(.92, 1, 96), additive(accent, 0)); flat.rotation.x = -Math.PI / 2; flat.layers.set(NO_OUTLINE); flat.position.set(root.position.x, .2, root.position.z); scene.add(flat);
  const pillar = new T.Mesh(new T.CylinderGeometry(2.4, 3.4, 90, 32, 1, true), additive(accent, 0)); pillar.position.set(focus.x, 45, focus.z); pillar.layers.set(NO_OUTLINE); pillar.name = 'fx-pillar'; scene.add(pillar);
  const waves = Array.from({length: 6}, () => { const m = new T.Mesh(new T.TorusGeometry(1, .018, 4, 96), additive(accent, 0)); m.layers.set(NO_OUTLINE); scene.add(m); return {m, t: 99}; });
  const flare = new T.Sprite(new T.SpriteMaterial({map: tex, color: '#ffb25a', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending})); flare.layers.set(NO_OUTLINE); scene.add(flare);
  let waveClock = 0, waveNext = 0;
  const trailN = 260, trailPos = new Float32Array(trailN * 3), trailVel = new Float32Array(trailN * 3), trailAge = new Float32Array(trailN).fill(99); let trailHead = 0;
  const trailGeo = new T.BufferGeometry(); trailGeo.setAttribute('position', new T.BufferAttribute(trailPos, 3)); trailGeo.setAttribute('aAge', new T.BufferAttribute(trailAge, 1));
  const trailMat = new T.ShaderMaterial({transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: {uMap: {value: tex}},
    vertexShader: 'attribute float aAge;varying float vA;void main(){vA=clamp(1.-aAge/1.6,0.,1.);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=(320.+aAge*1100.)*vA/-mv.z;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform sampler2D uMap;varying float vA;void main(){vec4 c=texture2D(uMap,gl_PointCoord);vec3 col=mix(vec3(1.,.55,.2),vec3(.85,.85,.95),1.-vA);gl_FragColor=vec4(col*c.rgb*vA,c.a*vA*.9);}'});
  const trail = new T.Points(trailGeo, trailMat); trail.frustumCulled = false; trail.layers.set(NO_OUTLINE); trail.name = 'fx-trail'; scene.add(trail);
  const mover = lm.mover, base = mover.position.clone(), baseScale = mover.scale.clone(), parked = mover.position.clone(), world = new T.Vector3(), tmp = new T.Vector3(), quat = new T.Quaternion();
  const smooth = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
  let lastFinale = -1; const moonWater = new T.Color('#e6f3ff');
  function emit(at: any, vx: number, vy: number, vz: number) { const i = trailHead++ % trailN; trailPos.set([at.x + (Math.random() - .5) * .6, at.y, at.z + (Math.random() - .5) * .6], i * 3); trailVel.set([vx + (Math.random() - .5) * 1.4, vy, vz + (Math.random() - .5) * 1.4], i * 3); trailAge[i] = 0; }
  function animateLandmark(time: number, dt: number, finale: number) {
    const p = finale < 0 ? 0 : Math.min(1, finale / 5), e = smooth(p), m = spec.motion;
    const level = m === 'pulse' ? .3 + (finale < 0 ? .1 : 1.1) * Math.pow(Math.max(0, Math.sin(time * 6)), 6) + e * .35 : .32 + .68 * e;
    lamp.color.setScalar(Math.min(1.2, level)); lit.emissiveIntensity = e * .95; pointLights[2].intensity = e * 60;
    for (const s of lm.spinners) s.group.rotation[s.axis] += dt * (m === 'turn' ? 0 : spec.landmark === 'windmill' ? .25 + e * 2.6 : e * 3.2);
    if (m === 'turn' && lm.spinners[0]) lm.spinners[0].group.rotation.y = e * Math.PI;
    if (m === 'orbit' || m === 'turn') mover.rotation.y += dt * (.12 + e * (m === 'turn' ? .6 : 1.5));
    if (m === 'lift') { if (lm.furl) mover.scale.y = 1 - .88 * e; else if ((lm.lift ?? 0) > 20) mover.position.y = base.y + (lm.lift ?? 0) * Math.pow(p, 2.3); else mover.position.y = base.y + (lm.lift ?? 0) * e; }
    if (m === 'surface') { mover.position.y = -6.4 + 6.6 * e + .05 * Math.sin(time); mover.rotation.z = (1 - e) * .22; }
    if (m === 'sail') { const x = spec.landmark === 'subway' ? -16 + 20 * e : -18 + 18 * e; mover.position.x = x; mover.position.y = spec.landmark === 'subway' ? 0 : .06 * Math.sin(time * 1.2); mover.rotation.x = spec.landmark === 'subway' ? 0 : .03 * Math.sin(time * .9); }
    if (m === 'flare') mover.scale.setScalar(.3 + e * (spec.landmark === 'kepler' ? 2.4 : 1.1) + (finale > 0 ? .07 * Math.sin(time * 15) : 0));
    if (m === 'notes') { mover.scale.setScalar(Math.max(.001, e)); mover.position.y = base.y + e * 2; mover.rotation.y += dt * .4; }
    if (m === 'kick' && lm.kick) { const a = lm.kick.from, b = lm.kick.to; mover.position.set(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e + 3.4 * Math.sin(Math.PI * e), a[2] + (b[2] - a[2]) * e); if (finale > 0 && p < 1) mover.rotation.x -= dt * 12; }
    if (m === 'fly') {
      if (finale < 0) { mover.position.copy(parked); mover.rotation.set(0, 0, 0); }
      else { const b = smooth(finale / 1.8) * (1 - smooth((finale - 5.5) / 2.5)), a = -Math.PI / 2 + Math.max(0, finale - .3) * .5, cx = 15 * Math.cos(a), cz = -2 + 15 * Math.sin(a), cy = 10 + 2.5 * Math.sin(a * 2);
        mover.position.set(parked.x + (cx - parked.x) * b, parked.y + (cy - parked.y) * b, parked.z + (cz - parked.z) * b);
        mover.rotation.order = 'YXZ'; mover.rotation.set(-.55 * b, Math.atan2(-Math.cos(a), -Math.sin(a)) * b, 0); }
    }
    if (finale > 0 && ((m === 'lift' && (lm.lift ?? 0) > 20) || (m === 'fly' && finale < 6.5))) { mover.getWorldPosition(world); const n = Math.ceil(dt * 120);
      if (m === 'fly') { tmp.set(-1, 0, 0).applyQuaternion(mover.getWorldQuaternion(quat)).multiplyScalar(3.4); world.add(tmp); }
      for (let i = 0; i < n; i++) if (m === 'fly') emit(world, tmp.x * .3, 0, tmp.z * .3); else emit(world, 0, -6 - Math.random() * 4, 0); }
    if (finale < 0) mover.scale.copy(m === 'flare' ? mover.scale : m === 'notes' ? mover.scale : baseScale);
  }
  function update(time: number, dt: number, s: FolioState) {
    waterMat.uniforms.uTime.value = time; waterMat.uniforms.uCam.value.copy(s.camera.position); flyMat.uniforms.uTime.value = time;
    for (let i = 0; i < leafN; i++) { const o = i * 4, fall = (time * leafSeed[o + 3] * .55 + leafSeed[o + 2]) % 9;
      dummy.position.set(leafSeed[o] + Math.sin(time * .7 + i) * .8, 9 - fall, leafSeed[o + 1] + Math.cos(time * .5 + i) * .6); dummy.rotation.set(time * leafSeed[o + 3] + i, time * .8 + i, Math.sin(time + i)); dummy.scale.setScalar(1); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix); }
    leaves.instanceMatrix.needsUpdate = true;
    stations.forEach((st, i) => { const done = s.done[i], active = s.active === i && !done && s.finale < 0;
      st.done += ((done ? 1 : 0) - st.done) * Math.min(1, dt * 3); st.flash = Math.max(0, st.flash - dt * 2.5);
      const k = Math.max(.06, ritePulse(time, i)); st.pulse.visible = active; st.pulse.scale.setScalar(k); (st.pulse.material as any).color.set(st.flash > 0 ? '#ff6a5a' : el.color);
      (st.pulse.material as any).opacity = .55 + .45 * Math.max(0, 1 - Math.abs(k - 1) * 4); st.target.visible = active || st.flash > 0;
      st.core.color.set(el.rim).multiplyScalar(.25 + .95 * st.done + (active ? .15 * Math.sin(time * 4) : 0)); st.halo.material.opacity = st.done * .7;
      if (st.light) st.light.intensity = st.done * 14;
      if (st.rotor) st.rotor.rotation.z -= dt * (.3 + st.done * 9);
      if (st.disc) { st.disc.position.y = .5 + st.done * .32; (st.disc.material as any).color.set('#2c4b72').lerp(moonWater, st.done); }
      if (st.arc) { const a = st.arc.geometry.attributes.position; for (let n = 0; n < 16; n++) { const t = n / 15, j = (n && n < 15) ? .22 : 0;
        a.setXYZ(n, -1.1 + 2.2 * t + (Math.random() - .5) * j, 2.15 + Math.sin(Math.PI * t) * .45 + (Math.random() - .5) * j * 1.6, (Math.random() - .5) * j); } a.needsUpdate = true; st.arc.material.opacity = st.done > .5 ? .7 + Math.random() * .3 : st.flash; }
    });
    lights.forEach((l, i) => { if (s.taken[i]) l.gone = Math.min(1, l.gone + dt * 2.2); const y = FOLIO.lights[i][1] + Math.sin(time * 2 + i) * .08 + l.gone * 1.4;
      l.g.position.y = y; l.g.rotation.y = time * 1.6 + i; l.g.scale.setScalar(Math.max(.001, 1 - l.gone)); l.g.visible = l.gone < 1; });
    const ready = s.ready && s.finale < 0 ? 1 : 0; beacon.material.opacity += (ready * (.16 + .06 * Math.sin(time * 3)) - beacon.material.opacity) * Math.min(1, dt * 3);
    crest.material.color.set(ready || s.finale >= 0 ? accent : '#7d6a4a');
    animateLandmark(time, dt, s.finale);
    // finale beats
    const f = s.finale;
    if (f >= 0 && lastFinale < 0) { pillar.material.opacity = 0; waveNext = 0; }
    if (f >= 1.1 && lastFinale < 1.1) { const at = spec.motion === 'fly' || spec.motion === 'kick' ? mover.getWorldPosition(world) : focus; big.fire(at, accent); shock.position.copy(at); }
    lastFinale = f;
    if (f >= 0) { const st = Math.max(0, f - 1.1); shock.scale.setScalar(1 + st * 16); shock.lookAt(s.camera.position); (shock.material as any).opacity = Math.max(0, .9 - st * .6);
      flat.scale.setScalar(2 + f * 9); (flat.material as any).opacity = Math.max(0, .7 - f * .14); pillar.material.opacity = Math.min(.14, f * .06) * (1 - smooth((f - 6) / 3));
      if (['broadcast', 'pulse', 'orbit', 'notes', 'glow'].includes(spec.motion)) { waveClock += dt; if (waveClock > waveNext) { waveNext = waveClock + (spec.motion === 'broadcast' ? .45 : .9); const w = waves.find(v => v.t > 2.4); if (w) { w.t = 0; w.m.position.copy(focus); } } } }
    for (const w of waves) { w.t += dt; const k = w.t; w.m.visible = k < 2.4; if (!w.m.visible) continue; w.m.scale.setScalar(1 + k * 7); w.m.lookAt(s.camera.position); (w.m.material as any).opacity = .65 * (1 - k / 2.4); }
    for (let i = 0; i < trailN; i++) { if (trailAge[i] > 2) continue; trailAge[i] += dt; trailPos[i * 3] += trailVel[i * 3] * dt; trailPos[i * 3 + 1] += trailVel[i * 3 + 1] * dt; trailPos[i * 3 + 2] += trailVel[i * 3 + 2] * dt; trailVel[i * 3 + 1] *= .97; }
    trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.aAge.needsUpdate = true;
    if (spec.motion === 'flare') { const e = smooth(f / 5); mover.getWorldPosition(flare.position); flare.position.y += 1; flare.scale.setScalar(2 + e * (spec.landmark === 'kepler' ? 16 : 7)); flare.material.opacity = e * (.75 + .15 * Math.sin(time * 13)); }
    big.update(dt); small.update(dt);
  }
  return {
    focus, height: lm.height, update, pedestal: pc,
    track: (out: any) => spec.motion === 'fly' || spec.motion === 'kick' || (spec.motion === 'lift' && (lm.lift ?? 0) > 20) ? mover.getWorldPosition(out) : out.copy(focus),
    stationBurst(i: number) { const [x, z] = FOLIO.stations[i]; small.fire(new T.Vector3(x, 2.4, z), el.rim); },
    lightBurst(i: number) { const [x, y, z] = FOLIO.lights[i]; small.fire(new T.Vector3(x, y, z), '#ffd45e'); },
    miss(i: number) { stations[i].flash = 1; },
    drawCalls: () => { let n = 0; scene.traverse((o: any) => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible) n++; }); return n; },
  };
}
