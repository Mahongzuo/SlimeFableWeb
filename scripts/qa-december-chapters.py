"""Exercise both historical chapter routes in an isolated, pointer-lock-disabled Chrome."""
import argparse,ast,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=root/'qa/evidence'
tree=ast.parse((root/'scripts/qa-turning-season.py').read_text(encoding='utf-8-sig'))
walk=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and getattr(n.targets[0],'id',None)=='walk')
ids={'1202':['1986','1942'],'1203':['1958','1992'],'1204':['2024','1996'],'1205':['2024','1901'],'1206':['1996','1877']}
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:5190');parser.add_argument('--day',choices=ids)
parser.add_argument('--gate',choices=['first','second']);parser.add_argument('--practice',action='store_true')
opts=parser.parse_args()
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    for day,years in ids.items():
      if opts.day and opts.day!=day:continue
      for gate,year in zip(['first','second'],years):
        if opts.gate and gate!=opts.gate:continue
        id=day+'-'+year;stem='dec-six-'+day+'-'+gate
        ctx=browser.new_context(viewport={'width':948,'height':630},has_touch=True)
        ctx.route_web_socket('**/*',lambda socket:None)
        if id=='1206-1877':
            ctx.add_init_script("""window.recordedTones=[];
                const start=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(...args){
                  if(this.type==='triangle')recordedTones.push(Math.round(this.frequency.value));
                  return start.apply(this,args);};""")
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
            if read('.story')=='bridge':
                a=p.evaluate('__slime.position');cross=min(a[0],x)<1.52 and max(a[0],x)>-1.52
                if cross:
                    p.evaluate(walk,[a[0],-.63]);p.evaluate(walk,[x,-.63])
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
        p.goto(opts.base+'/level.html?id='+id+('&practice=five-dates' if opts.practice else ''));p.locator('[data-start]:enabled').click()
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
        if story=='mail':
            at(*sites[1 if opts.practice else 0]);jump();wait('.step===2');confirm();wait('.step===1')
        elif story=='archive':
            flat(True);at(*sites[0]);at(*sites[1]);wait('.step===1');at(*sites[3 if opts.practice else 2]);key('f');wait('.step===2')
        elif story=='lens':confirm();wait('.step===1');confirm();wait('.step===2')
        elif story=='message':confirm();wait('.step===1');confirm();wait('.step===2')
        elif story=='lantern':flat(True);at(*sites[1 if opts.practice else 0]);key('f');wait('.step===2')
        elif story=='rover':flat(True);at(*sites[0]);at(*sites[1]);wait('.step===2')
        elif story=='bridge':
            at(*sites[2 if opts.practice else 0]);key('f');wait('.step===2');flat(True);confirm();wait('.step===1')
        elif story=='drum':at(*sites[1 if opts.practice else 0]);key('f');wait('.step===1');confirm();wait('.step===2')
        elif story=='falls':flat(True);confirm();wait('.step===1')
        elif story=='foil':flat(True);confirm();wait('.step===1');at(0,.31);wait('.count>=2')
        print(id,'midpoint',flush=True);snap('play')
        p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(650);snap('portrait')
        # Walk to the actual projected mark on a phone-sized canvas where the mark is visible.
        if story=='archive':
            gx,gz=read('.goal');px=p.evaluate("""([x,z])=>{const a=__level.stage,v=new a.THREE.Vector3(x,0,z).project(a.camera);
                return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]}""",[gx,gz])
            if 15<px[0]<375 and 120<px[1]<690:
                p.touchscreen.tap(*px);p.wait_for_function('([x,z])=>Math.hypot(__slime.position[0]-x,__slime.position[2]-z)<.6',arg=[gx,gz])
        p.set_viewport_size({'width':948,'height':630})
        for view in ['low','far','play']:
            p.evaluate('v=>{'+st+'.view=v}',view);p.wait_for_timeout(550)
            if view!='play':snap(view)
        if story=='mail':goal();jump();wait('.step===2');confirm()
        elif story in ['archive','lantern']:confirm()
        elif story in ['lens','message']:flat(True);confirm()
        elif story=='rover':at(*sites[3 if opts.practice else 2]);key('f')
        elif story=='bridge':confirm();wait('.step===2');confirm()
        elif story=='drum':
            # Jump onto the first tooth, then push around the visible curved sector.
            at(*sites[2]);jump();at(*sites[3]);at(*sites[4])
        elif story=='falls':
            flat(False);goal();p.wait_for_function('__slime.grounded');key('Space');p.wait_for_function('__slime.position[1]>.36');key('f')
        elif story=='foil':at(*sites[2]);wait('.step===2');flat(False);confirm()
        wait('.ready');goal()
        if story=='drum':flat(True)
        if story=='message':flat(False);jump()
        else:key('f')
        p.wait_for_function('__level.phase==="done"');snap('final')
        result=p.evaluate("""()=>{const s=__level.game.diagnostics.state,d=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
            return {id:s.id,story:s.story,stage:s.step,ending:s.end,shells:d.life.coins,completed:d.completed??[],souvenirs:d.souvenirs,records:d.life.records,
                errors:s.errors,collected:s.marks.size,marks:s.markCount,particles:__slime.latest.count,shapes:forms.size,notes:s.notes};}""")
        assert result['records']['saved-before']==7 and '0101-1864' in result['souvenirs'] and result['shapes']>1 and result['errors']>0,(id,result)
        assert (id in result['completed'])!=opts.practice and result['shells']==(41 if opts.practice else 49),(id,result)
        assert (id in result['souvenirs'])!=opts.practice,(id,result)
        denom=id+('-practice' if opts.practice else '')
        assert result['records'][denom+'-ms']>0 and result['records'][denom+('-relics' if gate=='first' else '-stars')]==result['collected'],(id,result)
        if story=='foil':
            result['oscillatorHz']=p.evaluate('recordedTones')
            assert len(result['oscillatorHz'])==6 and result['oscillatorHz'][:3]==result['oscillatorHz'][3:],result['oscillatorHz']
        p.locator('[data-home]').click();p.wait_for_url('**/?from='+id+'&date='+day)
        result.update({'addedDrawCalls':calls,'returned':True,'browserErrors':errors});assert not errors
        path=out/(stem+'-result.json');saved=json.loads(path.read_text(encoding='utf8')) if path.exists() else {}
        if opts.practice:saved['practice']=result
        else:
            if 'practice' in saved:result['practice']=saved['practice']
            saved=result
        path.write_text(json.dumps(saved,ensure_ascii=False,indent=2),encoding='utf8');ctx.close();print(id,'PASS',flush=True)
    browser.close()
