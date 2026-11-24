"""Exercise native HUD and gate dispatch in private headless Chromium."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:5190')
args = parser.parse_args()
catalog = json.loads((ROOT/'docs/level-catalog.json').read_text('utf-8-sig'))['days']
chapters = [chapter for day in catalog.values() for chapter in day['chapters'] if chapter['status'] == 'web']
native = ('explore-quest','runner','folio','lander','solstice')
shots = ROOT/'qa/evidence'

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':1152,'height':720}, device_scale_factor=1)
    page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_default_timeout(90000)
    for width,height,key in [(1152,720,'f'),(390,740,'Enter')]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(args.base+'/?date=1021')
        page.locator('[data-act=start]:enabled').click()
        page.wait_for_function("window.__game?.state==='play' && document.querySelector('.slime-hud:not([hidden])')")
        page.evaluate("()=>__slime.teleport([...__game.portals[4].slot.position])")
        btn = page.locator('.door-actions [data-act=go]')
        btn.wait_for()
        box = btn.bounding_box()
        assert box['width'] >= 160 and box['height'] >= 48
        if width < 600:
            footer = page.locator('.door-actions').bounding_box()
            assert box['width'] >= footer['width'] - 35
        assert btn.get_attribute('data-id') == '1021-skirmish'
        assert btn.evaluate("(b)=>b.contains(document.elementFromPoint(b.getBoundingClientRect().x+18,b.getBoundingClientRect().y+18))")
        page.wait_for_function("getComputedStyle(document.querySelector('.overlay')).opacity==='1'")
        bounds = page.locator('.door').bounding_box()
        assert bounds['x'] >= 0 and bounds['x']+bounds['width'] <= width
        page.screenshot(path=shots/f'1021-gate-{width}.jpg', quality=88)
        page.keyboard.press(key)
        page.wait_for_url('**/level.html?id=1021-skirmish')
        print('PASS', width, key, 'unique departure', flush=True)
    page.goto(args.base+'/?date=1112')
    page.locator('[data-act=start]:enabled').click()
    page.evaluate("()=>__slime.teleport([...__game.portals[1].slot.position])")
    page.locator('.door .pilot-list').wait_for()
    choices = page.locator('.door [data-act=go]')
    assert choices.count() == 4
    page.keyboard.press('f')
    page.wait_for_timeout(350)
    assert choices.count() == 4
    chosen = choices.nth(1).get_attribute('data-id')
    choices.nth(1).focus()
    page.keyboard.press('Enter')
    page.wait_for_url('**/level.html?id='+chosen)
    print('PASS five-chapter overflow and focused departure',flush=True)
    page.goto(args.base+'/?date=1123')
    page.locator('.title-actions [data-act=book]').click()
    match = page.locator('.book [data-id="1123-match"]')
    match.focus()
    page.keyboard.press('Enter')
    page.wait_for_url('**/level.html?id=1123-match')
    page.wait_for_function('window.__slime?.ready')
    assert not page.locator('.slime-hud').count()
    print('PASS focused storybook row opens match board', flush=True)
    for template in native:
        chapter = next(c for c in chapters if c['template']==template)
        page.goto(args.base+'/'+chapter['playPath'])
        page.locator('[data-act=start]:enabled').click()
        panel = page.locator('.slime-hud')
        panel.wait_for()
        assert panel.locator('[data-el]').count() == 6 and panel.locator('[data-skill]').count() == 3
        jewels = panel.locator('.elements').bounding_box()
        skills = panel.locator('.skills-dock').bounding_box()
        assert jewels['x'] >= 0 and jewels['x']+jewels['width'] < skills['x']
        panel.locator('[data-el="2"]').click()
        page.wait_for_function("document.querySelector('.slime-hud [data-el=\"2\"]').getAttribute('aria-pressed')==='true'")
        page.keyboard.press('q')
        page.wait_for_function("getComputedStyle(document.querySelector('[data-skill=Q]')).getPropertyValue('--energy').trim() !== '100%'")
        if template == 'folio':
            page.screenshot(path=shots/'1021-native-hud-mobile.jpg', quality=88)
        page.locator('[data-act=pause]').click()
        page.locator('.pause [data-act=resume]').wait_for()
        assert not panel.is_visible()
        page.locator('.pause [data-act=resume]').click()
        panel.wait_for()
        print('PASS native capability dock',chapter['id'],template,flush=True)
    for entry,button in [('0804-2007','[data-action=start]'),('1123-shot','[data-w=start]')]:
        page.goto(args.base+'/level.html?id='+entry)
        page.locator(button+':enabled').click()
        dock = page.locator('.slime-hud')
        dock.wait_for()
        assert dock.locator('[data-el]').count()==6 and not dock.locator('[data-skill]').count()
        dock.locator('[data-el="3"]').click()
        page.wait_for_function('window.__slime.element===3')
        print('PASS element-only puzzle',entry,flush=True)
    page.close()
    page = browser.new_page(viewport={'width':390,'height':740}, has_touch=True, is_mobile=True)
    page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
    page.on('pageerror', lambda error: errors.append(str(error)))
    for kind in ('skirmish','rpg'):
        page.goto(args.base+'/level.html?id=1021-'+kind)
        page.wait_for_function('window.__slime?.ready')
        panel = page.locator('.slime-hud')
        assert not panel.is_visible()
        page.locator('[data-primary]').click()
        panel.wait_for()
        health = panel.locator('progress')
        assert health.get_attribute('max')=='100'
        assert health.bounding_box()['y'] < panel.locator('.elements').bounding_box()['y']
        if kind=='skirmish':
            page.wait_for_function('window.__slime.aiming')
            dodge = page.locator('.bp-dodge')
            dodge.wait_for()
            assert dodge.bounding_box()['y']+dodge.bounding_box()['height'] < panel.locator('.skills-dock').bounding_box()['y']
            # Capture only after the ship's opening colour wash clears, even on slow software WebGL.
            page.wait_for_function('window.__level.encounter.clock >= 1.65')
            page.screenshot(path=shots/'1021-combat-hud-mobile.jpg',quality=88)
            dodge.tap()
            page.wait_for_function('Number.isFinite(window.__level.encounter.started)')
        page.keyboard.press('Escape')
        page.wait_for_function("window.__level.phase==='pause'")
        assert not panel.is_visible() and not page.locator('.bp-reticle').is_visible()
        assert page.locator('[data-primary]').evaluate('b=>b===document.activeElement')
        print('PASS combat and pause HUD',kind,flush=True)
    assert not errors, errors
    print('PASS clean match board and no runtime errors',flush=True)
    browser.close()

