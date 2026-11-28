import {changeShells} from '../life/shell-wallet';
import {ITEMS} from '../life/catalog';
import {addItem} from '../life/state';
import {FarmRegistry} from './farm-registry';
import type {PlayerHandle, ZoneContext} from './types';

export interface PlotSpot {id: string; x: number; z: number; y: number}

/**
 * Wire the terrace plots into the unified FarmRegistry (supporting 32 UE crops,
 * 6 plant styles, Seed Picker, and 6-element slash combat reactions),
 * plus the produce buyer and upgraded seed shop stall.
 */
export function farmLoop(z: ZoneContext, root: any, plots: PlotSpot[], stall: {x: number; z: number}) {
  const {life} = z;
  const rand = Math.random;
  let player: PlayerHandle | null = null;

  // Use shared FarmRegistry from Game if provided, otherwise create a local one (tests/standalone)
  const localRegistry = !z.farmRegistry;
  const registry = z.farmRegistry ?? new FarmRegistry({
    T: z.T,
    scene: root,
    life: z.life,
    toon: z.toon,
    save: z.save,
    dayKey: () => z.dayKey?.() ?? new Date().toISOString().slice(0, 10),
    openSeedPicker: z.openSeedPicker,
  });

  for (const p of plots) {
    registry.registerPlot({
      id: p.id,
      x: p.x,
      y: p.y,
      z: p.z,
      width: 6.4,
      depth: 3.4,
      rows: 3,
      cols: 5,
      soilOffsetY: 0.1,
      parent: root,
    });
  }
  if (localRegistry) {
    for (const inter of registry.getInteractables()) z.interact(inter);
  }

  // Produce buyer station
  const sell = () => Object.entries(life.bag).filter(([id]) => ITEMS[id] && (ITEMS[id].kind === 'crop' || ITEMS[id].kind === 'fish'));
  z.interact({
    id: 'farm-buyer', position: [stall.x, z.ground(stall.x, stall.z), stall.z], radius: 2.2,
    prompt: () => {
      const list = sell(), total = list.reduce((s, [id, n]) => s + ITEMS[id].price * n, 0);
      return list.length
        ? {title: `卖掉收获 · ${total} 🐚`, sub: list.slice(0, 4).map(([id, n]) => `${ITEMS[id].icon}×${n}`).join(' ') + (list.length > 4 ? ' …' : '')}
        : {title: '收购站', sub: '作物和鱼都收，按图鉴价'};
    },
    act: () => {
      const list = sell(); if (!list.length) return;
      let total = 0; for (const [id, n] of list) { total += ITEMS[id].price * n; delete life.bag[id]; }
      changeShells(life, total, 'earn'); z.save(); player?.toast(`卖了 ${total} 🐚`); player?.mood('Happy');
    },
  });

  // Seed shop stall
  z.interact({
    id: 'farm-seeds', position: [stall.x + 3, z.ground(stall.x + 3, stall.z), stall.z], radius: 2.4,
    prompt: () => ({title: '打开种子铺', sub: `你有 ${life.coins} 🐚 · 32 种 UE 作物种子自由挑选`}),
    act: () => {
      if (z.openSeedShop) {
        z.openSeedShop();
        return;
      }
      if (life.coins < 5) { player?.toast('贝壳不够，先去卖点收获或钓点鱼'); return; }
      changeShells(life, -(5), 'spend');
      const pool = ['seed-radish', 'seed-tomato', 'seed-chili', 'seed-mint', 'seed-strawberry', 'seed-watermelon', 'seed-rose'];
      const id = pool[Math.floor(rand() * pool.length)];
      addItem(life, id); z.save(); player?.toast(`得到 ${ITEMS[id].name} 🌱`);
    },
  });

  return (_t: number, dt: number, p: PlayerHandle) => {
    player = p;
    if (localRegistry) registry.update(dt, p);
  };
}
