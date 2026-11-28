"""Check meadow contact, wind and park drinking fountains in an isolated production page."""
import argparse
import base64
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

spec = importlib.util.spec_from_file_location("qa", Path(__file__).with_name("qa-home-orchard.py"))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def capture(browser, base, edition):
    errors = []
    page = qa.new_home(browser, base, empty=True, errors=errors)
    page.evaluate("""()=>{
      window.standAt=(x,z,h)=>{const s=__slime;
        s.teleport([x,s.world.terrain(x,z)+h,z]);s.yaw=0;s.keys.clear();};
      window.measuredFrames=n=>new Promise(resolve=>{
        const samples=[];function next(){const u=__app.ctx.U,s=__slime;
          samples.push({pos:s.position.slice(),grounded:s.grounded,r:u.uSlimePos.value.w,
            trail:u.uMeadowTrail.value.map(p=>p.w),wind:u.uMeadowWind?.value,phase:u.uMeadowPhase?.value});
          if(samples.length>=n)resolve(samples);else requestAnimationFrame(next);}requestAnimationFrame(next);});
      standAt(9,51,.12);
    }""")
    page.wait_for_function("__slime.grounded && __app.ctx.U.uSlimePos.value.w>0")
    page.wait_for_timeout(900)
    idle = page.evaluate("measuredFrames(55)")
    page.keyboard.down("a")
    walk = page.evaluate("measuredFrames(26)")
    page.keyboard.up("a")
    page.keyboard.press("Space")
    jump = page.evaluate("measuredFrames(20)")
    page.evaluate("standAt(9,55,.72)")
    page.wait_for_function("__slime.grounded && __slime.position[1]-__slime.world.terrain(9,55)>.4")
    page.wait_for_timeout(800)
    seat = page.evaluate("measuredFrames(50)")
    fixtures = page.evaluate("""()=>[[17,38],[9,55],[-3,70],[7,76]].map(([bx,z])=>{
      const x=bx-1.85,w=__slime.world,y=w.terrain(x,z);
      // The bench fills the east approach. Walk the open sides and ray-test all four basin faces.
      const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
      const probes=dirs.slice(1).map(([dx,dz])=>{
        const hit=w.moveCapsule([x+dx*.94,y+.05,z+dz*.94],[-dx,0,-dz],.27,.56);
        return {blocked:hit.squeezed,distance:(hit.position[0]-x)*dx+(hit.position[2]-z)*dz};
      });
      const side=(height,zOffset=0)=>{const hit=w.cast([x-.85,y+height,z+zOffset],[x+.85,y+height,z+zOffset],0,true);
        return hit ? hit.point[0]-x : null;};
      const rimEdges=dirs.map(([dx,dz])=>{
        const hit=w.cast([x+dx*.53,y+.94,z+dz*.53],[x,y+.94,z],0,true);
        return hit ? (hit.point[0]-x)*dx+(hit.point[2]-z)*dz : null;
      });
      const expected=w.boxes.filter(b=>b.name.startsWith('park-drinking-fountain-')&&Math.abs((b.max[0]+b.min[0])/2-x)<.01&&Math.abs((b.max[2]+b.min[2])/2-z)<.4);
      return {x,z,boxes:expected.length,probes,rimEdges,pedestal:side(.45),rim:side(.96),spout:side(1.30,.10),
        top:w.support(x+.32,z,y+1.08,true)-y};
    })""")
    page.evaluate("""()=>{
      __game.ui.showHud(false);__game.life.show(false);const x=9,z=55,y=__slime.world.terrain(x,z);
      __app.ctx.onUpdate(()=>{__app.camera.position.set(x-1.25,y+1.62,z-3.55);
        __app.camera.lookAt(x-.73,y+.65,z);__app.camera.updateMatrixWorld();});
      __homeCalib.setInstantExposure(true);
    }""")
    page.wait_for_timeout(280)
    page.screenshot(path=qa.OUT/f"meadow-motion-{edition}.jpg", type="jpeg", quality=90)
    # Exercise a calm-to-storm transition through the live weather director.
    page.evaluate("__app.director.mode='mist'")
    page.wait_for_timeout(300)
    page.evaluate("__app.director.mode='rain'")
    weather = page.evaluate("measuredFrames(150)")
    if edition == "after":
        # Record the renderer's own canvas on the fixed bench camera once the gust has built up.
        video = page.evaluate("""async()=>{
          const stream=__app.renderer.domElement.captureStream(24);
          const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:3200000}),parts=[];
          recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
          const stopped=new Promise(r=>recorder.onstop=r);
          recorder.start();await new Promise(r=>setTimeout(r,4500));recorder.stop();await stopped;
          for(const track of stream.getTracks())track.stop();
          return await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result.split(',')[1]);
            reader.readAsDataURL(new Blob(parts,{type:'video/webm'}));});
        }""")
        (qa.OUT/"meadow-motion-wind.webm").write_bytes(base64.b64decode(video))
        # Approach the screenshot's pedestal using real movement from the open side of the path.
        page.evaluate("standAt(7.15,53.4,.05)")
        page.wait_for_function("__slime.grounded")
        page.keyboard.down("s")
        page.wait_for_timeout(1250)
        page.keyboard.up("s")
        body = page.evaluate("({pos:__slime.position.slice(),particles:__slime.latest.particleCount})")
    diag = page.evaluate("(__app.renderer.info.programs??[]).filter(p=>p.diagnostics?.runnable===false).map(p=>p.name)")
    def stats(s):
        return {"radiusRange":[min(p["r"] for p in s),max(p["r"] for p in s)],
                "frames":len(s),"maxTrail":max(max(p["trail"]) for p in s)}
    result=dict(idle=stats(idle),walking=stats(walk),jump=stats(jump),bench=stats(seat),fountains=fixtures,
                errors=errors, shaderErrors=diag)
    if edition=="after":
        result["walkAgainstPedestal"]=body
        result["windChange"]=[weather[0]["wind"],weather[-1]["wind"]]
        result["maxPhaseStep"]=max(b["phase"]-a["phase"] for a,b in zip(weather,weather[1:]))
        assert result["maxPhaseStep"] <= .052801
        # The same foot-height query also covers the four purchased expansion themes.
        plots=qa.new_home(browser,base,errors=errors)
        result["expansions"] = {}
        for tile in qa.TILES:
            plots.evaluate("""id=>{
              const manager=__app.ctx.grassField, w=__slime.world;
              const region=[...manager.frontier.values()].find(f=>f.group.name==='grass-expansion-'+id);
              const s=region.surface;
              const site=s.cells.find(p=>p.x>s.area.min[0]+2 && p.x<s.area.max[0]-2 &&
                p.z>s.area.min[1]+2 && p.z<s.area.max[1]-2 &&
                s.sample(p.x,p.z,1)>.75 && s.sample(p.x,p.z,3)>.98 &&
                Math.abs(w.support(p.x,p.z)-s.sample(p.x,p.z))<.05 &&
                Math.abs(w.terrain(p.x,p.z)-s.sample(p.x,p.z))<.05);
              if(!site)throw Error('Missing test ground for '+id);
              __slime.teleport([site.x,s.sample(site.x,site.z)+.035,site.z]);}""",tile["id"])
            plots.wait_for_function("""()=>{const foot=__app.ctx.U.uSlimePos.value, pos=__slime.position;
                return __slime.grounded && foot.x===pos[0] && foot.z===pos[2] && foot.w===.48;}""")
            result["expansions"][tile["theme"]]=plots.evaluate("__app.ctx.U.uSlimePos.value.w")
        plots.close()
    (qa.OUT/f"meadow-motion-{edition}.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    if edition=="after":
        assert result["idle"]["maxTrail"] == 0 and result["idle"]["radiusRange"] == [.48,.48], result["idle"]
        assert result["bench"]["radiusRange"] == [0,0] and result["bench"]["maxTrail"] == 0, result["bench"]
        assert result["walking"]["maxTrail"] > .15 and result["jump"]["radiusRange"][0]==0
        assert 0 <= weather[0]["wind"] < weather[-1]["wind"] <= .8
        assert all(b["phase"]>=a["phase"] for a,b in zip(weather,weather[1:]))
        assert 54.2 < body["pos"][2] < 54.65 and body["particles"]>0, body
        for f in fixtures:
            assert f["boxes"]>=4 and all(p["blocked"] and p["distance"]>.45 for p in f["probes"]), f
            assert -.24<f["pedestal"]<-.20 and -.39<f["rim"]<-.36 and abs(f["spout"])<.06, f
            assert all(abs(hit-size)<.005 for hit,size in zip(f["rimEdges"],[.375,.325,.375,.325])),f
            assert 1.00 < f["top"] < 1.06, f
    assert not errors and not diag,(errors,diag)
    print(json.dumps(result,ensure_ascii=False)[:950])
    page.close()


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("edition",choices=["before","after"])
    parser.add_argument("--dir",type=Path,default=qa.ROOT/"dist")
    args=parser.parse_args()
    with sync_playwright() as pw, qa.serve(args.dir.resolve()) as base:
        browser=pw.chromium.launch(channel="chrome",headless=True,args=["--use-gl=angle","--enable-webgl","--ignore-gpu-blocklist"])
        capture(browser,base,args.edition)
        browser.close()
