"""Exercise the Jan 1 cash drawer using isolated browser input and old save data."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / 'qa' / 'evidence'
KEY = 'slimefable.web.save.v1'

def photograph(page, name):
    page.screenshot(path=OUT / ('jan01-match-' + name + '.jpg'), quality=88)

def main(base):
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        context=browser.new_context(viewport={'width':1050,'height':720},reduced_motion='reduce')
        context.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
          if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
          JSON.stringify({v:1,quality:'low',souvenirs:['0101-trial'],life:{records:{'0101-trial-imprint':3}}}));""")
        page=context.new_page()
        page.set_default_timeout(60000)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        for practice in [False,True]:
            if practice: page.set_viewport_size({'width':390,'height':844})
            page.goto(base+'/level.html?id=0101-match'+('&practice=drawer' if practice else ''))
            page.wait_for_function('window.__slime?.latest?.count>100 && __slime.ctx.time>1.4')
            page.evaluate("""()=>{window.drawerShapes=new Set();const sample=()=>{
              const radius=__slime.latest?.radii?.[0];if(radius)drawerShapes.add(radius.map(v=>v.toFixed(3)).join(','));
              if(__level.phase!=='finale')requestAnimationFrame(sample)};sample()}""")
            page.locator('[data-match-start]').click()
            coin=page.evaluate('__level.board.cells.indexOf(-2)')
            page.locator(f'[data-cell="{coin}"]').click()
            assert page.locator('.coin-landing').count()==1
            assert page.evaluate("""()=>{const g=document.querySelector('.ml-grid').getBoundingClientRect();
              const r=document.querySelector('.coin-rail').getBoundingClientRect();return g.top>=0&&g.left>=0&&r.bottom<=innerHeight&&g.right<=innerWidth}""")
            photograph(page,'portrait' if practice else 'drawer')
            page.locator(f'[data-cell="{coin}"]').click()
            if not practice:
                calls=page.evaluate("""()=>{const s=__slime.ctx,info=s.renderer.info,old=info.autoReset;
                  const pieces=['coin-counter','till-drawer-slides'].map(n=>s.scene.getObjectByName(n));
                  const draw=on=>{for(const p of pieces)p.visible=on;info.reset();s.render(0,__slime);return info.render.calls};
                  info.autoReset=false;const baseline=draw(false),full=draw(true);info.autoReset=old;return full-baseline}""")
                assert 0<calls<=150,calls
                print('drawer added calls',calls,flush=True)
                for label,eye in [('low',[3,1.85,3.65]),('far',[4.2,5.0,7])]:
                    page.evaluate("""eye=>{const s=__slime.ctx;window.originalRender=s.render;
                      s.render=function(dt,a){s.camera.position.fromArray(eye);s.camera.lookAt(0,1.65,-1.5);originalRender.call(s,dt,a)}}""",eye)
                    page.wait_for_timeout(230)
                    photograph(page,label)
                    page.evaluate('()=>{__slime.ctx.render=originalRender}')
            for _ in range(15):
                if page.evaluate('__level.board.stage===3'):break
                pair=page.evaluate('__level.hint()')
                if practice and page.evaluate('__level.board.stage===2'):
                    coin=page.evaluate('__level.board.cells.indexOf(-2)')
                    pair=[53,52] if coin==36 else [60,59] if coin==60 else pair
                for i in pair:page.locator(f'[data-cell="{i}"]').click()
                page.wait_for_function("['play','finale','lost'].includes(__level.phase)")
            assert page.evaluate('__level.phase==="finale"')
            assert page.evaluate('drawerShapes.size>1 && __slime.latest.count>100')
            page.wait_for_timeout(1200)
            if not practice:photograph(page,'finale')
            page.locator('[data-match-encore]').click()
            page.locator('[data-match-bank]').click()
            assert page.locator('.mode-fact').count()
            page.locator('[data-mode-home]').click()
            page.wait_for_url('**/?date=0101&from=0101-match',wait_until='commit')
            saved=page.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")
            suffix='practice' if practice else 'daily'
            record='0101-match-euro-cash-'+suffix
            assert saved['life']['records'][record+'-no-shuffle']==1
            assert saved['life']['records'][record+'-wins']==1
            assert saved['life']['records'][record+'-round']==1
            assert saved['life']['records'][record+'-score']>0
            assert saved['life']['records']['0101-trial-imprint']==3
        assert not errors,errors
        print('钱屉横竖屏、错列补救、冲分、正式和练习存档及回港通过。')
        browser.close()

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default='http://127.0.0.1:5190')
    main(parser.parse_args().base.rstrip('/'))
