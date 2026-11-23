"""Playwright smoke checks against the local production build. Uses a private browser profile."""
import argparse
import asyncio
import json
import subprocess
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:5190/'
DAYS = ('1123','0101','0815')
KINDS = ('match','shot','trial')
SAVE = 'slimefable.web.save.v1'

def daily_mode(target):
    day=target[:4]
    return next(m for m in json.loads((ROOT/'docs/level-catalog.json').read_bytes())['days'][day]['dailyModes'] if m['id']==target)

def export_layouts():
    """Draw the actual daily trial footprints and paths without any 3D art."""
    from PIL import Image, ImageDraw, ImageFont
    font=lambda size:ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',size)
    source="""import {generateLayout} from './src/templates/mode-world.ts';
    console.log(JSON.stringify(['1123','0101','0815'].map(d=>generateLayout(d,d+'-trial-v1'))))"""
    layouts=json.loads(subprocess.check_output(['node','--import','tsx','--input-type=module','-e',source],cwd=ROOT))
    image=Image.new('RGB',(1130,492),'#f6f5ef')
    draw=ImageDraw.Draw(image)
    draw.text((30,16),'三处场地的路线与高差',font=font(25),fill='#182124')
    for index,(scene,label) in enumerate(zip(layouts,['11 月 23 日   演播厅','1 月 1 日   水巷印坊','8 月 15 日   纪念庭院'])):
        cx=194+index*371
        point=lambda x,z:(round(cx+23*x),round(244+23*z))
        def rect(a,b,fill):
            draw.rectangle([point(*a),point(*b)],fill=fill,outline='#979a94')
        for face in scene['world']['surfaces']:rect(face['min'],face['max'],'#e1e1d9')
        for water in scene['world'].get('fluids',[]):rect(water['min'],water['max'],'#fbfaf6')
        for box in scene['world']['boxes']:
            low,high=box['min'],box['max']
            rect((low[0],low[2]),(high[0],high[2]),'#b9bdb6')
        for key,offset in [('mainPath',-2),('sidePath',2)]:
            coords=[(point(x,z)[0]+offset,point(x,z)[1]) for x,y,z in scene[key]]
            for start,end in zip(coords,coords[1:]):
                if key=='mainPath':draw.line([start,end],fill='#252c2b',width=3)
                else:
                    dx,dy=end[0]-start[0],end[1]-start[1]
                    n=max(1,round((dx*dx+dy*dy)**.5/7))
                    for i in range(0,n,2):
                        draw.line([(start[0]+dx*i/n,start[1]+dy*i/n),(start[0]+dx*(i+1)/n,start[1]+dy*(i+1)/n)],fill='#252c2b',width=3)
        for stop in scene['stations']:
            x,y,z=stop['at'];px,py=point(x,z)
            draw.ellipse((px-5,py-5,px+5,py+5),fill='#fff',outline='#202727',width=2)
            draw.text((px+8,py-10),f'{y:.1f}m',font=font(13),fill='#202727',stroke_width=2,stroke_fill='#f5f4ef')
        draw.text((cx,62),label,font=font(18),anchor='mm',fill='#252c2b')
    draw.text((565,447),'由下向上读图   ·   实线与虚线为两条可走路线   ·   圆点为交互点，标注为相对高度',font=font(17),anchor='mm',fill='#383f3b')
    image.save(ROOT/'qa/evidence/1123-layouts.png')

async def drive_world(page):
    drive=(ROOT/'scripts/qa-world-drive.js').read_text(encoding='utf-8')
    for case in ['1123-shot','1123-trial','0101-shot','0101-trial','0815-shot','0815-trial','1123-lower','0815-high']:
        target=case.replace('lower','trial').replace('high','trial')
        practice=target!=case
        suffix='&practice='+case[5:] if practice else ''
        await page.goto(BASE+'level.html?id='+target+suffix,wait_until='domcontentloaded')
        await page.wait_for_function('window.__slime?.ready && window.__level',polling=100)
        result=await page.evaluate(drive,case)
        assert result['realBody']>100
        save=await page.evaluate("JSON.parse(localStorage.getItem('"+SAVE+"'))")
        key=daily_mode(target)['saveId']
        assert key in save['completed'] and key in save['souvenirs']
        records=save['life']['records']
        assert records[key+('-practice' if practice else '-daily')+'-wins']==1
        if case=='0101-trial':
            assert records[key+'-daily-imprint']==213
            assert await page.locator('.mode-imprints span').all_text_contents()==['圆','方','长']
        if practice: assert records[key+'-daily-wins']==1
        await page.locator('[data-mode-home]').click()
        await page.wait_for_function('window.__game?.state && window.__slime?.ready',polling=100)
        assert await page.evaluate('day=>__game.showing.shown.day===day',target[:4])
        if case=='0101-trial':
            await page.locator('[data-act=book]:visible').click()
            await page.locator('[data-tab=souvenir]').click()
            assert await page.locator('.imprint-marks [data-shape]').evaluate_all("marks=>marks.map(m=>m.dataset.shape)")==['圆','方','长']
        print('PASS native world, save and return',case,result,flush=True)

async def run(suite):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader','--disable-background-timer-throttling'])
        page = await browser.new_page(viewport={'width':1200,'height':780} if suite=='photos' else {'width':720,'height':590})
        # The harbor requests pointer lock when it starts. Tests must never capture the desktop pointer.
        await page.add_init_script("Object.defineProperty(Element.prototype,'requestPointerLock',{value:()=>Promise.resolve()})")
        errors = []
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        await page.add_init_script(f"if (!localStorage.getItem('{SAVE}')) localStorage.setItem('{SAVE}',JSON.stringify({{v:1,quality:'low'}}))")
        if suite in ('routes','world'):
            await page.add_init_script("for(const k of ['drawElements','drawArrays','drawArraysInstanced','drawElementsInstanced'])WebGL2RenderingContext.prototype[k]=()=>{}")
        if suite=='world': await drive_world(page)
        async def harbor(day, back=''):
            await page.goto(BASE+'?date='+day+('&from='+back if back else ''),wait_until='domcontentloaded')
            await page.wait_for_function("day=>window.__slime?.ready && window.__game?.showing.shown.day===day",arg=day,polling=100)
        async def enter():
            await page.locator('[data-act=start]:visible').click()
            await page.wait_for_function("__game.state==='play'")
        async def portal(slot):
            await enter()
            await page.evaluate("i=>{const [x,y,z]=__game.portals[i].slot.position;__slime.teleport([x,y,z]);}",slot)
            await page.wait_for_function("__game.state==='door'")
        async def go(chapter):
            await page.locator('[data-act=go][data-id="'+chapter+'"]:visible').click()
            await page.wait_for_url('**/level.html?id='+chapter)
            await page.wait_for_function('window.__slime?.ready',polling=100)
            assert not errors,errors
        if suite=='stories':
            catalog=json.loads((ROOT/'docs/level-catalog.json').read_bytes())['days']
            for day in (*DAYS, '1021'):
                await harbor(day)
                await page.locator('[data-act=book]:visible').click()
                for mode in catalog[day]['dailyModes']:
                    entry=page.locator('.mode-entry').filter(has=page.locator(f'button[data-id="{mode["id"]}"]'))
                    text=await entry.inner_text()
                    assert mode['fact'] in text and mode['title'] in text
            # A returning pilot player starts with three genuine ink-workshop memories.
            old=['0101-trial','0101-shot','0101-match']
            async def load_collection(keys):
                await page.evaluate("""([save,keys])=>{
                    const data=JSON.parse(localStorage.getItem(save));
                    data.souvenirs=data.completed=keys;localStorage.setItem(save,JSON.stringify(data));
                }""",[SAVE,keys])
                await harbor('0101')
                await page.locator('[data-act=book]:visible').click()
            await load_collection(old)
            assert await page.locator('.mode-entry .chip.sea').count()==1
            await page.locator('[data-tab=souvenir]').click()
            assert await page.locator('.memory-slip').count()==1
            assert '1864' in await page.locator('.memory-slip').inner_text()
            await load_collection(old+[daily_mode('0101-match')['saveId'],daily_mode('0101-shot')['saveId']])
            await page.locator('[data-tab=souvenir]').click()
            assert await page.locator('.memory-slip').count()==3
            for year in ['1864','1801','2002']:
                assert await page.locator('.memory-slip').filter(has_text=year).count()==1
            print('PASS archived challenges, new encounters, old and new collections',flush=True)
        if suite=='routes':
            chapters=json.loads((ROOT/'docs/level-catalog.json').read_bytes())['days']['1112']['chapters']
            catalog=json.loads((ROOT/'docs/level-catalog.json').read_bytes())['days']
            for day in (*DAYS, '1021'):
                for mode in catalog[day]['dailyModes']:
                    target=mode['id']
                    slot=mode['gateSlot']-1
                    await harbor(day)
                    await portal(slot)
                    await go(target)
                    await harbor(day)
                    await page.locator('[data-act=book]:visible').click()
                    await go(target)
                    await harbor(day,target)
                    await enter()
                    assert await page.evaluate("i=>{const a=__slime.position,b=__game.portals[i].slot.position;return Math.hypot(a[0]-b[0],a[2]-b[2])<3.5}",slot)
                    print('PASS book, portal, return',target,flush=True)
            for i,ch in enumerate(chapters):
                await harbor('1112');await portal(min(i,2));await go(ch['id'])
                print('PASS original',ch['id'],flush=True)
            await harbor('0229');await portal(4);await go('1021-skirmish')
            await harbor('0229');await portal(5);await go('1021-rpg')
            print('PASS explicit pilot date',flush=True)
        if suite=='photos':
            await harbor('1123');await enter();await page.wait_for_timeout(800)
            await page.screenshot(path=ROOT/'qa/evidence/1123-gates.jpg',quality=91)
            for kind,name in [('match','match'),('shot','world')]:
                await page.goto(BASE+'level.html?id=1123-'+kind)
                await page.wait_for_function('window.__slime?.ready')
                button=page.locator('[data-match-start]' if kind=='match' else '[data-w=start]')
                await button.click()
                await page.wait_for_timeout(900)
                await page.screenshot(path=ROOT/('qa/evidence/1123-'+name+'.jpg'),quality=92)
        if suite=='boards':
            for day,practice in [('1123',True),*((d,False) for d in DAYS)]:
                await page.goto(BASE+'level.html?id='+day+'-match')
                await page.wait_for_function('window.__slime?.ready')
                if practice:
                    await page.locator('[data-match-practice]').click()
                    await page.wait_for_url('**&practice=*')
                    await page.wait_for_function('window.__slime?.ready')
                await page.locator('[data-match-start]').click()
                for move in range(55):
                    if await page.locator('[data-match-keep]:visible').count():break
                    pair=await page.evaluate("()=>__level.hint()")
                    assert pair,(day,move)
                    for i in pair: await page.locator('[data-cell="'+str(i)+'"]').click()
                    await page.wait_for_function("['play','finale','lost'].includes(__level.phase)")
                await page.locator('[data-match-keep]').click()
                await page.locator('[data-mode-home]').click()
                await page.wait_for_function('window.__slime?.ready')
                state=await page.evaluate("JSON.parse(localStorage.getItem('"+SAVE+"'))")
                ident=day+'-match'
                mode=daily_mode(ident)
                key=mode['saveId']
                assert state['life']['records'][key+('-practice' if practice else '-daily')+'-wins']==1
                for key in ('visited','completed','souvenirs'): assert (mode['saveId'] in state[key])!=practice
                if not practice:
                    await page.locator('[data-act=book]:visible').click()
                    entry=page.locator('.mode-entry').filter(has=page.locator('[data-id="'+ident+'"]'))
                    assert '已通关' in await entry.inner_text()
                    await page.locator('[data-tab=souvenir]').click()
                    assert await page.locator('.memory-slip').filter(has_text=mode['souvenir']).count()==1
                print('PASS board, save, return',day,'practice' if practice else 'daily',flush=True)
        assert not errors,errors
        await browser.close()

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('suite',choices=['routes','photos','boards','layouts','world','stories'])
    parser.add_argument('--base',default=BASE,help='URL of an isolated production build')
    options=parser.parse_args()
    BASE=options.base.rstrip('/')+'/'
    suite=options.suite
    if suite=='layouts': export_layouts()
    else: asyncio.run(run(suite))

