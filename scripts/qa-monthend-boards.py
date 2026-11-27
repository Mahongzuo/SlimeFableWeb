"""Play December 22–31 defense and match in isolated headless production contexts."""
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
     if(['1223','1228','1230'].includes(day))place(2,day==='1223'?'water':'wind');
     let seen=false,evidence=[];
     for(let j=0;j<1050&&g.phase==='wave'&&!seen;j++){
       g.tick(.025);
       const live=g.packets.filter(p=>!p.connected&&p.work>0),r=p=>p.distance/g.tracks[p.route].total;
       if(day==='1230'&&live.some(p=>p.lit&&p.slow>0))place(2,'remove');
       if(day==='1228'&&live.some(p=>p.lit))place(2,'remove');
       if(c.lock||!live.length)continue;
       let active=null;
       if(day==='1222')active=live.find(p=>p.id%2===c.side);
       if(day==='1223')active=c.reserve>0&&live[0];
       if(day==='1224')active=live.find(p=>Math.abs(r(p)-(c.focus%2?.68:.28))<.175);
       if(day==='1225')active=live.some(p=>p.id%2)&&live.find(p=>!(p.id%2));
       if(day==='1226')active=live.find(p=>p.id%3===c.reserve);
       if(day==='1227')active=live.find(p=>Math.abs(r(p)-(c.side?.64:.34))<.13);
       if(day==='1228')active=live.some(p=>r(p)<.44)&&live.find(p=>p.lit&&r(p)>.46);
       if(day==='1229'){const slot=c.reserve===1?3:2;place(slot,'water');place(slot,'remove');active=live[0];}
       if(day==='1230')active=live.find(p=>p.lit&&p.slow<=0);
       if(day==='1231')active=live.find(p=>live.some(q=>q!==p&&q.route===p.route&&Math.abs(r(p)-r(q))<.246));
       if(!active)continue;
       const {id,lit,work}=active,pos=r(active),reserve=c.reserve,before=c.hits;
       l.step(.001);click('[data-machine]');
       evidence.push({id,lit:!!lit,work,after:active.work,fraction:pos,afterFraction:r(active),held:reserve,reserve:c.reserve,focus:c.focus,activeHits:c.hits-before});
       seen=c.hits>before;
     }
     place(2,'water');place(3,'wind');l.step(.01);
     if(!seen)throw Error('middle task did not apply '+JSON.stringify([day,evidence,g.phase,c.hits,first,c.reserve,g.clock]));
     return {before:first,after:c.hits,evidence,elapsed:g.clock};
    }""",day)

    return {**result,'portraitPads':pads}

def choose(page,day,practice):
    if not practice and page.evaluate('__level.board.stage===0&&!window.__monthNarrow'):
        page.set_viewport_size({'width':500,'height':820})
        page.wait_for_timeout(160)
        result=page.evaluate("""()=>{const cells=[...document.querySelectorAll('[data-cell]')].filter(el=>!el.disabled),el=cells.find(x=>x.textContent),b=(el||cells[0]).getBoundingClientRect();return window.__monthNarrow={width:innerWidth,scroll:document.documentElement.scrollWidth,tile:b.width,tappable:cells.every(el=>{const r=el.getBoundingClientRect(),x=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return x===el||el.contains(x);})};}""")
        assert result['scroll']==500 and result['tile']>=24 and result['tappable'],(day,result)
        page.set_viewport_size({'width':1080,'height':720})
    if day in ['1223','1225','1226','1230','1231'] and page.evaluate('__level.board.stage===1&&!__level.board.branch'):
        return [37,36] if practice else [26,27]
    return page.evaluate('__level.hint()')

def endpoint(page,day,practice,gate):
    page.wait_for_timeout(1650)
    state=page.evaluate("""([day,gate])=>{const root=__slime.ctx.scene.getObjectByName((gate==='match'?'tabletop-':'machine-')+day);
      const e=root.getObjectByName('monthend-finale');let lamps=0;root.traverseVisible(x=>{if(['month-lamp','warm-house','warm-port'].includes(x.name))lamps++;});
      return {x:e.position.x,y:e.position.y,z:e.position.z,tilt:e.rotation.z,yaw:e.rotation.y,scale:e.scale.x,
        hinge:e.children.find(x=>x.isGroup)?.rotation.z??null,lamps,branch:__level.board?.branch??0};}""",[day,gate])
    if gate=='defense':
        if day=='1222':assert state['y']>2.21,state
        if day=='1223':assert state['z']>.70 and state['y']>.42,state
        if day=='1224':assert state['y']>1.48 and state['x']>1.48,state
        if day=='1225':assert abs(state['yaw'])<.03 and state['y']>.35,state
        if day=='1226':assert state['x']>1.18,state
        if day=='1227':assert state['lamps']==9,state
        if day=='1228':assert state['y']>2.88,state
        if day=='1229':assert state['yaw']>.26,state
        if day=='1230':assert abs(state['hinge'])<.025 and state['z']>.79,state
        if day=='1231':assert state['x']>2.7 and abs(state['tilt'])<.006,state
    else:
        if day in ['1223','1225','1226','1230','1231']:assert state['branch']==(2 if practice else 1),state
        if day=='1222':assert abs(state['tilt'])<.018 and abs(state['y']-1.05)<.025,state
        if day=='1223':
            heights=page.evaluate("""()=>{const r=__slime.ctx.scene.getObjectByName('tabletop-1223');return ['first-star-model','monthend-finale'].map(id=>r.getObjectByName(id).position.y);}""")
            targets=[2.08,1.34] if practice else [1.34,2.08]
            assert abs(state['x']-(-1.38 if practice else 1.38))<.04 and all(abs(a-b)<.012 for a,b in zip(heights,targets)),(state,heights)
            state['heights']=heights
        if day=='1224':assert state['lamps']==27,state
        if day=='1225':assert abs(state['tilt'])<.025,state
        if day=='1226':assert state['x']>1.24 and abs(state['z']-(.59 if practice else -.17))<.04,state
        if day=='1227':assert state['scale']>.97,state
        if day=='1228':assert state['x']>1.98,state
        if day=='1229':assert abs(state['x'])<.03 and state['y']<.82,state
        if day=='1230':assert abs(state['x'])<.03,state
        if day=='1231':assert state['lamps']==7,state
    if gate=='match' and not practice:state['narrow']=page.evaluate('window.__monthNarrow')
    return state
if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--day',nargs='+',default=[str(i) for i in range(1222,1232)])
    p.add_argument('--gate',nargs='+',default=['defense','match'])
    p.add_argument('--base',default='http://127.0.0.1:5190')
    base.check(p.parse_args(),'monthend-six-',{'1222-match':(2,-1),'1225-defense':(-2,1),'1227-match':(-1,-2),'1229-match':(1,2),'1230-defense':(-2,-1)},middle,choose,
       lambda page,day,practice:endpoint(page,day,practice,'match'),lambda page,day,practice:endpoint(page,day,practice,'defense'),retry_desk)
