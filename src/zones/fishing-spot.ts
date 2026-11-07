import {FishingSession, GREEN, landCatch, type FishSpot} from '../life/fishing';
import {ITEMS} from '../life/catalog';
import {takeItem} from '../life/state';
import type {Vec} from '../slime/types';
import type {PlayerHandle, ZoneContext} from './types';
/**
 * A place to fish: F casts, F again when the float dips hooks, then hold F (or the left mouse button) to reel
 * while keeping the needle in the green. Walking away or Esc puts the rod down.
 */
export function fishingSpot(z: ZoneContext, id: string, stand: Vec, toward: [number, number], spot: FishSpot) {
  const {T, life} = z, floatAt = new T.Vector3(stand[0] + toward[0] * 4.2, 0, stand[2] + toward[1] * 4.2);
  const water = spot === 'lake' ? -.45 : -1.8;
  const bob = new T.Group(); bob.name = 'fishing-float'; bob.visible = false; z.ctx.scene.add(bob);
  const top = new T.Mesh(new T.SphereGeometry(.09, 10, 8), z.toon(0xe0453a)); top.position.y = .05; const low = new T.Mesh(new T.SphereGeometry(.085, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), z.toon(0xffffff)); bob.add(top, low);
  const line = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), new T.LineBasicMaterial({color: 0x2f2a24})); line.name = 'fishing-line'; line.visible = false; line.frustumCulled = false; z.ctx.scene.add(line);
  let session: FishingSession | null = null, held = false, closeIn = 0, player: PlayerHandle | null = null, t0 = 0;
  const down = (e: KeyboardEvent) => { if (e.code === 'KeyF' && !e.repeat) { if (session?.phase === 'bite') session.hook(); held = true; } if (e.code === 'Escape' && session) stop('收竿了'); };
  const up = (e: KeyboardEvent) => { if (e.code === 'KeyF') held = false; };
  addEventListener('keydown', down); addEventListener('keyup', up);
  addEventListener('pointerdown', e => { if (session?.phase === 'reel' && e.button === 0) held = true; }); addEventListener('pointerup', () => held = false);
  function stop(msg?: string) { session = null; bob.visible = line.visible = false; z.hud?.fishing(null); player?.lock(false); if (msg) player?.toast(msg); }
  z.interact({id, position: stand, radius: 2,
    prompt: () => session ? null : {title: '钓鱼', sub: `${(life.bag['bait-glow'] ?? 0) ? '会先用发光饵 · ' : ''}F 甩竿，浮漂一沉就按 F`},
    act: () => {
      if (session) return;
      const bait = (life.bag['bait-glow'] ?? 0) > 0 ? 'bait-glow' : null; if (bait) takeItem(life, bait);
      const hour = new Date().getHours(), raining = (z.ctx.weather?.rain ?? 0) > .3;
      session = new FishingSession(spot, {hour, raining, historyDay: z.historyDay?.() ?? false}, Math.random, bait); held = false; closeIn = 0;
      player?.lock(true); bob.visible = line.visible = true; t0 = 0;
    }});
  return (t: number, dt: number, p: PlayerHandle) => {
    player = p; if (!session) return;
    const s = session, d = Math.hypot(p.position[0] - stand[0], p.position[2] - stand[2]);
    if (d > 4) { stop('收竿了'); return; }
    s.update(dt, held); t0 += dt;
    // float + line
    const dip = s.phase === 'bite' ? -.12 : s.phase === 'reel' ? -.05 + Math.sin(t * 30) * .03 : 0, cast = Math.min(1, t0 / .6);
    const fx = stand[0] + (floatAt.x - stand[0]) * cast, fz = stand[2] + (floatAt.z - stand[2]) * cast;
    bob.position.set(fx, water + .02 + dip + Math.sin(t * 2.4) * .015 + (1 - cast) * Math.sin(cast * Math.PI) * 1.5, fz);
    const a = line.geometry.attributes.position; a.setXYZ(0, p.position[0], p.position[1] + .6, p.position[2]); a.setXYZ(1, bob.position.x, bob.position.y + .1, bob.position.z); a.needsUpdate = true;
    const help = '<span class="key">F</span> / 左键 按住收线，松开放线 · <span class="key">Esc</span> 收竿';
    if (s.phase === 'cast' || s.phase === 'wait') z.hud?.fishing({title: s.misses ? '鱼溜了一下…再等等' : '等鱼咬钩…', help: '浮漂一沉，马上按 <span class="key">F</span>'});
    else if (s.phase === 'bite') { z.hud?.fishing({title: '咬钩了！快按 F', help: '机会只有一瞬间'}); p.mood('Surprised', .3); }
    else if (s.phase === 'reel') z.hud?.fishing({title: '拉住它！', help, tension: s.tension, progress: s.progress, green: GREEN, alarm: s.tension > .85});
    else if (!closeIn) {
      closeIn = 1.4;
      if (s.phase === 'caught') { const c = s.result()!, first = landCatch(life, c), item = ITEMS[c.fish]; z.save(); p.mood('Happy', 1.4);
        z.hud?.fishing({title: `钓到 ${item.name} · ${c.size} cm${first ? ' · 图鉴新增！' : ''}`, help: item.desc}); }
      else { z.hud?.fishing({title: s.tension >= 1 ? '线断了…' : '鱼跑了', help: '下次浮漂一沉就按 F，收线时别一直按着'}); p.mood('Hurt', .8); }
    } else if ((closeIn -= dt) <= 0) stop();
  };
}
