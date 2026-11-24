"""Drive the January defence UI, with an isolated headless clock and save."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default='http://127.0.0.1:5190')
    parser.add_argument('--day', choices=['0101', '0114', '0131'])
    args = parser.parse_args()
    evidence = Path(__file__).resolve().parents[1] / 'qa' / 'evidence'
    days = [args.day] if args.day else ['0101', '0114', '0131']
    save_key = 'slimefable.web.save.v1'
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True,
                                     args=['--enable-unsafe-swiftshader'])
        for day in days:
            context = browser.new_context(viewport={'width': 1060, 'height': 690})
            context.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
            page = context.new_page()
            page.set_default_timeout(90000)
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            section = day+'-defense'
            result = {}
            page.goto(args.base+'/?date='+day)
            page.locator('[data-act=start]:enabled').click()
            page.wait_for_function('__game.state==="play" && __slime.ready')
            page.evaluate('()=>__slime.teleport([...__game.portals[2].slot.position])')
            page.locator('.door-actions [data-id="'+section+'"]').click()
            page.wait_for_url('**/level.html?id='+section)
            for practice in [False, True]:
                if practice:
                    page.set_viewport_size({'width': 410, 'height': 760})
                    page.goto(args.base+'/level.html?id='+section+'&practice=map-review')
                page.wait_for_function('window.__slime?.latest?.count>0')
                page.locator('[data-action]:enabled').click()
                measured = page.evaluate(r'''()=>({vertices:__slime.latest.count,
                  collision:__level.collision,
                  resource:performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname)
                    .find(path=>/\/january-defense(?:-[^/]+\.js|\.ts)$/.test(path))})''')
                assert measured['vertices'] > 0 and measured['collision']['triangles'] > 0
                for wave in range(6):
                    if wave % 2 == 0:
                        if wave:
                            page.locator('[data-tool=remove]').click()
                            for n in [wave-2, wave-1]:
                                page.locator('[data-pad="'+str(n)+'"]').click()
                        for kind, n in [('water', wave), ('wind', wave+1)]:
                            page.locator('[data-tool='+kind+']').click()
                            page.locator('[data-pad="'+str(n)+'"]').click()
                        if wave == 0:
                            measured['spreadAfterDeployment'] = page.evaluate('''()=>{
                              __level.step(.04);return __slime.spread}''')
                            assert measured['spreadAfterDeployment'] > 0
                            page.wait_for_function('''()=>__slime.latest?.spread>.12''')
                            measured['workerSpread'] = page.evaluate('__slime.latest.spread')
                    page.locator('[data-action]').click()
                    page.wait_for_function('__level.phase==="wave"')
                    if wave == 0:
                        page.locator('[data-pause]').click()
                        assert page.evaluate('''()=>{const t=__level.game.clock;
                          __level.step(.1);return __level.game.clock===t}''')
                        page.locator('[data-pause]').click()
                    if wave == 2:
                        page.evaluate('()=>{for(let n=0;n<26;n++)__level.step(.1)}')
                        measured['additionalDrawCalls'] = page.evaluate('''()=>{
                          const {ctx}=__slime,renderer=ctx.renderer,info=renderer.info;
                          const root=ctx.scene.getObjectByName("january-defense-diorama");
                          const old=info.autoReset;info.autoReset=false;
                          const draw=()=>{info.reset();renderer.shadowMap.needsUpdate=true;
                            ctx.render(0,__slime);return info.render.calls};
                          try {root.visible=false;const baseline=draw();root.visible=true;
                            return draw()-baseline}
                          finally {root.visible=true;info.autoReset=old}
                        }''')
                        assert 0 < measured['additionalDrawCalls'] <= 150, measured
                        views = ['play'] if practice else ['play', 'low', 'far']
                        for view in views:
                            page.evaluate('v=>__level.setView(v)', view)
                            page.wait_for_timeout(180)
                            suffix = 'portrait' if practice else view
                            page.screenshot(path=evidence/f'january-defense-{day}-{suffix}.jpg',quality=88)
                        page.evaluate('()=>__level.setView("play")')
                    page.evaluate('''()=>{for(let i=0;i<800 && __level.phase==="wave";i++)
                        __level.step(.1)}''')
                    assert page.evaluate('__level.phase') in ['interval','finale']
                page.locator('[data-action]').click()
                page.wait_for_function('__level.phase==="won"')
                page.evaluate('()=>{for(let n=0;n<25;n++)__level.step(.1)}')
                if not practice:
                    page.screenshot(path=evidence/f'january-defense-{day}-finale.jpg',quality=88)
                page.locator('[data-action]:enabled').click()
                page.locator('.mode-keepsake[open]').wait_for()
                save = page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',save_key)
                story_id = next(k for k in save['souvenirs'] if k.startswith(section+'-'))
                bucket = story_id+('-practice' if practice else '-daily')
                records = save['life']['records']
                assert records[bucket+'-wins'] == 1
                assert records[bucket+'-clean'] == 1 and records[bucket+'-unassisted'] == 1
                if practice:
                    assert records[story_id+'-daily-wins'] == 1
                measured['record'] = bucket
                measured['unobstructedPlates'] = records[bucket+'-plates']
                measured['visibleSceneMeshesAtFinish'] = page.evaluate('''()=>{let count=0;
                  __slime.ctx.scene.traverseVisible(o=>{if(o.isMesh)count++});return count}''')
                result['practice' if practice else 'daily'] = measured
                page.locator('[data-mode-home]').click()
                page.wait_for_url('**/?date='+day+'&from='+section)
            assert not errors, errors
            (evidence/f'january-defense-{day}-result.json').write_text(
                json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            print(day, result, flush=True)
            context.close()
        browser.close()


if __name__ == '__main__':
    main()
