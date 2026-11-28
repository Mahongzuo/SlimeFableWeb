"""Capture isolated Meadow and Home production views. Each run uses a fresh browser profile."""
import argparse
import base64
import functools
import json
import threading
from urllib.parse import urlsplit
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa/evidence"
MEADOW = ROOT.parent / "Gamedemo/meadow"
TILES = [
    dict(id=f"tile_{gx}_0", gx=gx, gz=0, theme=theme, unlockedAt=1)
    for gx, theme in [(-3, "meadow"), (-4, "farmland"), (-5, "jiangnan"), (-6, "coast")]
]
VIEWS = {
    "park": ([5, 2.2, 52], [19, 3.4, 64]),
    "flowers": ([3, .65, 55], [9, .55, 62]),
    "forest": ([-44, 3, 88], [-55, 2, 82]),
    "farm": ([-78, 5.5, 22], [-90, 2.2, 13]),
    "frontier": ([-133, 6, 66], [-155, 1.8, 57]),
    "seam-low": ([-140, .6, 59], [-151, .3, 56]),
    "seam-cross": ([-149, 2.2, 53], [-143, .5, 59]),
    "road-low": ([4.7, .6, 32], [9, .15, 29]),
    "road-cross": ([11, 1.3, 28], [7, .3, 34]),
}


class QuietHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path == "/favicon.ico" and not Path(self.directory, "favicon.ico").exists():
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, *args):
        pass


@contextmanager
def serve(directory):
    handler = functools.partial(QuietHandler, directory=str(directory))
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{httpd.server_port}"
    finally:
        httpd.shutdown()
        httpd.server_close()


def shot(page, name):
    page.screenshot(path=OUT / f"orchard-{name}.jpg", type="jpeg", quality=86, animations="disabled", timeout=90000)


def expansion_sheet():
    labels = [("farmland","沃土农庄"), ("jiangnan","江南水乡"), ("meadow","林缘牧场"), ("coast","潮汐花岬")]
    font = ImageFont.truetype("msyh.ttc", 22)
    sheet = Image.new("RGB", (1280, 880), "#f5f0e4")
    draw = ImageDraw.Draw(sheet)
    for i, (name, label) in enumerate(labels):
        x, y = (i % 2) * 640, (i // 2) * 440
        with Image.open(OUT/f"orchard-land-{name}.jpg") as source:
            sheet.paste(source.resize((640,400),Image.Resampling.LANCZOS),(x,y))
        draw.text((x+14,y+404),label,font=font,fill="#334839")
    sheet.save(OUT/"orchard-expansions.jpg",quality=89)


def reference(browser):
    page = browser.new_page(viewport={"width": 960, "height": 600})
    page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
    with serve(MEADOW) as base:
        # Only expose the existing fixed-camera override in the QA page.
        def camera_hook(route):
            source = (MEADOW / "src/main.js").read_text(encoding="utf-8")
            route.fulfill(body=source + "\nwindow.orchardReferenceView=v=>{dbg=v};", content_type="application/javascript")
        page.route("**/src/main.js", camera_hook)
        page.goto(base, wait_until="domcontentloaded", timeout=120000)
        page.wait_for_function("!document.querySelector('#veil')", timeout=180000)
        for name, view in [("slope", None), ("flowers", [0, 7, .15, -.25, 1.5]), ("apple", [22, -16, -.28, .06, 1.65])]:
            page.evaluate("v=>window.orchardReferenceView(v)", view)
            page.evaluate("()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
            shot(page, f"reference-{name}")
    page.close()


def new_home(browser, base, empty=False, errors=None):
    page = browser.new_page(viewport={"width": 960, "height": 600}, has_touch=empty)
    if errors is not None:
        page.on("pageerror", lambda e: errors.append(str(e)))
        def console_error(message):
            path = urlsplit(message.location.get("url", "")).path
            if message.type == "error" and path != "/favicon.ico":
                errors.append(f"{path} {message.text}")
        page.on("console", console_error)
    seed = dict(v=1, homeWeather="clear", homeClockMinute=810, quality="medium",
                life=dict(coins=400, home=dict(expansions=[] if empty else TILES)))
    page.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
      if (!localStorage.getItem('slimefable.web.save.v1'))
        localStorage.setItem('slimefable.web.save.v1',JSON.stringify(%s));""" % json.dumps(seed))
    page.goto(base + ("/?date=1015" if empty else "/?date=1015&perf=1"), wait_until="domcontentloaded", timeout=120000)
    page.wait_for_function("window.__slime?.ready && ['play','title'].includes(__game.state)", timeout=150000)
    page.evaluate("if(__game.state==='title') __game.start()")
    page.wait_for_function("__slime.latest?.particleCount > 0", timeout=90000)
    return page


def camera(page, view):
    page.evaluate("""([eye,target])=>{
      const at=(v)=>[v[0],(__slime.world.terrain(v[0],v[2])??0)+v[1],v[2]];
      window.orchardView=[at(eye),at(target)];
      __homeCalib.setView(...window.orchardView,810,'clear');
    }""", view)


def visuals(browser, base, edition):
    errors = []
    page = new_home(browser, base, errors=errors)
    page.evaluate("""()=>{
      __game.ui.showHud(false); __game.life.show(false); __homeCalib.setInstantExposure(true);
      __app.ctx.onUpdate(()=>{if(!window.orchardView)return;
        const [eye,target]=window.orchardView;
        __app.camera.position.fromArray(eye); __app.camera.lookAt(...target); __app.camera.updateMatrixWorld();});
      const s=document.createElement('style'); s.textContent='body>div:not(:has(canvas)){visibility:hidden!important}';
      document.head.append(s);
    }""")
    report = {"views": VIEWS, "performance": {}, "errors": errors}
    for name, view in VIEWS.items():
        camera(page, view)
        shot(page, f"{edition}-{name}")
    for preset in ["low", "medium", "high", "ultra"]:
        page.evaluate("p=>__graphics.set(p)", preset)
        report["performance"][preset] = {}
        for name in ["park", "forest", "frontier"]:
            camera(page, VIEWS[name])
            page.evaluate("__perf.reset()")
            page.evaluate("""()=>new Promise(resolve=>{let n=0;function sample(){if(++n===20)resolve();else requestAnimationFrame(sample)}requestAnimationFrame(sample)})""")
            sample = page.evaluate("""()=>{
              const {THREE:T}=__app.ctx, camera=__app.camera;
              const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
              let instances=0, batches=0;
              __app.scene.traverseVisible(m=>{if(!(m.isInstancedMesh||m.geometry?.isInstancedBufferGeometry))return;
                if(!/grass|flower|meadow|orchard|grove/i.test(m.name))return;
                if(m.frustumCulled&&!frustum.intersectsObject(m))return;
                instances+=m.isInstancedMesh?m.count:m.geometry.instanceCount;batches++;});
              const p=__perf.stats();return {p50:p.p50,p95:p.p95,frames:p.frames,passes:p.passes,instances,batches,
                meadow:__app.ctx.grassField?.stats};
            }""")
            report["performance"][preset][name] = sample
            print(edition, preset, name, sample["p50"], sample["p95"], sample["instances"], flush=True)
    if edition == "after":
        report["landscape"] = landscape(page)
    bad = page.evaluate("(__app.renderer.info.programs??[]).filter(p=>p.diagnostics?.runnable===false).map(p=>p.name)")
    assert not bad, bad
    (OUT/f"orchard-{edition}-metrics.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    page.close()
    assert not errors, errors


def landscape(page):
    page.evaluate("__graphics.set('high')")
    report = {"tiles": {}}
    for tile in TILES:
        tid = tile["id"]
        view = page.evaluate("""id=>{
          const fence=__app.scene.getObjectByName('terrain-fence-'+id),posts=fence.getObjectByName('parcel-fence-posts');
          const t=__app.ctx.THREE,m=new t.Matrix4();posts.getMatrixAt(1,m);const p=new t.Vector3().setFromMatrixPosition(m);
          const land=__app.scene.getObjectByName('ground-exp-'+id);land.geometry.computeBoundingBox();
          const c=land.geometry.boundingBox.getCenter(new t.Vector3()), dir=c.clone().sub(p);dir.y=0;dir.normalize();
          return [[p.x+dir.x*10,3,p.z+dir.z*10],[p.x,1.0,p.z]];
        }""", tid)
        camera(page, view)
        shot(page, "land-" + tile["theme"])
        sample = page.evaluate("""id=>{
          const field=__app.scene.getObjectByName('grass-expansion-'+id), fence=__app.scene.getObjectByName('terrain-fence-'+id);
          return {tussocks:field.userData.activeTufts,flowers:field.userData.flowerCount,runs:fence.userData.openRuns,
            posts:fence.getObjectByName('parcel-fence-posts').count, collisions:__slime.world.boxes.filter(b=>b.name?.startsWith('parcel-fence-'+id+'-')).length};
        }""", tid)
        assert min(sample.values()) > 0, (tid,sample)
        report["tiles"][tile["theme"]] = sample
    expansion_sheet()
    report["seams"] = page.evaluate("""()=>{
      const T=__app.ctx.THREE,r=new T.Raycaster();r.layers.enableAll();
      const ground=__app.scene.getObjectByName('inland-ground');
      const meshes=[...ground.children,...__game.save.data.life.home.expansions.map(t=>__app.scene.getObjectByName('ground-exp-'+t.id)),__app.scene.getObjectByName('island-coastal-shelf')].filter(m=>m?.isMesh);
      const hits=(x,z)=>{r.set(new T.Vector3(x,35,z),new T.Vector3(0,-1,0));return r.intersectObjects(meshes,false).map(h=>({name:h.object.name,y:h.point.y}));};
      return [-106,-146,-186,-226].map(x=>[43.37,58.83,77.13].map(z=>({x,z,left:hits(x-.027,z),right:hits(x+.027,z)}))).flat();
    }""")
    for seam in report["seams"]:
        assert len(seam["left"]) == len(seam["right"]) == 1, seam
        assert abs(seam["left"][0]["y"] - seam["right"][0]["y"]) < .15, seam
    report["roots"] = page.evaluate("""()=>{
      const T=__app.ctx.THREE,r=new T.Raycaster();r.layers.enableAll();
      const ground=__app.scene.getObjectByName('ground-farm');
      return __app.scene.getObjectByName('orchard-trees').children.map(g=>{
        const p=g.position;r.set(new T.Vector3(p.x,40,p.z),new T.Vector3(0,-1,0));
        const h=r.intersectObject(ground,false)[0];return {tree:g.name,gap: h?p.y-h.point.y:null};});
    }""")
    assert all(t["gap"] is not None and abs(t["gap"]) < .09 for t in report["roots"]), report["roots"]
    for name, view in [("root-low", ([-88,.67,8],[-93,.85,9])), ("root-cross", ([-96,1.85,1],[-91,.65,5]))]:
        camera(page, view)
        shot(page, name)
    page.evaluate("""()=>{let x=-125,z=51;__slime.teleport([x,__slime.world.terrain(x,z)+.03,z]);__slime.yaw=0}""")
    page.wait_for_function("__slime.grounded")
    camera(page, ([-121,1.4,54],[-125,.4,49]))
    shot(page, "walk-1")
    normal = page.evaluate("__app.ctx.U.uSlimePos.value.w")
    page.keyboard.down("w")
    page.wait_for_timeout(330)
    shot(page, "walk-2")
    page.keyboard.down("c")
    page.wait_for_function("__slime.spread>.82 && __app.ctx.U.uSlimePos.value.w>.86")
    flat = page.evaluate("__app.ctx.U.uSlimePos.value.w")
    shot(page, "walk-3")
    page.keyboard.up("w")
    page.keyboard.up("c")
    page.mouse.down(button="right")
    page.mouse.up(button="right")
    page.wait_for_function("__slime.homeDashTimer>0 || __slime.homeDashCooldown>0")
    report["dashContact"] = page.evaluate("({radius:__app.ctx.U.uSlimePos.value.w,trail:__app.ctx.U.uMeadowTrail.value.map(v=>v.w)})")
    page.wait_for_function("__slime.homeDashTimer<=0")
    page.keyboard.press("Space")
    page.wait_for_function("!__slime.grounded && __app.ctx.U.uSlimePos.value.w===0")
    shot(page, "walk-4")
    report["bodyContact"] = {"walkRadius":normal,"flattenedRadius":flat,"airRadius":0}
    return report


def flow(browser, base):
    errors = []
    page = new_home(browser, base, empty=True, errors=errors)
    page.set_default_timeout(20000)
    report = {}
    bag = lambda: page.evaluate("({...__game.save.data.life.bag})")
    trees = lambda: page.evaluate("__game.save.data.life.home.trees")
    button = lambda action: page.locator(f'#orchard-ui [data-orchard="{action}"]:visible')

    def stand(x, z):
        page.evaluate("""([x,z])=>{const y=__slime.world.terrain(x,z);
            __slime.teleport([x,y+.03,z]);__slime.forward=[0,0,-1];__slime.yaw=0;}""", [x,z])
        page.wait_for_function("__slime.grounded && __game.state==='play'")
        page.wait_for_timeout(220)

    def guide_roundtrip(source, size):
        page.set_viewport_size({"width": size[0], "height": size[1]})
        if source == "key":
            page.keyboard.press("F1")
        else:
            page.locator(source).tap()
        page.wait_for_function("__game.state==='guide'")
        page.locator('[data-guide-sec="orchard"]').tap()
        title = page.locator("article.g-card h4").filter(has_text="看枝头，收果实")
        title.scroll_into_view_if_needed()
        assert title.is_visible()
        width = page.locator(".g-main").evaluate("el=>el.getBoundingClientRect().width")
        assert width <= size[0], (size, width)
        device = "desktop" if size[0] >= 960 else "portrait" if size[0] < size[1] else "landscape"
        shot(page, "help-" + device)
        if size[0] < size[1]:
            page.locator(".guide-modal .g-close").tap()
        else:
            page.keyboard.press("F1")
        page.wait_for_function("__game.state!=='guide'")

    guide_roundtrip('.hud-buttons [data-act="guide"]', (960, 600))
    assert page.evaluate("__game.state==='play'")
    stand(-89.8, 5)
    assert not page.evaluate("__game.orchard.open()")
    assert not trees() and not page.evaluate("__game.save.data.life.home.expansions.length")
    report["plantingWithoutLandRejected"] = True
    button("harvest").tap()
    assert bag().get("orchard-apple") == 3
    report["nativeHarvest"] = True
    seed = page.evaluate("__game.zones.interactables.find(s=>s.id==='farm-seeds').position")
    stand(seed[0], seed[2] + .95)
    page.wait_for_function("__game.focus?.spot?.id==='farm-seeds'")
    page.locator('.prompt[data-act="interact"]').tap()
    page.locator('[data-scat="trees"]').click()
    guide_roundtrip("[data-shop-help]", (844, 390))
    assert page.locator('[data-sapling="apple"][data-qty="5"]').is_visible()
    for species, qty in [("apple", 5), ("pear", 1), ("peach", 1), ("oak", 1)]:
        page.locator(f'[data-sapling="{species}"][data-qty="{qty}"]').tap()
    assert bag()["sapling-apple"] == 5
    page.locator('[data-sclose]').tap()
    page.set_viewport_size({"width": 960, "height": 600})
    page.wait_for_function("__game.state==='play'")
    report["shop"] = bag()
    print("shop and guide passed", flush=True)

    # The character starts each purchase at its west border; the normal build dock commits each sale.
    for tile in TILES:
        gx, tid = tile["gx"], tile["id"]
        stand(-104 + (gx+3)*40, 56)
        page.keyboard.press("v")
        page.locator('[data-cat="expand"]').click()
        page.locator(f'[data-slot="{tid}"]').click()
        page.locator('[data-theme="%s"]' % tile["theme"]).click()
        page.locator('[data-act="confirm-expand"]').click()
        assert page.evaluate("id=>__game.save.data.life.home.expansions.some(t=>t.id===id)", tid)
        page.keyboard.press("v")
    report["boughtThemes"] = page.evaluate("__game.save.data.life.home.expansions.map(t=>t.theme)")
    print("four purchases passed", flush=True)

    stand(-119, 51)
    page.keyboard.press("F2")
    page.locator('[data-act="orchard"]').tap()
    page.locator('[data-species="apple"]').tap()
    guide_roundtrip("key", (390, 844))
    button("manual").wait_for(state="visible")
    assert page.evaluate("__game.state==='play' && __game.orchard.state.mode==='choose'")
    page.set_viewport_size({"width": 960, "height": 600})
    button("manual").click()
    button("plant").wait_for()
    page.wait_for_function("!document.querySelector('[data-orchard=plant]').disabled")
    shot(page, "plant-preview")
    page.keyboard.press("f")
    page.wait_for_function("__game.save.data.life.home.trees.length===1")
    player_tree = trees()[0]
    assert bag()["sapling-apple"] == 4
    button("back").click()
    report["manualTree"] = player_tree
    print("manual planting passed", flush=True)
    button("open").click()
    page.locator("input[data-count]").fill("2")
    button("batch").click()
    plan = page.evaluate("__game.orchard.state.planned")
    assert len(plan) == 2, (plan,page.evaluate("__game.orchard.state"),page.locator("#orchard-ui").inner_text())
    shot(page, "batch-preview")
    start = page.evaluate("[...__slime.position]")
    button("start").click()
    page.wait_for_function("__game.orchard.state.mode==='idle'", timeout=90000)
    assert len(trees()) == 3 and bag()["sapling-apple"] == 2, (trees(),bag())
    end = page.evaluate("[...__slime.position]")
    assert (start[0]-end[0])**2 + (start[2]-end[2])**2 > 2
    report["walkedBatch"] = {"from": start, "to": end, "preview": plan, "count": 2}
    button("open").click()
    button("batch").click()
    button("start").click()
    page.keyboard.down("w")
    page.wait_for_function("__game.orchard.state.mode==='idle'")
    page.keyboard.up("w")
    assert len(trees()) == 3 and bag()["sapling-apple"] == 2
    report["cancel"] = True

    def loaded():
        page.reload(wait_until="domcontentloaded")
        page.wait_for_function("window.__slime?.ready && ['title','play'].includes(__game.state)", timeout=120000)
        page.evaluate("if(__game.state==='title') __game.start()")
        page.wait_for_function("__slime.latest?.particleCount>0")

    loaded()
    assert len(trees()) == 3 and bag()["sapling-apple"] == 2
    # Backdate only this isolated save so normal reload / clock reconstruction is exercised at each age.
    for age, stage in [(4, "young"), (21, "adult")]:
        page.evaluate("""age=>{const t=__game.save.data.life.home.trees[0];t.plantedAt=Date.now()-age*60000;
          __game.save.write();}""", age)
        loaded()
        page.wait_for_function("""([id,s])=>__app.scene.getObjectByName('orchard-tree-'+id)?.userData.treeStage===s""",
                               arg=[player_tree["id"],stage])
    stand(player_tree["x"] + 1.1, player_tree["z"])
    fruit_visible = """id=>__app.scene.getObjectByName('orchard-tree-'+id)?.getObjectByName('orchard-fruit')?.visible"""
    assert page.evaluate(fruit_visible, player_tree["id"])
    page.keyboard.press("f")
    page.wait_for_function("__game.save.data.life.bag['orchard-apple']===6")
    page.wait_for_function("id=>!("+fruit_visible+")(id)", arg=player_tree["id"])
    page.keyboard.press("f")
    assert bag()["orchard-apple"] == 6
    page.evaluate("""()=>{__game.save.data.life.home.trees[0].harvestedAt-=16*60000;__game.save.write()}""")
    loaded()
    stand(player_tree["x"] + 1.1, player_tree["z"])
    assert page.evaluate(fruit_visible, player_tree["id"])
    button("harvest").tap()
    assert bag()["orchard-apple"] == 9
    report["reloadedYoungAdultFirstSecondHarvest"] = True
    stand(-139, 43)
    page.keyboard.press("F2")
    page.locator('[data-act="orchard"]').tap()
    button("manual").click()
    stand(-149, 46)
    assert button("plant").is_disabled()
    assert len(trees()) == 3
    button("back").click()
    report["crossTileRejected"] = True
    report["errors"] = errors
    (OUT/"orchard-flow.json").write_text(json.dumps(report, ensure_ascii=False, indent=2),encoding="utf-8")
    assert not errors, errors
    page.close()


def field_run(browser, base):
    errors = []
    page = new_home(browser, base, errors=errors)
    page.evaluate("""()=>{
      const x=-123,z=64;
      __slime.teleport([x,__slime.world.terrain(x,z)+.03,z]);__slime.yaw=0;__slime.pitch=.18;
      __game.ui.showHud(false);__game.life.show(false);
    }""")
    page.wait_for_function("__slime.grounded && __app.ctx.U.uSlimePos.value.w>0")
    page.wait_for_timeout(450)
    page.evaluate("""()=>{
      const stream=__app.renderer.domElement.captureStream(30);
      const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:4000000}),parts=[];
      rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};
      window.orchardRecording=new Promise(resolve=>{rec.onstop=()=>{
        for(const t of stream.getTracks())t.stop();
        const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(new Blob(parts,{type:'video/webm'}));}});
      window.finishFieldRecording=()=>rec.stop();rec.start();
    }""")
    page.keyboard.down("w")
    page.wait_for_timeout(950)
    page.keyboard.down("c")
    page.wait_for_timeout(1000)
    page.keyboard.up("c")
    page.wait_for_timeout(400)
    page.mouse.click(480, 300, button="right")
    page.wait_for_timeout(620)
    page.keyboard.press("Space")
    page.wait_for_timeout(750)
    page.keyboard.up("w")
    page.wait_for_timeout(600)
    page.evaluate("finishFieldRecording()")
    (OUT/"orchard-grass-walk.webm").write_bytes(base64.b64decode(page.evaluate("orchardRecording")))

    # Build a mature orchard fixture using each plot's live siting rules.
    counts = page.evaluate("""()=>{
      const o=__game.orchard,h=__game.save.data.life.home,counts={};
      for(const tile of h.expansions){
        o.state.tileId=tile.id;const {slot,site}=o.site(), points=[];
        for(let z=slot.min[1]+4;z<slot.max[1]-3;z+=6.5)for(let x=slot.min[0]+4;x<slot.max[0]-3;x+=6.5){
          if(points.length>=14||site.reason(x,z,2.5))continue;
          const i=points.length; points.push([x,z]);
          h.trees.push({id:'qa-'+tile.id+'-'+i,tileId:tile.id,species:['apple','pear','peach'][i%3],
              x,z,plantedAt:Date.now()-3600000});
        }
        counts[tile.id]=points.length;o.syncTrees();
      }
      o.state.tileId='';return counts;
    }""")
    assert len(counts)==4 and min(counts.values())>=5, counts
    eye = [-138, 5.8, 69]
    target = [-158, 2.3, 52]
    camera(page, (eye,target))
    page.evaluate("""()=>{__app.ctx.onUpdate(()=>{
      const [eye,look]=window.orchardView;__app.camera.position.fromArray(eye);__app.camera.lookAt(...look);
      __app.camera.updateMatrixWorld();});}""")
    report = {"treesByTile":counts,"quality":{}}
    frames = """n=>new Promise(r=>{function next(){if(--n<=0)r();else requestAnimationFrame(next)}requestAnimationFrame(next)})"""
    for preset in ["low","medium","high","ultra"]:
        page.evaluate("p=>__graphics.set(p)", preset)
        page.evaluate(frames, 30)
        page.evaluate("__perf.reset()")
        page.evaluate(frames, 120)
        report["quality"][preset] = page.evaluate("""()=>{
          const p=__perf.stats(), T=__app.ctx.THREE, c=__app.camera;
          const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse));
          let visibleTrees=0, instances=0;
          for(const tree of __app.scene.getObjectByName('orchard-trees').children){
            if(frustum.intersectsObject(tree.getObjectByName('orchard-leaves')))visibleTrees++;
          }
          __app.scene.traverseVisible(m=>{if(!(m.isInstancedMesh||m.geometry?.isInstancedBufferGeometry))return;
            if(!/grass|flower|meadow|orchard|grove/i.test(m.name)||(m.frustumCulled&&!frustum.intersectsObject(m)))return;
            instances+=m.isInstancedMesh?m.count:m.geometry.instanceCount;});
          return {p50:p.p50,p95:p.p95,p99:p.p99,frames:p.frames,visibleTrees,instances,passes:p.passes};
        }""")
        assert report["quality"][preset]["visibleTrees"]>=8
        if preset=="high":
            shot(page,"mature-orchard")
    report["errors"]=errors
    (OUT/"orchard-mature-performance.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    assert not errors, errors
    page.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("edition", choices=["reference", "before", "after", "flow", "field-run"])
    parser.add_argument("--dir", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    OUT.mkdir(exist_ok=True, parents=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True,
            args=["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"])
        if args.edition == "reference":
            reference(browser)
        else:
            with serve(args.dir.resolve()) as base:
                if args.edition == "flow":
                    flow(browser, base)
                elif args.edition == "field-run":
                    field_run(browser, base)
                else:
                    visuals(browser, base, args.edition)
        browser.close()


if __name__ == "__main__":
    main()
