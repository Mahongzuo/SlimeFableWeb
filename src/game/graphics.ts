import type {SlimeCharacter} from '../slime/character';
import {ZONES} from '../world/map';
/**
 * Graphics presets for the Home. Cost per frame is mostly whole-scene passes: shadow map, sea reflection, puddle
 * reflection, lake reflection, outline normals and the main MSAA pass all redraw the scene; the slime adds a worker
 * simulation + surface mesh. Each preset scales those levers; "auto" picks one from the GPU and steps down when the
 * measured frame rate stays low.
 */
export type Preset = 'low' | 'medium' | 'high' | 'ultra';
export type QualitySetting = Preset | 'auto';
export const PRESET_NAMES: Record<QualitySetting, string> = {auto: '自动', low: '低', medium: '中', high: '高', ultra: '极致'};
interface Spec {/** smallest world radius (m) still drawn in reflections */ reflectMin: number; scale: number; msaa: number; shadow: number; shadowEvery: number; refl: [number, number, number]; reflEvery: number; draw: number; grass: number; slime: 'high' | 'balanced'; fogMin: number}
export const PRESETS: Record<Preset, Spec> = {
  low: {reflectMin: 2.5, scale: .7, msaa: 0, shadow: 1024, shadowEvery: 3, refl: [.2, .15, .18], reflEvery: 3, draw: 70, grass: .2, slime: 'balanced', fogMin: .009},
  medium: {reflectMin: 1.2, scale: 1, msaa: 2, shadow: 2048, shadowEvery: 2, refl: [.3, .22, .25], reflEvery: 2, draw: 110, grass: .5, slime: 'balanced', fogMin: .006},
  high: {reflectMin: .45, scale: 1.25, msaa: 4, shadow: 2048, shadowEvery: 1, refl: [.42, .3, .35], reflEvery: 1, draw: 170, grass: .85, slime: 'high', fogMin: 0},
  ultra: {reflectMin: 0, scale: 2, msaa: 4, shadow: 4096, shadowEvery: 1, refl: [.5, .35, .4], reflEvery: 1, draw: 1e4, grass: 1, slime: 'high', fogMin: 0},
};
const ORDER: Preset[] = ['low', 'medium', 'high', 'ultra'];
/** Objects that never need reflections, outlines or cast shadows: they go on their own layer (main camera only). */
const LIGHT_ONLY = /grass|flower|tuft|leaf|weed|reed|crop|critters|pickup|path-stones|steam|-fx\b|fx-|_fx/i;
export const LAYER_LIGHT_ONLY = 3, LAYER_REFLECT = 4;

/** First guess from the GPU name, core count and screen; "auto" then corrects from measured frame times. */
export function detectPreset(renderer: any): Preset {
  let gpu = '';
  try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch {}
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (matchMedia?.('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900);
  let p: Preset = /RTX|GTX 1[06-9]|RX [5-9]\d{2,3}|Radeon Pro|M[1-9] (Pro|Max|Ultra)|Arc A[57]/i.test(gpu) ? 'high' : /Intel|UHD|Iris|Radeon\(TM\) Graphics|Vega|Apple M[1-9]|Apple GPU/i.test(gpu) ? 'medium' : /SwiftShader|llvmpipe|Software|Basic Render/i.test(gpu) ? 'low' : 'medium';
  if (mobile || /Mali|Adreno|PowerVR/i.test(gpu)) p = 'low';
  if ((navigator.hardwareConcurrency ?? 8) <= 4 && p !== 'low') p = ORDER[ORDER.indexOf(p) - 1];
  return p;
}

export class Graphics {
  preset: Preset = 'medium'; setting: QualitySetting = 'auto'; gpu = '';
  private reflectables: {m: any; r: number}[] = [];
  private frames: number[] = []; private last = performance.now(); private calm = 0; private tick = 0; private reflTick = 0;
  onAutoChange?: (p: Preset) => void;
  constructor(private ctx: any, private slime: SlimeCharacter, private zones: any[]) {
    // throttled reflections: render only every N frames (the texture is kept in between)
    for (const r of [ctx.waterReflection, ctx.puddleReflection]) if (r && !r.__wrapped) { const render = r.render.bind(r); r.render = (...a: any[]) => (this.reflTick % PRESETS[this.preset].reflEvery === 0 ? render(...a) : false); r.__wrapped = true; }
    (globalThis as any).__shadowTick = () => ++this.tick % PRESETS[this.preset].shadowEvery === 0;
    this.layers();
    // reflections only draw the reflect layer (+ sky/no-outline layer 1); which meshes join it depends on their size
    const T = ctx.THREE, sphere = new T.Sphere(); ctx.scene.updateMatrixWorld(true);
    ctx.scene.traverse((m: any) => { if (!(m.isMesh || m.isInstancedMesh) || !(m.layers.mask & 1)) return; const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); sphere.copy(g.boundingSphere).applyMatrix4(m.matrixWorld); this.reflectables.push({m, r: m.isInstancedMesh ? 99 : sphere.radius}); });
    for (const r of this.reflectors()) { r.camera.layers.mask = (1 << LAYER_REFLECT) | (1 << 1); }
  }
  /** Foliage, small props and effects skip the shadow, reflection and outline passes. */
  layers() {
    const cam = this.ctx.camera; cam.layers.enable(LAYER_LIGHT_ONLY);
    for (const root of this.zones) root.traverse((m: any) => { if (m.isMesh || m.isSprite || m.isInstancedMesh) { let path = ''; for (let n = m; n && n !== root; n = n.parent) path += n.name + '/'; if (LIGHT_ONLY.test(path)) { m.layers.set(LAYER_LIGHT_ONLY); m.castShadow = false; } } });
    // grass instance counts are scaled per preset
    for (const root of this.zones) root.traverse((m: any) => { if (m.isInstancedMesh && /grass|flower/i.test(m.name)) m.userData.fullCount ??= m.count; });
  }
  private reflectors() { const g = globalThis as any; return [this.ctx.waterReflection, this.ctx.puddleReflection, g.__lakeRefl].filter(Boolean); }
  set(setting: QualitySetting) {
    this.setting = setting; this.frames = []; this.calm = 0;
    this.apply(setting === 'auto' ? detectPreset(this.ctx.renderer) : setting);
  }
  apply(p: Preset) {
    const s = PRESETS[p], ctx = this.ctx, g = globalThis as any; this.preset = p;
    // above 1 it caps the device pixel ratio; below 1 it renders smaller and the browser upsamples
    g.__renderScale = s.scale >= 1 ? Math.min(window.devicePixelRatio || 1, s.scale) : s.scale;
    const rt = g.__harborRT; if (rt && rt.samples !== s.msaa) { rt.samples = s.msaa; rt.dispose(); }
    const sun = ctx.sun; if (sun?.shadow && sun.shadow.mapSize.x !== s.shadow) { sun.shadow.mapSize.set(s.shadow, s.shadow); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    if (ctx.waterReflection) ctx.waterReflection.scale = s.refl[0]; if (ctx.puddleReflection) ctx.puddleReflection.scale = s.refl[1];
    g.__lakeReflScale = s.refl[2]; g.__reflEvery = s.reflEvery;
    for (const {m, r} of this.reflectables) { if (r >= s.reflectMin) m.layers.enable(LAYER_REFLECT); else m.layers.disable(LAYER_REFLECT); }
    for (const r of this.reflectors()) r.camera.layers.mask = (1 << LAYER_REFLECT) | (1 << 1);
    for (const root of this.zones) root.traverse((m: any) => { if (m.userData.fullCount !== undefined) m.count = Math.max(1, Math.round(m.userData.fullCount * s.grass)); });
    this.slime.quality = s.slime;
    g.__harborResize?.();
  }
  /** Per frame: distance culling, fog floor, reflection cadence, and the auto preset's frame-time watch. */
  update(dt: number, playing: boolean) {
    this.reflTick++; (globalThis as any).__reflTick = this.reflTick;
    const s = PRESETS[this.preset], cam = this.ctx.camera.position;
    for (const root of this.zones) { const r = ZONES.find(z => 'zone-' + z.id === root.name); if (!r) continue;
      const dx = Math.max(r.min[0] - cam.x, 0, cam.x - r.max[0]), dz = Math.max(r.min[1] - cam.z, 0, cam.z - r.max[1]); root.visible = Math.hypot(dx, dz) < s.draw; }
    const fog = this.ctx.scene.fog; if (fog && s.fogMin && fog.density < s.fogMin) fog.density = s.fogMin;
    // auto: watch real frame intervals while playing; step down after 3 s under ~40 fps, up after 25 s over ~58 fps
    const now = performance.now(), ms = now - this.last; this.last = now;
    if (this.setting !== 'auto' || !playing || ms > 250) return;
    this.frames.push(ms); if (this.frames.length < 180) return;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length; this.frames = [];
    const i = ORDER.indexOf(this.preset);
    if (avg > 25 && i > 0) { this.apply(ORDER[i - 1]); this.calm = 0; this.onAutoChange?.(this.preset); }
    else if (avg < 17.5 && i < ORDER.length - 2) { if (++this.calm >= 8) { this.apply(ORDER[i + 1]); this.calm = 0; this.onAutoChange?.(this.preset); } }
    else this.calm = 0;
  }
}

/** Levels use their own lighter Stage: apply the same choice to its pixel ratio, shadow map and the slime. */
export function applyLevelQuality(stage: {renderer: any; sun: any}, slime: SlimeCharacter, setting: QualitySetting) {
  const p = setting === 'auto' ? detectPreset(stage.renderer) : setting, s = PRESETS[p];
  stage.renderer.setPixelRatio(s.scale >= 1 ? Math.min(window.devicePixelRatio || 1, s.scale) : s.scale);
  stage.renderer.setSize(innerWidth, innerHeight);
  if (stage.sun?.shadow) { stage.sun.shadow.mapSize.set(Math.min(s.shadow, 2048), Math.min(s.shadow, 2048)); stage.sun.shadow.map?.dispose(); stage.sun.shadow.map = null; }
  slime.quality = s.slime; return p;
}
