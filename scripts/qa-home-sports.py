"""Headless production entry, real inputs and accelerated match-rule checks."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parents[1]/'qa/evidence'
KEY='slimefable.web.save.v1'
def shot(p,name):
    p.screenshot(path=OUT/('home-sports-'+name+'.jpg'),type='jpeg',quality=88)
def run(browser,base,portrait):
    context=browser.new_context(viewport={'width':420 if portrait else 960,'height':820 if portrait else 640},has_touch=portrait)
    context.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE',e,flush=True)))
    page.goto(base,wait_until='domcontentloaded')
    page.wait_for_function("window.__game?.state==='play' && __slime.ready",timeout=150000)
    page.evaluate("""async()=>{window.g=__game;window.s=__slime;window.a=g.app;window.park=g.sportsPark;window.ss=g.sports;
      await park.ready;a.renderer.setAnimationLoop(null);g.graphics.set('medium');a.director.setTime(805);a.director.mode='clear';
      a.director.update(a.director.weather.time+90);__homeCalib.setInstantExposure(true);
      window.frame=()=>a.step(.035);window.gate=id=>park.courts.find(c=>c.sport===id);
      window.visit=id=>{const c=gate(id),[x,y,z]=c.gate;s.teleport([x,y,z+.7]);a.camera.position.set(x,y+2.4,z+4.2);a.camera.lookAt(x,y+.95,z);a.camera.updateMatrixWorld();g.interact();};
      a.ctx.onUpdate(()=>{if(window.sportView){a.camera.position.fromArray(sportView[0]);a.camera.lookAt(...sportView[1]);a.camera.updateMatrixWorld();}});
      window.look=(cam,target)=>{window.sportView=[cam,target];for(let i=0;i<4;i++)frame();};
      window.speed=(n)=>{for(let i=0;i<n;i++)ss.update(.04);};
    }""")
    if page.locator('dialog[open] [data-action=close]').count():page.locator('dialog[open] [data-action=close]').first.click()
    results={}
    if not portrait:
        results['land']=page.evaluate("""()=>{const c=gate('swim');return {pool:s.world.fluid(c.x,c.z),bed:s.world.terrain(c.x,c.z),water:a.pipeline.inlandWaterLevel(c.x,c.z),land:s.world.terrain(c.x+24,c.z),models:park.courts.map(c=>a.scene.getObjectByName('sport-'+c.sport)?.children.length)}}""")
        assert results['land']['models'] and all(results['land']['models'])
        assert results['land']['water']>results['land']['bed']+1
        page.evaluate("()=>{s.teleport([28,s.world.terrain(28,58),58]);s.yaw=-Math.PI/2;}")
        page.keyboard.down('w')
        results['walk']=page.evaluate("""()=>{for(let i=0;i<430&&s.position[0]<52;i++)s.update(i*.035,.035);return s.position.slice()}""")
        page.keyboard.up('w')
        assert results['walk'][0]>49,results['walk']
        results['paths']=page.evaluate("""()=>{const paths={},spine=gate('basketball').x+19;
          function walk(x,z){for(let i=0;i<1600;i++){const dx=x-s.position[0],dz=z-s.position[2];if(Math.hypot(dx,dz)<.23)return;
            s.yaw=Math.atan2(-dx,-dz);s.keys.add('KeyW');s.update(i*.035,.035);}throw Error('blocked at '+s.position+' going to '+[x,z]);}
          for(const c of park.courts){walk(spine,s.position[2]);walk(spine,c.gate[2]);walk(c.gate[0],c.gate[2]);s.keys.clear();g.interact();
            if(g.focus?.spot.id!=='sports-'+c.sport)throw Error('gate not reached: '+c.sport);paths[c.sport]=s.position.slice();}
          return paths;}""")
        results['seams']=page.evaluate("""()=>{const T=a.ctx.THREE,turf=a.scene.getObjectByName('运动公园草坪与步道'),rc=new T.Raycaster();
          a.scene.updateMatrixWorld(true);rc.layers.enableAll();
          function sample(mesh,x,z){rc.set(new T.Vector3(x,20,z),new T.Vector3(0,-1,0));return rc.intersectObject(mesh,true)[0]?.point.y;}
          const c=gate('swim'),gnd=a.scene.getObjectByName('SM_SW_Deck');
          return {entry:sample(turf,31.03,58),entryPhysics:s.world.terrain(31.03,58),apron:sample(gnd,c.x-15,c.z+1),grass:sample(turf,c.x-17,c.z+1),dry:c.y};}""")
        assert abs(results['seams']['entry']-results['seams']['entryPhysics'])<.06
        assert .08<results['seams']['apron']-results['seams']['grass']<.30
        page.keyboard.press('F3')
        for name,eye,target in [('park',[117,83,166],[106,0,88]),('entrance',[35,2.6,58],[55,1,52]),('pool',[73,11,145],[52,0,128]),('pool-seam',[62,2.4,112.8],[57,.45,125])]:
            page.evaluate("([e,t])=>look(e,t)",[eye,target]);shot(page,name)
        page.evaluate("window.sportView=null")
        page.keyboard.press('F3')
        results['freeSwim']=page.evaluate("""()=>{const c=gate('swim');s.teleport([c.x+3,c.y+.65,c.z+1]);for(let i=0;i<45;i++)s.update(i*.03,.03);
          return {swimming:s.swimming,body:s.position,step:c.y,water:s.world.fluid(c.x,c.z),dry:s.world.fluid(c.x-15,c.z),ramp:[-10.3,-9.5,-8.7,-7.7].map(z=>s.world.support(c.x+8.85,c.z+z,1,true))};}""")
        assert results['freeSwim']['swimming'] and results['freeSwim']['dry'] is None,results['freeSwim']
    for sport in ['football','basketball','tennis','badminton','swim']:
        print(('portrait ' if portrait else '')+sport,flush=True)
        page.evaluate("id=>visit(id)",sport)
        assert page.evaluate("g.focus?.spot.id")=='sports-'+sport
        if portrait:page.locator('[data-act="interact"]').tap()
        else:page.keyboard.press('f')
        panel=page.locator('.sports-panel:not(.sports-help)')
        panel.wait_for(state='visible')
        if sport=='football':shot(page,'invite-'+('portrait' if portrait else 'wide'))
        if not portrait and sport=='badminton':panel.get_by_text('单打 · 切换双打').click()
        panel.get_by_text('开始比赛').click()
        page.evaluate("speed(67);frame()")
        page.wait_for_function("ss.models.every(m=>m.group.children.some(c=>c.isGroup))",timeout=75000)
        if portrait:panel.get_by_text('F1 帮助').click()
        else:page.keyboard.press('F1')
        frozen=page.evaluate("ss.match.time")
        page.evaluate("speed(10)")
        assert frozen==page.evaluate("ss.match.time")
        if portrait and sport=='swim':shot(page,'help-portrait')
        page.get_by_text('回到现场',exact=True).click()
        if sport=='swim':
            if portrait:panel.get_by_text('跃入 / 蹬壁').tap()
            else:page.keyboard.press('Space')
            page.keyboard.down('f');page.evaluate('speed(85);frame()')
            for _ in range(14):page.evaluate('frame()')
            page.keyboard.up('f')
            assert page.evaluate("ss.match.players[0].distance>3")
            if not portrait:
                assert page.evaluate("a.ctx.waterWaves.animalEvents.filter(e=>e.z>0).length>=5")
            assert page.evaluate("s.latest.count>0 && s.latest.generation===s.generation")
            shot(page,'swimming-'+('portrait' if portrait else 'wide'))
            if not portrait:
                page.evaluate("""()=>{const pos=s.position;ss.help=true;look([pos[0]+2.4,pos[1]+1.25,pos[2]+2.75],[pos[0],pos[1]+.24,pos[2]]);}""")
                shot(page,'pool-contact')
                page.evaluate("window.sportView=null;ss.help=false")
        elif sport in ['tennis','badminton']:
            if portrait:panel.get_by_text('发球 / 挥拍',exact=True).tap()
            else:page.keyboard.press('f')
            page.evaluate('speed(7);frame()')
            assert page.evaluate("ss.match.touches>0"),page.evaluate("({owner:ss.match.owner,waiting:ss.match.waiting,intro:ss.intro,time:ss.match.time})")
            if sport=='badminton' and not portrait:shot(page,'doubles')
        else:
            if portrait:panel.locator('.sport-actions button').first.tap()
            else:page.keyboard.press('f')
            page.evaluate('speed(4);frame()')
            assert page.evaluate("ss.match.touches>0"),page.evaluate("({owner:ss.match.owner,waiting:ss.match.waiting,intro:ss.intro,time:ss.match.time})")
            page.keyboard.down('d');page.evaluate('speed(8);frame()');page.keyboard.up('d')
        # Run the normal rule engine with directional movement and action input, without drawing thousands of identical frames.
        result=page.evaluate("""()=>{const m=ss.match;let i=0;
          for(;i<72000&&!m.rank;i++){
            const p=m.players[0],own=m.owner===0,ball=m.ball,swim=m.sport==='swim',basket=m.sport==='basketball';
            let tx=own?(basket&&!m.cleared?2:m.length-.8):m.flight?.to.x??ball.x,tz=own?0:m.flight?.to.z??ball.z;
            if(m.net){tx=Math.min(-.3,tx);if(m.owner===0)tz=-Math.sign(p.z)*2;}
            const dx=tx-p.x,dz=tz-p.z,len=Math.max(.5,Math.hypot(dx,dz));
            const inp={dx:dx/len,dz:dz/len,held:swim};
            if(swim){if(!m.swimStarted||p.distance===25&&!p.split)m.action(0,true,inp);if(i%24===0)m.action(0,false,inp);}
            else if(m.net){if(i%9===0)m.action(.25,false,{...inp,dz:Math.sin(i*.04)*.8});}
            else if(own&&i%14===0&&(basket?m.cleared&&p.x>5:p.x>31))m.action(.73,false,{...inp,dz:0});
            else if(!own&&i%68===0)m.action(0,true,inp);
            m.update(1/60,inp);
          }
          const summary={score:m.score,rank:m.rank,time:m.time,touches:m.touches,athletes:m.players.length,passes:m.passes,abilityBefore:g.save.data.life.sports.ability};
          if(!m.rank)throw Error(JSON.stringify({...summary,owner:m.owner,ball:m.ball,message:m.message,positions:m.players.map(p=>[p.x,p.z])}));
          ss.update(.02);return {...summary,ability:g.save.data.life.sports.ability,coins:g.save.data.life.coins,payout:ss.result.shells};
        }""")
        print(result,flush=True);results[sport]=result
        assert result['payout']>0
        if sport=='swim':shot(page,'result-'+('portrait' if portrait else 'wide'))
        panel.get_by_text('F1 帮助').click();page.get_by_text('回到现场',exact=True).click()
        panel.get_by_text('换伙伴',exact=True).click()
        panel.get_by_role('combobox').last.select_option(index=0)
        panel.get_by_text('开始比赛').click();panel.get_by_text('退出比赛').click()
        assert not page.evaluate('ss.active')
        assert page.evaluate('g.save.data.life.coins')==result['coins']
    assert not errors,errors
    persisted=page.evaluate("JSON.parse(localStorage.getItem('slimefable.web.save.v1')).life")
    assert persisted['coins']==result['coins'] and persisted['sports']['matches']==len([k for k in results if k in ['swim','football','basketball','tennis','badminton']])
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function("window.__game?.state==='play' && __slime.ready",timeout=150000)
    assert page.evaluate('window.__game.save.data.life.sports.matches')==persisted['sports']['matches']
    assert page.evaluate('window.__game.save.data.life.coins')==persisted['coins']
    context.close()
    return results
def legacy(browser,base):
    old={'v':1,'life':{'coins':123,'home':{'expansions':[{'id':'exp-e-s','theme':'jiangnan','unlockedAt':1}],
        'placed':[{'id':'old-tea','itemId':'build-teahall','x':49,'y':.65,'z':58,'scale':1,'yaw':0}],
        'ranch':{'animals':[{'id':'old-pet','speciesId':'ranch-otter','name':'浪花','adoptedAt':1,'affection':80,'mood':90}]}}}}
    ctx=browser.new_context(viewport={'width':900,'height':650})
    ctx.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve();if(!localStorage.getItem('"+KEY+"'))localStorage.setItem('"+KEY+"',"+json.dumps(json.dumps(old))+");")
    p=ctx.new_page();p.goto(base,wait_until='domcontentloaded')
    p.wait_for_function("window.__game?.state==='play' && __slime.ready",timeout=150000)
    state=p.evaluate("""async()=>{const g=__game;await g.sportsPark.ready;g.app.renderer.setAnimationLoop(null);
      const life=g.save.data.life,c=g.sportsPark.courts.find(c=>c.sport==='swim');g.sports.open(c);
      return {gx:life.sports.site,ability:life.sports.ability,coins:life.coins,oldBuilding:life.home.placed.find(p=>p.id==='old-tea')?.x,
      oldLot:life.home.expansions[0].id,poolX:c.x,namedPet:g.sports.choices.some(a=>a.name==='浪花')};}""")
    assert state=={'gx':2,'ability':50,'coins':123,'oldBuilding':49,'oldLot':'exp-e-s','poolX':91,'namedPet':True},state
    ctx.close();return state
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--base',default='http://127.0.0.1:5180');args=ap.parse_args()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-webgl','--use-gl=angle','--ignore-gpu-blocklist'])
        data={k:run(browser,args.base,k=='portrait') for k in ['wide','portrait']}
        data['legacy']=legacy(browser,args.base)
        (OUT/'home-sports-results.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
        browser.close()
