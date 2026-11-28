"""Isolate coastal ground foliage in the actual production renderer, at fixed cameras."""
import argparse
import importlib.util
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa/evidence"
spec = importlib.util.spec_from_file_location("orchard_qa", Path(__file__).with_name("qa-home-orchard.py"))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
PROBES = {"park": (26, 46), "harbor": (25, -20), "farm": (-99, -18), "forest": (-101, 56)}


def image_from(page):
    return Image.open(io.BytesIO(page.screenshot(type="png", timeout=90000))).convert("RGB")


def comparison():
    frames = [("before-park", "旧版"), ("before-park-hidden", "旧版，只隐藏蕨叶"), ("after-park", "移除后的凝露港")]
    sheet = Image.new("RGB", (1320, 354), "#f5f0e4")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("msyh.ttc", 21)
    for i, (stem, label) in enumerate(frames):
        with Image.open(OUT/f"orchard-needle-{stem}.jpg") as im:
            crop = im.crop((247,50,731,400)).resize((440,318), Image.Resampling.LANCZOS)
            sheet.paste(crop,(440*i,0))
        draw.text((440*i+12,322),label,font=font,fill="#334839")
    sheet.save(OUT/"orchard-needle-compare.jpg",quality=90)


def capture(page, name, anchor, edition, previous):
    details = page.evaluate("""([anchor,name,previous])=>{
      const T=__app.ctx.THREE, fern=__app.scene.getObjectByName('coastal-ferns-foliage');
      const m=new T.Matrix4(), p=new T.Vector3();
      let found=previous, best=Infinity;
      for(let i=0;fern && i<fern.count;i++){
        fern.getMatrixAt(i,m); p.setFromMatrixPosition(m);
        const d=Math.hypot(p.x-anchor[0],p.z-anchor[1]);
        if(d<best){best=d;found={id:i,point:p.toArray()}}
      }
      const [x,y,z]=found.point;
      window.needleView=[[x+1.0,y+1.03,z+1.83],[x,y+.31,z]];
      window.needleLayer = fern;
      __homeCalib.setView(...needleView,810,'clear');
      if(fern)fern.geometry.computeBoundingBox();
      return {id:found.id,point:found.point, mesh:fern?.name??null, instances:fern?.count??0,
        bambooStalks:__app.scene.getObjectByName('bamboo-stalks-foliage')?.count,
        bambooCanopies:__app.scene.getObjectByName('bamboo-leaves-foliage')?.count,
        geometry:fern?.geometry.attributes.position.count??0};
    }""", [anchor, name, previous])
    page.evaluate("()=>__app.bench(2)")
    shown = image_from(page)
    shown.save(OUT / f"orchard-needle-{edition}-{name}.jpg", quality=90)
    if edition == "after":
        assert details["mesh"] is None and details["instances"] == 0
        assert details["bambooStalks"] == previous["bambooStalks"] == details["bambooCanopies"]
        details["meadow_tufts"] = page.evaluate("__app.ctx.grassField.stats.activeTufts")
        assert details["meadow_tufts"] > 0
        return details
    page.evaluate("()=>{needleLayer.material.visible=false;__app.bench(2)}")
    hidden = image_from(page)
    hidden.save(OUT / f"orchard-needle-{edition}-{name}-hidden.jpg", quality=90)
    page.evaluate("()=>{needleLayer.material.visible=true;__app.bench(2)}")
    # Only compare the projected foreground plant. Background grasses and far canopy are outside this crop.
    a = np.asarray(shown, dtype=np.int16)[160:435, 290:670]
    b = np.asarray(hidden, dtype=np.int16)[160:435, 290:670]
    delta = np.max(abs(a-b), axis=2)
    dark = np.max(a, axis=2) < 65
    replaced = (b.sum(axis=2)-a.sum(axis=2)) > 150
    details.update(changed_pixels=int((delta>42).sum()),
                   dark_fern_pixels=int((dark & replaced).sum()),
                   median_visible_green=int(np.median(a[:,:,1][delta>42])) if (delta>42).any() else 0)
    assert details["dark_fern_pixels"] > 300
    return details


def farm_view(page, edition):
    """Check the same three dark tufts visible in the pre-migration wide terrace photograph."""
    page.evaluate("""()=>{
        const at=([x,y,z])=>[x,__slime.world.terrain(x,z)+y,z];
        window.needleView=[at([-78,5.5,22]),at([-90,2.2,13])];
        __homeCalib.setView(...needleView,810,'clear');__app.bench(2)
    }""")
    before=image_from(page)
    before.save(OUT/f"orchard-needle-{edition}-terrace-wide.jpg",quality=90)
    if edition == "after":
        return {}
    page.evaluate("()=>{needleLayer.material.visible=false;__app.bench(2)}")
    hidden=image_from(page)
    hidden.save(OUT/f"orchard-needle-{edition}-terrace-wide-hidden.jpg",quality=90)
    a,b=np.asarray(before,dtype=np.int16),np.asarray(hidden,dtype=np.int16)
    rois=[(119,318,147,346),(357,293,387,317),(500,280,531,305)]
    pixels=[int(((aa.max(axis=2)<70)&((bb.sum(axis=2)-aa.sum(axis=2))>150)).sum())
            for x,y,r,s in rois for aa,bb in [(a[y:s,x:r],b[y:s,x:r])]]
    assert min(pixels) > 20, pixels
    return {"rois":rois,"dark_fern_pixels_per_roi":pixels}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("edition", choices=["before","after"])
    parser.add_argument("--dir",type=Path,required=True)
    args=parser.parse_args()
    with sync_playwright() as pw, qa.serve(args.dir.resolve()) as base:
        browser=pw.chromium.launch(channel="chrome",headless=True,args=["--use-gl=angle","--enable-webgl","--ignore-gpu-blocklist","--enable-unsafe-swiftshader"])
        shader_errors=[]
        page=qa.new_home(browser,base)
        page.on("console", lambda msg: shader_errors.append(msg.text) if "Shader Error" in msg.text else None)
        page.evaluate("""()=>{
          __game.ui.showHud(false);__game.life.show(false);
          __app.ctx.onUpdate(()=>{
            if(!window.needleView)return;
            __app.camera.position.fromArray(needleView[0]);__app.camera.lookAt(...needleView[1]);__app.camera.updateMatrixWorld();
          });
          const css=document.createElement('style');css.textContent='body>div:not(:has(canvas)){visibility:hidden!important}';document.head.append(css);
          __app.renderer.setAnimationLoop(null);
        }""")
        before = json.loads((OUT/"orchard-needle-before.json").read_text("utf-8")) if args.edition=="after" else {}
        report={name:capture(page,name,point,args.edition,before.get(name)) for name,point in PROBES.items()}
        report["terrace-wide"]=farm_view(page,args.edition)
        diagnostics=page.evaluate("""()=>__app.renderer.info.programs
          .filter(p=>p.diagnostics && !p.diagnostics.runnable).map(p=>p.diagnostics.programLog)""")
        report["shader_errors"]=shader_errors + diagnostics
        assert not report["shader_errors"], report["shader_errors"]
        if args.edition == "after":
            comparison()
        (OUT / f"orchard-needle-{args.edition}.json").write_text(json.dumps(report,indent=2), encoding="utf-8")
        print(json.dumps(report),flush=True)
        browser.close()


if __name__ == "__main__":
    main()
