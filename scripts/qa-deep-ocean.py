"""Offscreen reference and production captures. Run with reference, before, or after."""
import functools
import http.server
import json
import statistics
import sys
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

stage = sys.argv[1]
root = Path(__file__).resolve().parents[1]
out = root / 'qa/evidence'
reference = stage == 'reference'
site = Path(sys.argv[2]) if len(sys.argv)>2 else (Path.home() / 'Desktop/WaterShade' if reference else root / 'dist')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(site)))
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome', headless=True, args=['--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
    page = browser.new_page(has_touch=True, viewport={'width':800,'height':540})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text[:1200]) if m.type=='error' and '404' not in m.text and 'net::' not in m.text else None)
    page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve();localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'medium',homeWeather:'clear',homeClockMinute:730}))")
    if reference:
        source = (site/'assets/main.js').read_text(encoding='utf8')
        page.route('**/assets/main.js', lambda r:r.fulfill(content_type='text/javascript',body=source.replace('await zG.create(e)', '(window.refApp=await zG.create(e))')))
    page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='domcontentloaded')
    page.wait_for_function('window.refApp' if reference else 'window.__slime?.ready && window.__app',timeout=240000)
    if not reference:
        page.wait_for_function('window.__app.pipeline.time>1.2',timeout=120000)
        hud_mask=page.add_style_tag(content='body > :not(canvas){visibility:hidden!important}')
        page.evaluate("""()=>{const a=window.__app;a.renderer.setAnimationLoop(null);window.__homeCalib.setInstantExposure(true);
         a.ctx.onUpdate(()=>{if(window.pose){a.camera.position.fromArray(pose[0]);a.camera.lookAt(...pose[1]);a.camera.updateMatrixWorld()}})}""")
    def shot(key, pos, target):
        page.evaluate("""([pos,target])=>{if(window.refApp){let a=refApp;a.controls.target.fromArray(target);a.camera.position.fromArray(pos);a.controls.update()}else{window.pose=[pos,target];__app.step(1/60);__app.step(1/60)}}""",[pos,target])
        page.wait_for_timeout(1000 if reference else 100)
        page.screenshot(path=out/f'deep-ocean-{stage}-{key}.jpg',quality=88)
    x,z=(-15,15) if reference else (5,-58)
    level=0 if reference else page.evaluate("__app.ctx.ocean.sampleWave(5,-58).height-.38")
    for key,h in [('above',2.4),('line',0),('below',-1.8)]:
        shot(key,[x,level+h,z],[x+2,level+h-.05,z-10])
    if stage=='after':
        page.evaluate("""()=>{const s=__slime,o=__ocean; __game.save.data.life.sailing={flag:4205,waters:307,reserve:0,run:null};s.teleport([5,-1,-58]);window.o=o;
        window.moveSea=(x,z,y)=>{s.teleport([x,y,z]);s.swimming=true;o.update(o.lastWaveTime+.03,.03)};moveSea(5,-580,-1)}""")
        page.wait_for_function("__app.pipeline.cloudHook.mat.uniforms.uShapeReady.value===1 && !!__app.ctx.ocean.foamMap.image")
        for key,pos,target in [('shelf',[4,-2,-57],[6,-4,-49]),('shore-low',[6,.1,-50],[4,-1,-46]),('shore-wide',[14,4,-47],[4,-1,-46])]:
            shot(key,pos,target)
        hero=page.evaluate("""async()=>{const s=__slime,a=__app;__graphics.set('high');a.director.mode='cloudy';
        a.director.update(a.director.weather.time+12);a.pipeline.cloudHook.invalidate();
        const x=7,z=-59,y=a.ctx.ocean.sampleWave(x,z).height-.38;
        s.teleport([x,y-.28,z]);s.swimming=true;__ocean.startDiving(false);s.position[1]=y-.28;s.velocity=[0,0,0];
        window.pose=[[x-1.3,y,z+1.6],[x,y,z]];const radii=[];for(let i=0;i<40;i++){a.step(.025);await new Promise(r=>setTimeout(r,25));if(i>20&&s.latest?.count)radii.push(s.latest.radii[0][1])}
        return {deformation:Math.max(...radii)-Math.min(...radii),vertices:s.latest?.count,centers:s.latest?.centers,anchor:s.position,errors:s.workerErrors,generation:s.generation}}""")
        print('waterline actor',hero,flush=True)
        assert hero['vertices']>0 and hero['deformation']>0,hero
        pos,target=page.evaluate('pose')
        level=page.evaluate('__app.ctx.ocean.sampleWave(pose[0][0],pose[0][2]).height-.38')
        for n,delta in enumerate([.16,.075,0,-.075,-.16]):
            shot(f'crossing-{n}',[pos[0],level+delta,pos[2]],target)
        shot('below-looking-up',[8,-2.25,-60],[8,1.25,-65])
        for weather,minute in [('cloudy',960),('rain',1030),('clear',1250)]:
            page.evaluate("""([mode,minute])=>{const a=__app;a.director.mode=mode;a.director.setTime(minute);
            a.director.update(a.director.weather.time+60);a.pipeline.cloudHook.invalidate();}""",[weather,minute])
            shot('sky-'+weather,[8,.9,-60],[15,7,-74])
        page.evaluate("""()=>{const a=__app;a.director.setTime(730);a.director.mode='clear';a.director.update(a.director.weather.time+60)}""")
        page.evaluate("moveSea(0,-5550,-1998);o.mode='diving';__slime.submerged=true")
        assert page.evaluate("Math.abs(__slime.world.terrain(0,-5550)+2000.38)<.1")
        bottom=page.evaluate("""async()=>{const s=__slime,a=__app,x=0,z=-5550;
          const before=s.resets;o.keys.add('KeyC');s.keys.add('KeyC');
          for(let j=0;j<45;j++){a.step(.04);if(j%4===0)await new Promise(r=>setTimeout(r,15))}
          o.keys.delete('KeyC');s.keys.delete('KeyC');
          return {bed:s.world.terrain(x,z),foot:s.position[1],resets:s.resets-before}}""")
        print('touchdown',bottom,flush=True)
        assert bottom['resets']==0 and -.03<=bottom['foot']-bottom['bed']<.25,bottom
        shot('deep',[0,-1997,-5550],[8,-2000,-5560])
        page.evaluate("moveSea(5,-580,-1)")
        island=page.evaluate("Array.from(o.islands.tiles.values(), t=>t.island).sort((a,b)=>Math.hypot(a.x-5,a.z+580)-Math.hypot(b.x-5,b.z+580))[0]")
        if island:
            x,z=island['x'],island['z']
            for dist in [100,28]:
                shot(f'island-{dist}',[x+dist,dist*.25,z+dist],[x,0,z])
        page.evaluate("""()=>{o.mode='idle';moveSea(5,-580,-1);o.controls.show('开放海域',['dive','summon']);}""")
        hud_mask.evaluate("(s)=>s.remove()")
        for width,height in [(800,540),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            page.keyboard.press('F1')
            assert page.evaluate("o.controls.helpOpen")
            page.locator('.voyage-guide button').scroll_into_view_if_needed()
            page.locator('.voyage-guide button').click()
            page.locator('[data-voyage=help]').tap()
            page.keyboard.press('F1')
            assert not page.evaluate("o.controls.helpOpen")
        page.set_viewport_size({'width':800,'height':540})
        stats={'touchdown':bottom,'waterlineActor':hero,'resolution':[800,540],'timing':'8 warmed manual frames per preset; renderer finish after each step'}
        for preset in ['low','medium','high','ultra']:
            times=page.evaluate("""p=>{__graphics.set(p);const a=__app,r=a.renderer;
            a.step(1/60);r.getContext().finish();let ms=[];
            for(let j=0;j<8;j++){const t=performance.now();a.step(1/60);r.getContext().finish();ms.push(performance.now()-t)}
            return ms}""",preset)
            stats[preset]={'medianMs':statistics.median(times),'samplesMs':times}
        page.evaluate('''async()=>{const s=__slime;window.o.mode='diving';s.submerged=true;for(let i=0;i<35;i++){__app.step(.03);await new Promise(r=>setTimeout(r,22))}}''')
        stats['swimmer']=page.evaluate("({run:o.run??null,islands:o.islands.tiles.size,vertices:__slime.latest?.count,rendererMemory:{...__app.renderer.info.memory}})")
        print('swimmer',stats['swimmer'],flush=True)
        assert stats['swimmer']['vertices']>0,stats['swimmer']
        page.evaluate('o.mode="idle";moveSea(0,0,2)')
        stats['returned']=page.evaluate("({islands:o.islands.tiles.size,bedCells:o.islands.patches.size,rendererMemory:{...__app.renderer.info.memory}})")
        stats['legacyRefloat']=page.evaluate("""()=>{o.syncSea(5,-580);const i=o.islands.shores.find(i=>i.kind===1);
        o.begin(i.x,i.z,0);const run=o.run;Object.assign(run,{x:i.x,z:i.z,ammo:7,cargo:9});o.restoreVoyage();
        return {shift:Math.hypot(run.x-i.x,run.z-i.z),navigable:o.bed(run.x,run.z)<-1.26,ammo:run.ammo,cargo:run.cargo}}""")
        assert stats['legacyRefloat']['shift']>0 and stats['legacyRefloat']['navigable']
        assert (stats['legacyRefloat']['ammo'],stats['legacyRefloat']['cargo'])==(7,9)
        (out/'deep-ocean-runtime.json').write_text(json.dumps(stats,indent=2),encoding='utf8')
        assert stats['returned']['islands']==0 and stats['returned']['bedCells']==0
    (out/f'deep-ocean-{stage}-errors.json').write_text(json.dumps(errors,ensure_ascii=False),encoding='utf8')
    assert not errors, errors[:2]
    browser.close()
server.shutdown()
