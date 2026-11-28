"""Record the production home riverbank without touching the desktop."""
import argparse
import base64
import importlib.util
import io
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location("home_qa", Path(__file__).with_name("qa-home-orchard.py"))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def run(browser, base, edition):
    errors = []
    page = qa.new_home(browser, base, empty=True, errors=errors)
    page.evaluate("""()=>{
      const s=__slime,x=-11.5,z=4;
      s.teleport([x,s.world.terrain(x,z)+.055,z]);
      __game.ui.showHud(false);__game.life.show(false);
      const style=document.createElement('style');
      style.textContent='body>div:not(:has(canvas)){visibility:hidden!important}';document.head.append(style);
      window.rainCamera=[[x-2.15,1.7,z+2.65],[x+.6,.38,z-.8]];
      __app.ctx.onUpdate(()=>{const c=__app.camera;c.position.fromArray(rainCamera[0]);
        c.lookAt(...rainCamera[1]);c.updateMatrixWorld();});
      __homeCalib.setView(...rainCamera,810,'rain');
    }""")
    page.wait_for_function("__app.ctx.U.uRain.value>.95 && __slime.grounded")
    page.wait_for_timeout(1100)
    page.screenshot(path=qa.OUT/f"rain-impacts-{edition}.jpg",type="jpeg",quality=94)
    assert not errors, errors
    return page,errors


def verify(page,errors):
    page.evaluate("""()=>{
      const a=__app,s=__slime,p=a.pipeline??a.ctx.pipeline;
      const render=p.render.bind(p);
      p.render=(dt,...args)=>{window.lastRainArgs=args;return render(dt,...args);};
      window.drawStill=()=>render(0,...lastRainArgs);
      window.contacts=__app.scene.getObjectByName('garden-rain-splashes-fx');
      window.collectRain=(n,freeze=false)=>new Promise((resolve,reject)=>{
        const hits=contacts.geometry.attributes.impact,kind=contacts.geometry.attributes.bodyHit;
        const stop=__app.scene.getObjectByName('garden-rain-contacts').geometry.attributes.stopped;
        const seen=new Set(),stats={body:0,land:0,grass:0,road:0,air:0,duplicates:0};
        const seeds=contacts.geometry.attributes.seed,cycles=new Map();
        function frame(){
          const t=a.ctx.U.uTime.value, C=a.ctx.THREE;
          let visibleHit=null;
          for(let i=0;i<hits.count;i++){
            const stamp=hits.getW(i),age=t-stamp;
            if(age<0||age>.24)continue;
            const x=hits.getX(i),y=hits.getY(i),z=hits.getZ(i),isBody=kind.getX(i)===1;
            const v=new C.Vector3(x,y,z).project(a.camera);
            if(isBody && stop.getX(i) && age>.035 && age<.15 && Math.abs(v.x)<.72 && Math.abs(v.y)<.72){
              const b=a.ctx.rainBody(), mark=a.ctx.U.uBodyRainHits.value.find(h=>Math.abs(h.w-stamp)<.001);
              if(b && mark){
                const hit=new C.Vector3().fromArray(b.center).add(new C.Vector3().fromArray(b.offset));
                hit.add(new C.Vector3(mark.x*b.radii[0],mark.y*b.radii[1],mark.z*b.radii[2]));
                const n=new C.Vector3(mark.x/b.radii[0],mark.y/b.radii[1],mark.z/b.radii[2]).normalize();
                const facing=n.dot(a.camera.position.clone().sub(hit).normalize());
                if(facing>.7 && n.y>.5){hit.project(a.camera);visibleHit=[hit.x,hit.y];}
              }
            }
            const key=i+'@'+stamp;if(seen.has(key))continue;seen.add(key);
            const seed=seeds.getX(i),id=i+'@'+Math.floor(stamp*(.78+seed*.32)+seed*71);
            if(cycles.has(id)&&cycles.get(id)!==isBody)stats.duplicates++;
            cycles.set(id,isBody);
            if(isBody){stats.body++;if(!s.grounded)stats.air++;}
            else {
              stats.land++;const g=s.world.support(x,z,Infinity,true);
              if(g!==null && y-g>.07 && y-g<.35)stats.grass++;
              if(Math.abs(x+11.45)<.65 && z>-3 && z<8 && Math.abs(y-g)<.06)stats.road++;
            }
          }
          if(freeze&&visibleHit){
            a.renderer.setAnimationLoop(null);
            resolve({stats,visibleHit});return;
          }
          if(--n<=0){if(freeze)reject(Error('No visible soft-body hit'));else resolve(stats);return;}
          requestAnimationFrame(frame);
        }requestAnimationFrame(frame);
      });
    }""")
    report = {"standing":page.evaluate("collectRain(240)")}
    assert report["standing"]["body"]>0 and report["standing"]["land"]>30, report
    assert report["standing"]["road"]>0 and report["standing"]["grass"]>0, report
    page.keyboard.down("c")
    page.wait_for_function("__slime.spread>.9")
    report["spread"]=page.evaluate("collectRain(140)")
    assert report["spread"]["body"]>0, report
    page.keyboard.up("c")
    page.wait_for_function("__slime.spread<.08")
    page.evaluate("""()=>{const [x,,z]=__slime.position;
      rainCamera=[[x-.65,.98,z+1.25],[x,.29,z]];
    }""")
    page.evaluate("collectRain(30)")
    focus=page.evaluate("collectRain(600,true)")
    def pixels():
        return np.asarray(Image.open(io.BytesIO(page.screenshot(type="png"))).convert("RGB"),dtype=np.int16)
    page.evaluate("drawStill()")
    reference=pixels()
    page.screenshot(path=qa.OUT/"rain-impacts-body.jpg",type="jpeg",quality=95)
    page.evaluate("""()=>{const hits=__slime.renderer.material.uniforms.uBodyRainHits.value;
      window.savedRainHits=hits.map(p=>p.w);hits.forEach(p=>p.w=-100);drawStill();}""")
    without_body=pixels()
    h,w=reference.shape[:2]
    px=int(w*(1+focus["visibleHit"][0])/2)
    py=int(h*(1-focus["visibleHit"][1])/2)
    delta=np.max(abs(reference-without_body),axis=2)
    report["bodyPixels"]=int((delta[max(0,py-48):py+49,max(0,px-48):px+49]>12).sum())
    assert report["bodyPixels"]>=3, (report,px,py,int(delta.max()),page.evaluate("({defs:__slime.renderer.material.defines, clock:__slime.renderer.material.uniforms.uRainClock.value, savedRainHits})"))
    page.evaluate("""()=>{__slime.renderer.material.uniforms.uBodyRainHits.value.forEach((p,i)=>p.w=savedRainHits[i]);drawStill();}""")
    reference=pixels()
    page.evaluate("contacts.material.visible=false;drawStill()")
    no_splash=pixels()
    report["splashPixels"]=int((np.max(abs(reference-no_splash),axis=2)>15).sum())
    assert report["splashPixels"]>40,report
    page.evaluate("contacts.material.visible=true;__app.run()")
    # Capture standing, flattening and jumping in ordinary play at the same riverbank.
    page.evaluate("""()=>{
      const [x,,z]=__slime.position;rainCamera=[[x-.8,1.17,z+2.05],[x,.48,z]];
      const stream=__app.renderer.domElement.captureStream(26);
      const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:4200000}),parts=[];
      rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};
      window.rainVideo=new Promise(resolve=>rec.onstop=()=>{for(const t of stream.getTracks())t.stop();
        const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(parts));});
      window.endRainVideo=()=>rec.stop();rec.start();
    }""")
    page.wait_for_timeout(900)
    page.keyboard.down("c")
    page.wait_for_timeout(1000)
    page.keyboard.up("c")
    page.wait_for_timeout(650)
    page.evaluate("()=>{window.jumpRain=collectRain(60);}")
    page.keyboard.press("Space")
    page.wait_for_timeout(1600)
    page.evaluate("endRainVideo()")
    (qa.OUT/"rain-impacts-play.webm").write_bytes(base64.b64decode(page.evaluate("rainVideo")))
    report["jump"]=page.evaluate("jumpRain")
    for _ in range(6):
        if report["jump"]["air"]>0:break
        page.wait_for_function("__slime.grounded")
        page.evaluate("()=>{window.jumpRain=collectRain(65);}")
        page.keyboard.press("Space")
        report["jump"]=page.evaluate("jumpRain")
    assert report["jump"]["air"]>0, report["jump"]
    for condition in ["standing","spread","jump"]:
        assert report[condition]["duplicates"]==0,report
    water=page.evaluate("__app.ctx.rainSurface(-5.55,3)")
    assert water["water"],water
    report["river"]=water
    report["shelter"]=page.evaluate("""()=>{
      const x=-6,z=-4.268,s=__slime,deck=s.world.support(x,z,.75,true),roof=__app.ctx.rainSurface(x,z).height;
      s.teleport([x,deck+.055,z]);return {deck,roof};
    }""")
    assert report["shelter"]["roof"]>report["shelter"]["deck"]+1.5,report["shelter"]
    page.wait_for_function("__slime.grounded && __slime.latest?.generation===__slime.generation")
    page.wait_for_timeout(1600)
    report["shelter"]["bodyHits"]=page.evaluate("collectRain(120)")["body"]
    assert report["shelter"]["bodyHits"]==0,report["shelter"]
    page.evaluate("__homeCalib.setView(...rainCamera,810,'clear')")
    page.wait_for_function("!contacts.visible && !__app.scene.getObjectByName('garden-rain-contacts').visible")
    assert page.evaluate("__app.ctx.U.uBodyRainHits.value.every(h=>h.w<0)")
    report["dry"]=True
    report["errors"]=errors+page.evaluate("(__app.renderer.info.programs??[]).filter(p=>p.diagnostics?.runnable===false).map(p=>p.name)")
    assert not report["errors"],report
    (qa.OUT/"rain-impacts.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("edition",choices=["before","after"])
    parser.add_argument("--dir",type=Path,default=qa.ROOT/"dist")
    args=parser.parse_args()
    with sync_playwright() as pw,qa.serve(args.dir.resolve()) as base:
        browser=pw.chromium.launch(channel="chrome",headless=True,args=["--use-gl=angle","--enable-webgl","--ignore-gpu-blocklist"])
        page, errors=run(browser,base,args.edition)
        if args.edition=="after":verify(page,errors)
        browser.close()
