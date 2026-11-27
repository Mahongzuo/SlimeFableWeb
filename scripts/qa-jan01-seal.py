"""Drive the real January seal chapter using movement keys and UI in headless Chrome."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:5190')
parser.add_argument('--practice', action='store_true')
parser.add_argument('--keep-gap', action='store_true',help='Keep the imperfect print and collect it.')
args = parser.parse_args()
evidence = Path(__file__).resolve().parents[1] / 'qa' / 'evidence'
driver = """async ({action, point, expect})=>{
 const level=window.__level, a=window.__slime, diag=level.game.diagnostics;
 const s=diag.state;
 const keys=['KeyW','KeyA','KeyS','KeyD'];
 const hold=(k,on)=>window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code:k,bubbles:true}));
 const wait=()=>new Promise(requestAnimationFrame);
 const stop=()=>keys.forEach(k=>hold(k,false));
 const tick=async()=>{await wait();const render=level.stage.render;level.stage.render=()=>{};
  try{for(let i=0;i<3;i++)level.step(.028);}finally{level.stage.render=render;}};
 if(action==='walk'){
  for(let i=0;i<180;i++){const dx=point[0]-a.position[0],dz=point[2]-a.position[2];
   if(Math.hypot(dx,dz)<.26&&(!expect||s.phase===expect)){stop();return s.phase;}
   hold('KeyA',dx<-.08);hold('KeyD',dx>.08);hold('KeyW',dz<-.08);hold('KeyS',dz>.08);
   await tick();}
  stop();throw Error('walk '+JSON.stringify({point,pos:a.position,state:s,cling:a.cling}));
 }
 for(let i=0;i<210;i++){if(expect==='pinned'?s.pinned:level.phase===expect)return true;await tick();}
 throw Error('timeout '+JSON.stringify({expect,s,shots:a.latest?.shots,pos:a.position}));
}"""
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 1000, 'height': 668})
    page.set_default_timeout(45000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
    page.add_init_script("""if(!localStorage.getItem('slimefable.web.save.v1'))
      localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,completed:['0101-shot-ceres'],
        souvenirs:['0101-trial'],life:{coins:41,records:{'0101-1864-gems':3}}}));""")
    page.goto(args.base+'/level.html?id=0101-1864'+('&practice=proof' if args.practice else ''))
    page.locator('.jan-chapter [data-start]:enabled').click()
    page.wait_for_function('__slime.latest?.count>0 && __level.stage.time>1.25')
    def shot(label):
        if args.keep_gap:
            return
        if args.practice:
            if label != 'finale':
                return
            label='practice-'+label
        page.screenshot(path=evidence/f'jan01-seal-{label}.jpg',quality=87)
    def walk(point, expect=None):
        print('walk',point,expect,flush=True)
        return page.evaluate(driver,{'action':'walk','point':point,'expect':expect})
    def key(action):
        page.keyboard.press(action)
    scene=page.evaluate('()=>{const d=__level.game.diagnostics;return {stations:d.stations,corners:d.corners,hidden:d.hiddenImprint}}')
    shot('entry')
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(400)
    shot('portrait')
    # Tap a visible landing place on the case before using desktop controls.
    px=page.evaluate("""()=>{const l=__level,t=l.stage;
      const pt=new t.THREE.Vector3(-3.85,.15,2.40).project(t.camera);
      return [(pt.x+1)*innerWidth/2,(1-pt.y)*innerHeight/2];}""")
    page.mouse.click(*px)
    page.wait_for_function("Math.hypot(__slime.position[0]+3.85,__slime.position[2]-2.40)<.35")
    page.wait_for_function("Math.hypot(__slime.velocity[0],__slime.velocity[2])<.06 && !__slime.keys.size")
    page.set_viewport_size({'width':1000,'height':668})
    key('Space')
    page.wait_for_function("__slime.latest?.grounded===false && __slime.latest.count>0")
    page.wait_for_function("__slime.grounded")
    walk(scene['hidden']);key('f')
    walk(scene['stations'][0],'trial-proof')
    assert not page.evaluate('__level.game.diagnostics.state.printed')
    walk(scene['corners'][0]);key('f')
    assert page.evaluate("__level.game.diagnostics.state.phase==='choose'")
    page.wait_for_function('__level.game.diagnostics.state.trialLift>.9')
    shot('proof')
    station=2 if args.practice else 1
    point=scene['stations'][station]
    walk([point[0],0,point[2]+1.1]);key('f')
    assert page.evaluate("__level.game.diagnostics.state.phase==='stamp'")
    if args.practice and not args.keep_gap:
        walk(point,'proof')
        key('r')
        walk([point[0],0,point[2]+1.05])
    if not args.keep_gap:
        # Approach the curled corner from the open side of the stone. Wait for the
        # independent particle worker after the accelerated keyboard walk.
        walk([point[0]+.72,0,point[2]+1.3])
        page.wait_for_function("""(()=>{const a=__slime,c=a.latest?.centers[0];return c&&Math.hypot(c[0]-a.position[0],c[2]-a.position[2])<.32})()""")
        key('g')
        page.evaluate(driver,{'action':'wait','expect':'pinned'})
    walk(point,'proof')
    assert page.evaluate('__level.game.diagnostics.state.printed') != args.keep_gap
    walk(scene['corners'][station]);key('f')
    page.evaluate(driver,{'action':'wait','expect':'done'})
    shot('finale')
    assert page.evaluate('__level.game.diagnostics.state.hidden')
    assert page.evaluate('__level.game.diagnostics.state.clean') == (not args.practice and not args.keep_gap)
    assert not errors, errors
    report=page.evaluate("""()=>{const l=__level,st=l.stage,r=st.renderer,root=l.game.diagnostics.root;
      r.info.autoReset=false;
      function count(visible){root.visible=visible;r.info.reset();st.render(0,__slime);return r.info.render.calls;}
      const baseline=count(false),calls=count(true)-baseline;r.info.autoReset=true;
      const save=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
      const paper=root.getObjectByName('rice-paper'),state=l.game.diagnostics.state;
      const pos=paper.geometry.attributes.position,uv=paper.geometry.attributes.uv;
      const u=(state.station===1?160:607)/768,v=1-(state.station===1?510:137)/640;
      let nearest=0;for(let j=1;j<uv.count;j++)if(Math.hypot(uv.getX(j)-u,uv.getY(j)-v)<Math.hypot(uv.getX(nearest)-u,uv.getY(nearest)-v))nearest=j;
      const point=new st.THREE.Vector3().fromBufferAttribute(pos,nearest);paper.localToWorld(point);
      const markVisible=[[5,5.2,8],[-3.5,5.7,8]].every(camera=>{
        const eye=new st.THREE.Vector3(...camera),ray=new st.THREE.Raycaster(eye,point.clone().sub(eye).normalize());
        const hits=ray.intersectObject(root,true).filter(h=>h.object.visible);
        return hits.length&&hits[0].object===paper;});
      return {calls,vertices:__slime.latest.count,markVisible,coins:save.life.coins,gates:save.homeDaily?.gates??[],
        completed:save.completed,souvenirs:save.souvenirs,records:save.life.records,state};
    }""")
    # Capture both sides of the animated sheet after the last bend.
    for name,eye in [('low',[4.3,1.25,5.8]),('wide',[-6.5,8,10])]:
        page.evaluate("""eye=>{const st=__level.stage;st.renderer.setAnimationLoop(null);
          st.camera.position.set(...eye);st.camera.lookAt(1,.65,0);st.render(.02,__slime);}""",eye)
        shot(name)
    key_prefix='0101-1864'+('-practice' if args.practice else '')
    assert report['records'][key_prefix+'-hidden-die']==1
    assert report['coins']==(41 if args.practice else 49)
    assert (1 in report['gates']) != args.practice
    assert report['records']['0101-1864-gems']==3
    assert '0101-trial' in report['souvenirs'] and '0101-shot-ceres' in report['completed']
    assert ('0101-1864' in report['completed']) != args.practice
    print('calls',report['calls'],'vertices',report['vertices'],flush=True)
    assert report['calls']<=150 and report['markVisible'], report
    page.locator('[data-home]').click()
    page.wait_for_url('**/?from=0101-1864&date=0101')
    report['returnUrl']=page.url
    name='gap' if args.keep_gap else 'practice' if args.practice else 'daily'
    (evidence/f'jan01-seal-{name}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()
