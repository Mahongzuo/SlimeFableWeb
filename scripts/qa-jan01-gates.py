"""Round-trip all six January 1 door buttons with a pre-upgrade local save."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
base=parser.parse_args().base.rstrip('/')
ids=['0101-1864','0101-1823','0101-defense','0101-match','0101-skirmish','0101-rpg']
archive=['0101-shot','0101-trial']
proof={'doors':[],'archiveRoutes':[]}
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':780,'height':550})
    page.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
      if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
      JSON.stringify({v:1,quality:'low',souvenirs:['0101-match','0101-shot','0101-trial','0101-1864','0101-1823'],
      completed:['0101-1864','0101-match-euro-cash'],selectedDay:'0101'}));""")
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_default_timeout(90000)
    page.goto(base+'/?date=0101',wait_until='domcontentloaded')
    def harbor():
        page.wait_for_function("window.__slime?.ready && ['title','play'].includes(window.__game?.state)")
        if page.evaluate("__game.state==='title'"):
            page.locator('[data-act=start]:visible').first.click()
            page.wait_for_function("__game.state==='play'")

    harbor()
    page.keyboard.press('j')
    page.wait_for_function("__game.state==='book'")
    for key in ids+archive:
        assert page.locator('.book [data-act=go][data-id="'+key+'"]').count()==1,key
    page.locator('[data-act=close]:visible').click()
    for slot,level_id in [*enumerate(ids,1),*((2,key) for key in archive)]:
        page.evaluate("""i=>{const g=__game,p=g.portals[i-1].slot;
          g.doorLatch.clear(); __slime.teleport([...p.position]);}""",slot)
        page.wait_for_function("__game.state==='door'")
        if slot==2:
            for key in archive:assert page.locator('.door [data-id="'+key+'"]').is_visible()
        page.locator('.door [data-act=go][data-id="'+level_id+'"]').click()
        page.wait_for_url('**/level.html?id='+level_id)
        page.wait_for_function("window.__slime?.ready && __slime.latest?.count>100")
        title=page.title()
        page.locator('[data-home]:visible,[data-do=home]:visible,[data-w=home]:visible').first.click()
        harbor()
        assert page.evaluate("__game.showing.shown.day")== '0101'
        distance=page.evaluate("""i=>{const p=__game.portals[i-1].slot.position,a=__slime.position;return Math.hypot(a[0]-p[0],a[2]-p[2]);}""",slot)
        assert distance<3.5,(slot,distance)
        proof['archiveRoutes' if level_id in archive else 'doors'].append(
            {'gate':slot,'id':level_id,'title':title,'returnDistance':round(distance,2)})
        print('PASS',slot,level_id,flush=True)
    saved=page.evaluate("JSON.parse(localStorage.getItem('slimefable.web.save.v1'))")
    assert set(archive+['0101-match','0101-1864','0101-1823'])<=set(saved['souvenirs'])
    assert not errors,errors
    proof.update(archive=archive,errors=errors)
    out=Path(__file__).resolve().parents[1]/'qa/evidence/jan01-gates.json'
    out.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    browser.close()
