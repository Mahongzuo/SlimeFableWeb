"""Read the pop-up book using the normal movement keys in an isolated browser."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageStat

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:5190')
args = parser.parse_args()
out = Path(__file__).resolve().parents[1] / 'qa' / 'evidence'
save_key = 'slimefable.web.save.v1'
level_url = args.base + '/level.html?id=0101-1823'
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader'])
    ctx = browser.new_context(viewport={'width': 1050, 'height': 700})
    ctx.route_web_socket('**/*',lambda socket:None)
    ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
        if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
        JSON.stringify({v:1,quality:'low',completed:['0101-1864'],souvenirs:['0101-1864','0101-shot']}));""")
    page = ctx.new_page()
    page.set_default_timeout(70000)
    errors = []
    proof = {}
    page.on('pageerror',lambda exc: errors.append(str(exc)))

    def screenshot(name):
        path=out/f'jan01-book-{name}.jpg'
        page.screenshot(path=path,quality=89)
        with Image.open(path) as shot:
            w,h=shot.size
            assert max(ImageStat.Stat(shot.crop((w//4,h//3,3*w//4,2*h//3))).stddev)>9,name

    def walk(key,condition):
        page.keyboard.down(key)
        try:
            page.wait_for_function(condition, polling='raf',timeout=30000)
        except Exception:
            print('stuck',key,condition,page.evaluate('[__slime.position,__slime.grounded,__slime.cling?.normal,__level.game.diagnostics.run]'), flush=True)
            raise
        finally:
            page.keyboard.up(key)

    for route,practice in [('fold',False),('wind',False),('fold',True)]:
        page.goto(level_url+('&practice=fold-review' if practice else ''))
        page.wait_for_function('window.__slime?.ready && __slime.latest?.count > 100')
        page.wait_for_function('__level.stage.time>1.3')
        if route=='fold' and not practice:
            screenshot('entry')
            proof['drawCalls']=page.evaluate("""()=>{const s=__level.stage,r=s.renderer;
              r.info.autoReset=false;r.info.reset();s.render(.016,__slime);const calls=r.info.render.calls;
              r.info.autoReset=true;return calls}""")
            assert proof['drawCalls']<=150
            proof['surfaceProbes']=page.evaluate("""()=>{const s=__level.stage,g=__level.game.diagnostics.art.platforms,T=s.THREE;
              g.updateWorldMatrix(true,true);return [[0,0,5.4],[-2.2,1.8,-2.85],[.8,1,-8.2]].flatMap(p=>
                [[0,4,0],[.7,.8,.95]].map(offset=>{const pt=new T.Vector3(...p),eye=pt.clone().add(new T.Vector3(...offset));
                  const hits=new T.Raycaster(eye,pt.clone().sub(eye).normalize()).intersectObjects(g.children,false);
                  if(!hits.length||hits[0].point.distanceTo(pt)>.01)throw Error('纸面被遮挡 '+p);
                  if(new Set(hits.filter(h=>Math.abs(h.distance-hits[0].distance)<.0001).map(h=>h.object.uuid)).size!==1)throw Error('纸面重叠 '+p);
                  return hits[0].object.name;}))}""")
        page.locator('[data-start]').click()
        if route=='fold' and not practice:
            # Another tab can complete a challenge while the reader stays on this spread.
            page.evaluate("""k=>{const s=JSON.parse(localStorage.getItem(k));s.souvenirs.push('0101-trial');
              s.life.records['0101-trial-daily-wins']=2;localStorage.setItem(k,JSON.stringify(s));}""",save_key)
        if route=='wind':
            # Exercise the physical width of the cut leaves and the page-local retry.
            walk('d','__level.game.diagnostics.run.fallen===1')
        walk('w','__level.game.diagnostics.run.page===1 && __slime.position[2]<1.35')
        if route=='fold':
            walk('a','__slime.position[0]<-2.15')
            walk('w','__level.game.diagnostics.run.flowers===1')
            if not practice:screenshot('fold')
            walk('w','__level.game.diagnostics.run.page===2 && __slime.position[2]<-6.1')
            walk('d','__slime.position[0]>.68')
        else:
            walk('d','__slime.position[0]>2.08')
            walk('w','__slime.position[2]<-1.35')
            page.keyboard.down('w')
            for jumps in [1,2]:
                page.keyboard.press('Space')
                page.wait_for_function('n=>__slime.jumps===n && !__slime.grounded',arg=jumps,polling='raf')
                page.wait_for_function('__slime.velocity[1]<2.3',polling='raf')
            page.keyboard.press('Space')
            page.wait_for_function('__slime.umbrellaOpen',polling='raf')
            page.wait_for_function('__level.game.diagnostics.run.flowers===2',polling='raf')
            page.wait_for_function('__slime.position[2]<-6.05',polling='raf')
            page.keyboard.up('w')
            page.wait_for_function('__level.game.diagnostics.run.page===2')
            walk('a','__slime.position[0]<.9')
        walk('w','__slime.position[2]<-8')
        page.wait_for_function("__level.phase==='done'")
        if not practice:screenshot('final' if route=='fold' else 'second-impression')
        saved=page.evaluate('k=>JSON.parse(localStorage.getItem(k))',save_key)
        assert '0101-shot' in saved['souvenirs'] and '0101-1823' in saved['completed']
        assert '0101-trial' in saved['souvenirs'] and saved['life']['records']['0101-trial-daily-wins']==2
        prefix='0101-1823'+('-practice' if practice else '')
        assert saved['life']['records'][prefix+'-'+route+'-flower']==1
    assert saved['life']['records']['0101-1823-clean']==1
    assert saved['life']['records']['0101-1823-practice-clean']==1
    assert saved['homeDaily']['gates']==[2]
    page.set_viewport_size({'width':390,'height':844})
    page.goto(level_url)
    page.locator('[data-start]').click()
    page.wait_for_function('__level.stage.time>1.35')
    screenshot('mobile')
    assert page.evaluate('document.documentElement.scrollWidth===innerWidth')
    for name,eye in [('low',[3.9,1.5,3.7]),('wide',[8.5,11.8,13.9])]:
        page.set_viewport_size({'width':1000,'height':650})
        page.evaluate("""eye=>{const s=__level.stage;s.renderer.setAnimationLoop(()=>{
          s.camera.position.fromArray(eye);s.camera.lookAt(0,1,1.75);s.render(.016,__slime)});}""",eye)
        page.wait_for_timeout(150)
        screenshot(name)
    assert not errors,errors
    proof.update(routes=2,localRetry=True,practiceReplay=True,nativeVertices=page.evaluate('__slime.latest.count'),
                 records=saved['life']['records'],firstWin=saved['homeDaily']['gates'])
    (out/'jan01-book-result.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(proof,ensure_ascii=False))
    browser.close()
