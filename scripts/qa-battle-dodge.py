"""Drive the live October encounters using isolated Chromium input and animation frames."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
args=parser.parse_args()

drive=r"""async ([direction,at,kind])=>{
 const a=__slime,l=__level,read=()=>l.encounter,frame=()=>new Promise(r=>requestAnimationFrame(r));
 const key=(code,type)=>dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
 a.skills.energy=30; // Make the +14 visible at the normal energy ceiling.
 let did=false;
 for(let n=0;n<1000;n++){
  await frame();const e=read();
  if(!did&&e.swing===1&&e.clock-e.attackStart>=at){
   did=true;
   if(direction)key(direction,'keydown');
   if(kind==='dash')a.ctx.renderer.domElement.dispatchEvent(new MouseEvent('mousedown',{button:2,buttons:2,bubbles:true}));
   if(kind==='dash'&&direction)key(direction,'keyup');
  }
  if(e.lastContact||e.swing>1||l.move==='recover'&&e.swing===1){
   if(direction)key(direction,'keyup');
   return {result:e.lastContact,age:e.contactTime-e.started,impact:e.contactTime-e.attackStart,
    life:l.life,energy:a.skills.energy,perfect:e.perfectCount,at:e.started-e.attackStart,position:a.position};
  }
 }
 throw Error('no swing');
}"""
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':800,'height':530})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
    def launch(mode='rpg'):
        page.goto(args.base+'/level.html?id=1021-'+mode)
        page.wait_for_function('window.__slime?.ready')
        page.evaluate("()=>{const r=__slime.ctx.renderer;r.setPixelRatio(.72);r.shadowMap.enabled=false;}")
        page.locator('[data-primary]').click()
        page.wait_for_function("__level.phase==='play'")
        if mode=='skirmish': page.keyboard.press('f')
    def attempt(direction,at,kind):
        launch()
        return page.evaluate(drive,[direction,at,kind])
    baseline=attempt('',3,'none');print('standing',baseline,flush=True)
    assert baseline['result']=='hit' and baseline['life']==78
    walk=attempt('KeyD',0,'walk');print('walking',walk,flush=True)
    assert walk['result']=='' and walk['life']==100 and walk['perfect']==0
    # Move into the sweep. Moving away far enough should simply evade the swing.
    for expected,offsets in [('evaded',[.25,.26,.22,.28]),('perfect',[.09,.12,.14,.08])]:
        for direction in ['KeyA','KeyD','KeyW','']:
            found=False
            for offset in offsets:
                data=attempt(direction,baseline['impact']-offset,'dash')
                print(direction,offset,data,flush=True)
                if data['result']==expected:
                    found=True;break
            if found:break
        assert found,expected
        assert data['life']==100
        if expected=='perfect':
            assert data['perfect']==1 and data['energy']>=44
            page.wait_for_function('__level.encounter.echoIndex===4')
            page.screenshot(path=root/'qa/evidence/1021-perfect-dodge.jpg',quality=90)
            result=page.evaluate("""()=>{const a=__slime,e=__level.encounter;
               a.castSkill('R');return {damage:__level.encounter.lastDamage,used:__level.encounter.rewardUntil<e.clock};}""")
            print('counter',result,flush=True);assert result['used'] and result['damage']>0
    page.keyboard.press('Escape')
    page.wait_for_function("__level.phase==='pause'&&document.querySelector('.slime-hud').hidden")
    for reduced in [False,True]:
        page.emulate_media(reduced_motion='reduce' if reduced else 'no-preference')
        launch('skirmish')
        outcome=page.evaluate("""async()=>{const a=__slime,l=__level;
            let did=false,previous=0,delta=0,outline=false;
            a.skills.energy=0;
            for(let n=0;n<900;n++){
                await new Promise(r=>requestAnimationFrame(r));
                const e=l.encounter,p=a.position;
                if(e.perfectCount){
                   delta=a.skills.energy-previous;
                   outline=!!a.ctx.scene.getObjectByName('dodge-outline-fx');
                   return {delta,outline,life:l.life,age:e.contactTime-e.started};
                }
                previous=a.skills.energy;
                if(e.bolt&&!did&&Math.hypot(e.bolt[0]-p[0],e.bolt[1]-p[1]-.28,e.bolt[2]-p[2])<=1.28){
                    const key=(c,t)=>dispatchEvent(new KeyboardEvent(t,{code:c,bubbles:true,cancelable:true}));
                    key('KeyW','keydown');a.ctx.renderer.domElement.dispatchEvent(new MouseEvent('mousedown',{button:2,buttons:2,bubbles:true}));key('KeyW','keyup');did=true;
                }
                if(did&&e.lastContact)return {failed:e,life:l.life};
            }
            throw Error('no incoming bolt');
        }""")
        print('projectile dodge',reduced,outcome,flush=True)
        assert outcome['life']==100 and 14<=outcome['delta']<=14.26 and outcome['outline']==reduced
        if reduced: assert not page.evaluate("!!__slime.ctx.scene.getObjectByName('fluid-afterimage-fx')")
    assert not errors,errors
    browser.close()

