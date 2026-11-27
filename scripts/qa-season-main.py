"""Check the five original doors from the harbor and assemble each day's WebGL review sheet."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
from playwright.sync_api import sync_playwright

cli=argparse.ArgumentParser()
cli.add_argument('--day', choices=['1127','1128','1129','1130','1201'], required=True)
cli.add_argument('--base', default='http://127.0.0.1:5190')
cli.add_argument('--sheet', action='store_true')
opt=cli.parse_args()
day=opt.day
out=Path(__file__).resolve().parents[1]/'qa'/'evidence'
modes=['second','defense','match','skirmish','rpg']
years={'1127':'1895','1128':'1964','1129':'1972','1130':'1872','1201':'1959'}
def harbor():
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        ctx=browser.new_context(viewport={'width':920,'height':600})
        ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
          if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
          JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{legacy:7}}}));""")
        ctx.route_web_socket('**/*',lambda socket:None)
        page=ctx.new_page();page.set_default_timeout(90000)
        errors=[];rows={}
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        def arrive():
            page.wait_for_function("window.__slime?.ready && ['play','title'].includes(window.__game?.state)")
            if page.evaluate("__game.state==='title'"):page.locator('[data-act=start]:visible').first.click()
            page.wait_for_function("__game.state==='play'")
        page.goto(opt.base+'/?date='+day);arrive()
        ids=[day+'-'+suffix for suffix in [years[day],*modes[1:]]]
        page.keyboard.press('j')
        page.wait_for_function("__game.state==='book'")
        for key in ids:assert page.locator('.book [data-act=go][data-id="'+key+'"]').count()==1,key
        page.locator('[data-act=close]:visible').first.click()
        for i,key in enumerate(ids,1):
            page.evaluate('i=>{__game.doorLatch.clear();__slime.teleport([...__game.portals[i].slot.position])}',i)
            page.locator('.door [data-act=go][data-id="'+key+'"]').click()
            page.wait_for_url('**/level.html?id='+key)
            page.wait_for_function('window.__slime?.latest?.count>100')
            home=page.locator('[data-home]:visible,[data-do=home]:visible,[data-act=home]:visible')
            home.first.click();arrive()
            dist=page.evaluate('i=>{const p=__game.portals[i].slot.position,a=__slime.position;return Math.hypot(a[0]-p[0],a[2]-p[2]);}',i)
            assert dist<3.5 and page.evaluate('__game.showing.shown.day')==day
            rows[key]={'slot':i+1,'book':True,'returnDistance':round(dist,2)}
        assert not errors,errors
        (out/f'season-stage-{day}-harbor.json').write_text(json.dumps(rows,indent=2),'utf-8')
        print(day,rows,flush=True);browser.close()

def sheet():
    labels={'1127':['压纸折痕','切换母线','船台退楔','碟站接力','两点取温'],
            '1128':['舷窗寻星','灯标引航','拼雷达回波','切点制动','过岬读潮'],
            '1129':['横移接球','合保温罩','伞舱落点','双弧交会','借影越岭'],
            '1130':['边线传球','双舱均压','撤服务臂','留四时影','测深领船'],
            '1201':['冰上观测','月面扫尘','雪站道岔','分身传单','支护推进']}
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
    title=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',26)
    canvas=Image.new('RGB',(1450,677),'#223035');g=ImageDraw.Draw(canvas)
    g.text((20,10),f'{int(day[:2])} 月 {int(day[2:])} 日   /   二至六号门',font=title,fill='#f5e5c7')
    for slot,mode in enumerate(modes):
        prefix=f'season-stage-{day}-{mode}-'
        proof=json.loads((out/(prefix+'result.json')).read_text('utf-8-sig'))
        assert proof.get('daily',proof.get('completed')) and proof.get('practice'),prefix
        for view in ['play','low','far','portrait','final']:
            file=out/(prefix+view+'.jpg')
            with Image.open(file) as shot:
                extrema=shot.convert('L').getextrema()
                assert extrema[1]-extrema[0]>40,file
                if view=='portrait':assert shot.height>shot.width,file
        x=10+288*slot
        g.text((x+4,57),f'{slot+2}  {labels[day][slot]}',font=font,fill='#f4d6a6')
        for tag,y,h in [('play',94,174),('far',276,171),('final',455,210)]:
            with Image.open(out/(prefix+tag+'.jpg')) as source:
                if tag=='far' and source.height>source.width:
                    source=source.crop((0,source.height//2,source.width,source.height))
                frame=ImageOps.contain(source.convert('RGB'),(278,h))
                canvas.paste(frame,(x+(278-frame.width)//2,y+(h-frame.height)//2))
    canvas.save(out/f'season-stage-{day}.jpg',quality=90,optimize=True)

if opt.sheet:sheet()
else:harbor()
