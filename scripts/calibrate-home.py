"""
Step 4-8 Math-Driven Rendering Calibration Loop (OKLCH ROI measurement + damped Gauss-Newton / LM least-squares fit).

Usage:
  python scripts/calibrate-home.py --port 5180 --iters 6
  python scripts/calibrate-home.py --port 5180 --measure-only

Supports optional custom user reference images placed in qa/references/ (aerial-day-island.jpg, sunset-coastal-grass.jpg, etc.).
Runs strictly in isolated headless Chrome with pointer lock disabled.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont, ImageOps
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
TARGETS_PATH = ROOT / "qa/calibration/targets.json"
CUSTOM_REFS_DIR = ROOT / "qa/references"
CALIB_TS_PATH = ROOT / "src/home/render/calibrated-params.ts"
EVIDENCE_DIR = ROOT / "qa/evidence"

# Tunable subset of physical parameters fitted by least-squares (bounds match src/home/render/params.ts)
FIT_KEYS = [
    ("rayleighScale", 0.55, 1.85, 0.08),
    ("mieScale", 0.45, 2.40, 0.10),
    ("sunIlluminance", 2.2, 7.5, 0.35),
    ("skyLuminanceScale", 0.65, 1.85, 0.08),
    ("oceanAbsorbR", 0.22, 0.82, 0.04),
    ("oceanAbsorbG", 0.05, 0.28, 0.02),
    ("oceanAbsorbB", 0.02, 0.14, 0.012),
    ("oceanScatterIntensity", 0.20, 1.25, 0.08),
    ("exposureTarget", 0.14, 0.36, 0.02),
    ("exposureBias", -0.65, 0.65, 0.08),
    ("localShadowBoost", 0.05, 0.65, 0.06),
    ("localHighlightCompress", 0.08, 0.68, 0.06),
    ("saturation", 0.86, 1.26, 0.04),
    ("grassAlbedoScale", 0.72, 1.35, 0.05),
    ("grassSssStrength", 0.25, 1.50, 0.10),
]


def srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb_to_oklch(r: float, g: float, b: float) -> tuple[float, float, float]:
    lr, lg, lb = srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b)
    l = max(0.0, 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
    m = max(0.0, 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
    s = max(0.0, 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
    l_, m_, s_ = l ** (1 / 3), m ** (1 / 3), s ** (1 / 3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    C = math.hypot(a, bb)
    h = math.degrees(math.atan2(bb, a)) % 360.0
    return L, C, h


def measure_roi_oklch(img: Image.Image, box: list[float]) -> tuple[float, float, float]:
    w, h = img.size
    x0, y0 = int(box[0] * w), int(box[1] * h)
    x1, y1 = max(x0 + 1, int(box[2] * w)), max(y0 + 1, int(box[3] * h))
    crop = img.crop((x0, y0, x1, y1)).resize((24, 24), Image.Resampling.BILINEAR)
    px = list(crop.getdata())
    # Sample 24x24 = 576 points per ROI (100+ points across views)
    Ls, As, Bs = [], [], []
    for r, g, b in px:
        L, C, hd = rgb_to_oklch(r / 255.0, g / 255.0, b / 255.0)
        hr = math.radians(hd)
        Ls.append(L)
        As.append(C * math.cos(hr))
        Bs.append(C * math.sin(hr))
    n = max(1, len(Ls))
    mean_L = sum(Ls) / n
    mean_a = sum(As) / n
    mean_b = sum(Bs) / n
    mean_C = math.hypot(mean_a, mean_b)
    mean_h = math.degrees(math.atan2(mean_b, mean_a)) % 360.0
    return mean_L, mean_C, mean_h


def oklch_residual(meas: tuple[float, float, float], targ: dict[str, float], w: float) -> list[float]:
    dL = (meas[0] - targ["L"]) * 1.15 * w
    dC = (meas[1] - targ["C"]) * 1.45 * w
    dh = ((meas[2] - targ["h"] + 540.0) % 360.0) - 180.0
    chroma_scale = math.sqrt(max(0.0, meas[1] * targ["C"]))
    dH = 2.0 * chroma_scale * math.sin(math.radians(dh) * 0.5) * 0.85 * w
    return [dL, dC, dH]


def solve_linear(A: list[list[float]], b: list[float]) -> list[float] | None:
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(M[r][col]))
        if abs(M[piv][col]) < 1e-12:
            return None
        M[col], M[piv] = M[piv], M[col]
        diag = M[col][col]
        for c in range(col, n + 1):
            M[col][c] /= diag
        for r in range(n):
            if r == col:
                continue
            f = M[r][col]
            for c in range(col, n + 1):
                M[r][c] -= f * M[col][c]
    return [M[i][n] for i in range(n)]


def load_targets() -> dict[str, Any]:
    data = json.loads(TARGETS_PATH.read_text(encoding="utf-8"))
    # Allow user drop-in custom reference frames in qa/references/<view_id>.jpg|.png
    if CUSTOM_REFS_DIR.exists():
        for view in data["views"]:
            for ext in (".jpg", ".jpeg", ".png", ".webp"):
                ref_file = CUSTOM_REFS_DIR / f"{view['id']}{ext}"
                if ref_file.exists():
                    with Image.open(ref_file).convert("RGB") as ref_img:
                        for roi in view["rois"]:
                            L, C, h = measure_roi_oklch(ref_img, roi["box"])
                            roi["target"] = {"L": round(L, 4), "C": round(C, 4), "h": round(h, 2)}
                    print(f"[Calibrate] Loaded custom reference targets from {ref_file.name}")
                    break
    return data


def write_calibrated_ts(params: dict[str, float]):
    lines = [
        "import type {HomeRenderParams} from './params';",
        "",
        "/**",
        " * Calibrated physical rendering parameters written by scripts/calibrate-home.py.",
        " * Fitted via OKLCH ROI least-squares optimization across daylight, sunset, harbor & mist views.",
        " */",
        "export const CALIBRATED_PARAMS: Partial<HomeRenderParams> = {",
    ]
    for k, v in params.items():
        lines.append(f"  {k}: {round(float(v), 4)},")
    lines.append("};")
    lines.append("")
    CALIB_TS_PATH.write_text("\n".join(lines), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5180)
    parser.add_argument("--iters", type=int, default=4)
    parser.add_argument("--measure-only", action="store_true")
    parser.add_argument("--preset", type=str, default="high")
    args = parser.parse_args()

    targets = load_targets()
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    tmp_shot = ROOT / "qa/shots/calib-tmp.png"
    tmp_shot.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            channel="chrome",
            headless=True,
            args=["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
        )
        page = browser.new_page(viewport={"width": 960, "height": 540})
        page.add_init_script("Element.prototype.requestPointerLock = () => Promise.resolve();")
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "404" not in m.text else None)

        page.goto(f"http://127.0.0.1:{args.port}/?date=1015")
        page.wait_for_function("window.__slime?.ready && window.__game?.state==='title' && window.__homeCalib", timeout=90000)
        page.evaluate(f"window.__graphics.set('{args.preset}'); window.__game.toTitle(); window.__app.renderer.setAnimationLoop(null);")
        page.evaluate("document.querySelector('#game-ui').style.visibility='hidden'; document.querySelectorAll('.life-hud, #life-hud').forEach(el => el.style.visibility='hidden');")

        def evaluate_params(p: dict[str, float], save_prefix: str | None = None):
            page.evaluate("v => window.__homeCalib.setParams(v)", p)
            residuals: list[float] = []
            report: list[dict[str, Any]] = []
            for view in targets["views"]:
                page.evaluate(
                    "([pos, tgt, m, w]) => window.__homeCalib.setView(pos, tgt, m, w)",
                    [view["cameraPos"], view["cameraTarget"], view["minute"], view["weather"]],
                )
                shot_path = EVIDENCE_DIR / f"{save_prefix}-{view['id']}.jpg" if save_prefix else tmp_shot
                page.screenshot(path=shot_path, quality=92 if save_prefix else None)
                with Image.open(shot_path).convert("RGB") as im:
                    for roi in view["rois"]:
                        meas = measure_roi_oklch(im, roi["box"])
                        res = oklch_residual(meas, roi["target"], roi.get("weight", 1.0))
                        residuals.extend(res)
                        report.append({
                            "view": view["id"],
                            "roi": roi["name"],
                            "meas": [round(x, 3) for x in meas],
                            "target": [roi["target"]["L"], roi["target"]["C"], roi["target"]["h"]],
                            "err": round(math.sqrt(sum(x * x for x in res)), 4),
                        })
            rmse = math.sqrt(sum(r * r for r in residuals) / max(1, len(residuals)))
            return residuals, rmse, report

        cur_params: dict[str, float] = page.evaluate("window.__homeCalib.getParams()")
        base_res, base_rmse, base_rep = evaluate_params(cur_params, save_prefix="calib-before")
        print(f"[Calibrate] Initial RMSE_OKLCH = {base_rmse:.4f} ({len(base_res)} residuals across {len(base_rep)} ROIs)")

        best_params = dict(cur_params)
        best_rmse = base_rmse
        best_res = base_res
        lam = 0.08

        if not args.measure_only:
            for it in range(args.iters):
                # Coordinate-blocked finite-difference Jacobian + damped LM step
                n_res = len(best_res)
                n_p = len(FIT_KEYS)
                J = [[0.0] * n_p for _ in range(n_res)]
                for j, (k, lo, hi, step) in enumerate(FIT_KEYS):
                    probe = dict(best_params)
                    h = step if best_params[k] + step <= hi else -step
                    probe[k] = max(lo, min(hi, best_params[k] + h))
                    dh = probe[k] - best_params[k]
                    if abs(dh) < 1e-6:
                        continue
                    r_probe, _, _ = evaluate_params(probe)
                    for i in range(n_res):
                        J[i][j] = (r_probe[i] - best_res[i]) / dh

                # Build (J^T J + lam*diag) * delta = -J^T r
                JtJ = [[0.0] * n_p for _ in range(n_p)]
                Jtr = [0.0] * n_p
                for i in range(n_res):
                    ri = best_res[i]
                    Ji = J[i]
                    for a in range(n_p):
                        Jtr[a] += Ji[a] * ri
                        for b in range(a, n_p):
                            JtJ[a][b] += Ji[a] * Ji[b]
                for a in range(n_p):
                    for b in range(a):
                        JtJ[a][b] = JtJ[b][a]
                    JtJ[a][a] += lam * max(1e-3, JtJ[a][a] + 1e-2)

                delta = solve_linear(JtJ, [-v for v in Jtr])
                if not delta:
                    lam *= 3.0
                    continue
                cand = dict(best_params)
                for j, (k, lo, hi, step) in enumerate(FIT_KEYS):
                    max_move = step * 2.5
                    move = max(-max_move, min(max_move, delta[j]))
                    cand[k] = max(lo, min(hi, best_params[k] + move))
                cand_res, cand_rmse, _ = evaluate_params(cand)
                print(f"[Calibrate] Iter {it + 1}/{args.iters}: candidate RMSE = {cand_rmse:.4f} (best = {best_rmse:.4f}, lam = {lam:.3f})")
                if cand_rmse < best_rmse:
                    best_params, best_rmse, best_res = cand, cand_rmse, cand_res
                    lam = max(0.01, lam * 0.5)
                else:
                    lam = min(10.0, lam * 2.5)

            write_calibrated_ts(best_params)

        _, final_rmse, final_rep = evaluate_params(best_params, save_prefix="calib-after")
        print(f"[Calibrate] Final RMSE_OKLCH = {final_rmse:.4f} (improved from {base_rmse:.4f})")
        assert not errors, f"Runtime console errors during calibration: {errors}"
        browser.close()

    # Build side-by-side before/after calibration evidence sheet
    views = targets["views"]
    sheet = Image.new("RGB", (980, 620), "#121a20")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 16)
        title_font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 20)
    except Exception:
        font = ImageFont.load_default()
        title_font = font

    draw.text(
        (16, 10),
        f"OKLCH 最小二乘校准对照  |  RMSE: {base_rmse:.4f} -> {final_rmse:.4f}",
        font=title_font,
        fill="#e9f3f5",
    )
    for idx, view in enumerate(views[:4]):
        y = 44 + idx * 142
        for col_idx, prefix in enumerate(("calib-before", "calib-after")):
            p = EVIDENCE_DIR / f"{prefix}-{view['id']}.jpg"
            if p.exists():
                with Image.open(p) as im:
                    thumb = ImageOps.fit(im, (236, 126))
                    sheet.paste(thumb, (16 + col_idx * 246, y))
        tag = f"{view['label']} ({view['weather']})"
        draw.text((516, y + 6), tag, font=font, fill="#bfe2e8")
        v_reps = [r for r in final_rep if r["view"] == view["id"]][:4]
        for r_i, r in enumerate(v_reps):
            line = f"{r['roi']:<15} L:{r['meas'][0]:.2f}/{r['target'][0]:.2f} C:{r['meas'][1]:.2f}/{r['target'][1]:.2f} err:{r['err']:.3f}"
            draw.text((516, y + 32 + r_i * 22), line, font=font, fill="#d8e3e6")

    out_sheet = EVIDENCE_DIR / "home-ocean-calibration.jpg"
    sheet.save(out_sheet, quality=92)
    (EVIDENCE_DIR / "home-ocean-calibration.json").write_text(
        json.dumps({"beforeRMSE": base_rmse, "afterRMSE": final_rmse, "params": best_params, "rois": final_rep}, indent=2),
        encoding="utf-8",
    )
    print(f"[Calibrate] Saved evidence sheet -> {out_sheet}")


if __name__ == "__main__":
    main()
