import {spawnPackModel, type SpawnedPackModel} from './model-pack';
import {ITEMS} from '../life/catalog';
import {ensureHome, type AdoptedAnimal, type LifeData} from '../life/state';
import {
  RANCH_SPECIES_MAP,
  animalHearts,
  careForAnimal,
  collectAnimalProduct,
  describeItemSource,
  generateDailyEncounters,
  interactWildEncounter,
  toggleAnimalFollow,
  type EncounterEnv,
  type WildEncounterSpot,
} from '../life/ranch';
import type {DetectedPasturePen} from './voxel-mesher';
import type {Interactable, PlayerHandle} from '../zones/types';

export interface RanchRuntimeHost {
  ctx: any;
  life: LifeData;
  dayKey: () => string;
  env: () => EncounterEnv;
  ground: (x: number, z: number) => number | null;
  fluid: (x: number, z: number) => number | null;
  voxelPens: () => DetectedPasturePen[];
  save: () => void;
  toast: (text: string, ms?: number) => void;
  onChange?: () => void;
}

interface LiveEncounter {
  spot: WildEncounterSpot;
  model: SpawnedPackModel;
  ring: any;
  pos: [number, number];
  yaw: number;
}

interface LiveRanchPet {
  animal: AdoptedAnimal;
  model: SpawnedPackModel;
  badge: any;
  anchor: [number, number];
  pos: [number, number];
  target: [number, number];
  yaw: number;
  wait: number;
}

function applyTint(group: any, tint?: number) {
  if (tint === undefined) return;
  group.traverse((n: any) => {
    if (n.isMesh && n.material) {
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      for (const m of mats) {
        if (m.color) m.color.setHex(tint);
      }
    }
  });
}

/**
 * 3D Runtime for:
 * 1) Daily Wild Rare Animal Encounters (glowing ecological tracks + stealth/element/feed taming).
 * 2) Adopted Ranch Animals roaming Coops, Barns, player-built Voxel Fenced Pens, Hot Springs, or following the Slime!
 */
export class RanchRuntime {
  private root: any;
  private T: any;
  private encounters = new Map<string, LiveEncounter>();
  private pets = new Map<string, LiveRanchPet>();
  private lastEncounterKey = '';

  constructor(private host: RanchRuntimeHost) {
    this.T = host.ctx.THREE;
    this.root = new this.T.Group();
    this.root.name = 'home-ranch-runtime';
    host.ctx.scene.add(this.root);
    this.sync();
  }

  sync() {
    this.syncPets();
    this.syncEncounters();
  }

  private pickAnchors(): [number, number][] {
    const home = ensureHome(this.host.life);
    const out: [number, number][] = [];
    for (const pen of this.host.voxelPens()) out.push(pen.center);
    for (const p of home.placed) {
      if (p.itemId === 'poi-barn' || p.itemId === 'poi-coop' || p.itemId === 'pasture-shelter') {
        out.push([p.x + 1.8, p.z + 1.8]);
      }
    }
    if (!out.length) out.push([6, 48], [-4, 52]);
    return out;
  }

  private findWarmHotSpring(): [number, number] | null {
    const home = ensureHome(this.host.life);
    if ((home.hotSpringUntil ?? 0) <= Date.now()) return null;
    const hs = home.placed.find(p => p.itemId === 'poi-hotspring');
    return hs ? [hs.x, hs.z] : null;
  }

  private syncPets() {
    const animals = ensureHome(this.host.life).ranch?.animals ?? [];
    const wanted = new Set(animals.map(a => a.id));
    const anchors = this.pickAnchors();

    animals.forEach((animal, idx) => {
      const existing = this.pets.get(animal.id);
      if (existing) {
        existing.animal = animal;
        return;
      }
      const sp = RANCH_SPECIES_MAP[animal.speciesId];
      if (!sp) return;
      const anchor = anchors[idx % anchors.length];
      const model = spawnPackModel(this.T, sp.asset, sp.size, {
        castShadow: true, outline: false, phaseOffset: Math.random(),
        onLoaded: g => applyTint(g, sp.tint),
      });
      const gy = this.host.ground(anchor[0], anchor[1]) ?? 0;
      model.group.position.set(anchor[0], gy, anchor[1]);
      this.root.add(model.group);

      // Small golden indicator orb floating above pet when daily product is ready
      const badge = new this.T.Mesh(
        new this.T.OctahedronGeometry(0.14, 0),
        new this.T.MeshStandardMaterial({color: 0xffd166, emissive: 0xffae22, emissiveIntensity: 0.7, roughness: 0.3}),
      );
      badge.position.y = sp.size + 0.55;
      model.group.add(badge);

      this.pets.set(animal.id, {
        animal, model, badge,
        anchor: [...anchor], pos: [...anchor], target: [...anchor],
        yaw: Math.random() * Math.PI * 2, wait: 1 + Math.random() * 2,
      });
    });

    for (const [id, live] of this.pets) {
      if (!wanted.has(id)) {
        live.model.dispose();
        this.pets.delete(id);
      }
    }
  }

  private syncEncounters() {
    const dayKey = this.host.dayKey();
    const env = this.host.env();
    const key = `${dayKey}-${env.season}-${env.weather}-${env.hour < 6 || env.hour >= 19 ? 'N' : 'D'}`;
    if (key === this.lastEncounterKey && this.encounters.size > 0) return;
    this.lastEncounterKey = key;

    const spots = generateDailyEncounters(this.host.life, dayKey, env);
    const wanted = new Set(spots.map(s => s.id));

    for (const [id, live] of this.encounters) {
      if (!wanted.has(id)) {
        live.model.dispose();
        live.ring.removeFromParent();
        live.ring.geometry.dispose();
        live.ring.material.dispose();
        this.encounters.delete(id);
      }
    }

    for (const spot of spots) {
      if (this.encounters.has(spot.id)) continue;
      const sp = RANCH_SPECIES_MAP[spot.speciesId];
      if (!sp) continue;
      const model = spawnPackModel(this.T, sp.asset, sp.size, {
        castShadow: false, outline: false, phaseOffset: Math.random(),
        onLoaded: g => applyTint(g, sp.tint),
      });
      const y = this.host.ground(spot.x, spot.z) ?? 0;
      model.group.position.set(spot.x, y, spot.z);
      this.root.add(model.group);

      const ringColor = sp.tier === 'legendary' ? 0xffd166 : sp.tier === 'rare' ? 0x9ef0d0 : 0xa3d8f4;
      const ring = new this.T.Mesh(
        new this.T.RingGeometry(0.65, 0.85, 24).rotateX(-Math.PI / 2),
        new this.T.MeshBasicMaterial({color: ringColor, transparent: true, opacity: 0.72, side: this.T.DoubleSide, depthWrite: false}),
      );
      ring.position.set(spot.x, y + 0.05, spot.z);
      ring.layers.set(1);
      this.root.add(ring);

      this.encounters.set(spot.id, {spot, model, ring, pos: [spot.x, spot.z], yaw: Math.random() * Math.PI * 2});
    }
  }

  getInteractables(player: PlayerHandle): Interactable[] {
    const out: Interactable[] = [];
    const dayKey = this.host.dayKey();

    // 1. Wild Rare Encounters (clear collectible item prompt — no C-flatten sneaking needed!)
    for (const enc of this.encounters.values()) {
      const sp = RANCH_SPECIES_MAP[enc.spot.speciesId];
      if (!sp) continue;
      const y = this.host.ground(enc.pos[0], enc.pos[1]) ?? 0;
      const favDef = ITEMS[sp.favoriteItem];
      const favLabel = `${favDef?.icon ?? ''}${favDef?.name ?? sp.favoriteItem}`;
      const hasFav = (this.host.life.bag[sp.favoriteItem] ?? 0) > 0;
      const sourceHint = describeItemSource(sp.favoriteItem);
      out.push({
        id: `wild-${enc.spot.id}`,
        position: [enc.pos[0], y, enc.pos[1]],
        radius: 3.0,
        prompt: () => ({
          title: `✨ 野外遭遇：${sp.icon}${sp.name}${sp.tier === 'legendary' ? ' [传说]' : sp.tier === 'rare' ? ' [稀有]' : ''}`,
          sub: hasFav
            ? `按 F 赠送「${favLabel}×1」即可结识并解锁收养！`
            : `需收集「${favLabel}×1」才可互动（${sourceHint}）`,
        }),
        act: () => {
          const res = interactWildEncounter(this.host.life, enc.spot.id, sp.id, {
            element: player.element,
            feedFavorite: hasFav,
          });
          this.host.toast(res.message, 4200);
          if (res.tamed) {
            player.mood('Happy', 1.4);
            enc.model.dispose();
            enc.ring.removeFromParent();
            this.encounters.delete(enc.spot.id);
            this.host.save();
            this.host.onChange?.();
          } else {
            player.mood('Surprised', 0.8);
          }
        },
      });
    }

    // 2. Adopted Ranch Pets
    for (const pet of this.pets.values()) {
      const sp = RANCH_SPECIES_MAP[pet.animal.speciesId];
      if (!sp) continue;
      const y = this.host.ground(pet.pos[0], pet.pos[1]) ?? 0;
      const canCollect = pet.animal.lastProduceDay !== dayKey;
      const hasFav = (this.host.life.bag[sp.favoriteItem] ?? 0) > 0;
      const needsCare = pet.animal.lastPetDay !== dayKey || (hasFav && pet.animal.lastFedDay !== dayKey);
      out.push({
        id: `ranch-pet-${pet.animal.id}`,
        position: [pet.pos[0], y, pet.pos[1]],
        radius: 2.5,
        prompt: () => {
          if (canCollect) {
            return {
              title: `收取 ${sp.icon}${pet.animal.name} 的产出（${ITEMS[sp.productId]?.icon ?? ''}${ITEMS[sp.productId]?.name ?? '产物'}）`,
              sub: `❤️ ${animalHearts(pet.animal)}/5 · 心情 ${pet.animal.mood}% · 按 F 收获`,
            };
          }
          if (needsCare) {
            return {
              title: `照顾 ${sp.icon}${pet.animal.name}${hasFav ? `（投喂${ITEMS[sp.favoriteItem]?.name}）` : '（轻抚）'}`,
              sub: `❤️ ${animalHearts(pet.animal)}/5 · 提升亲密度可获双倍与稀有副产品`,
            };
          }
          return {
            title: `${sp.icon}${pet.animal.name}（${pet.animal.following ? '正跟随散步中' : '牧场悠闲漫步'}）`,
            sub: `❤️ ${animalHearts(pet.animal)}/5 · 按 F 切换「${pet.animal.following ? '回牧场休息' : '跟我一起散步'}」`,
          };
        },
        act: () => {
          if (canCollect) {
            const col = collectAnimalProduct(this.host.life, pet.animal.id, dayKey);
            if (col.ok) {
              const summary = col.items.map(it => `${ITEMS[it.id]?.icon ?? ''}${ITEMS[it.id]?.name ?? it.id}×${it.count}`).join(' + ');
              this.host.toast(`🎁 从${pet.animal.name}处收获：${summary}`, 3200);
              player.mood('Happy', 1.2);
              this.host.save();
              this.host.onChange?.();
              return;
            }
          }
          if (needsCare) {
            const c = careForAnimal(this.host.life, pet.animal.id, dayKey, hasFav);
            this.host.toast(c.message, 3000);
            player.mood('Happy', 1.0);
            this.host.save();
            this.host.onChange?.();
            return;
          }
          const fol = toggleAnimalFollow(this.host.life, pet.animal.id);
          this.host.toast(fol ? `🐾 ${pet.animal.name}开心地跟在你身后散步啦！` : `🏡 ${pet.animal.name}回到牧场休息了`, 2400);
          this.host.save();
        },
      });
    }

    return out;
  }

  update(time: number, dt: number, playerPos: readonly [number, number, number]) {
    this.syncEncounters();
    const dayKey = this.host.dayKey();
    const warmSpring = this.findWarmHotSpring();

    for (const enc of this.encounters.values()) {
      enc.ring.rotation.z = time * 0.9;
      const pulse = 0.92 + Math.sin(time * 3.2) * 0.1;
      enc.ring.scale.set(pulse, pulse, 1);
      enc.model.group.rotation.y = enc.yaw + Math.sin(time * 0.7) * 0.25;
    }

    for (const pet of this.pets.values()) {
      const canCollect = pet.animal.lastProduceDay !== dayKey;
      pet.badge.visible = canCollect;
      if (canCollect) {
        pet.badge.rotation.y = time * 2.2;
        pet.badge.position.y = (RANCH_SPECIES_MAP[pet.animal.speciesId]?.size ?? 0.8) + 0.55 + Math.sin(time * 3) * 0.08;
      }

      // Following player OR soaking in warm Hot Spring (Capybara!) OR gentle pasture roaming
      let speed = 0.85;
      if (pet.animal.following) {
        const dPlayer = Math.hypot(playerPos[0] - pet.pos[0], playerPos[2] - pet.pos[1]);
        if (dPlayer > 2.6) {
          pet.target = [playerPos[0], playerPos[2]];
          speed = dPlayer > 8 ? 4.2 : 2.4;
        } else {
          pet.target = [...pet.pos];
        }
      } else if (pet.animal.speciesId === 'ranch-capybara' && warmSpring) {
        pet.target = warmSpring;
        speed = 1.1;
      }

      const dx = pet.target[0] - pet.pos[0], dz = pet.target[1] - pet.pos[1];
      const dist = Math.hypot(dx, dz);
      if (dist > 0.16) {
        const step = Math.min(dist, speed * dt);
        pet.pos[0] += (dx / dist) * step;
        pet.pos[1] += (dz / dist) * step;
        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - pet.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        pet.yaw += diff * Math.min(1, dt * 6);
        pet.model.setMotion?.(true);
      } else {
        pet.model.setMotion?.(false);
        if (!pet.animal.following) {
          pet.wait -= dt;
          if (pet.wait <= 0) {
            pet.wait = 2.2 + Math.random() * 3.0;
            const ang = Math.random() * Math.PI * 2;
            const r = 0.9 + Math.random() * 2.8;
            pet.target = [pet.anchor[0] + Math.cos(ang) * r, pet.anchor[1] + Math.sin(ang) * r];
          }
        }
      }
      const gy = this.host.ground(pet.pos[0], pet.pos[1]) ?? 0;
      const fl = this.host.fluid(pet.pos[0], pet.pos[1]);
      const y = fl !== null && gy < fl ? fl : gy;
      pet.model.group.position.set(pet.pos[0], y, pet.pos[1]);
      pet.model.group.rotation.y = pet.yaw;
    }
  }

  dispose() {
    for (const enc of this.encounters.values()) {
      enc.model.dispose();
      enc.ring.removeFromParent();
    }
    for (const pet of this.pets.values()) pet.model.dispose();
    this.encounters.clear();
    this.pets.clear();
    this.root.removeFromParent();
  }
}
