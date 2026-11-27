"""Play December 17–21 defense and match in isolated headless production contexts."""
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
    v=page.evaluate("""()=>{const c=__level.game.control;return {count:c.count,hits:c.hits,reserve:c.reserve};}""")
    assert v['count']==int(before),v
    if not before:assert v['hits']==v['reserve']==0,v
    return v

def middle(page,day):
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(170)
    pads=page.locator('[data-pad]').evaluate_all("""els=>els.map(el=>{const b=el.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;return {x,y,accessible:document.elementFromPoint(x,y)===el};})""")
    assert len(pads)==6 and all(p['accessible'] for p in pads),(day,pads)
    page.set_viewport_size({'width':1080,'height':720})
    result=page.evaluate("""day=>{
     const l=__level,g=l.game,c=g.control,first=c.hits;
     const click=s=>document.querySelector(s).click(),place=(n,k)=>{click('[data-tool="'+k+'"]');click('[data-pad="'+n+'"]');};
     place(2,'remove');place(3,'remove');
     if(day==='1218'||day==='1221')place(2,day==='1218'?'water':'wind');
     let seen=false,evidence=[],previous=c.reserve;
     for(let j=0;j<800&&g.phase==='wave'&&!seen;j++){
       g.tick(.03);if(c.lock)continue;
       const live=g.packets.filter(p=>!p.connected&&p.work>0),r=p=>p.distance/g.tracks[p.route].total;
       const eligible=day==='1217'?live.find(p=>p.lit&&r(p)>=.50)??live.find(p=>!p.lit&&r(p)<.5):
         day==='1218'?live.find(p=>p.lit):day==='1219'?live.find(p=>!c.reserve||1+p.id%2!==c.reserve):
         day==='1220'?live.find(p=>p.id%3===Math.floor(c.focus/2)):
         live.find(p=>p.lit&&!live.some(x=>x.route===p.route&&!x.lit&&Math.abs(r(p)-r(x))<.15));
       if(!eligible)continue;
       const {id,lit,work}=eligible,pos=r(eligible);previous=c.reserve;
       l.step(.009);click('[data-machine]');
       if(c.hits===first)continue;
       evidence.push({id,lit:!!lit,work,after:eligible.work,fraction:pos,held:c.reserve,slow:eligible.slow});
       seen=day==='1217'?!!lit&&eligible.work===0:day==='1219'?previous>0&&c.reserve===0:day==='1218'?eligible.slow>0:eligible.work===0;
     }
     place(2,'water');place(3,'wind');l.step(.01);
     if(!seen)throw Error('middle task did not apply '+JSON.stringify([day,evidence,g.phase,c.hits,first,c.reserve,g.clock]));
     return {before:first,after:c.hits,evidence,elapsed:g.clock};
    }""",day)

    return {**result,'portraitPads':pads}

def choose(page,day,practice):
    if day in ['1218','1220'] and page.evaluate('__level.board.stage===1&&!__level.board.branch'):
        return [37,36] if practice else [26,27]
    return page.evaluate('__level.hint()')

def endpoint(page,day,practice,gate):
    page.wait_for_timeout(1650)
    state=page.evaluate("""([day,gate])=>{
      const root=__slime.ctx.scene.getObjectByName((gate==='match'?'tabletop-':'machine-')+day),e=root.getObjectByName('yearend-finale');
      let lamps=0;root.traverseVisible(x=>{if(x.name==='connected-unit'||x.name==='collection-received')lamps++;});
      return {x:e.position.x,y:e.position.y,z:e.position.z,tilt:e.rotation.z,yaw:e.rotation.y,scaleY:e.scale.y,scaleZ:e.scale.z,
        hinge:e.children.find(x=>x.isGroup)?.rotation.z??null,lamps,branch:__level.board?.branch??0};}""",[day,gate])
    if gate=='defense':
        if day=='1217':assert abs(state['tilt'])<.03,state
        if day=='1218':assert state['z']>1.11 and abs(state['hinge'])<.02,state
        if day=='1219':assert state['x']>.80 and abs(state['hinge'])<.02,state
        if day=='1220':assert state['lamps']==9,state
        if day=='1221':assert state['scaleZ']>1.03 and state['z']>.14,state
    else:
        if day in ['1218','1220']:assert state['branch']==(2 if practice else 1),state
        if day=='1217':assert state['scaleY']>.97,state
        if day=='1218':assert abs(state['hinge'])<.03,state
        if day=='1219':assert state['yaw']<-.14,state
        if day=='1220':assert state['lamps']==16 and state['x']>.72,state
        if day=='1221':assert abs(state['tilt'])<.03,state
    return state
if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--day',nargs='+',default=['1217','1218','1219','1220','1221'])
    p.add_argument('--gate',nargs='+',default=['defense','match'])
    p.add_argument('--base',default='http://127.0.0.1:5190')
    base.check(p.parse_args(),'yearend-six-',{'1217-defense':(2,-1),'1218-match':(-1,-2),'1221-defense':(-2,1)},middle,choose,
       lambda page,day,practice:endpoint(page,day,practice,'match'),lambda page,day,practice:endpoint(page,day,practice,'defense'),retry_desk)
