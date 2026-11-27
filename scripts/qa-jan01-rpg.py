"""Drive both rink abilities with virtual keys in isolated headless Chrome."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parents[1]/'qa'/'evidence'
DRIVER="""async action=>{
  const l=__level,b=l.battle,a=__slime;
  const key=(code,type)=>dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
  const tap=k=>{key(k,'keydown');key(k,'keyup')};
  const keys=['KeyA','KeyD','KeyW','KeyS'];
  const stop=()=>keys.forEach(k=>key(k,'keyup'));
  const rink=l.stage.scene.getObjectByName('january-arena'),net=rink.children.find(m=>m.isLineSegments);
  const tick=async()=>{await new Promise(requestAnimationFrame);const render=l.stage.render;l.stage.render=()=>{};
    try{for(let i=0;i<4;i++){
      l.step(.04);
      if(action==='goals'&&b.round>0&&net.geometry.attributes.position.array.some((x,i)=>i%3===2&&x< -9.60))
        window.netCaughtGoal=true;
    }}finally{l.stage.render=render}};
  const steer=(p,r=.24)=>{const dx=p[0]-a.position[0],dz=p[2]-a.position[2];
    [dx<-r,dx>r,dz<-r,dz>r].forEach((on,i)=>key(keys[i],on?'keydown':'keyup'));
    return Math.hypot(dx,dz)};
  const walk=async p=>{for(let i=0;i<220;i++){if(steer(p)<.37){stop();return}await tick()}
    throw Error('walk '+JSON.stringify([p,a.position,b.phase]))};
  if(action==='warm'){
    await walk(b.layout.warm);key('KeyC','keydown');await walk([.9,0,5.6]);key('KeyC','keyup');
    await walk([.12,0,5.57]);for(let i=0;i<8;i++)await tick();tap('KeyF');
    if(b.phase!=='route')throw Error('warm '+JSON.stringify([a.position,l.warmed]));
  }
  if(action==='left'||action==='right'){await walk(b.layout.branches[action==='left'?0:1]);tap('KeyF');}
  if(action==='miss'){tap('KeyJ');for(let i=0;i<9;i++)await tick();
    if(b.errors<1||b.round!==0||Math.abs(a.position[2]-b.z)>1.7)throw Error('checkpoint');}
  if(action==='goals'){
    for(let i=0;i<600&&b.phase==='duel';i++){
      const d=steer(b.safeSpot,.13);
      if(d<.65){stop();if(b.cue==='open')tap('KeyJ');}
      await tick();
    }
    stop();if(b.phase!=='finale')throw Error('duel '+JSON.stringify([b.phase,b.round,b.health,a.position]));
  }
  if(action==='finish'){await walk(b.layout.end);tap('KeyF');for(let i=0;i<18;i++)await tick();}
  return [b.phase,b.round,b.errors];
}"""

def photo(page,label):
    page.screenshot(path=OUT/('jan01-rpg-'+label+'.jpg'),quality=88)

def main(base):
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        ctx=browser.new_context(viewport={'width':960,'height':650})
        ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
           if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
           JSON.stringify({v:1,quality:'low',souvenirs:['0101-trial']}))""")
        page=ctx.new_page()
        page.set_default_timeout(60000)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        for index,branch in enumerate(['left','right']):
            if index:page.set_viewport_size({'width':390,'height':844})
            page.goto(base+'/level.html?id=0101-rpg'+('&practice=rink' if index else ''))
            page.wait_for_function('window.__slime?.latest?.count>100 && __level.stage.time>1.4')
            page.evaluate("""()=>{window.rinkShapes=new Set();const sample=()=>{
              const radius=__slime.latest?.radii?.[0];if(radius)rinkShapes.add(radius.map(v=>v.toFixed(3)).join(','));
              if(__level.phase!=='curtain')requestAnimationFrame(sample)};sample()}""")
            if not index:photo(page,'tunnel')
            if not index:
                calls=page.evaluate("""()=>{const s=__level.stage,root=s.scene.getObjectByName('january-arena');
                  const info=s.renderer.info,old=info.autoReset;info.autoReset=false;
                  const draw=on=>{root.visible=on;info.reset();s.render(0,__slime);return info.render.calls};
                  const baseline=draw(false),full=draw(true);info.autoReset=old;return full-baseline}""")
                assert 0<calls<=150,calls
                print('rink added calls',calls,flush=True)
            page.locator('[data-start]').click()
            for action in ['warm',branch]+([] if index else ['miss'])+['goals','finish']:
                result=page.evaluate(DRIVER,action)
                print(branch,action,result,flush=True)
                if action==branch:
                    page.wait_for_timeout(450)
                    photo(page,'portrait' if index else 'keeper')
                    if not index:
                        for label,eye in [('low',[1.5,1.3,-3]),('far',[4.6,7,3])]:
                            page.evaluate("""eye=>{const s=__level.stage;window.originalRender=s.render;
                              s.render=function(dt,a){s.camera.position.fromArray(eye);s.camera.lookAt(0,1,-8);originalRender.call(s,dt,a)}}""",eye)
                            page.wait_for_timeout(150);photo(page,label)
                            page.evaluate('()=>{__level.stage.render=originalRender}')
                if action=='goals':photo(page,'goal-'+branch)
            assert page.evaluate('rinkShapes.size>1 && __slime.latest.count>100 && window.netCaughtGoal')
            page.locator('[data-mode-home]').click()
            page.wait_for_url('**/?date=0101&from=0101-rpg',wait_until='commit')
            saved=page.evaluate("JSON.parse(localStorage.getItem('slimefable.web.save.v1'))")
            key='0101-rpg-winter-classic-'+('practice' if index else 'daily')
            assert saved['life']['records'][key+'-wins']==1
            assert saved['life']['records'][key+'-routes']==(2 if index else 1)
            assert '0101-trial' in saved['souvenirs']
        assert not errors,errors
        browser.close()

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default='http://127.0.0.1:5190')
    main(parser.parse_args().base.rstrip('/'))
