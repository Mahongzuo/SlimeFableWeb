"""Exercise production water controls and photograph identical coastal views in isolated headless Chrome."""
import functools
import http.server
import json
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
stage = sys.argv[1] if len(sys.argv) > 1 else 'after'
site = Path(sys.argv[2]) if len(sys.argv) > 2 else root / 'dist'
out = root / 'qa/evidence'
prefix = sys.argv[3] if len(sys.argv) > 3 else 'ocean-optics'


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


with http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(site))) as server, sync_playwright() as pw:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    browser = pw.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    page = browser.new_page(has_touch=True, viewport={'width': 800, 'height': 520})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text[:1400]) if m.type == 'error' and '404' not in m.text else None)
    # The browser never locks the pointer. Model queued lock notifications against the actual game listeners.
    page.add_init_script("""let owner=null; window.lockRequests=0;
      Object.defineProperty(document,'pointerLockElement',{get:()=>owner});
      const notify=()=>setTimeout(()=>document.dispatchEvent(new Event('pointerlockchange')),0);
      Element.prototype.requestPointerLock=function(){lockRequests++;owner=this;notify();return Promise.resolve()};
      document.exitPointerLock=()=>{
        const release=()=>{owner=null;notify()};
        if(window.releaseDelay)setTimeout(release,window.releaseDelay);else release();
      };
      localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'medium',homeWeather:'clear',homeClockMinute:730}));""")
    page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='domcontentloaded')
    page.wait_for_function('window.__slime?.ready && __app.pipeline.time>1.3 && window.__game?.state==="play"', timeout=240000)
    page.evaluate("""()=>{__app.renderer.setAnimationLoop(null); __homeCalib.setInstantExposure(true);
      window.step=()=>__app.step(1/60); __app.ctx.onUpdate(()=>{if(window.pose){__app.camera.position.fromArray(pose[0]);
      __app.camera.lookAt(...pose[1]);__app.camera.updateMatrixWorld()}})}""")
    def look():
        return page.evaluate("""()=>{const s=__slime, yaw=s.yaw, pitch=s.pitch;
            document.dispatchEvent(new MouseEvent('mousemove',{movementX:48,movementY:20}));
            return {locked:document.pointerLockElement===__app.renderer.domElement, yaw:s.yaw-yaw,pitch:s.pitch-pitch}}""")

    land_look = look()
    page.evaluate("""()=>{__slime.teleport([5,-1,-63]);__slime.swimming=true; step()}""")
    swim_look = look()
    page.keyboard.press('c')
    page.evaluate('step()')
    page.wait_for_timeout(80)
    stats = {'dive': page.evaluate('[__game.state,__slime.mode,__ocean.mode]')}
    stats['look'] = {'land':land_look,'swim':swim_look,'dive':look()}
    if stage == 'after':
        assert all(v['locked'] and v['yaw'] < -.1 and v['pitch'] > .03 for v in stats['look'].values()), stats
    page.keyboard.press('Escape')
    page.evaluate('step()')
    page.locator('[data-act=resume]').filter(has_text='继续游玩').click()
    page.evaluate('step()')
    page.wait_for_timeout(80)
    page.evaluate("document.dispatchEvent(new Event('pointerlockchange'));step()")
    stats['lateUnlockAfterResume'] = page.evaluate('__game.state')
    if stage == 'before' and stats['lateUnlockAfterResume'] == 'pause':
        page.locator('[data-act=resume]').filter(has_text='继续游玩').click()
    if stage == 'after':
        assert stats['lateUnlockAfterResume'] == 'play'
        assert stats['dive'] == ['play', 'play', 'diving'], stats
        for _ in range(2):
            page.keyboard.press('Escape')
            page.evaluate('step()')
            page.locator('[data-act=resume]').filter(has_text='继续游玩').click()
            # An already queued unlock can arrive after the resume click.
            page.evaluate("document.dispatchEvent(new Event('pointerlockchange'));step();step()")
            assert page.evaluate('__game.state==="play" && __slime.mode==="play" && __ocean.mode==="diving"')
        page.keyboard.press('F1')
        assert page.evaluate('__ocean.controls.helpOpen')
        menu_look = look()
        assert not menu_look['locked'] and menu_look['yaw'] == 0
        page.locator('.voyage-guide button').click()
        page.wait_for_function('document.pointerLockElement===__app.renderer.domElement')
        assert look()['locked']
        page.keyboard.press('F2')
        assert page.evaluate('__game.ui.quickMenuOpen') and not look()['locked']
        page.keyboard.press('F2')
        page.wait_for_function('document.pointerLockElement===__app.renderer.domElement')
        assert look()['locked'] and page.evaluate('__game.state==="play"')
        # Close a menu before the browser has finished releasing its old lock.
        page.evaluate('window.releaseDelay=100')
        page.keyboard.press('F2')
        page.keyboard.press('F2')
        page.wait_for_timeout(180)
        page.evaluate('window.releaseDelay=0')
        assert look()['locked'] and page.evaluate('__game.state==="play"')
        page.evaluate("document.exitPointerLock()")
        page.wait_for_function('__slime.mode==="paused"')
        page.evaluate('step()')
        page.locator('[data-act=resume]').filter(has_text='继续游玩').click()
        assert look()['locked']
        assert not page.evaluate('__ocean.controls.helpOpen')
    stats['lockRequests'] = page.evaluate('window.lockRequests')
    hud_mask = page.add_style_tag(content='body > :not(canvas){visibility:hidden!important}')

    def shot(name, position, target):
        page.evaluate('p=>{window.pose=p;step();step()}', [position, target])
        page.screenshot(path=out / f'{prefix}-{stage}-{name}.jpg', quality=90)

    def weather(mode):
        page.evaluate("""mode=>{window.__game.pauseGame();const select=document.querySelector('[data-weather]');
          select.value=mode;select.dispatchEvent(new Event('change',{bubbles:true}));
          document.querySelector('[data-act=resume]').click();
          __app.director.update(__app.director.weather.time+45);__app.pipeline.cloudHook.invalidate()}""", mode)
        assert page.evaluate('__app.director.mode') == mode

    weather('clear')
    shot('harbor', [-32,10,-65], [-6,1,-28])
    shot('gate-front', [8, 1.6, 14.6], [11.6, 1.65, 9.0])
    shot('gate-oblique', [8.9, 2.1, 12.8], [13.1, 1.65, 10.0])
    stats['portalDepth'] = page.evaluate("""()=>__game.portals.filter(p=>p.disc.visible).map(p=>[p.disc.material.depthWrite,p.disc.material.transparent])""")
    if stage == 'after':
        assert stats['portalDepth'] and all(row == [True, False] for row in stats['portalDepth'])
        # Read a box entirely inside gate 2 from the HDR scene, before bloom or exposure.
        stats['gateOceanToggleMaxDelta'] = page.evaluate("""()=>{const a=__app,r=a.renderer,t=a.pipeline.hdrTarget;
          const gate=__game.portals[1].disc, T=a.ctx.THREE;
          const c=gate.localToWorld(new T.Vector3(0,1.65,0)).project(a.camera);
          const x=Math.round((c.x*.5+.5)*t.width)-4,y=Math.round((c.y*.5+.5)*t.height)-4;
          if(x<0||y<0||x+8>=t.width||y+8>=t.height)throw Error('portal sample outside view');
          const read=()=>{a.step(0); const pixels=new Uint16Array(8*8*4);
            r.readRenderTargetPixels(t,x,y,8,8,pixels);return pixels};
          const before=read();a.ctx.ocean.mesh.visible=false;let after;
          try{after=read()}finally{a.ctx.ocean.mesh.visible=true}
          if(!before.some(v=>v))throw Error('empty HDR read');
          return Math.max(...before.map((v,i)=>Math.abs(v-after[i])))}""")
        assert stats['gateOceanToggleMaxDelta'] <= 2, stats['gateOceanToggleMaxDelta']
    shot('sea', [5, 1.5, -59], [7, -.20, -69])
    shot('surface-detail', [13,2.8,-59], [15,-.38,-66])
    shot('sand', [4,-2,-57], [6,-4,-49])
    if stage == 'after':
        # With a frozen camera/time, isolate projected caustic light from the sand albedo.
        stats['causticsMeanLinearGain'] = page.evaluate("""()=>{const a=__app,T=a.ctx.THREE,o=a.ctx.ocean;
          const original=o.causticsMap, black=new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);
          black.needsUpdate=true;
          const read=()=>{a.step(0);const t=a.pipeline.postHook.litHdrRT,buf=new Uint16Array(64*64*4);
            a.renderer.readRenderTargetPixels(t,Math.floor(t.width/2)-32,Math.floor(t.height/4)-32,64,64,buf);
            let energy=0;for(let i=0;i<buf.length;i+=4)energy+=T.DataUtils.fromHalfFloat(buf[i+1]);
            return energy/(64*64)};
          const lit=read();try{o.causticsMap=black;return lit-read()}
          finally{o.causticsMap=original;black.dispose();a.step(0)}}""")
        assert stats['causticsMeanLinearGain'] > .0001, stats
    shot('underwater', [5,-3.2,-68], [9,-4.8,-80])
    shot('waterline', [5,page.evaluate('__app.ctx.ocean.sampleWave(5,-59).height-.38'),-59], [5,-.38,-73])
    for mode in ['clear','cloudy','rain','snow','mist','rainbow','auto']:
        weather(mode)
        if mode in ('clear','cloudy','rain'):
            shot('sky-'+mode, [6, .8, -62], [9, 5.4, -80])
        else:
            page.evaluate('step()')
        stats[mode] = page.evaluate("""()=>({front:__app.director.target,
            amount:__app.pipeline.cloudHook.mat.uniforms.uCloudAmount.value,wind:__app.director.weather.wind})""")
    if stage == 'after':
        assert stats['clear']['amount'] < stats['cloudy']['amount'] <= stats['rain']['amount']
        weather('clear')
        for preset in ['low','high','ultra']:
            page.evaluate("q=>__graphics.set(q)", preset)
            if preset == 'ultra':
                shot('ultra-sky', [6,.8,-62], [9,5.4,-80])
                shot('ultra-seabed', [5,-3.8,-70], [7,-6,-67])
            else:
                page.evaluate('step()')
        page.set_viewport_size({'width':390,'height':844})
        page.evaluate('step()')
        hud_mask.evaluate("style=>style.remove()")
        page.locator('[data-voyage=help]').tap()
        assert page.evaluate('__ocean.controls.helpOpen')
        page.locator('.voyage-guide button').tap()
        assert not page.evaluate('__ocean.controls.helpOpen')
        page.keyboard.press('Escape')
        page.evaluate('step()')
        page.locator('[data-act=resume]').filter(has_text='继续游玩').tap()
        page.evaluate('step()')
        assert page.evaluate('__game.state==="play"')
        stats['portraitResume'] = True
    stats['errors'] = errors
    (out / f'{prefix}-{stage}.json').write_text(json.dumps(stats, ensure_ascii=False, indent=2),encoding='utf8')
    print(stats, flush=True)
    assert not errors, errors
    browser.close()
    server.shutdown()
