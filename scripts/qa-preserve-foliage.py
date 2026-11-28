"""Compare the live preserve approaches in an isolated headless Chrome session."""
import argparse
import importlib.util
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright

spec = importlib.util.spec_from_file_location("companions", Path(__file__).with_name("qa-home-companions.py"))
game = importlib.util.module_from_spec(spec)
spec.loader.exec_module(game)


def run(browser, base, stage):
    context, page = game.start(browser, base)
    errors=[]
    page.on("pageerror",lambda err:errors.append(str(err)))
    page.on("console",lambda msg:errors.append(msg.text) if msg.type=="error" and ("Shader Error" in msg.text or "VALIDATE_STATUS" in msg.text) else None)
    game.tap(page, "close")
    page.keyboard.press("F3")
    page.add_style_tag(content=".toast,#toast{display:none!important}")
    report = {}
    for r in page.evaluate("g.preserves.rects.filter(r=>r.biome!=='trail')"):
        biome = r["biome"]
        x, z = (r["minX"] + r["maxX"])/2, (r["minZ"] + r["maxZ"])/2
        # Look across a damp margin, with the boardwalk and opposite shore in the same frame.
        for view, dx, dz, up in [("bank", 12, 9, 2.3), ("overview", 19, 17, 6.7)]:
            page.evaluate("""([x,z,dx,dz,h])=>{go(x+dx,z+dz);const y=s.world.terrain(x+dx,z+dz);
              look([x+dx,y+h,z+dz],[x-2,s.world.terrain(x,z)+.85,z-1]);step(3)}""",[x,z,dx,dz,up])
            page.wait_for_timeout(1300)
            page.evaluate("step(22)")
            page.screenshot(path=game.OUT/f"preserve-foliage-{stage}-{biome}-{view}.jpg",quality=88)
        report[biome] = page.evaluate("""()=>{const frames=[];for(let i=0;i<22;i++){
            const t=performance.now();step();a.renderer.getContext().finish();if(i>2)frames.push(performance.now()-t)}
            frames.sort((a,b)=>a-b);return {medianMs:frames[9],p90Ms:frames[17],calls:a.renderer.info.render.calls,
            triangles:a.renderer.info.render.triangles, activeTufts:a.ctx.grassField.stats.activeTufts,
            herd:g.preserves.wildlife.length}}""")
        print(stage,biome,report[biome],flush=True)
    (game.OUT/f"preserve-foliage-{stage}-measurements.json").write_text(json.dumps(report,indent=2),encoding="utf8")
    context.close()
    assert not errors,errors[:2]
    if stage=="after":
        compare_views()


def compare_views():
    sheet=Image.new("RGB",(1440,1028),"#f4efdf")
    draw=ImageDraw.Draw(sheet)
    font=ImageFont.truetype("C:/Windows/Fonts/msyh.ttc",24)
    for row,(slug,title) in enumerate([("marsh","芦影沼泽"),("prairie","风行草原")]):
        for col,(stage,label) in enumerate([("before","改动前"),("after","改动后")]):
            name=f"preserve-foliage-{stage}-{slug}-overview.jpg"
            with Image.open(game.OUT/name) as im:
                sheet.paste(im.resize((720,480),Image.Resampling.LANCZOS),(col*720,row*514+34))
            draw.text((col*720+10,row*514+2),f"{title} · {label}",font=font,fill="#344a3d")
    sheet.save(game.OUT/"preserve-foliage-comparison.jpg",quality=91)


def traverse(browser, base):
    ctx,p=game.start(browser,base)
    game.tap(p,"close")
    p.keyboard.press("F3")
    p.add_style_tag(content=".toast,#toast{display:none!important}")
    errors=[]
    p.on("pageerror",lambda err:errors.append(str(err)))
    p.on("console",lambda msg:errors.append(msg.text) if "Shader Error" in msg.text else None)
    held={}
    def hold(route):
        held[route.request.url.rsplit("/",1)[-1]]=route
    p.route("**/companions/redwood-tree.glb",hold)
    p.route("**/companions/bear.glb",hold)
    p.evaluate("""()=>{window.bear=g.preserves.wildlife.find(w=>w.id==='ranch-bear');
      window.trees=g.preserves.layouts.get('redwoods').find(b=>b.asset==='redwood-tree');
      window.approach=d=>{const x=bear.baseX,z=bear.baseZ-d;go(x,z);
        look([x,s.world.terrain(x,z)+2.3,z],[bear.x,2,bear.z]);step(2)};
      window.mask=()=>{const m=bear.model,rigs=[m.current,m.incoming].filter(Boolean);
        const weights=rigs.filter(r=>r.ready&&r.model.group.visible).map(r=>r.range.value.y-r.range.value.x);
        return {weight:m.sprite.weight+weights.reduce((sum,w)=>sum+w,0),sprite:m.sprite.weight,
        tier:m.current?.tier??null,incoming:m.incoming?.tier??null,canopy:trees.sprites.filter(t=>t.weight>.001).length,
        crossed:trees.sprites.filter(t=>t.weight>.001&&t.weight<.999).length};}; approach(110);}""")
    p.wait_for_function("g.preserves.horizon.mesh.material.uniforms.map.value.image?.width>0")
    p.evaluate("""()=>{a.director.setTime(840);a.director.update(a.director.weather.time+40);
      look([bear.baseX+7,14,bear.baseZ-108],[bear.baseX,10,bear.baseZ]);step(18)}""")
    p.screenshot(path=game.OUT/"preserve-foliage-approach-horizon.jpg",quality=90)
    start=p.evaluate("mask()")
    assert start["tier"] is None and start["sprite"]==1 and start["canopy"]>0,start
    # Traverse the previous 60/46 m chunk boundary while the tree request is held.
    history=[]
    for distance in range(105,34,-2):
        p.evaluate("d=>approach(d)",distance)
        state=p.evaluate("mask()");history.append(state)
        assert abs(state["weight"]-1)<.002 and state["canopy"]==start["canopy"],state
    p.wait_for_function("bear.model.current?.tier==='far' || bear.model.incoming?.ready")
    p.evaluate("step(20)")
    p.screenshot(path=game.OUT/"preserve-foliage-approach-delayed.jpg",quality=90)
    held.pop("redwood-tree.glb").continue_()
    p.wait_for_function("g.preserves.chunks.get('redwoods').getObjectByName('grove-redwood-tree')")
    p.evaluate("step(6)")
    assert p.evaluate("mask().crossed>0")
    p.screenshot(path=game.OUT/"preserve-foliage-approach-canopy-fade.jpg",quality=90)
    for distance in [32,28,24,19,17,15,13,12]:
        p.evaluate("d=>approach(d)",distance)
    p.wait_for_function("bear.model.incoming?.tier==='near'")
    waiting=p.evaluate("mask()")
    assert waiting["tier"]=="far" and abs(waiting["weight"]-1)<.002,waiting
    p.evaluate("""()=>{const T=a.ctx.THREE,aim=new T.Vector3(bear.x,bear.model.group.position.y+.74,bear.z);
      const trunks=trees.poses;let best=-Infinity,eye=[];
      for(let i=0;i<48;i++){const theta=i*Math.PI/24,dx=Math.sin(theta),dz=Math.cos(theta);
        const x=bear.x+dx*6.8,z=bear.z+dz*6.8;
        const clearance=Math.min(...trunks.map(t=>{const ax=t.x-bear.x,az=t.z-bear.z;
          const v=Math.max(0,Math.min(7.8,ax*dx+az*dz));return Math.hypot(ax-v*dx,az-v*dz)}));
        if(clearance>best){best=clearance;eye=[x,s.world.terrain(x,z)+1.56,z]}}
      look(eye,aim.toArray());step(2)}""")
    p.screenshot(path=game.OUT/"preserve-foliage-approach-held-bear.jpg",quality=90)
    p.unroute("**/companions/bear.glb",hold)
    held.pop("bear.glb").continue_()
    p.wait_for_function("bear.model.incoming?.ready")
    samples=p.evaluate("""()=>Array.from({length:22},()=>{step();return mask()})""")
    assert any(v["tier"]=="far" and v["incoming"]=="near" for v in samples)
    assert all(abs(v["weight"]-1)<.002 for v in samples) and samples[-1]["tier"]=="near",samples
    for distance in range(13,115,2):
        p.evaluate("d=>approach(d)",distance)
        history.append(p.evaluate("mask()"))
    end=p.evaluate("mask()")
    assert end["tier"] is None and end["sprite"]==1 and end["canopy"]==start["canopy"],end
    assert all(abs(v["weight"]-1)<.002 for v in history)
    def shore():
        return p.evaluate("""()=>{const r=g.preserves.rects.find(r=>r.biome==='marsh'),
          x=r.maxX-3.2,z=(r.minZ+r.maxZ)/2+7;go(x,z);look([x,2.4,z],[x-21,1,z-6]);step(5);
          return a.ctx.grassField.stats.activeTufts}""")
    medium=shore()
    p.wait_for_timeout(850);p.evaluate("step(24)")
    p.screenshot(path=game.OUT/"preserve-foliage-marsh-walking.jpg",quality=91)
    p.evaluate("g.graphics.set('low')");low=shore()
    assert 0<low<medium,(low,medium)
    p.screenshot(path=game.OUT/"preserve-foliage-marsh-low.jpg",quality=89)
    assert not errors,errors[:2]
    result={"routeSamples":len(history)+len(samples),"minCoverage":min(v["weight"] for v in history+samples),
        "maxCoverage":max(v["weight"] for v in history+samples),"heldBear":waiting,"start":start,"end":end,
        "mediumTufts":medium,"lowTufts":low}
    (game.OUT/"preserve-foliage-streaming.json").write_text(json.dumps(result,indent=2),encoding="utf8")
    print(result,flush=True);ctx.close()


if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--stage",default="after",choices=["before","after"])
    ap.add_argument("--traverse",action="store_true")
    ap.add_argument("--base",default="http://127.0.0.1:5180")
    args=ap.parse_args()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel="chrome",headless=True,args=["--use-gl=angle","--ignore-gpu-blocklist"])
        if args.traverse:traverse(browser,args.base)
        else:run(browser,args.base,args.stage)
        browser.close()
