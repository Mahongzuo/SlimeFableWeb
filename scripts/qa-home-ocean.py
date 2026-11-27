"""
Multi-angle live WebGL verification for the upgraded Home infinite-ocean island:
- Zero console / WebGL / GLSL errors
- Verifies original fluid SlimeCharacter renders cleanly on top of HDR + Local Tone Mapping
- Verifies dynamic coastline & ocean SDF update when unlocking an expansion tile
- Captures aerial, sunset backlit grass/bamboo, harbor river mouth, grazing cliff seam, and expanded island views
- Measures frame benchmark ms via __app.bench()
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa/evidence"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5221)
    parser.add_argument("--preset", type=str, default="high")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            channel="chrome",
            headless=True,
            args=["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
        )
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.add_init_script("Element.prototype.requestPointerLock = () => Promise.resolve();")

        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on(
            "console",
            lambda m: errors.append(f"console.{m.type}: {m.text}")
            if m.type == "error" and "favicon" not in m.text and "404" not in m.text
            else None,
        )

        page.goto(f"http://127.0.0.1:{args.port}/?date=1015")
        page.wait_for_function("window.__slime?.ready && window.__game?.state === 'title'", timeout=90000)

        # Switch to requested quality preset & wait for GLB assets to settle
        page.evaluate(f"window.__graphics.set('{args.preset}')")
        page.wait_for_function(
            "window.__app?.scene.getObjectByName('garden-build-huizhou')?.children[0]?.children.length > 0",
            timeout=60000,
        )

        # Enter play mode to verify live fluid SlimeCharacter surface & deformation
        page.locator("[data-act=start]").click()
        page.wait_for_function("window.__game.state === 'play'")
        page.wait_for_timeout(600)

        slime_info = page.evaluate("""() => {
          const s = window.__slime;
          return {
            ready: !!s?.ready,
            running: !!s?.running,
            count: s?.renderer?.frame?.count ?? 0,
            pos: s?.position ?? null,
          };
        }""")
        print("[QA] Slime check:", slime_info)
        assert slime_info["ready"] and slime_info["running"] and slime_info["count"] > 100, slime_info

        # Benchmark frame time in live play
        bench_ms = page.evaluate("window.__app.bench(16)")
        gpu_name = page.evaluate("""() => {
          const gl = window.__app.renderer.getContext();
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        }""")
        print(f"[QA] GPU: {gpu_name} | Preset: {args.preset} | Median/Avg 16f: {bench_ms:.2f} ms")

        # Return to title (pauses slime follow-cam) & hide HUD for clean multi-angle visual evidence
        page.evaluate("window.__game.toTitle(); window.__app.renderer.setAnimationLoop(null); document.querySelector('#game-ui').style.visibility='hidden';")
        # Also hide life HUD if visible
        page.evaluate("document.querySelectorAll('.life-hud, #life-hud').forEach(el => el.style.visibility='hidden');")

        shots = [
            ("aerial-noon", "正午俯瞰 · 无限海域与浅海礁石", [-145, 50, -76], [-34, 1.5, 22], 780, "clear"),
            ("sunset-grass", "黄金日落 · 逆光草海竹梢与日光路", [-104, 3.8, -22], [-220, 2.4, -75], 1046, "clear"),
            ("harbor-slime", "临水书埠 · 流体史莱姆与入海口", [7.5, 3.6, 23.5], [-4.0, 0.8, 4.0], 760, "clear"),
            ("cliff-grazing", "贴地斜看 · 岩崖沙滩接缝防闪烁检查", [38, 4.2, -20], [18, 0.2, 18], 810, "clear"),
            ("lake-foliage", "镜湖竹树 · 球面叶簇 ISM 与水面倒影", [10, 4.6, 86], [-6, 1.8, 122], 840, "clear"),
            ("mist-dawn", "清晨薄雾 · 体积雾与大气透视", [-32, 18, -56], [-30, 2.0, 35], 440, "mist"),
        ]

        saved_paths: list[tuple[str, Path]] = []
        for key, label, pos, tgt, minute, weather in shots:
            page.evaluate(
                "([pos, tgt, m, w]) => window.__homeCalib.setView(pos, tgt, m, w)",
                [pos, tgt, minute, weather],
            )
            p = OUT / f"home-ocean-{key}.jpg"
            page.screenshot(path=p, quality=92)
            saved_paths.append((label, p))

        # Test dynamic coastline & ocean SDF update when unlocking an expansion tile via real FrontierRenderer!
        exp_check = page.evaluate("""() => {
          const ic = window.__app.ctx.islandCoast;
          const beforeBounds = ic.sdf.bounds.toArray();
          const tile = {id: 'tile_0_2', gx: 0, gz: 2, theme: 'coast', unlockedAt: 1};
          window.__game.builder.frontier.sync([tile], 'coast', [0, 160]);
          const afterBounds = ic.sdf.bounds.toArray();
          return {beforeBounds, afterBounds};
        }""")
        print("[QA] Dynamic SDF expansion check:", exp_check)
        assert exp_check["afterBounds"] != exp_check["beforeBounds"], "SDF bounds must expand dynamically!"

        page.evaluate(
            "window.__homeCalib.setView([62, 34, 152], [-10, 1.0, 155], 790, 'clear')"
        )
        p_exp = OUT / "home-ocean-expanded-coast.jpg"
        page.screenshot(path=p_exp, quality=92)

        assert not errors, f"Console/page errors detected:\n" + "\n".join(errors)
        browser.close()

    # Compose 3x2 visual contact sheet
    sheet = Image.new("RGB", (1440, 680), "#10181d")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 18)
    except Exception:
        font = ImageFont.load_default()

    for idx, (label, path) in enumerate(saved_paths):
        col = idx % 3
        row = idx // 3
        x = 12 + col * 476
        y = 12 + row * 334
        with Image.open(path) as im:
            sheet.paste(ImageOps.fit(im, (464, 286)), (x, y))
        draw.text((x + 6, y + 292), label, font=font, fill="#e4eff2")

    overview = OUT / "home-ocean-overview.jpg"
    sheet.save(overview, quality=92)
    summary = {
        "gpu": gpu_name,
        "preset": args.preset,
        "benchMs": round(bench_ms, 2),
        "slime": slime_info,
        "errors": errors,
        "overview": str(overview),
    }
    (OUT / "home-ocean-qa.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[QA] ALL PASSED! Overview saved to {overview}")


if __name__ == "__main__":
    main()
