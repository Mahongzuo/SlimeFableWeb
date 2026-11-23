from pathlib import Path
import argparse
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
base=parser.parse_args().base
shots=Path(__file__).resolve().parents[1]/'qa/evidence'
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page()
    page.set_default_timeout(60000)
    page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    for mode,person in [('skirmish','纳尔逊'),('rpg','小早川秀秋')]:
        for width,height in [(1080,760),(390,740)]:
            page.set_viewport_size({'width':width,'height':height})
            page.goto(base+'/level.html?id=1021-'+mode)
            page.wait_for_function('window.__slime?.ready && __slime.ctx.time>1.3')
            story=page.locator('.bp-card details[open]')
            assert person in story.inner_text() and story.locator('h4').count()==3
            assert story.locator('a').count()>=2
            button=page.locator('[data-primary]')
            assert button.bounding_box()['y']+button.bounding_box()['height']<=height
            if width==1080:page.screenshot(path=shots/('1021-history-'+mode+'.jpg'),quality=89)
            button.click()
            page.wait_for_function("__level.phase==='play'")
            page.mouse.click(width//2,height//2,button='right')
            page.wait_for_function('Number.isFinite(__level.encounter.started)')
            assert page.evaluate('!__slime.dragging&&!__slime.rightAimHeld')
            page.keyboard.press('Escape')
            page.locator('.bp-card summary').click()
            assert person in page.locator('.bp-card details[open]').inner_text()
        print(mode,'right click, both layouts, pause recollection passed',flush=True)
    page.goto(base+'/?date=1021')
    page.locator('.title-actions [data-act=book]').click()
    for name in ['特拉法加海战','关原之战']:
        summary=page.locator('.mode-entry summary',has_text=name)
        summary.click()
        assert summary.locator('..').locator('h4').count()==3
    assert not errors,errors
    print('storybook passed',flush=True)
    browser.close()
