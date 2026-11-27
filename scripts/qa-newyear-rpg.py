"""Exercise the January exhibit arenas through level inputs in an isolated headless browser."""
import argparse
import base64
from io import BytesIO
from PIL import Image
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

cli = argparse.ArgumentParser()
cli.add_argument('--base', default='http://127.0.0.1:5190')
cli.add_argument('--days', default='0102,0103,0104,0105,0106,0107,0108,0109,0110')
cli.add_argument('--practice', action='store_true')
options = cli.parse_args()
out = Path(__file__).resolve().parents[1] / 'qa' / 'evidence'
driver = """async({action,branch})=>{
 const {battle:b,stage,step}=__level,a=__slime;
 const send=(k,on)=>dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code:k,bubbles:true,cancelable:true}));
 const tap=k=>{send(k,true);send(k,false)};
 const wait=async(n=1)=>{for(let i=0;i<n;i++){
   await new Promise(requestAnimationFrame);
   const original=stage.render;stage.render=()=>{};
   try{for(let j=0;j<5;j++)step(.036);}finally{stage.render=original;}
 }};
 const keys=['KeyA','KeyD','KeyW','KeyS'];
 const walk=async p=>{
   for(let i=0;i<210;i++){
     const x=p[0]-a.position[0],z=p[2]-a.position[2];
     if(Math.hypot(x,z)<.38){keys.forEach(k=>send(k,false));return;}
     keys.forEach((k,j)=>send(k,[x<-.14,x>.14,z<-.14,z>.14][j]));await wait();
   }throw Error('walk '+JSON.stringify([p,a.position,b.phase]));
 };
 const guard=async()=>{send('KeyC',true);await wait(7)};
 if(action==='warm'){
   await walk(b.layout.warm);
   await new Promise(r=>setTimeout(r,300));
   function extent(){
     const attr=a.renderer.geometry.attributes,pos=attr.position.array;
     let x=Infinity,X=-Infinity,y=Infinity,Y=-Infinity;
     for(let i=0;i<a.latest.count;i+=6)if(attr.cluster.array[i]<.1){x=Math.min(x,pos[i*3]);X=Math.max(X,pos[i*3]);y=Math.min(y,pos[i*3+1]);Y=Math.max(Y,pos[i*3+1]);}
     return [X-x,Y-y];
   }
   const before=extent();send('KeyC',true);let delta=0;
   const start=performance.now();while(performance.now()-start<2300){await new Promise(requestAnimationFrame);const now=extent();delta=Math.max(delta,Math.abs(now[0]-before[0])+Math.abs(now[1]-before[1]));}
   send('KeyC',false);tap('KeyF');return {phase:b.phase,delta};
 }
 if(action==='route'){await walk(b.layout.branches[branch]);tap('KeyF');return b.phase;}
 if(action==='retry'){await walk([0,0,6.4]);for(let i=0;i<3;i++){tap('KeyJ');await wait(3);}return b.phase;}
 if(action==='leg'){
   const day=b.day,i=b.round;
   await walk(b.source);
   tap('KeyJ');await wait(3);
   if(!b.engaged)throw Error('source '+JSON.stringify([b.message,b.nextSpot,a.position]));
   if(day==='0102'){
     if(!b.fill){await walk(b.middle);await wait(2);}
     await walk(b.safeSpot);
     if(i===0&&branch===1){
       for(let n=0;n<150&&Math.abs(b.kickX)<2.73;n++)await wait();
       tap('KeyJ');if(!b.shot||b.shot.goal||b.phase!=='duel'||!b.engaged)throw Error('expected local field miss');
       const miss={crossX:b.shot.crossX,from:[...a.position],round:b.round};
       const render=stage.render;stage.render=()=>{};try{for(let k=0;k<18;k++)step(.05);}finally{stage.render=render;}
       stage.render(.001,a);window.missFrame=stage.renderer.domElement.toDataURL('image/jpeg',.89);
       await wait(2);window.kickRetry={...miss,at:[...a.position],sameRound:b.round===miss.round,ballReturned:b.shot===null&&b.engaged};

     }
     for(let n=0;n<160&&(Math.abs(b.kickX)>.65||b.shot&&b.shot.age<.82);n++)await wait();
   }else if(day==='0103'){
     if(branch===1){
       for(let k=0;k<165&&!b.anchorHeld;k++){await wait();if(k>0&&k%29===0)tap('KeyJ');}
       if(!b.anchorHeld)throw Error('paper anchor '+JSON.stringify([a.position,b.anchorSpot,a.latest.shots,b.anchorShots]));
     }
     if(branch===0)await guard();
     for(let k=0;k<3;k++){const target=[...b.middle];await walk(target);await wait(2);}
     send('KeyC',false);await walk(b.safeSpot);
   }else if(day==='0104'){
     if(branch===0){for(let k=0;k<2;k++){const point=[...b.middle];await walk(point);await wait(2);}}
     else{await walk(b.middle);await guard();for(let k=0;k<100&&!b.fill;k++)await wait();send('KeyC',false);}
     await walk(b.safeSpot);for(let k=0;k<160&&b.wave>.24;k++)await wait();
   }else if(b.passage){
     for(let k=0;k<b.passage.points.length;k++){
       const mode=b.nextCapture.mode,target=[...b.middle];if(mode==='flat')await guard();
       await walk(target);
       if(mode==='jump')tap('Space');
       for(let frame=0;frame<160&&b.steps<=k;frame++){
         if(mode==='jump'&&frame>0&&frame%17===0)tap('Space');
         await wait();
       }
       send('KeyC',false);if(b.steps<=k)throw Error('checkpoint '+JSON.stringify([day,mode,target,a.position,b.steps,b.wave,a.spread]));
     }
     await walk(b.safeSpot);
     for(let k=0;k<160&&b.chapter.window&&(b.chapter.window==='low'?b.wave>.20:Math.abs(b.wave-.5)>.077);k++)await wait();
   }else{
     await walk(b.middle);if(branch===0)await guard();
     for(let k=0;k<170&&b.displacement<.96;k++)await wait();
     tap('KeyJ');send('KeyC',false);await wait(3);await walk(b.safeSpot);
   }
   if(b.fill<1)throw Error('middle '+JSON.stringify([day,b.message,b.hint,b.steps,b.fill,b.bubble,a.position,b.middle]));
   tap('KeyJ');send('KeyC',false);await wait(3);
   if(b.round===i)throw Error('leg '+JSON.stringify([i,b.message,b.phase,a.position,b.safeSpot,b.fill,a.spread]));
   return b.round;
 }
 if(action==='last'){await walk(b.layout.end);tap('KeyF');if(b.phase==='curtain')stage.renderer.setAnimationLoop(null);return b.phase;}
}"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows'])
    context = browser.new_context(viewport={'width':960, 'height':610}, has_touch=True)
    context.route_web_socket('**/*',lambda socket:None)
    context.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
      if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
      JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{previous:2}}}));""")
    for day in options.days.split(','):
        page = context.new_page()
        errors = []
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        page.set_default_timeout(90000)
        prefix = ('janweek-six-' if day>='0106' else 'newyear-six-')+day+'-rpg-'
        def snap(suffix):
            if not options.practice:
                page.screenshot(path=out/(prefix+suffix+'.jpg'),quality=86)
        def action(name):
            return page.evaluate(driver,{'action':name,'branch':0 if options.practice else 1})
        page.goto(options.base+'/level.html?id='+day+'-rpg'+('&practice=stage-proof' if options.practice else ''))
        for attempt in range(3):
         try:
          page.wait_for_function('window.__level?.stage.time>.12 && __slime.latest?.count>100',timeout=14000);break
         except Exception:
          if errors or page.locator('body').inner_text() or attempt==2:raise
          page.reload(wait_until='load')
        calls = page.evaluate("""()=>{const st=__level.stage,root=st.scene.getObjectByName('voyage-'+__level.spec.day),i=st.renderer.info;
          i.autoReset=false;const count=v=>{root.visible=v;i.reset();st.render(.001,__slime);return i.render.calls};
          try{const bare=count(false);return count(true)-bare;}finally{root.visible=true;i.autoReset=true;}}""")
        assert 0<calls<=150,calls
        if not options.practice:page.wait_for_function('__level.stage.time>1.22')
        snap('play')
        if page.locator('[data-start]:enabled').is_visible():page.locator('[data-start]:enabled').click()
        coins,paid=page.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
          const today=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
          return [s.life.coins,!!(s.homeDaily?.date===today && s.homeDaily.gates.includes(6))];}""")
        warm=action('warm');assert warm['phase']=='route' and warm['delta']>.01,warm
        assert action('route')=='duel'
        assert action('leg')==1
        if not options.practice and day!='0102':
            assert action('retry')=='lost'
            page.locator('[data-start]:enabled').click()
            assert page.evaluate('__level.battle.round')==1
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(160);snap('portrait')
        touch=page.evaluate("""()=>{const {stage:s,battle:b}=__level,p=b.nextSpot,
          n=new s.THREE.Vector3(p[0],0,p[2]).project(s.camera);
          const x=(n.x+1)*innerWidth/2,y=(1-n.y)*innerHeight/2;
          return {x,y,canvas:document.elementFromPoint(x,y)===s.renderer.domElement,start:[...__slime.position]};}""")
        assert touch['canvas'],(day,touch)
        page.touchscreen.tap(touch['x'],touch['y'])
        page.wait_for_function('p=>Math.hypot(__slime.position[0]-p[0],__slime.position[2]-p[2])>.32',arg=touch['start'])
        page.set_viewport_size({'width':960,'height':610})
        for suffix,eye in [('low',[3.6,1.75,5.85]),('far',[7.8,10.8,16.6])]:
            page.evaluate("""eye=>{const s=__level.stage;window.originalDraw??=s.render.bind(s);
              s.render=(dt,a)=>{s.camera.position.fromArray(eye);s.camera.lookAt(0,1,-4);originalDraw(dt,a);};}""",eye)
            page.wait_for_timeout(170);snap(suffix)
        page.evaluate('__level.stage.render=originalDraw')
        if day=='0102' and not options.practice:
            retry=page.evaluate('kickRetry');assert retry['ballReturned'] and retry['sameRound'] and abs(retry['crossX'])>1.65,retry
            frame=Image.open(BytesIO(base64.b64decode(page.evaluate('missFrame').split(',')[1]))).convert('RGB')
            wide=out/(prefix+'far.jpg')
            with Image.open(wide) as far:
                proof=Image.new('RGB',(far.width,far.height*2))
                proof.paste(far,(0,0));proof.paste(frame.resize(far.size),(0,far.height))
            proof.save(wide,quality=88)

        assert action('leg')==2
        assert action('leg')==3
        assert action('last')=='curtain'
        page.evaluate('''()=>{const l=__level,st=l.stage,draw=st.render;
          st.render=()=>{};try{for(let i=0;i<35;i++)l.step(.05);}finally{st.render=draw;}
          st.render(.001,__slime);}''');snap('final')
        page.evaluate('()=>{for(let i=0;i<5;i++)__level.step(.05);}')
        ending={}
        if day>='0106':
            name={'0106':'coma-film','0107':'cat-eye-pupil','0108':'chalk-boundary','0109':'nebula-crown','0110':'newspaper-impression'}[day]
            ending=page.evaluate("name=>{const o=__level.stage.scene.getObjectByName(name);return {visible:o.visible,y:o.position.y,x:o.position.x,rx:o.rotation.x};}",name)
            if day in ('0106','0110'):assert abs(ending['rx'])<.03,ending
            if day=='0107':assert ending['visible'],ending
            if day=='0108':assert ending['x']>1.43,ending
            if day=='0109':assert ending['y']>1.71,ending
        page.locator('.mode-keepsake').wait_for()
        assert not page.evaluate('__slime.workerErrors.length'),page.evaluate('__slime.workerErrors')
        stats=page.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('slimefable.web.save.v1')),k=__level.spec.saveId,
          bucket=k+(location.search.includes('practice')?'-practice':'-daily');return {preserved:s.life.records.previous===2,
          routes:s.life.records[bucket+'-routes'],won:s.life.records[bucket+'-wins'],module:performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname).find(p=>p.includes('/january-rpg')&&p.endsWith('.js')),
          owned:s.souvenirs.includes(k),shells:s.life.coins,hasOld:s.souvenirs.includes('0101-1864'),particles:__slime.latest.count,errors:__level.battle.errors,wide:__level.battle.wide,anchorShots:__level.battle.anchorShots};}""")
        assert stats['won']==1 and stats['preserved'] and stats['owned']!=options.practice,stats
        if day=='0102' and not options.practice:
            assert stats['wide']>=1,stats
            stats['sameSpotRetry']=retry
        if ending:stats['ending']=ending
        if day=='0103' and not options.practice:assert stats['anchorShots']>=3,stats
        assert stats['routes']==(1 if options.practice else 2),stats
        assert stats['hasOld'] and stats['shells']==coins+(0 if options.practice or paid else 8),stats
        page.locator('[data-mode-home]').click()
        page.wait_for_url('**/?date='+day+'&from='+day+'-rpg')
        assert not errors,errors
        file=out/(prefix+'result.json')
        data=json.loads(file.read_text('utf-8')) if file.exists() else {}
        data['practice' if options.practice else 'daily']={**stats,'returned':True,'drawCalls':calls,'portraitTap':True,'shapeDelta':round(warm['delta'],3)}
        file.write_text(json.dumps(data,ensure_ascii=False,indent=2),'utf-8')
        print(day,stats,flush=True);page.close()
    browser.close()
