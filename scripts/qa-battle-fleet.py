"""Inspect both real boarding routes, the shortcut and hatch seams with a native actor."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5209',help='A Vite development server')
base=parser.parse_args().base
evidence=Path(__file__).resolve().parents[1]/'qa'/'evidence'
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1000,'height':610})
    page.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
    page.route('**/__boarding',lambda route:route.fulfill(content_type='text/html',body='<style>*{margin:0}body{overflow:hidden}</style>'))
    page.goto(base+'/__boarding')
    page.evaluate("""async()=>{
      const {Stage}=await import('/src/level/stage.ts'),{battleLook}=await import('/src/themes/battle-preview.ts');
      const {buildFleet,fleetWorld,fleetDynamicBoxes}=await import('/src/themes/battle-fleet.ts');
      const {SlimeCharacter}=await import('/src/slime/character.ts');
      const stage=new Stage(battleLook(true)),fleet=buildFleet(stage);
      stage.renderer.setPixelRatio(1);
      const actor=new SlimeCharacter(stage,{spawn:[0,0,4],world:fleetWorld(),trainingTargets:[],battleTargets:[],
       defaultAim:true,input:true,ui:false}).attach();
      const flags={revealed:false,bridged:false,journal:false,chart:false,guardianDead:false,delivered:false};
      Object.assign(window,{stage,actor,fleet,flags,t:0});
      window.tick=()=>{t+=1/60;actor.update(t,1/60);fleet.update(t,flags);fleet.syncCollision(actor,flags)};
      window.change=patch=>{Object.assign(flags,patch);actor.setDynamicBoxes(fleetDynamicBoxes(flags))};
      change({});
      for(let i=0;i<1000&&!actor.ready;i++){tick();await new Promise(r=>setTimeout(r,6))}
      actor.play();
      window.drive=async(path,expectBlock=false)=>{
       dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));
       for(const [x,z] of path){
        let reached=false;
        for(let i=0;i<400;i++){
         const dx=x-actor.position[0],dz=z-actor.position[2];
         if(Math.hypot(dx,dz)<.09){reached=true;break}
         actor.yaw=Math.atan2(-dx,-dz);tick();
         if(i%12===0)await new Promise(r=>setTimeout(r,2));
        }
        if(!reached&&!expectBlock)throw Error('route to '+[x,z]+' stopped at '+actor.position);
        if(reached&&expectBlock)throw Error('closed hull opening was passable');
       }
       dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));
       for(let i=0;i<25;i++){tick();await new Promise(r=>setTimeout(r,3))}
       return [...actor.position];
      };
    }""")
    def walk(waypoints,height):
        p=page.evaluate('path=>drive(path)',waypoints)
        assert abs(p[1]-height)<.12,p
    def shot(label,eye,target):
        page.evaluate("""([eye,target])=>{stage.camera.position.fromArray(eye);stage.camera.lookAt(...target);
         stage.camera.updateMatrixWorld();stage.render(2)}""",[eye,target])
        page.locator('canvas').first.screenshot(path=evidence/('1021-fleet-'+label+'.jpg'),quality=90)
    walk([[0,.48],[4.20,.48],[4.2,7.5]],2.1)
    page.evaluate('()=>drive([[6.18,7.50]],true)')
    before=page.evaluate("()=>stage.scene.getObjectByName('Blue flag records ship').position.toArray()")
    page.evaluate("()=>{change({revealed:true});for(let i=0;i<95;i++)tick()}")
    mid=page.evaluate("()=>stage.scene.getObjectByName('Blue flag records ship').position.toArray()")
    assert 0<mid[0]<before[0] and mid[2]>before[2]
    assert page.evaluate("""()=>{const b=actor.world.boxes.find(b=>b.name==='archive rear wall');
       return Math.abs(b.min[0]-18.82-stage.scene.getObjectByName('Blue flag records ship').position.x)<.01&&!fleet.docked;}""")
    page.evaluate("()=>{for(let i=0;i<120;i++)tick()}")
    assert page.evaluate("fleet.docked")
    page.evaluate('change({bridged:true})')
    walk([[15.72,7.5],[16.10,7.15]],2.1)
    shot('upper-landing',[12.4,4.07,8.8],[17.22,2.32,6.98])
    walk([[16.11,2.14],[18.81,1.24]],0)
    walk([[18.86,.21],[20.16,.21],[20.16,-5.65],[15.67,-5.65]],-2.45)
    walk([[4.15,-5.65]],-2.45)
    shot('lower-landing',[3.8,-1.21,-6.02],[13.9,-1.75,-5.61])
    walk([[15.68,-5.65],[20.14,-5.65],[20.14,.22],[18.78,.22],[18.81,.91]],0)
    walk([[15.8,1.52]],0)
    page.evaluate('()=>drive([[13.7,1.52]],true)')
    page.evaluate('change({journal:true,chart:true,guardianDead:true})')
    walk([[4.35,1.52],[3.4,1.52],[3.4,4.24],[2.52,4.25]],0)
    page.evaluate('change({delivered:true})')
    page.evaluate('()=>{for(let i=0;i<180;i++)tick()}')
    shot('delivered-chart',[1.54,2.05,4.94],[1.55,.62,4.25])
    shot('overview',[22,12.8,19.1],[8.3,-.35,.05])
    shot('joining-decks',[16.3,.97,.63],[10.2,.15,1.54])
    shot('joining-decks-low',[13.2,.34,1.38],[16.4,.02,1.59])
    assert page.evaluate('actor.latest.count')>0
    print('PASS native actor: locked bridge, upper outbound, underdeck return, lower outbound, optional hatch and chart table.')
    browser.close()

