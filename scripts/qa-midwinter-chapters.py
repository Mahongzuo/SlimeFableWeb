"""Exercise both historical chapter routes in an isolated, pointer-lock-disabled Chrome."""
import argparse,ast,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=root/'qa/evidence'
tree=ast.parse((root/'scripts/qa-turning-season.py').read_text(encoding='utf-8-sig'))
walk=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and getattr(n.targets[0],'id',None)=='walk')
ids={'1212':['1936','1901'],'1213':['1937','1642'],'1214':['1951','1911'],'1215':['1991','1965'],'1216':['1978','1775']}
chronicles={'1212-1936','1213-1642','1214-1951','1215-1991','1216-1978'}
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:5190');parser.add_argument('--day',choices=ids)
parser.add_argument('--gate',choices=['first','second']);parser.add_argument('--practice',action='store_true')
parser.add_argument('--dev-entry',action='store_true')
opts=parser.parse_args()
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    for day,years in ids.items():
      if opts.day and opts.day!=day:continue
      for gate,year in zip(['first','second'],years):
        if opts.gate and gate!=opts.gate:continue
        id=day+'-'+year;quiet=id=='1213-1937';stem='midwinter-six-'+day+'-'+gate
        ctx=browser.new_context(viewport={'width':948,'height':630},has_touch=True)
        ctx.route_web_socket('**/*',lambda socket:None)
        if opts.dev_entry:ctx.route('**/src/level/main.ts',lambda route:route.fulfill(content_type='application/javascript',body="import '/src/level/midwinter-chapters.ts'"))
        ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
            if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
              JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{'saved-before':7}}}));""")
        p=ctx.new_page();p.set_default_timeout(32000);errors=[]
        p.on('pageerror',lambda e:(errors.append(str(e)),print(id,'error',e,flush=True)))
        st='__level.game.diagnostics.state'
        def read(path):return p.evaluate(st+path)
        def key(k):p.keyboard.press(k)
        def wait(expr):p.wait_for_function(st+expr)
        def at(x,z):
            p.evaluate(walk,[x,z])
        def goal():at(*read('.goal'))
        def confirm():goal();key('f')
        def jump():
            p.wait_for_function('__slime.grounded');key('Space')
            p.wait_for_function('__slime.position[1]>.33');p.wait_for_function('__slime.grounded')
        def flat(b):
            if read('.flat')!=b:key('c');p.wait_for_function(st+'.flat==='+('true' if b else 'false'))
        def snap(which):
            if not opts.practice:p.screenshot(path=out/(stem+'-'+which+'.jpg'),quality=87)
        p.goto(opts.base+'/level.html?id='+id+('&practice=five-dates' if opts.practice else ''))
        p.wait_for_function("window.__slime?.ready && (window.__level?.phase==='play' || document.querySelector('[data-start]:enabled'))")
        if p.evaluate("__level.phase!=='play'"):p.locator('[data-start]:enabled').click()
        p.wait_for_function('__slime.latest?.count>100 && __level.stage.time>1.2')
        p.evaluate("""()=>{window.forms=new Set;const sample=()=>{const radii=__slime.latest?.radii?.[0];
            if(radii)forms.add(radii.map(v=>v.toFixed(3)).join('/'));if(__level.phase!=='done')requestAnimationFrame(sample)};sample();}""")
        calls=p.evaluate("""()=>{const st=__level.stage,root=__level.game.diagnostics.root,info=st.renderer.info,auto=info.autoReset;
            function count(show){root.visible=show;info.reset();st.render(0,__slime);return info.render.calls}
            info.autoReset=false;try{const baseline=count(false);return count(true)-baseline}finally{root.visible=true;info.autoReset=auto}}""")
        assert 0<calls<=150,(id,calls)
        story=read('.story');print(id,story,'practice' if opts.practice else 'daily',flush=True)
        # Deliberately try the wrong spot. Baseline progress must stay at the current step.
        key('f');assert read('.step')==0,(id,read('.step'))
        if not opts.practice:
            marks=read('.collectibles.slice(0,'+st+'.markCount)')
            for x,z in marks:at(x,z);jump()
            assert read('.marks.size')==len(marks),(id,read('.marks.size'),marks)
        sites=read('.spec.sites')
        if read('.spec.pin'):
            at(*read('.spec.pin'));at(read('.spec.pin')[0]+.81,read('.spec.pin')[1]);key('g');wait('.pin');wait('.step===1')
        chosen=int(opts.practice)
        def blink(n):
            goal();wait('.pulse && '+st+'.beat!=='+st+'.lastBeat');key('f');wait('.count==='+str(n))
        def sight(side):
            at(*sites[side]);flat(side==0)
            if side==1:
                p.wait_for_function('__slime.grounded');wait('.fogOpen && Math.sin('+st+'.t*1.29)>.44')
                key('Space');p.wait_for_function('__slime.position[1]>.36')
            else:wait('.fogOpen')
            key('f')
        def view_pair(side):
            at(*sites[side]);flat(True);wait('.aligned('+str(side)+')');key('f')
        def leaf(side):
            at(*sites[side]);flat(side==0)
            if side==1:
                p.wait_for_function('__slime.grounded');key('Space');p.wait_for_function('__slime.position[1]>.36')
            key('f');wait('.carry==='+str(side));confirm()
        def set_page(side):
            at(*sites[side]);key('f');wait('.carry==='+str(side));flat(True)
            if story=='press':goal();wait('.proof===1')
            confirm();wait('.carry<0')
        if story in ('bell','press'):set_page(chosen)
        elif story=='radio':
            at(*sites[chosen]);p.wait_for_function('__slime.grounded');key('Space');p.wait_for_function('__slime.position[1]>.36');key('f')
            wait('.chosen==='+str(chosen));p.wait_for_function('__slime.grounded');flat(True);key('f');wait('.step===1');blink(1)
        elif story=='garden':
            at(*sites[chosen]);flat(True);wait('.step===1')
        elif story=='ridge':sight(chosen);wait('.step===1')
        elif story=='sign':
            at(*sites[chosen]);flat(True);wait('.chosen==='+str(chosen));at(0,-.52);wait('.sweep>.37')
        elif story in ('tent','twins'):view_pair(chosen);wait('.step===2')
        elif story=='dynamo':
            at(*sites[chosen]);key('f');wait('.step===1');wait('.synced');flat(True);wait('.synced');key('f');wait('.step===2')
        elif story=='letter':leaf(chosen);wait('.mask!==0')
        print(id,'midpoint',flush=True);snap('play')
        p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(650);snap('portrait')
        # Touch and keyboard F1 both return to the same chapter state.
        saved_step=read('.step');p.locator('.gate-help-launch').tap();p.locator('#gate-help[open]').wait_for()
        p.locator('.gh-steps summary').tap();assert len(p.locator('.gh-steps li').all())>=2
        p.locator('.gh-back').tap();assert saved_step==read('.step')
        p.set_viewport_size({'width':948,'height':630})
        for view in ['low','far','play']:
            p.evaluate('v=>{'+st+'.view=v}',view);p.wait_for_timeout(550)
            if view!='play':snap(view)
        key('F1');p.locator('#gate-help[open]').wait_for();key('Escape');p.locator('#gate-help').wait_for(state='hidden')
        if story in ('bell','press'):set_page(1-chosen)
        elif story=='radio':blink(2);blink(3)
        elif story=='garden':confirm()
        elif story=='ridge':sight(1-chosen)
        elif story=='sign':at(*sites[1-chosen]);wait('.step===2');confirm()
        elif story in ('tent','twins'):view_pair(1-chosen)
        elif story=='dynamo':confirm()
        elif story=='letter':leaf(1-chosen);wait('.step===2');flat(True);confirm()
        wait('.ready');confirm()
        p.wait_for_function('__level.phase==="done"');snap('final')
        result=p.evaluate("""()=>{const s=__level.game.diagnostics.state,d=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
            return {id:s.id,story:s.story,stage:s.step,ending:s.end,shells:d.life.coins,completed:d.completed??[],souvenirs:d.souvenirs,records:d.life.records,
                errors:s.errors,collected:s.marks.size,marks:s.markCount,particles:__slime.latest.count,shapes:forms.size,choice:s.chosen};}""")
        assert result['records']['saved-before']==7 and '0101-1864' in result['souvenirs'] and result['shapes']>1 and (result['errors']==0 if quiet else result['errors']>0),(id,result)
        assert (id in result['completed'])!=opts.practice and result['shells']==(41 if opts.practice else 49),(id,result)
        assert (id in result['souvenirs'])!=opts.practice,(id,result)
        denom=id+('-practice' if opts.practice else '')
        if quiet:
            assert denom+'-ms' not in result['records'] and result['records'][denom+'-remembrance']==1 and not result['marks']
        else:
            assert result['records'][denom+'-ms']>0 and result['records'][denom+('-relics' if id in chronicles else '-stars')]==result['collected'],(id,result)
        p.locator('[data-home]').click();p.wait_for_url('**/?from='+id+'&date='+day)
        result.update({'addedDrawCalls':calls,'returned':True,'browserErrors':errors,'keyboardAndTouchHelp':True});assert not errors
        path=out/(stem+'-result.json');saved=json.loads(path.read_text(encoding='utf8')) if path.exists() else {}
        if opts.practice:saved['practice']=result
        else:
            if 'practice' in saved:result['practice']=saved['practice']
            saved=result
        path.write_text(json.dumps(saved,ensure_ascii=False,indent=2),encoding='utf8');ctx.close();print(id,'PASS',flush=True)
    browser.close()
