"""Private headless captures of the fishing reference, terrain contacts and production angling."""
import base64
import functools
import http.server
import json
import subprocess
import sys
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / 'qa/evidence'
stage = sys.argv[1]
reference = stage in ('reference','reference-motion')
site = root.parent/'Gamedemo/fishing-3d' if reference else root/'dist'

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

with http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(site))) as server, sync_playwright() as pw:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    page=browser.new_page(viewport={'width':900,'height':560},has_touch=True)
    page.add_init_script("""localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'medium',homeWeather:'clear',homeClockMinute:730,life:{bag:{'bait-worm':6,'fish-carp':3},dex:{'fish-carp':{n:3,best:60,first:1732752000000}},home:{fishing:{rodTier:2,ponds:{test:{fishId:'fish-carp',count:1}}}}}}))""")
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text[:700]) if m.type=='error' and '404' not in m.text and 'net::' not in m.text else None)
    if stage=='legacy':
        entry="""import {LifeUI} from './src/ui/life-ui';import {freshLife,ensureHome} from './src/life/state';
        const life=freshLife();life.dex['fish-carp']={n:3,best:60,first:1732752000000};life.bag['fish-carp']=3;ensureHome(life);
        const ui=new LifeUI();ui.openTab('dex',life);
        const sec=[...document.querySelectorAll('.dex section')].find(s=>s.querySelector('h3')?.textContent.includes('鱼'));
        sec.scrollIntoView({block:'start'});"""
        build="""const fs=require('fs'),path=require('path'),cp=require('child_process'),es=require('esbuild');
        const entry=fs.readFileSync(0,'utf8');
        es.build({stdin:{contents:entry,resolveDir:process.cwd()},bundle:true,format:'iife',write:false,
          plugins:[{name:'legacy-fish-book',setup(build){build.onLoad({filter:/(state|catalog|fishing|life-ui)[.]ts$/},args=>{
            const f=path.relative(process.cwd(),args.path).split(path.sep).join('/');
            if(!['src/ui/life-ui.ts','src/life/state.ts','src/life/fishing.ts','src/life/catalog.ts'].includes(f))return;
            return {contents:cp.execFileSync('git',['show','1cefe66:'+f],{encoding:'utf8'}),loader:'ts',resolveDir:path.dirname(args.path)}
          })}}]}).then(result=>process.stdout.write(result.outputFiles[0].text));"""
        bundle=subprocess.run(['node','-e',build],input=entry.encode(),capture_output=True,check=True).stdout
        css=next((site/'assets').glob('ui-*.css')).name
        page.route('**/legacy.html',lambda r:r.fulfill(content_type='text/html',body='<meta charset="utf-8"><link rel="stylesheet" href="assets/'+css+'"><body style="background:#cbe0df"><script src="old-book.js"></script>'))
        page.route('**/old-book.js',lambda r:r.fulfill(content_type='text/javascript',body=bundle))
    if stage=='atlas':
        entry="""import * as T from 'three';import {anglingFish,disposeFish} from './src/home/angling-fish';
        import {extraFish} from './src/life/fish-species';
        const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
        renderer.setSize(400,240);renderer.setClearColor(0,0);
        const scene=new T.Scene(),camera=new T.OrthographicCamera(-.86,.86,.516,-.516,.01,12);
        camera.layers.enable(1);const hemi=new T.HemisphereLight(0xfff5d9,0xb7cfdb,2.15);
        const sun=new T.DirectionalLight(0xffe6b8,2.8);sun.position.set(2,4,3);scene.add(hemi,sun);
        window.portraits=()=>extraFish.filter(s=>!s.id.startsWith('fish-cove-')).map(s=>{
          const mesh=anglingFish(s.id,false);scene.add(mesh);
          const data={id:s.id.slice(5)};
          for(const [name,y] of [['side',.42],['top',7]]){
            camera.up.set(0,name==='top'?0:1,name==='top'?-1:0);camera.position.set(name==='top'?-.04:.15,y,name==='top'?.001:3);camera.lookAt(-.04,0,0);
            renderer.render(scene,camera);data[name]=renderer.domElement.toDataURL();
          }
          disposeFish(mesh);return data;
        });"""
        build="const fs=require('fs'),es=require('esbuild');const data=fs.readFileSync(0,'utf8');const r=es.buildSync({stdin:{contents:data,resolveDir:process.cwd()},bundle:true,format:'iife',write:false});process.stdout.write(r.outputFiles[0].text)"
        bundle=subprocess.run(['node','-e',build],input=entry.encode(),capture_output=True,check=True).stdout
        page.route('**/atlas.html',lambda r:r.fulfill(content_type='text/html',body='<script src="atlas.js"></script>'))
        page.route('**/atlas.js',lambda r:r.fulfill(content_type='text/javascript',body=bundle))
    if reference:
        js=next((site/'assets').glob('*.js')).read_text('utf8').replace('window.__slackwater={','window.ref={game:b,boat:f,rod:x,render:ln,portrait:Ju,catalog:di};window.__slackwater={')
        page.route('**/assets/*.js',lambda route:route.fulfill(content_type='text/javascript',body=js))
    if stage=='play':
        page.add_init_script("""let lock=null;Object.defineProperty(document,'pointerLockElement',{get:()=>lock});Element.prototype.requestPointerLock=function(){lock=this;queueMicrotask(()=>document.dispatchEvent(new Event('pointerlockchange')));return Promise.resolve()};document.exitPointerLock=()=>{lock=null;queueMicrotask(()=>document.dispatchEvent(new Event('pointerlockchange')))};""")
    else:
        page.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
    page.add_init_script("""const report=console.error.bind(console);console.error=(...args)=>{if(args[0]?.toString().includes('Computed radius is NaN')){const obj=args[1],names=[];window.__app?.scene.traverse(o=>{if(o.geometry===obj)names.push(o.name||o.parent.name)});report('geometry context '+JSON.stringify([names,obj?.type,window.__ocean?.angling.session?.catch,new Error().stack]));}report(...args)}""")
    page.goto(f'http://127.0.0.1:{server.server_port}/'+(stage+'.html' if stage in ('atlas','legacy') else ''),wait_until='domcontentloaded')
    def shot(name):
        page.screenshot(path=out/f'fishing-ground-{stage}-{name}.jpg',quality=88)
    def frame():
        import io
        from PIL import Image
        im=Image.open(io.BytesIO(page.screenshot(type='jpeg',quality=85))).convert('RGB')
        im.thumbnail((640,520))
        return im
    def motion(name,frames,ms):
        frames[0].save(out/('fishing-ground-'+name+'.webp'),save_all=True,append_images=frames[1:],duration=ms,loop=0,quality=82)
    if stage=='reference-motion':
        page.wait_for_function('window.ref',timeout=120000)
        for name,times in [('cast',[6+.12*j for j in range(12)]),('reel',[9+.21*j for j in range(12)]),('caught',[12.1+.16*j for j in range(12)])]:
            frames=[]
            for t in times:
                page.evaluate('t=>__slackwater.seekAttract(t)',t)
                frames.append(frame())
            motion('reference-'+name,frames,144)
        page.evaluate('__slackwater.seekAttract(9.4)')
        frames=[frame()]
        page.evaluate('()=>{__slackwater.takeover();ref.rod.forceCancel();ref.render()}')
        for j in range(7):
            page.wait_for_timeout(110);frames.append(frame())
        motion('reference-retrieve',frames,130)
    elif stage=='legacy':
        page.wait_for_selector('.dex .grid');shot('book')
    elif stage=='atlas':
        import io
        from PIL import Image, ImageDraw
        samples=['ribbonfish','flounder','lionfish','swordfish','yellow-catfish','turbot']
        sheet=Image.new('RGB',(720,6*116),'#e9eee8')
        for entry in page.evaluate('portraits()'):
            imgs=[Image.open(io.BytesIO(base64.b64decode(entry[k].split(',')[1]))).convert('RGBA') for k in ['side','top']]
            flat=entry['id'] in ('flounder','turbot')
            icon=imgs[1 if flat else 0].copy();icon.thumbnail((240,144));icon.save(root/'public/ocean/fish'/(entry['id']+'.png'))
            if entry['id'] in samples:
                y=samples.index(entry['id'])*116
                for j,im in enumerate(imgs):
                    im.thumbnail((295,114));sheet.paste(im,(j*310+75,y),im)
                ImageDraw.Draw(sheet).text((9,y+49),entry['id'],fill='#273739')
        sheet.save(out/'fishing-ground-fish-shapes.jpg',quality=90)
    elif reference:
        page.wait_for_function('window.ref',timeout=120000)
        times=page.evaluate("""()=>{let times={};for(let t=0;t<115;t+=1.5){__slackwater.seekAttract(t);const state=ref.rod.getVisualState().mode;if(!(state in times))times[state]=t+.35}return times}""")
        print(times,flush=True)
        for state,t in times.items():
            page.evaluate('t=>__slackwater.seekAttract(t)',t)
            shot(state.lower())
        page.evaluate('()=>{__slackwater.takeover();ref.rod.forceCancel();ref.render()}')
        shot('retrieve')
        icons=root/'public/ocean/fish';icons.mkdir(parents=True,exist_ok=True)
        library={}
        for key,model in page.evaluate("""()=>Object.fromEntries(Object.keys(ref.catalog).map(k=>{
          const b=ref.boat;b.applySpeciesToMiniFish({species:k,lengthCm:ref.catalog[k].maxCm});
          const m=b.catchFishPivot.clone(true);m.rotation.set(0,0,0);m.position.set(0,0,0);
          const remove=[];m.traverse(o=>{if(!o.visible||o.isLight)remove.push(o);
            if(o.isMesh){o.material=o.material.clone();for(const key of ['map','normalMap','roughnessMap','envMap'])o.material[key]=null;}});
          for(const o of remove)o.removeFromParent();return [k,m.toJSON()]
        }))""").items():
            for geom in model.pop('geometries'):
                library[geom['uuid']]=geom
            (icons/(key+'.json')).write_text(json.dumps(model,separators=(',',':')),encoding='utf8')
        (icons/'geometry.json').write_text(json.dumps(list(library.values()),separators=(',',':')),encoding='utf8')
        for key,uri in page.evaluate('Object.fromEntries(Object.keys(ref.catalog).map(k=>[k,ref.portrait(k)]))').items():
            (icons/(key+'.png')).write_bytes(base64.b64decode(uri.split(',',1)[1]))
    elif stage=='gallery':
        # Only the first species roll is fixed. The live game still validates water and settles the fight.
        page.wait_for_function('window.__slime?.ready && __game.state==="play" && __app.pipeline.time>1',timeout=180000)
        entry="""import {pickFish} from './src/life/fishing';import {beijingSky} from './src/home/climate';
        window.rollFor=(species,spot)=>{const f=__ocean.angling,d=f.deps;
          const e={hour:d.ctx.anglingHour(),historyDay:d.isHistoryDay(),season:beijingSky(Date.now()).season,raining:d.ctx.weather.rain>.3,snowing:d.ctx.weather.snow>.3,lure:0};
          for(let i=0;i<2000;i++){const r=(i+.5)/2000;if(pickFish(spot,e,'bait-worm',()=>r).fish===species)return r}throw Error(species);};"""
        build="const es=require('esbuild'),fs=require('fs');process.stdout.write(es.buildSync({stdin:{contents:fs.readFileSync(0,'utf8'),resolveDir:process.cwd()},bundle:true,format:'iife',write:false}).outputFiles[0].text)"
        js=subprocess.run(['node','-e',build],input=entry.encode(),capture_output=True,check=True).stdout
        page.add_script_tag(content=js.decode())
        page.evaluate("""()=>{window.g=__game;window.o=__ocean;window.s=__slime;window.a=__app;window.f=o.angling;
          a.renderer.setAnimationLoop(null);__homeCalib.setInstantExposure(true);window.t=a.pipeline.time;
          window.tick=(n=1)=>{for(let i=0;i<n;i++)g.update(t+=.033,.033)};
          window.p=g.zones.interactables.find(i=>i.id==='fish-harbor-pier');g.save.data.life.sailing={flag:4205,waters:307,reserve:0,run:null};
          s.teleport(p.position);tick();p.act();tick(24)}""")
        gallery=[('yellow-catfish','canal'),('ribbonfish','offshore'),('swordfish','offshore'),('flounder','reef'),('lionfish','reef'),('turbot','reef')]
        for species,water in gallery:
            if water!='canal':
                if not page.evaluate('o.run'):page.locator('[data-voyage=launch]').click()
                page.evaluate("""w=>{Object.assign(o.run,{x:w==='reef'?-544:-997,z:w==='reef'?-295:-1610,threshold:1e8,yaw:0});
                  o.syncSea(o.run.x,o.run.z);tick(4);o.startBoatFishing();tick(40)}""",water)
            record=page.evaluate("""([id,water])=>{const original=Math.random,desired=rollFor('fish-'+id,water);let first=true;
              Math.random=()=>{if(!first)return original();first=false;return desired};
              try{f.cast()}finally{Math.random=original}
              if(f.session?.catch.fish!=='fish-'+id)throw Error(id+' pool '+JSON.stringify(f.session?.catch));
              for(let j=0;j<1500 && !f.finished;j++){
                if(f.session.phase==='bite')f.session.hook();
                f.held=f.session.tension<.55;f.lean=f.session.fishPos>.5?-1:1;tick();
              }
              tick(36);a.step(.016);return f.session.phase}""",[species,water])
            assert record=='caught',species
            shot(species)
            page.keyboard.press('Escape');page.evaluate('tick(3)')
    elif stage=='play':
        page.wait_for_function('window.__slime?.ready && __game.state==="play" && __app.pipeline.time>1',timeout=180000)
        page.evaluate('''()=>{window.a=__app;window.s=__slime;window.o=__ocean;window.g=__game;window.f=o.angling;
          a.renderer.setAnimationLoop(null);__homeCalib.setInstantExposure(true);
          window.t=a.pipeline.time;window.tick=(n=1)=>{for(let j=0;j<n;j++){g.update(t+=.033,.033)}};
          window.render=()=>a.step(.016);
          window.spot=id=>g.zones.interactables.find(i=>i.id===id);
          window.at=id=>{const p=spot(id);s.teleport(p.position);tick();p.act();tick(40)};
          window.result=()=>({phase:f.session?.phase,water:f.session?.spot,legal:f.site?.wet(f.target.x,f.target.z),target:f.target.toArray(),origin:f.origin.toArray(),camera:a.camera.position.toArray(),mode:o.mode});
          g.save.data.life.sailing={flag:4205,waters:307,reserve:0,run:null};
        }''')
        def check(expr):
            assert page.evaluate(expr), (expr,page.evaluate('result()'),errors)
        for entry in ['fish-harbor-pier','fish-harbor-pontoon','fish-east','fish-west','fish-pier']:
            page.evaluate('id=>at(id)',entry)
            print(entry,page.evaluate('result()'),flush=True)
            check('f.active && f.site.wet(f.target.x,f.target.z)')
            page.keyboard.press('Escape')
        def journal(label):
            page.locator('#harbor-angling [data-act=journal]').tap()
            check("g.life.dexOpen && document.querySelectorAll('#life-ui .dex .grid .cell').length===64")
            page.evaluate("document.querySelector('.dex').scrollTop=0")
            shot(label+'-journal')
            page.keyboard.press('Escape')
            check("f.active && !g.life.dexOpen")
        def cycle(label):
            frames=[]
            page.evaluate('tick(50);render()')
            shot(label+'-aim');frames.append(frame())
            page.keyboard.press('F1')
            check('f.help')
            page.evaluate('render()')
            shot(label+'-help')
            page.locator('#harbor-angling [data-act=help]').click()
            if label=='lake':
                journal('legacy')
                check("g.save.data.life.dex['fish-carp'].best===60 && g.save.data.life.home.fishing.rodTier===2 && g.save.data.life.home.fishing.ponds.test.fishId==='fish-carp'")
                point=page.evaluate('''()=>{const v=f.origin.clone().project(a.camera);return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]}''')
                page.mouse.click(*point)
                check("!f.session && g.save.data.life.bag['bait-worm']===6")
                point=page.evaluate('''()=>{const v=f.target.clone().project(a.camera);return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]}''')
                page.evaluate('window.nativeRandom=Math.random;Math.random=()=>.55')
                page.touchscreen.tap(*map(round,point))
                page.evaluate('Math.random=nativeRandom')
            else:
                page.keyboard.press('f')
            check("f.session?.phase==='cast'")
            if label=='lake':
                page.wait_for_function("f.fish?.children.length===1 && f.fish.children[0].isGroup",timeout=15000)
            for i in range(3):
                page.evaluate('tick(3);render()');frames.append(frame())
                if i==0: check('s.impact>.20')
                if i==2: check('s.jumpStretch>.18')
            shot(label+'-cast')
            page.evaluate("while(f.session.phase!=='bite')tick();render()")
            frames.append(frame())
            page.keyboard.down('f')
            page.evaluate('tick(14);render()')
            shot(label+'-reel')
            page.keyboard.down('Alt')
            check("s.pointerMenus.has('alt') && !document.pointerLockElement")
            page.keyboard.up('Alt')
            check("!s.pointerMenus.has('alt') && s.mode==='play'")
            page.keyboard.up('f')
            for _ in range(34):
                page.evaluate("()=>{for(let i=0;i<15 && !f.finished;i++){f.held=f.session.tension<.55;f.lean=f.session.fishPos>.5?-1:1;tick()}render()}")
                frames.append(frame())
                if page.evaluate('f.finished'):break
            for _ in range(5):
                page.evaluate('tick(6);render()');frames.append(frame())
            motion('play-'+label+'-sequence',frames,175)
            check("f.session.phase==='caught' && f.otter.celebrating")
            shot(label+'-caught')
            journal(label+'-registered')
            page.keyboard.press('Alt')
            page.keyboard.press('Escape')
            check('!f.active && !s.inputLock || !f.active && o.mode==="deck"')
        page.evaluate("at('fish-pier')")
        cycle('lake')
        page.evaluate("at('fish-pier')")
        page.keyboard.press('f')
        page.evaluate("while(f.session.phase!=='bite')tick()")
        page.keyboard.down('f')
        page.evaluate('tick(160);render()')
        page.keyboard.up('f')
        check("f.session.phase==='escaped'")
        shot('escape')
        page.keyboard.press('Escape')
        page.evaluate("s.teleport(spot('fish-harbor-pier').position);tick()")
        page.locator('[data-voyage=launch]').click()
        page.evaluate('tick(3)')
        check("o.mode==='deck'")
        page.set_viewport_size({'width':390,'height':844})
        page.keyboard.press('r')
        check("f.active && o.mode==='fishing'")
        cycle('boat')
        check("o.mode==='deck'")
        # Same running encounter spans every graphics setting with touch help open and closed.
        page.keyboard.press('r')
        for preset in ['low','medium','high','ultra']:
            page.evaluate('p=>{g.graphics.set(p);tick(3);render()}',preset)
            check("g.graphics.preset==='"+preset+"' && f.active")
            page.locator('#harbor-angling [data-act=help]').tap()
            check('f.help')
            page.keyboard.press('Escape')
            check('!f.help && f.active')
        page.keyboard.press('Escape');check("o.mode==='deck'")
        waters={}
        for label,x,z in [('reef',-544,-295),('offshore',-997,-1610)]:
            page.evaluate('''([x,z])=>{Object.assign(o.run,{x,z,threshold:1e8,yaw:0});o.syncSea(x,z);tick(3)}''',[x,z])
            page.keyboard.press('r');page.keyboard.press('f')
            check("f.session && f.session.spot==='"+label+"'")
            waters[label]=page.evaluate('f.target.toArray()')
            if label=='offshore':
                page.evaluate('o.run.threshold=0;o.run.farthest=0;tick(3)')
                check("!f.active && o.mode==='deck' && o.run.enemy")
                page.evaluate('o.run.enemy=null;o.run.threshold=1e8')
            else:
                page.keyboard.press('Escape')
        page.evaluate('window.berth=o.berth();Object.assign(o.run,berth);tick(4)')
        page.keyboard.press('r');page.keyboard.press('h')
        check("!o.run && !f.active && o.mode==='idle' && !s.inputLock")
        catches=page.evaluate("Object.entries(g.save.data.life.dex).filter(([k])=>k.startsWith('fish-'))")
        assert not page.evaluate("a.scene.getObjectByName('OtterCompanion') || f.site || f.session")
        (out/'fishing-ground-gameplay.json').write_text(json.dumps(dict(catches=catches,qualities=['low','medium','high','ultra'],entries=64,seaSpots=waters,encounterExit=True,portExit=True,portraitDeckReturn=True,help=True,simulatedAlt=True,dryCastRejected=True,otterUnloaded=True,errors=errors),indent=2),encoding='utf8')
    else:
        page.wait_for_function('window.__slime?.ready && __game.state==="play" && __app.pipeline.time>1',timeout=180000)
        page.evaluate("""()=>{window.a=__app;window.o=__ocean;window.s=__slime;a.renderer.setAnimationLoop(null);__homeCalib.setInstantExposure(true);
          __game.save.data.life.sailing={flag:4205,waters:307,reserve:0,run:null};
          a.ctx.onUpdate(()=>{if(window.pose){a.camera.position.fromArray(pose[0]);a.camera.lookAt(...pose[1]);a.camera.updateMatrixWorld()}});
          window.move=(x,z,y)=>{o.syncSea(x,z);s.teleport([x,y,z]);o.update(1,.016)};move(-544,-240,2)}""")
        page.wait_for_function('a.scene.getObjectByName("water-pro-island-grove") && [...o.islands.tiles.values()].find(t=>t.island.x===-544&&t.island.z===-240)?.mesh.getObjectByName("water-pro-island-grove")?.children.length')
        page.add_style_tag(content='body > :not(canvas){visibility:hidden!important}')
        for kind in ['palm','outcrop']:
            for side in [-1,1]:
                page.evaluate("""([kind,side])=>{let tile=[...o.islands.tiles.values()].find(t=>t.island.x===-544&&t.island.z===-240),group=tile.mesh.getObjectByName('water-pro-island-grove');
                  const m=group.children.find(m=>m.name.startsWith(kind)), v=new a.ctx.THREE.Matrix4();m.getMatrixAt(0,v);const x=v.elements[12]+tile.island.x,z=v.elements[14]+tile.island.z,y=tile.mesh.children[0];
                  const ray=new a.ctx.THREE.Raycaster();ray.layers.set(1);tile.mesh.updateMatrixWorld(true);
                  const bed=(x,z)=>{ray.set(new a.ctx.THREE.Vector3(x,35,z),new a.ctx.THREE.Vector3(0,-1,0));return ray.intersectObject(y)[0].point.y};
                  const dist=kind==='palm'?4:7;
                  window.pose=[[x+side*dist,bed(x+side*dist,z+2)+.43,z+2],[x,bed(x,z)+.48,z]];a.step(.016);a.step(.016)}""",[kind,side])
                shot(kind+str(side))
        if stage=='after':
            contacts=page.evaluate("""()=>{const T=a.ctx.THREE,ray=new T.Raycaster(),dir=new T.Vector3(0,-1,0);ray.layers.set(1);
              const result={},m=new T.Matrix4(),p=new T.Vector3();
              for(const tile of o.islands.tiles.values()){
                const kind=tile.island.kind;if(result[kind])continue;
                const group=tile.mesh.getObjectByName('water-pro-island-grove');if(!group?.children.length)continue;
                tile.mesh.updateMatrixWorld(true);const floor=tile.mesh.children[0];const stats={};
                for(const type of ['palm','outcrop']){
                  let max=-Infinity,count=0;
                  for(const mesh of group.children.filter(v=>v.name.startsWith(type))){
                    const pos=mesh.geometry.attributes.position,indices=[];
                    for(let j=0;j<pos.count;j++)if(Math.abs(pos.getY(j))<.0001)indices.push(j);
                    if(!indices.length)continue;
                    for(let n=0;n<Math.min(2,mesh.count);n++){mesh.getMatrixAt(n,m);m.premultiply(mesh.matrixWorld);
                      for(let j=0;j<indices.length;j+=Math.max(1,Math.floor(indices.length/12))){
                        p.fromBufferAttribute(pos,indices[j]).applyMatrix4(m);
                        ray.set(new T.Vector3(p.x,100,p.z),dir);
                        const hit=ray.intersectObject(floor)[0];if(!hit)throw Error('Missing terrain under '+mesh.name);
                        max=Math.max(max,p.y-hit.point.y);count++;
                      }
                    }
                  }
                  stats[type]={maxGap:max,count};
                }
                result[kind]=stats;
              }
              return result;
            }""")
            assert len(contacts)==3, contacts
            for kind,types in contacts.items():
                for typ,reading in types.items():
                    assert reading['count'] and reading['maxGap']<=(.02 if typ=='palm' else .05),reading
            walk=page.evaluate("""async()=>{const tile=[...o.islands.tiles.values()].find(t=>t.island.x===-544&&t.island.z===-240);
              const grove=tile.mesh.getObjectByName('water-pro-island-grove'),T=a.ctx.THREE,m=new T.Matrix4();
              const palm=grove.children.find(g=>g.name.startsWith('palm'));palm.getMatrixAt(0,m);
              const x=m.elements[12]+tile.island.x,z=m.elements[14]+tile.island.z;
              window.walkClock=a.pipeline.time;
              window.steps=async(n)=>{for(let j=0;j<n;j++){__game.update(walkClock+=.03,.03);await new Promise(r=>setTimeout(r,10));}};
              s.teleport([x-1.05,s.world.support(x-1.05,z+.38,Infinity,true)+.04,z+.38]);s.yaw=-Math.PI/2;
              const start=s.position.slice();s.keys.add('KeyW');await steps(31);s.keys.delete('KeyW');
              pose=[[x+3.6,tile.ground(x+3.6,z+2)+.68,z+2],[x,tile.ground(x,z)+.44,z]];a.step(.016);
              return {start,end:s.position.slice(),distance:Math.hypot(s.position[0]-start[0],s.position[2]-start[2])};
            }""")
            assert walk['distance']>.25,walk
            shot('slime-root')
            rock=page.evaluate("""async()=>{const tile=[...o.islands.tiles.values()].find(t=>t.island.x===-544&&t.island.z===-240);
              let best=null;for(const patch of tile.outcrops.patches){
                for(let j=0;j<patch.grid.values.length;j++){
                  const x=patch.min[0]+(j%patch.grid.width)*.5,z=patch.min[1]+Math.floor(j/patch.grid.width)*.5;
                  const y=patch.grid.values[j],h=y-tile.ground(x,z);
                  if(h<.42||h>1.6||y<-.05)continue;
                  const approach=[-1,1].map(d=>[d,tile.outcrops.top(x+d*.9,z)]);
                  const side=approach.sort((a,b)=>a[1]-b[1])[0],rise=y-side[1];
                  if(rise>.22 && rise<.47 && (!best || rise>best.rise))best={x,z,y,d:side[0],rise};
                }}
              if(!best)throw Error('Missing climbable shore rock');
              const {x,z,y,d}=best,sx=x+d*.9;
              s.teleport([sx,s.world.support(sx,z,Infinity,true)+.02,z]);await steps(8);
              s.yaw=d*Math.PI/2;s.keys.add('KeyW');window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
              await steps(8);window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));await steps(5);s.keys.delete('KeyW');await steps(20);
              const [xx,yy,zz]=s.position;pose=[[xx+3.4,yy+1.1,zz+3.2],[xx,yy+.47,zz]];a.step(.016);
              return {...best,foot:s.position.slice(),aboveSand:yy-tile.ground(xx,zz)};
            }""")
            shot('slime-rock')
            assert rock['aboveSand']>.15,rock
            page.evaluate("""()=>{const tile=[...o.islands.tiles.values()].find(t=>t.island.x===-544&&t.island.z===-240),i=tile.island;
              const x=i.x+i.r*1.48,z=i.z;move(x,z,-.49);pose=[[x+.7,.16,z+1],[i.x,.86,i.z]];a.step(.016);a.step(.016)}""")
            shot('slime-water-return')
            page.evaluate("""window.signature=()=>{const tile=[...o.islands.tiles.values()].find(t=>t.island.x===-544&&t.island.z===-240);
              return tile?.mesh.getObjectByName('water-pro-island-grove')?.children.map(m=>[m.name,Array.from(m.instanceMatrix.array)])}""")
            signature=page.evaluate('signature()')
            page.evaluate('move(0,0,2)')
            assert page.evaluate("o.islands.shores.length===0 && !a.scene.getObjectByName('water-pro-island-grove')")
            page.evaluate('move(-544,-240,2)')
            page.wait_for_function('signature()?.length')
            assert signature==page.evaluate('signature()')
            page.evaluate("""()=>{const x=-546,z=-289,y=o.bed(x,z);move(x,z,y+1);pose=[[x,y+1.3,z],[x+4,y+.6,z-4]];a.step(.016);a.step(.016)}""")
            shot('seabed')
            (out/'fishing-ground-contact-rays.json').write_text(json.dumps(dict(islands=contacts,returnUnload=True,repeatable=True,rootWalk=walk,rockStep=rock),indent=2),encoding='utf8')
    print('page errors',errors,flush=True)
    assert not errors
    browser.close()
    server.shutdown()
