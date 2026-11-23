"""Inspect the three campaign approaches and the hilltop signal in the game's renderer."""
import socket
import subprocess
import time
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',str(port),'--strictPort'],cwd=ROOT,stdout=subprocess.DEVNULL)
try:
    for _ in range(45):
        try:
            with urlopen(base+'/src/themes/battle-field.ts',timeout=1):break
        except OSError:time.sleep(.2)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        page=browser.new_page(viewport={'width':960,'height':600})
        page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
        page.route('**/field-review',lambda route:route.fulfill(content_type='text/html',body='<!doctype html><body style="margin:0"></body>'))
        page.goto(base+'/field-review')
        page.evaluate("""async()=>{
          const {Stage}=await import('/src/level/stage.ts'),{battleLook}=await import('/src/themes/battle-preview.ts'),
            {buildCampaignField,fieldPoints}=await import('/src/themes/battle-field.ts'),{createBattleRig}=await import('/src/themes/battle-rig.ts');
          const stage=new Stage(battleLook(false)),f=buildCampaignField(stage);
          const rigs=['light','heavy','captain'].map((v,i)=>{const r=createBattleRig(false,v);r.root.position.fromArray(fieldPoints[['left','right','boss'][i]]);stage.scene.add(r.root);return r;});
          let t=0;
          window.show=(camera,at,enraged,won)=>{if(won)rigs.forEach(r=>r.defeat());stage.camera.position.fromArray(camera);stage.camera.lookAt(...at);
            for(let i=0;i<90;i++){t+=1/30;f.update(t,enraged,won);rigs.forEach(r=>{r.setEnraged(enraged);r.update(1/30,0);});}
            stage.render(2);};
        }""")
        for name,eye,look,turned,won in [
            ('field-fork',[0,2.65,-.1],[.6,.9,-9],False,False),
            ('field-hillside',[5.6,2.30,-9.1],[-2.1,.92,-6.9],False,False),
            ('field-command-before',[1.8,1.45,-14.8],[0,1.25,-21],True,False),
            ('field-command',[1.8,1.45,-14.8],[0,1.25,-21],True,True),
            ('field-overview',[-11,17,16],[0,.2,-8],True,True)
        ]:
            page.evaluate('([c,a,p,w])=>show(c,a,p,w)',[eye,look,turned,won])
            page.screenshot(path=str(ROOT/f'qa/evidence/1021-{name}.jpg'),quality=87)
        browser.close()
finally:
    server.terminate();server.wait()
