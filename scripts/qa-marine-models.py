"""Exercise streamed art in a private headless production session."""
import functools
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / 'qa/evidence'


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


with http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root / 'dist'))) as server, sync_playwright() as pw:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    browser = pw.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    page = browser.new_page(viewport={'width': 960, 'height': 620}, has_touch=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text[:800]) if m.type == 'error' or
            (m.type == 'warning' and m.text.startswith(('Ocean reef:', 'Island models:', 'Ocean fish:'))) else None)
    page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
    page.on('response', lambda r: errors.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    page.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
        localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'medium',homeWeather:'clear',homeClockMinute:730}));""")
    page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='domcontentloaded')
    page.wait_for_function('window.__slime?.ready && __game.state==="play" && __app.pipeline.time>1', timeout=200000)
    page.add_style_tag(content='body > :not(canvas){visibility:hidden!important}')
    page.evaluate("""()=>{window.o=__ocean;window.s=__slime;window.a=__app;
      a.renderer.setAnimationLoop(null);__homeCalib.setInstantExposure(true);
      __game.save.data.life.sailing={flag:4205,waters:307,reserve:0,run:null};
      window.visit=(x,z,y)=>{o.syncSea(x,z);s.teleport([x,y,z]);o.update(o.lastWaveTime+.02,.02)};
      window.tiles=()=>Array.from(o.islands.tiles.values()).filter(t=>t.mesh.userData.near);
      window.grove=t=>t.mesh.getObjectByName('water-pro-island-grove');
      window.signature=t=>grove(t).children.map(m=>[m.name,Array.from(m.instanceMatrix.array)]); 
      a.ctx.onUpdate(()=>{if(window.pose){a.camera.position.fromArray(pose[0]);a.camera.lookAt(...pose[1]);a.camera.updateMatrixWorld()}});
      visit(0,0,2)}""")
    assert page.evaluate('o.islands.shores.length===0 && !a.scene.getObjectByName("water-pro-island-grove")')
    page.evaluate('visit(5,-580,-1)')
    page.wait_for_function('tiles().some(t=>grove(t)?.children.length>3)', timeout=90000)
    island = page.evaluate("""()=>{window.chosen=tiles().filter(t=>t.island.kind===0).sort((a,b)=>b.island.r-a.island.r)[0] || tiles()[0];
       window.i=chosen.island;visit(i.x,i.z,o.bed(i.x,i.z)+1);return i}""")
    x, z, r = (island[k] for k in ('x', 'z', 'r'))
    page.wait_for_function('grove(tiles().find(t=>t.island.x===i.x&&t.island.z===i.z))?.children.length>3')
    def shot(name, pos, target):
        page.evaluate('p=>{window.pose=p;a.step(.016);a.step(.016)}', [pos, target])
        page.screenshot(path=out/f'marine-models-{name}.jpg',quality=91, timeout=90000)
    shot('island', [x+r*1.38, r*1.02+4, z+r*1.45], [x, .7, z])
    shot('beach', [x-r*1.18, 4.5, z+r*.8], [x, 2.2, z])
    first = page.evaluate("""()=>{const t=tiles().find(t=>t.island.x===i.x&&t.island.z===i.z);return signature(t)}""")
    assert all(any(row[0].startswith(name) for row in first) for name in ('palm','outcrop','shrub'))
    sizes = page.evaluate('tiles().map(t=>t.island.r)')
    assert len(set(sizes)) > 1
    collision = page.evaluate("""()=>{const t=tiles().find(t=>t.island.x===i.x&&t.island.z===i.z);
      const rocks=grove(t).children.filter(m=>m.name.startsWith('outcrop'));
      const T=a.ctx.THREE, ray=new T.Raycaster(), dir=new T.Vector3(0,-1,0);
      ray.layers.set(1);t.mesh.updateMatrixWorld(true);const errors=[];
      for(const patch of t.outcrops.patches){
        let peak=-Infinity, sample;
        for(let j=0;j<patch.grid.values.length;j++){
          const v=patch.grid.values[j], x=patch.min[0]+(j%patch.grid.width)*.5, z=patch.min[1]+Math.floor(j/patch.grid.width)*.5;
          const rise=v-t.outcrops.top(x,z,-100);
          if(rise>.08||v<peak)continue;peak=v;sample=[x,z];
        }
        if(!sample)continue;ray.set(new T.Vector3(sample[0],100,sample[1]),dir);
        const hit=ray.intersectObjects(rocks,false)[0];if(hit)errors.push(Math.abs(hit.point.y-s.world.terrain(...sample)));
      }
      return errors}""")
    assert len(collision)>=3 and max(collision)<.42, collision
    other=page.evaluate("""()=>{const t=Array.from(o.islands.tiles.values()).filter(t=>t.island.kind!==i.kind)
       .sort((a,b)=>Math.abs(b.island.r-i.r)-Math.abs(a.island.r-i.r))[0];return t.island}""")
    ox,oz,rr=(other[k] for k in ('x','z','r'))
    page.evaluate('p=>visit(...p)',[ox,oz,1])
    page.wait_for_function('p=>tiles().some(t=>t.island.x===p[0]&&t.island.z===p[1]&&grove(t)?.children.length>3)',arg=[ox,oz])
    shot('second-island',[ox-rr*1.65,rr*.8+4,oz+rr*1.55],[ox,1.2,oz])
    sandbar = page.evaluate("""()=>{for(const [x,z] of [[i.x,i.z],[640,-700],[-780,-360],[1200,-900]]){
      visit(x,z,0);
      const t=Array.from(o.islands.tiles.values()).filter(t=>t.island.kind===0).sort((a,b)=>a.island.r-b.island.r)[0];
      if(t)return t.island;
    }throw Error('Missing sandbar on test route')}""")
    bx,bz,br=(sandbar[k] for k in ('x','z','r'))
    page.evaluate('p=>visit(...p)',[bx,bz,1])
    page.wait_for_function('p=>tiles().some(t=>t.island.x===p[0]&&t.island.z===p[1]&&grove(t)?.children.length>3)',arg=[bx,bz])
    shot('sandbar',[bx+br*.92,br*1.06+2,bz+br*1.53],[bx,.65,bz])
    page.evaluate('visit(0,0,2)')
    assert page.evaluate('o.islands.shores.length===0 && !a.scene.getObjectByName("water-pro-island-grove")')
    page.evaluate('visit(i.x,i.z,2)')
    page.wait_for_function('tiles().some(t=>grove(t)?.children.length>3)')
    assert first == page.evaluate('signature(tiles().find(t=>t.island.x===i.x&&t.island.z===i.z))')
    page.evaluate('visit(5,-98,-5);a.step(.016)')
    page.wait_for_function('o.reef.root.children.length>=13')
    reef = page.evaluate("""()=>{const meshes=o.reef.root.children, index=m=>{let a=m.instanceMatrix.array;return Array.from({length:m.count},(_,i)=>[a[i*16+12],a[i*16+13],a[i*16+14]])};
       const corals=meshes.filter(m=>m.name.startsWith('coral')).flatMap(index);
       const stones=meshes.slice(0,7).flatMap(index);
       const plants=meshes.slice(7,10).flatMap(index);
       const nearby=(list,p,r)=>list.filter(q=>Math.hypot(p[0]-q[0],p[2]-q[2])<r).length;
       const score=p=>Math.min(3,nearby(stones,p,5)) + Math.min(4,nearby(plants,p,5));
       const picked=corals.filter(p=>p[1]<-4.5&&p[1]>-9).sort((a,b)=>score(b)-score(a))[0];
       return {picked,corals:corals.length,rocks:stones.length,plants:meshes.slice(7,10).reduce((a,m)=>a+m.count,0)} }""")
    assert reef['picked'] and reef['plants'] and reef['rocks'], reef
    rx, ry, rz = reef['picked']
    shot('reef', [rx+3.7, ry+2.15, rz+5.1], [rx, ry+.3, rz])
    shot('reef-side', [rx-4.4, ry+1.25, rz+2.8], [rx, ry+.32, rz])
    instances = page.evaluate("""()=>{const counts=[];for(const q of ['low','medium','high','ultra']){__graphics.set(q);o.update(o.lastWaveTime+.02,.02);
       counts.push(o.reef.root.children.reduce((n,m)=>n+m.count,0))}return counts}""")
    assert all(instances), instances
    fauna = page.evaluate("""()=>({fish:o.sea.fish.filter(g=>g.getObjectByName('water-pro-fish')).length,
      gulls:o.sea.gulls.filter(g=>g.visible && g.children.length>0).length})""")
    assert fauna == {'fish':3, 'gulls':4}, fauna
    animation=page.evaluate("""()=>{const fish=o.sea.fish[0], bones=[];fish.traverse(n=>{if(n.isBone)bones.push(n)});
      const poses=()=>bones.map(n=>n.quaternion.toArray().concat(n.position.toArray())).flat().join(',');
      const before=poses();o.sea.swimmers[0].update(.22);
      const wing=o.sea.gulls[0].getObjectByName('Wing1'),start=wing.quaternion.clone();
      a.step(.04);a.step(.04);
      return {bones:bones.length,fishMoved:poses()!==before,wingAngle:wing.quaternion.angleTo(start),
        coastalVariants:a.scene.getObjectByName('island-coastal-reefs').children.length}}""")
    assert animation['fishMoved'] and animation['wingAngle']>.0001 and animation['coastalVariants']==7, animation
    result = dict(island=island, secondIsland=other, sandbar=sandbar, rockRayErrors=collision, animation=animation, radii=sizes, repeatable=True, returnUnload=True, reef=reef, densityCounts=instances, fauna=fauna, errors=errors)
    print(result, flush=True)
    assert not errors, errors
    (out / 'marine-models-results.json').write_text(json.dumps(result, indent=2), encoding='utf8')
    browser.close()
    server.shutdown()
