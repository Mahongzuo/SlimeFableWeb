"""Play Arecibo via UI controls in an isolated headless Chromium session.
--rate scales the browser clock only. The level still simulates all eight waves.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
args=argparse.ArgumentParser()
args.add_argument('--base',default='http://127.0.0.1:5190')
args.add_argument('--team',choices=['control','barricade'],default='control')
args.add_argument('--practice',action='store_true')
args.add_argument('--rate',type=float,default=1)
args.add_argument('--storage',type=Path,help='Reuse a headless profile snapshot for repeat-clear checks')
args.add_argument('--lose-first',action='store_true',help='Let three signals leak and restart through the defeat panel')
opt=args.parse_args()
sid='1116-defense-arecibo-transmission'
save_key='slimefable.web.save.v1'
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    touch=opt.team=='barricade'
    size={'width':390,'height':780} if touch else {'width':1100,'height':690}
    context=browser.new_context(viewport=size,has_touch=touch,
        storage_state=str(opt.storage) if opt.storage and opt.storage.exists() else None)
    pg=context.new_page()
    pg.set_default_timeout(90000)
    errors=[]
    pg.on('pageerror',lambda e:errors.append(str(e)))
    pg.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
    if opt.rate!=1:
        pg.add_init_script("""if(location.search.includes('id=1116-defense')){const rate=RATE,real=performance.now.bind(performance);
          const raf=requestAnimationFrame.bind(window);
          performance.now=()=>real()*rate;
          window.requestAnimationFrame=fn=>raf(t=>fn(t*rate));
        }""".replace('RATE',str(opt.rate)))
    pg.goto(opt.base+'/?date='+('1021' if touch else '1116'))
    if touch:
        pg.locator('[data-act=start]:enabled').click()
        pg.wait_for_function('__game.state==="play" && __slime.ready')
        pg.evaluate('()=>__slime.teleport([...__game.portals[2].slot.position])')
        pg.locator('.door-actions [data-id=\'1116-defense\']').click()
    else:
        pg.locator('.title-actions [data-act=book]').click()
        pg.locator('.book [data-id=\'1116-defense\']').click()
    pg.wait_for_url('**/level.html?id=1116-defense')
    if opt.practice: pg.goto(opt.base+'/level.html?id=1116-defense&practice=antenna-43')
    pg.wait_for_function('window.__slime?.latest?.count>0')
    before=pg.evaluate('(k)=>JSON.parse(localStorage.getItem(k))||{}',save_key)
    bucket=sid+('-practice' if opt.practice else '-daily')
    records=before.get('life',{}).get('records',{})
    if opt.lose_first:
        pg.locator('[data-start]:enabled').click()
        pg.locator('[data-retry]').wait_for(timeout=240000)
        assert pg.evaluate('__level.game.leaks')==3
        assert pg.evaluate('(k)=>JSON.parse(localStorage.getItem(k))?.life?.records??{}',save_key)==records
        pg.locator('[data-retry]').click()
        pg.wait_for_function('window.__slime?.latest?.count>0 && __level.phase==="setup"')
    if not touch: pg.screenshot(path=root/'qa/evidence/1116-defense-lineup.jpg',quality=91)
    pg.evaluate("""()=>{__slime.ctx.renderer.setPixelRatio(.7);__slime.ctx.renderer.shadowMap.enabled=false;}""")
    chosen=['physical','wind','fire','dark'] if touch else ['water','thunder','wind','dark']
    for k in pg.locator('[data-pick][aria-pressed=true]').evaluate_all('bs=>bs.map(b=>b.dataset.pick)'):
        if k not in chosen:pg.locator('[data-pick='+k+']').click()
    for k in chosen:
        b=pg.locator('[data-pick='+k+']')
        if b.get_attribute('aria-pressed')=='false':b.click()
    pg.locator('[data-start]:enabled').click()
    pg.wait_for_function('__level.phase==="wave"')
    pg.locator('[data-pause]').click()
    stopped=pg.evaluate('__level.game.elapsed');pg.wait_for_timeout(150)
    assert pg.evaluate('__level.game.elapsed')==stopped
    pg.locator('[data-resume]').click()
    # Only send actual toolbar and board pointer input. The driver reads public game state
    # to choose where to deploy, but never calls game commands or mutates resources.
    pg.evaluate("""touch=>{
      const g=__level.game, canvas=__slime.ctx.renderer.domElement;
      const main=touch?'physical':'water',front=touch?6:2;
      let last=-1,usedTape=0,recorded=false;
      function place(k,l,c){
        const b=document.querySelector('[data-tool="'+k+'"]');
        if(!b||b.disabled||b.classList.contains('df-short'))return false;
        b.click();
        const {x,y}=__level.cellScreen(l,c);
        if(document.elementFromPoint(x,y)!==canvas)throw Error('board covered at '+[l,c]+': '+document.elementFromPoint(x,y)?.outerHTML.slice(0,100));
        const options={pointerId:1,pointerType:touch?'touch':'mouse',isPrimary:true,button:0,clientX:x,clientY:y,bubbles:true};
        canvas.dispatchEvent(new PointerEvent('pointerdown',options));canvas.dispatchEvent(new PointerEvent('pointerup',options));
        return k==='tape'||g.towers.some(t=>t.lane===l&&t.col===c&&t.kind===k);
      }
      function drive(){
        if(!['wave','interval'].includes(g.phase))return;
        if(g.elapsed-last<.8){requestAnimationFrame(drive);return;}last=g.elapsed;
        const has=(l,c)=>g.towers.some(t=>t.lane===l&&t.col===c);
        const priority=l=>g.enemies.filter(e=>e.lane===l).reduce((s,e)=>s+13-e.x,0)+(g.upcoming?.lane===l?4:0);
        const lanes=[2,1,3,0,4].sort((a,b)=>priority(b)-priority(a));
        if(touch&&g.wave>=6&&g.tapes===2&&g.towers.some(t=>t.jammedUntil>g.elapsed)){
          const jt=g.towers.find(t=>t.jammedUntil>g.elapsed);place('tape',jt.lane,0);
        }
        if(!has(2,0)&&g.wave<=2)place('dew',2,0);
        for(const l of lanes)if(!has(l,front))place(main,l,front);
        if(g.towers.filter(t=>t.kind===main).length>=5){
          if(!has(4,0))place('dew',4,0);
          const extras=touch?[[2,['fire','wind','fire','fire','wind']],[3,['dark','fire','wind','dark','fire']],[4,['fire','dark','wind','fire','fire']]]:
            [[1,['dark','thunder','wind','thunder','dark']],[3,['wind','dark','thunder','wind','wind']],[4,['dark','water','wind','thunder','water']],[5,['thunder','dark','water','dark','thunder']]];
          for(const [col,kinds] of extras)for(const l of lanes)if(!has(l,col)&&g.dew>=65)place(kinds[l],l,col);
        }
        requestAnimationFrame(drive);
      }
      requestAnimationFrame(drive);
    }""",touch)
    print('playing',opt.team,flush=True)
    pg.wait_for_function('__level.game.wave>=6||__level.phase==="lost"',timeout=600000)
    assert pg.evaluate('__level.phase')!='lost',errors
    pg.wait_for_function('__level.game.enemies.length>=2',timeout=40000)
    pg.screenshot(path=root/('qa/evidence/1116-defense-'+('mobile' if touch else 'battle')+'.jpg'),quality=90)
    pg.wait_for_function('["transmit","lost"].includes(__level.phase)',timeout=420000)
    assert pg.evaluate('__level.phase')=='transmit',errors
    session=pg.evaluate('()=>({bits:__level.game.decodedBits,leaks:__level.game.leaks,tapes:__level.game.tapes,elapsed:__level.game.elapsed,rows:__level.game.decodedRows})')
    assert session['bits']==1679 and session['rows']==73 and session['leaks']==0,session
    assert session['tapes']==(1 if touch else 2),session
    pg.locator('[data-send]').click();pg.locator('dialog.mode-keepsake').wait_for()
    assert '发信值班纸带' in pg.locator('dialog.mode-keepsake h1').inner_text()
    data=pg.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',save_key)
    wins=data['life']['records'][bucket+'-wins']
    assert wins==records.get(bucket+'-wins',0)+1 and data['life']['records'][bucket+'-perfect']==1
    assert bool(data['life']['records'].get(bucket+'-untaped'))==(bool(records.get(bucket+'-untaped')) or session['tapes']==2)
    for collection in ['completed','souvenirs']:
        expected=int(sid in before.get(collection,[]) or not opt.practice)
        assert data[collection].count(sid)==expected
    pg.locator('[data-mode-home]').click()
    pg.wait_for_function('window.__game?.state==="title" && __game.slime.ready')
    assert 'from=1116-defense' in pg.url
    pg.keyboard.press('Enter');pg.wait_for_function('__game.state==="play"')
    local=pg.evaluate('__game.portals[2].local(__slime.position)')
    assert abs(local[0])<.2 and abs(local[2]-2.3)<.2,local
    assert not errors,errors
    if opt.storage: context.storage_state(path=str(opt.storage))
    print(json.dumps({'team':opt.team,'practice':opt.practice,'wins':wins,'retried':opt.lose_first,'rate':opt.rate,'gate':3,**session},ensure_ascii=True))
    browser.close()
