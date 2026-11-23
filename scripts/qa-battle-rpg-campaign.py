"""Play both Sekigahara routes in private Chromium using only game controls.

Walks the lower meadow with ordinary combos and the upper ridge with elemental
skills. The high route deliberately loses one commander attempt to test retry.
"""
import argparse
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DRIVER=r"""()=>{
 const a=__slime,l=__level,c=a.ctx.renderer.domElement;
 const key=(code,type)=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
 const tap=code=>{key(code,'keydown');key(code,'keyup');};
 const held=new Set();
 function hold(code,down){if(down&&!held.has(code)){held.add(code);key(code,'keydown');}else if(!down&&held.delete(code)){key(code,'keyup');}}
 function stop(){for(const code of [...held])hold(code,false);}
 function look(p){
   const dx=p[0]-a.position[0],dz=p[2]-a.position[2],wish=Math.atan2(-dx,-dz),raw=wish-a.yaw;
   const diff=Math.atan2(Math.sin(raw),Math.cos(raw));
   c.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:1,buttons:4}));
   document.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,buttons:4,movementX:Math.round(-diff/.0024)}));
   window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:1}));
   return Math.hypot(dx,dz);
 }
 const strike=()=>{c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1}));window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0}));};
 const read=()=>({step:l.progress.step,reward:l.progress.reward,phase:l.phase,hp:l.life,pos:[...a.position],targets:a.combat.targets.map(t=>({hp:t.health,pos:[...t.position],hits:t.hits})),info:document.querySelector('#battle-preview output')?.textContent});
 let evadedSerial=-1,evadingUntil=-5,lastSwing=-10,lastCast=-5,lastElement=-5,currentEl=0,locked=false,reactions=new Set(),minHeight=100,maxHeight=-10,sawHalf=false,sawFollow=false;
 const nextFrame=()=>new Promise(r=>requestAnimationFrame(r));
 window.walkReview=async(p,epsilon=.54)=>{
   if(a.battleAim?.hard)tap('Tab');
   for(let i=0;i<700;i++){
     await nextFrame(); const d=look(p);
     if(d<=epsilon||l.phase!=='play'){stop();return read();}
     hold('KeyW',true);
     minHeight=Math.min(minHeight,a.position[1]);maxHeight=Math.max(maxHeight,a.position[1]);
   }stop();throw Error('walk timeout '+JSON.stringify(read()));
 };
 window.fightReview=async({id,mode,untilHalf=false,onlyFollow=false,lose=false,takeHit=false,breakPoise=false})=>{
   const t=a.combat.targets[id],start=l.encounter.clock,entryHP=l.life;
   let stallClock=start,previousHP=t.health;
   for(let i=0;i<3600;i++){
     await nextFrame();const now=l.encounter.clock;
     if(l.phase!=='play'||t.health<=0){stop();break;}
     if(now-start>55){stop();throw Error('fight timeout '+JSON.stringify(read()));}
     const d=look(t.position);
     const half=id===3&&t.health>0&&t.health<=t.maxHealth*.5;
     if(half)sawHalf=true;
     const e=l.enemies?.[id];
     if(e?.attackKind==='follow'&&['windup','strike','recover'].includes(e.move))sawFollow=true;
     if(untilHalf&&half||onlyFollow&&sawFollow){stop();break;}
     if(takeHit&&l.life<entryHP){stop();break;}
     if(breakPoise){
       const notice=document.querySelector('#battle-preview output')?.textContent??'';
       if(notice.includes('守将失衡')){reactions.add('守将失衡');stop();break;}
       hold('KeyW',d>1.24);
       if(t.aura!==0){tap('Digit1');if(a.element===0&&d<2.2){tap('KeyE');if(!a.combat.active&&d<1.5)strike();}}
       else{tap('Digit6');if(a.element===5&&e?.move==='recover'&&e.attackKind!=='follow'&&!e.followPending&&d<2.5)tap('KeyE');}
       continue;
     }
     if(onlyFollow){
       const threaten=e?.move==='windup'||e?.move==='strike';
       hold('KeyS',threaten&&d<2.75);hold('KeyW',!threaten&&d>1.35);continue;
     }
     if(lose||takeHit){hold('KeyW',d>1.25);continue;}
     const alignment=a.battleAim?.target===t;
     if(!locked&&alignment&&d<4.5){tap('Tab');locked=!!a.battleAim?.hard;}
     if(a.battleAim?.hard&&a.battleAim.target!==t){tap('Tab');locked=false;}
     if(mode==='melee'){
       const threat=l.enemies.find(enemy=>enemy.living&&enemy.move==='windup'&&Math.hypot(enemy.target.position[0]-a.position[0],enemy.target.position[2]-a.position[2])<2.35);
       if(threat&&evadedSerial!==threat.attackId&&now-threat.attackStart>({thrust:.28,follow:.33,sweep:.62}[threat.attackKind]??.62)){
         stop();hold('KeyS',true);tap('AltLeft');hold('KeyS',false);
         evadedSerial=threat.attackId;evadingUntil=now+.4;
       }
       if(now<evadingUntil){stop();continue;}
     }
     const lim=mode==='melee'?.80:1.21;
     hold('KeyW',d>lim);
     if(now-stallClock>6&&previousHP===t.health&&d>lim+.1){tap('Space');stallClock=now;}
     if(previousHP!==t.health){previousHP=t.health;stallClock=now;}
     if(mode==='melee'){
       if(d<1.55&&!a.combat.active&&now-lastSwing>.13){strike();lastSwing=now;}
     }else if(d<3.25){
       if(now-lastElement>1.24){
         currentEl=(currentEl+1)%4;
         tap(['Digit1','Digit3','Digit4','Digit6'][currentEl]);lastElement=now;
       }
       if(now-lastCast>.27){
         tap('KeyE');tap('KeyR');
         if(id===3&&t.health>150||id===2)tap('KeyQ');
         lastCast=now;
       }
     }
     const text=document.querySelector('#battle-preview output')?.textContent??'';
     for(const word of ['蒸发','感电','破韧','扩散','超载'])if(text.includes(word))reactions.add(word);
   }
   stop();
   return {...read(),sawHalf,sawFollow,locked,reactions:[...reactions],minHeight,maxHeight};
 };
 window.reviewState=read;
}"""
parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5226')
parser.add_argument('--route',choices=['lower','upper','both'],default='both')
parser.add_argument('--practice',action='store_true')
args=parser.parse_args()
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    for route in (['lower','upper'] if args.route=='both' else [args.route]):
        page=browser.new_page(viewport={'width':850,'height':540})
        page.set_default_timeout(45000)
        page.route_web_socket('**/*',lambda socket:None)  # Keep development HMR out of this isolated run.
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
        page.goto(args.base+'/level.html?id=1021-rpg'+('&practice=check-save' if args.practice else ''))
        page.wait_for_function('window.__slime?.ready&&window.__level?.points')
        page.evaluate("()=>{const r=__slime.ctx.renderer;r.setPixelRatio(.68);r.shadowMap.enabled=false;}")
        page.locator('[data-primary]').click()
        page.wait_for_function("__level.phase==='play'")
        sid=page.evaluate('__level.spec.saveId')
        page.evaluate("""id=>{const key='slimefable.web.save.v1', data=JSON.parse(localStorage.getItem(key))??{v:1,life:{}};
         data.life.records={...data.life.records,[id+'-daily-ms']:4200,[id+'-practice-ms']:5100,[id+'-daily-wins']:4,[id+'-practice-wins']:2};
         localStorage.setItem(key,JSON.stringify(data));}""",sid)
        page.evaluate(DRIVER)
        points=page.evaluate('__level.points')
        mode='melee' if route=='lower' else 'elemental'
        pref='heal' if route=='lower' else 'power'
        def say(label,data):
            print(route,label,json.dumps(data,ensure_ascii=True,default=str),flush=True)
        def fight(idx,**kw):
            data=page.evaluate('o=>fightReview(o)',dict(id=idx,mode=mode,**kw))
            say('enemy '+str(idx),data);return data
        def walk(name):
            p=points[name] if isinstance(name,str) else name
            return page.evaluate('p=>walkReview(p)',p)
        def expect(step):
            page.wait_for_function('s=>__level.progress.step===s',arg=step,timeout=10000)
        if route=='lower':
            initial_hit=fight(0,takeHit=True);assert 0<initial_hit['hp']<100
        first=fight(0);assert first['targets'][0]['hp']==0;expect('fork')
        walk('fork')
        walk('left' if route=='lower' else 'right')
        expect('pair')
        for idx in ([1,2] if route=='lower' else [2,1]):
            data=fight(idx);assert data['targets'][idx]['hp']==0
        expect('reward')
        life=page.evaluate('__level.life')
        page.locator(f'[data-reward={pref}]').click()
        expect('gate');after=page.evaluate('__level.life')
        assert after==(min(100,life+30) if pref=='heal' else life)
        assert not page.locator('[data-reward]:visible').count()
        side=-1 if page.evaluate('__slime.position[0]')<0 else 1
        walk([3.45*side,0,-11.8])
        walk([points['bossGate'][0],points['bossGate'][1],points['bossGate'][2]-.85]);expect('captain')
        if route=='upper':
            defeat=fight(3,lose=True);assert defeat['phase']=='lost'
            page.locator('[data-primary]').click()
            page.wait_for_function("__level.phase==='play'&&__level.progress.step==='captain'")
            check=page.evaluate('reviewState()')
            assert check['hp']==after and check['reward']==pref and check['targets'][3]['hp']>0,check
            say('restored checkpoint',check)
            stagger=fight(3,breakPoise=True);assert '守将失衡' in stagger['reactions']
            page.screenshot(path=ROOT/'qa/evidence/1021-rpg-break.jpg',quality=89)
        half=fight(3,untilHalf=True);assert half['sawHalf'] and half['phase']=='play'
        if route=='lower':
            follow=fight(3,onlyFollow=True);assert follow['sawFollow'] and follow['phase']=='play'
            page.screenshot(path=ROOT/'qa/evidence/1021-rpg-follow.jpg',quality=89)
        final=fight(3);assert final['targets'][3]['hp']==0 and final['sawHalf'],final
        assert final['maxHeight']>1.4 if route=='upper' else final['minHeight']<.2
        expect('complete');page.wait_for_function("__level.phase==='won'")
        page.locator('[data-primary]').click();page.locator('dialog.mode-keepsake').wait_for()
        info=page.locator('.mode-keepsake').inner_text()
        assert '完整任务最快' in info and '1600' in info
        save=page.evaluate("()=>JSON.parse(localStorage.getItem('slimefable.web.save.v1'))")
        records=save['life']['records']
        assert records[sid+'-daily-ms']==4200 and records[sid+'-practice-ms']==5100
        assert records[sid+'-daily-wins']==(4 if args.practice else 5)
        assert records[sid+'-practice-wins']==(3 if args.practice else 2)
        bucket='-practice' if args.practice else '-daily'
        assert records[sid+bucket+'-campaign-v1-ms']>0
        assert (sid in (save.get('completed') or []))!=args.practice
        assert (sid in (save.get('souvenirs') or []))!=args.practice
        page.locator('[data-mode-home]').click();page.wait_for_function("window.__game?.showing.shown.day==='1021'")
        assert 'from=1021-rpg' in page.url
        page.wait_for_function('__game.state==="title" && __game.slime.ready')
        page.keyboard.press('Enter');page.wait_for_function('__game.state==="play"')
        gate=page.evaluate('()=>__game.portals.find(p=>p.slot.slot===6).local(__game.slime.position)')
        assert abs(gate[0])<.2 and abs(gate[2]-2.3)<.2,gate
        assert not errors,errors
        print('PASS',route,mode,pref,'complete, save and return',flush=True);page.close()
    browser.close()
