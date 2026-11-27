"""
Home water close-up shots (headless, never touches the desktop pointer or focus).

Each water feature is shot from a regular play angle and a low grazing angle, so seams, shoreline foam,
wet sand, puddle edges and depth conflicts show from at least two directions.

  npx vite build --outDir %TEMP%/slime-water
  python scripts/qa-home-water.py --dir %TEMP%/slime-water --tag after
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

# Fixed views: (key, [regular pos, target], [grazing pos, target]). "auto:*" views are resolved in the page.
VIEWS = [
    ("puddles", ([9.0, 2.4, 20.0], [6.1, 0.0, 15.4]), ([9.6, 0.55, 17.6], [5.0, 0.0, 14.6])),
    ("lake-shore", ([2.0, 3.0, 102.0], [-6.0, 0.4, 122.0]), ([1.0, 0.9, 108.0], [-7.0, 0.3, 124.0])),
    ("coast-south", "auto:coast:3.6", None),
    ("coast-east", "auto:coast:1.2", None),
    ("bridge-pier", "auto:bridge", None),
    ("ocean-rocks", ([58.0, 3.0, -30.0], [40.0, -0.4, -12.0]), ([54.0, 0.6, -26.0], [40.0, -0.3, -12.0])),
    # fluid slime beside the spawn puddle: its body must show in the shared mirror
    ("slime-mirror", "auto:slime", None),
]

RESOLVE = """([kind, arg]) => {
  const app = window.__app, T = app.ctx.THREE, scene = app.scene;
  const rc = new T.Raycaster();
  const solids = [];
  scene.traverse(o => { if (o.isMesh && o.visible && !o.layers.isEnabled(6) && !/water|ocean|sky|cloud|foam|grass/i.test(o.name)) solids.push(o); });
  const groundAt = (x, z) => {
    rc.set(new T.Vector3(x, 60, z), new T.Vector3(0, -1, 0));
    const h = rc.intersectObjects(solids, false)[0];
    return h ? h.point.y : -99;
  };
  if (kind === 'coast') {
    // March inward from open sea until the ground first rises above sea level: that is the beach
    const a = parseFloat(arg), dx = Math.sin(a), dz = Math.cos(a), nx = -dz, nz = dx;
    for (let r = 170; r > 10; r -= 0.5) {
      const sx = 10 + dx * r, sz = 40 + dz * r;
      if (groundAt(sx, sz) <= -0.38) continue;
      const g = Math.max(-0.3, groundAt(sx - dx * 2.5, sz - dz * 2.5));
      return [[[sx - dx * 7 + nx * 3, g + 2.6, sz - dz * 7 + nz * 3], [sx + dx * 4, -0.4, sz + dz * 4]],
              [[sx - dx * 2.5 + nx * 2, g + 0.45, sz - dz * 2.5 + nz * 2], [sx + dx * 6 - nx * 2, -0.3, sz + dz * 6 - nz * 2]]];
    }
    return null;
  }
  if (kind === 'slime') {
    // float the slime in the lake shallows and look back at it from over the water
    const sx = 8.5, sz = 100.6, y = -0.35;
    window.__slime?.teleport?.([sx, y + 0.8, sz]);
    return [[[sx + 1.5, y + 1.5, sz + 7.5], [sx, y, sz]],
            [[sx + 1.0, y + 0.45, sz + 5.0], [sx, y, sz]]];
  }
  if (kind === 'bridge') {
    let hit = null;
    scene.traverse(o => { if (!hit && /bridge/i.test(o.name) && o.isObject3D && o.children.length) hit = o; });
    if (!hit) return null;
    const b = new T.Box3().setFromObject(hit), c = b.getCenter(new T.Vector3()), s = b.getSize(new T.Vector3());
    const along = s.x > s.z ? [0, 1] : [1, 0], span = Math.max(s.x, s.z) * 0.5;
    return [[[c.x + along[0] * (span + 5), c.y + 2.2, c.z + along[1] * (span + 5)], [c.x, b.min.y + 0.3, c.z]],
            [[c.x + along[0] * 4 + (1 - along[0]) * 2, b.min.y + 0.5, c.z + along[1] * 4 + (1 - along[1]) * 2], [c.x, b.min.y + 0.2, c.z]]];
  }
  return null;
}"""


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
    ap.add_argument("--tag", default="after")
    ap.add_argument("--port", type=int, default=5234)
    ap.add_argument("--preset", default="high")
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--query", default="")
    ap.add_argument("--views", default="")
    ap.add_argument("--wet", type=float, default=-1, help="force weather wetness 0..1 (default: leave as is)")
    ap.add_argument("--eval", default="", help="JS expression evaluated before the shots (debug overrides)")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    httpd = serve(Path(args.dir), args.port)

    errors: list[str] = []
    shots: dict = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            channel="chrome", headless=True,
            args=["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
        )
        page = browser.new_page(viewport={"width": args.width, "height": args.height})
        page.add_init_script("Element.prototype.requestPointerLock = () => Promise.resolve();")
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}")
                if m.type == "error" and "favicon" not in m.text and "404" not in m.text else None)
        extra = f"&{args.query}" if args.query else ""
        page.goto(f"http://127.0.0.1:{args.port}/?date=1015{extra}")
        page.wait_for_function("window.__slime?.ready && window.__game?.state === 'title'", timeout=120000)
        page.evaluate(f"window.__graphics.set('{args.preset}')")
        page.wait_for_function(
            "window.__app?.scene.getObjectByName('garden-build-huizhou')?.children[0]?.children.length > 0",
            timeout=90000,
        )
        page.locator("[data-act=start]").click()
        page.wait_for_function("window.__game.state === 'play'")
        page.wait_for_timeout(1500)
        page.evaluate("""(wet) => {
          window.__waterView = null;
          window.__app.ctx.onUpdate(() => {
            if (wet >= 0) { const w = window.__app.ctx.weather; w.wet = wet; }
            const v = window.__waterView; if (!v) return;
            const cam = window.__app.camera;
            cam.position.fromArray(v[0]); cam.lookAt(v[1][0], v[1][1], v[1][2]); cam.updateMatrixWorld();
          });
        }""", args.wet)
        if args.eval:
            print(f"[water] eval: {page.evaluate(args.eval)}")
        slime = page.evaluate("""() => ({ready: !!window.__slime?.ready, running: !!window.__slime?.running,
          vertices: window.__slime?.renderer?.frame?.count ?? 0})""")

        wanted = {v for v in args.views.split(",") if v}
        for key, regular, grazing in VIEWS:
            if wanted and key not in wanted:
                continue
            if isinstance(regular, str):
                _, kind, *rest = regular.split(":")
                pair = page.evaluate(RESOLVE, [kind, rest[0] if rest else ""])
                if not pair:
                    print(f"[water] {key}: could not resolve")
                    continue
                regular, grazing = pair
            for angle, view in (("a", regular), ("b", grazing)):
                page.evaluate("(v) => { window.__waterView = v; }", list(view))
                page.wait_for_timeout(1600)
                path = OUT / f"home-water-{args.tag}-{key}-{angle}.jpg"
                page.screenshot(path=path, quality=85)
                shots[f"{key}-{angle}"] = {"camera": view, "file": path.name}
                print(f"[water] {key}-{angle}: {path.name}")
        browser.close()
    httpd.shutdown()
    report = {"tag": args.tag, "slime": slime, "shots": shots, "errors": errors}
    log = ROOT / "qa/shots"
    log.mkdir(parents=True, exist_ok=True)
    (log / f"home-water-{args.tag}.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[water] slime {slime}")
    if errors:
        print("[water] errors:\n" + "\n".join(errors[:20]))


if __name__ == "__main__":
    main()
