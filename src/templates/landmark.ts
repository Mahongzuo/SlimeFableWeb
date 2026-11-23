import type {LandmarkPoint, LandmarkSpec, LandmarkLeg} from '../../content/levels/types';

const speeds = {walk: 2.4, climb: 1.55, jump: 4.6, slide: 7.4};
export function generateLandmark(spec: LandmarkSpec) {
  return spec.route.map((leg, i) => {
    const start = i ? spec.route[i - 1].end : spec.spawn;
    const delta = leg.end.map((v, axis) => v - start[axis]);
    return {...leg, start, length: Math.hypot(...delta)};
  });
}
export type Route = ReturnType<typeof generateLandmark>;
export function validateLandmark(route: Route) {
  const errors: string[] = [];
  if (!route.length) errors.push('缺少路线');
  for (const [i, leg] of route.entries()) {
    const [dx, dy, dz] = leg.end.map((v, axis) => v - leg.start[axis]);
    if (!Number.isFinite(leg.length) || leg.length <= 0) errors.push('路段无效 ' + i);
    if (i && leg.start.some((v, axis) => v !== route[i - 1].end[axis])) errors.push('路段断开 ' + i);
    const span = Math.hypot(dx, dz);
    if (leg.action === 'walk' && Math.abs(dy) > .35 * span) errors.push('步道过陡');
    if (leg.action === 'climb' && (span > .5 || dy <= 0)) errors.push('缺少连续塔壁');
    if (leg.action === 'jump' && (span > 3.8 || dy > 1.7)) errors.push('蹬跳距离过大');
    if (leg.action === 'slide' && (dy >= 0 || -dy < span * .12)) errors.push('缆索坡度不足');
  }
  return {ok: !errors.length, errors};
}
export interface Climber {leg: number; t: number; launched: boolean}
export function advanceClimb(state: Climber, route: Route, action: LandmarkLeg['action'] | null, dt: number) {
  const leg = route[state.leg];
  if (!leg) return;
  if (action === leg.action && (action === 'jump' || action === 'slide')) state.launched = true;
  if (!state.launched && action !== leg.action) return;
  state.t = Math.min(1, state.t + dt * speeds[leg.action] / leg.length);
  if (state.t >= 1) { state.t = 0; state.leg++; state.launched = false; }
}
export function pointOnLeg(leg: Route[number], t: number, out: LandmarkPoint) {
  for (let i = 0; i < 3; i++) out[i] = leg.start[i] + (leg.end[i] - leg.start[i]) * t;
  if (leg.action === 'jump') out[1] += 1.8 * 4 * t * (1 - t);
  if (leg.action === 'slide') out[1] -= .65 * 4 * t * (1 - t);
  return out;
}
