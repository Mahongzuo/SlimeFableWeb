import * as T from 'three';
import { OtterCompanion } from './fishing-reference.js';
import { anglingFish, disposeFish } from './angling-fish';
import {
  FishingSession,
  equippedLure,
  fishingBonuses,
  lifetimeCatches,
  trophySize,
  type FishSpot,
} from '../life/fishing';
import { lures, waterNames } from '../life/fish-species';
import { ensureHome, takeItem } from '../life/state';
import { ITEMS } from '../life/catalog';
import { beijingSky } from './climate';
import type { OceanAdventureDeps } from './ocean-adventure';

interface Site {
  onBoat?: boolean;
  hull?: T.Object3D;
  direction: [number, number];
  spot: (x: number, z: number) => FishSpot;
  level: (x: number, z: number) => number;
  wet: (x: number, z: number) => boolean;
  exit?: () => void;
  returnPort?: () => void;
}
const helpText =
  '靠近钓台按 F，或登船后按 R。点击水面选点，按 F 也可朝前抛竿。浮漂下沉时按 F 提竿。按住 F 或收线按钮拉近鱼，张力偏高就松手。鱼往右冲时按 A，往左冲时按 D。保持适中张力可捞起宝箱。成功后可继续钓或收竿回到原位。Esc 收竿，Alt 临时使用鼠标。';
export class HarborAngling {
  site: Site | null = null;
  session: FishingSession | null = null;
  private root = new T.Group();
  private fish?: T.Group;
  private otter?: OtterCompanion;
  private origin = new T.Vector3();
  private target = new T.Vector3();
  private cameraPos = new T.Vector3();
  private look = new T.Vector3();
  private motion = new T.Vector3();
  private otterAnchor = new T.Vector3();
  private castTime = 0;
  private held = false;
  private pullPointer:number|null=null;
  private leanPointer:number|null=null;
  private lean = 0;
  private finished = false;
  private journal = false;
  private help = false;
  private lureIndex = 0;
  private paintTime = 0;
  private previousLock = false;
  private previousYaw = 0;
  private previousPitch = 0;
  private panel = document.createElement('div');
  private title: HTMLElement;
  private note: HTMLElement;
  private meter: HTMLProgressElement;
  private bob = new T.Mesh(
    new T.SphereGeometry(0.093, 12, 10),
    new T.MeshStandardMaterial({ color: 0xe15d3f }),
  );
  private shaft = new T.InstancedMesh(
    new T.CylinderGeometry(0.022, 0.032, 1, 8),
    new T.MeshStandardMaterial({ color: 0x976839, roughness: 0.62 }),
    8,
  );
  private spool = new T.Mesh(
    new T.CylinderGeometry(0.084, 0.084, 0.07, 12),
    new T.MeshStandardMaterial({ color: 0x54676a, metalness: 0.5, roughness: 0.38 }),
  );
  private ripple = new T.Mesh(
    new T.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({
      color: 0xd2f4ec,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  private segment = new T.Object3D();
  private line: T.Line;
  private abort = new AbortController();
  constructor(private deps: OceanAdventureDeps) {
    this.root.name = 'harbor-angling';
    this.root.visible = false;
    this.shaft.name = 'bamboo-angling-rod';
    this.shaft.frustumCulled = false;
    this.shaft.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.spool.rotation.z = Math.PI / 2;
    this.line = this.polyline(0xfff1c7);
    this.root.add(this.bob, this.shaft, this.spool, this.ripple, this.line);
    deps.ctx.scene.add(this.root);
    this.root.traverse((o) => o.layers.set(1));
    this.panel.className = 'card grain';
    this.panel.id = 'harbor-angling';
    this.panel.hidden = true;
    this.panel.style.cssText =
      'position:fixed;z-index:35;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(470px,94vw);box-sizing:border-box;padding:10px 14px;text-align:center;pointer-events:auto;max-height:49dvh;overflow:auto;color:#302c26;background:#f7f0de;border:2px solid;border-radius:14px';
    this.panel.innerHTML =
      '<strong></strong><div data-note style="margin:4px 0"></div><progress max="1" style="width:90%"></progress><div data-buttons><button data-act="pull">抛竿</button> <button data-act="left">压左</button> <button data-act="right">压右</button> <button data-act="lure"></button> <button data-act="journal">鱼谱</button> <button data-act="help">F1 帮助</button> <button data-act="exit">收竿</button></div>';
    this.title = this.panel.querySelector('strong')!;
    this.note = this.panel.querySelector('[data-note]')!;
    this.meter = this.panel.querySelector('progress')!;
    document.body.append(this.panel);
    const opts = { capture: true, signal: this.abort.signal };
    window.addEventListener('keydown', (e) => this.key(e, true), opts);
    window.addEventListener('keyup', (e) => this.key(e, false), opts);
    window.addEventListener('pointerdown', (e) => this.pointer(e), opts);
    const releasePointer=(event:PointerEvent)=>{
      if(this.pullPointer===event.pointerId){this.pullPointer=null;this.held=false;}
      if(this.leanPointer===event.pointerId){this.leanPointer=null;this.lean=0;}
    };
    window.addEventListener('pointerup',releasePointer,opts);
    window.addEventListener('pointercancel',releasePointer,opts);
    window.addEventListener('blur',()=>{this.held=false;this.lean=0;this.pullPointer=this.leanPointer=null;},opts);
    this.panel.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.act;
      if (act === 'journal') this.toggleJournal();
      if (act === 'exit') this.stop();
      if (act === 'help') this.toggleHelp();
      if (act === 'lure') this.cycleLure();
      if (act === 'pull' && (e as MouseEvent).detail === 0) this.action();
    });
  }
  private button(id: string) {
    return this.panel.querySelector<HTMLButtonElement>('[data-act="' + id + '"]')!;
  }
  private polyline(color: number) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(27), 3));
    const l = new T.Line(g, new T.LineBasicMaterial({ color }));
    l.frustumCulled = false;
    return l;
  }
  get active() {
    return !!this.site;
  }
  start(site: Site) {
    if (this.active) return;
    const slime = this.deps.slime;
    this.site = site;
    this.origin.fromArray(slime.position);
    this.previousLock = slime.inputLock;
    this.previousYaw = slime.yaw;
    this.previousPitch = slime.pitch;
    slime.inputLock = true;
    slime.keys.clear();
    document.body.classList.add('home-angling');
    this.root.visible = true;
    this.panel.hidden = false;
    this.cameraPos.copy(this.deps.ctx.camera.position);
    this.look.copy(this.origin);
    this.help = false;
    this.aim();
  }
  private aim() {
    const site = this.site!;
    this.session = null;
    this.finished = false;
    this.held = false;
    this.lean = 0;
    this.castTime = 0;
    if (this.fish) {
      disposeFish(this.fish);
      this.fish = undefined;
    }
    const [dx, dz] = site.direction;
    this.lureIndex = equippedLure(this.deps.life);
    this.target.copy(this.origin).add(new T.Vector3(dx * 5, 0, dz * 5));
    let found = false;
    for (const angle of [0, 0.24, -0.24, 0.52, -0.52, 0.85, -0.85]) {
      for (const d of [4.8, 6, 7.5, 3.4, 9]) {
        const x = this.origin.x + d * (dx * Math.cos(angle) - dz * Math.sin(angle)),
          z = this.origin.z + d * (dz * Math.cos(angle) + dx * Math.sin(angle));
        if (site.wet(x, z)) {
          this.target.set(x, site.level(x, z), z);
          found = true;
          break;
        }
      }
      if (found) break;
    }
    this.bob.visible = false;
    this.line.visible = false;
    this.ripple.visible = false;
    this.chooseOtterWater();
    if (!this.otter) {
      this.otter = new OtterCompanion(this.root, {
        emit: (_name: string, p: any) => this.deps.ctx.ocean?.voyageWake?.impact(p.x, p.z, 0.12),
      });
      this.otter.group.traverse((o) => o.layers.set(1));
    }
    this.otter.setPositionImmediate(this.otterAnchor.x, this.otterAnchor.z, Math.atan2(dx, dz));
    this.deps.slime.setMenuPointer('angling', true);
    this.paint();
  }
  private chooseOtterWater() {
    const site=this.site!;
    const heading=this.target.clone().sub(this.origin).setY(0).normalize();
    const side=new T.Vector3(-heading.z,0,heading.x);
    this.otterAnchor.copy(this.target);
    for(const width of [1.8,-1.8,1.15,-1.15,2.6,-2.6]){
      for(const fraction of [.66,.85,.45]){
        const p=this.origin.clone().lerp(this.target,fraction).addScaledVector(side,width);
        if(site.wet(p.x,p.z)){this.otterAnchor.copy(p);return;}
      }
    }
  }
  private cycleLure() {
    if (this.session || this.help) return;
    const life = this.deps.life,
      unlocked = lures.filter((l) => l.count <= lifetimeCatches(life)).length;
    ensureHome(life).fishing!.lure = (equippedLure(life) + 1) % unlocked;
    this.lureIndex = equippedLure(life);
    this.deps.save();
    this.paint();
  }
  private rejectCast() {
    this.note.textContent='请选择十二米内的水面，避开岸石和甲板';
    this.noticeUntil=performance.now()+1600;
  }
  private noticeUntil=0;
  private cast(point = this.target) {
    const site = this.site!;
    if (!site.wet(point.x, point.z) || Math.hypot(point.x - this.origin.x, point.z - this.origin.z) > 12) {
      this.rejectCast();
      return;
    }
    this.noticeUntil=0;
    this.target.copy(point);
    this.chooseOtterWater();
    this.target.y = site.level(point.x, point.z);
    const { life, ctx } = this.deps,
      historyDay = this.deps.isHistoryDay(),
      bonus = fishingBonuses(life);
    const bait =
      [...(historyDay ? ['bait-chronicle'] : []), 'bait-element', 'bait-glow', 'bait-worm'].find(
        (id) => life.bag[id] > 0,
      ) ?? null;
    const now = Date.now(),
      hour = ctx.anglingHour();
    this.session = new FishingSession(
      site.spot(point.x, point.z),
      {
        hour,
        historyDay,
        season: beijingSky(now).season,
        raining: ctx.weather?.rain > 0.3,
        snowing: ctx.weather?.snow > 0.3,
        lure: equippedLure(life),
      },
      Math.random,
      bait,
      { mode: 'angling', ...bonus, treasureChance: 0.22 + (bonus.rodTier - 1) * 0.12 + bonus.treasureBonus },
    );
    if (bait) {
      takeItem(life, bait);
      this.deps.save();
    }
    this.fish = anglingFish(this.session.catch.fish, this.session.starlight);
    this.root.add(this.fish);
    this.deps.slime.setMood('Squash', 0.38, 75);
    this.castTime = 0;
    this.deps.slime.setMenuPointer('angling', false);
    this.bob.visible = this.line.visible = true;
    this.paint();
  }
  private action() {
    if (!this.site || this.help || this.journal) return;
    if (this.finished) {
      this.aim();
      return;
    }
    if (!this.session) {
      this.cast();
      return;
    }
    this.session.hook();
    this.held = true;
  }
  private toggleJournal() {
    if (this.session && !this.finished) return;
    this.journal = !this.journal;
    this.help=false;
    if (this.journal) this.deps.lifeUI.openTab('fish', this.deps.life);
    else this.deps.lifeUI.dex(null);
    this.paint();
  }
  private toggleHelp() {
    this.help = !this.help;
    this.held = false;
    this.lean = 0;
    this.deps.slime.setMenuPointer('angling', this.help || !this.session || this.finished);
    this.paint();
  }
  private key(e: KeyboardEvent, down: boolean) {
    if (!this.site || e.code.startsWith('Alt')) return;
    if (this.journal && (e.code === 'Escape' || e.code === 'KeyB')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (down && !e.repeat) this.toggleJournal();
      return;
    }
    if (
      (this.journal || this.help) &&
      ['Tab', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'Enter'].includes(e.code)
    )
      return;
    if (
      ![
        'KeyA',
        'KeyD',
        'ArrowLeft',
        'ArrowRight',
        'KeyF',
        'F1',
        'Escape',
        'Space',
        'KeyR',
        'KeyC',
        'KeyV',
        'KeyJ',
        'KeyE',
        'KeyQ',
        'KeyH',
        'KeyB',
        'KeyW',
        'KeyS',
      ].includes(e.code)
    )
      return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (down && !e.repeat && (e.code === 'F1' || (e.code === 'Escape' && this.help))) {
      this.toggleHelp();
      return;
    }
    if (this.help || this.journal) return;
    if (e.code === 'KeyB' && down && !e.repeat) {
      this.toggleJournal();
      return;
    }
    if (e.code === 'KeyH' && down && !e.repeat) this.site?.returnPort?.();
    if (e.code === 'Escape' && down && !e.repeat) this.stop();
    if (e.code === 'KeyF' || e.code === 'Space') {
      if (down && !e.repeat) this.action();
      if (!down) this.held = false;
    }
    if (['KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].includes(e.code))
      this.lean = down ? (['KeyA', 'ArrowLeft'].includes(e.code) ? -1 : 1) : 0;
  }
  private pointer(e: PointerEvent) {
    if (!this.site || e.button !== 0) return;
    const target = e.target as HTMLElement,
      act = target.closest<HTMLButtonElement>('button')?.dataset.act;
    if (this.panel.contains(target)) {
      if (act === 'pull' && !this.help){this.pullPointer=e.pointerId;this.action();}
      if (!this.help && (act === 'left' || act === 'right')){this.leanPointer=e.pointerId;this.lean = act === 'left' ? -1 : 1;}
      return;
    }
    if (target !== this.deps.ctx.renderer.domElement || this.help || this.journal) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (this.session) {
      if (!this.finished){this.pullPointer=e.pointerId;this.action();}
      return;
    }
    const rect = target.getBoundingClientRect(),
      ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((e.clientY - rect.top) / rect.height) * 2,
      ),
      this.deps.ctx.camera,
    );
    const p = new T.Vector3(),
      plane = new T.Plane(new T.Vector3(0, 1, 0), -this.site.level(this.target.x, this.target.z));
    if (!ray.ray.intersectPlane(plane,p)) return;
    ray.far=ray.ray.origin.distanceTo(p)-.035;ray.layers.enableAll();
    const blocked=this.deps.slime.world.cast(ray.ray.origin.toArray(),p.toArray(),0);
    if((blocked && blocked.point[1]>p.y+.045) || (this.site.hull && ray.intersectObject(this.site.hull).length)){
      this.rejectCast();return;
    }
    this.cast(p);
  }
  private paint() {
    if (!this.site) return;
    const s = this.session,
      phase = s?.phase ?? 'aim';
    this.title.textContent = this.help
      ? '垂钓帮助'
      : {
          aim: '选择落点',
          cast: '抛竿',
          wait: '等鱼靠近浮漂',
          bite: '浮漂下沉！提竿',
          reel: '搏鱼',
          caught: ITEMS[s?.catch.fish ?? '']?.name + ' · ' + s?.catch.size + ' cm',
          escaped: '鱼挣脱了',
        }[phase];
    if(this.help || performance.now()>this.noticeUntil)this.note.textContent = this.help
      ? helpText
      : phase === 'aim'
        ? waterNames[this.site.spot(this.target.x, this.target.z)] + ' · 点水面，或按 F 向前抛竿'
        : phase === 'reel'
          ? '张力 ' +
            Math.round(s!.tension * 100) +
            '% · ' +
            (s!.fishPos > 0.5 ? '鱼往右游，向左压竿' : '鱼往左游，向右压竿')
          : phase === 'caught'
            ? (s!.catch.size >= trophySize(s!.catch.fish) ? '♛ 皇冠 · ' : '') +
              (s!.starlight ? '✧ 星光 · ' : '') +
              '鱼获已记入鱼谱' +
              (s!.claimedTreasureId() ? ' · 捞到宝箱' : '')
            : 'F 提竿 · 按住收线，松开卸力';
    this.meter.hidden = this.help || phase !== 'reel';
    this.meter.value = s?.progress ?? 0;
    this.button('pull').textContent = this.finished
      ? '继续钓'
      : phase === 'aim'
        ? '抛竿'
        : phase === 'bite'
          ? '提竿'
          : '收线';
    this.button('journal').hidden = this.help || (!!s && !this.finished);
    this.button('journal').textContent = this.journal ? '收起鱼谱' : '鱼谱';
    this.button('pull').hidden = this.help || this.journal;
    for (const id of ['left', 'right']) this.button(id).hidden = this.help || phase !== 'reel';
    this.button('help').hidden = this.journal;
    this.button('help').textContent = this.help ? '返回垂钓' : 'F1 帮助';
    this.button('lure').hidden = this.help || this.journal || !!s;
    this.button('lure').textContent = lures[this.lureIndex].name;
  }
  update(t: number, dt: number) {
    const site = this.site;
    if (!site) return;
    if (!this.deps.isPlaying()) {
      this.stop();
      return;
    }
    this.motion.fromArray(this.deps.slime.position).sub(this.origin).setY(0);
    this.origin.fromArray(this.deps.slime.position);
    if(site.onBoat){
      this.otterAnchor.add(this.motion);
      if(!this.session)this.target.add(this.motion);
      const ot=this.otter!;
      ot.position.add(this.motion);
    }
    const [dx, dz] = site.direction,
      s = this.session;
    if (!this.help) {
      s?.update(dt, this.held, this.lean);
      this.castTime += dt;
      if (s?.phase === 'cast') this.deps.slime.fishingCastPose(this.castTime);
    }
    if (!this.finished && (s?.phase === 'caught' || s?.phase === 'escaped')) {
      this.finished = true;
      this.held = false;
      if (s.settle(this.deps.life)) {
        this.otter?.celebrateCatch();
        this.deps.slime.setMood('Happy', 2, 75);
        this.deps.save();
        this.deps.lifeUI.refresh(this.deps.life);
      }
      this.deps.slime.setMenuPointer('angling', true);
    }
    const ot = this.otter!;
    const heading = Math.atan2(dx, dz),
      follow = new T.Vector3(
        this.otterAnchor.x + 1.88 * dz + 1.15 * dx,
        0,
        this.otterAnchor.z - 1.88 * dx + 1.15 * dz,
      );
    const water = site.level(ot.position.x, ot.position.z);
    ot.update(this.help ? 0 : dt, t, follow, heading, 0, {
      height: 0,
      slopeX: site.level(ot.position.x + 0.5, ot.position.z) - water,
      slopeZ: site.level(ot.position.x, ot.position.z + 0.5) - water,
    });
    ot.group.position.y = ot.position.y + water;
    ot.consumeWaveImpulses();
    const reach = s?.phase === 'reel' ? Math.max(0.25, 1 - 0.74 * s.progress) : 1;
    const cast = Math.min(1, this.castTime / 0.6);
    const u = cast * reach;
    this.bob.position.copy(this.origin).lerp(this.target, u);
    this.bob.position.y =
      T.MathUtils.lerp(this.origin.y + 0.95, site.level(this.bob.position.x, this.bob.position.z), cast) +
      Math.sin(cast * Math.PI) * 1.32 +
      (s?.phase === 'bite' ? -0.1 : 0.055);
    const pivot = this.origin.clone().add(new T.Vector3(dx * 0.2, 0.32, dz * 0.2)),
      tip = new T.Vector3(),
      bend = s?.phase === 'reel' ? s.tension : 0;
    const previous = pivot.clone(),
      axis = new T.Vector3(0, 1, 0),
      delta = new T.Vector3();
    this.spool.position.copy(pivot).add(new T.Vector3(dx * 0.14 + 0.025, 0.16, dz * 0.14));
    for (let j = 1; j <= 8; j++) {
      const f = j / 8,
        stretch = (1.22 + 0.44 * bend - (s?.phase === 'cast' ? (1 - cast) * 1.7 : 0)) * f;
      tip
        .copy(pivot)
        .add(
          new T.Vector3(
            dx * stretch + dz * this.lean * f * 0.45,
            f * 1.55 - f * f * (0.36 + 0.74 * bend),
            dz * stretch - dx * this.lean * f * 0.45,
          ),
        );
      delta.copy(tip).sub(previous);
      this.segment.position.copy(previous).lerp(tip, 0.5);
      this.segment.scale.set(1.45 - f, delta.length() + 0.003, 1.45 - f);
      this.segment.quaternion.setFromUnitVectors(axis, delta.normalize());
      this.segment.updateMatrix();
      this.shaft.setMatrixAt(j - 1, this.segment.matrix);
      previous.copy(tip);
    }
    this.shaft.instanceMatrix.needsUpdate = true;
    this.ripple.visible = !s || cast >= 1 && !this.finished;
    if (this.ripple.visible) {
      const pulse = (this.castTime * (s?.phase === 'bite' ? 2 : 1)) % 1;
      this.ripple.scale.setScalar(0.1 + 0.52 * pulse);
      this.ripple.material.opacity = 0.48 * (1 - pulse);
      this.ripple.position.copy(s?this.bob.position:this.target);
      this.ripple.position.y = site.level(this.ripple.position.x,this.ripple.position.z) + 0.026;
    }
    const rope = this.line.geometry.attributes.position;
    for (let j = 0; j < 9; j++) {
      const f = j / 8;
      rope.setXYZ(
        j,
        T.MathUtils.lerp(tip.x, this.bob.position.x, f),
        T.MathUtils.lerp(tip.y, this.bob.position.y, f) - Math.sin(f * Math.PI) * (0.25 - 0.21 * bend),
        T.MathUtils.lerp(tip.z, this.bob.position.z, f),
      );
    }
    rope.needsUpdate = true;
    if (this.fish && s) {
      this.fish.visible = s.phase !== 'cast' && s.phase !== 'escaped';
      this.fish.position.copy(this.bob.position);
      const spread =
        s.phase === 'wait' ? Math.min(1.6, s.timer * 0.32) : s.phase === 'reel' ? s.fishPos - 0.5 : 0;
      this.fish.position.x += dz * spread;
      this.fish.position.z -= dx * spread;
      this.fish.position.y -= 0.2 + Math.sin(t * 3) * 0.05;
      if (s.phase === 'reel')
        this.fish.position.y +=
          Math.max(0, Math.sin(this.castTime * 3.4) - 0.71) * 2.2 * Math.abs(s.fishPos - 0.5) * 2;
      this.fish.rotation.y = -heading + Math.sin(t * 5) * 0.28;
      this.fish.scale.setScalar(T.MathUtils.clamp(s.catch.size / 90, 0.38, 1.65));
      if (s.phase === 'caught') {
        this.fish.position
          .copy(ot.group.position)
          .add(new T.Vector3(dx * 0.46, 0.56 + Math.sin(t * 3) * 0.04, dz * 0.46));
        this.bob.visible = this.line.visible = false;
      }
    }
    const victory = s?.phase === 'caught',
      factor = 1 - Math.exp(-4 * dt);
    const focus = victory
      ? ot.group.position.clone().add(new T.Vector3(dx * 0.2, 0.28, dz * 0.2))
      : this.origin.clone().lerp(this.target, 0.42);
    const distance = this.origin.distanceTo(this.target),
      portrait = this.deps.ctx.camera.aspect < 1;
    const desired = focus
      .clone()
      .add(
        victory
          ? new T.Vector3(dx * 1.65 + dz * 1.45, 1.65, dz * 1.65 - dx * 1.45)
          : new T.Vector3(
              dz * 3.4 + dx * (site.onBoat?3.4:-2.2),
              Math.max(5.2, distance * 1.08) * (portrait ? 1.52 : 1),
              -dx * 3.4 + dz * (site.onBoat?3.4:-2.2),
            ),
      );
    if (!victory) focus.lerp(this.origin, 0.12);
    this.cameraPos.lerp(desired, factor);
    this.look.lerp(focus, factor);
    const camera = this.deps.ctx.camera;
    camera.position.copy(this.cameraPos);
    camera.lookAt(this.look);
    camera.updateMatrixWorld();
    if (t >= this.paintTime || t < this.paintTime - 1) {
      this.paintTime = t + 0.1;
      this.paint();
    }
  }
  stop() {
    if (!this.site) return;
    if (this.journal) {
      this.journal = false;
      this.deps.lifeUI.dex(null);
    }
    const { slime } = this.deps,
      site = this.site;
    this.site = null;
    this.session = null;
    this.root.visible = false;
    this.panel.hidden = true;
    document.body.classList.remove('home-angling');
    slime.inputLock = this.previousLock;
    slime.yaw = this.previousYaw;
    slime.pitch = this.previousPitch;
    slime.keys.clear();
    this.held = false;
    this.lean = 0;
    if (this.fish) {
      disposeFish(this.fish);
      this.fish = undefined;
    }
    this.otter?.dispose();
    this.otter = undefined;
    this.leanPointer=this.pullPointer=null;
    site.exit?.();
    slime.setMenuPointer('angling', false);
  }
  dispose() {
    this.stop();
    this.abort.abort();
    this.panel.remove();
    disposeFish(this.root);
    this.shaft.dispose();
    this.line.geometry.dispose();
    (this.line.material as T.Material).dispose();
  }
}
