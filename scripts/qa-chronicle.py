"""Headless Chrome acceptance & multi-angle screenshot capture for chronicle levels."""
import argparse
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / 'qa' / 'evidence'
SAVE = 'slimefable.web.save.v1'
DEFAULT_IDS = ['1001-1890', '1015-2003', '1129-2022', '1213-1642']


async def run(base: str, ids: list[str]):
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    report = []
    errors = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            channel='chrome',
            headless=True,
            args=[
                '--enable-unsafe-swiftshader',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
            ],
        )
        pg = await browser.new_page(viewport={'width': 1180, 'height': 760})
        await pg.add_init_script('Element.prototype.requestPointerLock = () => Promise.resolve();')
        await pg.add_init_script(
            f"if (!localStorage.getItem('{SAVE}')) localStorage.setItem('{SAVE}', JSON.stringify({{v:1,quality:'medium'}}));"
        )

        page_errs = []
        pg.on('pageerror', lambda e: page_errs.append(str(e)))
        pg.on('response', lambda r: page_errs.append(f'{r.status} {r.url}') if r.status >= 400 and not r.url.endswith('/favicon.ico') else None)
        pg.on('console', lambda m: page_errs.append(m.text) if m.type == 'error' and '404' not in m.text else None)

        for cid in ids:
            page_errs.clear()
            url = f'{base.rstrip("/")}/level.html?id={cid}'
            await pg.goto(url, wait_until='domcontentloaded')
            await pg.wait_for_function(
                '() => window.__level?.spec && window.__slime?.ready',
                timeout=30000,
                polling=100,
            )
            # Advance simulation frames until fade-in curtain is 100% clear (stage.time >= 2.0)
            await pg.evaluate("""() => {
              const lvl = window.__level;
              for (let i = 0; i < 65 && lvl.stage.time < 2.1; i++) lvl.step(0.04);
            }""")
            await pg.wait_for_timeout(120)

            has_fluid = await pg.evaluate("""() => {
              const s = window.__slime;
              return Boolean(s && s.ready && s.renderer && s.latest && s.latest.count > 0 && s.latest.particleCount > 0);
            }""")
            if not has_fluid:
                errors.append(f'{cid}: native fluid slime not generated')

            # 1. Opening postcard shot (clear of fade)
            await pg.screenshot(path=EVIDENCE / f'chronicle-{cid}-intro.jpg', quality=88)

            # Start gameplay
            await pg.locator('[data-act=start]:visible').click()
            await pg.wait_for_function('() => window.__level.phase === "play"', timeout=10000)

            # Drive player to first pickup & mid-course to reveal story note ribbon
            await pg.evaluate("""() => {
              const lvl = window.__level, s = window.__slime;
              const p0 = lvl.layout.pickups[0];
              if (p0) {
                s.teleport([p0.pos[0], Math.max(0.05, p0.pos[1] - 0.3), p0.pos[2]]);
              }
              if (lvl.layout.mode === 'relay') {
                // Simulate clone launch onto pad and step a few frames
                s.launch([...lvl.layout.pads[0]]);
              }
              for (let i = 0; i < 30; i++) lvl.step(0.035);
            }""")
            await pg.wait_for_timeout(120)
            await pg.screenshot(path=EVIDENCE / f'chronicle-{cid}-play.jpg', quality=88)

            # 2. Low-angle oblique shot near finish plinth seam (anti-Z-fighting check)
            await pg.evaluate("""() => {
              const lvl = window.__level, cam = lvl.stage.camera, fin = lvl.layout.finish.pos;
              lvl.stage.renderer.setAnimationLoop(null);
              cam.position.set(fin[0] + 4.8, fin[1] + 1.05, fin[2] + 6.2);
              cam.lookAt(fin[0], fin[1] + 0.3, fin[2]);
              lvl.stage.render(0.016, window.__slime);
            }""")
            await pg.wait_for_timeout(80)
            await pg.screenshot(path=EVIDENCE / f'chronicle-{cid}-oblique.jpg', quality=88)

            # 3. Trigger finale & capture animated landmark
            await pg.evaluate("""() => {
              const lvl = window.__level;
              lvl.triggerFinale();
              for (let i = 0; i < 65; i++) lvl.step(0.04);
            }""")
            await pg.wait_for_timeout(100)
            await pg.screenshot(path=EVIDENCE / f'chronicle-{cid}-finale.jpg', quality=88)

            # Advance to done & verify save written
            await pg.evaluate("""() => {
              const lvl = window.__level;
              for (let i = 0; i < 120 && lvl.phase !== 'done'; i++) lvl.step(0.04);
            }""")
            done_ok = await pg.evaluate(f"""(cid) => {{
              const raw = JSON.parse(localStorage.getItem('{SAVE}') || '{{}}');
              return window.__level.phase === 'done'
                && Array.isArray(raw.completed) && raw.completed.includes(cid)
                && Array.isArray(raw.souvenirs) && raw.souvenirs.includes(cid);
            }}""", cid)
            if not done_ok:
                errors.append(f'{cid}: did not reach done or failed to write save')
            if page_errs:
                errors.append(f'{cid}: console errors: {page_errs}')

            rec = {'id': cid, 'fluid': has_fluid, 'done': done_ok, 'errors': list(page_errs)}
            report.append(rec)
            print('CHECK', rec, flush=True)

        # Verify Harbor Gate 1 (CN) & Gate 2 (Overseas) on 1015
        page_errs.clear()
        await pg.goto(f'{base.rstrip("/")}/?date=1015', wait_until='domcontentloaded')
        await pg.wait_for_function('() => window.__slime?.ready && window.__game?.showing?.shown?.day === "1015"', timeout=30000)
        gates_info = await pg.evaluate("""() => {
          const chs = window.__game.showing.shown.chapters.filter(c => c.status === 'web');
          return chs.map(c => ({id: c.id, quest: c.quest, era: c.era}));
        }""")
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=EVIDENCE / 'chronicle-harbor-1015.jpg', quality=88)
        report.append({'harbor1015': gates_info, 'errors': list(page_errs)})
        print('HARBOR 1015', gates_info, flush=True)
        if page_errs:
            errors.append(f'harbor 1015 errors: {page_errs}')

        await browser.close()

    (EVIDENCE / 'chronicle-phase1-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    if errors:
        raise SystemExit('QA FAILED:\n' + '\n'.join(errors))
    print('ALL CHRONICLE PHASE 1 QA PASSED!', flush=True)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='http://127.0.0.1:5190')
    ap.add_argument('ids', nargs='*', default=DEFAULT_IDS)
    args = ap.parse_args()
    asyncio.run(run(args.base, args.ids))
