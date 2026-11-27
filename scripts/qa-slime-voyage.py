"""Headless production check. Isolated localStorage and travel fixtures; no desktop input."""
import argparse
import io
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa/evidence'
parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=5292)
args = parser.parse_args()

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome', headless=True,
        args=['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'])
    page = browser.new_page(viewport={'width': 1160, 'height': 760}, has_touch=True)
    page.add_init_script("Element.prototype.requestPointerLock = () => Promise.resolve()")
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'favicon' not in m.text and '404' not in m.text else None)
    page.set_default_timeout(30000)
    page.add_init_script("""if(!localStorage.getItem('slimefable.web.save.v1')) localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,homeClockMinute:1020,homeWeather:'clear',quality:'medium'}))""")
    page.goto(f'http://127.0.0.1:{args.port}/')
    def boot():
        page.wait_for_function('window.__slime?.ready && window.__game.state==="play"', timeout=120000)
        page.evaluate("""() => {window.o=window.__ocean;window.s=window.__slime;window.g=window.__game;
        window.advance=(n,dt=.05)=>{for(let i=0;i<n;i++)o.update(o.lastWaveTime+dt,dt)};
        window.place=(x,z,yaw=0)=>{Object.assign(o.run,{x,z,yaw});o.boatYaw=yaw;o.boatSpeed=0;
          o.boatPos.set(x,-.38,z);s.yaw=yaw+Math.PI+.47;s.teleport([x,1,z]);advance(1)};
        window.__graphics.set('medium');window.__homeCalib.setInstantExposure(true);window.proofView=null;
        g.app.ctx.onUpdate(()=>{if(window.proofView){const [pos,target]=window.proofView,c=g.app.camera;
          c.position.fromArray(pos);c.lookAt(...target);c.updateMatrixWorld();}})}""")
    def button(id):
        return page.locator('[data-voyage="'+id+'"]')
    def check(expr):
        assert page.evaluate(expr), expr
    def shot(id):
        page.screenshot(path=OUT / ('slime-voyage-'+id+'.jpg'), type='jpeg', quality=86)
    boot()
    page.evaluate("""() => {g.app.director.setTime(1020);g.app.director.mode="clear";g.save.data.life.coins=18;
       g.save.data.life.sailing={flag:4205,waters:307,reserve:0,run:null};
       s.teleport([-11.1,s.world.support(-11.1,8),8]);advance(1)}""")
    button('buy').click()
    check('g.save.data.life.coins===12')
    button('launch').click()
    check('o.run.ammo===18 && o.mode==="boat"')
    page.wait_for_function('o.ship.crew.every(p=>p.group.children.length && p.group.children[0].isGroup)',timeout=45000)
    page.keyboard.down('w')
    page.evaluate('advance(24)')
    page.keyboard.down('a')
    page.evaluate('advance(9)')
    page.keyboard.up('a')
    page.wait_for_timeout(350)
    shot('helm')
    frames=[]
    page.keyboard.down('d')
    for i in range(5):
        page.evaluate('advance(3)')
        frames.append(Image.open(io.BytesIO(page.screenshot(type='jpeg',quality=78))).copy())
    frames[0].save(OUT/'slime-voyage-turn.webp',save_all=True,append_images=frames[1:],duration=160,loop=0)
    page.keyboard.up('w');page.keyboard.up('d')
    page.evaluate('advance(18)')
    shot('wake')
    # Take a close-up of the same mast after a crosswind turn. Keep the gameplay frames above.
    page.evaluate('''() => {const v=o.ship.flagRoot.getWorldPosition(o.seat.clone()),cam=window.__app.ctx.camera;
      const look=o.ship.flag.localToWorld(o.seat.clone().set(.85,-.48,0));
      const pos=o.ship.flag.localToWorld(o.seat.clone().set(1,.5,3.5));
      window.proofView=[pos.toArray(),look.toArray()]}''')
    page.wait_for_timeout(350);shot('flag');page.evaluate('window.proofView=null')
    check('g.app.ctx.ocean.material.uniforms.uWakeOn.value===1 && s.renderer.frame.count>0')
    # Render a genuine turn through the FFT pipeline, then compare the exact same camera and lighting.
    page.evaluate("""() => {
      const app=g.app;app.renderer.setAnimationLoop(null);
      place(65,-115,Math.PI);
      o.keys.add('KeyW');for(let i=0;i<32;i++)app.step(.05);
      o.keys.add('KeyA');for(let i=0;i<17;i++)app.step(.05);o.keys.delete('KeyA');
      for(let i=0;i<10;i++)app.step(.05);o.keys.delete('KeyW');
      const r=o.run;window.proofView=[[r.x+17,16,r.z+20],[r.x+5,.4,r.z+5]];
      app.step(0);
      const field=app.ctx.ocean.voyageWake;window.originalBind=field.bind.bind(field);
      window.foamStats=()=>{const t=field.targets[field.current],pixels=new Uint8Array(t.width*t.height*4);
        app.renderer.readRenderTargetPixels(t,0,0,t.width,t.height,pixels);
        let foam=0,bubbles=0,crests=0;for(let j=0;j<pixels.length;j+=4){
          foam+=pixels[j];bubbles+=pixels[j+1];crests+=pixels[j+2];}return {foam,bubbles,crests}};
    }""")
    active=page.evaluate('foamStats()')
    if min(active.values())<=2000:
        print(errors,page.evaluate('''()=>{const f=g.app.ctx.ocean.voyageWake;return {
        source:f.source.map(v=>v.toArray()),center:f.center.toArray(),valid:f.valid,run:o.run,
        size:f.targets[0].width,gl:g.app.renderer.getContext().getError()}}'''),flush=True)
    assert min(active.values())>2000, active
    shot('material-on')
    # Capture the turning arc from the beam, with the stern wash spreading across the frame.
    page.evaluate('window.savedProof=window.proofView;window.proofView=[[o.run.x+21,10,o.run.z-6],[o.run.x+2,.3,o.run.z+4]];g.app.step(0)')
    shot('broadside-water')
    page.evaluate('window.proofView=window.savedProof;g.app.step(0)')
    page.evaluate("""()=>{const f=g.app.ctx.ocean.voyageWake;f.bind=u=>{originalBind(u);u.uWakeOn.value=0};g.app.step(0)}""")
    shot('material-before')
    page.evaluate("""()=>{const f=g.app.ctx.ocean.voyageWake;f.bind=originalBind;o.boatSpeed=0;
      for(let i=0;i<100;i++)g.app.step(.05)}""")
    faded=page.evaluate('foamStats()')
    assert faded['foam'] < active['foam'] and faded['bubbles'] > 0, (active,faded)
    shot('material-settled')
    # One continuous route: wind from astern, across the beam, into wind, then furl and drift.
    page.evaluate("""()=>{place(70,-135,Math.PI/2-.55);o.keys.add('KeyW');
      window.filmStep=n=>{for(let i=0;i<n;i++){
        const r=o.run;window.proofView=[[r.x+12,5.8,r.z-8],[r.x,2.2,r.z]];
        g.app.step(.05);}};filmStep(12)}""")
    film=[]
    for segment in range(4):
        if segment == 1:
            page.evaluate("o.keys.add('KeyD')")
        if segment == 3:
            page.evaluate("o.keys.delete('KeyD');o.keys.delete('KeyW')")
        for _ in range(4):
            page.evaluate('filmStep(7)')
            film.append(Image.open(io.BytesIO(page.screenshot(type='jpeg',quality=83))).copy())
    film[0].save(OUT/'slime-voyage-sailing.webp',save_all=True,append_images=film[1:],duration=350,loop=0)
    page.evaluate('window.proofView=null;g.app.run()')
    page.keyboard.press('F1')
    check('o.controls.helpOpen')
    page.locator('.voyage-guide').evaluate('e=>e.scrollTop=e.scrollHeight')
    page.keyboard.press('F1')
    # Travel fixture puts the ship one metre inside the real outer boundary. Input crosses it.
    for wave in range(2):
        page.evaluate('advance(36)')
        page.evaluate("""() => {const z=-o.run.threshold-39;let x=-20;
          while(o.bed(x,z)>-3||o.bed(x,z-8)>-3)x+=12;
          place(x,z,Math.PI);o.run.threshold=o.coast(x,z)+1;}""")
        page.keyboard.down('w')
        page.evaluate('advance(10)')
        page.keyboard.up('w')
        check('!!o.run.enemy')
        if wave == 0:
            shot('encounter')
        for j in range(4+wave):
            # Turn through the actual helm. Aim the port gun without changing enemy HP.
            page.evaluate("""() => {const r=o.run,e=r.enemy;
              const desired=Math.atan2(e.x-r.x,e.z-r.z)-Math.PI/2;
              const diff=Math.atan2(Math.sin(desired-r.yaw),Math.cos(desired-r.yaw));
              const k=diff>0?'KeyA':'KeyD';o.keys.add(k);
              o.updateBoatControl(r,Math.abs(diff)/1.08);o.keys.delete(k);}""")
            page.keyboard.press('q')
            print('broadside',wave,j,page.evaluate('[o.run?.ammo,o.run?.enemy?.hp,o.run?.reload,o.run?.enemy&&Math.hypot(o.run.x-o.run.enemy.x,o.run.z-o.run.enemy.z)]'),flush=True)
            if j<3+wave:
                page.evaluate('advance(36)')
        check('!o.run.enemy')
    check('o.run.ammo===9 && o.run.cargo===15')
    page.reload();boot()
    check('o.mode==="boat" && o.run.ammo===9 && o.run.cargo===15 && g.save.data.life.sailing.flag===4205')
    # Real island land / step into shallows / dive / ladder.
    island=page.evaluate("""() => {const tile=[...o.islands.tiles.values()].find(t=>t.island.kind!==2)||[...o.islands.tiles.values()][0];
      const i=tile.island;let x=i.x+i.r*2;
      while(x>i.x && o.bed(x,i.z)<-1.7)x-=.35;
      place(x+1,i.z,0);return {x:i.x,z:i.z,r:i.r}}""")
    page.evaluate('window.fishRandom=Math.random;Math.random=()=>.43')
    button('fish').tap()
    page.evaluate('Math.random=window.fishRandom')
    check('o.mode==="fishing"')
    page.evaluate("""() => {for(let i=0;i<800&&o.session.phase!=='bite';i++)o.updateBoatFishing(i*.05,.05)}""")
    button('hook').tap()
    check('o.session.phase==="reel"')
    page.evaluate("""() => {for(let i=0;i<2200 && o.session && !o.fishCloseIn;i++){
      const f=o.session;o.reelHeld=5*(f.fishPos-f.barPos-f.barSize*.5)+f.fishVel>f.barVel;o.updateBoatFishing(i*.035,.035);}}""")
    check("Object.keys(g.save.data.life.bag).some(k=>k.startsWith('fish-'))")
    if button('cancel').is_visible():
        button('cancel').click()
    button('dive').tap()
    check('s.submerged && o.mode==="diving"')
    page.keyboard.down('Space');page.wait_for_function('o.mode==="idle"',timeout=25000);page.keyboard.up('Space')
    button('board').tap()
    check('o.mode==="boat"')
    button('leave').tap()
    # Walk ashore under the normal character solver, from the boat's seaward edge.
    page.evaluate('s.yaw=Math.PI/2')
    page.keyboard.down('w')
    page.wait_for_function('s.world.terrain(s.position[0],s.position[2])>0.1',timeout=60000)
    page.keyboard.up('w');shot('shore-low')
    page.evaluate('''() => {const [x,y,z]=s.position;window.proofView=[[x+32,24,z+30],[x,y,z]]}''')
    page.wait_for_timeout(350);shot('shore-high');page.evaluate('window.proofView=null')
    page.evaluate('s.teleport([o.run.x,o.waveHeightAt(o.run.x,o.run.z),o.run.z]);advance(1)')
    button('board').tap()
    page.set_viewport_size({'width':412,'height':850})
    button('help').tap()
    page.locator('.voyage-guide').evaluate('e=>e.scrollTop=e.scrollHeight')
    page.locator('.voyage-guide button').tap()
    check('!o.controls.helpOpen && o.run.cargo===15')
    # Touch-only press / release remains attached to the same control across HUD updates.
    key=button('KeyW');box=key.bounding_box()
    cdp=page.context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+10,'y':box['y']+10}]})
    check("o.keys.has('KeyW')")
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    check("!o.keys.has('KeyW')")
    shot('portrait')
    page.wait_for_function('o.run.reload[0]===0');button('port').tap();check('o.run.ammo===8')
    button('fish').tap();check('o.mode==="fishing"');button('cancel').tap()
    button('dive').tap();check('o.mode==="diving"')
    page.evaluate('s.position[1]=o.waveHeightAt(s.position[0],s.position[2])-.3;advance(1)')
    button('surface').tap();check('o.mode==="boat"')
    page.evaluate('()=>{const p=o.berth();place(p.x,p.z,Math.PI)}')
    button('land').tap()
    check('!o.run && g.save.data.life.coins===27 && !s.inputLock')
    button('launch').tap()
    check('o.run.ammo===18')
    # Expended-ammunition fixture. The ship must actually sail out of engagement range.
    page.evaluate("""()=>{let x=10;const z=-850;
      while([0,15,30,45,60,75,90,105,120,135,150].some(d=>o.bed(x,z-d)>-3))x+=16;
      place(x,z,Math.PI);o.run.threshold=300;o.run.ammo=0;advance(1)}""")
    check('!!o.run.enemy')
    page.keyboard.down('w')
    page.evaluate('for(let i=0;i<450&&o.run.enemy;i++)advance(1)')
    page.keyboard.up('w')
    check('!o.run.enemy && o.run.ammo===0 && o.run.cargo===0')
    page.evaluate("""() => {place(o.run.x,o.run.z-1700);o.run.threshold=o.coast(o.run.x,o.run.z);advance(1);o.run.hp=1;
       Object.assign(o.run.enemy,{aim:{x:o.run.x,z:o.run.z,remaining:.01}});advance(1);}""")
    check("!o.run && Object.keys(g.save.data.life.bag).some(k=>k.startsWith('fish-')) && g.save.data.life.coins===27")
    assert not errors, errors
    print(json.dumps({'waves':2,'payout':15,'reload':True,'island':island,'touch':True,'escapedEmpty':True,'wakeActive':active,'wakeSettled':faded,'errors':errors}))
    browser.close()
