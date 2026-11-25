"""Render the pilot and its backup in separate headless Chrome profiles."""
import argparse
import json
from urllib.parse import urlparse, parse_qs
from pathlib import Path
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser()
p.add_argument("port", type=int)
p.add_argument("edition", choices=["before", "pilot"])
args = p.parse_args()
base = f"http://127.0.0.1:{args.port}"
out = Path(__file__).resolve().parents[1] / "qa" / "evidence"
report = {"edition": args.edition, "weather": {}, "errors": []}
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel="chrome", headless=True, args=["--enable-unsafe-swiftshader"])
    page = browser.new_page(viewport={"width": 1200, "height": 780})
    page.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
      if(!localStorage.getItem('slimefable.web.save.v1')) localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'medium'}))""")
    requests=[]
    page.on("request",lambda r: requests.append(r.url))
    page.on("pageerror", lambda e: report["errors"].append(str(e)))
    page.on("console", lambda m: report["errors"].append(m.text) if m.type == "error" and 'favicon' not in m.text and '404' not in m.text else None)
    page.goto(base + "/?date=1015")
    page.wait_for_function("window.__slime?.ready && window.__game?.state==='title'", timeout=90000)
    if args.edition=="pilot":
        report["cycle"]=page.evaluate("""()=>[12,64,98,312].map(t=>{
          const {director,ctx}=__app;director.update(t);
          return {time:t,rain:ctx.weather.rain,bow:ctx.weather.rainbow,sun:ctx.weather.sun};})""")
        clear,storm,after,night=report["cycle"]
        assert clear["rain"]==0 and storm["rain"]==1 and after["bow"]>.8 and night["sun"]<.2
    page.evaluate("__game.start(); __slime.pause(); __game.state='review'; __game.ui.showHud(false); __game.life.show(false)")
    page.evaluate("""() => {const a=__app; a.controls.enabled=false;
      const original=a.director.update.bind(a.director);
      a.director.update=()=>{original(12); const w=a.ctx.weather;
        if(window.shot==='rainbow'){w.rain=.25;w.rainbow=1;w.sun=1.02;w.shaft=.9}
        else {w.rain=window.shot==='rain'?1:0;w.rainbow=0}
        for(const k of ['Rain','Sun','Shaft'])a.ctx.U['u'+k].value=w[k.toLowerCase()];
      };
    }""")
    def shot(name, pos, target, weather="rain"):
        page.evaluate("""([p,t,w])=>{window.shot=w; __app.camera.position.fromArray(p);
            __app.camera.lookAt(...t);__app.camera.updateMatrixWorld();__app.step(.035)}""", [pos,target,weather])
        page.screenshot(path=out/f"jiangnan-{args.edition}-{name}.jpg", quality=89, timeout=60000)
        report["weather"][name] = page.evaluate("({rain:__app.ctx.weather.rain,rainbow:__app.ctx.weather.rainbow})")
    page.wait_for_timeout(5400)
    for name in ["clear","rain"]:
        shot(name,[-6.2,4.6,18.3],[10,1.75,17],name)
    shot("rainbow",[-8,5,26],[12,7,-18],"rainbow")
    shot("overlook",[-5,15,41],[11,.6,20],"clear")
    shot("seam",[5,1.0,34],[8,.15,28],"clear")
    shot("seam-side",[11,1.25,28],[8,.15,32],"clear")
    if args.edition=="pilot":
        for name,eye,target in [
            ("waterlane",[8,10,8],[-8,1,-7]),("lake",[23,11,95],[0,0,113]),
            ("farm",[-36,12,17],[-64,2,-7]),("forest",[-60,9,87],[-72,6,95]),
            ("park",[-4,10,47],[16,2,62])]:
            shot(name,eye,target,"clear")
    report["frameMs"] = page.evaluate("(()=>{const measure=()=>{const a=__app,gl=a.renderer.getContext(),pixel=new Uint8Array(4),t=performance.now();for(let i=0;i<10;i++){a.step(1/60);gl.readPixels(1,1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel)}return (performance.now()-t)/10},v=[measure(),measure(),measure()];return v.sort((a,b)=>a-b)[1]})()")
    report["fluid"] = page.evaluate("!!(__slime.latest?.particleCount && __slime.renderer)")
    page.evaluate("__game.state='play'; __game.toggleBuildMode(true); __game.builder.selectItem('pack-pavilion'); __app.step(.035)")
    page.locator('[data-cat=house]').click()
    page.locator('[data-item=pack-pavilion]').click()
    page.screenshot(path=out/f"jiangnan-{args.edition}-build.jpg",quality=89)
    report["gates"]=page.evaluate("__game.portals.map(p=>p.slot.slot)")
    if args.edition=="pilot":
        report["seam"]=page.evaluate("""()=>{const T=__app.ctx.THREE,root=__app.scene.getObjectByName('props-book-quay');
          const mats=[32,34].map(z=>root.children.find(c=>c.position.x===8 && c.position.z===z).children[0]);
          const ray=new T.Raycaster();ray.layers.enableAll();
          const points=[32.99,33.01].map(z=>{ray.set(new T.Vector3(8.17,9,z),new T.Vector3(0,-1,0));
            return ray.intersectObjects(mats,false).map(h=>mats.indexOf(h.object));});
          const edges=mats.map((m,k)=>{const p=m.geometry.attributes.position,out=[];
            for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);
              if(Math.abs(v.z-33)<1e-5)out.push(v);}return out.sort((a,b)=>a.x-b.x);});
          return {rays:points,vertices:edges[0].length,gap:Math.max(...edges[0].map((p,i)=>p.distanceTo(edges[1][i])))};}""")
        assert report["seam"]["rays"]==[[0],[1]] and report["seam"]["vertices"]==7 and report["seam"]["gap"]<.00001
        def act(name):
            page.locator(f'[data-act="{name}"]:visible').first.click()
        def click_world(x,z):
            # Focus the build camera, then use ordinary canvas pointer events.
            px,py=page.evaluate("""([x,z])=>{const b=__game.builder,c=__app.camera,y=b.host.ground(x,z)||0;
              b.camFocus=[x,y,z];b.update(0,.016);
              const p=new __app.ctx.THREE.Vector3(x,y,z).project(c),r=__app.renderer.domElement.getBoundingClientRect();
              return [r.left+(p.x+1)*r.width/2,r.top+(1-p.y)*r.height/2]}""",[x,z])
            page.mouse.click(px,py)
        def state():
            return page.evaluate("""()=>{const l=__game.save.data.life;return {props:l.home.placed,tiles:l.home.paving,coins:l.coins,plots:l.plots}}""")
        page.locator('[data-cat=ground]').click()
        click_world(8,36)
        assert any(t["x"]==8 and t["z"]==36 for t in state()["tiles"]), state()
        for finish,x in [("earth",10),("border",12)]:
            act(finish)
            click_world(x,36)
        assert len(state()["tiles"])==3
        act("undo")
        assert len(state()["tiles"])==2
        act("redo")
        assert len(state()["tiles"])==3
        page.locator('[data-cat=house]').click()
        page.locator('[data-item=pack-pavilion]').click()
        click_world(12,38)
        assert state()["props"][-1]["itemId"]=="pack-pavilion"
        page.locator('[data-cat=farm]').click()
        page.locator('[data-item=farm-bed-wood]').click()
        click_world(-4,47)
        old=state()
        bed=old["props"][-1]
        assert bed["itemId"]=="farm-bed-wood"
        plot="home-plot-"+bed["id"]
        page.evaluate("""id=>{__game.save.data.life.plots[id]={crop:'seed-radish',planted:Date.now(),watered:0,grown:0};__game.save.write()}""",plot)
        act("move")
        click_world(-4,47)
        act("rotate")
        act("scale")
        click_world(-8,50)
        moved=state()
        assert moved["props"][-1]["id"]==bed["id"] and moved["props"][-1]["x"]!=bed["x"] and moved["coins"]==old["coins"]
        assert moved["plots"][plot]["crop"]=="seed-radish"
        act("undo")
        assert state()["props"][-1]==bed
        act("redo")
        assert state()["props"][-1]==moved["props"][-1]
        act("demolish")
        click_world(-8,50)
        assert plot not in state()["plots"] and state()["coins"]==moved["coins"]+8
        act("undo")
        assert state()["plots"][plot]==moved["plots"][plot]
        page.evaluate("__game.save.data.life.coins=120; __game.save.write()")
        page.locator('[data-cat=preset]').click()
        page.locator('[data-preset=preset-jiangnan-court]').click()
        old=state()
        click_world(13,21)
        assert state()==old
        click_world(-5,59)
        new=state()
        assert len(new["props"])==len(old["props"])+6 and sum(p["paidShells"] for p in new["props"][-6:])==45, (old,new)
        act("undo")
        assert state()==old
        act("redo")
        assert state()==new
        act("collapse")
        assert page.locator(".build-dock.folded").count()==1
        act("collapse")
        page.set_viewport_size({"width":390,"height":844})
        rect=page.locator(".build-dock").bounding_box()
        assert rect["y"]>390 and rect["width"]<=390
        page.set_viewport_size({"width":1200,"height":780})
        page.locator('[data-cat=expand]').click()
        page.locator('[data-theme=jiangnan]').click()
        act("confirm-expand")
        expansion=page.evaluate("__game.save.data.life.home.expansions.at(-1)")
        assert expansion and expansion["theme"]=="jiangnan"
        act("undo")
        assert page.evaluate("__game.save.data.life.home.expansions.length")==0
        act("redo")
        assert page.evaluate("__game.save.data.life.home.expansions.at(-1)")==expansion
        report["expansion"]=expansion["id"]
        act("exit")
        page.reload()
        page.wait_for_function("window.__game?.state==='title'",timeout=90000)
        assert state()["props"]==new["props"] and state()["tiles"]==new["tiles"] and state()["plots"][plot]["crop"]=="seed-radish"
        report["edits"]={"tiles":3,"pavilion":True,"cropMoved":True,"groupSize":6,"reload":True,"narrowDrawer":True}
        page.keyboard.press("Enter")
        page.wait_for_function("__game.state==='play'")
        page.keyboard.down("c")
        page.wait_for_function("__slime.spread>.65 && __slime.latest?.spread>.5",timeout=15000)
        report["deformation"]=page.evaluate("({spread:__slime.latest.spread,vertices:__slime.latest.count,particles:__slime.latest.particleCount})")
        page.keyboard.up("c")
        page.wait_for_function("__slime.spread < .01 && __app.ctx.weather.time > 2.6")
        page.wait_for_timeout(2800)
        page.screenshot(path=out/"jiangnan-pilot-play.jpg",quality=89)
        report["journeys"]=[]
        for slot in range(1,7):
            # Start each route at the spawn. Traverse with the live movement/collision
            # controller and interact from the approach, so a blocked path fails the run.
            page.evaluate("__slime.teleport([1.5,0,17]);__game.doorLatch.clear()")
            walked=page.evaluate("""slot=>{
              const g=__game,s=__slime,p=g.portals[slot-1].slot;
              const hand=p.position[2]<17?-1:1,fx=Math.sin(p.yaw),fz=Math.cos(p.yaw);
              const stops=[[6.8,17+hand*2.2],[10,17+hand*2.2],[p.position[0]+fx*1.55,p.position[2]+fz*1.55]];
              let steps=0;try{
                s.keys.add('KeyW');
                for(const [x,z] of stops){
                  let reached=false;
                  for(let tick=0;tick<285;tick++){
                    const dx=x-s.position[0],dz=z-s.position[2];
                    if(Math.hypot(dx,dz)<.24){reached=true;break;}
                    s.yaw=Math.atan2(-dx,-dz);s.update(steps/60,1/60);steps++;
                  }
                  if(!reached)throw Error('Blocked gate '+slot+' at '+JSON.stringify(s.position)+' walking to '+[x,z]);
                }
              }finally{s.keys.delete('KeyW')}
              g.interact();
              if(g.state!=='door' && (g.focus?.kind!=='portal'||g.focus.portal.slot.slot!==slot))throw Error('Incorrect focus '+slot);
              return steps;}""",slot)
            page.keyboard.press("f")
            page.wait_for_function("__game.state==='door'")
            page.locator('[data-act=go]:visible').first.click()
            page.wait_for_url("**/level.html?**",timeout=45000)
            chapter=parse_qs(urlparse(page.url).query)["id"][0]
            page.locator('[data-home]:visible,[data-act=home]:visible,[data-do=home]:visible').first.click(timeout=45000)
            page.wait_for_function("window.__game?.state==='title' || window.__game?.state==='play'",timeout=90000)
            if page.evaluate("__game.state==='title'"): page.keyboard.press("Enter")
            page.wait_for_function("__game.state==='play'")
            dist=page.evaluate("""i=>{const a=__slime.position,b=__game.portals[i-1].slot.position;return Math.hypot(a[0]-b[0],a[2]-b[2])}""",slot)
            assert dist<3.4,(slot,dist)
            report["journeys"].append([slot,chapter,round(dist,2),walked])
            print("gate",slot,chapter,flush=True)
        report["fishing"]=[]
        for name in ["fish-harbor-pier","fish-harbor-pontoon","fish-pier","fish-east","fish-west"]:
            page.evaluate("""id=>{const spot=__game.zones.interactables.find(i=>i.id===id);
              __slime.teleport([...spot.position]);__game.interact()}""",name)
            page.keyboard.press("f")
            page.wait_for_function("__slime.inputLock && document.querySelector('.fish-title')?.textContent.includes('等鱼')",timeout=4000)
            page.evaluate("__slime.teleport([1.5,0,17])")
            page.wait_for_function("!__slime.inputLock")
            report["fishing"].append(name)
        report["terracePlots"]=page.evaluate("__game.farmRegistry.getInteractables().filter(i=>/^farm-[1-3]-[0-2]$/.test(i.id)).length")
        assert report["terracePlots"]==9
        # Load an actual previous-format save at the old harbour, where there is now water.
        page.evaluate("""()=>{localStorage.setItem('slimefable.web.save.v1',JSON.stringify({
          v:1,quality:'medium',souvenirs:['kept-collectible'],life:{coins:57,bag:{},dex:{},records:{},plots:{
          'home-plot-legacy':{crop:'seed-radish',planted:100,grown:0,watered:0}},home:{
          placed:[{id:'legacy',itemId:'farm-bed-wood',x:-6.4,y:1.5,z:-7,scale:1,yaw:0}],
          souvenirSlots:{legacy:'kept-collectible'}}}}))}""")
        page.reload()
        page.wait_for_function("window.__slime?.ready && window.__game?.state==='title'",timeout=90000)
        migrated=state()
        bed=migrated["props"][0]
        assert bed["id"]=="legacy" and bed["y"]>-.45 and migrated["tiles"]==[] and migrated["coins"]==57
        assert migrated["plots"]["home-plot-legacy"]["crop"]=="seed-radish" and page.evaluate("__game.save.data.souvenirs.includes('kept-collectible')")
        report["legacy"]={"id":bed["id"],"coins":migrated["coins"],"crop":"seed-radish","newGroundY":bed["y"]}

    if args.edition=="pilot":
        assert not any("/harbor.js" in url for url in requests)
        assert not any(not (url.startswith(base) or url.startswith(("data:","blob:"))) for url in requests)
        report["assets"]="local only, legacy scene absent"
    browser.close()
(out/f"jiangnan-{args.edition}.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf8")
print(report)
assert report["fluid"] and not report["errors"]
