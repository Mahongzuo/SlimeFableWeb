import {awake, CRITTER_KINDS, logCatch, spawnCritter, stepCritter, type Critter} from '../life/critters';
import {ITEMS} from '../life/catalog';
import type {PlayerHandle, ZoneContext} from './types';
/** Placeholder bodies: [body colour, accent colour, body scale xyz]. Zone cards may swap in proper models by kind id. */
const LOOK: Record<string, [number, number, [number, number, number]]> = {
  'critter-butterfly': [0xf2a7b5, 0xffffff, [.16, .04, .1]], 'critter-ladybug': [0xd8392b, 0x2f2a24, [.09, .06, .11]], 'critter-dragonfly': [0x3f8f8a, 0xbfe0ff, [.22, .03, .05]],
  'critter-frog': [0x6aa84f, 0xf2e6a0, [.16, .11, .18]], 'critter-rabbit': [0xd9cbb4, 0xffffff, [.2, .2, .28]], 'critter-squirrel': [0xb5652f, 0xe3c39b, [.14, .16, .22]],
  'critter-hedgehog': [0x7a5f48, 0xd9c7a8, [.18, .13, .22]], 'critter-beetle': [0x2d4b6e, 0x111111, [.1, .07, .13]], 'critter-firefly': [0xfff3a0, 0xffe066, [.06, .06, .08]], 'critter-owl': [0x8c7254, 0xf2e2c4, [.22, .3, .2]],
};
/** Spawn the zone's critters around `homes`, run them every frame, catch on touch. */
export function critterField(z: ZoneContext, root: any, zone: 'forest' | 'farm' | 'lake' | 'park', homes: [number, number][]) {
  const {T, life} = z, kinds = CRITTER_KINDS.filter(k => k.zone === zone); if (!kinds.length) return () => {};
  const group = new T.Group(); group.name = 'critters-fx'; root.add(group);
  const items = homes.map((h, i) => {
    const kind = kinds[i % kinds.length], c = spawnCritter(kind, h), [body, accent, s] = LOOK[kind.id];
    const g = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(1, 10, 8), z.toon(body, kind.id === 'critter-firefly' ? {emissive: 0xffe066, emissiveIntensity: 1.4} : {})); b.scale.set(...s); g.add(b);
    const head = new T.Mesh(new T.SphereGeometry(1, 8, 6), z.toon(accent)); head.scale.setScalar(Math.min(...s) * .7); head.position.set(0, s[1] * .5, s[2] * .9); g.add(head);
    if (kind.fly) for (const side of [-1, 1]) { const w = new T.Mesh(new T.PlaneGeometry(s[0] * 1.6, s[2] * 1.2), z.ctx.mats.flat(accent, {transparent: true, opacity: .8, side: T.DoubleSide})); w.position.x = side * s[0] * .9; w.rotation.x = -Math.PI / 2; w.userData.wing = side; g.add(w); }
    g.traverse((m: any) => { if (m.isMesh) m.castShadow = true; }); group.add(g);
    return {c, g, phase: Math.random() * 6};
  });
  const t0 = {v: 0};
  return (t: number, dt: number, p: PlayerHandle) => {
    t0.v += dt; const hour = new Date().getHours(), speed = Math.hypot(p.velocity[0], p.velocity[2]);
    for (const it of items) {
      const {c, g} = it, live = awake(c.kind, hour); g.visible = live && c.mood !== 'caught'; if (!live) continue;
      const near = Math.hypot(c.pos[0] - p.position[0], c.pos[1] - p.position[2]) < 40; if (!near && c.mood !== 'caught') continue;
      const before = [...c.pos];
      if (stepCritter(c, {pos: [p.position[0], p.position[2]], speed, spread: p.spread}, dt, Math.random) === 'caught') {
        const first = logCatch(life, c.kind.id); z.save(); const item = ITEMS[c.kind.id];
        p.toast(`${item.icon} 捉到${item.name}！${first ? '图鉴新增 · ' : ''}轻轻放走了`, 2600); p.mood('Happy', 1.2);
      }
      const y = z.ground(c.pos[0], c.pos[1]), moving = Math.hypot(c.pos[0] - before[0], c.pos[1] - before[1]) > 1e-4;
      const hop = c.kind.hop && moving ? Math.abs(Math.sin((t + it.phase) * 9)) * c.kind.hop : 0, fly = c.kind.fly ? c.kind.fly + Math.sin((t + it.phase) * 2.2) * .25 : 0;
      g.position.set(c.pos[0], y + LOOK[c.kind.id][2][1] + hop + fly, c.pos[1]);
      if (moving) g.rotation.y = Math.atan2(c.dir[0], c.dir[1]);
      g.scale.setScalar(c.mood === 'alert' ? 1.12 : 1);
      for (const w of g.children) if (w.userData.wing) w.rotation.z = w.userData.wing * Math.sin((t + it.phase) * 26) * .9;
    }
  };
}
export type {Critter};
