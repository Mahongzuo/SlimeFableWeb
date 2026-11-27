import {riverLevel} from '../home/waterway';
import {beijingSky} from '../home/climate';
import {FishingSession, fishingBonuses, landCatch, type FishSpot} from '../life/fishing';
import {ITEMS} from '../life/catalog';
import {takeItem} from '../life/state';
import type {Vec} from '../slime/types';
import type {PlayerHandle, ZoneContext} from './types';

const BEHAVIOR_LABELS = {
  smooth: '平稳游动',
  sinker: '沉底猛坠',
  floater: '跃水浮游',
  dart: '高频突刺',
  legend: '鱼王狂暴！',
} as const;

/**
 * Upgraded Stardew-style Fishing Spot:
 * - Visible swimming fish shadow in water + jumping 3D catch arc on landing.
 * - Dynamic buoyant catch bar chasing 5 fish AI personalities + optional underwater Treasure Chest!
 * - Uses Beijing season, real weather (rain/snow), rod tier, food buffs & Fishing Museum Hall perk.
 */
export function fishingSpot(z: ZoneContext, id: string, stand: Vec, toward: [number, number], spot: FishSpot) {
  const {T, life} = z, floatAt = new T.Vector3(stand[0] + toward[0] * 4.2, 0, stand[2] + toward[1] * 4.2);
  const water = spot === 'lake' ? -.45 : riverLevel;

  const bob = new T.Group(); bob.name = 'fishing-float'; bob.visible = false; z.ctx.scene.add(bob);
  const top = new T.Mesh(new T.SphereGeometry(.09, 10, 8), z.toon(0xe0453a)); top.position.y = .05;
  const low = new T.Mesh(new T.SphereGeometry(.085, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), z.toon(0xffffff));
  bob.add(top, low);

  // Pine & Parcel-style 3D tapered bamboo fishing rod + expanding concentric water ripple rings around the bobber!
  const rodGroup = new T.Group(); rodGroup.name = 'fishing-rod'; rodGroup.visible = false;
  const rodShaft = new T.Mesh(new T.CylinderGeometry(0.014, 0.032, 2.35, 7), z.toon(0x9a7048));
  rodShaft.position.set(0, 1.15, 0);
  const rodGrip = new T.Mesh(new T.CylinderGeometry(0.038, 0.042, 0.34, 7), z.toon(0x4c3728));
  rodGrip.position.set(0, 0.16, 0);
  rodGroup.add(rodShaft, rodGrip);
  rodGroup.traverse((m: any) => { if (m.isMesh) { m.castShadow = true; m.layers.set(1); } });
  z.ctx.scene.add(rodGroup);

  const ripples: any[] = [];
  for (let i = 0; i < 2; i++) {
    const rMesh = new T.Mesh(
      new T.RingGeometry(0.88, 1.0, 32).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.72, depthWrite: false, side: T.DoubleSide}),
    );
    rMesh.name = `fishing-ripple-${i}`;
    rMesh.visible = false;
    rMesh.layers.set(1);
    rMesh.renderOrder = 6;
    z.ctx.scene.add(rMesh);
    ripples.push(rMesh);
  }

  // Subtle swimming fish shadow circling around the fishing zone
  const shadow = new T.Mesh(
    new T.SphereGeometry(0.28, 10, 6),
    new T.MeshBasicMaterial({color: 0x16323d, transparent: true, opacity: 0.42, depthWrite: false}),
  );
  shadow.scale.set(0.55, 0.14, 1.45);
  shadow.position.set(floatAt.x, water - 0.08, floatAt.z);
  shadow.layers.set(1);
  z.ctx.scene.add(shadow);

  const line = new T.Line(
    new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
    new T.LineBasicMaterial({color: 0x2f2a24}),
  );
  line.name = 'fishing-line'; line.visible = false; line.frustumCulled = false; z.ctx.scene.add(line);

  let session: FishingSession | null = null, held = false, closeIn = 0, player: PlayerHandle | null = null, t0 = 0;

  const down = (e: KeyboardEvent) => {
    if (e.code === 'KeyF' && !e.repeat) {
      if (session?.phase === 'bite') session.hook();
      held = true;
    }
    if (e.code === 'Escape' && session) stop('收竿了');
  };
  const up = (e: KeyboardEvent) => { if (e.code === 'KeyF') held = false; };
  addEventListener('keydown', down); addEventListener('keyup', up);
  addEventListener('pointerdown', e => { if (session?.phase === 'reel' && e.button === 0) held = true; });
  addEventListener('pointerup', () => held = false);

  function stop(msg?: string) {
    session = null; bob.visible = line.visible = rodGroup.visible = false;
    for (const r of ripples) r.visible = false;
    z.hud?.fishing(null); player?.lock(false);
    if (msg) player?.toast(msg);
  }

  function pickBestBait(historyDay: boolean): string | null {
    if (historyDay && (life.bag['bait-chronicle'] ?? 0) > 0) return 'bait-chronicle';
    if ((life.bag['bait-element'] ?? 0) > 0) return 'bait-element';
    if ((life.bag['bait-glow'] ?? 0) > 0) return 'bait-glow';
    if ((life.bag['bait-worm'] ?? 0) > 0) return 'bait-worm';
    return null;
  }

  z.interact({
    id, position: stand, radius: 2.2,
    prompt: () => {
      if (session) return null;
      const bait = pickBestBait(z.historyDay?.() ?? false);
      const baitHint = bait ? `使用${ITEMS[bait].icon}${ITEMS[bait].name} · ` : '';
      return {title: `垂钓（${spot === 'lake' ? '镜湖深潭' : spot === 'canal' ? '水巷浅滩' : spot === 'waterfall' ? '溪涧冷潭' : '凝露海岬'}）`, sub: `${baitHint}按 F 甩竿，浮漂一沉按 F 提竿追鱼！`};
    },
    act: () => {
      if (session) return;
      const historyDay = z.historyDay?.() ?? false;
      const bait = pickBestBait(historyDay);
      if (bait) takeItem(life, bait);
      const sky = beijingSky(Date.now());
      const hour = new Date().getHours();
      const raining = (z.ctx.weather?.rain ?? 0) > .3;
      const snowing = (z.ctx.weather?.snow ?? 0) > .3;
      const bonus = fishingBonuses(life);
      session = new FishingSession(
        spot,
        {hour, raining, snowing, season: sky.season, historyDay},
        Math.random,
        bait,
        {mode: 'stardew', rodTier: bonus.rodTier, barBonus: bonus.barBonus, treasureChance: 0.24 + bonus.treasureBonus},
      );
      held = false; closeIn = 0;
      player?.lock(true); bob.visible = line.visible = rodGroup.visible = true; t0 = 0;
    },
  });

  return (t: number, dt: number, p: PlayerHandle) => {
    player = p;
    // Animate ambient fish shadow circling peacefully
    const ang = t * 0.55 + floatAt.x * 0.3;
    shadow.position.set(floatAt.x + Math.cos(ang) * 1.1, water - 0.08, floatAt.z + Math.sin(ang) * 0.85);
    shadow.rotation.y = -ang;
    shadow.visible = !session || session.phase !== 'caught';

    if (!session) return;
    const s = session, d = Math.hypot(p.position[0] - stand[0], p.position[2] - stand[2]);
    if (d > 4.2) { stop('收竿了'); return; }
    s.update(dt, held); t0 += dt;

    // Float, 3D bamboo rod, expanding concentric water ripples & taut fishing line animation
    const dip = s.phase === 'bite' ? -.13 : s.phase === 'reel' ? -.05 + Math.sin(t * 28) * .035 : 0;
    const cast = Math.min(1, t0 / .55);
    const fx = stand[0] + (floatAt.x - stand[0]) * cast, fz = stand[2] + (floatAt.z - stand[2]) * cast;
    bob.position.set(fx, water + .02 + dip + Math.sin(t * 2.4) * .015 + (1 - cast) * Math.sin(cast * Math.PI) * 1.5, fz);

    // Position angled bamboo rod beside slime pointing toward the bobber, flexing under bite/reel tension
    const rodYaw = Math.atan2(toward[0], toward[1]);
    const flex = s.phase === 'reel' ? 0.34 + Math.sin(t * 18) * 0.08 : s.phase === 'bite' ? 0.25 : 0.08;
    rodGroup.position.set(p.position[0] + toward[0] * 0.25, p.position[1] + 0.32, p.position[2] + toward[1] * 0.25);
    rodGroup.rotation.set(0, rodYaw, 0);
    rodGroup.rotateX(0.92 + flex);
    const tipLocal = new T.Vector3(0, 2.32, 0).applyMatrix4(rodGroup.matrixWorld);

    const a = line.geometry.attributes.position;
    a.setXYZ(0, tipLocal.x, tipLocal.y, tipLocal.z);
    a.setXYZ(1, bob.position.x, bob.position.y + .08, bob.position.z);
    a.needsUpdate = true;

    // Expanding concentric surface ripple rings around bobber once landed in water
    const landed = cast >= 0.96;
    const rippleRate = s.phase === 'bite' || s.phase === 'reel' ? 1.55 : 0.62;
    for (let i = 0; i < ripples.length; i++) {
      const rMesh = ripples[i];
      rMesh.visible = landed;
      if (landed) {
        const ph = (t * rippleRate + i * 0.5) % 1;
        const rad = 0.14 + ph * (s.phase === 'bite' || s.phase === 'reel' ? 1.15 : 0.82);
        rMesh.position.set(bob.position.x, water + 0.025, bob.position.z);
        rMesh.scale.setScalar(rad);
        rMesh.material.opacity = (1 - ph) * (1 - ph) * 0.78;
      }
    }

    const help = '<span class="key">F</span> / 左键 按住右移绿框追住🐟，松开左滑 · 覆盖 🎁 可顺手捞宝箱 · <span class="key">Esc</span> 收竿';
    if (s.phase === 'cast' || s.phase === 'wait') {
      z.hud?.fishing({title: s.misses ? '鱼试探了一下…再等等' : '等鱼咬钩…', help: '浮漂一沉，立刻按 <span class="key">F</span> 提竿！'});
    } else if (s.phase === 'bite') {
      z.hud?.fishing({title: '咬钩了！快按 F！', help: '机会只有一瞬间'});
      p.mood('Surprised', .3);
    } else if (s.phase === 'reel') {
      const green: [number, number] = [s.barPos, s.barPos + s.barSize];
      const onFish = s.fishPos >= green[0] - 0.02 && s.fishPos <= green[1] + 0.02;
      z.hud?.fishing({
        title: `溜鱼中 · ${BEHAVIOR_LABELS[s.behavior]}${s.treasure?.claimed ? ' · 🎁宝箱到手！' : s.treasure?.active ? ' · 发现水底宝箱🎁！' : ''}`,
        help,
        tension: s.fishPos,
        progress: s.progress,
        green,
        alarm: !onFish,
        stardew: true,
        treasure: s.treasure ? {pos: s.treasure.pos, progress: s.treasure.progress, claimed: s.treasure.claimed} : undefined,
      });
    } else if (!closeIn) {
      closeIn = 1.8;
      if (s.phase === 'caught') {
        const c = s.result()!;
        const treasureId = s.claimedTreasureId();
        const first = landCatch(life, c, treasureId);
        const item = ITEMS[c.fish];
        const trDef = treasureId ? ITEMS[treasureId] : null;
        z.save();
        p.mood('Happy', 1.5);
        z.hud?.fishing({
          title: `🎉 钓到 ${item.icon}${item.name} · ${c.size} cm${first ? ' · 图鉴新增！' : ''}${trDef ? ` + 🎁${trDef.icon}${trDef.name}` : ''}`,
          help: item.desc,
        });
      } else {
        z.hud?.fishing({
          title: '鱼挣脱跑掉了…',
          help: '按住 F/左键 让绿框紧跟🐟图标；可去手账升级钓竿或吃鱼汤加宽绿框！',
        });
        p.mood('Hurt', .8);
      }
    } else if ((closeIn -= dt) <= 0) stop();
  };
}
