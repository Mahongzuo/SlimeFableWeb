"""Headless mobile orchard regression. The only teleports are the starts of the route fixtures."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright


OUT = Path(__file__).resolve().parents[1] / "qa/evidence"
TILE = {"id": "tile_-3_0", "gx": -3, "gz": 0, "theme": "jiangnan", "unlockedAt": 1}
SEED = {"v": 1, "quality": "low", "homeClockMinute": 810, "homeWeather": "clear",
        "life": {"coins": 250, "bag": {"sapling-apple": 12}, "home": {"expansions": [TILE]}}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:5180")
    base = parser.parse_args().base.rstrip("/")
    report = {"errors": [], "fixture": TILE}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True, args=["--enable-webgl", "--ignore-gpu-blocklist"])
        page = browser.new_page(viewport={"width": 740, "height": 440}, has_touch=True,
                                is_mobile=True, device_scale_factor=1)
        page.on("pageerror", lambda e: report["errors"].append(str(e)))
        page.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
            localStorage.setItem('slimefable.web.save.v1',JSON.stringify(%s));""" % json.dumps(SEED))
        page.goto(base + "/?date=1015", wait_until="domcontentloaded", timeout=120000)
        page.wait_for_function("window.__slime?.ready && ['title','play'].includes(__game.state)", timeout=160000)
        page.evaluate("if(__game.state==='title') __game.start()")
        page.wait_for_function("__slime.latest?.particleCount > 0 && __game.orchard.active", timeout=120000)
        print("Mobile home and soft body ready", flush=True)
        page.evaluate("""()=>{
          const g=__game,o=g.orchard,s=__slime,home=g.save.data.life.home;
          window.positionFixture=(x,z)=>{s.teleport([x,s.world.terrain(x,z)+.02,z]);s.grounded=true;s.keys.clear();};
          // The western bank has a player-built fence; the eastern orchard is beside a rotated house.
          const x=-110.3,z=64.5;
          home.placed.push({id:'orchard-qa-house',itemId:'build-huizhou',x,z,y:s.world.terrain(x,z),yaw:.20,scale:1});
          for(let z=47;z<55;z++)home.voxels.push({x:-135,z,y:Math.floor(s.world.terrain(-134.5,z+.5)+.05),blockId:'vx-fence',shape:'fence'});
          g.builder.rebuildFromSave();
          window.beginOrchardBatch=(x,z)=>{
            window.positionFixture(x,z);o.update(0,true);o.open();o.preview();if(!o.action()||o.state.mode!=='auto')throw Error('no previewed route');
            return o.state.planned[0].slice();
          };
          window.trackOrchard=()=>{
            const site=o.site().site, s=__slime;
            window.routeTrace=[];window.routeTracking=true;
            window.routeSample=()=>{if(!window.routeTracking)return;const [x,y,z]=s.position;
              const last=window.routeTrace.at(-1);
              if(!last||Math.hypot(x-last.x,z-last.z)>.18)
                window.routeTrace.push({x,y,z,swimming:s.swimming,walkable:site.walkable(x,z,.27),mesh:s.latest?.particleCount||0});};
          };
          __app.ctx.onUpdate(()=>window.routeSample?.());
          window.advanceOrchard=async()=>{
            for(let batch=0;batch<100&&o.state.mode==='auto';batch++){
              // Run the same orchard and character updates as Game.update at a fixed 30 Hz.
              // Each burst yields to the renderer and real PBF worker for a visible frame.
              for(let i=0;i<12&&o.state.mode==='auto';i++){
                o.update(1/30,true);s.update(s.elapsed+1/30,1/30);window.routeSample?.();
              }
              await new Promise(requestAnimationFrame);
            }
            return {mode:o.state.mode,completed:o.state.completed,target:o.state.planned[0],position:s.position,route:o.route};
          };
        }""")
        report["lakeAndHouse"] = page.evaluate("""()=>{
          const o=__game.orchard, goal=window.beginOrchardBatch(-114,65), site=o.site().site;
          const sx=-252-goal[0],sz=116-goal[1];let from=null;
          for(let r=0;r<4&&!from;r+=.25)for(let i=0;i<12&&!from;i++){
            let x=sx+r*Math.cos(i*.524),z=sz+r*Math.sin(i*.524);if(site.walkable(x,z))from=[x,z];}
          if(!from)throw Error('opposite pond bank blocked');
          window.positionFixture(...from);window.trackOrchard();window.routeSample();
          return {goal,fromInitialBank:from,nearbyHouse:[-110.3,64.5],nearbyFence:[-135,47,-135,54],
            parcelFences:__slime.world.boxes.filter(b=>b.name.startsWith('parcel-fence')).length};
        }""")
        print("Lake walk",report["lakeAndHouse"],flush=True)
        outcome=page.evaluate("window.advanceOrchard()")
        assert outcome["mode"]=="idle", outcome
        report["lakeAndHouse"].update(page.evaluate("""()=>{
          window.routeTracking=false;
          const t=window.routeTrace;let distance=0;
          for(let i=1;i<t.length;i++)distance+=Math.hypot(t[i].x-t[i-1].x,t[i].z-t[i-1].z);
          const houseClearance=Math.min(...t.map(p=>Math.hypot(Math.max(0,Math.abs(p.x+110.3)-2.5),Math.max(0,Math.abs(p.z-64.5)-2))));
          const fenceClearance=Math.min(...t.map(p=>Math.hypot(Math.max(0,Math.abs(p.x+134.5)-.35),Math.max(47.15-p.z,0,p.z-54.85))));
          return {completed:__game.orchard.state.completed,trace:t,distance,houseClearance,fenceClearance};
        }"""))
        first = report["lakeAndHouse"]
        print("Pond route",first["completed"],round(first["distance"],2),"metres",flush=True)
        assert first["completed"] == 1 and len(first["trace"]) > 20, first
        assert first["houseClearance"]<4.3 and first["fenceClearance"]<2, (first["houseClearance"],first["fenceClearance"])
        invalid=[p for p in first["trace"] if p["swimming"] or not p["walkable"] or p["mesh"] <= 0]
        assert not invalid,invalid[:6]
        page.screenshot(path=OUT / "orchard-navigation-pond.jpg", type="jpeg", quality=86)
        report["blockedGoal"] = page.evaluate("""()=>{
          const s=__slime,g=__game,o=g.orchard,goal=window.beginOrchardBatch(-113,72);
          // Close a complete 7 m pen after preview. The selected tree remains legal at its centre.
          const gx=Math.floor(goal[0]),gz=Math.floor(goal[1]),home=g.save.data.life.home;
          for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++)if(Math.max(Math.abs(i),Math.abs(j))===3){
            const x=gx+i,z=gz+j;
            home.voxels.push({x,z,y:Math.floor(s.world.terrain(x+.5,z+.5)+.05),blockId:'vx-fence',shape:'fence'});
          }
          g.builder.rebuildFromSave();window.positionFixture(-139,74);
          return {goal,bagBefore:g.save.data.life.bag['sapling-apple']||0};
        }""")
        print("Enclosed destination",report["blockedGoal"],flush=True)
        outcome=page.evaluate("window.advanceOrchard()")
        assert outcome["mode"]=="idle", outcome
        report["blockedGoal"].update(page.evaluate("""()=>{
          const l=__game.save.data.life,t=l.home.trees.at(-1);
          return {newTree:[t.x,t.z], completed:__game.orchard.state.completed,bagAfter:l.bag['sapling-apple']||0};
        }"""))
        block = report["blockedGoal"]
        assert block["completed"] == 1 and block["goal"] != block["newTree"], block
        assert block["bagAfter"] == block["bagBefore"] - 1
        report["touch"] = page.evaluate("""()=>{
          const p=window.beginOrchardBatch(-115,40);window.positionFixture(-139,74);
          return {goal:p,bagBefore:__game.save.data.life.bag['sapling-apple']};
        }""")
        pad = page.locator("[data-orchard-pad]").bounding_box()
        assert pad, "touch movement pad missing"
        x,y=pad["x"]+pad["width"]/2,pad["y"]+pad["height"]/2
        client=page.context.new_cdp_session(page)
        for kind,px in [("touchStart",x),("touchMove",x+30)]:
            client.send("Input.dispatchTouchEvent",{"type":kind,"touchPoints":[{"x":px,"y":y}]})
        page.wait_for_function("__game.orchard.state.mode==='idle'&&__game.orchard.stick", timeout=15000)
        start=page.evaluate("__slime.position.slice()")
        page.wait_for_function("p=>Math.hypot(__slime.position[0]-p[0],__slime.position[2]-p[2])>.4", arg=start,timeout=20000)
        client.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
        report["touch"].update(page.evaluate("""()=>({mode:__game.orchard.state.mode,
          bagAfter:__game.save.data.life.bag['sapling-apple'],finalPosition:__slime.position.slice(),stick:__game.orchard.stick})"""))
        assert report["touch"]["bagBefore"]==report["touch"]["bagAfter"] and report["touch"]["stick"] is None
        browser.close()
    (OUT/"orchard-navigation.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    assert not report["errors"], report["errors"]
    print("Pond walk, blocked target replacement and touch takeover passed", flush=True)


if __name__ == "__main__":
    main()
