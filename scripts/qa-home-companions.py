"""Production home checks. Isolated Chrome profile, no OS input or pointer lock."""
import argparse
import base64
import importlib.util
import io
import json
import statistics
import time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa/evidence'
KEY='slimefable.web.save.v1'
# Far residents use the baked atlas and intentionally own no animation rig.
PRESERVE_READY="""g.preserves.horizon?.mesh.material.uniforms.map.value.image?.width>0 &&
    g.preserves.wildlife.every(w=>w.model.incoming ? w.model.incoming.ready :
      w.model.current?.ready || w.model.sprite.weight===1)"""
def shot(p,name):
    p.screenshot(path=OUT/('home-companions-'+name+'.jpg'),type='jpeg',quality=89)
    print(name,flush=True)
def start(browser,base,portrait=False,old=None):
    context=browser.new_context(viewport={'width':412 if portrait else 960,'height':820 if portrait else 640},has_touch=portrait)
    context.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
    if old: context.add_init_script("if(!localStorage.getItem('"+KEY+"'))localStorage.setItem('"+KEY+"',"+json.dumps(json.dumps(old))+");")
    p=context.new_page();p.set_default_timeout(30000)
    p.on('pageerror',lambda err: print('PAGE ERROR',err,flush=True))
    p.goto(base,wait_until='domcontentloaded')
    p.wait_for_function("window.__game?.state==='play' && window.__slime?.ready",timeout=160000)
    p.evaluate("""()=>{window.g=__game;window.a=g.app;window.s=__slime;window.l=g.save.data.life;
      a.renderer.setAnimationLoop(null);window.step=(n=1)=>{for(let i=0;i<n;i++)a.step(.035)};
      window.go=(x,z)=>{s.teleport([x,s.world.support(x,z,Infinity,true)??0,z]);step(2)};
      window.look=(eye,target)=>{window.view=[eye,target];step()};
      a.ctx.onUpdate(()=>{if(window.view){a.camera.position.fromArray(view[0]);a.camera.lookAt(...view[1]);a.camera.updateMatrixWorld()}});
      g.graphics.set('medium');window.__homeCalib?.setInstantExposure(true);a.director.setTime(840);a.director.mode='clear';
    }""")
    return context,p
def tap(p,action,value=None):
    q=f'dialog[open] [data-action="{action}"]'
    if value:q+=f'[value="{value}"]'
    p.locator(q).first.click()
def guide(p,portrait=False):
    pos=p.evaluate('s.position.slice()')
    if portrait:p.locator('.hud-buttons [data-act=guide]').click()
    else:p.keyboard.press('F1')
    p.locator('[data-guide-sec=companions]').click()
    for text in ['初到凝露港','用一个钱包经营','给每只宠物备粮','召来、看家与寻物','凝露小院与家具','北部的五个生态区']:
        p.locator('.g-card h4',has_text=text).scroll_into_view_if_needed()
    shot(p,'guide-'+('portrait' if portrait else 'wide'))
    p.locator('.guide-modal [data-act=close]').last.click()
    assert p.evaluate("v=>g.state==='play' && !document.querySelector('.guide-modal') && Math.hypot(s.position[0]-v[0],s.position[2]-v[2])<.2",pos)
def journal(p):
    p.keyboard.press('b');p.locator('[data-dextab=ranch]').click();p.locator('[data-companions]').click()
def wide(browser,base):
    ctx,p=start(browser,base)
    p.wait_for_function("document.querySelector('.pet-preview') && g.companions.model.group.children.some(c=>c.isGroup)")
    shot(p,'adoption')
    tap(p,'close');assert p.evaluate("l.home.ranch.starter==='later'")
    p.evaluate("go(-21,20.95);g.interact()");p.keyboard.press('f')
    tap(p,'starter');tap(p,'select','ranch-golden-retriever');tap(p,'claim')
    assert p.evaluate("l.home.ranch.animals.length===1 && l.home.ranch.animals[0].following")
    # Real shop sale from a seeded harvest, through the production hand journal.
    p.evaluate("l.bag['crop-wheat']=100;g.save.write()")
    p.keyboard.press('b');p.locator('[data-dextab=artisan]').click()
    p.locator('[data-sell="crop-wheat"]').last.click()
    p.locator('[data-dextab=ranch]').click();p.locator('[data-companions]').click()
    tap(p,'ration');assert p.evaluate("l.home.ranch.animals[0].care.reserve===3 && l.earnedShells>=100")
    tap(p,'follow');assert p.evaluate("!l.home.ranch.animals[0].following")
    tap(p,'follow');tap(p,'close')
    guide(p)
    p.evaluate("window.view=null;s.teleport([-26.72,.216,12.31]);step(3)")
    assert p.evaluate('g.cottage.inside')
    p.wait_for_function("g.cottage.parts.length>=32")
    p.evaluate("look([-26.64,2.13,13.34],[-26.95,.93,10.58]);step(3)")
    p.keyboard.press('F3');p.add_style_tag(content='.toast,#toast{display:none!important}');shot(p,'interior-day')
    p.evaluate("a.director.setTime(90);a.director.mode='rain';a.director.update(a.director.weather.time+60);step(5);if(a.director.weather.rain<.8||a.director.sky.daylight>.15)throw Error('climate not settled')");shot(p,'interior-rain-night')
    # Compare room surfaces away from the animated actor and any transient HUD.
    a=Image.open(OUT/'home-companions-interior-day.jpg').crop((70,100,360,360));b=Image.open(OUT/'home-companions-interior-rain-night.jpg').crop((70,100,360,360))
    print('indoor mean abs RGB delta',ImageStat.Stat(ImageChops.difference(a,b)).mean,flush=True)
    p.evaluate("a.director.setTime(820);a.director.mode='clear';go(-21,22);a.director.update(100);look([-11.6,5.7,29.3],[-21,1.6,16.3]);step(3)")
    shot(p,'exterior')
    p.evaluate("look([-26.2,1.1,24.6],[-21,1.3,19.5])");shot(p,'threshold')
    p.evaluate("go(-14,25);step(3);window.pet=Array.from(g.builder.ranch.pets.values())[0];pet.animal.following=false;pet.animal.station=[-18.7,23.68];g.builder.ranch.sync();pet.pos=[...pet.animal.station];pet.target=[...pet.pos];pet.wait=200;pet.greet=200;step(1);look([-17.15,.92,25.65],[-18.7,.36,23.68])")
    p.wait_for_function("pet.model.group.children.some(c=>c.isGroup)");p.evaluate("step(1)");shot(p,'juvenile')
    p.evaluate("pet.animal.care.born=Date.now()-864000000;step(1)");shot(p,'adult')
    p.evaluate("pet.animal.following=true;g.oceanAdventure.begin(68,-59,0);step(3)")
    assert p.evaluate("pet.model.group.parent===g.oceanAdventure.companionDeck")
    p.evaluate("g.oceanAdventure.returnHome(true);go(-85,190);step(3)")
    assert p.evaluate("pet.model.group.parent===g.builder.ranch.root")
    perf={}
    for r in p.evaluate("g.preserves.rects.filter(r=>r.biome!=='trail')"):
        before=p.evaluate("performance.getEntriesByType('resource').filter(e=>e.name.includes('/models/companions/')&&e.name.includes('.glb')).reduce((sum,e)=>sum+e.encodedBodySize,0)")
        slug=r['biome'];x=(r['minX']+r['maxX'])/2;z=(r['minZ']+r['maxZ'])/2
        p.evaluate("([x,z])=>{go(x,z);window.y=s.world.terrain(x,z);look([x+9,y+5,z+11],[x,y+1,z]);step(2)}",[x,z])
        p.wait_for_function("id=>g.preserves.chunks.get(id)?.children.some(o=>o.isInstancedMesh)",arg=slug,timeout=90000)
        p.wait_for_function(PRESERVE_READY,timeout=90000)
        p.evaluate("step(2)");shot(p,slug)
        if slug in ('redwoods','marsh'):
            perf[slug]=p.evaluate("""()=>{const times=[];for(let i=0;i<9;i++){const t=performance.now();step();a.renderer.getContext().finish();times.push(performance.now()-t)}times.sort((a,b)=>a-b);
              const herd=g.preserves.wildlife.map(w=>w.model.group);const state=herd.map(g=>g.visible);
              herd.forEach(g=>g.visible=false);const empty=[];for(let i=0;i<9;i++){const t=performance.now();step();a.renderer.getContext().finish();empty.push(performance.now()-t)}
              herd.forEach((g,i)=>g.visible=state[i]);empty.sort((a,b)=>a-b);
              return {medianMs:times[4],p90Ms:times[8],wildCount:herd.length,hiddenWildMedianMs:empty[4],transferredGLB:performance.getEntriesByType('resource').filter(e=>e.name.includes('/models/companions/')&&e.name.includes('.glb')).reduce((sum,e)=>sum+e.encodedBodySize,0)}}""")
            perf[slug]['newModelBytes']=perf[slug]['transferredGLB']-before
    p.evaluate("go(-85,142);look([-81,1.5,137],[-85,1,158]);step()");shot(p,'trail-seam-low')
    p.evaluate("look([-72,12,149],[-85,.8,143]);step()");shot(p,'trail-seam-high')
    photograph_house(p)
    (OUT/'home-companions-measurements.json').write_text(json.dumps(perf,indent=2),encoding='utf8')
    ctx.close()
def photograph_house(p):
    p.wait_for_function("g.cottage.parts.some(n=>n.name==='SM_Main_Roof')")
    # Judge the actual model at the player's eye height, plus both sides of its curved roof.
    p.evaluate("go(-18,24);a.director.mode='clear';a.director.setTime(800);a.director.update(a.director.weather.time+80);step(22)")
    for name,eye,target in [
        ('exterior',[-7.1,7.3,34.65],[-21,3.25,15.6]),
        ('side-player',[-8.18,1.62,25.27],[-20,2.72,16.8]),
        ('garden-side',[-33.4,3.4,27.8],[-21.2,2.99,15.9]),
        ('threshold',[-22.8,1.15,26.55],[-21,1.73,20.03]),
    ]:
        p.evaluate("([eye,target])=>{look(eye,target);step(2)}",[eye,target]);shot(p,name)
    p.evaluate("window.view=null;s.teleport([-21,.14,23.502]);s.yaw=0;step(2)")
    p.keyboard.down('w')
    try:
        p.evaluate("for(let i=0;i<135&&s.position[2]>14.38;i++)step()")
    finally:
        p.keyboard.up('w')
    assert p.evaluate("g.cottage.inside && s.position[2]<14.90"),p.evaluate("({pos:s.position,input:s.inputLock,mode:s.mode,game:g.state,focus:document.activeElement?.tagName,keys:[...s.keys]})")
    print('walked from the lane through the moon gate',p.evaluate('s.position'),flush=True)
    p.wait_for_function("g.cottage.inside && g.cottage.parts.length>=32")
    for name,pos,eye,target in [
        ('bedroom',[-26.72,2.583,12.32],[-26.7,4.45,13.29],[-27.0,3.46,10.52]),
        ('tea-room',[-15.24,.215,19.09],[-15.29,1.70,19.53],[-15.2,.81,17.12]),
        ('kitchen',[-26.72,.215,12.31],[-26.64,2.13,13.34],[-26.95,.93,10.58]),
        ('interior-day',[-26.72,.215,12.31],[-26.64,2.13,13.34],[-26.95,.93,10.58]),
    ]:
        p.evaluate("([pos,eye,target])=>{s.teleport(pos);look(eye,target);step(2)}",[pos,eye,target]);shot(p,name)
    p.evaluate("a.director.setTime(90);a.director.mode='rain';a.director.update(a.director.weather.time+65);step(5)")
    assert p.evaluate("a.director.weather.rain>.8 && a.director.sky.daylight<.15")
    shot(p,'interior-rain-night')
    bounds=(72,100,340,360)
    a=Image.open(OUT/'home-companions-interior-day.jpg').crop(bounds)
    b=Image.open(OUT/'home-companions-interior-rain-night.jpg').crop(bounds)
    delta=ImageStat.Stat(ImageChops.difference(a,b)).mean
    assert max(delta)<2, delta
    print('resident walls day / rain-night RGB difference',delta,flush=True)
    # The moon gate must have a continuous opening above the stone sill.
    result=p.evaluate("""()=>{const obj=g.cottage.parts.find(n=>n.name==='SM_Moon_Gate'),T=a.ctx.THREE;
        obj.updateWorldMatrix(true,true);
        const cast=(x,y)=>new T.Raycaster(new T.Vector3(-21+x,.14+y,24.6),new T.Vector3(0,0,-1),0,3.7).intersectObject(obj,true).length;
        return {pass:[-.43,0,.43].flatMap(x=>[.23,.62,1.12].map(y=>cast(x,y))),jamb:cast(3.58,1.24)}}""")
    assert not any(result['pass']) and result['jamb']>0,result

def residence(browser,base):
    ctx,p=start(browser,base)
    tap(p,'close');p.keyboard.press('F3');p.add_style_tag(content='.toast,#toast{display:none!important}')
    photograph_house(p)
    ctx.close()

def interactions(browser,base):
    ctx,p=start(browser,base)
    tap(p,'help');p.locator('.guide-modal [data-act=close]').last.click()
    assert p.locator('dialog[open] [data-action=claim]').count()==1
    tap(p,'claim');p.evaluate("l.coins=250;go(-20,19);step()")
    journal(p);tap(p,'room');selector=p.locator('select[name=furnishing]');selector.select_option('lamp')
    tap(p,'rotate');grid=p.locator('.floor-plan');rect=grid.bounding_box()
    def place(x,z):
        grid.click(position={'x':(x/17.28+.5)*rect['width'],'y':(z/14.4+.5)*rect['height']})
    before=p.evaluate('l.coins')
    place(0,3.6);assert p.evaluate('l.coins')==before
    place(5,-4.5);assert p.evaluate('l.coins')==before-12
    lamp=p.evaluate("l.cottage.furniture.find(f=>f.kind==='lamp').id")
    tap(p,'pick',lamp);tap(p,'store');assert p.evaluate("l.cottage.furniture.find(f=>f.kind==='lamp').stored")
    tap(p,'close');journal(p);tap(p,'seek');tap(p,'hide','tea')
    p.evaluate("for(let i=0;i<140;i++)g.builder.ranch.update(i*.05,.05,s.position)")
    assert p.evaluate("!g.builder.ranch.seek && l.home.ranch.animals[0].affection===68")
    journal(p);tap(p,'station');p.locator('select[name=plot]').select_option('2');tap(p,'settle');tap(p,'close')
    assert p.evaluate("l.home.ranch.animals[0].station.length===2 && !l.home.ranch.animals[0].following")
    p.evaluate("window.plot=g.preserves.plots()[2];go(plot.x,plot.z);g.interact()");p.keyboard.press('f')
    p.locator('select[name=plant]').select_option('nature-fern');p.locator('.plant-plan').click(position={'x':45,'y':57})
    assert p.evaluate("l.cottage.plants.length===1");tap(p,'close')
    p.evaluate("window.wild=g.preserves.wildlife.find(w=>w.id==='ranch-zebra');l.bag['crop-wheat']=1;go(wild.x,wild.z);g.interact()");p.keyboard.press('f')
    assert p.evaluate("l.home.ranch.discovered.includes('ranch-zebra') && !g.preserves.wildlife.includes(wild)")
    p.evaluate("g.save.write()");p.reload(wait_until='domcontentloaded')
    p.wait_for_function("window.__game?.state==='play'",timeout=160000)
    assert p.evaluate("__game.save.data.life.cottage.plants.length===1 && __game.save.data.life.cottage.furniture.find(f=>f.kind==='lamp').stored")
    print('furniture, doorway, free movement during seek, plot planting, wildlife gift and reload passed',flush=True)
    ctx.close()
def domestic(browser,base):
    ctx,p=start(browser,base);tap(p,'claim')
    p.evaluate("s.teleport([-26.84,.213,19.05]);step(3);window.resident=[...g.builder.ranch.pets.values()][0]")
    journal(p);tap(p,'home');tap(p,'close')
    p.evaluate("""()=>{const pet=resident,bowl=l.cottage.furniture.find(f=>f.kind==='bowl');
      l.coins=9;pet.animal.care.due=Date.now()-100;pet.animal.care.reserve=0;
      step(2);window.diningSpot=[-21+bowl.x+.32,16+bowl.z]}""")
    journal(p);tap(p,'ration');tap(p,'close')
    assert p.evaluate("""()=>{let saw=false;for(let i=0;i<220;i++){g.builder.ranch.update(i*.05,.05,s.position);
      if(resident.mealSeconds>0&&Math.hypot(resident.pos[0]-diningSpot[0],resident.pos[1]-diningSpot[1])<.17&&resident.model.group.rotation.x>0)saw=true;}return saw}""")
    assert p.evaluate("""()=>{const nest=l.cottage.furniture.find(f=>f.kind==='nest');for(let i=0;i<240;i++){g.builder.ranch.update(11+i*.05,.05,s.position);if(resident.mealSeconds<=0&&Math.hypot(resident.pos[0]+21-nest.x,resident.pos[1]-16-nest.z)<.36)return true}return false}""")
    print('resident ate at the bowl and settled into its bed',flush=True);ctx.close()

def portrait(browser,base):
    ctx,p=start(browser,base,True)
    tap(p,'select','ranch-chick');tap(p,'claim')
    p.evaluate("l.coins=15;g.save.write()");journal(p);tap(p,'ration');tap(p,'follow');tap(p,'follow')
    shot(p,'care-portrait');tap(p,'close');guide(p,True);ctx.close()
def legacy(browser,base):
    old={'v':1,'life':{'coins':120,'home':{'ranch':{'animals':[{'id':'legacy','speciesId':'ranch-hare','name':'长耳','adoptedAt':1,'affection':80,'mood':90}]}}}}
    ctx,p=start(browser,base,False,old)
    assert p.evaluate("!g.companions.visible && l.coins===120 && l.earnedShells===120 && l.home.ranch.animals[0].care.due>Date.now()")
    p.evaluate("l.home.ranch.animals[0].care.due=Date.now()-172800000;g.lastCareSave=0;step()");p.wait_for_selector('dialog[open]')
    assert '长耳' in p.locator('dialog').inner_text()
    tap(p,'close');p.evaluate("l.home.ranch.animals[0].care.rescueMs=1799900;g.carePlayed=101;g.lastCareSave=0;step();g.save.write()")
    p.reload(wait_until='domcontentloaded');p.wait_for_function("window.__game?.state==='play'",timeout=150000)
    assert p.evaluate("__game.save.data.life.home.ranch.animals.length===0 && __game.save.data.life.home.ranch.memorials[0].name==='长耳'")
    ctx.close()
def performance(browser,base):
    # Measure separately from the interactive regression and the full Node test suite.
    ctx,p=start(browser,base);tap(p,'close')
    perf={}
    bytes_query="performance.getEntriesByType('resource').filter(e=>e.name.includes('/models/companions/')&&e.name.includes('.glb')).reduce((sum,e)=>sum+e.encodedBodySize,0)"
    for slug in ('redwoods','marsh'):
        previous=p.evaluate(bytes_query)
        p.evaluate("""slug=>{const r=g.preserves.rects.find(r=>r.biome===slug),x=(r.minX+r.maxX)/2,z=(r.minZ+r.maxZ)/2;
          go(x,z);const y=s.world.terrain(x,z);look([x+9,y+5,z+11],[x,y+1,z]);step(3)}""",slug)
        p.wait_for_function("id=>g.preserves.chunks.get(id)?.children.some(o=>o.isInstancedMesh)",arg=slug)
        p.wait_for_function(PRESERVE_READY)
        p.evaluate("step(6)")
        perf[slug]=p.evaluate("""()=>{const herd=g.preserves.wildlife.map(w=>w.model.group),vis=herd.map(g=>g.visible),times=[[],[]],gl=a.renderer.getContext();
          for(let i=0;i<31;i++)for(let k=0;k<2;k++){const off=(i+k)%2;herd.forEach((g,j)=>g.visible=!off&&vis[j]);gl.finish();
            const t=window.performance.now();step();gl.finish();times[off].push(window.performance.now()-t);}
          herd.forEach((g,i)=>g.visible=vis[i]);times.forEach(t=>t.sort((a,b)=>a-b));return {samplesPerCondition:31,wildCount:herd.length,medianMs:times[0][15],p90Ms:times[0][27],hiddenWildMedianMs:times[1][15]}}""")
        total=p.evaluate(bytes_query);perf[slug].update(transferredGLB=total,newModelBytes=total-previous)
    (OUT/'home-companions-measurements.json').write_text(json.dumps(perf,indent=2),encoding='utf8')
    print('measured forest and marsh in alternating visibility conditions',flush=True);ctx.close()

def sheet(browser,base):
    spec=importlib.util.spec_from_file_location('studio',ROOT/'scripts/qa-ranch-wildlife.py')
    studio=importlib.util.module_from_spec(spec);spec.loader.exec_module(studio)
    context=browser.new_context();context.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
    page=studio.make_studio(context,base)
    import re
    names=re.findall(r"id: 'ranch-([^']+)', name: '([^']+)'",(ROOT/'src/life/ranch.ts').read_text('utf8'))
    names+=re.findall(r"\['([\w-]+)','([^']+)','[^']+',[.\d]+,'",(ROOT/'src/life/companion-catalog.ts').read_text('utf8'))
    assert len(names)==33
    canvas=Image.new('RGB',(1100,6*165),(246,241,222));draw=ImageDraw.Draw(canvas);font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
    for i,(slug,name) in enumerate(names):
        data=page.evaluate("id=>portrait('ranch-'+id)",slug);im=Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA');im.thumbnail((171,136));x=(i%6)*183;y=(i//6)*165
        canvas.paste(im,(x+(183-im.width)//2,y),im);draw.text((x+91,y+137),name,font=font,fill='#3c493c',anchor='mt')
    canvas.save(OUT/'home-companions-field-guide.jpg',quality=91);context.close()
if __name__=='__main__':
    pa=argparse.ArgumentParser();pa.add_argument('--base',default='http://127.0.0.1:5180');pa.add_argument('suites',nargs='*',default=['wide','portrait','legacy','interactions','domestic','sheet']);args=pa.parse_args()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-webgl','--use-gl=angle','--ignore-gpu-blocklist'])
        for suite in args.suites:globals()[suite](browser,args.base)
        browser.close()

