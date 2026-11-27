"""Exercise the New Year chapter routes in an isolated, pointer-lock-disabled Chrome."""
import argparse,ast,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=root/'qa/evidence'
tree=ast.parse((root/'scripts/qa-turning-season.py').read_text(encoding='utf-8-sig'))
walk=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and getattr(n.targets[0],'id',None)=='walk')
ids={'0102':['1963','1959','1920'],'0103':['1912','1892'],'0104':['1951','2010'],'0105':['1956','1933'],
     '0106':['1903','1838'],'0107':['2003','1862'],'0108':['1037','1823'],'0109':['2024','1839'],'0110':['1986','1840']}
chronicles={'0102-1963','0103-1912','0105-1956','0106-1903','0106-1838','0107-2003','0108-1823','0109-2024','0109-1839','0110-1986','0110-1840'}
abilities={'0102-1920','0104-1951','0107-1862'}
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:5190');parser.add_argument('--day',choices=ids)
parser.add_argument('--gate',choices=['first','second','extra']);parser.add_argument('--practice',action='store_true')
opts=parser.parse_args()
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    for day,years in ids.items():
      if opts.day and opts.day!=day:continue
      for gate,year in zip(['first','second','extra'],years):
        if opts.gate and gate!=opts.gate:continue
        id=day+'-'+year;stem=('janweek-six-' if day>='0106' else 'newyear-six-')+day+'-'+gate
        ctx=browser.new_context(viewport={'width':948,'height':630},has_touch=True)
        ctx.route_web_socket('**/*',lambda socket:None)
        ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
            if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
              JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{'saved-before':7,'0102-1920-checks':0,'0104-1951-checks':7}}}));""")
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
        key('f');assert read('.step')==0 and read('.errors')>0
        if (not opts.practice and story!='translation') or story=='classroom' or read('.spec.requiredMarks'):
            for x,z in read('.collectibles.slice(0,'+st+'.markCount)'):at(x,z);jump()
            assert read('.marks.size')==read('.markCount')
        a=read('.spec.sites');j=int(opts.practice);op=1-j
        def goto(i):at(*a[i])
        def operate(i):goto(i);key('f')
        def take_gauge(i):
            goto(i);key('f');wait('.side==='+str(i));flat(True)
            wait('.matched');key('f');wait('.mask & '+str(1<<i))
        def jump_at():
            p.wait_for_function('__slime.grounded');key('Space');p.wait_for_function('__slime.position[1]>.34');key('f')
        def window(i,step,air):
            goto(i);flat(not air)
            for attempt in range(8):
                wait('.window('+str(i)+')')
                if air:jump_at()
                else:key('f')
                if read('.step')==step:break
                if air:p.wait_for_function('__slime.grounded')
            wait('.step==='+str(step))
        def steady(i,flatten=True):
            goto(i);flat(flatten);wait('.onMark');key('f')
        def pulse(i,air):
            goto(i);flat(not air)
            for attempt in range(8):
                wait('.scan('+str(i)+')')
                count=read('.count')
                if air:jump_at()
                else:key('f')
                if read('.count')>count:return
                if air:p.wait_for_function('__slime.grounded')
            raise AssertionError((id,i,'scan'))
        if read('.spec.pin'):
            pin=read('.spec.pin');at(pin[0]+.81,pin[1]);key('g');wait('.step===1')
        if story=='slides':
            goto(j);key('4');key('f');assert read('.mask')==0
            key(str(j+1));key('f');wait('.mask & '+str(1<<j))
        elif story=='flyby':operate(j);wait('.step===1');window(j,2,False)
        elif story=='lamps':
            goto(j);key('f');assert read('.checks')==1;key('5');key('f');wait('.step===2')
        elif story in ('classroom','lever'):take_gauge(j)
        elif story=='typewood':
            flat(True);operate(j);wait('.step===1');goto(2+j);flat(False);jump_at();wait('.step===2')
        elif story=='courtyard':
            goto(0);key('f');assert read('.checks')==1;key('4');key('f');wait('.step===1');flat(True);operate(2+j);wait('.step===2')
        elif story=='lift':window(j,2,bool(j))
        elif story=='strand':operate(j);wait('.step===1');goto(2+j);jump_at();wait('.step===2')
        elif story=='translation':
            operate(j);wait('.step===1');assert read('.goal')==a[op] and read('.marks.size')==0
            key('f');assert read('.step')==1
        elif story=='telegraph':steady(j);wait('.mask & '+str(1<<j))
        elif story=='ferry':
            flat(True);operate(j);wait('.count===1');goto(2+j);flat(False);jump_at();wait('.step===2')
        elif story=='survey':
            operate(j);assert read('.checks')==1
            key('2');key('f');wait('.step===1');flat(True);key('1');goto(2+j);wait('.count===1')
        elif story=='inkstone':
            flat(True);operate(j);wait('.step===1');steady(2);wait('.step===2')
        elif story=='islands':
            operate(j);wait('.chosen==='+str(j));flat(True);operate(2+j);wait('.step===2')
        elif story=='lobster':pulse(j,False);wait('.count===1')
        elif story=='silverplate':
            operate(j);wait('.step===1');steady(j);wait('.step===2')
        elif story=='dispatch':
            goto(j);key(str(3+j));key('f');wait('.mask & '+str(1<<j))
        elif story=='penny':
            operate(j);wait('.step===1');steady(2);wait('.step===2')
        trail_probe=None
        if story=='typewood':
            # The middle of the two curves lies on opposite sides of the grove. Only the selected trail has a surface.
            trail_probe=p.evaluate("""()=>{const d=__level.game.diagnostics,T=__level.stage.THREE;
                d.root.updateMatrixWorld(true);const out=[];
                for(const k of [-1,1]){const ray=new T.Raycaster(new T.Vector3(0,.32,-.74+k*.4123),new T.Vector3(0,-1,0));
                    const hits=ray.intersectObject(d.root,true).filter(h=>{if(h.point.y<.02||h.point.y>.13)return false;
                      for(let o=h.object;o;o=o.parent){if(!o.visible)return false;}return true;});out.push(hits.length);}
                return out;}""")
            assert trail_probe[j]==1 and trail_probe[op]==0,(id,j,trail_probe)
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
        if story=='slides':
            goto(op);key(str(op+1));key('f');wait('.step===2');goal();flat(True);wait('.inFocus');key('f')
        elif story=='flyby':window(op,3,True)
        elif story=='lamps':operate(2);wait('.count===1');key('x')
        elif story=='classroom':take_gauge(op)
        elif story=='typewood':goto(2+op);wait('.count===1');flat(True);operate(op)
        elif story=='courtyard':
            # At the right desk alone the route does not complete; the chosen ink ring must be filled first.
            flat(False);goto(1);key('3');key('f');assert read('.step')==2 and read('.count')==0
            flat(True);at(*read('.inkPoint'));wait('.count===1');operate(1)
        elif story=='lift':window(op,3,bool(op))
        elif story=='lever':take_gauge(op);flat(False);goto(2);jump_at()
        elif story=='strand':
            flat(True);at(0,-.68);wait('.count===1');operate(2+op);wait('.count===2');operate(op)
        elif story=='translation':
            operate(op);wait('.mask===3');assert read('.marks.size')==0
        elif story=='telegraph':
            steady(op);wait('.mask===3');goto(2);flat(False);jump_at()
        elif story=='ferry':goto(4);flat(True);wait('.aligned');key('f')
        elif story=='survey':goto(2+op);wait('.step===2');operate(4)
        elif story=='inkstone':goto(op);flat(False);jump_at()
        elif story=='islands':goto(2+op);flat(False);jump_at()
        elif story=='lobster':pulse(op,True);operate(2)
        elif story=='silverplate':key('1');operate(2)
        elif story=='dispatch':
            goto(op);key(str(3+op));key('f');wait('.mask===3');steady(2)
        elif story=='penny':goto(j);flat(False);jump_at()
        wait('.ready');confirm()
        p.wait_for_function('__level.phase==="done"');snap('final')
        join_probe=None
        if story=='ferry':
            if not opts.practice:
                p.evaluate(st+".view='low'")
                p.wait_for_timeout(640);snap('low')
                p.evaluate(st+".view='play'")
            # Signed joins in world space check the articulated rails at the animation endpoint.
            join_probe=p.evaluate("""()=>{const {stage,game}=__level,T=stage.THREE;
                const group=game.diagnostics.root;
                group.updateMatrixWorld(true);
                const ramp=group.getObjectByName('rail-ferry-hinge');
                const ship=group.getObjectByName('rail-ferry-ship');
                const hinge=ramp.localToWorld(new T.Vector3(.27,.0925,-.0005));
                const sill=ramp.localToWorld(new T.Vector3(.27,.0925,-.6875));
                const rail=ship.localToWorld(new T.Vector3(.27,.0335,.820));
                return {hinge:[hinge.y,hinge.z],deckGap:Math.hypot(sill.y-rail.y,sill.z-rail.z),
                    car:group.getObjectByName('rail-ferry-car').position.z};}""")
            assert abs(join_probe['hinge'][0]-.155)<.02 and abs(join_probe['hinge'][1]+2.4)<.03 and join_probe['deckGap']<.06 and join_probe['car']<-3.30,(id,join_probe)
        result=p.evaluate("""()=>{const s=__level.game.diagnostics.state,d=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
            return {id:s.id,story:s.story,runtime:performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname.split('/').pop()).find(name=>name.startsWith('newyear-chapters-')&&name.endsWith('.js')),stage:s.step,ending:s.end,shells:d.life.coins,completed:d.completed??[],souvenirs:d.souvenirs,records:d.life.records,
                errors:s.errors,collected:s.marks.size,marks:s.markCount,particles:__slime.latest.count,shapes:forms.size,choice:s.chosen};}""")
        assert result['records']['saved-before']==7 and '0101-1864' in result['souvenirs'] and result['shapes']>1 and result['errors']>0,(id,result)
        assert (id in result['completed'])!=opts.practice and result['shells']==(41 if opts.practice else 49),(id,result)
        assert (id in result['souvenirs'])!=opts.practice,(id,result)
        denom=id+('-practice' if opts.practice else '')
        assert result['records'][denom+'-ms']>0
        if id in abilities:
            assert result['records'][denom+'-checks']==(0 if id=='0102-1920' and not opts.practice else 1),(id,result)
        else:
            suffix='-relics' if id in chronicles else '-gems'
            assert result['records'][denom+suffix]==result['collected']
        if story=='classroom':assert result['collected']==5
        p.locator('[data-home]').click();p.wait_for_url('**/?from='+id+'&date='+day)
        result.update({'addedDrawCalls':calls,'returned':True,'browserErrors':errors,'keyboardAndTouchHelp':True,
            'portraitTargetPixels':[[round(x),round(y)] for x,y in phone_points],'touchWalk':True});assert not errors
        if join_probe is not None:result['boardingRailJoin']=join_probe
        if trail_probe is not None:result['trailSurfaceHitsLeftRight']=trail_probe
        path=out/(stem+'-result.json');saved=json.loads(path.read_text(encoding='utf8')) if path.exists() else {}
        if opts.practice:saved['practice']=result
        else:
            if 'practice' in saved:result['practice']=saved['practice']
            saved=result
        path.write_text(json.dumps(saved,ensure_ascii=False,indent=2),encoding='utf8');ctx.close();print(id,'PASS',flush=True)
    browser.close()
