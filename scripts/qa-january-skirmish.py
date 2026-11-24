"""Drive native movement and clone cannon in a separate headless browser."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:5237')
parser.add_argument('--day', choices=['0101','0114','0131','all'], default='all')
parser.add_argument('--practice',action='store_true')
args = parser.parse_args()
evidence = Path(__file__).resolve().parents[1] / 'qa' / 'evidence'
driver = """() => {
  const a=__slime, l=__level;
  const key=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  const tap=code=>{key(code,true);key(code,false)};
  const frame=()=>new Promise(r=>requestAnimationFrame(r));
  window.walk=async(x,z)=>{
    const began=performance.now();
    key('KeyW',true);key('ShiftLeft',true);
    try {
      while(Math.hypot(x-a.position[0],z-a.position[2])>.27){
        if(performance.now()-began>45000)throw Error('walk stalled '+JSON.stringify([a.position,[x,z],a.world.support(...[a.position[0],a.position[2],a.position[1]]),l.phase]));
        a.yaw=Math.atan2(a.position[0]-x,a.position[2]-z);await frame();
      }
    } finally {key('KeyW',false);key('ShiftLeft',false);}
  };
  window.fight=async(idx)=>{
    const began=performance.now();let last=-4,tries=0;
    tap('KeyQ');
    while(!l.done.has(idx)){
      if(performance.now()-began>50000)throw Error('shoot stalled '+JSON.stringify([idx,a.position,a.combat.targets.map(t=>t.health),a.aimReady,l.phase,a.latest?.shots]));
      if(a.elapsed-last>.56){
        if((a.latest?.shots.length??0)>=4)tap('KeyX');
        else{tap('KeyG');tries++;}
        last=a.elapsed;
      }
      await frame();
    }
    return tries;
  };
}"""
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    for day in (['0101','0114','0131'] if args.day=='all' else [args.day]):
        context = browser.new_context(viewport={'width':832,'height':520})
        context.route_web_socket('**/*',lambda socket: None)
        context.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
            if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'low'}))""")
        page = context.new_page()
        errors = []
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.set_default_timeout(70000)
        url=args.base+'/level.html?id='+day+'-skirmish'+('&practice=review-2' if args.practice else '')
        page.goto(url)
        page.wait_for_function('window.__slime?.ready&&window.__slime.latest.count>0')
        full_frame_calls=page.evaluate("""()=>{const s=__level.stage,r=s.renderer;
          r.info.autoReset=false;r.info.reset();r.shadowMap.enabled=true;s.render(.03,__slime);
          const total=r.info.render.calls;r.info.autoReset=true;return total}""")
        assert full_frame_calls<=150,full_frame_calls
        build_module=page.evaluate(r"""()=>performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname)
          .find(s=>/january-skirmish[^/]*\.(js|ts)$/.test(s))""")
        page.evaluate('()=>{__slime.ctx.renderer.setPixelRatio(.42);__slime.ctx.renderer.shadowMap.enabled=false}')
        page.evaluate(driver)
        page.locator('[data-do=start]').click()
        page.wait_for_function('__slime.aiming')
        print('start',day,flush=True)
        def picture(suffix):
            if args.practice: return
            if suffix in ('play','finale'):
                page.evaluate('__level.stage.renderer.setPixelRatio(1)')
                page.wait_for_timeout(120)
            page.screenshot(path=evidence/f'january-skirmish-{day}-{suffix}.jpg',quality=89)
            page.evaluate('__level.stage.renderer.setPixelRatio(.42)')
        page.wait_for_function('__level.stage.time>1.3')
        picture('play')
        tries = [page.evaluate('fight(0)')]
        extent="""()=>{const f=__slime.latest;let lo=Infinity,hi=-Infinity;for(let i=0;i<f.count;i++)if(f.slots[i]===0){const y=f.positions[i*3+1];lo=Math.min(lo,y);hi=Math.max(hi,y)}return hi-lo}"""
        initial = page.wait_for_function("()=>{const v=("+extent+")();return v>0&&v}").json_value()
        page.keyboard.down('c')
        page.wait_for_function('__slime.latest.spread>.72')
        after_spread=page.wait_for_function("()=>{const v=("+extent+")();return __slime.latest.spread>.72&&v>0&&v}").json_value()
        assert initial>0 and after_spread>0 and abs(initial-after_spread)>.035,(initial,after_spread)
        page.keyboard.up('c')
        page.keyboard.press('Space')
        page.wait_for_function('!__slime.grounded || __slime.position[1]>.15')
        width, depth = page.evaluate('[__level.course.tiles[0].width,__level.course.tiles[0].depth]')
        def walk(x,z): page.evaluate('([x,z])=>walk(x,z)',[x,z])
        walk(-width,1.5*depth)
        walk(-width,.35*depth)
        page.wait_for_function('__level.lanes.has(-1)')
        page.locator('[data-do=latch]').click()
        page.wait_for_function('__level.pinned',timeout=25000)
        tries.append(page.evaluate('fight(1)'))
        tries.append(page.evaluate('fight(2)'))
        walk(-width,-1.35*depth)
        tries.append(page.evaluate('fight(3)'))
        print('hit',day,tries,flush=True)
        walk(-width,-1.52*depth)
        walk(width,-1.52*depth)
        walk(width,-.55*depth)
        page.wait_for_function('__level.lanes.size===2')
        walk(width,-1.52*depth)
        walk(0,-1.55*depth)
        page.locator('[data-do=use]').click()
        page.wait_for_function('__level.phase==="finale"')
        if day=='0131':
            page.wait_for_function("""()=>{let lit=false;__level.stage.scene.traverse(o=>{
              if(o.material?.isMeshBasicMaterial&&o.material.color?.getHexString()==='c75147')lit=true});return lit}""")
        picture('finale')
        page.wait_for_selector('.mode-keepsake[open]')
        reports=page.evaluate("""()=>({key:__level.spec.saveId,body:[__slime.latest.count,__slime.latest.particleCount],workerErrors:__slime.workerErrors,records:JSON.parse(localStorage.getItem('slimefable.web.save.v1')).life.records,souvenirs:JSON.parse(localStorage.getItem('slimefable.web.save.v1')).souvenirs})""")
        record=reports['key']+('-practice' if args.practice else '-daily')
        assert (reports['key'] in reports['souvenirs']) != args.practice
        assert reports['records'][record+'-wins']==1 and reports['records'][record+'-routes']==1
        assert not reports['workerErrors'] and not errors
        for name,eye in [('wide',[8,9,12]),('seam',[-3.4,1.2,4.8])]:
            page.evaluate("""eye=>{let s=__level.stage;s.renderer.setAnimationLoop(null);document.querySelector('.mode-keepsake').style.visibility='hidden';s.camera.position.fromArray(eye);s.camera.lookAt(-1.5,.6,-2);s.renderer.setPixelRatio(.85);s.render(.02,__slime)}""",eye)
            picture(name)
        page.evaluate("document.querySelector('.mode-keepsake').style.visibility=''")
        page.locator('[data-mode-home]').click()
        page.wait_for_url('**/?date='+day+'&from='+day+'-skirmish')
        returned=page.url
        page.goto(url)
        page.wait_for_function('window.__slime?.ready')
        assert page.evaluate('__level.done.size===0 && __level.phase==="intro"')
        assert page.evaluate('k=>JSON.parse(localStorage.getItem("slimefable.web.save.v1")).life.records[k]',record+'-wins')==1
        collision=page.evaluate("""()=>{const {course:c}=__level,w=__slime.world,errors=[];let probes=0;
          for(const t of c.tiles)for(const z of [t.z-t.depth/2+.16,t.z,t.z+t.depth/2-.16]){
            const expected=t.far+(t.near-t.far)*(z-t.z+t.depth/2)/t.depth;
            const h=w.support(t.x,z,expected+.20);probes++;
            if(h===null||Math.abs(h-expected)>.12)errors.push([t.x,z,h,expected]);
          }return {probes,errors}}""")
        assert not collision['errors'],collision
        print('PASS',day,initial,after_spread,flush=True)
        result='practice' if args.practice else 'result'
        (evidence/f'january-skirmish-{day}-{result}.json').write_text(json.dumps({'day':day,'base':args.base,'module':build_module,'introFrameDrawCalls':full_frame_calls,'nativeShots':tries,'heightBeforeSpread':initial,'heightDuringSpread':after_spread,'saveId':reports['key'],'returnPath':returned,'bakedFloorProbes':collision['probes'],'bothRoutes':True,'reentry':True,'workerErrors':reports['workerErrors']},ensure_ascii=False,indent=2),encoding='utf8')
        context.close()
    browser.close()
