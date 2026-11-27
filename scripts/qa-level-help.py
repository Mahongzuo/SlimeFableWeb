"""Open each registered guide through its normal page in isolated headless Chromium."""
import argparse
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

root=Path(__file__).resolve().parents[1]
out=root/'qa'/'evidence'
ap=argparse.ArgumentParser()
ap.add_argument('--base',default='http://127.0.0.1:5190')
ledger=(root/'docs/six-gate-polish.md').read_text('utf8')
days=[f'{int(month):02d}{int(day):02d}' for month,day in re.findall(r'^\| \[(\d+) 月 (\d+) 日\].+?6/6',ledger,re.M)]
ap.add_argument('--days',default=','.join(days))
ap.add_argument('--jobs',type=int,default=3)
args=ap.parse_args()
catalog=json.loads((root/'docs/level-catalog.json').read_text('utf8'))['days']
init="""Element.prototype.requestPointerLock=()=>Promise.resolve();
if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{old:8}}}));"""
async def tap_site(page,index):
 # Project exhibit marks to screen, then play with ordinary taps and the visible controls.
 target=await page.evaluate('i=>{const spec=__level.game.diagnostics.state.spec;return i<0?spec.finish:spec.sites[i]}',index)
 await tap_floor(page,target)

async def tap_floor(page,target):
 pixel=await page.evaluate('([x,z])=>{const c=__level.stage.camera,v=c.position.clone().set(x,0,z).project(c);return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]}',target)
 hit=await page.evaluate('([x,y])=>{const el=document.elementFromPoint(x,y);return [el?.nodeName,el?.className]}',pixel)
 assert hit[0]=='CANVAS',(target,pixel,hit)
 await page.touchscreen.tap(*pixel)
 await page.wait_for_function('([x,z])=>Math.hypot(__slime.position[0]-x,__slime.position[2]-z)<.47',arg=target,timeout=20000)

async def touch_earthrise_print(page):
 state='__level.game.diagnostics.state'
 for side in (0,1):
  await tap_site(page,side)
  await page.locator('[data-keyf]').tap()
  await page.wait_for_function(f'{state}.carry==={side}')
  await tap_floor(page,await page.evaluate(f'{state}.aimPoint'))
  await page.locator('[data-keyc]').tap()
  await page.wait_for_function(f'{state}.aligned&&{state}.flat')
  await page.locator('[data-keyf]').tap()
  await page.wait_for_function(f'{state}.mask & {1<<side}')
  await page.locator('[data-keyc]').tap()
 await tap_site(page,-1)
 await page.locator('[data-keyf]').tap()
 await page.wait_for_function('__level.phase==="done"')
 return await page.evaluate("JSON.parse(localStorage.getItem('slimefable.web.save.v1')).completed.includes('1224-1968')")

async def touch_manuscript(page):
 state='__level.game.diagnostics.state'
 await tap_site(page,0)
 await page.locator('[data-digit4]').tap()
 await page.locator('[data-keyf]').tap()
 await page.wait_for_function(f'{state}.step===1')
 await tap_site(page,3)
 await page.locator('[data-keyc]').tap()
 await page.wait_for_function(f'{state}.flat')
 await page.locator('[data-keyf]').tap()
 await page.wait_for_function(f'{state}.step===2')
 await tap_floor(page,await page.evaluate(f'{state}.inkPoint'))
 await page.wait_for_function(f'{state}.count===1')
 await page.get_by_role('button',name='F1 帮助',exact=True).tap()
 assert '火' in await page.locator('#gate-help .gh-current p:first-of-type').inner_text()
 await page.locator('#gate-help .gh-back').tap()
 await tap_site(page,1)
 await page.locator('[data-digit3]').tap()
 await page.locator('[data-keyf]').tap()
 await page.wait_for_function(f'{state}.ready')
 await tap_site(page,-1)
 await page.locator('[data-keyf]').tap()
 await page.wait_for_function('__level.phase==="done"')
 return await page.evaluate("JSON.parse(localStorage.getItem('slimefable.web.save.v1')).completed.includes('0104-1951')")

async def touch_translation(page):
 state='__level.game.diagnostics.state'
 act=page.locator('footer button:last-child[data-keyf]')
 await tap_site(page,1)
 await act.tap()
 await page.wait_for_function(f'{state}.step===1')
 assert await page.evaluate(f'{state}.goal[0]=== {state}.sites[0][0]')
 await page.get_by_role('button',name='F1 帮助',exact=True).tap()
 hint=await page.locator('#gate-help .gh-current p:first-of-type').inner_text()
 assert '校对另一栏' in hint and '1/2' in hint,hint
 await page.locator('#gate-help .gh-back').tap()
 assert '1/2' in await page.locator('aside b').inner_text()
 await page.screenshot(path=out/'janweek-translation-touch.jpg',quality=89)
 await tap_site(page,0)
 await act.tap()
 await page.wait_for_function(f'{state}.ready')
 await tap_site(page,-1)
 await act.tap()
 await page.wait_for_function('__level.phase==="done"')
 return await page.evaluate(f"{state}.marks.size===0&&JSON.parse(localStorage.getItem('slimefable.web.save.v1')).completed.includes('0106-1903')")

async def touch_post_office(page):
 state='__level.game.diagnostics.state'
 tool=page.locator('[data-keyf]')
 await tap_site(page,1)
 await tool.tap()
 await page.wait_for_function(f'{state}.step===1')
 await tap_site(page,2)
 await page.locator('[data-keyc]').tap()
 await page.wait_for_function(f'{state}.onMark&&{state}.flat')
 await tool.tap()
 await page.wait_for_function(f'{state}.step===2')
 await page.get_by_role('button',name='F1 帮助',exact=True).tap()
 hint=await page.locator('#gate-help .gh-current p:first-of-type').inner_text()
 assert '戳' in hint or '槽' in hint,hint
 await page.locator('#gate-help .gh-back').tap()
 await tap_site(page,1)
 await page.locator('[data-keyc]').tap()
 await page.wait_for_function(f'!{state}.flat')
 await page.locator('[data-space]').tap()
 await page.wait_for_function('__slime.position[1]>.33&&!__slime.grounded')
 await tool.tap()
 await page.wait_for_function(f'{state}.ready')
 await tap_site(page,-1)
 await tool.tap()
 await page.wait_for_function('__level.phase==="done"')
 return await page.evaluate("JSON.parse(localStorage.getItem('slimefable.web.save.v1')).completed.includes('0110-1840')")

async def touch_balance(page):
 await tap_site(page,4)
 await page.locator('[data-keyc]').tap()
 await page.wait_for_function('__level.game.diagnostics.state.zero')
 await page.locator('[data-keyf]').tap()
 await page.wait_for_function('__level.game.diagnostics.state.step===1')
 await page.locator('[data-keyc]').tap()
 for pickup,plate in [(0,2),(1,3)]:
  await tap_site(page,pickup)
  await page.locator('[data-keyf]').tap()
  await page.wait_for_function('__level.game.diagnostics.state.carry>=0')
  await tap_site(page,plate)
  await page.locator('[data-keyf]').tap()
  await page.wait_for_function('__level.game.diagnostics.state.carry<0')
 await tap_site(page,-1)
 await page.locator('[data-keyf]').tap()
 await page.wait_for_function('__level.phase==="done"')
 return await page.evaluate("JSON.parse(localStorage.getItem('slimefable.web.save.v1')).completed.includes('1219-2020')")

async def touch_memorial(page):
 await tap_site(page,0)
 await page.locator('[data-keyc]').tap()
 await page.wait_for_function('__level.game.diagnostics.state.step===1')
 await tap_site(page,2)
 await page.locator('[data-keyf]').tap()
 await page.wait_for_function('__level.game.diagnostics.state.step===2')
 await page.get_by_role('button',name='F1 帮助',exact=True).tap()
 assert '水' in await page.locator('#gate-help .gh-current p:first-of-type').inner_text()
 await page.locator('#gate-help .gh-back').tap()
 await tap_site(page,-1)
 await page.locator('[data-keyf]').tap()
 await page.wait_for_function('__level.phase==="done"')
 return await page.evaluate('''()=>{const d=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
  return d.souvenirs.includes('1213-1937')&&!Object.hasOwn(d.life.records,'1213-1937-ms');}''')

async def run():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
  slots=asyncio.Semaphore(args.jobs)
  async def day_run(day):
   async with slots:
    ctx=await browser.new_context(viewport={'width':960,'height':620},has_touch=True)
    await ctx.add_init_script(init);await ctx.route_web_socket('**/*',lambda socket:None)
    page=await ctx.new_page();page.set_default_timeout(50000)
    errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    day_checks={}
    data=catalog[day]
    ids=[c['id'] for c in data['chapters'] if c['playPath']]+[m['id'] for m in data['dailyModes']]
    for key in ids:
     try:
      await page.set_viewport_size({'width':960,'height':620})
      await page.goto(args.base+'/level.html?id='+key)
      button=page.get_by_role('button',name='F1 帮助',exact=True)
      await button.wait_for()
      await page.wait_for_function('window.__slime?.latest?.count>100')
      await page.keyboard.press('F1')
      panel=page.locator('#gate-help[open]')
      await panel.wait_for()
      await panel.locator('summary').click()
      steps=await panel.locator('ol li').all_text_contents()
      assert len(steps)>=3 and await panel.locator('h2').inner_text() and await panel.locator('.gh-current p:first-of-type').inner_text()
      if key=='0101-1864':await page.screenshot(path=out/'gate-help-desktop.jpg',quality=88)
      await page.keyboard.press('Escape')
      assert not await panel.count()
      await page.set_viewport_size({'width':390,'height':844})
      await button.tap(timeout=10000);await panel.wait_for()
      assert await panel.evaluate('p=>p.scrollWidth<=p.clientWidth+1&&p.getBoundingClientRect().width<=innerWidth')
      if '1212'<=day<='1231' or '0102'<=day<='0110':
       touch_hint=panel.locator('.gh-touch');assert await touch_hint.is_visible() and len(await touch_hint.inner_text())>=15,key
      await panel.locator('summary').tap()
      if key=='1213-1937':await page.screenshot(path=out/'midwinter-help-portrait.jpg',quality=89)
      if key=='1217-1903':await page.screenshot(path=out/'yearend-help-portrait.jpg',quality=89)
      if key=='0108-1037':await page.screenshot(path=out/'janweek-help-portrait.jpg',quality=89)
      if key=='0102-1920':await page.screenshot(path=out/'newyear-help-portrait.jpg',quality=89)
      if key=='1231-1907':await page.screenshot(path=out/'monthend-help-portrait.jpg',quality=89)
      if key=='1206-rpg':await page.screenshot(path=out/'gate-help-mobile.jpg',quality=88)
      await panel.get_by_role('button',name='返回关卡').tap()
      assert not await panel.count() and not errors,(key,errors)
      extra={}
      if key=='0104-1951':
       extra['touchManuscriptInkAndLight']=await touch_manuscript(page);assert extra['touchManuscriptInkAndLight']
      if key=='0106-1903':
       extra['touchProofreadWithoutCollecting']=await touch_translation(page);assert extra['touchProofreadWithoutCollecting']
      if key=='0110-1840':
       extra['touchPostOfficeRoute']=await touch_post_office(page);assert extra['touchPostOfficeRoute']
      if key=='1224-1968':
       extra['touchPrintBothLayers']=await touch_earthrise_print(page);assert extra['touchPrintBothLayers']
      if key=='1219-2020':
       extra['touchBalanceFromTareToSeal']=await touch_balance(page);assert extra['touchBalanceFromTareToSeal']
      if key=='1213-1937':
       extra['touchCraneWithoutTimer']=await touch_memorial(page)
       assert extra['touchCraneWithoutTimer']
      if key in ('1202-match','1212-match','1217-match','1222-match','1231-match','0103-match','0109-match'):
       await page.locator('[data-rules]').tap();rules=page.locator('.ml-guide[open]');await rules.wait_for()
       await rules.get_by_role('button',name='F1 帮助').tap();await panel.wait_for()
       await page.keyboard.press('Escape');assert await rules.is_visible()
       await rules.locator('[data-close-guide]').tap()
       extra['rulesPanelRestored']=True
       await page.keyboard.press('F1');await panel.locator('summary').tap()
       await panel.locator('.gh-move:visible').wait_for()
       example=await panel.locator('.gh-move').inner_text();assert '行第' in example
       if key in ('1217-match','1222-match','1231-match','0103-match','0109-match'):
        current=await panel.locator('.gh-current p:first-of-type').inner_text();assert '行第' in current,current
        extra['targetHint']=current
        if key=='1217-match':await page.screenshot(path=out/'yearend-help-match.jpg',quality=89)
        else:
         diagram=panel.locator('.gh-diagram');await diagram.wait_for()
         assert await diagram.locator('.gh-grid span').count()==64
         marks=await diagram.locator('.gh-pair').all_text_contents();assert sorted(marks)==['1','2']
         assert await diagram.locator('.gh-target').count()==await page.evaluate('__level.board.targets.length')
         cells=await diagram.evaluate("f=>Array.from(f.querySelectorAll('.gh-grid span')).map((c,i)=>[c,i]).filter(([c])=>c.classList.contains('gh-pair')).sort(([a],[b])=>Number(a.textContent)-Number(b.textContent)).map(([,i])=>i)")
         assert cells==await page.evaluate('__level.hint()');extra['diagramExchange']=cells
         if key in ('1222-match','0103-match','0109-match'):
          await diagram.scroll_into_view_if_needed();await page.screenshot(path=out/({'0109-match':'janweek-help-match.jpg','0103-match':'newyear-help-match.jpg'}.get(key,'monthend-help-match.jpg')),quality=89)
       if key=='1212-match':await page.screenshot(path=out/'midwinter-help-match.jpg',quality=89)
       await page.keyboard.press('F1')
       for turn in range(30):
        if await page.locator('.season-plate[open]').count():break
        if key in ('1217-match','1222-match','1231-match','0103-match','0109-match') and turn and 'nextTargetHint' not in extra and await page.evaluate('__level.board.stage>0'):
         await page.keyboard.press('F1');updated=await panel.locator('.gh-current p:first-of-type').inner_text();assert updated!=extra['targetHint'] and '行第' in updated
         extra['nextTargetHint']=updated;await page.keyboard.press('Escape')
        pair=await page.evaluate('__level.hint()')
        for cell in pair:await page.locator(f'[data-cell="{cell}"]').tap()
        await page.wait_for_function('document.querySelector(".season-plate[open]")||__level.phase==="play"')
       plate=page.locator('.season-plate[open]');await plate.wait_for()
       await plate.get_by_role('button',name='F1 帮助').tap();await panel.wait_for()
       assert await panel.locator('.gh-current p:first-of-type').inner_text()
       await page.keyboard.press('Escape');assert await plate.is_visible()
       extra['endingPanelRestored']=True
      if key in ('1202-defense','1212-defense','1217-defense','1231-defense','0104-defense','0110-defense'):
       await page.locator('.jd-panel[data-phase=setup] [data-action]:enabled').tap()
       await page.wait_for_function("__level.game.phase==='wave'")
       await page.keyboard.press('F1')
       before=await page.evaluate('[__level.time,__level.game.released]')
       await page.wait_for_timeout(550)
       assert before==await page.evaluate('[__level.time,__level.game.released]')
       await page.keyboard.press('Escape');await page.wait_for_function('n=>__level.time>n+.1',arg=before[0])
       extra['wavePausedAndResumed']=True
      day_checks[key]={'title':await page.locator('#gate-help h2').inner_text(),'steps':len(steps),'keyboard':True,'touch':True,**extra}
     except Exception as e:
      raise RuntimeError(key+' '+str(errors)) from e
    path=out/'gate-help.json'
    results=json.loads(path.read_text('utf8')) if path.exists() else {}
    results.update(day_checks);path.write_text(json.dumps(dict(sorted(results.items())),ensure_ascii=False,indent=2),'utf8')
    print(day,len(ids),'help pages OK',flush=True);await ctx.close()
  await asyncio.gather(*(day_run(day) for day in args.days.split(',')))
  await browser.close()
asyncio.run(run())
