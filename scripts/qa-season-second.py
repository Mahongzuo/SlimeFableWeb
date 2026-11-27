"""Walk through the five second gates with the real character in an isolated headless Chrome."""
import argparse
import ast
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
shared=ast.parse((root/'scripts/qa-turning-season.py').read_text(encoding='utf-8-sig'))
def constant(name):
    return next(ast.literal_eval(n.value) for n in shared.body if isinstance(n,ast.Assign) and getattr(n.targets[0],'id',None)==name)
walk=constant('walk')
drive=constant('drive_moving')
ids={'1127':'1895','1128':'1964','1129':'1972','1130':'1872','1201':'1959'}
parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
parser.add_argument('--day',choices=ids)
parser.add_argument('--practice',action='store_true')
parser.add_argument('--dev-entry',action='store_true',help='Exercise the module directly while unrelated modules are being authored.')
args=parser.parse_args()
out=root/'qa/evidence'

with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    for day,year in ids.items():
        if args.day and args.day!=day:continue
        id=day+'-'+year
        ctx=browser.new_context(viewport={'width':950,'height':630},has_touch=True)
        ctx.route_web_socket('**/*',lambda socket:None)
        ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
            if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
            JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{legacy:12}}}));""")
        if args.dev_entry:ctx.route('**/src/level/main.ts',lambda route:route.fulfill(content_type='application/javascript',body="import '/src/level/season-second.ts'"))
        p=ctx.new_page()
        p.set_default_timeout(65000)
        errors=[]
        p.on('pageerror',lambda e:(errors.append(str(e)),print(id,'browser error',str(e),flush=True)))
        p.on('requestfailed',lambda req:print(id,'request failed',req.url,req.failure,flush=True))
        def snap(suffix):
            if not args.practice:p.screenshot(path=out/f'season-stage-{day}-second-{suffix}.jpg',quality=88)
        def key(k):p.keyboard.press(k)
        def at(x,z):p.evaluate(walk,[x,z])
        state='__level.game.diagnostics.state'
        def wait(expr):p.wait_for_function(state+expr)
        print(id,'loading',flush=True)
        p.goto(args.base+'/level.html?id='+id+('&practice=617' if args.practice else ''))
        p.wait_for_function('window.__slime?.ready')
        p.locator('[data-start]:enabled').click()
        p.wait_for_function('__slime.latest?.count>100&&__level.stage.time>1.2')
        p.evaluate("""()=>{window.shapes=new Set();const sample=()=>{const r=__slime.latest?.radii[0];
            if(r)shapes.add(r.map(n=>n.toFixed(3)).join('/'));if(__level.phase!=='done')requestAnimationFrame(sample);};sample();}""")
        draws=p.evaluate("""()=>{const st=__level.stage,root=__level.game.diagnostics.root,i=st.renderer.info;const ar=i.autoReset;i.autoReset=false;
            function count(b){root.visible=b;i.reset();st.render(0,__slime);return i.render.calls;}try{const base=count(false);return count(true)-base;}finally{root.visible=true;i.autoReset=ar;}}""")
        assert 0<draws<=150,(id,draws)
        def rally(limit):
            p.evaluate("""async limit=>{const l=__level,s=l.game.diagnostics.state,a=__slime;
                const hold=(k,v)=>dispatchEvent(new KeyboardEvent(v?'keydown':'keyup',{code:k,bubbles:true}));
                for(let i=0;i<2500&&s.step<limit;i++){
                    if(!s.rolling){dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF'}));dispatchEvent(new KeyboardEvent('keyup',{code:'KeyF'}));}
                    const d=s.ball[0]-a.position[0];hold('KeyA',d<-.16);hold('KeyD',d>.16);
                    await new Promise(requestAnimationFrame);const render=l.stage.render;l.stage.render=()=>{};
                    try{for(let j=0;j<3;j++)l.step(.022);}finally{l.stage.render=render;}
                }hold('KeyA',false);hold('KeyD',false);if(s.step<limit)throw Error('rally timeout');}""",limit)
        if day=='1127':
            key('g');wait('.pin');key('f');key('c');at(-1.85,-.72);at(1.7,-.72);wait('.step===2')
        elif day=='1128':
            key('f');at(-1.6,.85);key('f');wait('.step===1');key('c');at(1.6,-.82);key('f');wait('.step===2')
        elif day=='1129':
            at(0,1.62);key('f');at(-2.9,1.62);wait('.errors>0');key('c');key('f');rally(1)
        elif day=='1130':
            at(-2.55,1.28);wait('.canPass===false');key('f');wait('.errors>0');wait('.canPass');key('f');wait('.step===1');at(1.75,.18)
        else:
            key('g');wait('.step===1');key('f')
            for x,z in [[-3.6,1.4],[-2.8,-1.5],[-1.6,.15],[-.65,.05],[.65,.05],[1.7,-1.52],[3.4,-.72],[3.3,1.25]]:
                at(x,z);p.wait_for_function('__slime.grounded');key('Space');p.wait_for_function('!__slime.grounded');p.wait_for_function('__slime.grounded')
            print('collected ice stations',p.evaluate(state+'.finds.size'),flush=True);at(1.96,1.2);key('c');wait('.spread');key('f');wait('.step===2')
        print(id,'midpoint',flush=True)
        snap('play')
        p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(550);snap('portrait')
        touch_proof=False
        if day=='1128':
            pixel=p.evaluate("""()=>{const st=__level.stage,v=new st.THREE.Vector3(.12,0,-1.45).project(st.camera);
                return [(1+v.x)*innerWidth/2,(1-v.y)*innerHeight/2];}""")
            p.touchscreen.tap(*pixel);p.wait_for_function('Math.hypot(__slime.position[0]-.12,__slime.position[2]+1.45)<.33')
            touch_proof=True
        p.set_viewport_size({'width':950,'height':630})
        for view in ['low','far','play']:
            p.evaluate('v=>{'+state+'.view=v}',view);p.wait_for_timeout(620)
            if view!='play':snap(view)
        if day=='1127':at(1.7,1.18);key('f')
        elif day=='1128':at(.12,-1.45);key('f')
        elif day=='1129':
            rally(3)
        elif day=='1130':
            key('Space');p.wait_for_function('__slime.position[1]>.28');key('f');wait('.step===2');at(-1.35,-1.48);wait('.canPass');key('f')
        else:
            assert not p.evaluate(state+'.pin'),'the second tripod must be pressed separately'
            key('x');p.wait_for_function('!__slime.latest.shots.length');key('g');wait('.pin');at(1.6,0);at(-1.6,0);at(-1.94,-1.52);key('f')
        wait('.approach')
        key('f')
        d=p.locator('dialog[open]');d.wait_for()
        if day in ['1128','1201']:
            for k in (['ArrowLeft']*2+(['ArrowDown'] if day=='1128' else ['ArrowUp'])*2):key(k)
            d.locator('.season-main').click()
        elif day=='1130':p.evaluate(drive,'catch')
        elif day=='1129':p.evaluate(drive,'rally')
        else:
            for button in d.locator('footer button:not(.season-exit)').all():button.click()
        d.get_by_role('button',name='继续').click()
        p.wait_for_function('__level.phase==="done"')
        snap('final')
        summary=p.evaluate("""()=>{const s=__level.game.diagnostics.state,save=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
            return {id:s.id,completed:save.completed,items:save.souvenirs,records:save.life.records,shells:save.life.coins,particles:__slime.latest.count,shapes:shapes.size,errors:s.errors,finds:s.finds.size};}""")
        assert summary['records']['legacy']==12 and summary['shapes']>1 and summary['errors']>0,(id,summary)
        assert (id in summary.get('completed',[]))!=args.practice,summary
        assert summary['shells']==(41 if args.practice else 49),summary
        if day=='1201':assert summary['finds']==8,summary
        prefix=id+('-practice' if args.practice else '-daily')+'-instrument'
        assert summary['records'][prefix]==1 and '0101-1864' in summary['items'],summary
        p.locator('[data-home]').click();p.wait_for_url('**/?from='+id+'&date='+day)
        summary['returned']=True;summary['addedDrawCalls']=draws;summary['browserErrors']=errors
        if touch_proof:summary['portraitTapWalk']=True
        assert not errors,(id,errors)
        dest=out/f'season-stage-{day}-second-result.json'
        saved=json.loads(dest.read_text(encoding='utf-8')) if dest.exists() else {'id':id}
        if args.practice:
            saved['practice']=summary
            summary=saved
        elif 'practice' in saved:
            summary['practice']=saved['practice']
        dest.write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
        ctx.close();print(id,'PASS',flush=True)
    browser.close()

