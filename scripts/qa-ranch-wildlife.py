"""Headless QA against a production preview. --studio also renders the field-guide thumbnails."""

import argparse
import base64
import io
import json
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont, PngImagePlugin
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa/evidence"
ASSETS = ROOT / "public/models/ranch"
NAMES = {
    "capybara": "悠闲水豚",
    "otter": "溪涧水獭",
    "red-panda": "绒尾小熊猫",
    "hare": "草甸野兔",
    "fox": "紫藤赤狐",
    "deer": "林间梅花鹿",
    "pheasant": "红腹锦鸡",
    "crane": "丹顶仙鹤",
    "snow-fox": "月影雪狐",
    "white-deer": "霜角白鹿",
    "nine-deer": "敦煌九色鹿影",
}
OLD = [
    "fauna-capybara",
    "fauna-capybara",
    "pack-red-panda",
    "meadow-hare",
    "pack-fox",
    "fauna-deer",
    "waterside-kingfisher",
    "sea-gull",
    "pack-fox",
    "fauna-deer",
    "fauna-deer",
]
LIB = """
import * as T from 'three';
import {spawnPackModel,updatePackAnimations} from './src/home/model-pack';
import {makeEncounterMotes,makeMoteTexture} from './src/home/encounter-motes';
window.T=T;
const scene = new T.Scene(), renderer = new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(448,352);renderer.setClearColor(0,0);document.body.append(renderer.domElement);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
scene.add(new T.HemisphereLight(0xfff4df,0xa8bbc4,2.05));
for(const [x,y,z,c,s] of [[2,4,3,0xffebca,2.65],[-3,2,-2,0xffe6c9,1.45]]){
 const l=new T.DirectionalLight(c,s);l.position.set(x,y,z);scene.add(l);
}
const cam=new T.OrthographicCamera(-1,1,1,-1,.01,60);cam.layers.enable(1);
function frame(x,y,z,w,h){
 cam.left=-w/2;cam.right=w/2;cam.top=h/2;cam.bottom=-h/2;cam.updateProjectionMatrix();
 cam.position.set(x+3.5,y+1.2,z+2.6);cam.lookAt(x,y,z);cam.updateMatrixWorld();
}
let models=[];
function clear(){for(const m of models)m.dispose();models=[]}
function add(id,phase=0){
 return new Promise(resolve=>{
  const m=spawnPackModel(T,id,1,{outline:false,phaseOffset:phase,onLoaded:()=>resolve(m)});
  models.push(m);scene.add(m.group);
 });
}
window.portrait=async(id,matched=false)=>{
 clear();const m=await add(id,.17);updatePackAnimations(.001);scene.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(m.group,true), mid=box.getCenter(new T.Vector3());
 const projected=[];
 frame(0,0,0,2,2);
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  projected.push(new T.Vector3(x,y,z).applyMatrix4(cam.matrixWorldInverse));
 }
 const bb=new T.Box3().setFromPoints(projected);const s=bb.getSize(new T.Vector3());
 const h=matched?1.07:Math.max(s.y,s.x*352/448)*1.09;
 frame(matched?0:mid.x,matched?.34:mid.y,matched?0:mid.z,h*448/352,h);
 renderer.render(scene,cam); return renderer.domElement.toDataURL();
};
window.measure=async(ids)=>{
 clear();const list=await Promise.all(ids.map((id,i)=>add(id,i/13)));
 for(let i=0;i<list.length;i++)list[i].group.position.set((i%4-1.5)*1.3,0,(Math.floor(i/4)-1)*1.3);
 frame(0,.3,0,8,6);const gl=renderer.getContext(),times=[];
 for(let i=0;i<58;i++){const now=performance.now();updatePackAnimations(1/60);renderer.render(scene,cam);gl.finish();
  if(i>=10)times.push(performance.now()-now);}
 times.sort((a,b)=>a-b);return {medianMs:times[24],p95Ms:times[45],calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
};
window.checkRig=async(kind)=>{
 clear();const first=await add('ranch-'+kind,.24), second=await add('ranch-'+kind,.63);
 const joints=m=>{const out=[];m.group.traverse(o=>{if(o.isBone||/^(Head|Tail|Leg_[FH][LR]|Shin_[FH][LR])$/.test(o.name))out.push(o)});return out};
 const a=joints(first), b=joints(second);
 if(a.some(joint=>b.includes(joint))||a.length<2)throw Error(kind+' has missing or shared joints');
 first.setPose('walk');second.setPose('idle');const deltas=[];
 for(let i=0;i<8;i++){
  updatePackAnimations(.05);scene.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(first.group,true);deltas.push(box.min.y);
  if(!Number.isFinite(box.min.y)||Math.abs(box.min.y)>.045)throw Error(kind+' feet '+box.min.y);
 }
 return {independentJoints:a.length,walkFootRange:[Math.min(...deltas),Math.max(...deltas)].map(v=>+v.toFixed(3))};
};
window.checkMotes=()=>{
 const map=makeMoteTexture(), world=new T.Scene(), c=new T.PerspectiveCamera(44,1,.02,20);
 c.position.set(0,.6,2);c.lookAt(0,.6,0);c.layers.enable(1);
 const target=new T.WebGLRenderTarget(192,192);
 const wall=new T.Mesh(new T.PlaneGeometry(5,5),new T.MeshBasicMaterial({color:0}));
 wall.position.set(0,.6,.8);world.add(wall);
 const pixels=new Uint8Array(192*192*4),result={};
 const luminous=()=>{renderer.render(world,c);renderer.readRenderTargetPixels(target,0,0,192,192,pixels);
  let n=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>8)n++;return n};
 renderer.setRenderTarget(target);
 for(const tier of ['common','rare','legendary']){
  const fx=makeEncounterMotes(tier,1,1,map);world.add(fx.points);fx.update(4,.05,7);
  wall.visible=false;const visible=luminous();wall.visible=true;const hidden=luminous();
  if(visible<4||hidden!==0)throw Error('Occlusion failure '+tier);
  for(let i=0;i<40;i++)fx.update(4,.05,1);
  if(fx.points.visible)throw Error('Near fade failure '+tier);
  result[tier]={points:fx.points.geometry.attributes.position.count,visiblePixels:visible,occludedPixels:hidden};fx.dispose();
 }
 renderer.setRenderTarget(null);wall.geometry.dispose();wall.material.dispose();map.dispose();target.dispose();return result;
};
window.studioReady=true;
"""


def make_studio(context, base):
    bundle = browser_bundle(LIB)
    page = context.new_page()
    page.route(
        "**/models/ranch/*.glb",
        lambda r: r.fulfill(
            path=ASSETS / r.request.url.rsplit("/", 1)[1],
            content_type="model/gltf-binary",
        ),
    )
    page.route(
        "**/__ranch-studio",
        lambda r: r.fulfill(
            content_type="text/html",
            body='<script defer src="/__ranch-bundle.js"></script>',
        ),
    )
    page.route(
        "**/__ranch-bundle.js",
        lambda r: r.fulfill(content_type="application/javascript", body=bundle),
    )
    page.goto(base + "/__ranch-studio")
    page.wait_for_function("window.studioReady")
    return page


def browser_bundle(source):
    job = """import {build} from 'esbuild';import fs from 'node:fs';
      const result=await build({stdin:{contents:fs.readFileSync(0,'utf8'),resolveDir:process.cwd(),loader:'ts'},
      bundle:true,platform:'browser',write:false,format:'iife',logLevel:'silent'});process.stdout.write(result.outputFiles[0].contents);"""
    return subprocess.run(
        ["node", "--input-type=module", "-e", job],
        cwd=ROOT,
        input=source.encode(),
        stdout=subprocess.PIPE,
        check=True,
    ).stdout


def render_studio(context, base):
    page = make_studio(context, base)

    def portrait(id, match=False):
        url = page.evaluate("([id,match])=>portrait(id,match)", [id, match])
        return Image.open(io.BytesIO(base64.b64decode(url.split(",")[1]))).convert(
            "RGBA"
        )

    def plate(image, size, bg):
        panel = Image.new("RGB", size, bg)
        pic = image.copy()
        pic.thumbnail(size, Image.Resampling.LANCZOS)
        panel.paste(pic, ((size[0] - pic.width) // 2, (size[1] - pic.height) // 2), pic)
        return panel

    font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 20)
    board = Image.new("RGB", (4 * 278, 3 * 250), "#f3eee5")
    for i, (kind, label) in enumerate(NAMES.items()):
        im = portrait("ranch-" + kind)
        meta = PngImagePlugin.PngInfo()
        meta.add_text(
            "License",
            "See NOTICE.md beside this image and the embedded source credit in "
            + kind
            + ".glb",
        )
        im.save(ASSETS / (kind + ".png"), pnginfo=meta, optimize=True)
        x, y = i % 4 * 278, i // 4 * 250
        board.paste(plate(im, (270, 210), "#eee9dd"), (x + 4, y + 3))
        ImageDraw.Draw(board).text(
            (x + 139, y + 227), label, font=font, fill="#344839", anchor="mm"
        )
    board.save(OUT / "ranch-wildlife-species.jpg", quality=90)
    pair = Image.new("RGB", (896, 398), "#eee9dd")
    for i, (asset, label) in enumerate(
        [("fauna-capybara", "原水豚"), ("ranch-capybara", "新水豚")]
    ):
        pair.paste(plate(portrait(asset, True), (448, 352), "#eee9dd"), (448 * i, 0))
        ImageDraw.Draw(pair).text(
            (448 * i + 224, 369), label, font=font, fill="#344839", anchor="mm"
        )
    pair.save(OUT / "ranch-wildlife-capybara.jpg", quality=92)
    perf = {}
    for key, ids in [("old", OLD), ("new", ["ranch-" + k for k in NAMES])]:
        perf[key] = page.evaluate("ids=>measure(ids)", ids)
        paths = [
            (
                (ASSETS / (id[6:] + ".glb"))
                if key == "new"
                else ROOT / "public/models/dreamworld" / (id + ".glb")
            )
            for id in set(ids)
        ]
        perf[key]["bytes"] = sum(p.stat().st_size for p in paths)
    perf["rigs"] = {k: page.evaluate("kind=>checkRig(kind)", k) for k in NAMES}
    perf["motes"] = page.evaluate("checkMotes()")
    page.close()
    return perf


def game(context, base):
    page = context.new_page()
    faults = []
    page.on("pageerror", lambda error: faults.append(str(error)))
    page.on(
        "console",
        lambda msg: (
            faults.append(msg.text)
            if msg.type == "error" and ("Shader" in msg.text or "WebGL" in msg.text)
            else None
        ),
    )
    page.on(
        "response",
        lambda response: (
            faults.append(str(response.status) + " " + response.url)
            if "/models/ranch/" in response.url and response.status >= 400
            else None
        ),
    )
    page.add_init_script(
        """if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
      JSON.stringify({v:1,homeClockMinute:860,homeWeather:'clear',quality:'medium'}))"""
    )
    page.add_init_script(
        """const savedDay=sessionStorage.getItem('ranchQaDay');
      if(savedDay){const RealDate=Date,stamp=new RealDate(savedDay+'T14:00:00').valueOf();
        window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[stamp]))} static now(){return stamp}}}"""
    )
    page.goto(base + "/")

    def boot():
        page.wait_for_function(
            'window.__slime?.ready && window.__game?.state==="play"', timeout=120000
        )
        page.evaluate(
            """()=>{window.g=window.__game;window.s=window.__slime;window.r=g.builder.ranch;
        window.life=g.save.data.life;window.o=window.__ocean;window.view=null;window.time=0;
        window.aim=(p,offset,up=.34)=>{window.view=[[p.x+offset[0],p.y+offset[1],p.z+offset[2]],[p.x,p.y+up,p.z]]};
        window.tick=(n)=>{for(let i=0;i<n;i++)g.app.step(.025)};
        g.app.ctx.onUpdate(()=>{if(view){const c=g.app.camera;c.position.fromArray(view[0]);c.lookAt(...view[1]);c.updateMatrixWorld()}});
        g.app.renderer.setAnimationLoop(null);window.__homeCalib.setInstantExposure(true);window.__graphics.set('medium');
        // Pick a reproducible real daily roll with a capybara. The same date is used across this browser's reload.
        const stored=sessionStorage.getItem('ranchQaDay');
        if(stored){r.host.dayKey=()=>stored;r.sync()}
        else {for(let i=1;i<=31;i++){const key='2026-11-'+String(i).padStart(2,'0');r.host.dayKey=()=>key;r.sync();
          if([...r.encounters.values()].some(e=>e.spot.speciesId==='ranch-capybara')){sessionStorage.setItem('ranchQaDay',key);break}}}
        window.en=[...r.encounters.values()].find(e=>e.spot.speciesId==='ranch-capybara');
        }"""
        )

    def wait(expr):
        try:
            page.wait_for_function(expr, timeout=45000)
        except Exception as exc:
            raise AssertionError(
                (
                    expr,
                    faults,
                    page.evaluate(
                        "()=>({pets:[...r.pets.keys()],visitors:[...g.builder.visitors.keys()],state:g.state})"
                    ),
                )
            ) from exc

    def check(expr):
        if not page.evaluate(expr):
            raise AssertionError(
                (
                    expr,
                    page.evaluate(
                        """()=>({state:g.state,player:s.position,handle:g.player.position,
                focus:g.focus?.spot?.id,pet:window.pet?.pos,target:window.pet?.target,before:window.before,
                following:window.pet?.animal.following,faults:window.floatPose})"""
                    ),
                )
            )

    def shot(name):
        page.screenshot(
            path=OUT / ("ranch-wildlife-" + name + ".jpg"), type="jpeg", quality=90
        )

    boot()
    wait("en?.model.group.getObjectByProperty('isSkinnedMesh',true)")
    page.evaluate(
        """()=>{const p=en.model.group.position;g.app.director.setTime(820);g.app.director.mode='clear';
      s.teleport([p.x+5,s.world.support(p.x+5,p.z+2)+.12,p.z+2]);aim(p,[2.15,1.05,2.45]);tick(48)}"""
    )
    check(
        "en.motes.points.visible && en.motes.points.material.opacity>.5 && en.motes.points.material.depthTest"
    )
    page.wait_for_timeout(1300)
    page.evaluate("tick(8)")
    page.keyboard.press("F3")
    page.wait_for_timeout(2400)
    shot("encounter-day")
    # Freeze the same live encounter, lighting and camera for comparison of the two silhouettes.
    page.add_script_tag(
        content=browser_bundle(
            """
        import {spawnPackModel} from './src/home/model-pack';
        import * as T from 'three';
        window.spawnOldCapy=()=>new Promise(resolve=>{
          const ref=spawnPackModel(T,'fauna-capybara',.92,{phaseOffset:0,outline:false,onLoaded:()=>resolve(ref)});
        });"""
        ).decode()
    )
    page.evaluate(
        """async()=>{window.oldCap=await spawnOldCapy();const root=en.model.group;
        window.newCap=root.children.find(o=>o.isGroup);root.add(oldCap.group);oldCap.group.visible=false;
        const p=root.position;root.rotation.y=-.32;en.yaw=-.32;aim(p,[1.34,.79,1.10],.30);tick(5)}"""
    )
    new_pic = Image.open(io.BytesIO(page.screenshot(type="png"))).convert("RGB")
    page.evaluate("newCap.visible=false;oldCap.group.visible=true;g.app.step(0)")
    old_pic = Image.open(io.BytesIO(page.screenshot(type="png"))).convert("RGB")
    comparison = Image.new("RGB", (1060, 400), "#eee9dd")
    font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 20)
    for index, (pic, label) in enumerate([(old_pic, "升级前"), (new_pic, "升级后")]):
        comparison.paste(
            pic.resize((530, 350), Image.Resampling.LANCZOS), (index * 530, 0)
        )
        ImageDraw.Draw(comparison).text(
            (index * 530 + 265, 374), label, font=font, fill="#344839", anchor="mm"
        )
    comparison.save(OUT / "ranch-wildlife-capybara-in-game.jpg", quality=93)
    page.evaluate("newCap.visible=true;oldCap.dispose();g.app.step(0)")
    page.keyboard.press("F3")
    page.evaluate(
        """()=>{const p=en.model.group.position;
      s.teleport([p.x+.78,p.y+.08,p.z+.22]);aim(p,[1.7,.85,1.6]);tick(36);g.interact()}"""
    )
    check(
        "en.alert && en.motes.points.material.opacity<.08 && g.focus?.spot?.id==='wild-'+en.spot.id"
    )
    page.keyboard.press("f")
    check("r.encounters.has(en.spot.id)")
    page.evaluate(
        """()=>{life.bag['crop-pumpkin']=1;life.coins=200;g.interact();tick(1)}"""
    )
    shot("encounter-near")
    page.keyboard.press("f")
    check(
        "!r.encounters.has(en.spot.id) && !en.motes.points.parent && life.home.ranch.discovered.includes('ranch-capybara')"
    )
    page.keyboard.press("b")
    page.locator('[data-dextab="ranch"]').first.click()
    wait(
        "Array.from(document.querySelectorAll('img[src*=\x22/models/ranch/\x22]')).every(i=>i.complete&&i.naturalWidth>0)"
    )
    page.locator('[data-adopt="ranch-capybara"]').click()
    page.keyboard.press("b")
    check("r.pets.size===1 && life.home.ranch.animals[0].speciesId==='ranch-capybara'")
    page.evaluate(
        """()=>{window.pet=[...r.pets.values()][0];const p=pet.model.group.position;
      s.teleport([p.x+.4,p.y+.04,p.z+.24]);g.interact()}"""
    )
    for _ in range(3):
        page.evaluate("g.interact()")
        page.keyboard.press("f")
    check("pet.animal.following")
    page.evaluate(
        """()=>{window.before=[...pet.pos];const p=pet.model.group.position;
      s.teleport([p.x+10,p.y+.12,p.z]);tick(10)}"""
    )
    check("Math.hypot(pet.pos[0]-before[0],pet.pos[1]-before[1])>.15")
    page.evaluate("g.save.write()")
    page.reload()
    boot()
    check(
        "life.home.ranch.animals[0].following && r.pets.size===1 && life.home.ranch.claimedEncounters.some(id=>id.endsWith('ranch-capybara'))"
    )
    # Force a real heated spring at the pet's current position, then test the exported float clip.
    page.evaluate(
        """()=>{window.pet=[...r.pets.values()][0];pet.animal.following=false;
      life.home.placed.push({id:'qa-spring',itemId:'poi-hotspring',x:pet.pos[0],z:pet.pos[1],rotation:0});
      life.home.hotSpringUntil=Date.now()+60000;window.floatPose='';const old=pet.model.setPose;
      pet.model.setPose=pose=>{floatPose=pose;old(pose)};tick(2)}"""
    )
    check("floatPose==='float'")
    page.set_viewport_size({"width": 450, "height": 780})
    page.evaluate(
        """()=>{window.night=[...r.encounters.values()][0];const p=night.model.group.position;
      g.app.director.setTime(1310);s.teleport([p.x+5,p.y+.1,p.z+1]);aim(p,[2.2,1,2.4]);tick(12)}"""
    )
    wait("night.model.group.children.some(o=>o.isGroup)")
    page.keyboard.press("F3")
    page.wait_for_timeout(1200)
    page.evaluate("tick(6)")
    shot("encounter-night-portrait")
    page.keyboard.press("F3")
    page.set_viewport_size({"width": 1060, "height": 700})
    page.evaluate(
        """()=>{view=null;g.app.director.setTime(890);
      g.save.data.life.sailing={flag:4205,waters:307,reserve:0,run:null};
      s.teleport([-11.1,s.world.support(-11.1,8),8]);tick(2)}"""
    )
    page.locator('[data-voyage="buy"]').click()
    page.evaluate("tick(2)")
    page.locator('[data-voyage="launch"]').click()
    wait(
        'o.ship.crew.length===3 && o.ship.crew.every(p=>p.group.getObjectByProperty("isSkinnedMesh",true))'
    )
    page.evaluate(
        """()=>{const camera=o.ship.group.localToWorld(o.seat.clone().set(4.6,4,-3.5));
      const mid=o.ship.group.localToWorld(o.seat.clone().set(0,1.22,.45));
      view=[camera.toArray(),mid.toArray()];window.crewLocal=o.ship.crew.map(p=>p.group.position.toArray());
      window.crewBefore=o.ship.crew[1].group.getWorldPosition(o.seat.clone());tick(18)}"""
    )
    check(
        "o.ship.crew.every((p,i)=>p.group.parent===o.ship.group && Math.abs(p.group.position.y-.96)<.001 && p.group.position.z===crewLocal[i][2])"
    )
    check(
        "crewBefore.distanceTo(o.ship.crew[1].group.getWorldPosition(o.seat.clone()))>.00001"
    )
    shot("deck")
    # Load a v1 save populated only with fields that existed before the model upgrade.
    page.evaluate(
        """()=>{const save=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
      const ids=['ranch-white-deer','ranch-otter'];save.life.home.ranch={discovered:ids,claimedEncounters:[],
        animals:ids.map((speciesId,i)=>({id:'legacy-'+i,speciesId,name:'Legacy '+i,adoptedAt:86400000,
          affection:357,mood:72,following:i===1,lastProduceDay:'2026-10-01'}))};
      save.life.sailing.run=null;save.life.home.placed=[];sessionStorage.setItem('legacyRanchFixture',JSON.stringify(save))}"""
    )
    page.add_init_script(
        "const legacy=sessionStorage.getItem('legacyRanchFixture');if(legacy)localStorage.setItem('slimefable.web.save.v1',legacy)"
    )
    page.reload()
    boot()
    wait(
        "r.pets.size===2 && [...r.pets.values()].every(p=>p.model.group.children.some(c=>c.isGroup))"
    )
    check(
        "r.pets.get('legacy-1').animal.following && r.pets.get('legacy-0').animal.affection===357"
    )
    page.evaluate(
        """()=>{const items=['nature-bamboo','nature-bamboo','pack-pavilion','pasture-shelter',
       'nature-wisteria','nature-wisteria','build-teahall','facility-sprinkler','build-thatch'];
      life.home.placed.push(...items.map((itemId,i)=>({id:'habitat-fixture-'+i,itemId,x:20+i*.7,y:0,z:45,yaw:0,scale:1})));
      g.builder.refreshVisitors()}"""
    )
    wait(
        "['hare','fox','deer','red-panda','capybara'].every(id=>g.builder.visitors.get('visitor-'+id)?.model.group.getObjectByName('dw-ranch-'+id)?.children.some(c=>c.isGroup))"
    )
    assert not faults, faults
    print(
        "Passed game checks: discovery, item gate, taming, adoption, care, follow, reload, hot spring, deck motion, legacy save, five habitat visitors and both orientations.",
        flush=True,
    )
    page.close()


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--base", default="http://127.0.0.1:5180")
    args.add_argument("--studio", action="store_true")
    args.add_argument("--game", action="store_true")
    opts = args.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            channel="chrome",
            headless=True,
            args=["--enable-webgl", "--use-gl=angle", "--ignore-gpu-blocklist"],
        )
        context = browser.new_context(
            viewport={"width": 1060, "height": 700}, has_touch=True
        )
        context.add_init_script(
            "Element.prototype.requestPointerLock=()=>Promise.resolve()"
        )
        if opts.studio:
            perf = render_studio(context, opts.base)
            (OUT / "ranch-wildlife-performance.json").write_text(
                json.dumps(perf, indent=2) + "\n"
            )
            print(perf, flush=True)
        if opts.game:
            game(context, opts.base)
        browser.close()


if __name__ == "__main__":
    main()
