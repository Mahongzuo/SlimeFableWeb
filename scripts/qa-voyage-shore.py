"""Exercise coastal boarding, carried jelly, pointer ownership and shore effects on the built game."""
from contextlib import contextmanager
import functools
import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / 'qa/evidence'


class Quiet(http.server.SimpleHTTPRequestHandler):
    # Chrome cancels pending assets when the test closes its isolated page.
    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def log_message(self, *args):
        pass


@contextmanager
def serve_game():
    with http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root / 'dist'))) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield server
        finally:
            server.shutdown()
            thread.join()


with serve_game() as server, sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    page = browser.new_page(viewport={'width': 900, 'height': 580}, has_touch=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text[:500]) if m.type == 'error' and '404' not in m.text else None)
    page.add_init_script("""let owner=null;
      Object.defineProperty(document,'pointerLockElement',{get:()=>owner});
      const notify=()=>setTimeout(()=>document.dispatchEvent(new Event('pointerlockchange')),0);
      Element.prototype.requestPointerLock=function(){owner=this;notify();return Promise.resolve()};
      document.exitPointerLock=()=>{owner=null;notify()};
      localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'medium',homeWeather:'clear',homeClockMinute:730}));""")
    page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='domcontentloaded')
    page.wait_for_function('window.__slime?.ready && __game.state==="play" && __app.pipeline.time>1', timeout=180000)
    page.evaluate("""()=>{window.s=__slime;window.o=__ocean;window.a=__app;
      a.renderer.setAnimationLoop(null); __homeCalib.setInstantExposure(true);
      window.t=a.pipeline.time; window.tick=()=>__game.update(t+=.033,.033);
      window.locked=()=>document.pointerLockElement===a.renderer.domElement;
      window.local=(x,y,z)=>o.boatGroup.localToWorld(o.seat.clone().set(x,y,z)).toArray();
      window.go=(x,y,z)=>s.teleport(local(x,y,z));
      window.shoot=(pos,target)=>{window.shotPose=[pos,target];a.step(.016)};
      a.ctx.onUpdate(()=>{if(window.shotPose){a.camera.position.fromArray(shotPose[0]);a.camera.lookAt(...shotPose[1]);a.camera.updateMatrixWorld()}});
      __game.save.data.life.sailing={flag:4205,waters:307,reserve:0,run:null};
      s.teleport([-11.1,s.world.support(-11.1,8),8]);tick()}""")

    def check(expr):
        assert page.evaluate(expr), expr

    def shot(name):
        page.screenshot(path=out / f'free-deck-{name}.jpg', quality=89)

    page.locator('[data-voyage=launch]').click()
    page.evaluate('tick()')
    for w, h in [(900, 580), (390, 844)]:
        page.set_viewport_size({'width': w, 'height': h})
        page.keyboard.down('Alt')
        check('!locked() && s.mode==="play"')
        check("""()=>{const yaw=s.yaw;document.dispatchEvent(new MouseEvent('mousemove',{movementX:40}));return s.yaw===yaw}""")
        page.keyboard.press('F1')
        page.keyboard.up('Alt')
        check('o.controls.helpOpen && !locked()')
        page.locator('.voyage-guide button').scroll_into_view_if_needed()
        page.locator('.voyage-guide button').click()
        page.wait_for_function('locked()')
        page.keyboard.down('Alt')
        page.keyboard.up('Alt')
        page.wait_for_function('locked()')
        check("""()=>{const yaw=s.yaw;document.dispatchEvent(new MouseEvent('mousemove',{movementX:40}));return s.yaw<yaw && s.mode==='play'}""")
    page.set_viewport_size({'width': 900, 'height': 580})

    check('o.mode==="deck" && !o.nearHelm()')
    page.keyboard.press('f')
    check('o.mode==="deck"')
    page.evaluate('s.yaw=o.boatYaw;window.startX=o.run.x;window.startZ=o.run.z')
    page.keyboard.down('s')
    page.evaluate('for(let i=0;i<46;i++)tick()')
    page.keyboard.up('s')
    check('o.mode==="deck" && o.deckFoot.z>3 && o.boatSpeed===0')
    page.evaluate("""async()=>{for(let i=0;i<20;i++){tick();await new Promise(r=>setTimeout(r,12))}
      shoot(local(-4.9,4.8,6.6),local(0,1.25,1.0))}""")
    shot('walk')
    page.evaluate('window.shotPose=null')
    page.keyboard.down('w')
    page.evaluate('for(let i=0;i<70 && !o.nearHelm();i++)tick()')
    page.keyboard.up('w')
    check('o.nearHelm() && o.boatSpeed===0 && o.run.x===startX && o.run.z===startZ')
    page.evaluate('a.step(.016)')
    shot('approach')
    page.keyboard.press('f')
    check('o.mode==="boat"')

    # Sample the presented body against the transformed seat while the real worker returns asynchronous meshes.
    page.evaluate("""()=>{Object.assign(o.run,{x:4,z:-180,yaw:Math.PI});
      s.teleport([4,1,-180]);tick()}""")
    page.keyboard.down('w')
    motion = page.evaluate("""async()=>{const result={maxSpeed:0,maxBodyDrift:0,samples:0,firstSecond:0};
      for(let i=0;i<254;i++){
        if(i===205)o.keys.add('KeyD');if(i===218)o.keys.delete('KeyD');
        tick();await new Promise(r=>setTimeout(r,10));
        result.maxSpeed=Math.max(result.maxSpeed,o.boatSpeed);
        if(i===29)result.firstSecond=o.boatSpeed;
        if(i<185||!s.frameAnchor||!s.latest.count)continue;
        const p=local(.05,1.29,-2.68),c=s.latest.centers[0],off=s.surfaceOffset();
        result.maxBodyDrift=Math.max(result.maxBodyDrift,Math.hypot(c[0]+off[0]-p[0],c[2]+off[2]-p[2]));
        result.samples++;
      }
      return result}""")
    page.keyboard.up('w')
    print('motion', motion, flush=True)
    assert motion['samples'] >= 50 and motion['maxSpeed'] > 20 and motion['maxBodyDrift'] < .16, motion
    page.evaluate('a.step(.016)')
    shot('deck')
    assert 3 < motion['firstSecond'] < 3.4
    page.keyboard.press('f')
    page.evaluate('tick();window.departWheel=o.deckFoot.clone();window.driftStart=o.run.z')
    check('o.mode==="deck" && o.boatSpeed>20')
    page.keyboard.down('d')
    page.evaluate('for(let i=0;i<12;i++)tick()')
    page.keyboard.up('d')
    check('o.deckFoot.distanceTo(departWheel)>.5 && o.run.z!==driftStart')
    coast = page.evaluate("""()=>{let time=0;
      while(o.boatSpeed && time<8){tick();time+=.033}
      const p=local(o.deckFoot.x,o.deckFoot.y,o.deckFoot.z);
      return {time,stopped:o.boatSpeed===0,footError:Math.hypot(...p.map((v,i)=>v-s.position[i]))}}""")
    assert coast['stopped'] and 4 < coast['time'] < 6 and coast['footError'] < .001, coast
    # Walk to the rail and hold against it, then return to the wheel and take it by touch.
    page.evaluate("s.yaw=o.boatYaw;o.keys.add('KeyA');for(let i=0;i<85;i++)tick();o.keys.delete('KeyA')")
    check('o.mode==="deck" && o.deckFoot.x < -.6 && o.deckFoot.x > -1.6')
    page.evaluate("o.keys.add('KeyD');for(let i=0;i<14;i++)tick();o.keys.delete('KeyD')")
    page.set_viewport_size({'width':390,'height':844})
    page.locator('[data-voyage=helm]').tap()
    check('o.mode==="boat"')
    page.evaluate('tick()')
    page.locator('[data-voyage=helm]').tap()
    check('o.mode==="deck"')
    page.set_viewport_size({'width':900,'height':580})
    page.evaluate('tick()')
    page.locator('[data-voyage=leave]').click()
    page.evaluate("""()=>{o.run.yaw=o.boatYaw=0;tick();go(-1.1,-.16,1.7);s.swimming=true;tick()}""")
    check('o.mode==="idle" && o.boatGroup.worldToLocal(o.seat.clone().fromArray(s.position)).x < -1.3')
    page.evaluate("o.startDiving(false);go(0,-2,0);tick()")
    under_keel = page.evaluate("""()=>{const p=o.boatGroup.worldToLocal(o.seat.clone().fromArray(s.position));
      return {mode:o.mode, x:p.x, y:p.y, z:p.z}}""")
    assert under_keel['mode']=='diving' and abs(under_keel['x'])<.1 and under_keel['y'] < -1.5, under_keel
    page.evaluate('o.exitDiving(false);go(-2.6,-.12,0);s.yaw=-Math.PI/2;tick()')
    page.keyboard.down('w')
    page.evaluate('for(let i=0;i<48 && o.mode==="idle";i++)tick()')
    page.keyboard.up('w')
    check('o.mode==="deck" && s.onDeck && !!s.ridePlane')

    page.evaluate("""async()=>{const b=o.berth();Object.assign(o.run,{...b,yaw:0});o.boatYaw=0;tick();
      o.leaveBoat();window.shoreZ=b.z;
      while(shoreZ<b.z+90 && o.bed(b.x,shoreZ)<.08)shoreZ+=.25;
      s.teleport([b.x,s.world.support(b.x,shoreZ,Infinity,true)+.04,shoreZ]);tick();
      o.sea.fishClock=0;for(let i=0;i<15;i++)tick();
      for(let i=0;i<44;i++){tick();await new Promise(r=>setTimeout(r,15))}
      window.berth=b;shoot([b.x+2.2,s.position[1]+1.5,shoreZ+3.0],[b.x,.35,shoreZ-.7])}""")
    page.wait_for_timeout(1700)
    check("o.run && !document.body.classList.contains('sailing-voyage') && o.controls.el.hidden && !o.sea.fish.some(f=>f.visible) && !o.sea.leaps.length")
    shot('ashore')
    page.evaluate('window.shotPose=null;go(-2.5,-.13,0);s.swimming=true;tick()')
    check('!o.controls.el.hidden && !document.querySelector("[data-voyage=board]").hidden')
    page.locator('[data-voyage=board]').tap()
    page.evaluate('tick()')
    check('o.mode==="deck"')
    # Sweep the school across the real coastline and inspect the full length of every accepted arc.
    # Also verify the identical ambient system still creates jumps in clear water.
    fish = page.evaluate("""()=>{const sea=o.sea, wave=(x,z)=>o.waveHeightAt(x,z);
      const sample=(x,z,yaw)=>{sea.fishClock=0;sea.update(t,.3,x,z,yaw,wave,true,null);
        return sea.leaps.map(f=>({x:f.x,z:f.z,dx:f.dx,dz:f.dz}))};
      const dry=sample(berth.x,shoreZ+3,0).length,wet=sample(4,-180,0).length;
      let checked=0;
      for(let z=berth.z;z<=shoreZ;z+=.5)for(const f of sample(berth.x,z,0)){
        for(let j=0;j<=30;j++)if(o.openWaterDepth(f.x+f.dx*j/30,f.z+f.dz*j/30)<1.14)throw Error('fish crossed shore');
        checked++;
      }
      return {dry,wet,checked}}""")
    print('fish', fish, flush=True)
    assert fish['dry'] == 0 and fish['wet'] == 3, fish
    island = page.evaluate("""()=>{o.leaveBoat();o.syncSea(5,-580);
      const island=[...o.islands.tiles.values()].map(t=>t.island).find(i=>o.bed(i.x,i.z)>.1);
      if(!island)throw Error('missing fixed-seed island');
      o.syncSea(island.x,island.z);
      s.teleport([island.x,o.bed(island.x,island.z)+.03,island.z]);tick();
      o.sea.fishClock=0;tick();
      return {x:island.x,z:island.z,player:s.position,mode:o.mode,hidden:o.controls.el.hidden,leaps:o.sea.leaps.length}}""")
    assert island['hidden'] and not island['leaps'] and abs(island['player'][0] - island['x']) < .1, island
    check('s.workerErrors.length===0')
    assert not errors, errors
    (out / 'free-deck-checks.json').write_text(json.dumps({'motion': motion, 'coast': coast, 'fish': fish, 'island': island, 'errors': errors}, indent=2), encoding='utf8')
    browser.close()
