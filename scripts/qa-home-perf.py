"""
Home render performance baseline (headless, never touches the desktop pointer or focus).

Serves an isolated build directory, opens the Home at a 3840x2160 viewport, enters play so the fluid
SlimeCharacter runs, then holds four fixed camera views for N seconds each while the in-page PerfHud
(src/home/render/perf-hud.ts) records frame intervals, hitches, per-pass draw calls / GPU time and the
number of whole-scene passes per frame. A synchronous gl.finish() benchmark gives the uncapped cost.

  npx vite build --outDir %TEMP%/slime-perf-new
  python scripts/qa-home-perf.py --dir %TEMP%/slime-perf-new --tag after
"""
from __future__ import annotations

import argparse
import functools
import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa/evidence"

VIEWS = [
    ("spawn-plaza", [6.5, 3.4, 26.0], [0.0, 0.8, 12.0]),
    ("lake-edge", [10.0, 4.6, 86.0], [-6.0, 1.8, 122.0]),
    ("east-coast", [40.0, 3.2, 24.0], [90.0, -0.2, 6.0]),
    ("boat-sea", [64.0, 2.4, -46.0], [10.0, 1.0, 4.0]),
    ("flythrough", None, None),
]


def serve(directory: Path, port: int):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a, **k):
            pass

    handler = functools.partial(Quiet, directory=str(directory))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="built site directory (vite --outDir)")
    ap.add_argument("--tag", default="baseline")
    ap.add_argument("--port", type=int, default=5233)
    ap.add_argument("--preset", default="high")
    ap.add_argument("--seconds", type=float, default=30)
    ap.add_argument("--width", type=int, default=3840)
    ap.add_argument("--height", type=int, default=2160)
    ap.add_argument("--query", default="", help="extra URL params, e.g. msaa=0&dynres=0")
    ap.add_argument("--views", default="", help="comma-separated subset of view keys")
    ap.add_argument("--probe", default="", help="JS expression evaluated and printed at each view")
    ap.add_argument("--eval", default="", help="JS expression evaluated once before the views (A/B toggles)")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    httpd = serve(Path(args.dir), args.port)

    errors: list[str] = []
    report: dict = {"tag": args.tag, "viewport": [args.width, args.height], "preset": args.preset, "views": {}}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            channel="chrome",
            headless=True,
            args=["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist", "--disable-gpu-vsync",
                  "--disable-frame-rate-limit"],
        )
        page = browser.new_page(viewport={"width": args.width, "height": args.height})
        page.add_init_script("Element.prototype.requestPointerLock = () => Promise.resolve();")
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}")
                if m.type == "error" and "favicon" not in m.text and "404" not in m.text else None)

        extra = f"&{args.query}" if args.query else ""
        report["query"] = args.query
        page.goto(f"http://127.0.0.1:{args.port}/?date=1015&perf=1{extra}")
        page.wait_for_function("window.__slime?.ready && window.__game?.state === 'title'", timeout=120000)
        page.evaluate(f"window.__graphics.set('{args.preset}')")
        page.wait_for_function(
            "window.__app?.scene.getObjectByName('garden-build-huizhou')?.children[0]?.children.length > 0",
            timeout=90000,
        )
        page.locator("[data-act=start]").click()
        page.wait_for_function("window.__game.state === 'play'")
        page.wait_for_timeout(1500)

        report["gpu"] = page.evaluate("""() => {
          const gl = window.__app.renderer.getContext();
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        }""")
        report["drawingBuffer"] = page.evaluate(
            "(() => { const v = new window.__app.ctx.THREE.Vector2(); window.__app.renderer.getDrawingBufferSize(v); return [v.x, v.y]; })()")
        report["slime"] = page.evaluate("""() => ({
          ready: !!window.__slime?.ready, running: !!window.__slime?.running,
          vertices: window.__slime?.renderer?.frame?.count ?? 0 })""")

        # A last-registered update hook pins the camera after the game's own camera logic each frame.
        page.evaluate("""() => {
          window.__perfView = null;
          window.__app.ctx.onUpdate((t) => {
            const v = window.__perfView; if (!v) return;
            const cam = window.__app.camera;
            if (v.fly) {
              // Loop around the island at about 12 m/s, looking slightly ahead along the path
              const k = ((t - v.t0) * 0.025) % 1, a = k * Math.PI * 2;
              const x = 10 + Math.sin(a) * 60, z = 40 + Math.cos(a) * 75, y = 5 + 2.5 * Math.sin(a * 3);
              const b = a + 0.25;
              cam.position.set(x, y, z); cam.lookAt(10 + Math.sin(b) * 60, 1, 40 + Math.cos(b) * 75);
            } else {
              cam.position.fromArray(v.pos); cam.lookAt(v.tgt[0], v.tgt[1], v.tgt[2]);
            }
            cam.updateMatrixWorld();
          });
        }""")

        if args.eval:
            report["eval"] = args.eval
            print(f"[perf] eval: {page.evaluate(args.eval)}")
        wanted = {v for v in args.views.split(",") if v}
        for key, pos, tgt in VIEWS:
            if wanted and key not in wanted:
                continue
            if pos is None:
                page.evaluate("() => { window.__perfView = {fly: true, t0: window.__app.ctx.U.uTime.value}; }")
            else:
                page.evaluate("([pos, tgt]) => { window.__perfView = {pos, tgt}; }", [pos, tgt])
            page.wait_for_timeout(2500)
            page.evaluate("window.__perf.reset()")
            page.wait_for_timeout(int(args.seconds * 1000))
            live = page.evaluate("window.__perf.stats()")
            live["sceneScale"] = page.evaluate("window.__pipeline?.sceneScale ?? 1")
            bench = page.evaluate("window.__app.bench(24)")
            live["benchMs"] = round(bench, 2)
            if args.probe:
                live["probe"] = page.evaluate(args.probe)
                print(f"[probe] {key}: {json.dumps(live['probe'], ensure_ascii=False)[:1500]}")
            report["views"][key] = live
            print(f"[perf] {key}: p50 {live['p50']} p99 {live['p99']} max {live['max']} hitches {live['hitches']} "
                  f"scenePasses {live['sceneRendersAvg']}/{live['sceneRendersMax']} bench {live['benchMs']} ms "
                  f"gpu {live['gpuFrameMs']} ms scale {live['sceneScale']}")
            page.screenshot(path=OUT / f"home-perf-{args.tag}-{key}.jpg", quality=85)

        browser.close()
    httpd.shutdown()
    report["errors"] = errors
    out = OUT / f"home-perf-{args.tag}.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[perf] wrote {out}")
    if errors:
        print("[perf] errors:\n" + "\n".join(errors[:20]))


if __name__ == "__main__":
    main()
