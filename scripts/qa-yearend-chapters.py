"""Exercise both historical chapter routes in an isolated, pointer-lock-disabled Chrome."""
import argparse,ast,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=root/'qa/evidence'
tree=ast.parse((root/'scripts/qa-turning-season.py').read_text(encoding='utf-8-sig'))
walk=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and getattr(n.targets[0],'id',None)=='walk')
ids={'1217':['2020','1903'],'1218':['1271','1958'],'1219':['2020','1843'],'1220':['1999','1951'],'1221':['2000','1968']}
chronicles={'1217-2020','1218-1271','1219-2020','1220-1951','1221-2000'}
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
        id=day+'-'+year;stem='yearend-six-'+day+'-'+gate
        ctx=browser.new_context(viewport={'width':948,'height':630},has_touch=True)
        ctx.route_web_socket('**/*',lambda socket:None)
        if opts.dev_entry:ctx.route('**/src/level/main.ts',lambda route:route.fulfill(content_type='application/javascript',body="import '/src/level/yearend-chapters.ts'"))
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
        def aim(side):
            at(*sites[side]);flat(side==0)
            if story=='compass':
                # Aiming is a small lateral correction on the rail. Walk more precisely than a broad floor marker.
                precise=walk.replace('<.23','<.07').replace('-.12','-.045').replace('>.12','>.045')
                p.evaluate(precise,read('.arcSite('+str(side)+')'))
            signal='.wind' if story=='flyer' else '.signal('+str(side)+')'
            wait(signal)
            if side:
                for attempt in range(8):
                    if story=='clock':wait('.pendulum>.63')
                    elif story=='flyer':wait('.cycle>.20')
                    elif story=='lotus':wait('.cycle<-.30')
                    jump_act()
                    if (read('.carry')==side if story=='lotus' else read('.mask')&(1<<side)):break
                    p.wait_for_function('__slime.grounded')
            else:key('f')
            if story=='compass' and not read('.mask')&(1<<side):
                raise AssertionError((id,side,p.evaluate('__slime.position'),read('.aim'),read('.flat'),read('.note')))
            if story=='lotus':
                wait('.carry==='+str(side));goal();wait('.count===1');goal();wait('.carry<0')
        def gate():
            goal();rise=read('.water')<read('.targetWater');flat(rise)
            if not rise and read('.water')<read('.targetWater')-.085:flat(True)
            wait('.onLevel');key('f')
        def box(i):
            at(*sites[i]);key('f');wait('.carry==='+str(i));confirm();wait('.carry<0')
        def track(i):
            at(*sites[i]);flat(True);wait('.inGroove('+str(i)+')');key('f');wait('.mask & '+str(1<<i))
        def bulbs(pair):
            at(*sites[4]);flat(True);key('f');wait('.stock===2')
            for i in pair:at(*sites[i]);key('f');wait('.mask & '+str(1<<i))
        if story=='boat':
            at(*sites[chosen]);key('f');wait('.step===1');flat(True);goal();wait('.count===1');goal();wait('.step===2')
        elif story in ('flyer','clock','lotus','compass'):aim(chosen);wait('.mask!==0')
        elif story=='locks':at(*sites[chosen]);key('f');wait('.step===1');gate();wait('.step===2')
        elif story=='broadcast':track(chosen)
        elif story=='balance':goal();flat(True);wait('.zero');key('f');wait('.step===1');box(chosen)
        elif story=='bulbs':bulbs([chosen,2+chosen])
        elif story=='earthrise':at(*sites[chosen]);key('f');wait('.step===1');goal();flat(True);wait('.horizon < .28 && '+st+'.horizon>-.28');key('f');wait('.step===2')
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
        if story=='balance':
            tap_world(read('.goal'));p.locator('[data-keyf]').tap();wait('.carry>=0')
            tap_world(read('.goal'));p.locator('[data-keyf]').tap();wait('.ready')
            tap_world(read('.goal'))
        p.set_viewport_size({'width':948,'height':630})
        for view in ['low','far','play']:
            p.evaluate('v=>{'+st+'.view=v}',view);p.wait_for_timeout(550)
            if view!='play':snap(view)
        key('F1');p.locator('#gate-help[open]').wait_for();key('Escape');p.locator('#gate-help').wait_for(state='hidden')
        if story=='boat':flat(False);goal();wait('.count===3');goal()
        elif story in ('flyer','clock','lotus','compass'):
            aim(1-chosen)
            if story=='clock':goal();wait('.signal(2)');key('f')
            if story=='compass':goal();flat(True);key('f')
        elif story=='locks':gate()
        elif story=='broadcast':track(1-chosen);goal();wait('.overhead');key('f')
        elif story=='balance':assert read('.ready')
        elif story=='bulbs':bulbs([1-chosen,3-chosen])
        elif story=='earthrise':
            goal();flat(False)
            for attempt in range(8):
                wait('.rise>.82');jump_act()
                if read('.ready'):break
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
            'portraitTargetPixels':[[round(x),round(y)] for x,y in phone_points],'touchBoxTransfer':story=='balance'});assert not errors
        path=out/(stem+'-result.json');saved=json.loads(path.read_text(encoding='utf8')) if path.exists() else {}
        if opts.practice:saved['practice']=result
        else:
            if 'practice' in saved:result['practice']=saved['practice']
            saved=result
        path.write_text(json.dumps(saved,ensure_ascii=False,indent=2),encoding='utf8');ctx.close();print(id,'PASS',flush=True)
    browser.close()
