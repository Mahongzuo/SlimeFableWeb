import {ITEMS} from '../life/catalog';
import {cook, cookable, nearest, FIRE} from '../life/cooking';
import {deliver, requester, today} from '../life/requests';
import {SERIF, paperCard, tagTexture} from '../home/paper';
import type {PlayerHandle, ZoneContext} from './types';
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const needs = (n: Record<string, number>) => Object.entries(n).map(([k, c]) => `${ITEMS[k].icon}${ITEMS[k].name}×${c}`).join(' ');
/**
 * 凝露小厨 (a brick stove with a wok: cook dishes from your harvest, fire element lights it) and the 委托板
 * (three requests a day, delivered for shells). Both stand at the park gate, right off the harbour plaza.
 */
export function plazaLife(z: ZoneContext, root: any, stove: [number, number], board: [number, number]) {
  const {T, life} = z; let player: PlayerHandle | null = null;
  // ---- stove
  const s = new T.Group(); s.name = 'cook-stove'; s.position.set(stove[0], z.ground(stove[0], stove[1]), stove[1]); s.rotation.y = Math.PI * .85; root.add(s);
  const brick = z.toon(0xb65a40), stone = z.toon(0xb8b1a3), iron = z.toon(0x3b3f42), wood = z.toon(0x8a6a48);
  const add = (geo: any, mat: any, x: number, y: number, zz: number, name = 'cook-stove-part') => { const m = new T.Mesh(geo, mat); m.position.set(x, y, zz); m.castShadow = m.receiveShadow = true; m.name = name; s.add(m); return m; };
  add(new T.BoxGeometry(1.6, .8, 1), brick, 0, .4, 0); add(new T.BoxGeometry(1.7, .08, 1.1), stone, 0, .84, 0);
  add(new T.SphereGeometry(.42, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), iron, -.3, 1.0, 0).scale.y = .5; // wok
  add(new T.CylinderGeometry(.06, .06, .5, 6), wood, .05, 1.0, 0).rotation.z = Math.PI / 2;
  add(new T.BoxGeometry(.4, 1.6, .4), brick, .55, 1.6, -.25); add(new T.BoxGeometry(.5, .08, .5), stone, .55, 2.42, -.25); // chimney
  const fire = add(new T.BoxGeometry(.5, .25, .05), z.toon(0xf08a3c, {emissive: 0xf08a3c, emissiveIntensity: .2, noCache: true}), -.3, .3, .52, 'cook-fire-fx');
  const signTex = tagTexture(T, (g, w, h) => { paperCard(g, w, h, '#2f2a24', '#f6e7c8'); g.fillStyle = '#9d3b27'; g.textAlign = 'center'; g.font = `900 86px ${SERIF}`; g.fillText('凝露小厨', w / 2 - 6, 150); });
  const sign = add(new T.PlaneGeometry(1.1, .55), z.toon(0xffffff, {map: signTex}), 0, 2.15, .21, 'cook-sign'); sign.userData.walkThrough = true;
  add(new T.BoxGeometry(.06, 1.4, .06), wood, -.5, 1.55, .2); add(new T.BoxGeometry(.06, 1.4, .06), wood, .5, 1.55, .2);
  const steam = Array.from({length: 6}, (_, i) => { const p = z.ctx.mats.glowSprite(0xffffff, .5, 0); p.name = 'cook-steam-fx'; p.position.set(-.3, 1.2 + i * .25, 0); s.add(p); return p; });
  let cooking = 0;
  z.interact({id: 'cook-stove', position: [stove[0], z.ground(stove[0], stove[1]), stove[1]], radius: 2.4,
    prompt: () => {
      const list = cookable(life);
      if (!list.length) { const n = nearest(life); return {title: '凝露小厨', sub: `差一点就能做${ITEMS[n.recipe.id].name}：${needs(n.recipe.needs)}`}; }
      const r = list[0]; return player?.element === FIRE ? {title: `做一份${ITEMS[r.id].name}`, sub: needs(r.needs)} : {title: `可以做${ITEMS[r.id].name}了`, sub: '先切到火属性（3）点着灶火'};
    },
    act: () => {
      const r = cookable(life)[0]; if (!r) return;
      const res = cook(life, r.id, player?.element ?? 0);
      if (res.reason === 'fire') { player?.toast('灶膛是冷的：切到火属性（按 3）再来点火'); return; }
      if (res.ok) { z.save(); cooking = 2.2; player?.mood('Happy', 1.4); player?.toast(`${ITEMS[r.id].icon} 做好了${ITEMS[r.id].name}${res.first ? ' · 图鉴新增！' : ''}`, 3000); }
    }});
  // ---- request board
  const b = new T.Group(); b.name = 'request-board'; b.position.set(board[0], z.ground(board[0], board[1]), board[1]); b.rotation.y = -Math.PI * .8; root.add(b);
  for (const x of [-.85, .85]) { const p = new T.Mesh(new T.BoxGeometry(.12, 2.2, .12), wood); p.position.set(x, 1.1, 0); p.castShadow = true; b.add(p); }
  const panel = new T.Mesh(new T.BoxGeometry(1.9, 1.2, .08), z.toon(0x9c7a52)); panel.position.y = 1.45; panel.castShadow = true; b.add(panel);
  const roof = new T.Mesh(new T.BoxGeometry(2.2, .1, .5), z.toon(0x5d6266)); roof.position.y = 2.2; b.add(roof);
  const boardTex = tagTexture(T, (g, w, h) => { g.fillStyle = '#9c7a52'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6e7c8'; g.fillRect(0, 0, w, 64); g.fillStyle = '#9d3b27'; g.textAlign = 'center'; g.font = `900 46px ${SERIF}`; g.fillText('委 托 板', w / 2, 48);
    [[40, 90, -.05], [190, 96, .04], [340, 88, -.02]].forEach(([x, y, r]) => { g.save(); g.translate(x + 60, y + 70); g.rotate(r); g.fillStyle = '#fbf6ea'; g.fillRect(-62, -70, 124, 140); g.fillStyle = '#c8553d'; g.beginPath(); g.arc(0, -62, 7, 0, 7); g.fill(); g.fillStyle = '#5b5249'; for (let k = 0; k < 5; k++) g.fillRect(-46, -38 + k * 20, 70 + (k * 23) % 22, 6); g.restore(); }); }, 512, 256);
  const face = new T.Mesh(new T.PlaneGeometry(1.8, .9), z.toon(0xffffff, {map: boardTex})); face.position.set(0, 1.45, .045); b.add(face);
  z.interact({id: 'request-board', position: [board[0], z.ground(board[0], board[1]), board[1]], radius: 2.4,
    prompt: () => { const list = today(life, dayKey()), open = list.filter(q => !q.done); if (!open.length) return {title: '今天的委托都完成了', sub: '明天再来看看'};
      const ready = open.find(q => (life.bag[q.item] ?? 0) >= q.count), q = ready ?? open[0];
      return {title: ready ? `交付：${ITEMS[q.item].icon}${ITEMS[q.item].name}×${q.count} → ${q.reward} 🐚` : `委托 ${3 - open.length + 1}/3 · ${requester(q)}`, sub: ready ? `${requester(q)}的委托` : `想要 ${ITEMS[q.item].icon}${ITEMS[q.item].name}×${q.count} · 报酬 ${q.reward} 🐚（背包里有 ${life.bag[q.item] ?? 0}）`}; },
    act: () => { const day = dayKey(), open = today(life, day).filter(q => !q.done), q = open.find(x => (life.bag[x.item] ?? 0) >= x.count);
      if (!q) { player?.toast(open.map(x => `${ITEMS[x.item].icon}${ITEMS[x.item].name}×${x.count}`).join('　') || '今天的委托都完成了', 3600); return; }
      const r = deliver(life, day, q.id); if (r.ok) { z.save(); player?.mood('Happy', 1.4); player?.toast(`${requester(q)}：谢谢你！收到 ${r.reward} 🐚`, 3000); } }});
  return (t: number, dt: number, p: PlayerHandle) => {
    player = p; cooking = Math.max(0, cooking - dt);
    (fire.material as any).emissiveIntensity = p.element === FIRE && Math.hypot(p.position[0] - stove[0], p.position[2] - stove[1]) < 4 ? 1.4 + Math.sin(t * 20) * .3 : .15;
    steam.forEach((sp: any, i: number) => { const k = (t * .5 + i / steam.length) % 1; sp.position.y = 1.15 + k * 1.4; sp.position.x = -.3 + Math.sin(t + i) * .08; sp.material.opacity = (cooking > 0 ? .55 : .12) * Math.sin(k * Math.PI); });
  };
}
