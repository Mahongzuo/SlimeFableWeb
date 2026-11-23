"""Browser acceptance for native ability chapters. Requires Python Playwright and Chrome."""
import argparse
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = 'http://127.0.0.1:5190/'
DRIVE = (ROOT / 'scripts/qa-ability-drive.js').read_text(encoding='utf-8')
SAVE = 'slimefable.web.save.v1'

async def run(ids, vertical, jobs, evidence=False):
    queue = asyncio.Queue()
    for chapter in ids:
        queue.put_nowait(chapter)
    errors = []
    passed = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(channel='chrome',args=['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
        async def worker():
            pg = await browser.new_page(viewport={'width':1100,'height':780} if vertical or evidence else {'width':360,'height':240})
            if not (vertical or evidence):
                pg.set_default_timeout(45000)
                # Keep the native solver, controllers, routes and DOM. Skip GPU rasterization during the full sweep.
                await pg.add_init_script("""for (const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']) WebGL2RenderingContext.prototype[name]=function(){}""")
            await pg.add_init_script(f"if (!localStorage.getItem('{SAVE}')) localStorage.setItem('{SAVE}', JSON.stringify({{v:1,quality:'low',selectedDay:'1010',completed:['0804-1957']}}))")
            async def capture(name):
                await pg.screenshot(path=ROOT/('qa/evidence/second-'+name+'.jpg'),quality=92)
            await pg.expose_function('captureAbility',capture)
            async def home(day):
                await pg.wait_for_function("day=>window.__slime?.ready && window.__game?.showing.shown.day===day",arg=day,polling=100)
            async def portal(i, chapter):
                await pg.locator('[data-act=start]:visible').click()
                await pg.wait_for_function("__game.state==='play'")
                await pg.wait_for_timeout(450)
                await pg.evaluate("i=>{const p=__game.portals[i].slot.position;__slime.teleport([p[0],0,p[2]])}",i)
                await pg.wait_for_function("__game.state==='door'")
                await pg.locator('[data-act=go][data-id="'+chapter+'"]').click()
                await pg.wait_for_function("id=>window.__level?.spec.id===id&&window.__slime?.ready",arg=chapter)
            while not queue.empty():
                chapter=queue.get_nowait()
                try:
                    if vertical:
                        await pg.goto(BASE+'?from=1124-1859&date=1124')
                        await home('1124')
                        await pg.locator('[data-act=book]:visible').click()
                        for _ in range(3): await pg.locator('[data-month="-1"]').click()
                        await pg.locator('[data-day="0804"]').click()
                        assert await pg.locator('.book').get_by_text('主线：发射前的两盏灯',exact=True).count()
                        assert await pg.locator('.cal .sel').evaluate("e=>getComputedStyle(e,'::after').content==='none'")
                        await pg.screenshot(path=ROOT/'qa/evidence/second-calendar.jpg',quality=90,animations='disabled')
                        for _ in range(3): await pg.locator('[data-month="1"]').click()
                        assert await pg.locator('[data-day="1104"].sel').count()
                        assert await pg.locator('.day-summary strong').inner_text()=='11月4日'
                        assert await pg.locator('.page h2').last.inner_text()=='11月4日'
                        for _ in range(2): await pg.locator('[data-month="1"]').click()
                        await pg.locator('[data-day="0131"]').click()
                        await pg.locator('[data-month="1"]').click()
                        assert await pg.locator('[data-day="0229"].sel').count()
                        assert await pg.locator('.day-summary strong').inner_text()=='2月29日'
                        assert await pg.locator('.page h2').last.inner_text()=='2月29日'
                        for _ in range(6): await pg.locator('[data-month="1"]').click()
                        await pg.locator('[data-day="0804"]').click()
                        await pg.locator('[data-act=show]').click()
                        await pg.goto(BASE+'?date=0804');await home('0804')
                        await portal(0,'0804-1957')
                        await pg.goto(BASE+'?from=0804-1957&date=0804');await home('0804')
                        await portal(1,chapter)
                    else:
                        await pg.goto(BASE+'level.html?id='+chapter,wait_until='domcontentloaded')
                        await pg.wait_for_function('window.__level?.spec&&window.__slime?.ready',polling=100)
                    result=await asyncio.wait_for(pg.evaluate(DRIVE,{'early':vertical,'shootFrame':vertical or evidence}),60)
                    await pg.locator('[data-action=home]').evaluate('e=>e.click()')
                    await home(chapter[:4])
                    assert await pg.evaluate("id=>JSON.parse(localStorage.getItem('slimefable.web.save.v1')).completed.includes(id)",chapter)
                    if vertical:
                        await pg.locator('[data-act=book]:visible').click()
                        assert await pg.locator('.chapter').filter(has_text='发射前的两盏灯').get_by_text('已通关').count()
                    passed.append(result)
                    print('PASS',result,flush=True)
                except Exception as ex:
                    errors.append(chapter)
                    print('FAIL',chapter,pg.url,str(ex)[:1200],flush=True)
            await pg.close()
        await asyncio.gather(*(worker() for _ in range(jobs)))
        await browser.close()
    if errors: raise SystemExit('Failed: '+','.join(errors))
    return passed

def save_report(results, destination):
    checks = {
        'relay':'分身实际落盘、持压过桥、属性错误阻断、主动回收',
        'circuit':'错误起始极性、未摊开阻断、双极校验',
        'combo':'空挥阻断、指定属性真实命中、连续两段',
        'climb':'贴壁状态、攀上平台、错误属性阻断',
        'tide':'起岸风属性、水中位置、两处浮标和水属性判定',
        'duet':'单灯阻断、两团占位、三处拾取'
    }
    ordered=sorted(results,key=lambda row: row['id'])
    payload={'scope':'原版角色与物理工作线程，键盘输入驱动；批量运行跳过 GPU 光栅化。',
             'commonChecks':['打开章节','缺少能力受阻','操作正确进入终场','写入通关与纪念品','回港读取该日期与存档'],
             'mechanicChecks':checks,'passed':len(ordered),'chapters':ordered}
    destination.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('ids',nargs='*')
    parser.add_argument('--vertical',action='store_true')
    parser.add_argument('--jobs',type=int,default=1)
    parser.add_argument('--months',nargs='+',type=int)
    parser.add_argument('--evidence',action='store_true')
    parser.add_argument('--report',type=Path,help='Write the successful cases to a JSON report')
    args=parser.parse_args()
    chapters=args.ids or [c['id'] for d in json.loads((ROOT/'docs/level-catalog.json').read_text(encoding='utf-8'))['days'].values() for c in d['chapters'] if c['template']=='ability']
    if args.months: chapters=[c for c in chapters if int(c[:2]) in args.months]
    results=asyncio.run(run(chapters,args.vertical,args.jobs,args.evidence))
    if args.report: save_report(results,args.report)
