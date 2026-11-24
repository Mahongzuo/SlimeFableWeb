"""Sample RPG lock-on and free-aim shooting from the playable October 21 entries."""
import argparse
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
args=parser.parse_args()
shots=Path(__file__).resolve().parents[1]/'qa/evidence'
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1100,'height':680},has_touch=True)
    page.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
    errors=[]
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    def start(kind):
        page.goto(args.base+'/level.html?id=1021-'+kind)
        page.wait_for_function('window.__slime?.ready')
        page.locator('[data-primary]').click()
        page.wait_for_function("__level.phase==='play'")
    start('skirmish')
    page.wait_for_function('__slime.aiming')
    assert not page.locator('.battle-lock-controls').count()
    page.keyboard.press('Tab')
    page.keyboard.press('t')
    yaw=page.evaluate('__slime.yaw')
    page.mouse.move(350,260)
    page.mouse.down(button='middle')
    page.mouse.move(455,270)
    page.mouse.up(button='middle')
    assert abs(page.evaluate('__slime.yaw')-yaw)>.1
    page.wait_for_function('__slime.aimReady')
    page.keyboard.press('f')
    page.wait_for_function("__level.progress.step==='firstDeck'")
    page.evaluate("""()=>{const old=__slime.options.onBattleSceneryHit;
      __slime.options.onBattleSceneryHit=(p,e)=>{window.sceneryHit=[...p];old?.(p,e)};
      window.aimAt=(x,y,z)=>{const a=__slime,dx=x-a.position[0]-.45,dz=z-a.position[2];
        a.yaw=Math.atan2(-dx,-dz);a.pitch=Math.atan2(a.position[1]+.88-y,Math.hypot(dx,dz));};
      aimAt(-1,.8,-.6);}""")
    page.wait_for_timeout(230)
    page.mouse.click(400,275)
    page.wait_for_function('(__slime.latest?.shots.length||0)>0')
    page.wait_for_function('window.sceneryHit && Math.abs(sceneryHit[0]+1)<.65 && Math.abs(sceneryHit[2]+.6)<.65')
    assert page.evaluate('__level.enemies[0].target.hits===0 && __slime.latest.shots.some(s=>s.phase==="active")')
    page.keyboard.down('x')
    page.wait_for_function('__slime.latest.shots.some(s=>["returning","merging"].includes(s.phase))')
    page.wait_for_function('__slime.latest.shots.length===0')
    page.keyboard.up('x')
    page.evaluate('''()=>{const a=__slime,old=a.options.onBattleHit,stage=a.ctx,render=stage.render.bind(stage);stage.renderer.setPixelRatio(1);
      stage.render=(...args)=>{render(...args);
        if(window.cloneBurst&&!window.burstImage&&__level.encounter.clock>=window.cloneBurst.time+.13
          &&stage.scene.children.some(m=>m.name==="clone impact wave"&&m.visible&&m.scale.x>.35))
          window.burstImage=stage.renderer.domElement.toDataURL("image/jpeg",.94);
      };
      a.options.onBattleHit=(target,damage,el,reaction,p)=>{
        const ev=a.latest.impacts.find(i=>i.targetId===target.id);
        if(ev)window.cloneBurst={time:__level.encounter.clock,id:ev.shotId,element:el,current:a.element,
          remaining:a.latest.shots.map(s=>s.id),hits:target.hits,point:ev.point};
        old(target,damage,el,reaction,p);
      };
    }''')
    page.evaluate('__slime.yaw=0')
    # Reproduce a known clear firing lane after verifying the mast in the previous shot.
    page.evaluate('__slime.teleport([1.7,0,1.7])')
    for shot in range(15):
        if page.evaluate('__level.enemies[0].target.hits>0'): break
        page.evaluate("()=>{const p=__level.enemies[0].target.position;aimAt(p[0],p[1]+.8,p[2]);}")
        page.wait_for_function('__slime.aimReady && __slime.launchCooldown<=0')
        page.evaluate('''()=>{const a=__slime; a.setElement(3,true);
          a.ctx.renderer.domElement.dispatchEvent(new PointerEvent("pointerdown",{button:0,bubbles:true}));
          a.setElement(0,true);
        }''')
        now=page.evaluate('__level.encounter.clock')
        page.wait_for_function("t=>__level.encounter.clock>=t+.68",arg=now)
        if shot%3==2:
            page.keyboard.down('x')
            page.wait_for_function('(__slime.latest?.shots.length||0)===0')
            page.keyboard.up('x')
    assert page.evaluate('__level.enemies[0].target.hits>0'),page.evaluate("({phase:__level.phase,alive:__level.life,actor:__slime.position,enemy:__level.enemies[0].target,aimPoint:__slime.launchTarget,ready:__slime.aimReady,scenery:window.sceneryHit})")
    burst=page.evaluate('window.cloneBurst')
    assert burst and burst['id'] not in burst['remaining'] and burst['element']==3 and burst['current']==0,burst
    assert page.evaluate('__level.enemies[0].target.hits')==1,burst
    page.wait_for_function('window.burstImage')
    (shots/'native-clone-burst.jpg').write_bytes(base64.b64decode(page.evaluate('window.burstImage.split(",")[1]')))
    print('PASS airborne element retained, moving sailor hit once, slot freed on impact, mast cloneling recalled, Tab/T isolation',flush=True)

    start('rpg')
    page.wait_for_function('__slime.battleAim?.target?.health>0')
    page.keyboard.press('Tab')
    page.wait_for_function('window.__slime.battleAim.hard')
    page.wait_for_function('__level.encounter.clock>=1.7')
    marker=page.locator('.battle-lock-marker')
    assert marker.is_visible() and marker.get_attribute('data-hard')=='true'
    page.screenshot(path=shots/'1021-campaign-lock.jpg',quality=89)
    page.keyboard.press('Tab')
    page.keyboard.down('d')
    page.mouse.click(450,320,button='right')
    page.wait_for_function('Number.isFinite(__level.encounter.started)')
    page.keyboard.up('d')
    assert page.evaluate('!__slime.battleAim.hard && __slime.battleAim.target?.id===0')
    page.keyboard.press('e')
    page.wait_for_function('__level.enemies[0].target.hits>0')
    page.keyboard.press('Tab')
    page.keyboard.press('3')
    page.keyboard.press('e')
    page.wait_for_function('__level.enemies[0].target.hits>=2')
    page.wait_for_function("Math.hypot(__slime.position[0]-__level.enemies[0].target.position[0],__slime.position[2]-__level.enemies[0].target.position[2])<5")
    page.keyboard.press('q')
    page.wait_for_function("__level.progress.step==='fork'")
    page.wait_for_function('!__slime.battleAim.hard')
    page.evaluate('__slime.yaw=0')
    page.keyboard.down('w')
    try:
        page.wait_for_function("__level.progress.step==='pair'",timeout=80000)
    finally:
        page.keyboard.up('w')
    # Stand back at a known point which frames both sides of the fork.
    page.evaluate("__slime.teleport([-4,0,7]);__slime.yaw=-.27")
    page.wait_for_function('window.__slime.battleAim.target?.health>0')
    page.locator('.battle-lock-controls button').first.tap()
    assert page.evaluate('__slime.battleAim.hard')
    first=page.evaluate('__slime.battleAim.target.id')
    page.locator('.battle-lock-controls button').last.tap()
    assert page.evaluate('__slime.battleAim.target.id')!=first
    # Find a real viewpoint behind the middle outcrop relative to the selected living opponent.
    obstruction=page.evaluate("""()=>{const a=__slime,t=a.battleAim.target.position,w=a.world;
      for(let z=-14.5;z<=-7;z+=.25)for(let x=-4;x<=4;x+=.25){
        if(Math.abs(x)<1.25&&z>-12&&z< -9)continue;
        const y=w.terrain(x,z)||0;
        const contact=w.cast([x,y+.35,z],[t[0],t[1]+.35,t[2]],.01);
        if(contact && Math.abs(contact.point[0])<1.05 && contact.point[2]<-9 && contact.point[2]>-12){
          a.teleport([x,y,z]);a.setElement(4,true);
          const cd=a.skills.getCooldown(4,'E'),energy=a.skills.energy;
          return {blocked:!a.castSkill('E')&&!cd&&a.skills.getCooldown(4,'E')===0&&a.skills.energy===energy,point:contact.point};
        }
      }
    }""")
    assert obstruction and obstruction['blocked'],obstruction
    page.wait_for_function('!__slime.battleAim.hard')
    moved=page.evaluate('__slime.teleport([.04,0,-8.15]);__slime.yaw=Math.PI;__slime.pitch=.18;__level.encounter.clock')
    page.wait_for_function('t=>__level.encounter.clock>t+.2 && __slime.currentArm<1.5',arg=moved)
    assert page.evaluate("""()=>{const a=__slime,c=a.ctx.camera.position,o=[a.position[0],a.position[1]+.3,a.position[2]];
      return !!a.world.cast(o,[o[0],o[1]+.55,o[2]-2.6],.08,true) &&
        !a.world.cast(o,[c.x,c.y,c.z],.025,true);}"""),page.evaluate('({arm:__slime.currentArm,position:__slime.position,camera:__slime.ctx.camera.position.toArray()})')
    page.keyboard.press('Escape')
    page.wait_for_function("__level.phase==='pause'")
    assert not marker.is_visible() and not page.locator('.battle-lock-controls').is_visible()
    assert not errors,errors
    print('PASS live RPG soft/hard lock, real skill hits after dodge, defeated target release, pair touch switching and pause',flush=True)
    start('rpg')
    page.wait_for_function('__slime.battleAim.target?.health>0')
    page.keyboard.press('Tab')
    page.wait_for_function("Math.hypot(__slime.position[0]-__level.enemies[0].target.position[0],__slime.position[2]-__level.enemies[0].target.position[2])<1.7")
    page.evaluate("""()=>{window.minGap=100;const observe=()=>{const a=__slime,t=__level.enemies[0].target;
      if(t.health<=0)return;
      if(a.combat.active)minGap=Math.min(minGap,Math.hypot(t.position[0]-a.position[0],t.position[2]-a.position[2]));
      requestAnimationFrame(observe);};observe();}""")
    for _ in range(45):
        if page.evaluate('__level.enemies[0].target.hits>=4'):break
        page.mouse.click(480,340)
        page.wait_for_timeout(95)
    assert page.evaluate('__level.enemies[0].target.hits>=4 && minGap>.68'),page.evaluate('({gap:minGap,hits:__level.enemies[0].target.hits})')
    print('PASS real outcrop blocks directed skill and retracts camera; repeated locked melee hits and stops at contact',flush=True)
    browser.close()
