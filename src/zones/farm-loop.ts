import {CROPS, ITEMS} from '../life/catalog';
import {burnWeeds, growth, harvest, phase, plant, water} from '../life/farming';
import {addItem} from '../life/state';
import type {PlayerHandle, ZoneContext} from './types';
/** Crop colours (body, accent) per seed. */
const LOOK: Record<string, [number, number]> = {'seed-radish': [0x6fae4f, 0xe86f3c], 'seed-tomato': [0x5f9f4a, 0xe0453a], 'seed-corn': [0x7fae46, 0xf0c64a], 'seed-strawberry': [0x5b9a4c, 0xe2475a], 'seed-sunflower': [0x6a9e45, 0xf4c430], 'seed-pumpkin': [0x5c8f43, 0xeb8a2f]};
export interface PlotSpot {id: string; x: number; z: number; y: number}
/**
 * Wire the terrace plots to life/farming: per-plot crop meshes that follow growth, F to plant / water / burn weeds /
 * harvest, a seed stall and a buying station. Returns the per-frame update.
 */
export function farmLoop(z: ZoneContext, root: any, plots: PlotSpot[], stall: {x: number; z: number}) {
  const {T, life} = z, rand = Math.random, now = () => Date.now();
  const soilDry = 0x8b6b4a, soilWet = 0x5e4632, leaf = new T.ConeGeometry(.16, .5, 5).translate(0, .25, 0), fruit = new T.IcosahedronGeometry(.13, 0), weed = new T.ConeGeometry(.07, .35, 3).translate(0, .17, 0);
  const visuals = plots.map(p => {
    const g = new T.Group(); g.name = 'crop-' + p.id; g.position.set(p.x, p.y + .1, p.z); root.add(g);
    const soil = new T.Mesh(new T.PlaneGeometry(6.4, 3.4).rotateX(-Math.PI / 2), z.toon(soilDry, {noCache: true})); soil.name = 'crop-soil-tint'; soil.position.y = .002; g.add(soil);
    const plants = new T.InstancedMesh(leaf, z.toon(0xffffff), 15), fruits = new T.InstancedMesh(fruit, z.toon(0xffffff), 15), weeds = new T.InstancedMesh(weed, z.toon(0x6b8f3a), 10);
    for (const m of [plants, fruits, weeds]) { m.count = 0; m.castShadow = true; g.add(m); }
    return {p, g, soil, plants, fruits, weeds, key: ''};
  });
  const m4 = new T.Matrix4(), q = new T.Quaternion(), col = new T.Color();
  function draw(v: typeof visuals[number]) {
    const s = life.plots[v.p.id], t = now(), ph = phase(s, t), g = s ? growth(s, t) : 0, wet = !!s && t < s.watered;
    const key = `${ph}|${s?.crop}|${Math.round(g * 20)}|${wet}|${s?.weeds}`; if (key === v.key) return; v.key = key;
    (v.soil.material as any).color.setHex(wet ? soilWet : soilDry);
    v.plants.count = v.fruits.count = v.weeds.count = 0; if (!s) return;
    const [body, accent] = LOOK[s.crop] ?? [0x6fae4f, 0xffffff], dead = ph === 'withered', h = .25 + .9 * g;
    let i = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++, i++) {
      const x = -2.4 + c * 1.2, zz = -1 + r; m4.compose(new T.Vector3(x, 0, zz), q, new T.Vector3(.7 + g * .6, h, .7 + g * .6)); v.plants.setMatrixAt(i, m4);
      v.plants.setColorAt(i, col.setHex(dead ? 0x8a7a55 : body));
      if (ph === 'ripe') { m4.compose(new T.Vector3(x, h * .55, zz + .12), q, new T.Vector3(1, 1, 1)); v.fruits.setMatrixAt(v.fruits.count, m4); v.fruits.setColorAt(v.fruits.count++, col.setHex(accent)); }
    }
    v.plants.count = 15; if (s.weeds) for (let k = 0; k < 10; k++) { m4.compose(new T.Vector3(-3 + rand() * 6, 0, -1.5 + rand() * 3), q, new T.Vector3(1, 1, 1)); v.weeds.setMatrixAt(v.weeds.count++, m4); }
    for (const m of [v.plants, v.fruits, v.weeds]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
  let player: PlayerHandle | null = null;
  const seeds = () => Object.keys(life.bag).filter(id => CROPS[id]).sort((a, b) => CROPS[a].growMs - CROPS[b].growMs);
  const gift = () => { if (life.records['gift-seeds']) return; life.records['gift-seeds'] = 1; addItem(life, 'seed-radish', 3); addItem(life, 'seed-tomato', 2); z.save(); player?.toast('农场送你 3 包萝卜种子、2 包番茄种子 🌱', 3600); };
  for (const v of visuals) z.interact({
    id: v.p.id, position: [v.p.x, v.p.y, v.p.z], radius: 3.6,
    prompt: () => {
      const s = life.plots[v.p.id], ph = phase(s, now()), name = s ? ITEMS[CROPS[s.crop].crop].name : '';
      if (ph === 'empty') { const list = seeds(); return list.length ? {title: `种下${ITEMS[list[0]].name}`, sub: `背包里还有 ${life.bag[list[0]]} 包 · 长成要 ${CROPS[list[0]].growMs / 60000} 分钟`} : {title: life.records['gift-seeds'] ? '没有种子了' : '领取新手种子', sub: life.records['gift-seeds'] ? '去农场入口的种子铺买一包' : '第一次来，农场送你几包'}; }
      if (ph === 'ripe') return {title: `收获${name}`, sub: '熟透了！'};
      if (ph === 'withered') return {title: '清理枯苗', sub: '放太久了，下次早点来'};
      if (s!.weeds && player?.element === 2) return {title: '烧掉杂草', sub: '火属性：杂草会让作物长得慢一半'};
      const wet = now() < s!.watered, pct = Math.round(growth(s!, now()) * 100);
      return {title: wet ? `${name} · ${pct}%` : `给${name}浇水`, sub: wet ? `土还湿着${s!.weeds ? ' · 有杂草，切火属性烧掉' : ''}` : player?.element === 0 ? '水属性浇水，湿润时间翻倍' : '只有土是湿的时候作物才会长'};
    },
    act: () => {
      const s = life.plots[v.p.id], ph = phase(s, now());
      if (ph === 'empty') { const list = seeds(); if (!list.length) { gift(); return; } plant(life, v.p.id, list[0], now()); water(life, v.p.id, now(), player?.element ?? 1, () => 1); player?.mood('Happy'); }
      else if (ph === 'ripe' || ph === 'withered') { const r = harvest(life, v.p.id, now(), rand); if (r && r.n) { player?.toast(`收获 ${ITEMS[r.item].icon} ${ITEMS[r.item].name} ×${r.n}`); player?.mood('Happy', 1.2); } }
      else if (s!.weeds && player?.element === 2) { burnWeeds(life, v.p.id, now()); player?.toast('🔥 杂草烧光了'); }
      else if (now() >= s!.watered) { water(life, v.p.id, now(), player?.element ?? 1, rand); player?.toast(player?.element === 0 ? '💧 水属性浇透了' : '💧 浇好水了'); }
      z.save(); v.key = '';
    },
  });
  // seed stall & buying station
  const sell = () => Object.entries(life.bag).filter(([id]) => ITEMS[id] && (ITEMS[id].kind === 'crop' || ITEMS[id].kind === 'fish'));
  z.interact({id: 'farm-buyer', position: [stall.x, z.ground(stall.x, stall.z), stall.z], radius: 2.2,
    prompt: () => { const list = sell(), total = list.reduce((s, [id, n]) => s + ITEMS[id].price * n, 0); return list.length ? {title: `卖掉收获 · ${total} 🐚`, sub: list.slice(0, 4).map(([id, n]) => `${ITEMS[id].icon}×${n}`).join(' ') + (list.length > 4 ? ' …' : '')} : {title: '收购站', sub: '作物和鱼都收，按图鉴价'}; },
    act: () => { const list = sell(); if (!list.length) return; let total = 0; for (const [id, n] of list) { total += ITEMS[id].price * n; delete life.bag[id]; } life.coins += total; z.save(); player?.toast(`卖了 ${total} 🐚`); player?.mood('Happy'); } });
  z.interact({id: 'farm-seeds', position: [stall.x + 3, z.ground(stall.x + 3, stall.z), stall.z], radius: 2.2,
    prompt: () => ({title: '买一包随机种子 · 5 🐚', sub: `你有 ${life.coins} 🐚 · 南瓜和向日葵比较少见`}),
    act: () => { if (life.coins < 5) { player?.toast('贝壳不够，先去卖点收获或钓点鱼'); return; } life.coins -= 5; const pool = ['seed-radish', 'seed-radish', 'seed-tomato', 'seed-tomato', 'seed-corn', 'seed-strawberry', 'seed-sunflower', 'seed-pumpkin'], id = pool[Math.floor(rand() * pool.length)]; addItem(life, id); z.save(); player?.toast(`得到 ${ITEMS[id].name} 🌱`); } });
  let acc = 0;
  return (_t: number, dt: number, p: PlayerHandle) => { player = p; acc -= dt; if (acc > 0) return; acc = .5; for (const v of visuals) draw(v); };
}
