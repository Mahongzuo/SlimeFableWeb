"""Check all five December split-body venues on an isolated headless browser."""
import argparse
import ast
from io import BytesIO
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
def assignment(script,name):
 tree=ast.parse((root/'scripts'/script).read_text(encoding='utf-8-sig'))
 return next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in n.targets))
walk=assignment('qa-season-skirmish.py','walk')
catch=assignment('qa-turning-season.py','drive_moving')
parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
parser.add_argument('--day',choices=['1202','1203','1204','1205','1206'])
args=parser.parse_args()

with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
 for day in ([args.day] if args.day else ['1202','1203','1204','1205','1206']):
  prefix=root/'qa'/'evidence'/('dec-six-'+day+'-skirmish-');result={}
  ctx=browser.new_context(viewport={'width':950,'height':630},has_touch=True)
  ctx.route_web_socket('**/*',lambda sock:None)
  ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
    if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'low',souvenirs:['0101-shot-ceres'],life:{coins:41,records:{'0101-trial-daily-wins':2}}}));""")
  pg=ctx.new_page();pg.set_default_timeout(35000);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  for practice in [False,True]:
   pg.set_viewport_size({'width':950,'height':630})
   pg.goto(args.base+'/level.html?id='+day+'-skirmish'+('&practice=december-check' if practice else ''))
   pg.wait_for_function('window.__slime?.latest?.count>100 && __level.stage.time>1.6')
   assert pg.evaluate('__level.course.spec.kind') in ['crossing','speedtrap','beads','twins','town']
   def image_bytes():
    pg.evaluate('__level.stage.renderer.setPixelRatio(1)');pg.wait_for_timeout(180)
    b=pg.screenshot(type='jpeg',quality=88);pg.evaluate('__level.stage.renderer.setPixelRatio(.65)');return b
   def snap(name):Path(str(prefix)+name+'.jpg').write_bytes(image_bytes())
   def move(x,z):pg.evaluate(walk,[x,z])
   def cast(i,jump=False):
    for _ in range(6):
     if pg.evaluate('i=>__level.done.has(i)',i):return
     if pg.evaluate('__level.aim')!=i:pg.keyboard.press('q')
     if jump:
      pg.keyboard.press('Space');pg.wait_for_function('__slime.position[1]>.22',timeout=3000)
     fire=pg.locator('[data-do=fire]')
     if pg.viewport_size['width']<500:fire.tap()
     else:fire.click()
     try:pg.wait_for_function('i=>__level.done.has(i)',arg=i,timeout=1800);return
     except Exception:pass
    raise RuntimeError(str(pg.evaluate('[__slime.position,__level.aim,__level.course,[...__level.done],__slime.latest.shots]')))
   if not practice:
    frames=[]
    for view in ['play','far']:
     pg.evaluate('v=>__level.setView(v)',view);frames.append(Image.open(BytesIO(image_bytes())).convert('RGB'))
    overview=Image.new('RGB',(950,1260))
    for i,frame in enumerate(frames):overview.paste(frame,(0,i*630))
    overview.save(str(prefix)+'far.jpg',quality=89);pg.evaluate("__level.setView('play')")
   pg.locator('[data-do=start]').click();pg.keyboard.down('c')
   pg.wait_for_function('__slime.latest.spread>.55');pg.keyboard.up('c')
   cast(0)
   if practice:
    pg.keyboard.down('d')
    try:pg.wait_for_function('__level.course.retries>0',timeout=16000)
    finally:pg.keyboard.up('d')
   else:pg.locator('[data-do=retry]').click()
   pg.wait_for_function('__level.done.has(0)&&!__level.course.returning&&__slime.grounded')
   result['floorSamples']=pg.evaluate('__level.course.pads.map(([x,y,z])=>__slime.world.support(x,z,.35))')
   assert all(x is not None and abs(x)<.15 for x in result['floorSamples'])
   first=2 if practice and day in ['1205','1206'] else 1;second=3-first
   if day=='1202':
    move(0,1.2)
    contacts=pg.evaluate("""()=>__slime.world.boxes.filter(b=>b.name.startsWith('yielding-car-')).map(b=>__slime.world.support((b.min[0]+b.max[0])/2,(b.min[2]+b.max[2])/2,b.max[1]+.2))""")
    assert len(contacts)==2 and all(.79<y<.95 for y in contacts),contacts
    result['carRoofs']=contacts
   if day=='1205':move(2.15 if first==1 else -2.15,.6)
   else:move(-2.15 if first==1 else 2.15,.6)
   if day=='1203':pg.wait_for_function('__level.course.windowAt(1)')
   cast(first)
   if day=='1202':
    if not practice:snap('play')
    move(2.2,.42);pg.wait_for_function('__level.course.crossing===1')
   elif day=='1203':
    move(2.03,.08);pg.wait_for_function('__level.course.windowAt(2)')
   elif day in ['1204','1205']:
    pg.locator('[data-do=recall]').click();pg.wait_for_function('__level.course.swept&&!__level.course.returning')
    move((-2.15 if second==2 else 2.15) if day=='1205' else 2.15,.55)
   else:
    for _ in range(4):
     n,pt=pg.evaluate('[__level.course.nextLamp,__level.course.lamp]')
     if n==3:break
     move(pt[0],pt[2]);pg.wait_for_function('n=>__level.course.nextLamp>n',arg=n)
   cast(second,jump=day=='1205')
   if not practice:
    if day!='1202':snap('play')
    counts=pg.evaluate("""()=>{const st=__level.stage,info=st.renderer.info,q=st.scene.getObjectByName('season-'+__level.course.spec.kind+'-diorama');const old=info.autoReset;info.autoReset=false;
    const draw=v=>{q.visible=v;info.reset();st.render(.01,__slime);return info.render.calls;};try{const b=draw(false);return draw(true)-b;}finally{q.visible=true;info.autoReset=old;}}""")
    result['dioramaDrawCalls']=counts;assert 0<counts<=150,counts
    pg.evaluate("__level.setView('low')");snap('low');pg.evaluate("__level.setView('play')")
    pg.set_viewport_size({'width':390,'height':844});snap('portrait');assert pg.locator('[data-do=fire]').is_visible()
   move(0,-3.55);cast(3);pg.wait_for_function('__level.phase==="finale"')
   if not practice:
    pg.set_viewport_size({'width':950,'height':630})
    # Hold the last in-world composition before the instrument dialog opens.
    pg.wait_for_function("""()=>{const l=__level;if(l.finalSeconds<2.85)return false;
      l.stage.renderer.setAnimationLoop(null);l.stage.renderer.setPixelRatio(1);l.step(.012);return true;}""")
    if day in ['1203','1205']:
     samples=pg.evaluate("""day=>{const st=__level.stage,T=st.THREE,ids=day==='1203'?['timed-train']:['left-satellite','right-satellite'];
       return ids.flatMap(id=>{const o=st.scene.getObjectByName(id);o.updateWorldMatrix(true,true);
       const xs=id==='timed-train'?[1.32]:[-2.43,2.43];return xs.map(x=>{const v=new T.Vector3(x,id==='timed-train'?.8:0,0);
       return o.localToWorld(v).project(st.camera).toArray();});});}""",day)
     assert all(abs(x)<.99 and abs(y)<.98 and -1<z<1 for x,y,z in samples),samples
     result['finalCameraSamples']=samples
    pg.screenshot(path=str(prefix)+'final.jpg',quality=88)
    pg.evaluate('()=>{for(let i=0;i<10;i++)__level.step(.045);}')
   dialog=pg.locator('.season-plate[open]');dialog.wait_for();footer=dialog.locator('footer')
   if day=='1203':
    for key in ['ArrowLeft','ArrowLeft','ArrowDown']:pg.keyboard.press(key)
    footer.locator('.season-main').click()
   elif day=='1206':pg.evaluate(catch,'catch')
   else:
    for b in footer.locator('button:not(.season-exit)').all():b.click()
   dialog.locator('output').filter(has_text='已完成').wait_for();footer.locator('.season-main').click()
   pg.locator('.mode-keepsake[open]').wait_for()
   record=pg.evaluate("""()=>{const l=__level,s=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
   return {id:l.spec.saveId,coins:s.life.coins,buckets:s.life.records,souvenirs:s.souvenirs,particles:__slime.latest.count,workerErrors:__slime.workerErrors,
   complete:[...l.done],retries:l.course.retries,first:l.course.order,module:performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname).find(p=>p.includes('/season-skirmish')&&p.endsWith('.js'))};}""")
   key=record['id']+('-practice' if practice else '-daily');assert record['buckets'][key+'-wins']==1 and record['buckets'][key+'-instrument']==1
   assert record['buckets'][key+'-four-casts']==1
   if day in ['1205','1206']:assert record['buckets'][key+'-first-side-mask']==(2 if practice else 1)
   assert record['coins']==49 and record['buckets']['0101-trial-daily-wins']==2 and '0101-shot-ceres' in record['souvenirs']
   assert record['retries']>=1 and not errors and not record['workerErrors'],errors
   assert sorted(record['complete'])==[0,1,2,3]
   pg.locator('[data-mode-home]').click();pg.wait_for_url('**/?date='+day+'&from='+day+'-skirmish')
   result['practice' if practice else 'daily']=record
  result.update({'nativeDeformation':True,'physicalFallRecovery':True,'portraitTouchCast':True,'returnedToGate':True,'errors':errors})
  Path(str(prefix)+'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
  print(day,'daily and practice passed',flush=True);ctx.close()
 browser.close()
