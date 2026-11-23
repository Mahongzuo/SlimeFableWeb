import type {FlybyBody, FlybySpec} from '../../content/levels/types';

/** Hand-tuned game units. Fixed integration is shared by flight, prediction and the solver test. */
export const FLYBY = {
  step: 1 / 120, gravity: 1, falloff: 2, softening: 3,
  fuel: 12, impulse: .035, cooldown: .65, shield: 100,
  ringDrag: .0015, ringDamage: 1, spreadProtection: .5,
  predictionSeconds: 6, predictionSamples: 181, liftSpeed: .25,
};
export interface FlybyLayout {spec: FlybySpec; titan: FlybyBody; ringBody: FlybyBody}
export interface FlybyState {
  x: number; z: number; vx: number; vz: number; time: number; fuel: number; shield: number;
  cooldown: number; photos: number; gapTime: number; gap: boolean; hidden: boolean;
  encounter: boolean; departing: boolean; height: number; status: 'flying' | 'won' | 'lost';
}
// Scale the entire visual system together: larger planets must not swallow safe flight paths.
export const FLYBY_VISUAL_SCALE = 2.4;
const viewPoint = (x:number,y:number,z:number) => [x*FLYBY_VISUAL_SCALE,y*FLYBY_VISUAL_SCALE,z*FLYBY_VISUAL_SCALE] as const;
export const FLYBY_SHOTS = {
  opening: {position: viewPoint(-78,12,-2), target: viewPoint(-42,0,-12), fov:50, time:0},
  rings: {position: viewPoint(-27,13,-5), target: viewPoint(-3,0,-8), fov:48, time:106},
  titan: {position: viewPoint(19,7,-13), target: viewPoint(27,0,3), fov:38, time:181},
} as const;
/** Logical-space chase camera; caller scales only at the render boundary. */
export function flybyCamera(l:FlybyLayout,s:FlybyState,position:number[],target:number[]) {
  const speed=Math.hypot(s.vx,s.vz),dx=s.vx/Math.max(speed,.001),dz=s.vz/Math.max(speed,.001);
  const distance=14+Math.min(8,speed*8),close=s.encounter&&!s.departing;
  position[0]=s.x-dx*distance*.65-dz*distance*.6;
  position[1]=s.height+distance*.6;
  position[2]=s.z-dz*distance*.65+dx*distance*.8;
  target[0]=s.x+dx*8;target[1]=s.height*.75;target[2]=s.z+dz*8;
  let nearest=l.ringBody,best=Infinity;
  for(const b of l.spec.bodies) {
    if(b.id==='jupiter')continue;
    const d=Math.hypot(s.x-b.position[0],s.z-b.position[1])-b.radius;
    if(d<best){best=d;nearest=b;}
  }
  const weight=Math.max(0,1-best/30)*.48;
  target[0]+=(nearest.position[0]-target[0])*weight;
  target[1]*=1-weight;target[2]+=(nearest.position[1]-target[2])*weight;
  if(close) {
    position[0]=s.x-8;position[1]=s.height+7;position[2]=s.z-11;
    target[0]=s.x*.25+l.titan.position[0]*.75;
    target[1]=s.height*.25;target[2]=s.z*.25+l.titan.position[1]*.75;
  }
  return close?38:50;
}
/** Prediction/window intersection uses segments, including a crossing between samples. */
export function predictedPhoto(l:FlybyLayout,points:Float32Array,index:number) {
  const p=l.spec.photos[index];if(!p)return false;
  for(let i=3;i<points.length;i+=3) {
    const ax=points[i-3],az=points[i-1],dx=points[i]-ax,dz=points[i+2]-az;
    const t=Math.max(0,Math.min(1,((p.center[0]-ax)*dx+(p.center[1]-az)*dz)/(dx*dx+dz*dz||1)));
    if(Math.hypot(ax+dx*t-p.center[0],az+dz*t-p.center[1])<=p.radius)return true;
  }
  return false;
}
/** Only interior local minima are periapses; endpoints are not yet closest approaches. */
export function predictedPeriapsis(l:FlybyLayout,points:Float32Array) {
  let sample=-1,best=Infinity;
  for(const b of l.spec.bodies) {
    if(!b.mass)continue;
    for(let i=3;i<points.length-3;i+=3) {
      const d=Math.hypot(points[i]-b.position[0],points[i+2]-b.position[1]);
      const before=Math.hypot(points[i-3]-b.position[0],points[i-1]-b.position[1]);
      const after=Math.hypot(points[i+3]-b.position[0],points[i+5]-b.position[1]);
      if(d<before&&d<=after&&d-b.radius<Math.max(10,b.radius*2)&&d-b.radius<best){sample=i/3;best=d-b.radius;}
    }
  }
  return sample;
}
export function generateFlyby(spec: FlybySpec): FlybyLayout {
  const titan = spec.bodies.find(b => b.id === spec.titan), ringBody = spec.bodies.find(b => b.id === spec.rings.body);
  if (!titan || !ringBody) throw new Error('引力弹弓缺少天体');
  return {spec, titan, ringBody};
}
export function createFlight(l: FlybyLayout): FlybyState {
  return {x: l.spec.spawn[0], z: l.spec.spawn[1], vx: l.spec.velocity[0], vz: l.spec.velocity[1],
    time: 0, fuel: FLYBY.fuel, shield: FLYBY.shield, cooldown: 0, photos: 0, gapTime: 0,
    gap: false, hidden: false, encounter: false, departing: false, height: 0, status: 'flying'};
}
/** 0 = clear space, 1 = particles, 2 = Cassini gap. Above the ring plane there is no contact. */
export function ringZone(l: FlybyLayout, s: Pick<FlybyState, 'x' | 'z' | 'height'>) {
  const r = Math.hypot(s.x - l.ringBody.position[0], s.z - l.ringBody.position[1]), ring = l.spec.rings;
  if (s.height > 2 || r < ring.inner || r > ring.outer) return 0;
  return r >= ring.gap[0] && r <= ring.gap[1] ? 2 : 1;
}
/** A short fire-element pulse along velocity. Timing, rather than free steering, changes periapsis. */
export function boost(s: FlybyState) {
  if (s.status !== 'flying' || s.fuel <= 0 || s.cooldown > 0) return false;
  const speed = Math.hypot(s.vx, s.vz);
  if (speed < 1e-8) return false;
  s.vx += s.vx / speed * FLYBY.impulse; s.vz += s.vz / speed * FLYBY.impulse;
  s.fuel--; s.cooldown = FLYBY.cooldown; return true;
}
export function advanceFlight(l: FlybyLayout, s: FlybyState, dt = FLYBY.step) {
  if (!Number.isFinite(dt) || dt <= 0 || s.status !== 'flying') return;
  // Always substep external durations, including prediction callers.
  let remaining = dt;
  while (remaining > 1e-10 && s.status === 'flying') {
    const h = Math.min(remaining, FLYBY.step); remaining -= h;
    let ax = 0, az = 0;
    for (const b of l.spec.bodies) {
      const dx = b.position[0] - s.x, dz = b.position[1] - s.z;
      const d = Math.max(FLYBY.softening, Math.hypot(dx, dz));
      const pull = FLYBY.gravity * b.mass / Math.pow(d, FLYBY.falloff + 1);
      ax += dx * pull; az += dz * pull;
    }
    s.vx += ax * h; s.vz += az * h; s.x += s.vx * h; s.z += s.vz * h;
    s.time += h; s.cooldown = Math.max(0, s.cooldown - h);
    const zone = ringZone(l, s);
    if (zone === 1) {
      const drag = Math.exp(-FLYBY.ringDrag * h); s.vx *= drag; s.vz *= drag;
      // The jelly automatically spreads into a shock-absorbing skin in the particle belt.
      s.shield = Math.max(0, s.shield - FLYBY.ringDamage * (1 - FLYBY.spreadProtection) * h);
    }
    if (zone === 2) { s.gapTime += h; if (s.gapTime >= 1) s.gap = true; }
    const tx = s.x - l.titan.position[0], tz = s.z - l.titan.position[1], distance = Math.hypot(tx, tz);
    if (distance <= l.spec.encounterRadius) s.encounter = true;
    if (s.encounter && tx * s.vx + tz * s.vz > 0) s.departing = true;
    // A cinematic height channel, not an extra steering axis or a claim of orbital accuracy.
    if (s.departing) s.height += FLYBY.liftSpeed * h;
    for (const b of l.spec.bodies) if (Math.hypot(s.x - b.position[0], s.z - b.position[1], s.height) < b.radius + .25) s.status = 'lost';
    if (s.shield <= 0 || s.time >= l.spec.timeLimit || Math.abs(s.x) > 125 || Math.abs(s.z) > 100) s.status = 'lost';
    if (s.status === 'flying' && s.departing && distance >= l.spec.escapeRadius && s.height >= 5) s.status = 'won';
  }
}
export function photoAvailable(l: FlybyLayout, s: FlybyState, index: number) {
  const p = l.spec.photos[index];
  return !!p && s.status === 'flying' && !(s.photos & (1 << index)) &&
    Math.hypot(s.x - p.center[0], s.z - p.center[1]) <= p.radius;
}
export function photograph(l: FlybyLayout, s: FlybyState) {
  for (let i = 0; i < l.spec.photos.length; i++) if (photoAvailable(l, s, i)) { s.photos |= 1 << i; return i; }
  return -1;
}
export function findRecord(l: FlybyLayout, s: FlybyState) {
  if (s.status !== 'flying' || s.hidden || Math.hypot(s.x - l.spec.hidden.position[0], s.z - l.spec.hidden.position[1]) > l.spec.hidden.radius) return false;
  s.hidden = true; return true;
}
export const photoCount = (s: FlybyState) => { let n = s.photos, count = 0; while (n) { count += n & 1; n >>>= 1; } return count; };
export const fuelMedal = (spec: FlybySpec, fuel: number) => fuel >= spec.medals.gold ? 3 : fuel >= spec.medals.silver ? 2 : 1;
/** Reuse both scratch and output in the render loop: no future state leaks into the live flight. */
export function predictFlight(l: FlybyLayout, s: FlybyState, out: Float32Array, scratch: FlybyState) {
  Object.assign(scratch, s);
  const stride = FLYBY.predictionSeconds / (FLYBY.predictionSamples - 1);
  for (let i = 0; i < FLYBY.predictionSamples; i++) {
    out[i * 3] = scratch.x; out[i * 3 + 1] = scratch.height + .35; out[i * 3 + 2] = scratch.z;
    if (i < FLYBY.predictionSamples - 1) advanceFlight(l, scratch, stride);
  }
  return out;
}
export function validateFlyby(l: FlybyLayout) {
  const s = l.spec, errors: string[] = [], ids = new Set(s.bodies.map(b => b.id));
  if (ids.size !== s.bodies.length || s.bodies.some(b => b.radius <= 0 || b.mass < 0 || ![...b.position, b.mass, b.radius].every(Number.isFinite))) errors.push('天体参数无效');
  if (s.photos.length !== 6 || new Set(s.photos.map(p => p.id)).size !== 6 || s.photos.some(p => !ids.has(p.body) || p.radius <= 0 || ![...p.center, p.radius].every(Number.isFinite))) errors.push('需要六个独立快门窗口');
  if (!(s.rings.inner > l.ringBody.radius && s.rings.inner < s.rings.gap[0] && s.rings.gap[0] < s.rings.gap[1] && s.rings.gap[1] < s.rings.outer)) errors.push('光环缝隙无效');
  if (![...s.spawn, ...s.velocity, s.timeLimit, s.encounterRadius, s.escapeRadius].every(Number.isFinite) || Math.hypot(...s.velocity) <= 0 || s.timeLimit <= 0 || s.encounterRadius <= l.titan.radius || s.escapeRadius <= s.encounterRadius) errors.push('航程参数无效');
  return {ok: errors.length === 0, errors};
}
