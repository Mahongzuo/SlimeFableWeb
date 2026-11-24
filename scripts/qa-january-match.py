"""Verify January's three match boards using a real, isolated headless browser."""
import argparse
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'qa/evidence'
SAVE = 'slimefable.web.save.v1'


async def screenshot(page, name):
    await page.screenshot(path=EVIDENCE / ('january-match-' + name + '.jpg'), quality=86)


async def views(page, day):
    counts = await page.evaluate("""() => {
        const stage=__slime.ctx, actor=__slime, root=stage.scene.getObjectByName('januaryMatchLandmark');
        const info=stage.renderer.info, previous=info.autoReset;
        info.autoReset=false;
        const calls=(visible)=>{root.visible=visible; info.reset();stage.render(0,actor);return info.render.calls};
        const without=calls(false),withModel=calls(true);info.autoReset=previous;
        return withModel-without;
    }""")
    assert 0 < counts <= 150, counts
    for suffix, eye in [('low', [3.65, 1.43, 5.7]), ('far', [5.7, 5.4, 10.2])]:
        await page.evaluate("""eye=>{
            const s=__slime.ctx;
            window.originalTableRender=s.render;
            s.render=function(dt,actor){this.camera.position.fromArray(eye);this.camera.lookAt(0,1.24,-1);
                return originalTableRender.call(this,dt,actor)}
        }""", eye)
        await page.wait_for_timeout(400)
        await screenshot(page, day + '-' + suffix)
        await page.evaluate("()=>{__slime.ctx.render=window.originalTableRender}")
    return counts


async def play(page, base, day, practice=False):
    ident=day+'-match'
    if practice:
        await page.goto(base+'/level.html?id='+ident+'&practice=verification')
    else:
        await page.goto(base+'/?date='+day)
        await page.wait_for_function('window.__slime?.ready && window.__game?.state')
        await page.locator('[data-act=start]:visible').click()
        await page.wait_for_function("__game.state==='play'")
        await page.evaluate("""()=>{const [x,y,z]=__game.portals[3].slot.position;__slime.teleport([x,y,z])}""")
        await page.wait_for_function("__game.state==='door'")
        await page.locator('[data-act=go][data-id="'+ident+'"]:visible').click()
    await page.wait_for_function('window.__slime?.latest?.count>100 && window.__level?.board')
    await page.locator('[data-match-start]').click()
    if not practice and day!='0101':
        print(day, '额外绘制调用', await views(page, day),flush=True)
    if not practice:
        await screenshot(page,day+'-play')
    # Sample the native mesh for the whole run; compare centroid-relative XY extents
    # to exclude camera motion and simple translation from deformation evidence.
    await page.evaluate("""() => {
        window.matchShapes = new Set();
        const capture=()=>{const f=window.__slime?.latest;
            if(f?.radii[0])matchShapes.add(f.radii[0].map(x=>x.toFixed(3)).join(','));
            if(window.__level?.phase!=='finale')requestAnimationFrame(capture)};
        capture();
    }""")
    for _ in range(25):
        if await page.locator('[data-match-keep]:visible').count():break
        pair=await page.evaluate('__level.hint()')
        assert pair,(day,'no legal move')
        for i in pair:
            await page.locator('[data-cell="'+str(i)+'"]').click()
        await page.wait_for_function("['play','finale','lost'].includes(__level.phase)")
    result=await page.evaluate("""()=>({stage:__level.board.stage,swaps:__level.board.turn,
        shapes:matchShapes.size,vertices:__slime.latest.count,save:__level.spec.saveId})""")
    assert result['stage']==3 and result['shapes']>1 and result['vertices']>100,result
    if not practice:
        await page.wait_for_timeout(1000)
        await screenshot(page,day+'-finale')
    await page.locator('[data-match-keep]').click()
    await page.locator('[data-mode-home]').click()
    await page.wait_for_function('window.__slime?.ready && window.__game?.state')
    assert day in page.url
    await page.reload()
    await page.wait_for_function('window.__slime?.ready')
    saved=await page.evaluate("JSON.parse(localStorage.getItem('"+SAVE+"'))")
    key=result['save'];record=saved['life']['records']
    assert key in saved['completed'] and key in saved['souvenirs']
    assert record[key+'-daily-wins']==1
    if day!='0101':
        suffix='-practice' if practice else '-daily'
        assert record.get(key+suffix+'-mark-0')==1
    if practice:assert record[key+'-practice-wins']==1
    else:
        await page.locator('[data-act=book]:visible').click()
        entry=page.locator('.mode-entry').filter(has=page.locator('[data-id="'+ident+'"]'))
        assert '已通关' in await entry.inner_text()
        await page.locator('[data-tab=souvenir]').click()
        assert await page.locator('.memory-slip').count()>=1
    print(day, '练习' if practice else '正式',result,flush=True)


async def run(base):
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(channel='chrome',headless=True,
            args=['--enable-unsafe-swiftshader','--disable-background-timer-throttling'])
        ctx=await browser.new_context(viewport={'width':1040,'height':720},reduced_motion='reduce')
        await ctx.add_init_script("""Object.defineProperty(Element.prototype,'requestPointerLock',
          {value:()=>Promise.resolve()});if(!localStorage.getItem('slimefable.web.save.v1'))
          localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'low'}));""")
        page=await ctx.new_page();page.set_default_timeout(60000)
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        for day in ['0114','0131','0101']:
            await play(page,base,day)
            await play(page,base,day,practice=True)
        await ctx.close()
        mobile=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        await mobile.add_init_script("""Object.defineProperty(Element.prototype,'requestPointerLock',
          {value:()=>Promise.resolve()});localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'low'}));""")
        phone=await mobile.new_page();phone.on('pageerror',lambda error:errors.append(str(error)))
        for day in ['0114','0131']:
            await phone.goto(base+'/level.html?id='+day+'-match')
            await phone.wait_for_function('window.__slime?.ready && __slime.ctx.time>1.4')
            await phone.locator('[data-match-start]').tap()
            for i in await phone.evaluate('__level.hint()'):
                await phone.locator('[data-cell="'+str(i)+'"]').tap()
            await phone.wait_for_function("__level.phase==='play' && __level.board.turn===1")
            assert await phone.evaluate('document.documentElement.scrollWidth===innerWidth')
            await screenshot(phone,day+'-mobile')
        await mobile.close()
        assert not errors,errors
        await browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default='http://127.0.0.1:5237')
    asyncio.run(run(parser.parse_args().base.rstrip('/')))
