"""Exercise the five calendar workbenches and all 25 instrument previews in isolated Chrome."""
import argparse
import subprocess
import sys
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
parser.add_argument('--group',choices=['workshops','plates','campaign','harbor'],default='workshops')
parser.add_argument('--day')
parser.add_argument('--gate',choices=['second','defense','match','skirmish','rpg'])
parser.add_argument('--practice',action='store_true',help='Verify the fixed-mode practice bucket in a fresh save.')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
out=root/'qa'/'evidence'
days={'1127':('2011','1895'),'1128':('2018','1964'),'1129':('2022','1972'),'1130':('1992','1872'),'1201':('1948','1959')}
if args.day: days={args.day:days[args.day]}
walk="""async ([x,z])=>{
 const l=__level,a=__slime;
 function hold(k,v){window.dispatchEvent(new KeyboardEvent(v?'keydown':'keyup',{code:k,bubbles:true}));}
 for(let i=0;i<250;i++){const dx=x-a.position[0],dz=z-a.position[2],arrived=Math.hypot(dx,dz)<.23;
  hold('KeyA',!arrived&&dx<-.12);hold('KeyD',!arrived&&dx>.12);hold('KeyW',!arrived&&dz<-.12);hold('KeyS',!arrived&&dz>.12);
  if(arrived)return;
  await new Promise(requestAnimationFrame);
  const render=l.stage.render;l.stage.render=()=>{};
  try{for(let j=0;j<3;j++)l.step(.023);}finally{l.stage.render=render;}
 }throw Error('unreachable '+JSON.stringify({x,z,p:a.position,state:l.game.diagnostics.state}));
}"""
# Read the actual plate in device pixels to line up the illuminated cursor and catch the ball.
drive_moving="""async kind=>{
 const d=document.querySelector('.season-plate'),c=d.querySelector('canvas'),g=c.getContext('2d');
 const near=(p,i,r,g,b)=>Math.abs(p[i]-r)+Math.abs(p[i+1]-g)+Math.abs(p[i+2]-b)<24;
 for(let k=0;k<2000;k++){if(d.querySelector('output').textContent.includes('已完成'))return;
  if(kind==='catch'){const row=g.getImageData(0,320,960,60).data;let goal=-1,bat=-1;
   for(let x=65;x<420;x++){const i=4*(2*x+960*7),j=4*(2*x+960*45);
     if(near(row,i,255,248,219))bat=x;
     const rgb=Array.from(row.slice(j,j+3)).join(',');if(rgb!=='0,0,0'&&goal<0&&x>68){
       const prev=4*(2*(x-1)+960*45);if(Math.abs(row[j]-row[prev])+Math.abs(row[j+1]-row[prev+1])+Math.abs(row[j+2]-row[prev+2])>75)goal=x+23;
     }}
   if(bat>0&&goal>0&&Math.abs(bat-goal)<14)d.querySelector('.season-main').click();
  }else{
    const img=g.getImageData(116,75,731,330),p=img.data;let y=-1;
    outer:for(let j=0;j<img.height;j+=3)for(let x=0;x<img.width;x+=4){const i=(j*img.width+x)*4;if(near(p,i,255,189,117)){y=(75+j)/2;break outer;}}
    if(y>0){const bar=g.getImageData(112,45,1,360).data;let head=-1,tail=-1;
      for(let j=0;j<360;j++)if(near(bar,j*4,227,219,165)){if(head<0)head=j;tail=j;}
      const center=(45+(head+tail)/2)/2;
      if(Math.abs(center-y)>10)d.querySelectorAll('footer button')[y<center?0:1].click();}
  }await new Promise(requestAnimationFrame);
 }throw Error('could not solve '+kind);
}"""
register={'1127-rpg':(2,-2),'1128-1964':(-2,2),'1128-match':(-2,-1),'1129-rpg':(2,1),'1130-skirmish':(-1,2),'1201-1959':(-2,-2),'1201-rpg':(2,-1)}
# Campaign mechanics have their own real-input drivers. Keep the aggregate CLI and report path.
if args.group=='campaign':
    results={}
    for gate in ([args.gate] if args.gate else ['second','defense','match','skirmish','rpg']):
        driver='defense' if gate=='match' else gate
        command=[sys.executable,str(root/'scripts'/f'qa-season-{driver}.py'),'--base',args.base]
        if args.day:
            command.extend(['--days' if gate=='rpg' else '--day',args.day])
        if gate in ('defense','match'):
            command.extend(['--gate',gate])  # board regressions verify both buckets together
        elif args.practice:
            command.append('--practice')
        subprocess.run(command,check=True)
        for day,(_,second) in days.items():
            key=day+'-'+(second if gate=='second' else gate)
            proof=f'season-stage-{day}-{gate}-result.json'
            results[key]={'complete':True,'recorded':True,'evidence':proof}
    target='turning-season-campaign'+(args.day or '')+(args.gate or '')+('-practice' if args.practice else '')+'.json'
    (out/target).write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    sys.exit(0)

with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    ctx=browser.new_context(viewport={'width':950,'height':630})
    ctx.route_web_socket('**/*',lambda socket:None)
    ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
    if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{'0101-trial-daily-wins':2}}}));""")
    page=ctx.new_page()
    page.set_default_timeout(45000)
    errors=[]; results={}
    page.on('pageerror',lambda e:errors.append(str(e)))
    def snap(name):
        page.screenshot(path=out/('turning-season-'+name+'.jpg'),quality=87,timeout=45000)
    def pos(x,z):page.evaluate(walk,[x,z])
    def key(k):page.keyboard.press(k)
    for day,(year,second) in days.items():
        if args.group=='harbor':
            def arrive():
                page.wait_for_function("window.__slime?.ready && ['title','play'].includes(window.__game?.state)")
                if page.evaluate('__game.state==="title"'):page.locator('[data-act=start]:visible').first.click()
                page.wait_for_function('__game.state==="play"')
            page.goto(args.base+'/?date='+day);arrive()
            ids=[day+'-'+x for x in [year,second,'defense','match','skirmish','rpg']]
            key('j');page.wait_for_function('__game.state==="book"')
            for id in ids:assert page.locator('.book [data-act=go][data-id="'+id+'"]').count()==1
            page.locator('[data-act=close]:visible').first.click()
            for slot,id in enumerate(ids,1):
                page.evaluate("i=>{__game.doorLatch.clear();__slime.teleport([...__game.portals[i].slot.position]);}",slot-1)
                page.locator('.door [data-act=go][data-id="'+id+'"]').click()
                page.wait_for_url('**/level.html?id='+id)
                page.wait_for_function('window.__slime?.ready && __slime.latest?.count>100')
                home=page.locator('[data-home]:visible,[data-do=home]:visible,[data-act=home]:visible')
                if home.count():home.first.click()
                else:page.get_by_role('button',name='回到凝露港',exact=True).first.click()
                arrive()
                distance=page.evaluate("i=>{const p=__game.portals[i].slot.position,a=__slime.position;return Math.hypot(p[0]-a[0],p[2]-a[2]);}",slot-1)
                assert distance<3.5 and page.evaluate('__game.showing.shown.day')==day
                results[id]={'book':True,'gate':slot,'returnDistance':round(distance,2)}
                print(id,round(distance,2),flush=True)
        elif args.group=='workshops':
            id=day+'-'+year;print(id,flush=True)
            page.goto(args.base+'/level.html?id='+id)
            page.locator('[data-start]:enabled').click()
            page.wait_for_function('__slime.latest?.count>100 && __level.stage.time>1.2')
            calls=page.evaluate("""()=>{const l=__level,st=l.stage,r=st.renderer,root=l.game.diagnostics.root,info=r.info;
              const old=info.autoReset;info.autoReset=false;
              const count=v=>{root.visible=v;info.reset();st.render(0,__slime);return info.render.calls;};
              try{const base=count(false);return count(true)-base;}finally{root.visible=true;info.autoReset=old;}}""")
            assert 0<calls<=150,(id,calls)
            page.evaluate("""()=>{window.shapes=new Set();
              const sample=()=>{const r=__slime.latest?.radii?.[0];if(r)shapes.add(r.map(v=>v.toFixed(3)).join(','));
              if(__level.phase!=='done')requestAnimationFrame(sample);};sample();}""")
            snap(day+'-play')
            if day!='1129':
                key('g')
                page.wait_for_function('__level.game.diagnostics.state.pinned')
            if day=='1127':
                key('f');pos(-1.45,-.55);key('f');pos(1.5,.85);key('f')
            if day=='1128':
                pos(-1.95,-.3);key('f');key('f');pos(1.95,-.3);key('f');pos(3.1,1.5);key('f')
            if day=='1129':
                pos(0,1.1);key('f');pos(-2.8,.1);pos(2.8,.1);pos(-2.8,.1);pos(0,-.65);
                page.wait_for_function('__slime.grounded');key('Space')
            if day=='1130':
                for i,(x,z) in enumerate([(-2.35,-.25),(.15,-.95),(2.55,-.35)]):
                    pos(x,z);page.wait_for_function('i=>__level.game.diagnostics.state.step>=i',arg=i+2)
                pos(3.1,1.5);key('f')
            if day=='1201':
                pos(-1.9,-.3);key('f');key('f');pos(1.85,-.3);key('f');pos(-3,1.05);key('f');pos(3.12,1.05)
            page.wait_for_function('__level.phase==="done"')
            snap(day+'-final')
            page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(450);snap(day+'-portrait')
            page.set_viewport_size({'width':950,'height':630})
            # Override the QA camera inside the render loop, so WebGL presents every captured frame.
            for angle,eye in [('low',[4.8,1.55,6.6]),('wide',[.7,7.4,12])]:
                page.evaluate("""eye=>{const st=__level.stage;window.workshopRender??=st.render.bind(st);
                    st.render=(dt,a)=>{st.camera.position.fromArray(eye);st.camera.lookAt(0,1.15,-1);window.workshopRender(dt,a);};}""",eye)
                page.wait_for_timeout(300)
                snap(day+'-'+angle)
            results[id]=page.evaluate("""()=>({phase:__level.phase,kind:__level.game.diagnostics.state.kind,particles:__slime.latest.count,journey:JSON.parse(localStorage.getItem('slimefable.web.save.v1')).completed.includes(__level.spec.id)})""")
            results[id]['addedDrawCalls']=calls
            results[id]['bodyShapes']=page.evaluate('shapes.size')
            assert results[id]['bodyShapes']>1
            assert results[id]['journey']
            page.locator('[data-home]').click();page.wait_for_url('**/?from='+id+'&date='+day)
        else:
            for suffix in [second,'defense','match','skirmish','rpg']:
                if args.gate and args.gate!=('second' if suffix==second else suffix):continue
                id=day+'-'+suffix;print(id,flush=True)
                page.goto(args.base+'/level.html?id='+id+('&practice=calendar-proof' if args.practice else ''))
                page.locator('.season-preview').click()
                dialog=page.locator('.season-plate')
                try:dialog.wait_for()
                except Exception:
                    print('instrument missing',id,errors,page.evaluate('[__level.phase,document.querySelector("output")?.textContent]'),flush=True);raise
                if suffix=='match':page.set_viewport_size({'width':390,'height':844})
                page.wait_for_timeout(200)
                if args.group=='plates':snap(id+'-plate')
                footer=dialog.locator('footer')
                if id in register:
                    dx,dy=register[id]
                    for step,k in [(dx,'ArrowRight' if dx>0 else 'ArrowLeft'),(dy,'ArrowDown' if dy>0 else 'ArrowUp')]:
                        for _ in range(abs(step)):key(k)
                    footer.locator('.season-main').click()
                elif id=='1129-1972':page.evaluate(drive_moving,'rally')
                elif footer.locator('.season-main').count():page.evaluate(drive_moving,'catch')
                else:
                    for btn in footer.locator('button:not(.season-exit)').all():btn.click()
                dialog.locator('output').filter(has_text='已完成').wait_for()
                results[id]={'instrument':dialog.locator('h2').inner_text(),'complete':True}
                dialog.get_by_role('button',name='返回关卡').click()
                saved=page.evaluate("JSON.parse(localStorage.getItem('slimefable.web.save.v1'))")
                assert not any(k.startswith(id) for k in saved.get('completed',[]))
                assert not any(k.startswith(id) for k in saved['life']['records'])
                page.set_viewport_size({'width':950,'height':630})
        assert not errors,errors
    (out/('turning-season-'+args.group+(args.day or '')+(args.gate or '')+('-practice' if args.practice else '')+'.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()
