"""Native input, actual worker clone landings, local retries, composed views and save isolation."""
import argparse
import ast
import json
from io import BytesIO
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
parser.add_argument('--day',choices=['1127','1128','1129','1130','1201'])
parser.add_argument('--practice',action='store_true')
parser.add_argument('--views-only',action='store_true',help='Capture the normal entry and the raised map camera together.')
args=parser.parse_args()
days=[args.day] if args.day else ['1127','1128','1129','1130','1201']
root=Path(__file__).resolve().parents[1]
out=root/'qa'/'evidence'
# The existing finale driver reads the moving indicator from the rendered plate.
tree=ast.parse((root/'scripts'/'qa-turning-season.py').read_text(encoding='utf-8-sig'))
moving=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='drive_moving' for t in n.targets))
walk="""async ([x,z])=>{
 const a=__slime,c=__level.course;
 const key=(code,v)=>window.dispatchEvent(new KeyboardEvent(v?'keydown':'keyup',{code,bubbles:true}));
 const start=performance.now();
 try{while(Math.hypot(x-a.position[0],z-a.position[2])>.29){
  const dx=x-a.position[0],dz=z-a.position[2];
  key('KeyA',dx<-.13);key('KeyD',dx>.13);key('KeyW',dz<-.13);key('KeyS',dz>.13);
  if(performance.now()-start>32000)throw Error('walk '+JSON.stringify([a.position,[x,z],__level.phase,c.hint]));
  await new Promise(requestAnimationFrame);
 }}finally{for(const k of ['KeyA','KeyD','KeyW','KeyS'])key(k,false);}
}"""
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
 ctx=browser.new_context(viewport={'width':950,'height':630})
 ctx.route_web_socket('**/*',lambda socket:None)
 ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
 if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'low',souvenirs:['0101-shot-ceres'],life:{coins:41,records:{'0101-trial-daily-wins':2}}}));""")
 pg=ctx.new_page();pg.set_default_timeout(35000);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 for day in days:
  prefix=out/('season-stage-'+day+'-skirmish-')
  def shot(name):
   if args.practice:return
   pg.evaluate('__level.stage.renderer.setPixelRatio(1)');pg.wait_for_timeout(170)
   pg.screenshot(path=str(prefix)+name+'.jpg',quality=86);pg.evaluate('__level.stage.renderer.setPixelRatio(.64)')
  def move(x,z):pg.evaluate(walk,[x,z])
  def cast(i):
   for _ in range(14):
    if pg.evaluate('i=>__level.done.has(i)',i):return
    if pg.evaluate('__level.aim')!=i:pg.keyboard.press('q')
    pg.locator('[data-do=fire]').click()
    try:pg.wait_for_function('i=>__level.done.has(i)',arg=i,timeout=1450);return
    except Exception:pass
   raise RuntimeError(str(pg.evaluate('[__slime.position,__level.aim,__level.course,[...__level.done],__slime.latest.shots]')))
  pg.goto(args.base+'/level.html?id='+day+'-skirmish'+('&practice=season-qa' if args.practice else ''))
  pg.wait_for_function('window.__slime?.latest?.count>100')
  module=pg.evaluate(r"""performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname)
    .find(path=>/\/season-skirmish[^/]*\.(js|ts)$/.test(path))""")
  if not args.practice:
   pg.wait_for_function('__level.stage.time>1.7')
   frames=[]
   for view in ['play','far']:
    pg.evaluate('v=>{__level.setView(v);__level.stage.renderer.setPixelRatio(1)}',view);pg.wait_for_timeout(220)
    frames.append(Image.open(BytesIO(pg.screenshot(type='jpeg',quality=91))).convert('RGB'))
   overview=Image.new('RGB',(frames[0].width,frames[0].height*2))
   for n,frame in enumerate(frames):overview.paste(frame,(0,n*frame.height))
   overview.save(str(prefix)+'far.jpg',quality=88)
   pg.evaluate("__level.setView('play')")
  if args.views_only:
   path=Path(str(prefix)+'result.json')
   if path.exists():
    result=json.loads(path.read_text(encoding='utf8'));result['module']=module
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
   continue
  pg.evaluate('window.initialShapes=__slime.latest.radii[0]; __level.stage.renderer.setPixelRatio(.64)')
  pg.locator('[data-do=start]').click()
  pg.keyboard.down('c');pg.wait_for_function('__slime.latest.spread>.55');pg.keyboard.up('c')
  cast(0)
  if args.practice:
   # Deliberately walk off the near edge and let the real fall recovery restore the section.
   pg.keyboard.down('d')
   try:pg.wait_for_function('__level.course.retries>0',timeout=15000)
   finally:pg.keyboard.up('d')
  else:pg.locator('[data-do=retry]').click()
  pg.wait_for_function('__level.done.has(0)&&!__level.course.returning&&__slime.grounded')
  rays=pg.evaluate('__level.course.pads.map(([x,y,z])=>__slime.world.support(x,z,.3))')
  assert all(abs(a or 0)<.08 and a is not None for a in rays),rays
  if day=='1129':move(2.25,.55)
  else:move(-2,.55)
  if day=='1130':pg.wait_for_function('__level.course.sweep<.20')
  cast(1)
  if day=='1127':move(2.25,.45)
  elif day=='1128':
   pg.wait_for_function('__level.course.brake>.71');pg.locator('[data-do=recall]').click()
   pg.wait_for_function('__level.course.braked&&!__level.course.returning');move(2.25,.55)
  elif day=='1129':move(-2.1,.6)
  elif day=='1201':
   pg.locator('[data-do=recall]').click();pg.wait_for_function('__level.course.carrying&&!__level.course.returning');move(2.4,.55)
  if day=='1130':pg.wait_for_function('__level.course.sweep>.8')
  cast(2)
  if not args.practice:
   shot('play')
   counts=pg.evaluate("""()=>{const st=__level.stage,r=st.renderer,info=r.info,q=st.scene.getObjectByName('season-'+__level.course.spec.kind+'-diorama');
     const old=info.autoReset;info.autoReset=false;const count=v=>{q.visible=v;info.reset();st.render(.01,__slime);return info.render.calls;};
     try{const b=count(false);return count(true)-b;}finally{q.visible=true;info.autoReset=old;}}""")
   assert counts<=150,counts
   pg.evaluate("__level.setView('low')");shot('low')
   pg.evaluate("__level.setView('play')");pg.set_viewport_size({'width':390,'height':844});shot('portrait')
   assert pg.locator('[data-do=fire]').is_visible()
   pg.set_viewport_size({'width':950,'height':630})
  move(0,-3.45);cast(3);pg.wait_for_function('__level.phase==="finale"')
  shot('final')
  dialog=pg.locator('.season-plate[open]');dialog.wait_for();footer=dialog.locator('footer')
  if day=='1128':pg.evaluate(moving,'catch')
  elif day=='1130':
   for key in ['ArrowLeft','ArrowDown','ArrowDown']:pg.keyboard.press(key)
   footer.locator('.season-main').click()
  else:
   for b in footer.locator('button:not(.season-exit)').all():b.click()
  dialog.locator('output').filter(has_text='已完成').wait_for()
  footer.locator('.season-main').click()
  pg.locator('.mode-keepsake[open]').wait_for()
  record=pg.evaluate("""()=>{const k=__level.spec.saveId,s=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
    return {id:k,buckets:s.life.records,coins:s.life.coins,souvenirs:s.souvenirs,particles:__slime.latest.count,hits:__level.hits,retries:__level.course.retries,workerErrors:__slime.workerErrors,stops:[...__level.done]};}""")
  path=Path(str(prefix)+'result.json');key=record['id']+('-practice' if args.practice else '-daily')
  assert record['buckets'][key+'-wins']==1 and record['buckets'][key+'-instrument']==1
  assert record['buckets']['0101-trial-daily-wins']==2 and '0101-shot-ceres' in record['souvenirs']
  assert record['retries']>=1 and not record['workerErrors'] and not errors,(errors,record)
  if args.practice:assert record['id'] not in record['souvenirs']
  pg.locator('[data-mode-home]').click();pg.wait_for_url('**/?date='+day+'&from='+day+'-skirmish')
  result=json.loads(path.read_text(encoding='utf8')) if path.exists() else {}
  result['practice' if args.practice else 'daily']=record
  if args.practice:result['physicalFallRecovery']=True
  result.update({'base':args.base,'module':module,'floorSamples':rays,'spreadReached':True,'returnedToGate':True,'errors':errors})
  if not args.practice:result['additionalDioramaCalls']=counts
  path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
  print(day,'practice' if args.practice else 'daily',flush=True)
 browser.close()
