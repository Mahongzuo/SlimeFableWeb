"""December 2–6 tabletop campaigns. Browser always runs headless."""
import argparse
import importlib.util
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('tabletop',root/'scripts/qa-season-defense.py')
tabletop=importlib.util.module_from_spec(spec)
sys.dont_write_bytecode=True
spec.loader.exec_module(tabletop)
register={'1204-match':(-1,-2),'1206-defense':(1,2)}

def middle(page,day):
    return page.evaluate("""day=>{
      const l=__level,g=l.game,c=g.control,sel=s=>document.querySelector(s).click(),before=c.hits;
      const pad=(i,tool)=>{sel('[data-tool="'+tool+'"]');sel('[data-pad="'+i+'"]');};
      // Let a real packet enter the action window, then return the pair of towers.
      pad(2,'remove');pad(3,'remove');
      for(let n=0;n<240&&g.phase==='wave';n++){
        g.tick(.03);
        if(g.clock<4.2)continue;
        const v=g.packets.filter(p=>!p.connected);
        const eligible=day==='1203'?v.some(p=>p.route%2===c.side):day==='1204'?v.some(p=>p.distance/g.tracks[p.route].total>.53):v.length>0;
        if(eligible)break;
      }
      pad(2,'water');pad(3,'wind');l.step(.02);
      for(let n=0;n<460&&g.phase==='wave'&&c.hits===before;n++){
        g.tick(.035);
        const v=g.packets.filter(p=>!p.connected&&p.work>0);
        const ready=day==='1205'?c.reserve>0&&v.length>0:
          day==='1206'?v.some(p=>p.slow>0&&p.distance/g.tracks[p.route].total>.22):true;
        if(ready&&c.lock===0){l.step(.02);sel('[data-machine]');}
      }
      if(c.hits===before)throw Error('operation did not reach any packet '+JSON.stringify([day,g.phase,c.hits,c.reserve,c.active,c.focus,c.side,g.clock]));
      return {before,after:c.hits,linked:c.linked,remainingReserve:c.reserve,focus:c.focus,elapsed:g.clock};
    }""",day)

def choose(page,day,practice):
    if day=='1205' and page.evaluate('__level.board.stage===1&&!__level.board.branch'):
        return [37,36] if practice else [26,27]
    return page.evaluate('__level.hint()')

def endpoint(page,day,practice):
    page.wait_for_timeout(1600)
    observed=page.evaluate("""day=>{
      const root=__slime.ctx.scene.getObjectByName('tabletop-'+day);
      const obj=['lid','ascending-capsule','','supply-cart','tunnel-car'][Number(day.slice(2))-2];
      const piece=obj&&root.getObjectByName(obj);
      let lamps=0;root.traverseVisible(m=>{if(m.name==='lamp'&&m.isMesh)lamps+=m.count??1;});
      return {piece:obj,lamps,branch:__level.board.branch??0,x:piece?piece.position.x:null,y:piece?piece.position.y:null,
         z:piece?piece.position.z:null,angle:piece?piece.rotation.z:null};
    }""",day)
    if day=='1202':assert abs(observed['angle'])<.04,observed
    if day=='1203':assert observed['y']>2.4,observed
    if day=='1204':assert observed['lamps']>=5,observed
    if day=='1205':
        assert abs(observed['z']-(.72 if practice else 1.13))<.045,observed
        assert observed['branch']==(2 if practice else 1),observed
        assert observed['x']>1.1,observed
    if day=='1206':assert observed['x']>1.5,observed
    return observed

def check(args,prefix="dec-six-",alignments=register,wave_action=middle,board_move=choose,board_end=endpoint,defense_end=None,retry_desk=None,practice_seeds=None):
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        for day in args.day:
            for gate in args.gate:
                id=day+'-'+gate
                output={}
                for practice in [False,True]:
                    ctx=browser.new_context(viewport={'width':1080,'height':720},reduced_motion='reduce',has_touch=id=='0107-defense')
                    ctx.route_web_socket('**/*',lambda socket:None)
                    ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
                    if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
                    JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{oldtest:7}}}));""")
                    page=ctx.new_page();page.set_default_timeout(35000);errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    print(id,'practice' if practice else 'daily',flush=True)
                    if not practice:output['bodyResponse']=tabletop.body_probe(page,args.base,day,gate)
                    practice_seed=(practice_seeds or {}).get(id,'proof')
                    result=tabletop.run(page,args.base,day,gate,practice,practice_seed=practice_seed,evidence_prefix=prefix,alignments=alignments,
                        middle=wave_action,choose_move=board_move,on_final=board_end,defense_end=defense_end,retry_desk=retry_desk)
                    assert not errors,errors
                    output['practice' if practice else 'daily']=result
                    ctx.close()
                path=root/'qa/evidence'/(prefix+id+'-result.json')
                path.write_text(json.dumps(output,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')
        browser.close()
if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--day',nargs='+',default=['1202','1203','1204','1205','1206'])
    parser.add_argument('--gate',nargs='+',default=['defense','match'])
    parser.add_argument('--base',default='http://127.0.0.1:5190')
    check(parser.parse_args())
