"""Produce matched in-game views and a catalogue sheet using isolated, headless Chrome."""

import argparse
import base64
import io
import json
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa/evidence"
MODELS = ROOT / "public/models/architecture"
CAMERAS = {
    "teahouse": ("garden-build-teahall", (19, -9), (-3, 3.3, 7.5), 1.7),
    "eaves": ("garden-build-teahall", (19, -9), (-5.1, 1.25, 4.1), 2.0),
    "skyline": ("garden-build-red-pagoda", (-21, -21), (8, 6.5, 14), 2.8),
    "pavilion": ("garden-pack-pavilion", (13, -23), (3.7, 1.3, 5.0), 1.1),
}


def game(context, args):
    page = context.new_page()
    page.add_init_script(
        """if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,homeWeather:'clear',homeClockMinute:840,quality:'medium'}))"""
    )
    page.goto(args.base)
    page.wait_for_function(
        'window.__slime?.ready && window.__game?.state==="play"', timeout=150000
    )
    page.evaluate(
        """()=>{const a=window.__game.app;window.app=a; a.renderer.setAnimationLoop(null);
        window.__homeCalib.setInstantExposure(true);window.__graphics.set('medium');a.director.setTime(840);
        a.director.mode='clear';a.ctx.onUpdate(()=>{if(!window.view)return;
        a.camera.position.fromArray(view[0]);a.camera.lookAt(...view[1]);a.camera.updateMatrixWorld()});}"""
    )
    page.keyboard.press("F3")
    page.wait_for_timeout(2600)
    for key, (node, nearest, offset, up) in CAMERAS.items():
        page.wait_for_function(
            """name=>{let hit=false;app.scene.traverse(o=>{if(o.name===name&&o.children.some(c=>c.isGroup))hit=true});return hit}""",
            arg=node,
            timeout=90000,
        )
        print(
            key,
            page.evaluate(
                """([name,nearest,offset,up])=>{const matches=[];app.scene.traverse(o=>{if(o.name===name)matches.push(o)});
            const group=matches.sort((a,b)=>Math.hypot(a.position.x-nearest[0],a.position.z-nearest[1])-Math.hypot(b.position.x-nearest[0],b.position.z-nearest[1]))[0],p=group.position;
            window.__slime.teleport([p.x+8,window.__slime.world.support(p.x+8,p.z)+.2,p.z]);
            window.view=[[p.x+offset[0],p.y+offset[1],p.z+offset[2]],[p.x,p.y+up,p.z]];
            for(let i=0;i<42;i++)app.step(.025);return p.toArray();}""",
                [node, nearest, offset, up],
            ),
            flush=True,
        )
        page.wait_for_timeout(500)
        page.evaluate("app.step(.025)")
        page.screenshot(
            path=OUT / f"home-building-assets-{args.phase}-{key}.jpg",
            type="jpeg",
            quality=88,
        )
    if args.phase == "after":
        for label, eye, target in [
            ("bridge", [7.5, 3.6, 7.0], [0, 2, 0]),
            ("bridge-joint", [3.3, 2.25, 0.35], [0, 3.9, 1.53]),
        ]:
            page.evaluate(
                """([eye,target])=>{const o=app.scene.getObjectByName('garden-build-covered-bridge');
              if(!o?.children.some(c=>c.isGroup))throw Error('native bridge missing');
              const p=o.position,world=a=>o.localToWorld(p.clone().fromArray(a)).toArray();
              __slime.teleport([p.x+7,__slime.world.support(p.x+7,p.z+3)+.1,p.z+3]);
              view=[world(eye),world(target)];for(let i=0;i<30;i++)app.step(.025)}""",
                [eye, target],
            )
            page.screenshot(
                path=OUT / f"home-building-assets-after-{label}.jpg",
                type="jpeg",
                quality=90,
            )
        for key, x, z, up, offset in [
            ("barn", -77, 15, 1.85, [-3.3, 2.65, 8.0]),
            ("treehouse", -70, 95, 4.8, [3.1, 5.4, -9.0]),
            ("windmill", 20, 64, 2.8, [-5, 3.5, -9]),
        ]:
            page.evaluate(
                """([x,z,up,o])=>{const y=__game.builder.host.ground(x,z);__slime.teleport([x+6,__slime.world.support(x+6,z+4)+.1,z+4]);
              view=[[x+o[0],y+o[1],z+o[2]],[x,y+up,z]];for(let i=0;i<34;i++)app.step(.025)}""",
                [x, z, up, offset],
            )
            page.screenshot(
                path=OUT / f"home-building-assets-after-{key}.jpg",
                type="jpeg",
                quality=88,
            )
        build_flow(page)
    page.close()


def build_flow(page):
    page.evaluate(
        """()=>{window.b=__game.builder;b.enter(__slime.position);b.selectItem('build-moon-gate');b.previewYaw=.73}"""
    )
    page.wait_for_function(
        "b.ghostMesh.group.getObjectByName('build-moon-gate-Moon_Gate_Garden_Wall')",
        timeout=30000,
    )
    saved = page.evaluate(
        """()=>{b.host.life.coins=90;b.pointerHit=true;
      for(let z=33;z<105;z+=2)for(let x=-25;x<26;x+=2){b.ghostPos=[x,b.host.ground(x,z)??0,z];if(b.propPlan().reason)continue;
        b.clickGround();const placed=b.host.life.home.placed.at(-1);if(!placed||!b.props.has(placed.id))throw Error('placement failed');
        b.exit();return placed;}throw Error('no legal build site')}"""
    )
    page.reload()
    page.wait_for_function(
        """id=>window.__game?.builder?.props.get(id)?.model.group.getObjectByName('build-moon-gate-Moon_Gate_Garden_Wall')""",
        arg=saved["id"],
        timeout=120000,
    )
    actual = page.evaluate("id=>__game.builder.props.get(id).data", saved["id"])
    for field in ("id", "itemId", "x", "y", "z", "scale", "yaw"):
        assert actual[field] == saved[field], field
    print("Built, rotated and reloaded", actual, flush=True)

    board = Image.new("RGB", (960, 660), "#eee8db")
    font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 18)
    for i, (phase, subject, label) in enumerate(
        [
            ("before", "teahouse", "原茶馆"),
            ("after", "teahouse", "新茶馆"),
            ("before", "pavilion", "原凉亭"),
            ("after", "pavilion", "新凉亭"),
        ]
    ):
        img = Image.open(OUT / f"home-building-assets-{phase}-{subject}.jpg").resize(
            (480, 300), Image.Resampling.LANCZOS
        )
        x = i % 2 * 480
        y = i // 2 * 330
        board.paste(img, (x, y))
        ImageDraw.Draw(board).text(
            (x + 240, y + 316), label, anchor="mm", font=font, fill="#354037"
        )
    board.save(OUT / "home-building-assets-comparison.jpg", quality=92)


LABELS = {
    "build-teahall": "临水茶馆",
    "build-huizhou": "徽派民居",
    "pack-pavilion": "湖畔凉亭",
    "build-moon-gate": "江南月洞门",
    "build-red-pagoda": "朱红宝塔",
    "waterside-stilt-house": "水岸吊脚楼",
    "build-covered-bridge": "江南廊桥",
    "build-thatch": "茅草小屋",
    "pasture-shelter": "牧场木棚",
    "pack-greenhouse": "玻璃温室",
    "watermill": "溪畔水磨坊",
    "pack-windmill": "田园大风车",
    "build-lighthouse": "海岬灯塔",
}
STUDIO = """
import * as T from 'three';
import {spawnPackModel,updatePackAnimations} from './src/home/model-pack';
import {propStructures} from './src/world/linqi/prop-structures';
import {BUILD_ITEMS,propCollisionParts} from './src/home/build-catalog';
const r = new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
r.setSize(360,288);r.setClearColor(0,0);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.22;
const s = new T.Scene();s.add(new T.HemisphereLight(0xfff4e1,0xa4b2b5,2.20));
for(const [x,y,z,i] of [[-2,5,4,3],[3,2,-1,1.3]]){const l=new T.DirectionalLight(0xffead4,i);l.position.set(x,y,z);s.add(l)}
window.renderBuilding=async id=>{
 const h=await new Promise(ok=>{const h=spawnPackModel(T,id,propStructures[id].span,{outline:false,onLoaded:()=>ok(h)})});
 h.group.traverse(o=>{if(o.name.endsWith('-foundation-skirt'))o.removeFromParent()});
 s.add(h.group);s.updateMatrixWorld(true);
 const b=new T.Box3().setFromObject(h.group,true), c=b.getCenter(new T.Vector3()), cam=new T.OrthographicCamera(-1,1,1,-1,.01,100);
 cam.layers.enable(1);cam.position.copy(c).add(new T.Vector3(7,4.1,10));cam.lookAt(c);cam.updateMatrixWorld();
 const screen=new T.Box3();h.group.traverse(o=>{if(!o.isMesh)return;let p=new T.Vector3();
 for(let i=0;i<o.geometry.attributes.position.count;i++){p.fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld).applyMatrix4(cam.matrixWorldInverse);screen.expandByPoint(p)}});
 const mid=screen.getCenter(new T.Vector3()),d=screen.getSize(new T.Vector3()),height=1.12*Math.max(d.y,d.x/1.25);
 cam.left=mid.x-height*.625;cam.right=mid.x+height*.625;cam.top=mid.y+height*.5;cam.bottom=mid.y-height*.5;cam.updateProjectionMatrix();
 r.render(s,cam);const png=r.domElement.toDataURL();const checks={};
 // Shoot in model coordinates after rotating/translating the same instance used by build mode.
 h.group.position.set(7,0,-4);h.group.rotation.y=.72;h.group.updateMatrixWorld(true);
 function hits(start,direction,far=12){const origin=h.group.localToWorld(new T.Vector3(...start)),dir=new T.Vector3(...direction).applyQuaternion(h.group.quaternion);
 const ray=new T.Raycaster(origin,dir,0,far);ray.layers.enable(1);return ray.intersectObject(h.group,true).map(hit=>h.group.worldToLocal(hit.point.clone()));}
 if(id==='build-moon-gate'){checks.open=hits([0,1.05,-3],[0,0,1]).length===0;checks.solidSide=hits([1.88,1.05,-3],[0,0,1]).length>0;}
 if(id==='pack-pavilion'){checks.through=hits([0,1.55,-4],[0,0,1]).length===0;checks.floor=hits([0,1,0],[0,-1,0])[0]?.y;}
 if(id==='pack-greenhouse'||id==='pasture-shelter'){checks.entry=[.48,.75,1.0].every(y=>hits([0,y,2.6],[0,0,-1],2.6).length===0);}
 if(['pack-greenhouse','pasture-shelter','build-covered-bridge','build-moon-gate','pack-pavilion'].includes(id)){
   const def=BUILD_ITEMS[id],yaw=.72,scale=propStructures[id].span/Math.max(def.width,def.depth);
   const boxes=propCollisionParts({id:'qa',itemId:id,x:7,y:0,z:-4,yaw,scale});
   const point=new T.Vector3(),inverse=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-yaw);
   checks.collisionAisle=Array.from({length:40},(_,i)=>{
     const t=i/39,bridge=id==='build-covered-bridge',shelter=id==='pack-greenhouse'||id==='pasture-shelter';
     const y=shelter?.7:1.45;
     point.set(bridge?t*7.4-3.7:0,y,bridge?0:shelter?2.65*(1-t):5*t-2.5);h.group.localToWorld(point);
     return !boxes.some(b=>{const c=new T.Vector3(...b.min).add(new T.Vector3(...b.max)).multiplyScalar(.5);
       const p=point.clone().sub(c).applyQuaternion(inverse);
       return [p.x,p.y,p.z].every((v,i)=>Math.abs(v)<(b.max[i]-b.min[i])/2);});
   }).every(Boolean);
 }
 if(id==='build-covered-bridge'){checks.through=hits([-4,1.5,0],[1,0,0]).length===0;checks.deck=hits([0,2,0],[0,-1,0])[0]?.y;}
 if(id==='build-covered-bridge'){
   // At all six joints, the timber cap lies inside the roof thickness.
   checks.eaveJoints=[-2.4,0,2.4].every(x=>[-1.02,1.02].every(z=>{
     const origin=h.group.localToWorld(new T.Vector3(x,2.38,z));
     const ray=new T.Raycaster(origin,new T.Vector3(0,1,0),0,1);ray.layers.enable(1);
     const levels=part=>ray.intersectObject(h.group.getObjectByName(id+'-'+part),true).map(hit=>hit.point.y);
     const timber=levels('SculptedModel'),roof=levels('Teahouse');
     return timber.length>0 && roof[0]<timber.at(-1)-.02 && timber.at(-1)<roof.at(-1)-.02;
   }));
 }
 if(id==='watermill'||id==='pack-windmill'){const joint=h.group.getObjectByName(id==='watermill'?'Wheel':'Sails'),q=joint.quaternion.clone(),p=joint.position.clone();
 updatePackAnimations(.05);checks.motion=q.angleTo(joint.quaternion);checks.pivotTravel=p.distanceTo(joint.position);}
 h.dispose();return {png,checks,triangles:r.info.render.triangles,calls:r.info.render.calls};
};
window.profileBuildings=async ids=>{
 const handles=await Promise.all(ids.map(id=>new Promise(ok=>{const h=spawnPackModel(T,id,1.7,{outline:false,onLoaded:()=>ok(h)});})));
 handles.forEach((h,i)=>{h.group.position.set((i%4-1.5)*2.5,0,(Math.floor(i/4)-1.5)*2.4);s.add(h.group)});
 const cam=new T.OrthographicCamera(-6.8,6.8,5.1,-5.1,.1,60);cam.layers.enable(1);
 cam.position.set(7,6.5,12);cam.lookAt(0,.65,0);cam.updateMatrixWorld();r.setSize(640,480);
 const gl=r.getContext(),pixel=new Uint8Array(4),samples=[];
 for(let i=0;i<65;i++){
   const start=performance.now();updatePackAnimations(1/60);r.render(s,cam);
   gl.readPixels(320,240,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
   if(i>=15)samples.push(performance.now()-start);
 }
 samples.sort((a,b)=>a-b);const result={medianMs:samples[24],p95Ms:samples[47],calls:r.info.render.calls,triangles:r.info.render.triangles};
 for(const h of handles)h.dispose();return result;
};
"""


def studio(context, args):
    job = """import {build} from 'esbuild';import fs from 'node:fs';
    const out=await build({stdin:{contents:fs.readFileSync(0,'utf8'),resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'});process.stdout.write(out.outputFiles[0].contents)"""
    bundle = subprocess.run(
        ["node", "--input-type=module", "-e", job],
        cwd=ROOT,
        input=STUDIO.encode(),
        stdout=subprocess.PIPE,
        check=True,
    ).stdout
    p = context.new_page()
    p.route(
        "**/__arch-studio",
        lambda r: r.fulfill(content_type="text/html", body="<canvas hidden></canvas>"),
    )
    directory = MODELS
    p.route(
        "**/models/architecture/*.glb",
        lambda r: r.fulfill(
            path=directory / r.request.url.rsplit("/", 1)[1],
            content_type="model/gltf-binary",
        ),
    )
    p.goto(args.base + "/__arch-studio")
    p.add_script_tag(content=bundle.decode())
    board = Image.new("RGB", (4 * 230, 4 * 195), "#eee8db")
    font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 18)
    data = {}
    for i, (asset, label) in enumerate(LABELS.items()):
        result = p.evaluate("id=>renderBuilding(id)", asset)
        img = Image.open(io.BytesIO(base64.b64decode(result.pop("png").split(",")[1])))
        img.save(MODELS / (asset + ".png"), optimize=True)
        img.thumbnail((220, 154), Image.Resampling.LANCZOS)
        x = i % 4 * 230
        y = i // 4 * 195
        board.paste(img, (x + (230 - img.width) // 2, y + 5), img)
        ImageDraw.Draw(board).text(
            (x + 115, y + 172), label, font=font, fill="#3a413c", anchor="mm"
        )
        data[asset] = result
    board.save(OUT / "home-building-assets-catalog.jpg", quality=92)
    (OUT / "home-building-assets-geometry.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), "utf-8"
    )
    print({k: v["checks"] for k, v in data.items() if v["checks"]}, flush=True)
    for k in (
        "build-moon-gate",
        "pack-pavilion",
        "build-covered-bridge",
        "pack-greenhouse",
        "pasture-shelter",
    ):
        assert not any(v is False for v in data[k]["checks"].values()), (k, data[k])
    assert 0.28 < data["pack-pavilion"]["checks"]["floor"] < 0.46
    assert 0.5 < data["build-covered-bridge"]["checks"]["deck"] < 0.72
    for k in ("pack-windmill", "watermill"):
        assert (
            data[k]["checks"]["motion"] > 0.01 and data[k]["checks"]["pivotTravel"] == 0
        )
    profile = {}
    for version, directory in [
        ("original", ROOT / "public/models/dreamworld"),
        ("upgraded", MODELS),
    ]:
        p.reload()
        p.add_script_tag(content=bundle.decode())
        profile[version] = p.evaluate("ids=>profileBuildings(ids)", list(LABELS))
        profile[version]["glbBytes"] = sum(
            (directory / (id + ".glb")).stat().st_size for id in LABELS
        )
    (OUT / "home-building-assets-profile.json").write_text(
        json.dumps(profile, indent=2), "utf-8"
    )
    print(profile, flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:5180")
    parser.add_argument("--phase", choices=["before", "after"], default="after")
    parser.add_argument("--studio", action="store_true")
    args = parser.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            channel="chrome",
            headless=True,
            args=["--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle"],
        )
        context = browser.new_context(
            viewport={"width": 1024, "height": 640}, device_scale_factor=1
        )
        context.add_init_script(
            "Element.prototype.requestPointerLock=()=>Promise.resolve()"
        )
        if args.studio:
            studio(context, args)
        else:
            game(context, args)
        browser.close()


if __name__ == "__main__":
    main()
