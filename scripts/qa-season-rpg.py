"""Exercise the five expedition arenas through level inputs in an isolated headless browser."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

cli = argparse.ArgumentParser()
cli.add_argument('--base', default='http://127.0.0.1:5190')
cli.add_argument('--days', default='1127,1128,1129,1130,1201')
cli.add_argument('--practice', action='store_true')
options = cli.parse_args()
out = Path(__file__).resolve().parents[1] / 'qa' / 'evidence'
driver = """async({action,branch})=>{
 const {battle:b,stage,step}=__level,a=__slime;
 const send=(k,on)=>dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code:k,bubbles:true,cancelable:true}));
 const tap=k=>{send(k,true);send(k,false)};
 const wait=async(n=1)=>{for(let i=0;i<n;i++){
   await new Promise(requestAnimationFrame);
   const original=stage.render;stage.render=()=>{};
   try{for(let j=0;j<5;j++)step(.036);}finally{stage.render=original;}
 }};
 const keys=['KeyA','KeyD','KeyW','KeyS'];
 const walk=async p=>{
   for(let i=0;i<210;i++){
     const x=p[0]-a.position[0],z=p[2]-a.position[2];
     if(Math.hypot(x,z)<.38){keys.forEach(k=>send(k,false));return;}
     keys.forEach((k,j)=>send(k,[x<-.14,x>.14,z<-.14,z>.14][j]));await wait();
   }throw Error('walk '+JSON.stringify([p,a.position,b.phase]));
 };
 const guard=async()=>{send('KeyC',true);await wait(7)};
 if(action==='warm'){await walk(b.layout.warm);await guard();send('KeyC',false);tap('KeyF');return b.phase;}
 if(action==='route'){await walk(b.layout.branches[branch]);tap('KeyF');return b.phase;}
 if(action==='retry'){await walk([0,0,6.4]);for(let i=0;i<3;i++){tap('KeyJ');await wait(3);}return b.phase;}
 if(action==='leg'){
   const day=b.day,i=b.round;
   if(day==='1127'||day==='1201'){
     await walk(b.sampleSpot);await guard();tap('KeyJ');send('KeyC',false);await wait(3);
     if(!b.sampled&&!b.braced)throw Error('prep '+b.message);
   }
   if(day==='1130'){
     await walk([-b.shoreX,0,b.z+1.65]);tap('KeyJ');await wait(3);
     if(b.depth!==2)throw Error('shallow lead '+b.message);
     if(branch===0){await walk([b.shoreX,0,b.z+1.65]);tap('KeyJ');await wait(3);}
   }
   await walk(b.safeSpot);
   if(branch===1){await guard();if(day==='1129')await walk(b.safeSpot);}
   if(day==='1128')for(let j=0;j<60&&b.tide>.32;j++)await wait();
   if(branch===0&&(day==='1128'||day==='1201'))tap('ShiftLeft');
   if(day==='1129'&&branch===0){await walk(b.safeSpot);tap('Space');await wait();}
   tap('KeyJ');send('KeyC',false);await wait(3);
   if(b.round===i)throw Error('leg '+JSON.stringify([i,b.message,b.phase,a.position,b.safeSpot,b.fill,a.spread]));
   return b.round;
 }
 if(action==='last'){await walk(b.layout.end);tap('KeyF');return b.phase;}
}"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width':960, 'height':610}, has_touch=True)
    context.route_web_socket('**/*',lambda socket:None)
    context.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
      if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
      JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{previous:2}}}));""")
    for day in options.days.split(','):
        page = context.new_page()
        errors = []
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        page.set_default_timeout(90000)
        prefix = 'season-stage-'+day+'-rpg-'
        def snap(suffix):
            if not options.practice:
                page.screenshot(path=out/(prefix+suffix+'.jpg'),quality=86)
        def action(name):
            return page.evaluate(driver,{'action':name,'branch':0 if options.practice else 1})
        page.goto(options.base+'/level.html?id='+day+'-rpg'+('&practice=stage-proof' if options.practice else ''))
        page.wait_for_function('window.__level?.stage.time>1.25 && __slime.latest?.count>100')
        calls = page.evaluate("""()=>{const st=__level.stage,root=st.scene.getObjectByName('expedition-'+__level.spec.day),i=st.renderer.info;
          i.autoReset=false;const count=v=>{root.visible=v;i.reset();st.render(.001,__slime);return i.render.calls};
          try{const bare=count(false);return count(true)-bare;}finally{root.visible=true;i.autoReset=true;}}""")
        assert 0<calls<=150,calls
        snap('play')
        page.locator('[data-start]:enabled').click()
        assert action('warm')=='route'
        assert action('route')=='duel'
        assert action('leg')==1
        if not options.practice:
            assert action('retry')=='lost'
            page.locator('[data-start]:enabled').click()
            assert page.evaluate('__level.battle.round')==1
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(160);snap('portrait')
        touch=page.evaluate("""()=>{const {stage:s,battle:b}=__level,p=b.nextSpot,
          n=new s.THREE.Vector3(p[0],0,p[2]).project(s.camera);
          const x=(n.x+1)*innerWidth/2,y=(1-n.y)*innerHeight/2;
          return {x,y,canvas:document.elementFromPoint(x,y)===s.renderer.domElement,start:[...__slime.position]};}""")
        assert touch['canvas'],(day,touch)
        page.touchscreen.tap(touch['x'],touch['y'])
        page.wait_for_function('p=>Math.hypot(__slime.position[0]-p[0],__slime.position[2]-p[2])>.32',arg=touch['start'])
        page.set_viewport_size({'width':960,'height':610})
        for suffix,eye in [('low',[3.6,1.75,5.85]),('far',[7.8,10.8,16.6])]:
            page.evaluate("""eye=>{const s=__level.stage;window.originalDraw??=s.render.bind(s);
              s.render=(dt,a)=>{s.camera.position.fromArray(eye);s.camera.lookAt(0,1,-4);originalDraw(dt,a);};}""",eye)
            page.wait_for_timeout(170);snap(suffix)
        page.evaluate('__level.stage.render=originalDraw')
        assert action('leg')==2
        assert action('leg')==3
        assert action('last')=='curtain'
        page.wait_for_timeout(280);snap('final')
        plate=page.locator('.season-plate[open]');plate.wait_for()
        if day in ('1127','1129','1201'):
            for key in ['ArrowRight','ArrowRight']+(['ArrowUp']*2 if day=='1127' else ['ArrowDown'] if day=='1129' else ['ArrowUp']):
                page.keyboard.press(key)
            plate.locator('.season-main').click()
        else:
            for btn in plate.locator('footer button:not(.season-exit)').all():btn.click()
        plate.get_by_role('button',name='继续',exact=True).click()
        page.locator('.mode-keepsake').wait_for()
        stats=page.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('slimefable.web.save.v1')),k=__level.spec.saveId,
          bucket=k+(location.search.includes('practice')?'-practice':'-daily');return {preserved:s.life.records.previous===2,
          routes:s.life.records[bucket+'-routes'],won:s.life.records[bucket+'-wins'],plate:s.life.records[bucket+'-instrument'],
          owned:s.souvenirs.includes(k),particles:__slime.latest.count,errors:__level.battle.errors};}""")
        assert stats['won']==1 and stats['plate']==1 and stats['preserved'] and stats['owned']!=options.practice,stats
        page.locator('[data-mode-home]').click()
        page.wait_for_url('**/?date='+day+'&from='+day+'-rpg')
        assert not errors,errors
        file=out/(prefix+'result.json')
        data=json.loads(file.read_text('utf-8')) if file.exists() else {}
        data['practice' if options.practice else 'daily']={**stats,'returned':True,'drawCalls':calls,'portraitTap':True}
        file.write_text(json.dumps(data,ensure_ascii=False,indent=2),'utf-8')
        print(day,stats,flush=True);page.close()
    browser.close()
