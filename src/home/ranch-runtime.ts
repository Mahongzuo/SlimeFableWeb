import {importedAnimals} from '../life/companion-catalog';
import {growth,petAsset} from '../life/companion-care';
import {HOUSE,houseRoom} from './ninglu-layout';
import {disturbAnimalWater} from './water-waves';
import {deckHeight} from './voyage-ship';
import {spawnPackModel, type SpawnedPackModel} from './model-pack';
import {makeEncounterMotes, makeMoteTexture} from './encounter-motes';
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
  motes: ReturnType<typeof makeEncounterMotes>;
  alert: boolean;
  pos: [number, number];
  yaw: number;
}

interface LiveRanchPet {
  animal: AdoptedAnimal;
  asset:string;
  reaction:number;
  greet:number;
  closeToResident:boolean;
  nextRipple:number;
  lastMealDue:number;
  mealSeconds:number;
  model: SpawnedPackModel;
  badge: any;
  anchor: [number, number];
  pos: [number, number];
  target: [number, number];
  yaw: number;
  wait: number;
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
  private observer:readonly number[]|null=null;
  private lastEncounterKey = '';
  deck:any=null;
  interior:any=null;
  seek:{id:string;x:number;z:number;found:()=>void}|null=null;
  private moteMap = makeMoteTexture();

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
    if (!out.length) out.push([HOUSE.x+3.7,HOUSE.z+5.3],[HOUSE.x-2,HOUSE.z+5.4]);
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
    const wanted = new Set<string>();
    const anchors = this.pickAnchors();

    animals.forEach((animal, idx) => {
      const existing = this.pets.get(animal.id);
      const anchor=animal.station ?? anchors[idx % anchors.length];
      const distance=this.observer?Math.hypot(this.observer[0]-anchor[0],this.observer[2]-anchor[1]):0;
      if(!animal.following && distance>70)return;
      wanted.add(animal.id);
      const nearAsset=petAsset(animal);
      const far=!animal.following && distance>(existing?.asset.endsWith('-far')?18:24) && importedAnimals.has(nearAsset.slice(6));
      const asset=nearAsset+(far?'-far':'');
      if(existing && existing.asset===asset){
        existing.animal=animal;
        if(existing.anchor[0]!==anchor[0]||existing.anchor[1]!==anchor[1] || (!animal.following && !this.interior && Math.hypot(existing.pos[0]-anchor[0],existing.pos[1]-anchor[1])>7)){
          existing.anchor=[...anchor];existing.pos=[...anchor];existing.target=[...anchor];
        }
        return;
      }
      if(existing){existing.badge.geometry.dispose();existing.badge.material.dispose();existing.model.dispose();}
      const sp = RANCH_SPECIES_MAP[animal.speciesId];
      if (!sp) return;
      const model = spawnPackModel(this.T, asset, sp.size, {
        castShadow: true, outline: false, phaseOffset: Math.random(),
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
        animal, asset, model, badge,reaction:0,greet:0,closeToResident:false,nextRipple:0,lastMealDue:animal.care?.due??0,mealSeconds:0,
        anchor: [...anchor], pos: [...anchor], target: [...anchor],
        yaw: Math.random() * Math.PI * 2, wait: 1 + Math.random() * 2,
      });
    });

    for (const [id, live] of this.pets) {
      if (!wanted.has(id)) {
        live.badge.geometry.dispose();
        live.badge.material.dispose();
        live.model.dispose();
        this.pets.delete(id);
      }
    }
  }

  private syncEncounters() {
    const dayKey = this.host.dayKey();
    const env = this.host.env();
    const key = `${dayKey}-${env.season}-${env.weather}-${env.hour < 6 || env.hour >= 19 ? 'N' : 'D'}-${env.historyDay}`;
    if (key === this.lastEncounterKey) return;
    this.lastEncounterKey = key;

    const spots = generateDailyEncounters(this.host.life, dayKey, env);
    const wanted = new Set(spots.map(s => s.id));

    for (const [id, live] of this.encounters) {
      if (!wanted.has(id)) {
        live.model.dispose();
        live.motes.dispose();
        this.encounters.delete(id);
      }
    }

    for (const spot of spots) {
      if (this.encounters.has(spot.id)) continue;
      const sp = RANCH_SPECIES_MAP[spot.speciesId];
      if (!sp) continue;
      const model = spawnPackModel(this.T, sp.asset, sp.size, {
        castShadow: false, outline: false, phaseOffset: Math.random(),
      });
      const y = this.host.ground(spot.x, spot.z) ?? 0;
      model.group.position.set(spot.x, y, spot.z);
      this.root.add(model.group);

      const motes = makeEncounterMotes(sp.tier, sp.size, Math.random() * 23, this.moteMap);
      model.group.add(motes.points);
      const yaw = Math.random() * Math.PI * 2;
      model.group.rotation.y = yaw;
      this.encounters.set(spot.id, {spot, model, motes, alert: false, pos: [spot.x, spot.z], yaw});
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
            enc.motes.dispose();
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
    this.observer=playerPos;
    this.syncEncounters();
    const dayKey = this.host.dayKey();
    const warmSpring = this.findWarmHotSpring();

    for (const enc of this.encounters.values()) {
      const dx = playerPos[0] - enc.pos[0], dz = playerPos[2] - enc.pos[1];
      const horizontal = Math.hypot(dx, dz);
      const sameLevel = Math.abs(playerPos[1] - enc.model.group.position.y) < 2.2;
      const distance = sameLevel ? horizontal : Math.max(5.2, horizontal);
      enc.motes.update(time, dt, distance);
      enc.alert = distance <= (enc.alert ? 3.35 : 3);
      enc.model.setPose?.(enc.alert ? 'notice' : 'idle');
      const group = enc.model.group;
      const targetYaw = enc.alert && horizontal > .12 ? Math.atan2(dx, dz) : enc.yaw;
      const delta = targetYaw - group.rotation.y;
      group.rotation.y += Math.atan2(Math.sin(delta), Math.cos(delta)) * (1 - Math.exp(-3.5 * dt));
    }

    for (const pet of this.pets.values()) {
      const canCollect = pet.animal.lastProduceDay !== dayKey;
      pet.badge.visible = canCollect && !pet.animal.following && !this.interior;
      if (canCollect) {
        pet.badge.rotation.y = time * 2.2;
        pet.badge.position.y = (RANCH_SPECIES_MAP[pet.animal.speciesId]?.size ?? 0.8) + 0.55 + Math.sin(time * 3) * 0.08;
      }

      // Following player OR soaking in warm Hot Spring (Capybara!) OR gentle pasture roaming
      let speed = 0.85;
      const g=pet.model.group,scale=growth(pet.animal);
      g.scale.setScalar(scale);
      const due=pet.animal.care?.due??0;
      if(due>pet.lastMealDue && pet.lastMealDue>0)pet.mealSeconds=4;
      pet.lastMealDue=due;
      g.rotation.x=0;
      pet.reaction=Math.max(0,pet.reaction-dt);pet.greet=Math.max(0,pet.greet-dt);
      const tooLarge=this.interior && RANCH_SPECIES_MAP[pet.animal.speciesId].size*scale>2.25;
      if(tooLarge&&!this.deck&&pet.animal.following){this.root.add(g);pet.pos=[HOUSE.x+.8,HOUSE.z+5.2];g.position.set(pet.pos[0],HOUSE.y,pet.pos[1]);pet.model.setPose?.('idle');continue;}
      const homeInside=this.interior && !pet.animal.station && !pet.animal.following && !tooLarge;
      const parent=pet.animal.following && this.deck ? this.deck : (this.interior && pet.animal.following || homeInside) ? this.interior : this.root;
      if(g.parent!==parent){parent.add(g);pet.pos=homeInside?[HOUSE.x-5.8,HOUSE.z+3.05]:pet.animal.following?[playerPos[0]+.6,playerPos[2]+.4]:[...pet.anchor];pet.target=[...pet.pos];}
      const withinReach=homeInside && houseRoom(playerPos[0],playerPos[1],playerPos[2])==='pet' && Math.hypot(playerPos[0]-pet.pos[0],playerPos[2]-pet.pos[1])<3;
      const arrived=withinReach&&!pet.closeToResident;pet.closeToResident=!!withinReach;
      if(parent===this.deck){g.position.set(.78,deckHeight(.78,1.1),1.1);g.rotation.y=-.3;pet.model.setPose?.('idle');continue;}
      const seeking=this.seek?.id===pet.animal.id?this.seek:null;
      const decor=homeInside?this.host.life.cottage?.furniture:undefined;
      const resting=decor?.find(f=>f.kind==='nest' && !f.stored);
      const bowl=decor?.find(f=>f.kind==='bowl' && !f.stored);
      if(seeking){pet.target=[seeking.x,seeking.z];speed=2.4;
        if(Math.hypot(pet.pos[0]-seeking.x,pet.pos[1]-seeking.z)<.3){pet.model.setPose?.('notice');this.seek=null;seeking.found();pet.reaction=2.5;pet.wait=3;}}
      else if(homeInside){
        if(pet.mealSeconds>0)pet.target=bowl?[HOUSE.x+bowl.x+.32,HOUSE.z+bowl.z]:[HOUSE.x-6.28,HOUSE.z+1.69];
        else if(arrived){pet.greet=3;pet.reaction=1;pet.target=[playerPos[0]+.65,playerPos[2]+.65];}
        else if(pet.greet<=0)pet.target=[HOUSE.x+(resting?.x??-6.7),HOUSE.z+(resting?.z??2.2)];
      }
      else if (pet.animal.following) {
        const dPlayer = Math.hypot(playerPos[0] - pet.pos[0], playerPos[2] - pet.pos[1]);
        if(dPlayer>14){pet.pos=[playerPos[0]+.72,playerPos[2]+.35];pet.target=[...pet.pos];}
        else if (dPlayer > (this.interior?1.05:2.0)) {
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
      } else {
        if (!pet.animal.following && !homeInside) {
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
      const soaking = pet.animal.speciesId === 'ranch-capybara' && !pet.animal.following && warmSpring
        && Math.hypot(pet.pos[0] - warmSpring[0], pet.pos[1] - warmSpring[1]) < .72;
      const aquatic=['ranch-otter','ranch-duckling','ranch-mute-swan','ranch-great-crested-grebe'].includes(pet.animal.speciesId);
      const swimming = aquatic && fl !== null && fl > gy + .11;
      const wading=fl!==null && fl>gy+.025 && fl-gy<.32 && !swimming;
      if(parent===this.root && (swimming||wading) && dist>.16 && time>=pet.nextRipple && Math.hypot(playerPos[0]-pet.pos[0],playerPos[2]-pet.pos[1])<40){
        const draft=(RANCH_SPECIES_MAP[pet.animal.speciesId]?.size??.8)*scale;
        disturbAnimalWater(this.host.ctx,pet.pos[0]-.22*draft*Math.sin(pet.yaw),pet.pos[1]-.22*draft*Math.cos(pet.yaw),Math.min(.32,.12+.09*draft));
        pet.nextRipple=time+(swimming?.68:.58);
      }
      const moving = dist > .16;
      const eating=pet.mealSeconds>0 && (!homeInside||!bowl||!moving) && !seeking;
      if(eating){pet.mealSeconds=Math.max(0,pet.mealSeconds-dt);g.rotation.x=.045+.035*Math.sin(time*6);}
      const inNest=homeInside && resting && Math.hypot(pet.pos[0]-HOUSE.x-resting.x,pet.pos[1]-HOUSE.z-resting.z)<.35;
      pet.model.setPose?.(eating?'eat':pet.reaction>0 || seeking && dist<.45 ? 'notice' : homeInside && dist<.18 ? 'sit' : soaking ? 'float' : swimming ? (moving ? 'swim' : 'float') : moving ? (speed > 3 ? 'run' : 'walk') : 'idle');
      const roomY=pet.animal.following?Math.max(HOUSE.y+.07,playerPos[1]):HOUSE.y+.07+(inNest?.25:0);
      const wetY=swimming?Math.max(gy,y-(RANCH_SPECIES_MAP[pet.animal.speciesId].size*scale*.22)):wading?gy:soaking?y-.12:y;
      pet.model.group.position.set(pet.pos[0],parent===this.interior?roomY:wetY,pet.pos[1]);
      pet.model.group.rotation.y = pet.yaw;
    }
  }

  dispose() {
    for (const enc of this.encounters.values()) {
      enc.model.dispose();
      enc.motes.dispose();
    }
    for (const pet of this.pets.values()) {
      pet.badge.geometry.dispose();
      pet.badge.material.dispose();
      pet.model.dispose();
    }
    this.moteMap.dispose();
    this.encounters.clear();
    this.pets.clear();
    this.root.removeFromParent();
  }
}
