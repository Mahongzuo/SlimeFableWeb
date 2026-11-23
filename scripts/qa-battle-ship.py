"""Inspect the ship in an isolated headless Vite tab. Walk as the actual native player."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5209',help='Vite development server')
parser.add_argument('--play-base',help='Optional production URL for the gate-to-gate playthrough')
args=parser.parse_args()
base=args.base
evidence=Path(__file__).resolve().parents[1]/'qa'/'evidence'

with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':960,'height':580})
    page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
    page.route('**/__ship-route-qa',lambda r:r.fulfill(content_type='text/html',body='<style>*{margin:0}body{overflow:hidden}</style>'))
    page.goto(base+'/__ship-route-qa')
    page.evaluate("""async()=>{
      const {Stage}=await import('/src/level/stage.ts'),{battleLook}=await import('/src/themes/battle-preview.ts');
      const {buildBattleShip,shipWorld}=await import('/src/themes/battle-ship.ts');
      const {SlimeCharacter}=await import('/src/slime/character.ts');
      const stage=new Stage(battleLook(true)),ship=buildBattleShip(stage);
      stage.renderer.setPixelRatio(1);
      const actor=new SlimeCharacter(stage,{spawn:[0,0,4],world:shipWorld(),trainingTargets:[],battleTargets:[],
        defaultAim:true,input:true,ui:false}).attach();
      Object.assign(window,{stage,ship,actor,clock:0});
      window.tick=()=>{clock+=1/60;actor.update(clock,1/60);ship.update(clock)};
      for(let i=0;i<1000&&!actor.ready;i++){tick();await new Promise(r=>setTimeout(r,10))}
      if(!actor.ready)throw Error('native actor startup timed out');
      actor.play();
      window.walk=async path=>{
        const out=[];
        dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));
        for(const [x,z] of path){
          let n=0;
          for(;n<500;n++){
            const dx=x-actor.position[0],dz=z-actor.position[2];
            if(Math.hypot(dx,dz)<.09)break;
            actor.yaw=Math.atan2(-dx,-dz);
            tick();
            if(n%8===0)await new Promise(r=>setTimeout(r,2));
          }
          if(n===500)throw Error('Native player stuck en route to '+[x,z]+' at '+actor.position);
          out.push([...actor.position]);
        }
        dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));
        for(let i=0;i<30;i++){tick();await new Promise(r=>setTimeout(r,5))}
        return out;
      };
    }""")
    page.evaluate("""()=>{
      const THREE=stage.THREE,wood=stage.scene.getObjectByName('ship joinery'),ray=new THREE.Raycaster();
      const seam=[[4.21,-.614,0],[4.21,-.586,0],[-4.11,6.535,2.1],[-4.11,6.565,2.1],
        [3.236,-5.77,0],[3.264,-5.77,-2.45]];
      for(const [x,z,y] of seam){
        ray.set(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0));
        const hits=ray.intersectObject(wood);
        if(!hits.length||Math.abs(hits[0].point.y-y)>.002||hits.filter(h=>Math.abs(h.point.y-y)<.002).length!==1)
          throw Error('overlapping or missing top at '+[x,z,y]);
        if(Math.abs(actor.world.support(x,z,y)-y)>.001)throw Error('collision mismatch at hatch rim');
      }
    }""")
    for route,expected in [
        ([[0,.43],[-4.22,.43],[-4.22,6.88],[0,7.18]],2.1),
        ([[4.22,7.18],[4.22,.4]],0),
        ([[4.22,-5.64],[0,-5.64]],-2.45),
        ([[-4.22,-5.64],[-4.22,.42],[0,.42]],0),
    ]:
        walked=page.evaluate('p=>walk(p)',route)
        assert abs(walked[-1][1]-expected)<.1,walked
    print('PASS native player walked both upper stairs and the full below-deck loop',flush=True)
    for label,eye,target in [
       ('overview',[11.5,10.4,17],[-.4,.3,-.6]),
       ('hatch-oblique',[4.67,1.34,1.2],[4.1,-.95,-3.38]),
       ('hatch-low',[4.27,-.66,-3.55],[4.2,.12,-.47]),
       ('cargo-passage',[4.34,-1.63,-5.71],[-2.55,-1.55,-5.44]),
       ('quarterdeck',[-3.66,3.32,8.12],[.1,.03,-3.15])]:
        page.evaluate("""([eye,target])=>{stage.camera.position.fromArray(eye);stage.camera.lookAt(...target);
        stage.camera.updateMatrixWorld();stage.render(2)}""",[eye,target])
        page.locator('canvas').first.screenshot(path=evidence/('1021-ship-'+label+'.jpg'),quality=87)
    assert page.evaluate('actor.latest.count')>0
    browser.close()

if args.play_base:
    import subprocess, sys
    subprocess.run([sys.executable,str(Path(__file__).with_name('qa-battle-fleet-play.py')),'--base',args.play_base],check=True)
