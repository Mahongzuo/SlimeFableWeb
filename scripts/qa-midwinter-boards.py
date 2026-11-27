"""Exercise live December 12–16 board controls and final animations in a headless production browser."""
import argparse
import importlib.util
import sys
from pathlib import Path

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('board_proof',root/'scripts/qa-december-defense.py')
base=importlib.util.module_from_spec(spec)
sys.dont_write_bytecode=True
spec.loader.exec_module(base)

def retry_desk(page,day,before):
    if before:
        page.evaluate("""()=>{__level.step(.04);document.querySelector('[data-machine]').click();}""")
    state=page.evaluate("""()=>{const c=__level.game.control;return {count:c.count,hits:c.hits,reserve:c.reserve};}""")
    assert state['count']==(1 if before else 0),state
    if day=='1215':assert state['reserve']==(1 if before else 0),state
    if not before:assert state['hits']==0,state
    return state

def middle(page,day):
    return page.evaluate("""day=>{
      const l=__level,g=l.game,c=g.control,first=c.hits;
      const click=s=>document.querySelector(s).click(),place=(n,k)=>{click('[data-tool="'+k+'"]');click('[data-pad="'+n+'"]');};
      place(2,'remove');place(3,'remove');for(let j=0;j<150;j++)g.tick(.03);
      for(let j=0;j<700&&g.phase==='wave'&&(c.hits<=first||day==='1215'&&c.reserve);j++){
        const live=g.packets.filter(p=>!p.connected&&p.work>0);
        if((day==='1212'||day==='1214')&&j===0){place(2,day==='1214'?'wind':'water');}
        if(!c.lock&&live.length){
          const eligible=day==='1212'?c.reserve>0:day==='1213'?live.some(p=>Math.abs(p.distance/g.tracks[p.route].total-(c.focus%2?.68:.30))<.18):
            day==='1214'?live.some(p=>p.lit&&p.distance/g.tracks[p.route].total>.27):day==='1216'?live.length>=2:true;
          if(eligible){l.step(.02);click('[data-machine]');}
        }
        g.tick(.03);
      }
      place(2,'water');place(3,'wind');l.step(.02);
      if(c.hits<=first||day==='1215'&&c.reserve)throw Error('unreached mid action '+JSON.stringify([day,c.hits,first,c.reserve,g.phase]));
      return {before:first,after:c.hits,reserve:c.reserve,elapsed:g.clock};
    }""",day)

def choose(page,day,practice):
    if day in ['1212','1213','1216'] and page.evaluate('__level.board.stage===1&&!__level.board.branch'):
        if day=='1212':return [45,44] if practice else [18,19]
        return [37,36] if practice else ([26,34] if day=='1216' else [26,27])
    return page.evaluate('__level.hint()')

def endpoint(page,day,practice,gate):
    page.wait_for_timeout(1700)
    s=page.evaluate("""([day,gate])=>{const root=__slime.ctx.scene.getObjectByName((gate==='match'?'tabletop-':'machine-')+day);
      const e=root.getObjectByName('mid-end'),sole=root.getObjectByName('lander-foot-sole'),ground=root.getObjectByName('landing-contact');
      let gap=null;if(sole&&ground){root.updateWorldMatrix(true,true);gap=sole.matrixWorld.elements[13]-ground.matrixWorld.elements[13];}
      let lit=0;root.traverseVisible(n=>{if(n.name==='synchronised-star'||n.name==='canal-window')lit++;});return {lit,gap,x:e.position.x,y:e.position.y,z:e.position.z,
        yaw:e.rotation.y,tilt:e.rotation.z,branch:__level.board?.branch??0};}""",[day,gate])
    if gate=='defense':
        if day=='1212':assert s['y']>.78 and s['lit']==7,s
        if day=='1213':assert s['x']>.76,s
        if day=='1214':assert s['gap'] is not None and abs(s['gap'])<.002,s
        if day=='1215':assert s['yaw']>2.68 and s['x']>2.35,s
        if day=='1216':assert s['tilt']>.27 and s['lit']==24,s
    else:
        if day in ['1212','1213','1216']:assert s['branch']==(2 if practice else 1),s
        if day=='1212':assert abs(s['z'])<.024 and abs(s['tilt'])<.03,s
        if day=='1213':assert s['x']>1.42,s
        if day=='1214':assert s['y']>1.27,s
        if day=='1215':assert s['z']>.095,s
        if day=='1216':assert s['x']>.62 and abs(s['z']-(-.12 if practice else .60))<.04,s
    return s
if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--day',nargs='+',default=['1212','1213','1214','1215','1216'])
    p.add_argument('--gate',nargs='+',default=['defense','match'])
    p.add_argument('--base',default='http://127.0.0.1:5190')
    base.check(p.parse_args(),'midwinter-six-',{'1212-match':(-2,1),'1215-defense':(1,-2)},middle,choose,
        lambda page,day,practice:endpoint(page,day,practice,'match'),lambda page,day,practice:endpoint(page,day,practice,'defense'),retry_desk)

