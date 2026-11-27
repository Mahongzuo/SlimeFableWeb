"""Play the two Tampa routes with native walking, physical clones and a shared old save."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
args=parser.parse_args()
evidence=Path(__file__).resolve().parents[1]/'qa'/'evidence'
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
}"""

with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    ctx=browser.new_context(viewport={'width':960,'height':610})
    ctx.route_web_socket('**/*',lambda socket:None)
    ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
      if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'low',souvenirs:['0101-shot-ceres']}));""")
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_default_timeout(35000)
    def pic(name):
        page.evaluate('__level.stage.renderer.setPixelRatio(1)')
        page.wait_for_timeout(100)
        page.screenshot(path=evidence/('jan01-skirmish-'+name+'.jpg'),quality=88)
        page.evaluate('__level.stage.renderer.setPixelRatio(.53)')
    def walk(x,z):
        page.evaluate('v=>walk(...v)',[x,z])
    def shoot(i):
        page.keyboard.press('q');page.wait_for_timeout(100);page.keyboard.press('g')
        try: page.wait_for_function('i=>__level.done.has(i)',arg=i,timeout=6000)
        except Exception:
            state=page.evaluate('()=>[__level.flight,__slime.position,__slime.latest.shots,document.querySelector(".js-course aside").innerText]')
            raise RuntimeError(str([i,state]))
    measurements={}
    def measure():
        report=page.evaluate("""()=>{const s=__level.stage,r=s.renderer,info=r.info,old=info.autoReset;
          const objects=s.scene.children.filter(o=>o===s.scene.getObjectByName('tampa-benoist-flying-boat').parent
            || o.name==='course-walkable' || o.name==='tampa-floating-landing'
            || o.isMesh&&!o.name&&(o.geometry.type==='PlaneGeometry'||o.geometry.type==='BufferGeometry'));
          const previous=objects.map(o=>o.visible);
          const draw=()=>{info.reset();r.shadowMap.needsUpdate=true;s.render(.02,__slime);return info.render.calls};
          info.autoReset=false;const full=draw();
          objects.forEach(o=>o.visible=false);const base=draw();
          objects.forEach((o,i)=>o.visible=previous[i]);info.autoReset=old;
          return {total:full,added:full-base};
        }""")
        assert 0 < report['added'] <= 150,report
        return report
    for side,practice in [(-1,False),(1,False),(1,True)]:
        page.set_viewport_size({'width':440,'height':780} if practice else {'width':960,'height':610})
        page.goto(args.base+'/level.html?id=0101-skirmish'+('&practice=window' if practice else ''))
        page.wait_for_function('window.__slime?.latest?.count>0');page.evaluate(driver)
        if not practice and side<0:
            measurements['module']=page.evaluate(r"""performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname).find(p=>/january-skirmish[^/]*\.(js|ts)$/.test(p))""")
            seam=page.evaluate("""()=>{const {world:w}=__slime;const samples=[[-2.8,-2,0],[0,-2.66,.14],[2.8,-2.66,.30],[-2.8,2,0]];
                 return samples.map(([x,z,expected])=>Math.abs(w.support(x,z,expected+.2)-expected))}""")
            assert all(d<.14 for d in seam),seam
            page.wait_for_function('__level.stage.time>1.4');pic('entry')
            measurements['entry']=measure()
        page.locator('[data-do=start]').click()
        page.keyboard.down('c');page.wait_for_function('__slime.latest.spread>.55');page.keyboard.up('c')
        shoot(0)
        assert page.evaluate('__level.flight.locked.has(0)')
        page.keyboard.press('x');page.wait_for_function('__level.flight.recalled')
        walk(side*2.8,5.3);walk(side*2.8,1.25)
        page.wait_for_function('__level.flight.lastLane!==0')
        if practice:
            # Walk off the floating side and let the in-game checkpoint recover.
            walk(3.86,1.25);walk(4.72,1.25)
            page.wait_for_function('__slime.position[0]<3.2 && __slime.position[0]>2.4 && __slime.grounded')
            assert page.evaluate('__level.flight.verified.has(0)')
        if side<0:
            walk(-2.8,-1.4);shoot(1);walk(-2.8,-2.68);walk(.1,-2.68);shoot(2)
            walk(-2.8,-2.68);walk(-2.8,-4.8)
        else:
            walk(2.8,-.6);shoot(1);shoot(2);walk(2.8,-4.8)
        pic('portrait' if practice else 'play' if side<0 else 'upper')
        walk(0,-5.4);shoot(3);page.wait_for_function('__level.phase==="finale"')
        if side<0:
            measurements['departure']=measure()
            page.keyboard.down('w');page.wait_for_timeout(180);page.keyboard.up('w')
            page.wait_for_function('__level.stage.scene.getObjectByName("tampa-benoist-flying-boat").position.y>1.0')
            pic('departure')
        page.wait_for_selector('.mode-keepsake[open]')
        if side<0:
            for name,xyz in [('low',[-3.6,.6,2.2]),('wide',[9.6,9.2,13.8])]:
                page.evaluate("""p=>{const s=__level.stage;s.renderer.setAnimationLoop(null);document.querySelector('dialog').style.visibility='hidden';s.camera.position.fromArray(p);s.camera.lookAt(-1.2,.3,-3);s.render(.02,__slime)}""",xyz)
                pic(name)
            page.evaluate("document.querySelector('dialog').style.visibility=''")
        rec=page.evaluate("()=>JSON.parse(localStorage.getItem('slimefable.web.save.v1'))")
        key='0101-skirmish-tampa-flight'+('-practice' if practice else '-daily')
        assert rec['life']['records'][key+'-route-mask']==(2 if practice else 1 if side<0 else 3)
        assert '0101-shot-ceres' in rec['souvenirs']
        assert not page.evaluate('__slime.workerErrors') and not errors, errors
        page.locator('[data-mode-home]').click();page.wait_for_url('**/?date=0101&from=0101-skirmish')
        print(side,practice,flush=True)
    (evidence/'jan01-skirmish-result.json').write_text(json.dumps({'base':args.base,'render':measurements,'practiceAndDaily':rec['life']['records'],'localRetry':True,'seamSamples':seam,'errors':errors,'bothRoutes':True,'nativeSurfaceAndDeformation':True},ensure_ascii=False,indent=2),encoding='utf8')
    browser.close()
