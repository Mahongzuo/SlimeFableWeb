"""Check the rendered sign geometry on both sides, including arbitrarily rotated and scaled signs."""
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("homeqa",root/"scripts/qa-home-companions.py")
homeqa=importlib.util.module_from_spec(spec)
spec.loader.exec_module(homeqa)
out=root/"qa/evidence"

with sync_playwright() as pw:
    browser=pw.chromium.launch(channel="chrome",headless=True,args=['--enable-webgl','--use-gl=angle','--ignore-gpu-blocklist'])
    context,p=homeqa.start(browser,"http://127.0.0.1:5180")
    homeqa.tap(p,'close')
    p.keyboard.press('F3')
    p.add_style_tag(content=".toast,#toast {display:none!important}")
    p.evaluate("""()=>{go(-.35,-14.8);a.director.mode='clear';a.director.setTime(810);step(12);
      window.boards=[];a.ctx.scene.traverse(n=>{if(n.name==='signpost')boards.push(n)});
      window.sign=boards.find(n=>n.userData.signTitle==='南溪浅湾');if(!sign)throw Error('missing creek sign');
      window.poseSign=(eye,target)=>{const T=a.ctx.THREE;sign.updateWorldMatrix(true,true);
        look(sign.localToWorld(new T.Vector3(...eye)).toArray(),sign.localToWorld(new T.Vector3(...target)).toArray());step(3)};
    }""")
    for name,eye,target in [
        ('creek-front',[.02,1.55,3.35],[0,1.38,0]),('creek-back',[.08,1.52,-3.35],[0,1.36,0]),
        ('creek-low-angle',[1.75,.53,2.13],[0,1.45,0]),
    ]:
        p.evaluate("([eye,target])=>poseSign(eye,target)",[eye,target])
        p.screenshot(path=out/('home-signposts-'+name+'.jpg'),quality=91)
    result=p.evaluate("""()=>{const T=a.ctx.THREE;
      function verify(panel,posts,sidePosts=false){
        panel.updateWorldMatrix(true,false);panel.geometry.computeBoundingBox();
        const b=panel.geometry.boundingBox,edge=(b.max.x-b.min.x),height=b.max.y-b.min.y,rows=[];
        for(const post of posts){
          const loc=panel.worldToLocal(post.getWorldPosition(new T.Vector3())),sx=sidePosts?Math.sign(loc.x)*(b.max.x-.015):loc.x;
          for(const h of [.018,.25,.60,.94])for(const side of [-1,1])for(const slant of [0,.65]){
            const target=new T.Vector3(sx,b.min.y+h*height,side*b.max.z);
            const origin=panel.localToWorld(target.clone().add(new T.Vector3(slant*.3,-slant*.1,side*1.1)));
            const dest=panel.localToWorld(target);
            const ray=new T.Raycaster(origin,dest.sub(origin).normalize());
            const hit=ray.intersectObjects([panel,...posts],false)[0];
            if(hit?.object!==panel)throw Error('post covers '+panel.name+' at '+sx+'/'+h+'/'+side+'/'+slant);
            rows.push(1);
          }
        }
        return rows.length;
      }
      function verifyBatched(g){
        // The farm consolidates sign parts into static geometry. Probe its finished world mesh.
        const ray=new T.Raycaster();ray.camera=a.camera;ray.layers.enableAll();
        let count=0;
        for(const x of [-.62,.62])for(const y of [1.389,1.58,1.81,2.08])for(const side of [-1,1])for(const slant of [0,.5]){
          const dest=g.localToWorld(new T.Vector3(x,y,side*.08));
          const origin=g.localToWorld(new T.Vector3(x+slant*.04,y-slant*.018,side*.26));
          ray.set(origin,dest.clone().sub(origin).normalize());ray.far=.36;
          const hits=ray.intersectObject(g.parent,true);if(!hits.length||hits[0].point.distanceTo(dest)>.004)throw Error('batched farm sign surface '+JSON.stringify([x,y,side,hits[0]?.point]));
          count++;
        }
        return count;
      }
      const out=boards.map(g=>{const board=g.getObjectByName('sign-panel');return {title:g.userData.signTitle,probes:board?verify(board,g.children.filter(n=>n.name==='sign-support')):verifyBatched(g)};});
      const garden=g.cottage.shell;out.push({title:'临水小院',probes:verify(garden.getObjectByName('garden-sign-panel'),[garden.getObjectByName('garden-sign-support')])});
      const notice=a.ctx.scene.getObjectByName('request-board');
      if(notice)out.push({title:'委托板',probes:verify(notice.getObjectByName('notice-panel'),notice.children.filter(n=>n.name==='notice-support'),true)});
      const checked=new Map();
      function probePreserves(){g.preserves.root.traverse(n=>{if(n.name!=='preserve-sign-panel')return;
        const key=n.position.x+','+n.position.z;if(checked.has(key))return;
        const leg=n.parent.children.find(v=>v.name==='preserve-sign-support'&&v.position.x===n.position.x&&v.position.z===n.position.z);
        if(!leg)throw Error('unattached preserve sign');checked.set(key,verify(n,[leg]));
      });}
      probePreserves();
      for(const r of g.preserves.rects.filter(r=>r.biome!=='trail')){
        go((r.minX+r.maxX)/2,(r.minZ+r.maxZ)/2);probePreserves();
      }
      if(checked.size<12)throw Error('missing preserve signs '+checked.size);
      return {boards:out,preserveBoards:checked.size,preserveProbes:[...checked.values()].reduce((a,b)=>a+b,0)};
    }""")
    assert len(result['boards'])>=12,result
    (out/'home-signposts-probes.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print(result,flush=True);browser.close()

