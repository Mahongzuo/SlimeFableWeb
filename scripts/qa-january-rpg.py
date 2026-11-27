"""Exercise all three January arenas through the keyboard. Never acquire pointer lock."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5237')
parser.add_argument('--days',default='0101,0114,0131')
parser.add_argument('--practice',action='store_true')
opt=parser.parse_args()
evidence=Path(__file__).resolve().parents[1]/'qa'/'evidence'
driver="""async ({action,branch})=>{
 const l=window.__level,b=l.battle,a=window.__slime;
 const send=(code,type)=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
 const tap=code=>{send(code,'keydown');send(code,'keyup')};
 const keys=['KeyW','KeyA','KeyS','KeyD'],held=new Set();
 const hold=(k,on)=>{if(on&&!held.has(k)){held.add(k);send(k,'keydown')}if(!on&&held.delete(k))send(k,'keyup')};
 const stop=()=>keys.forEach(k=>hold(k,false));
 const next=()=>new Promise(requestAnimationFrame);
 // Additional ordinary simulation ticks shorten unattended walking. Retain one
 // native animation/render per browser frame, including the worker surface.
 const tick=async()=>{await next();const render=l.stage.render;l.stage.render=()=>{};
   try{for(let i=0;i<4;i++)l.step(.042)}finally{l.stage.render=render}};
 const steer=p=>{const x=p[0]-a.position[0],z=p[2]-a.position[2];
   hold('KeyA',x<-.17);hold('KeyD',x>.17);hold('KeyW',z<-.17);hold('KeyS',z>.17);
   return Math.hypot(x,z)};
 const walk=async p=>{for(let i=0;i<360;i++){if(steer(p)<.38){stop();return}await tick()}
   throw Error('walk '+JSON.stringify([p,a.position,b.phase]))};
 if(action==='warm'){await walk(b.layout.warm);
   if(l.spec.day==='0101'){
     send('KeyC','keydown');await walk([.9,0,5.6]);send('KeyC','keyup');
     await walk([.12,0,5.57]);for(let i=0;i<8;i++)await tick();
   }else{tap('KeyC');await tick();}
   tap('KeyF');return b.phase}
 if(action==='route'){const p=b.layout.branches[branch];
   if(b.arena==='stage'&&branch===1){await walk([p[0],0,5.35]);await walk([p[0],1.16,2.1])}
   await walk(p);tap('KeyF');return b.phase}
 if(action==='battle'){
   for(let i=0;i<1000&&b.phase==='duel';i++){const p=b.safeSpot;
     if(steer(p)<.7){stop();
       if(b.arena==='stage'&&b.route<0)tap('KeyC');
       if(b.cue==='open'){
         if(b.arena==='stage'&&b.route>0)tap('Space');
         if(b.arena==='field'&&b.route<0)tap('ShiftLeft');else tap('KeyJ');
       }}
     await tick()}
   stop();return {phase:b.phase,round:b.round,health:b.health,pos:a.position}}
 if(action==='end'){await walk(b.layout.end);tap('KeyF');for(let i=0;i<30&&!document.querySelector('.mode-keepsake');i++)await tick();return b.phase}
}"""
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    for day in opt.days.split(','):
        page=browser.new_page(viewport={'width':880,'height':570})
        page.set_default_timeout(90000)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
        key=day+'-rpg'
        page.goto(opt.base+'/?date='+day)
        if opt.practice:
            page.locator('.title-actions [data-act=book]').click()
            page.locator('.book [data-id="'+key+'"]').click()
        else:
            page.locator('[data-act=start]:enabled').click()
            page.wait_for_function('window.__game?.state==="play" && window.__slime?.ready')
            page.evaluate('()=>__slime.teleport([...__game.portals[5].slot.position])')
            page.locator('.door-actions [data-id="'+key+'"]').click()
        page.wait_for_url('**/level.html?id='+key)
        if opt.practice:page.goto(opt.base+'/level.html?id='+key+'&practice=arena-review')
        page.locator('[data-start]:enabled').click()
        page.wait_for_function('window.__slime?.latest?.count>0')
        def check(action):
            result=page.evaluate(driver,{'action':action,'branch':1 if opt.practice else 0})
            print(key,action,result,flush=True)
            return result
        assert check('warm')=='route'
        page.keyboard.down('KeyC')
        page.wait_for_function('__slime.latest?.spread>.12')
        audit=page.evaluate("""()=>{const s=__level.stage,r=s.renderer,arena=s.scene.getObjectByName('january-arena');
          const n=__slime.latest.count,spread=__slime.latest.spread,info=r.info;
          info.autoReset=false;
          const measure=on=>{arena.visible=on;info.reset();s.render(0,__slime);return info.render.calls};
          const base=measure(false),full=measure(true);info.autoReset=true;
          return {meshVertices:n,spread,additionalCalls:full-base,asset:performance.getEntriesByType('resource')
            .map(e=>new URL(e.name).pathname).find(n=>n.includes('/january-rpg-')&&n.endsWith('.js'))}}""")
        assert 0<audit['additionalCalls']<=150,audit
        page.keyboard.up('KeyC')
        assert check('route')=='duel'
        if not opt.practice:
            page.wait_for_function('__level.stage.time>=1.25')
            page.screenshot(path=evidence/f'january-rpg-{day}-play.jpg',quality=85)
            for tag,eye in [('low',[4,1.1,5]),('wide',[10,12,17])]:
                page.evaluate("""eye=>{const s=__level.stage;s.renderer.setAnimationLoop(null);
                s.camera.position.set(...eye);s.camera.lookAt(0,1,-4);s.render(.02,__slime)}""",eye)
                page.screenshot(path=evidence/f'january-rpg-{day}-{tag}.jpg',quality=82)
            page.evaluate('()=>{let last=performance.now();__level.stage.renderer.setAnimationLoop(t=>{__level.step((t-last)/1000);last=t})}')
        assert check('battle')['phase']=='finale'
        assert check('end')=='curtain'
        page.locator('.mode-keepsake').wait_for()
        assert page.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
          const k=__level.spec.saveId,p=location.search.includes('practice');
          return s.life.records[k+(p?'-practice':'-daily')+'-wins']===1&&s.souvenirs.includes(k)===!p}""")
        page.locator('[data-mode-home]').click()
        page.wait_for_function('window.__game?.slime.ready')
        assert 'from='+key in page.url
        page.goto(opt.base+'/level.html?id='+key)
        page.wait_for_function('window.__slime?.ready && window.__level?.phase==="warmup"')
        assert not errors,errors
        audit.update({'id':key,'practice':opt.practice,'finished':True,'returnedAndReopened':True})
        name='practice' if opt.practice else 'daily'
        (evidence/f'january-rpg-{day}-{name}.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
        page.close()
    browser.close()
