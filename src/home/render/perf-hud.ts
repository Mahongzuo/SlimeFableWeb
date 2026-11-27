import type * as THREE from 'three';

interface PassSample {
  calls: number;
  triangles: number;
  gpuMs: number;
}

interface PendingQuery {
  query: WebGLQuery;
  label: string;
}

const WINDOW = 600;

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

/**
 * Frame profiler for the Home pipeline (`?perf=1`, or `window.__perf.enable()`).
 * Per pass: draw calls, triangles and GPU time from EXT_disjoint_timer_query_webgl2.
 * Per frame: CPU interval percentiles, hitch count and how many whole-scene passes ran.
 */
export class PerfHud {
  enabled = false;
  readonly passes = new Map<string, PassSample>();
  frameMs: number[] = [];
  sceneRenders: number[] = [];
  hitches = 0;
  frames = 0;
  gpuFrameMs = 0;

  private gl: WebGL2RenderingContext;
  private ext: any = null;
  private pending: PendingQuery[] = [];
  private open: PendingQuery | null = null;
  private passStart = {calls: 0, triangles: 0};
  private gpuAccum = new Map<string, number>();
  private lastFrame = 0;
  private sceneCount = 0;
  private box: HTMLDivElement | null = null;
  private lastPaint = 0;

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene) {
    this.gl = renderer.getContext() as WebGL2RenderingContext;
    const render = renderer.render.bind(renderer);
    renderer.render = (s: THREE.Object3D, c: THREE.Camera) => {
      if (this.enabled && s === this.scene) this.sceneCount++;
      render(s, c);
    };
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('perf')) this.enable(true);
  }

  get hasGpuTimer() {
    return this.enabled && !!this.ext;
  }

  enable(hud = false) {
    if (this.enabled && !hud) return;
    this.enabled = true;
    this.ext = this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.reset();
    if (hud && typeof document !== 'undefined' && !this.box) {
      const box = (this.box = document.createElement('div'));
      box.style.cssText =
        'position:fixed;left:8px;top:8px;z-index:9999;pointer-events:none;white-space:pre;' +
        'font:11px/1.35 ui-monospace,Consolas,monospace;color:#e8f4f2;background:rgba(10,18,22,.78);' +
        'padding:6px 8px;border-radius:6px;';
      document.body.appendChild(box);
    }
  }

  reset() {
    this.frameMs = [];
    this.sceneRenders = [];
    this.hitches = 0;
    this.frames = 0;
    this.passes.clear();
    this.gpuAccum.clear();
    this.lastFrame = 0;
  }

  /** Call once at the very start of a frame. */
  frameStart(shadowUpdated: boolean) {
    this.renderer.info.reset();
    if (!this.enabled) return;
    const now = performance.now();
    if (this.lastFrame) {
      const ms = now - this.lastFrame;
      if (ms < 250) {
        this.frameMs.push(ms);
        if (ms > 33.4) this.hitches++;
        if (this.frameMs.length > WINDOW) this.frameMs.shift();
      }
    }
    this.lastFrame = now;
    this.frames++;
    this.sceneCount = shadowUpdated ? 1 : 0;
    this.pollQueries();
  }

  begin(label: string) {
    if (!this.enabled) return;
    const info = this.renderer.info.render;
    this.passStart.calls = info.calls;
    this.passStart.triangles = info.triangles;
    if (this.ext && !this.open) {
      const query = this.gl.createQuery();
      if (query) {
        this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
        this.open = {query, label};
      }
    }
  }

  end(label: string) {
    if (!this.enabled) return;
    if (this.open && this.open.label === label) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.pending.push(this.open);
      this.open = null;
    }
    const info = this.renderer.info.render;
    const p = this.passes.get(label) ?? {calls: 0, triangles: 0, gpuMs: 0};
    p.calls = info.calls - this.passStart.calls;
    p.triangles = info.triangles - this.passStart.triangles;
    this.passes.set(label, p);
  }

  frameEnd() {
    if (!this.enabled) return;
    this.sceneRenders.push(this.sceneCount);
    if (this.sceneRenders.length > WINDOW) this.sceneRenders.shift();
    const now = performance.now();
    if (this.box && now - this.lastPaint > 250) {
      this.lastPaint = now;
      this.box.textContent = this.text();
    }
  }

  private pollQueries() {
    if (!this.ext) return;
    const gl = this.gl;
    if (gl.getParameter(this.ext.GPU_DISJOINT_EXT)) {
      for (const q of this.pending) gl.deleteQuery(q.query);
      this.pending = [];
      return;
    }
    let total = 0;
    let any = false;
    while (this.pending.length) {
      const q = this.pending[0];
      if (!gl.getQueryParameter(q.query, gl.QUERY_RESULT_AVAILABLE)) break;
      const ms = Number(gl.getQueryParameter(q.query, gl.QUERY_RESULT)) / 1e6;
      gl.deleteQuery(q.query);
      this.pending.shift();
      const prev = this.gpuAccum.get(q.label) ?? ms;
      const smooth = prev + (ms - prev) * 0.1;
      this.gpuAccum.set(q.label, smooth);
      const p = this.passes.get(q.label);
      if (p) p.gpuMs = smooth;
      any = true;
    }
    if (any) {
      for (const v of this.gpuAccum.values()) total += v;
      this.gpuFrameMs = total;
    }
  }

  stats() {
    const sorted = [...this.frameMs].sort((a, b) => a - b);
    const passes: Record<string, PassSample> = {};
    for (const [k, v] of this.passes) passes[k] = {...v, gpuMs: +v.gpuMs.toFixed(3)};
    return {
      frames: this.frames,
      p50: +percentile(sorted, 0.5).toFixed(2),
      p95: +percentile(sorted, 0.95).toFixed(2),
      p99: +percentile(sorted, 0.99).toFixed(2),
      max: +(sorted[sorted.length - 1] ?? 0).toFixed(2),
      hitches: this.hitches,
      gpuTimer: !!this.ext,
      gpuFrameMs: +this.gpuFrameMs.toFixed(3),
      sceneRendersMax: this.sceneRenders.length ? Math.max(...this.sceneRenders) : 0,
      sceneRendersAvg: this.sceneRenders.length
        ? +(this.sceneRenders.reduce((a, b) => a + b, 0) / this.sceneRenders.length).toFixed(2)
        : 0,
      passes,
    };
  }

  private text() {
    const s = this.stats();
    const lines = [
      `frame p50 ${s.p50}  p95 ${s.p95}  p99 ${s.p99}  max ${s.max} ms`,
      `hitch>33ms ${s.hitches}  scene passes ${s.sceneRendersAvg}/${s.sceneRendersMax}  gpu ${s.gpuTimer ? s.gpuFrameMs + ' ms' : 'n/a'}`,
    ];
    for (const [k, v] of Object.entries(s.passes)) {
      lines.push(`${k.padEnd(10)} ${String(v.calls).padStart(5)} dc ${(v.triangles / 1000).toFixed(0).padStart(6)}k tri ${s.gpuTimer ? v.gpuMs.toFixed(2) + ' ms' : ''}`);
    }
    return lines.join('\n');
  }
}
