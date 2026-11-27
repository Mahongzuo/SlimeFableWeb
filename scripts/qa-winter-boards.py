"""Play both December 7–11 tabletop modes in a separate production browser."""
import argparse
import importlib.util
import sys
from pathlib import Path

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('board_qa',root/'scripts/qa-december-defense.py')
base=importlib.util.module_from_spec(spec)
sys.dont_write_bytecode=True
spec.loader.exec_module(base)

def middle(page,day):
    return page.evaluate("""day=>{
      const l=__level,g=l.game,c=g.control,before=c.hits;
      const operate=()=>{l.step(.02);document.querySelector('[data-machine]').click();};
      const pad=(i,kind)=>{document.querySelector('[data-tool="'+kind+'"]').click();document.querySelector('[data-pad="'+i+'"]').click();};
      pad(2,'remove');pad(3,'remove');
      for(let i=0;i<125;i++)g.tick(.03);
      // Select the front band deliberately on the two distance instruments.
      if(day==='1209'){pad(2,'wind');pad(3,'water');}
      else{pad(3,'wind');pad(2,'water');}l.step(.02);
      for(let n=0;n<880&&g.phase==='wave'&&c.hits===before;n++){
        g.tick(.03);
        if(c.lock>0)continue;
        const live=g.packets.filter(p=>p.work>0&&!p.connected);
        if(!live.length)continue;
        if((day==='1207'||day==='1209')&&!live.some(p=>p.lit))continue;
        if(day==='1210'&&!live.some(p=>p.route%2===1-c.side)){
          // Alternate first, then take a reading on the following shift.
          operate();continue;
        }
        operate();
      }
      if(c.hits<=before)throw Error('missing live result '+JSON.stringify([day,g.wave,c.count,c.hits,g.clock]));
      return {before,after:c.hits,side:c.side,focus:c.focus,elapsed:g.clock};
    }""",day)

def choice(page,day,practice):
    if day=='1208' and page.evaluate('__level.board.stage===1&&!__level.board.branch'):
        return [37,36] if practice else [26,27]
    return page.evaluate('__level.hint()')

def endpoint(page,day,gate):
    page.wait_for_timeout(1650)
    state=page.evaluate("""([day,gate])=>{
      const root=__slime.ctx.scene.getObjectByName((gate==='match'?'tabletop-':'machine-')+day);
      const n=root.getObjectByName('winter-finale'),hinge=root.getObjectByName('case-hinge');return {lidAngle:hinge?.rotation.x??null,x:n.position.x,y:n.position.y,z:n.position.z,tilt:n.rotation.z,branch:__level.board?.branch??0};
    }""",[day,gate])
    return state

def match_end(page,day,practice):
    s=endpoint(page,day,'match')
    if day=='1207':assert s['x']>.44,s
    if day=='1208':assert .69<s['x']<.74 and s['branch']==(2 if practice else 1),s
    if day=='1209':assert s['y']>.27,s
    if day=='1210':assert abs(s['y'])<.02 and page.evaluate("__slime.ctx.scene.getObjectByName('award-medal').scale.x>.95"),s
    if day=='1211':assert abs(s['lidAngle'])<.05,s
    return s

def defense_end(page,day,practice):
    s=endpoint(page,day,'defense')
    if day=='1207':assert s['y']>3.42,s
    if day=='1208':assert s['y']>3.98,s
    if day=='1209':assert s['x']>4,s
    if day=='1210':assert s['tilt']>.105,s
    if day=='1211':assert page.evaluate("""__slime.ctx.scene.getObjectByName('weather-lightning').visible"""),s
    return s

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--day',nargs='+',default=['1207','1208','1209','1210','1211'])
    parser.add_argument('--gate',nargs='+',default=['defense','match'])
    parser.add_argument('--base',default='http://127.0.0.1:5190')
    base.check(parser.parse_args(),'winter-six-',{'1208-defense':(-2,1),'1210-defense':(2,-1)},middle,choice,match_end,defense_end)

