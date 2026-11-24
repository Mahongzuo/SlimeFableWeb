"""Regression of the current two-sailor formation through the original upper route."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

DRIVER = r"""()=>{
  const actor=__slime,level=__level,canvas=actor.ctx.renderer.domElement;
  const key=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  const frame=()=>new Promise(r=>requestAnimationFrame(r));
  const telemetry=()=>({phase:level.phase,step:level.progress.step,hp:level.life,pos:actor.position,
    enemies:level.enemies.filter(e=>e.living).map(e=>[e.kind,e.target.health,e.target.position])});
  window.followDeck=async path=>{
    key('KeyW',true);key('ShiftLeft',true);
    try{for(const [x,z] of path){const start=performance.now();
      while(Math.hypot(x-actor.position[0],z-actor.position[2])>.22){
        if(level.phase!=='play'||performance.now()-start>25000)throw Error('route '+[x,z]+' '+JSON.stringify(telemetry()));
        actor.yaw=Math.atan2(actor.position[0]-x,actor.position[2]-z);await frame();
      }
    }}finally{key('KeyW',false);key('ShiftLeft',false);}
  };
  window.fleetShots=async index=>{
    const enemy=level.enemies[index],start=performance.now(),initial=enemy.target.health;
    let fired=0,previous=-3,recall=-1,lastDodge=-3;
    try{
      while(enemy.living){
        if(level.phase!=='play'||performance.now()-start>35000)throw Error('encounter '+index+' '+JSON.stringify(telemetry()));
        const t=level.encounter.clock,p=actor.position,e=enemy.target.position;
        const dx=e[0]-p[0],dz=e[2]-p[2],d=Math.hypot(dx,dz),shoulder=.45;
        const base=.24+.12*Math.max(0,Math.min(1,(actor.arm-1.2)/4));
        actor.yaw=Math.atan2(-dx,-dz)+Math.asin(Math.min(.95,shoulder/Math.max(d,.1)));
        actor.pitch=Math.atan2(p[1]+.60+base-e[1]-.75,Math.sqrt(Math.max(.02,d*d-shoulder*shoulder)));
        if(index===3&&enemy.shots.some(s=>Math.hypot(s.mesh.position.x-p[0],s.mesh.position.y-p[1]-.3,s.mesh.position.z-p[2])<2.35)&&t-lastDodge>1.6){
          const dir=(p[0]<16.95)===(Math.cos(actor.yaw)>0)?'KeyD':'KeyA';
          key(dir,true);key('AltLeft',true);key('AltLeft',false);key(dir,false);lastDodge=t;
        }
        const used=actor.latest.shots.length;
        if(recall>=0){if(!used||t-recall>1.7){key('KeyX',false);recall=-1;}}
        else if(used>=4&&t-previous>.3){key('KeyX',true);recall=t;}
        else if(used<4&&t-previous>.29){canvas.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));previous=t;fired++;}
        await frame();
      }
    }finally{key('KeyX',false);}
    return {index,kind:enemy.kind,initial,hits:enemy.target.hits,fired};
  };
}"""

def main():
    args=argparse.ArgumentParser()
    args.add_argument('--base',default='http://127.0.0.1:5190')
    base=args.parse_args().base
    directory=Path(__file__).resolve().parents[1]/'qa'/'evidence'
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        page=browser.new_page(viewport={'width':900,'height':580})
        page.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.set_default_timeout(45000)
        page.goto(base+'/level.html?id=1021-skirmish')
        page.wait_for_function('window.__slime?.ready')
        page.evaluate('()=>{__slime.ctx.renderer.setPixelRatio(.40);__slime.ctx.renderer.shadowMap.enabled=false}')
        page.locator('[data-primary]').click()
        page.wait_for_function('__level.phase==="play" && __slime.aiming')
        page.evaluate(DRIVER)
        combat=[]
        def at(name):
            page.wait_for_function('s=>__level.progress.step===s',arg=name)
            print(name,flush=True)
        def use():
            page.locator('[data-interact]').wait_for(state='visible')
            page.keyboard.press('f')
        def walk(path):
            page.evaluate('p=>followDeck(p)',path)
        def fight(index):
            result=page.evaluate('i=>fleetShots(i)',index)
            print(result,flush=True);combat.append(result)
            page.keyboard.down('x')
            page.wait_for_function('__slime.latest.shots.length===0')
            page.keyboard.up('x')
        at('orders');use();at('firstDeck')
        walk([[.24,.22],[.25,-.93]])
        fight(0);fight(4);at('winch')
        walk([[.20,.38],[4.18,.38],[4.18,7.45],[3.27,7.47]])
        use();signals=page.locator('[data-station="signals"]')
        signals.locator('[data-station-next]').click()
        signals.locator('[data-station-next]').click()
        signals.locator('[data-station-confirm]').click()
        at('crossing')
        walk([[4.18,7.52],[15.45,7.50]])
        at('search');fight(1)
        walk([[16.12,7.05],[16.12,2.05],[18.72,1.60]])
        fight(5);use();at('guardian')
        walk([[17.47,.02],[16.94,-2.27],[16.93,-5.77]])
        fight(3);at('return')
        walk([[16.20,-2.5],[16.12,2.08],[16.14,7.44],[4.19,7.49],[4.2,.55],[3.38,.55],[3.38,4.2],[2.53,4.20]])
        use()
        chart=page.locator('[data-station="chart"]')
        chart.locator('[data-route-piece="nelson"]').click()
        chart.locator('[data-route-slot="north"]').click()
        chart.locator('[data-route-piece="collingwood"]').click()
        chart.locator('[data-route-slot="south"]').click()
        at('complete')
        page.wait_for_function('__level.phase==="won"')
        info=page.evaluate(r'''()=>({saveId:__level.spec.saveId,progress:__level.progress,assets:
          performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname).filter(s=>/battle-preview-[^/]+\.js$/.test(s))})''')
        page.locator('[data-primary]').click()
        page.locator('.mode-keepsake[open]').wait_for()
        page.screenshot(path=directory/'january-legacy-fleet.jpg',quality=86)
        page.locator('[data-mode-home]').click()
        page.wait_for_url('**/?date=1021&from=1021-skirmish')
        page.wait_for_function('window.__game?.slime.ready')
        page.locator('[data-act=start]:enabled').click()
        page.wait_for_function('__game.state==="play"')
        info['harbor']=page.evaluate('''id=>{const g=__game,d=g.save.data,p=g.portals.find(q=>q.slot.slot===5);
          return {day:d.selectedDay,completed:d.completed.includes(id),souvenir:d.souvenirs.includes(id),
            wins:d.life.records[id+'-daily-wins'],ms:d.life.records[id+'-daily-campaign-v1-ms'],local:p.local(g.slime.position)}
        }''',info['saveId'])
        saved=info['harbor']
        assert info['progress']['route']=='upper' and saved['completed'] and saved['souvenir'] and saved['wins']==1 and saved['ms']>0
        assert abs(saved['local'][0])<.2 and abs(saved['local'][2]-2.3)<.2
        assert not errors,errors
        info['combat']=combat
        (directory/'january-legacy-fleet.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('PASS',info,flush=True)
        browser.close()

if __name__=='__main__':
    main()
