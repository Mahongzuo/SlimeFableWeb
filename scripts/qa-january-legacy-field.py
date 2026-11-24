"""January regression for the existing six-enemy Sekigahara campaign."""
import argparse
import ast
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SAVE = 'slimefable.web.save.v1'


def legacy_controls():
    # The historical script starts Chromium at module scope; read only its fixed
    # input-driver literal so running today's check cannot overwrite its photos.
    tree = ast.parse((ROOT/'scripts/qa-battle-rpg-campaign.py').read_text(encoding='utf-8'))
    return ast.literal_eval(next(node.value for node in tree.body
        if isinstance(node,ast.Assign) and isinstance(node.targets[0],ast.Name)
        and node.targets[0].id=='DRIVER'))


def run(base, route, practice):
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        ctx=browser.new_context(viewport={'width':800,'height':520},reduced_motion='reduce')
        ctx.add_init_script("""Object.defineProperty(Element.prototype,'requestPointerLock',
            {value:()=>Promise.resolve()});if(!localStorage.getItem('slimefable.web.save.v1'))
            localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'low'}));""")
        page=ctx.new_page();page.set_default_timeout(45000)
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        ident='1021-rpg';url=base+'/level.html?id='+ident
        page.goto(url+('&practice=january-legacy' if practice else ''))
        page.wait_for_function('window.__slime?.ready && window.__level?.enemies?.length===6')
        page.evaluate('()=>{__slime.ctx.renderer.setPixelRatio(.45);__slime.ctx.renderer.shadowMap.enabled=false}')
        sid=page.evaluate('__level.spec.saveId')
        page.evaluate("""id=>{const key='slimefable.web.save.v1';
          const d=JSON.parse(localStorage.getItem(key));d.life=d.life??{};
          d.life.records={...d.life.records,[id+'-daily-ms']:4200,[id+'-practice-ms']:5100,
            [id+'-daily-wins']:4,[id+'-practice-wins']:2};
          localStorage.setItem(key,JSON.stringify(d))}""",sid)
        page.locator('[data-primary]').click()
        page.evaluate(legacy_controls())
        # Use the upgrade's visible potion and execution controls during fights.
        page.evaluate("""()=>{window.fieldAssist=setInterval(()=>{
            if(__level.phase!=='play')return;
            const potion=document.querySelector('[data-potion]');
            if(__level.life<55 && potion && !potion.disabled)potion.click();
            const act=document.querySelector('[data-interact]');
            if(act && !act.hidden && act.textContent.includes('处决'))act.click();
          },150)}""")
        def expect(step):
            page.wait_for_function('s=>__level.progress.step===s',arg=step)
        def fight(indices):
            for i in indices:
                if page.evaluate('i=>__level.enemies[i].living',i):
                    state=page.evaluate('i=>fightReview({id:i,mode:"melee"})',i)
                    print(route,'清敌',i,'生命',state['hp'],'阶段',state['phase'],flush=True)
                    assert state['targets'][i]['hp']==0,state
            assert page.evaluate('ids=>ids.every(i=>!__level.enemies[i].living)',indices)
        def walk(p):
            page.evaluate('p=>walkReview(typeof p==="string"?__level.points[p]:p)',p)
        def pick():
            choices=page.locator('[data-pick-relic]:visible')
            choices.first.wait_for()
            assert choices.count()==3
            choices.first.click()
            page.wait_for_function("__level.phase==='play'")
        expect('mist');fight([0,4])
        expect('fork');pick()
        walk('fork');walk('left' if route=='lower' else 'right')
        expect('pair');fight([1,5,2] if route=='lower' else [2,5,1])
        expect('reward');pick();expect('gate')
        assert page.evaluate('__level.rpgBuild.relics.length')==2
        side=-1 if page.evaluate('__slime.position[0]')<0 else 1
        walk([3.45*side,0,-11.8]);walk([0,0,-14.9]);expect('captain')
        fight([3]);expect('complete')
        page.wait_for_function("__level.phase==='won'");page.evaluate('clearInterval(fieldAssist)')
        page.locator('[data-primary]').click();page.locator('dialog.mode-keepsake').wait_for()
        assert '完整任务最快' in page.locator('.mode-keepsake').inner_text()
        saved=page.evaluate("JSON.parse(localStorage.getItem('"+SAVE+"'))")
        records=saved['life']['records']
        assert records[sid+'-daily-ms']==4200 and records[sid+'-practice-ms']==5100
        assert records[sid+'-daily-wins']==(4 if practice else 5)
        assert records[sid+'-practice-wins']==(3 if practice else 2)
        assert records[sid+('-practice' if practice else '-daily')+'-campaign-v1-ms']>0
        assert (sid in saved.get('completed',[]))!=practice and (sid in saved.get('souvenirs',[]))!=practice
        page.screenshot(path=ROOT/'qa/evidence'/('january-legacy-field-'+route+'.jpg'),quality=86)
        page.locator('[data-mode-home]').click()
        page.wait_for_function("window.__game?.showing.shown.day==='1021' && __slime?.ready")
        assert 'from=1021-rpg' in page.url and not errors,(page.url,errors)
        print('通过',route,'练习' if practice else '正式',json.dumps(records,ensure_ascii=False),flush=True)
        browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default='http://127.0.0.1:5190')
    parser.add_argument('--route',choices=['lower','upper'],default='lower')
    parser.add_argument('--practice',action='store_true')
    args=parser.parse_args()
    run(args.base.rstrip('/'),args.route,args.practice)
