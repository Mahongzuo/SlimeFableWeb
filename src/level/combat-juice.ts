import * as T from 'three';
import {LAYER} from './stage';

export type FloatStyle = 'damage' | 'crit' | 'reaction' | 'heal' | 'dew' | 'break' | 'info';

interface FloatSlot {
  el: HTMLSpanElement;
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  baseScale: number;
}

let floatStyleInjected = false;
function injectFloatStyles() {
  if (floatStyleInjected || typeof document === 'undefined') return;
  floatStyleInjected = true;
  const style = document.createElement('style');
  style.id = 'combat-juice-styles';
  style.textContent = `
.cj-float-layer{position:fixed;inset:0;pointer-events:none;z-index:20;overflow:hidden;font-family:"Segoe UI","Microsoft YaHei",sans-serif}
.cj-float{position:absolute;left:0;top:0;font-weight:800;white-space:nowrap;will-change:transform,opacity;text-shadow:0 2px 6px rgba(10,18,22,.85),0 0 2px rgba(0,0,0,.95);letter-spacing:.02em;user-select:none}
.cj-float.damage{font-size:17px;color:#fff6dc}
.cj-float.crit{font-size:23px;color:#ffd564;-webkit-text-stroke:1px #6a220c}
.cj-float.reaction{font-size:16px;padding:2px 8px;border-radius:999px;background:rgba(16,28,34,.78);border:1px solid currentColor;box-shadow:0 3px 12px rgba(0,0,0,.4)}
.cj-float.heal{font-size:17px;color:#8ef7b4}
.cj-float.dew{font-size:15px;color:#9df8df}
.cj-float.break{font-size:22px;color:#ffe68a;padding:3px 11px;border-radius:6px;background:linear-gradient(90deg,rgba(128,46,24,.88),rgba(196,118,34,.88));border:1px solid #ffe8a8;box-shadow:0 4px 16px rgba(0,0,0,.45)}
.cj-float.info{font-size:15px;color:#cbe9ff}
`;
  document.head.appendChild(style);
}

/**
 * Pooled 3D-to-screen floating combat numbers & reaction badges.
 * Zero per-hit DOM allocations; smoothly rises and fades with pop-in spring.
 */
export class FloatingTextPool {
  readonly layer: HTMLDivElement;
  private slots: FloatSlot[] = [];
  private proj = new T.Vector3();

  constructor(poolSize = 32, parent: HTMLElement = document.body) {
    injectFloatStyles();
    this.layer = document.createElement('div');
    this.layer.className = 'cj-float-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < poolSize; i++) {
      const el = document.createElement('span');
      el.className = 'cj-float';
      el.style.display = 'none';
      this.layer.appendChild(el);
      this.slots.push({el, active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, age: 0, life: 1, baseScale: 1});
    }
    parent.appendChild(this.layer);
  }

  spawn(
    worldPos: readonly [number, number, number],
    text: string,
    style: FloatStyle = 'damage',
    color?: string,
  ) {
    let slot = this.slots.find(s => !s.active);
    if (!slot) {
      slot = this.slots.reduce((oldest, s) => (s.age / s.life > oldest.age / oldest.life ? s : oldest));
    }
    const jitterX = (Math.random() - 0.5) * 0.45;
    const jitterZ = (Math.random() - 0.5) * 0.35;
    slot.active = true;
    slot.x = worldPos[0] + jitterX;
    slot.y = worldPos[1] + 0.15;
    slot.z = worldPos[2] + jitterZ;
    slot.vx = (Math.random() - 0.5) * 0.35;
    slot.vy = style === 'break' || style === 'crit' ? 1.25 : 0.92;
    slot.age = 0;
    slot.life = style === 'break' ? 1.35 : style === 'reaction' ? 1.15 : style === 'crit' ? 1.0 : 0.85;
    slot.baseScale = style === 'crit' || style === 'break' ? 1.16 : 1.0;
    slot.el.className = 'cj-float ' + style;
    slot.el.textContent = text;
    slot.el.style.color = color ?? '';
    slot.el.style.display = 'block';
  }

  update(dt: number, camera: T.Camera) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const s of this.slots) {
      if (!s.active) continue;
      s.age += dt;
      if (s.age >= s.life) {
        s.active = false;
        s.el.style.display = 'none';
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy *= Math.exp(-dt * 2.4);
      this.proj.set(s.x, s.y, s.z).project(camera);
      if (this.proj.z > 1 || this.proj.z < -1) {
        s.el.style.opacity = '0';
        continue;
      }
      const sx = (this.proj.x * 0.5 + 0.5) * w;
      const sy = (0.5 - this.proj.y * 0.5) * h;
      const u = s.age / s.life;
      const pop = u < 0.14 ? 0.65 + (u / 0.14) * 0.55 : u < 0.28 ? 1.2 - ((u - 0.14) / 0.14) * 0.2 : 1.0;
      const alpha = u > 0.68 ? Math.max(0, 1 - (u - 0.68) / 0.32) : 1;
      s.el.style.opacity = alpha.toFixed(3);
      s.el.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0) translate(-50%,-50%) scale(${(pop * s.baseScale).toFixed(3)})`;
    }
  }

  clear() {
    for (const s of this.slots) {
      s.active = false;
      s.el.style.display = 'none';
    }
  }

  dispose() { this.layer.remove(); }
}

/**
 * Trauma-based camera shake & subtle combat hitstop.
 * Respects prefers-reduced-motion automatically.
 */
export class JuiceController {
  private trauma = 0;
  private hitstopLeft = 0;
  private clock = 0;
  private savedPos = new T.Vector3();
  private savedRot = new T.Euler();
  private applied = false;
  readonly reduced = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : {matches: false};

  addShake(amount: number) {
    if (this.reduced.matches) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  triggerHitstop(seconds: number) {
    if (this.reduced.matches) return;
    this.hitstopLeft = Math.max(this.hitstopLeft, Math.min(0.11, seconds));
  }

  step(dt: number): number {
    this.clock += dt;
    this.trauma = Math.max(0, this.trauma - dt * 2.4);
    if (this.hitstopLeft > 0) {
      this.hitstopLeft = Math.max(0, this.hitstopLeft - dt);
      return dt * 0.08;
    }
    return dt;
  }

  applyShake(camera: T.Camera) {
    this.applied = false;
    if (this.trauma <= 0.002 || this.reduced.matches) return;
    const mag = this.trauma * this.trauma;
    this.savedPos.copy(camera.position);
    this.savedRot.copy(camera.rotation);
    camera.position.x += Math.sin(this.clock * 57) * 0.16 * mag;
    camera.position.y += Math.cos(this.clock * 69) * 0.13 * mag;
    camera.rotation.z += Math.sin(this.clock * 49) * 0.018 * mag;
    this.applied = true;
  }

  restoreShake(camera: T.Camera) {
    if (!this.applied) return;
    camera.position.copy(this.savedPos);
    camera.rotation.copy(this.savedRot);
    this.applied = false;
  }

  reset() {
    this.trauma = 0;
    this.hitstopLeft = 0;
  }
}

export interface TelegraphSpec {
  shape: 'circle' | 'sector' | 'line';
  origin: readonly [number, number, number];
  yaw: number;
  radius: number;
  width?: number;
  angle?: number;
  progress: number;
  color?: string;
}

const TELEGRAPH_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const TELEGRAPH_FRAG = `
uniform vec3 uColor;
uniform float uProgress;
uniform float uShape;
uniform float uHalfAngle;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float alpha = 0.0;
  float edge = 0.0;
  if (uShape < 0.5) {
    // circle
    float r = length(p);
    if (r > 1.0) discard;
    float fill = smoothstep(uProgress + 0.04, uProgress - 0.04, r);
    edge = smoothstep(0.88, 0.96, r) + smoothstep(0.06, 0.0, abs(r - uProgress)) * 0.7;
    alpha = 0.16 + fill * 0.24 + edge * 0.55;
  } else if (uShape < 1.5) {
    // sector: +Y on plane corresponds to forward (+Z after -PI/2 X rotation => -vUv.y)
    float r = length(p);
    if (r > 1.0) discard;
    float ang = abs(atan(p.x, -p.y));
    if (ang > uHalfAngle) discard;
    float fill = smoothstep(uProgress + 0.05, uProgress - 0.05, r);
    float arcEdge = smoothstep(0.90, 0.98, r);
    float sideEdge = smoothstep(uHalfAngle - 0.06, uHalfAngle, ang) * smoothstep(0.12, 0.25, r);
    float front = smoothstep(0.06, 0.0, abs(r - uProgress));
    alpha = 0.16 + fill * 0.28 + max(arcEdge, max(sideEdge, front)) * 0.56;
  } else {
    // line: vUv.y goes 1 (origin) -> 0 (tip)
    float along = 1.0 - vUv.y;
    float side = abs(p.x);
    float fill = smoothstep(uProgress + 0.04, uProgress - 0.04, along);
    float border = max(smoothstep(0.84, 0.98, side), smoothstep(0.94, 1.0, along));
    float sweep = smoothstep(0.06, 0.0, abs(along - uProgress));
    alpha = 0.16 + fill * 0.28 + max(border, sweep) * 0.55;
  }
  vec3 col = mix(uColor, vec3(1.0, 0.95, 0.78), clamp(uProgress * 0.45, 0.0, 0.45));
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
}`;

/**
 * Z-fighting-free 3D ground telegraph decal pool for enemy attacks, boss shocks & AOE bursts.
 * Placed on LAYER.NO_OUTLINE with controlled elevation (+0.042m), depthWrite:false and polygonOffset.
 */
export class TelegraphPool {
  private meshes: T.Mesh<T.PlaneGeometry, T.ShaderMaterial>[] = [];
  private cursor = 0;

  constructor(scene: T.Scene, count = 10) {
    const geom = new T.PlaneGeometry(1, 1);
    geom.rotateX(-Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const mat = new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        uniforms: {
          uColor: {value: new T.Color('#f44b3c')},
          uProgress: {value: 0},
          uShape: {value: 0},
          uHalfAngle: {value: 1.0},
        },
        vertexShader: TELEGRAPH_VERT,
        fragmentShader: TELEGRAPH_FRAG,
      });
      const mesh = new T.Mesh(geom, mat);
      mesh.visible = false;
      mesh.renderOrder = 6;
      mesh.layers.set(LAYER.NO_OUTLINE);
      mesh.name = 'combat-telegraph-decal';
      scene.add(mesh);
      this.meshes.push(mesh);
    }
  }

  beginFrame() {
    this.cursor = 0;
  }

  draw(spec: TelegraphSpec) {
    if (this.cursor >= this.meshes.length) return;
    const mesh = this.meshes[this.cursor++];
    const u = mesh.material.uniforms;
    u.uColor.value.set(spec.color ?? '#f24a38');
    u.uProgress.value = T.MathUtils.clamp(spec.progress, 0, 1);
    mesh.visible = true;
    const y = spec.origin[1] + 0.044;
    if (spec.shape === 'circle') {
      u.uShape.value = 0;
      mesh.position.set(spec.origin[0], y, spec.origin[2]);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(spec.radius * 2, 1, spec.radius * 2);
    } else if (spec.shape === 'sector') {
      u.uShape.value = 1;
      u.uHalfAngle.value = (spec.angle ?? Math.PI * 0.72) * 0.5;
      mesh.position.set(spec.origin[0], y, spec.origin[2]);
      // Plane forward (-Z in local when -vUv.y = +1 => actually +Z is vUv.y=0 -> -p.y=+1!)
      // Check: PlaneGeometry rotated -PI/2 around X maps (x, y, 0) -> (x, 0, -y).
      // vUv.y = 0 at y = -0.5 -> z = +0.5. So -p.y = +1 is +Z (local forward)!
      // Rotating around Y by yaw turns +Z into (sin(yaw), 0, cos(yaw)), matching enemy heading!
      mesh.rotation.set(0, spec.yaw, 0);
      mesh.scale.set(spec.radius * 2, 1, spec.radius * 2);
    } else {
      u.uShape.value = 2;
      const len = spec.radius;
      const wid = spec.width ?? 1.25;
      const fx = Math.sin(spec.yaw);
      const fz = Math.cos(spec.yaw);
      mesh.position.set(spec.origin[0] + fx * len * 0.5, y, spec.origin[2] + fz * len * 0.5);
      mesh.rotation.set(0, spec.yaw, 0);
      mesh.scale.set(wid, 1, len);
    }
  }

  endFrame() {
    for (let i = this.cursor; i < this.meshes.length; i++) {
      this.meshes[i].visible = false;
    }
  }

  dispose() {
    for (const m of this.meshes) {
      m.removeFromParent();
      m.material.dispose();
    }
    this.meshes[0]?.geometry.dispose();
  }
}
