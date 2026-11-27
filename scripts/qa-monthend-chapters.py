"""Exercise both historical chapter routes in an isolated, pointer-lock-disabled Chrome."""
import argparse,ast,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=root/'qa/evidence'
tree=ast.parse((root/'scripts/qa-turning-season.py').read_text(encoding='utf-8-sig'))
walk=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and getattr(n.targets[0],'id',None)=='walk')
ids={'1222':['2005','1808'],'1223':['1937','1947'],'1224':['1935','1968'],'1225':['1915','2021'],'1226':['1951','1898'],'1227':['2002','1831'],'1228':['1905','1895'],'1229':['1911','1959'],'1230':['1940','1924'],'1231':['1984','1907']}
chronicles={day+'-'+years[0] for day,years in ids.items()}
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:5190');parser.add_argument('--day',choices=ids)
parser.add_argument('--gate',choices=['first','second']);parser.add_argument('--practice',action='store_true')
parser.add_argument('--dev-entry',action='store_true')
parser.add_argument('--batch',choices=['early','late'])
opts=parser.parse_args()
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    for day,years in ids.items():
      if opts.day and opts.day!=day:continue
      if opts.batch and (day<='1226')!=(opts.batch=='early'):continue
      for gate,year in zip(['first','second'],years):
        if opts.gate and gate!=opts.gate:continue
        id=day+'-'+year;stem='monthend-six-'+day+'-'+gate
        ctx=browser.new_context(viewport={'width':948,'height':630},has_touch=True)
        ctx.route_web_socket('**/*',lambda socket:None)
        if opts.dev_entry:ctx.route('**/src/level/main.ts',lambda route:route.fulfill(content_type='application/javascript',body="import '/src/level/monthend-chapters.ts'"))
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
        def jump_act():
            p.wait_for_function('__slime.grounded');key('Space');p.wait_for_function('__slime.position[1]>.35');key('f')
        def grab(i):
            at(*sites[i]);key('f');wait('.carry==='+str(i))
        def signal(i,air=False):
            at(*sites[i]);flat(not air);wait('.signal('+str(i)+')')
            if air:
                for attempt in range(8):
                    wait('.wave>.53');jump_act()
                    if read('.mask')&(1<<i):break
                    p.wait_for_function('__slime.grounded')
            else:key('f')
            wait('.mask & '+str(1<<i))
        precise=walk.replace('<.23','<.085').replace('-.12','-.055').replace('>.12','>.055')
        def fixture(i):
            grab(i);flat(True)
            if story in ('contacts','layers'):
                p.evaluate(precise,read('.aimPoint'));wait('.aligned');key('f')
            elif story=='mirrors':
                goal();wait('.spotJoined');key('f')
            elif story=='galaxy':
                p.evaluate(precise,read('.rulerPoint('+str(i)+')'));wait('.aligned');key('f')
            elif story in ('binding','archive','dispatch'):
                goal()
                if story=='archive':wait('.signal('+str(i)+')')
                if story=='dispatch':wait('.t && Math.cos('+st+'.t*1.49)>.49')
                key('f')
            wait('.mask & '+str(1<<i))
        def sketch(i):
            at(*sites[i]);flat(story=='cabinet' or not i)
            if story=='cabinet':wait('.hold>.71');key('f')
            elif i:jump_act()
            else:key('f')
            wait('.carry==='+str(i));confirm();wait('.mask & '+str(1<<i))
        def fill():
            goal();flat(read('.meter')<read('.targetMark'));wait('.inBand');key('f')
        def lock():
            goal();flat(True);wait('.inBand');key('f')
        if story=='rubbing':
            flat(True);at(*sites[chosen]);key('f');wait('.step===2');goal();wait('.count===1')
        elif story=='concert':
            at(*sites[chosen]);key('f');wait('.step===1');goal();flat(True);wait('.meter>.75');key('f');wait('.step===2')
        elif story=='arch':
            flat(True);at(*sites[chosen]);key('f');at(*sites[1-chosen]);key('f');wait('.left===1 && '+st+'.right===1')
        elif story in ('contacts','layers','mirrors','galaxy','binding','archive','dispatch'):fixture(chosen)
        elif story=='phonics':at(*sites[chosen]);key('f');wait('.step===1');goal();flat(True);key('f');wait('.step===2')
        elif story in ('cabinet','sketch'):sketch(chosen)
        elif story=='aqueduct':at(*sites[chosen]);key('f');wait('.step===1');fill();wait('.step===2')
        elif story in ('station','stagePhoto','studio'):signal(chosen,story=='stagePhoto' and bool(chosen))
        elif story=='projector':
            at(*sites[chosen]);key('f');wait('.step===1');goal();flat(True);key('f');wait('.count===1')
        elif story=='lattice':
            at(*sites[chosen]);key('f');wait('.step===1');flat(True);goal();wait('.count===1');goal();wait('.step===2')
        elif story=='countdown':at(*sites[chosen]);key('f');wait('.step===1');lock();wait('.count===1')
        print(id,'midpoint',flush=True);snap('play')
        p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(650);snap('portrait')
        phone_points=p.evaluate("""()=>{const state=__level.game.diagnostics.state,stage=__level.stage;
            return [...state.spec.sites,state.spec.finish,...(state.spec.pin?[state.spec.pin]:[])].map(([x,z])=>{
              const v=new stage.THREE.Vector3(x,0,z).project(stage.camera);return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2];});}""")
        assert all(12<x<378 and 96<y<655 for x,y in phone_points),(id,phone_points)
        def tap_world(point):
            x,z=point
            pixel=p.evaluate("""([x,z])=>{const a=__level.stage,v=new a.THREE.Vector3(x,0,z).project(a.camera);
                return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]}""",point)
            p.touchscreen.tap(*pixel)
            p.wait_for_function('([x,z])=>Math.hypot(__slime.position[0]-x,__slime.position[2]-z)<.42',arg=[x,z])
        # Touch and keyboard F1 both return to the same chapter state.
        saved_step=read('.step');p.locator('.gate-help-launch').tap();p.locator('#gate-help[open]').wait_for()
        p.locator('.gh-steps summary').tap();assert len(p.locator('.gh-steps li').all())>=2
        p.locator('.gh-back').tap();assert saved_step==read('.step')
        tap_world([0.02,1.61])
        p.set_viewport_size({'width':948,'height':630})
        for view in ['low','far','play']:
            p.evaluate('v=>{'+st+'.view=v}',view);p.wait_for_timeout(550)
            if view!='play':snap(view)
        key('F1');p.locator('#gate-help[open]').wait_for();key('Escape');p.locator('#gate-help').wait_for(state='hidden')
        if story=='rubbing':goal()
        elif story=='concert':
            for n,i in enumerate([chosen,1-chosen]):
                at(*sites[i]);flat(False);wait('.signal('+str(i)+')');key('f');wait('.count==='+str(n+1))
        elif story=='arch':
            at(*sites[chosen]);key('f');at(*sites[1-chosen]);key('f')
        elif story in ('contacts','layers','mirrors','galaxy','binding','archive','dispatch'):
            fixture(1-chosen)
            if story=='contacts':confirm()
            if story=='mirrors':goal();flat(True);wait('.focused');key('f')
            if story=='galaxy':goal();flat(False);jump_act()
            if story=='binding':at(*sites[2]);wait('.count===1');at(*sites[3]);key('f')
            if story=='archive':goal();flat(False);key('f')
        elif story=='phonics':goal();flat(False);jump_act()
        elif story in ('cabinet','sketch'):sketch(1-chosen);goal();flat(True);key('f')
        elif story=='aqueduct':fill()
        elif story in ('station','stagePhoto','studio'):
            signal(1-chosen,story=='stagePhoto' and not chosen)
            if story=='studio':confirm()
        elif story=='projector':
            goal();flat(False);key('f');wait('.step===2');goal();wait('.count===3');confirm()
        elif story=='lattice':
            flat(False);goal();wait('.count>=3');goal();wait('.count===4');confirm()
        elif story=='countdown':lock();wait('.count===2');lock()
        wait('.ready');confirm()
        p.wait_for_function('__level.phase==="done"');snap('final')
        result=p.evaluate("""()=>{const s=__level.game.diagnostics.state,d=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
            return {id:s.id,story:s.story,stage:s.step,ending:s.end,shells:d.life.coins,completed:d.completed??[],souvenirs:d.souvenirs,records:d.life.records,
                errors:s.errors,collected:s.marks.size,marks:s.markCount,particles:__slime.latest.count,shapes:forms.size,choice:s.chosen};}""")
        assert result['records']['saved-before']==7 and '0101-1864' in result['souvenirs'] and result['shapes']>1 and result['errors']>0,(id,result)
        assert (id in result['completed'])!=opts.practice and result['shells']==(41 if opts.practice else 49),(id,result)
        assert (id in result['souvenirs'])!=opts.practice,(id,result)
        denom=id+('-practice' if opts.practice else '')
        assert result['records'][denom+'-ms']>0 and result['records'][denom+('-relics' if id in chronicles else '-stars')]==result['collected'],(id,result)
        p.locator('[data-home]').click();p.wait_for_url('**/?from='+id+'&date='+day)
        result.update({'addedDrawCalls':calls,'returned':True,'browserErrors':errors,'keyboardAndTouchHelp':True,
            'portraitTargetPixels':[[round(x),round(y)] for x,y in phone_points],'touchWalk':True});assert not errors
        path=out/(stem+'-result.json');saved=json.loads(path.read_text(encoding='utf8')) if path.exists() else {}
        if opts.practice:saved['practice']=result
        else:
            if 'practice' in saved:result['practice']=saved['practice']
            saved=result
        path.write_text(json.dumps(saved,ensure_ascii=False,indent=2),encoding='utf8');ctx.close();print(id,'PASS',flush=True)
    browser.close()
