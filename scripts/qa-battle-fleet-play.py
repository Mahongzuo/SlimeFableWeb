"""Play the 1021 fleet mission through its normal entry in a private, pointer-lock-free browser."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5226')
parser.add_argument('--route',choices=['both','upper','lower'],default='both')
parser.add_argument('--no-retry',action='store_true')
args=parser.parse_args()
evidence=Path(__file__).resolve().parents[1]/'qa'/'evidence'
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    context=browser.new_context(viewport={'width':940,'height':576})
    context.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
    page=context.new_page()
    # Freeze Vite's hot-reload stream for this tab while other work areas are being edited.
    def route_ws(socket):
        server=socket.connect_to_server()
        if 'vite-hmr' in socket.protocols:
            server.on_message(lambda message: socket.send(message) if json.loads(message).get('type')=='connected' else None)
    page.route_web_socket('**/*',route_ws)
    page.set_default_timeout(90000)
    page_errors=[]
    page.on('pageerror',lambda e:page_errors.append(str(e)))
    def stage(step):
        print('CHECK',step,flush=True)
        page.wait_for_function('s=>window.__level?.progress.step===s',arg=step,timeout=60000)
    def boot():
        print('OPEN',args.base,flush=True)
        page.goto(args.base+'/level.html?id=1021-skirmish')
        page.wait_for_function('window.__slime?.ready&&window.__level?.enemies')
        page.evaluate("()=>{__slime.ctx.renderer.setPixelRatio(.50);__slime.ctx.renderer.shadowMap.enabled=false}")
        page.locator('[data-primary]').click()
        page.wait_for_function('__level.phase==="play" && __slime.aiming')
        page.evaluate("""()=>{
         const a=__slime;
         window.shipKeys=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
         window.shipWalk=async path=>{
          shipKeys('KeyW',true);shipKeys('ShiftLeft',true);
          try{
           for(const [x,z] of path){
            const start=performance.now();
            while(Math.hypot(x-a.position[0],z-a.position[2])>.18){
             if(__level.phase!=='play'||performance.now()-start>40000)throw Error('walk to '+[x,z]+' stopped at '+JSON.stringify([a.position,__level.phase,__level.progress]));
             a.yaw=Math.atan2(a.position[0]-x,a.position[2]-z);
             await new Promise(r=>requestAnimationFrame(r));
            }
           }
          }finally{shipKeys('KeyW',false);shipKeys('ShiftLeft',false)}
         };
         window.shipFight=async index=>{
          const enemy=__level.enemies[index],start=performance.now(),startHp=enemy.target.health;
          let dodges=0,lastDodge=-3,fires=0,previous=-3,recoverAt=-1,observedRecall=false,maxShots=0,shotBefore=0;
          const canvas=a.ctx.renderer.domElement;
          try{
           while(enemy.living){
            if(__level.phase!=='play'||performance.now()-start>90000)throw Error('gunfight '+index+' '+JSON.stringify([a.position,enemy.target.position,enemy.target.health,__level.life,a.aimReady,__level.phase,a.latest.shots.length]));
            const t=__level.encounter.clock,e=enemy.target.position,p=a.position;
            const dx=e[0]-p[0],dz=e[2]-p[2],d=Math.hypot(dx,dz);
            const shoulder=.45,base=.24+.12*Math.max(0,Math.min(1,(a.arm-1.2)/4));
            a.yaw=Math.atan2(-dx,-dz)+Math.asin(Math.min(.95,shoulder/Math.max(d,.1)));
            a.pitch=Math.atan2(p[1]+.60+base-e[1]-.75,Math.sqrt(Math.max(.02,d*d-shoulder*shoulder)));
            const incoming=enemy.shots.some(s=>Math.hypot(s.mesh.position.x-p[0],s.mesh.position.y-p[1]-.30,s.mesh.position.z-p[2])<2.35);
            if(index===3&&incoming&&t-lastDodge>1.6){
             const dir=(p[0]<16.95)=== (Math.cos(a.yaw)>0)?'KeyD':'KeyA';
             shipKeys(dir,true);shipKeys('AltLeft',true);shipKeys('AltLeft',false);shipKeys(dir,false);
             lastDodge=t;dodges++;
            }
            const used=a.latest?.shots?.length??0;maxShots=Math.max(maxShots,used);
            if(recoverAt>=0){
             if(used<shotBefore)observedRecall=true;
             if(used===0||t-recoverAt>1.7){shipKeys('KeyX',false);recoverAt=-1}
            }else if(used>=4&&t-previous>.30){recoverAt=t;shotBefore=used;shipKeys('KeyX',true)}
            else if(t-previous>.29&&used<4){
             canvas.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));fires++;previous=t;
            }
            await new Promise(r=>requestAnimationFrame(r));
           }
          }finally{shipKeys('KeyX',false)}
          if(startHp<=0||!fires)throw Error('target was already defeated');
          return {enemy:enemy.kind,fires,dodges,maxShots,observedRecall};
         };
        }""")
    def walk(path):
        page.evaluate('path=>shipWalk(path)',path)
    def use():
        page.locator('[data-interact]').wait_for(state='visible')
        page.keyboard.press('f')
    def fight(i):
        result=page.evaluate('i=>shipFight(i)',i)
        print('PASS shots',result,flush=True)
        # Recover living or spent clones once the threatened section is clear.
        page.keyboard.down('x')
        page.wait_for_function('window.__slime?.latest?.shots.length===0',timeout=12000)
        page.keyboard.up('x')
        return result
    def shot(name):
        page.evaluate('__slime.ctx.renderer.setPixelRatio(1)')
        page.wait_for_timeout(175)
        page.screenshot(path=evidence/('1021-campaign-ship-'+name+'.jpg'),quality=90)
        page.evaluate('__slime.ctx.renderer.setPixelRatio(.50)')
    routes=['upper','lower'] if args.route=='both' else [args.route]
    for number,route in enumerate(routes,1):
        boot()
        event_log=[]
        stage('orders');use();stage('firstDeck')
        walk([[.24,.22],[.25,-.93]])
        event_log.append(fight(0));stage('winch')
        walk([[.20,.38],[4.18,.38],[4.18,7.45],[3.27,7.47]])
        use()
        signals=page.locator('[data-station="signals"]')
        signals.wait_for(state='visible')
        assert page.evaluate('__level.progress.step')=='winch'
        signals.locator('[data-station-confirm]').click()
        assert signals.is_visible() and page.evaluate('__level.progress.step')=='winch'
        signals.locator('[data-station-next]').click()
        signals.locator('[data-station-next]').click()
        shot(route+'-signals')
        # The selected bearing must put the actual blue pennant in clear sight, including folded gangways.
        assert page.evaluate("""()=>{
          const s=__slime.ctx,r=new s.THREE.Raycaster();
          r.setFromCamera({x:0,y:0},s.camera);
          const visible=o=>o.visible&&(!o.parent||visible(o.parent));
          const hits=r.intersectObjects(s.scene.children,true).filter(h=>visible(h.object)&&h.object.isMesh);
          return hits[0]?.object.material?.color?.getHexString()==='286b91';
        }"""),'The glass is blocked before the blue signal pennant'
        signals.locator('[data-station-confirm]').click()
        stage('crossing')
        if route=='upper':
            walk([[4.18,7.52],[15.45,7.50]])
        else:
            walk([[4.08,7.53],[4.18,.35],[4.18,-5.64],[15.45,-5.65]])
        stage('search')
        assert page.evaluate('__level.progress.route')==route
        shot(route+'-boarded')
        event_log.append(fight(1 if route=='upper' else 2))
        if route=='upper':
            walk([[16.12,7.05],[16.12,2.05],[18.72,1.60]])
        else:
            walk([[20.13,-5.65],[20.13,.29],[18.81,.29],[18.77,1.58]])
            walk([[20.31,2.02],[20.51,3.05]])
            use()
            page.wait_for_function('__level.progress.journal')
            walk([[20.30,2.00],[18.76,1.59]])
        use();stage('guardian')
        chk=page.evaluate('({name:__level.checkpoint,hp:__level.life,pos:[...__slime.position],journal:__level.progress.journal})')
        if route=='lower' and not args.no_retry:
            # Stay in sight. The native guardian projectiles must actually knock the actor down.
            page.wait_for_function('__level.phase==="lost"',timeout=150000)
            page.locator('[data-primary]').click()
            page.wait_for_function('__level.phase==="play"')
            assert page.evaluate('__level.checkpoint')==chk['name']
            assert page.evaluate('__level.progress.journal')==chk['journal']
            assert page.evaluate('__level.life')==chk['hp']
            assert page.evaluate('p=>Math.hypot(...__slime.position.map((v,i)=>v-p[i]))<.33',chk['pos'])
            print('PASS native defeat and checkpoint restore',route,flush=True)
        # Use the foredeck firing lane. The record-room doorway offers little room against a spread.
        walk([[17.47,.02],[16.94,-2.27],[16.93,-5.77]])
        event_log.append(fight(3));stage('return')
        if route=='upper':
            assert not page.evaluate('__level.progress.journal')
            walk([[16.20,-2.5],[16.12,2.08],[16.14,7.44],[4.19,7.49],[4.2,.55],[3.38,.55],[3.38,4.2],[2.53,4.20]])
        else:
            walk([[16.50,-2.0],[16.10,1.51],[15.42,1.51],[4.13,1.51],[3.34,1.51],[3.34,4.2],[2.53,4.20]])
        use()
        board=page.locator('[data-station="chart"]')
        board.wait_for(state='visible')
        assert page.evaluate('__level.progress.step')=='return'
        board.locator('[data-route-piece="nelson"]').click()
        board.locator('[data-route-slot="north"]').click()
        assert board.is_visible() and page.evaluate('__level.progress.step')=='return'
        shot(route+'-chart')
        board.locator('[data-route-piece="collingwood"]').click()
        board.locator('[data-route-slot="south"]').click()
        stage('complete')
        page.wait_for_function('__level.phase==="won"')
        save_id=page.evaluate('__level.spec.saveId')
        assets=page.evaluate(r"""()=>performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname)
            .filter(p=>/\/(level|battle-preview)-[^/]*\.js$/.test(p))""")
        page.locator('[data-primary]').click()
        assert page.locator('.mode-keepsake').is_visible()
        page.locator('[data-mode-home]').click()
        page.wait_for_function('window.__game?.showing.shown.day==="1021"')
        assert 'from=1021-skirmish' in page.url,page.url
        page.wait_for_function('window.__game?.state==="title" && __game.slime.ready')
        page.keyboard.press('Enter');page.wait_for_function('__game.state==="play"')
        result=page.evaluate("""id=>{
          const g=__game,p=g.portals.find(q=>q.slot.slot===5),d=g.save.data;
          return {local:p.local(g.slime.position),wins:d.life.records[id+'-daily-wins'],best:d.life.records[id+'-daily-campaign-v1-ms'],
          completed:d.completed.includes(id),keepsake:d.souvenirs.includes(id)};
        }""",save_id)
        assert result['wins']==number and result['best']>0 and result['keepsake'] and result['completed'],result
        assert abs(result['local'][0])<.2 and abs(result['local'][2]-2.3)<.2,result
        report={'testedBase':args.base,'assets':assets,'route':route,'journal':route=='lower','checkpoint':chk,'nativeInputOnly':True,'stations':{'rejectedDecoy':True,'blueFlag':True,'firstRouteAloneIncomplete':True,'pairedRoutes':['nelson/north','collingwood/south']},'combat':event_log,'harbor':result}
        (evidence/('1021-campaign-ship-'+route+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print('PASS',route,report,flush=True)
    assert not page_errors,page_errors
    browser.close()
