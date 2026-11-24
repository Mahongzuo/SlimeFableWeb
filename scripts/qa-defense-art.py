"""Preview every defense silhouette and confirm the forty world-space touch targets in a private tab."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5209',help='Vite development server')
base=parser.parse_args().base
out=Path(__file__).resolve().parents[1]/'qa/evidence'
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    for name,width,height in [('wide',1100,680),('portrait',390,844)]:
        page=b.new_page(viewport={'width':width,'height':height},has_touch=name=='portrait')
        page.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
        page.route('**/__relay',lambda r:r.fulfill(content_type='text/html',body='<style>*{margin:0}body{overflow:hidden}</style>'))
        page.goto(base+'/__relay')
        page.evaluate("""async()=>{
          const {createDefenseScene}=await import('/src/themes/defense.ts'),{DefenseGame}=await import('/src/templates/defense.ts');
          const game=new DefenseGame('art fixture'),cells=[];
          const view=createDefenseScene((l,c)=>{cells.push([l,c]);view.select(l,c)});
          Object.assign(window,{game,view,cells});
          game.start(['water','wind','thunder','physical']);
          // Art fixture. The campaign runtime and its two playable builds are tested separately.
          game.wave=6;
          const kinds=['water','wind','fire','thunder','dark','physical','dew'];
          for(let i=0;i<12;i++)game.towers.push({id:i+1,kind:kinds[i%7],col:i<5?1:i<10?3:4,lane:i%5,hp:80,maxHp:80,jammedUntil:0});
          for(let i=0;i<7;i++)game.enemies.push({id:i+20,kind:['noise','echo','detune'][i%3],lane:i%5,x:6+.21*(i%4),hp:45,maxHp:60,shadow:i===4});
          game.effects.push({id:200,lane:2,fromLane:2,fromX:3.5,x:6.3,kind:'shot',element:'thunder',life:.33,maxLife:.6});
          let time=3;for(let i=0;i<120&&!view.actor.latest?.count;i++){view.update(game,time+=.03,.03);await new Promise(r=>setTimeout(r,9))}
          view.stage.time=2;view.update(game,time+.5,.05);
        }""")
        assert page.evaluate('view.actor.latest?.count>0'),'native fluid mesh did not appear'
        for lane in range(5):
            for col in range(8):
                pt=page.evaluate('([l,c])=>view.cellScreen(l,c)',[lane,col])
                assert 0<pt['x']<width and 0<pt['y']<height,(lane,col,pt)
                if name=='portrait':
                    page.touchscreen.tap(pt['x'],pt['y'])
                else:
                    page.mouse.click(pt['x'],pt['y'])
        assert page.evaluate('cells')==[[l,c] for l in range(5) for c in range(8)]
        print(name,page.evaluate('({verified:cells.length,first:view.cellScreen(0,0),last:view.cellScreen(4,7),surfaceVertices:view.actor.latest.count})'))
        page.evaluate('view.select(1,3);view.update(game,6,.04)')
        page.screenshot(path=out/('1116-defense-art-'+name+'.jpg'),quality=91)
        if name=='wide':
            page.evaluate("game.phase='won';game.enemies.length=0;game.effects.length=0;view.update(game,7,.03);view.update(game,9.2,.03)")
            page.screenshot(path=out/'1116-defense-transmitter-art.jpg',quality=92)
        page.close()
    b.close()
