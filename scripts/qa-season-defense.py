"""Exercise the actual tabletop controls and board in an independent headless browser."""
import argparse
import ast
import json
from pathlib import Path
from io import BytesIO
from PIL import Image
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
def literal(name):
    tree = ast.parse((root/'scripts/qa-turning-season.py').read_text(encoding='utf-8-sig'))
    return next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in n.targets))

def finish_plate(page, id, alignments=None):
    dialog=page.locator('.season-plate[open]')
    dialog.wait_for()
    footer=dialog.locator('footer')
    register=literal('register') if alignments is None else alignments
    if id in register:
        x,y=register[id]
        for n,key in [(x,'ArrowRight' if x>0 else 'ArrowLeft'),(y,'ArrowDown' if y>0 else 'ArrowUp')]:
            for _ in range(abs(n)): page.keyboard.press(key)
        footer.locator('.season-main').click()
    elif footer.locator('.season-main').count():page.evaluate(literal('drive_moving'),'catch')
    else:
        for button in footer.locator('button:not(.season-exit)').all(): button.click()
    dialog.get_by_role('button',name='继续').click()

def run(page,base,day,gate,practice,*,practice_seed='proof',evidence_prefix='season-stage-',alignments=None,middle=None,choose_move=None,on_final=None,defense_end=None,retry_desk=None):
    id=day+'-'+gate
    prefix=root/'qa/evidence'/(evidence_prefix+id+'-')
    direct_landing=id=='0107-defense'
    entry=None
    def shot(view):
        if not practice:
            page.wait_for_timeout(180)
            if view=='far' and entry:
                regular=Image.open(BytesIO(page.screenshot(type='png'))).convert('RGB')
                diptych=Image.new('RGB',(regular.width,regular.height*2))
                diptych.paste(entry,(0,0));diptych.paste(regular,(0,regular.height))
                diptych.save(str(prefix)+'far.jpg',quality=86)
            else:page.screenshot(path=str(prefix)+view+'.jpg',quality=85,type='jpeg')
    def angles():
        if evidence_prefix in ('yearend-six-','monthend-six-','newyear-six-','janweek-six-') and gate=='match':
            page.wait_for_function('window.__slime.ctx.time>=1.25')
        for v in ['low','far','play']:
            page.evaluate('v=>__level.setView(v)',v)
            shot(v)
        page.set_viewport_size({'width':390,'height':844})
        shot('portrait')
        width=page.evaluate("document.documentElement.scrollWidth")
        assert width==390,width
        page.set_viewport_size({'width':1080,'height':720})
        page.wait_for_timeout(130)
    page.goto(base+'/level.html?id='+id+('&practice='+practice_seed if practice else ''))
    page.wait_for_function('window.__slime?.latest?.count>100')
    data={'oldRecord':page.evaluate("JSON.parse(localStorage.getItem('slimefable.web.save.v1')).life.records.oldtest"),
          'fluid':page.evaluate('__slime.latest.count')}
    if practice:data['practiceSeed']=practice_seed
    if not practice:
        if evidence_prefix in ('yearend-six-','monthend-six-','newyear-six-','janweek-six-'):
            page.wait_for_function('window.__slime.ctx.time>=1.25')
        page.wait_for_timeout(200)
        entry=Image.open(BytesIO(page.screenshot(type='png'))).convert('RGB')
    if gate=='match' and not practice:
        page.set_viewport_size({'width':920,'height':600})
        page.wait_for_timeout(180)
        selectors=['[data-home]','[data-rules]','[data-mute]','[data-ranking]']
        if page.evaluate('__level.phase')=='intro':
            selectors+=['[data-match-start]','[data-match-practice]','.season-preview']
        else:
            selectors+=['[data-match-hint]','[data-match-shuffle]']
        for selector in selectors:
            assert page.locator(selector).evaluate('''el=>{const b=el.getBoundingClientRect(),target=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return target===el||el.contains(target)}'''),(day,selector)
        page.locator('[data-rules]').click()
        page.locator('[data-close-guide]').click()
        page.locator('[data-home]').click()
        page.wait_for_url('**/?date='+day+'&from='+id)
        page.goto(base+'/level.html?id='+id)
        page.set_viewport_size({'width':1080,'height':720})
        page.wait_for_function('window.__slime?.latest?.count>100')
        data['wideShort']=[920,600]
    data['authoredDraws']=page.evaluate('''([day,mode])=>{const obj=__slime.ctx.scene.getObjectByName((mode==='defense'?'machine-':'tabletop-')+day);
      if(!obj)throw Error('missing model');let n=0;obj.traverse(m=>{if(m.isMesh)n++});return n}''',[day,gate])
    assert 0<data['authoredDraws']<=150,data
    if gate=='defense':
        if '进入布防' in page.locator('[data-action]').inner_text():
            page.locator('[data-action]:enabled').click()
        if not practice:
            page.locator('[data-action]').click()
            if retry_desk:data['beforeRetry']=retry_desk(page,day,True)
            page.evaluate("""()=>{const l=__level,g=l.game;for(let j=0;j<1800&&g.phase==='wave';j++)g.tick(.03);l.step(.02);}""")
            assert page.evaluate('__level.phase')=='lost'
            page.locator('[data-action]').click()
            if retry_desk:data['afterRetry']=retry_desk(page,day,False)
        for w in range(6):
            page.evaluate("""w=>{const click=s=>document.querySelector(s).click();click('[data-tool=remove]');for(let i=0;i<6;i++)click('[data-pad="'+i+'"]');
              const pad=2*Math.floor(w/2);click('[data-tool=water]');click('[data-pad="'+pad+'"]');click('[data-tool=wind]');click('[data-pad="'+(pad+1)+'"]');}""",w)
            if w==2:page.locator('[data-machine]').click()
            page.locator('[data-action]:enabled').click()
            if w==2 and not practice:angles()
            if w==2 and middle: data['middle']=middle(page,day)
            if w==2 and day in ['1130','1201']:
                page.evaluate('''day=>{const l=__level,g=l.game,click=s=>document.querySelector(s).click();
                  click('[data-tool=remove]');click('[data-pad="2"]');click('[data-pad="3"]');
                  let live=[];
                  for(let t=0;t<320;t++){g.tick(.035);live=g.packets.filter(p=>!p.connected);
                    if(g.control.lock===0&&(day==='1130'?live.length>=2:live.some(p=>p.distance>=g.tracks[p.route].total*.46)))break;}
                  l.step(.03);const before=g.control.hits;click('[data-machine]');
                  if(g.control.hits<=before)throw Error('没有作用到关内目标 '+day);
                  click('[data-tool=water]');click('[data-pad="2"]');click('[data-tool=wind]');click('[data-pad="3"]');}''',day)
            page.evaluate("""()=>{const l=__level,g=l.game;for(let j=0;j<1800&&g.phase==='wave';j++){g.tick(.03);if(j%156===0){l.step(.01);document.querySelector('[data-machine]').click();}}l.step(.03);}""")
            assert page.evaluate('__level.phase')!='lost'
        data.update(page.evaluate("({retries:__level.game.retries,operations:__level.game.control.count,hits:__level.game.control.hits,served:__level.game.served})"))
        if direct_landing:
            # An old or unavailable panel asset must not strand a completed defense run.
            panel_requests=[]
            def block_panel(route):
                panel_requests.append(route.request.url)
                route.fulfill(status=404,content_type='text/plain',body='Not found')
            page.route('**/assets/season-instrument-*.js',block_panel)
            if practice:page.set_viewport_size({'width':390,'height':844})
            landing=page.get_by_role('button',name='放下着陆绳',exact=True)
            assert landing.count()==1
            if practice:page.get_by_role('button',name='F1 帮助',exact=True).tap()
            else:page.keyboard.press('F1')
            help_panel=page.locator('#gate-help[open]')
            assert '点「放下着陆绳」' in help_panel.locator('.gh-current').inner_text()
            help_panel.get_by_role('button',name='返回关卡').click()
            if practice:landing.tap()
            else:landing.click()
            assert page.locator('.jd-tip').inner_text()=='着陆绳已放下，等吊篮落稳。'
            assert not page.locator('.season-plate[open]').count() and not panel_requests,panel_requests
            data['landedWithoutPanel']=True
            data['landingInput']='touch' if practice else 'mouse'
        else:
            page.locator('[data-action]').click()
            finish_plate(page,id,alignments)
        page.wait_for_function('__level.phase==="won"')
        page.locator('[data-action]:enabled').wait_for()
        if defense_end:data['sceneEnd']=defense_end(page,day,practice)
        shot('final')
        page.locator('[data-action]:enabled').click()
    else:
        if page.evaluate('__level.phase')=='intro':page.locator('[data-match-start]').click()
        shot_mid=False
        retried=False
        for t in range(40):
            if page.locator('.season-plate[open]').count():break
            if page.evaluate('__level.board.stage')==1 and not shot_mid and not practice:
                angles(); shot_mid=True
                snapshot=page.evaluate('JSON.stringify(__level.board.cells)')
                page.evaluate('''()=>{for(let n=0;n<24&&__level.board.moves>1;n++)document.querySelector('[data-match-shuffle]').click();}''')
                # Select a legal ordinary swap whose resulting initial line misses both objective cells.
                pair=page.evaluate('''()=>{const b=__level.board;
                  for(let i=0;i<64;i++)for(const j of [i+1,i+8]){
                    if(j>=64||Math.abs(j%8-i%8)+Math.abs((j>>3)-(i>>3))!==1)continue;
                    const a=b.cells.slice();if(a[i]<0||a[j]<0||a[i]>=6||a[j]>=6||a[i]===a[j])continue;
                    [a[i],a[j]]=[a[j],a[i]];let hits=[];
                    for(const step of [1,8])for(let k=0;k<64;k++){
                      if(k+2*step>=64||step===1&&k%8>5||a[k]<0||a[k]>=6)continue;
                      if(a[k]===a[k+step]&&a[k]===a[k+step*2])hits.push(k,k+step,k+step*2);
                    }
                    if(hits.length&&!hits.some(k=>b.targets.includes(k)))return [i,j];
                  }return __level.hint();}''')
                assert pair
                for i in pair: page.locator(f'[data-cell="{i}"]').click()
                page.wait_for_function('__level.phase==="lost"')
                page.locator('[data-match-retry]').click()
                assert page.evaluate('__level.board.stage')==1
                assert page.evaluate('JSON.stringify(__level.board.cells)')==snapshot
                retried=True

            # Use the authored right-hand switch for the alternate journey.
            if day=='1201' and practice and page.evaluate('__level.board.stage===1&&!__level.board.branch'):
                pair=[37,36]
            elif choose_move:pair=choose_move(page,day,practice)
            else:pair=page.evaluate('__level.hint()')
            assert pair,(id,page.evaluate('__level.phase'))
            for i in pair:page.locator(f'[data-cell="{i}"]').click()
            page.wait_for_function('__level.phase==="play" || __level.phase==="lost" || document.querySelector(".season-plate[open]")')
        data['retriedStage']=1 if retried else None
        finish_plate(page,id,alignments)
        page.wait_for_function('__level.phase==="finale"')
        if day=='1201':
            page.wait_for_timeout(1450)
            data['train']=page.evaluate('''()=>{const root=__slime.ctx.scene.getObjectByName('tabletop-1201');
              const train=root.getObjectByName('train'),points=root.getObjectByName('points');
              return {branch:__level.board.branch,x:train.position.x,z:train.position.z,switchAngle:points.rotation.y};}''')
            assert data['train']['branch']==(2 if practice else 1),data
            assert data['train']['x']>1 and abs(data['train']['z']-(-.72 if practice else 0))<.025,data
            if practice:
                file=Path(str(prefix)+'final.jpg')
                inner=Image.open(file).convert('RGB')
                outer=Image.open(BytesIO(page.screenshot(type='png'))).convert('RGB')
                paired=Image.new('RGB',(outer.width,2*outer.height))
                paired.paste(inner.crop((0,0,outer.width,outer.height)),(0,0))
                paired.paste(outer,(0,outer.height));paired.save(file,quality=86)
        if on_final:data['sceneEnd']=on_final(page,day,practice)
        shot('final')
        data.update(page.evaluate('({steps:__level.board.turn,remaining:__level.board.moves,branch:__level.board.branch,score:__level.board.score})'))
        page.locator('[data-match-keep]').click()
    page.locator('.mode-keepsake[open]').wait_for()
    save=page.evaluate("JSON.parse(localStorage.getItem('slimefable.web.save.v1'))")
    mark='-practice' if practice else '-daily'
    data['records']={k:v for k,v in save['life']['records'].items() if k.startswith(id) and mark in k}
    assert any(k.endswith('-wins') for k in data['records']),data
    if not direct_landing:assert any(k.endswith('-instrument') for k in data['records']),data
    assert data['oldRecord']==save['life']['records']['oldtest']==7
    data['coins']=save['life']['coins']
    assert data['coins']==(41 if practice else 49),data
    page.locator('[data-mode-home]').click()
    page.wait_for_url('**/?date='+day+'&from='+id)
    data['return']=page.url
    return data

def body_probe(page,base,day,gate):
    page.goto(base+'/level.html?id='+day+'-'+gate)
    page.wait_for_function('window.__slime?.latest?.count>100')
    if gate=='defense':
        if '进入布防' in page.locator('[data-action]').inner_text():page.locator('[data-action]:enabled').click()
    elif page.evaluate('__level.phase')=='intro':page.locator('[data-match-start]').click()
    return page.evaluate('''async gate=>{
      const actor=__slime;
      function shape(){
        const f=actor.latest,attributes=actor.renderer.geometry.attributes,vertices=attributes.position.array;let loX=Infinity,hiX=-Infinity,loY=Infinity,hiY=-Infinity;
        for(let i=0;i<f.count;i+=6){
          if(attributes.cluster.array[i]>.1)continue;
          const x=vertices[3*i],y=vertices[3*i+1];
          if(x<loX)loX=x;if(x>hiX)hiX=x;if(y<loY)loY=y;if(y>hiY)hiY=y;
        }return [(hiX-loX),(hiY-loY),f.count];
      }
      await new Promise(r=>setTimeout(r,260));const before=shape(),since=performance.now();
      if(gate==='defense'){document.querySelector('[data-tool=water]').click();document.querySelector('[data-pad="0"]').click();}
      else{for(const i of __level.hint())document.querySelector('[data-cell="'+i+'"]').click();}
      let changed=before,largest=0;
      while(performance.now()-since<2400){await new Promise(requestAnimationFrame);const b=shape();
        const delta=Math.abs(b[0]-before[0])+Math.abs(b[1]-before[1]);
        if(delta>largest){largest=delta;changed=b;}}
      if(!Number.isFinite(largest)||largest<.01)throw Error('unchanged fluid '+JSON.stringify([gate,before,changed]));
      return {before,changed,extentDelta:largest};
    }''',gate)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default='http://127.0.0.1:5190')
    parser.add_argument('--day',nargs='*',default=['1127','1128','1129','1130','1201'])
    parser.add_argument('--gate',nargs='*',default=['defense','match'])
    parser.add_argument('--body-only',action='store_true')
    args=parser.parse_args()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        for day in args.day:
            for gate in args.gate:
                if args.body_only:
                    context=browser.new_context(viewport={'width':920,'height':600},reduced_motion='reduce')
                    context.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve();')
                    page=context.new_page()
                    probe=body_probe(page,args.base,day,gate)
                    target=root/'qa/evidence'/f'season-stage-{day}-{gate}-result.json'
                    data=json.loads(target.read_text(encoding='utf-8')) if target.exists() else {}
                    data['bodyResponse']=probe
                    target.write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')
                    print(day,gate,probe,flush=True)
                    context.close()
                    continue
                results={}
                for practice in [False,True]:
                    ctx=browser.new_context(viewport={'width':1080,'height':720},reduced_motion='reduce')
                    ctx.route_web_socket('**/*',lambda socket:None)
                    ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{oldtest:7}}}));""")
                    page=ctx.new_page()
                    page.set_default_timeout(35000)
                    errors=[]
                    page.on('pageerror',lambda e: errors.append(str(e)))
                    print(day,gate,practice,flush=True)
                    result=run(page,args.base,day,gate,practice)
                    assert not errors,errors
                    results['practice' if practice else 'daily']=result
                    if not practice:results['bodyResponse']=body_probe(page,args.base,day,gate)
                    ctx.close()
                file=root/'qa/evidence'/f'season-stage-{day}-{gate}-result.json'
                file.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()
if __name__=='__main__':main()
