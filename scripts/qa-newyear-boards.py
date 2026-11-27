"""Play the polished January defense and match doors in headless production contexts."""
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
     if(day==='0103')place(2,'wind');
     if(day==='0104'||day==='0108')place(2,'water');
     if(day==='0107'||day==='0110')place(2,'wind');
     let seen=false,evidence=[];
     for(let j=0;j<1200&&g.phase==='wave'&&!seen;j++){
       g.tick(.025);
       const live=g.packets.filter(p=>!p.connected&&p.work>0),r=p=>p.distance/g.tracks[p.route].total;
       if((['0103','0104','0107','0108','0110'].includes(day))&&live.some(p=>p.lit)&&g.towers[2])place(2,'remove');
       if(c.lock||!live.length)continue;
       let active=null;
       if(day==='0102')active=live.find(p=>1+p.id%2!==c.reserve);
       if(day==='0103')active=live.find(p=>p.lit&&r(p)>=.33&&r(p)<=.72);
       if(day==='0104')active=live.some(p=>!p.lit)&&live.find(p=>p.lit);
       if(day==='0105')active=live.find(p=>p.id%2===c.focus%2);
       if(day==='0106')active=live.find(p=>(r(p)<.5?0:1)===p.id%2);
       if(day==='0107'||day==='0110')active=live.find(p=>p.lit&&(r(p)<.5?0:1)===c.focus%2&&(day!=='0107'||r(p)<.83));
       if(day==='0108'&&live.some(p=>p.id%2===1&&!p.lit))active=live.find(p=>p.lit&&p.id%2===0);
       if(day==='0109')active=live.find(p=>p.id%3===c.reserve);
       if(!active)continue;
       const {id,lit,work}=active,pos=r(active),reserve=c.reserve,before=c.hits;
       l.step(.001);click('[data-machine]');
       evidence.push({id,lit:!!lit,work,after:active.work,fraction:pos,afterFraction:r(active),held:reserve,reserve:c.reserve,focus:c.focus,activeHits:c.hits-before});
       seen=c.hits>before&&(day!=='0102'||evidence.length>=2)&&(day!=='0109'||evidence.length>=3);
     }
     place(2,'water');place(3,'wind');l.step(.01);
     if(!seen)throw Error('middle task did not apply '+JSON.stringify([day,evidence,g.phase,c.hits,first,c.reserve,g.clock]));
     return {before:first,after:c.hits,evidence,elapsed:g.clock};
    }""",day)

    return {**result,'portraitPads':pads}

def choose(page,day,practice):
    if not practice and page.evaluate('__level.board.stage===0&&!window.__newyearNarrow'):
        page.set_viewport_size({'width':500,'height':820})
        page.wait_for_timeout(160)
        result=page.evaluate("""()=>{const cells=[...document.querySelectorAll('[data-cell]')].filter(el=>!el.disabled),el=cells.find(x=>x.textContent),b=(el||cells[0]).getBoundingClientRect();return window.__newyearNarrow={width:innerWidth,scroll:document.documentElement.scrollWidth,tile:b.width,tappable:cells.every(el=>{const r=el.getBoundingClientRect(),x=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return x===el||el.contains(x);})};}""")
        assert result['scroll']==500 and result['tile']>=24 and result['tappable'],(day,result)
        page.set_viewport_size({'width':1080,'height':720})
    route_moves={'0103':([18,19],[21,20]),'0104':([18,19],[21,20]),
                 '0107':([26,27],[29,28]),'0110':([18,19],[45,44])}
    if day in route_moves and page.evaluate('__level.board.stage===1&&!__level.board.branch'):
        return route_moves[day][int(practice)]
    return page.evaluate('__level.hint()')

def endpoint(page,day,practice,gate):
    page.wait_for_timeout(1650)
    state=page.evaluate("""([day,gate])=>{const root=__slime.ctx.scene.getObjectByName((gate==='match'?'tabletop-':'machine-')+day);
      const e=root.getObjectByName('newyear-finale'),other=root.getObjectByName('return-ferry'),rope=e.getObjectByName('landing-rope');let lamps=0;root.traverseVisible(x=>{if(x.name==='ice-lamp')lamps++;});
      return {x:e.position.x,y:e.position.y,z:e.position.z,pitch:e.rotation.x,yaw:e.rotation.y,scale:e.scale.y,other:other?[other.position.x,other.position.z]:null,
        rope:rope?.visible?rope.scale.y:0,lamps,branch:__level.board?.branch??0};}""",[day,gate])
    if gate=='defense':
        if day=='0102':assert state['x']>2.58 and state['other'][0]<-2.58 and state['z']-state['other'][1]>1,state
        if day=='0103':assert abs(state['y']-.13)<.03,state
        if day=='0104':assert state['z']>.48,state
        if day=='0105':assert state['lamps']==8 and state['y']<.02,state
        if day=='0106':assert abs(state['y']-1.92)<.03,state
        if day=='0107':assert abs(state['x']-2.53)<.03 and abs(state['z']-1.57)<.03 and abs(state['pitch'])<.02 and state['rope']>.98,state
        if day=='0108':assert state['pitch']<-1.13,state
        if day=='0109':assert abs(state['y']-.83)<.035,state
        if day=='0110':assert abs(state['z']-1.41)<.035,state
    else:
        if day in ['0103','0104','0107','0110']:assert state['branch']==(2 if practice else 1),state
        if day=='0102':assert state['pitch']>1.11,state
        if day=='0103':assert state['scale']>.68 and abs(state['pitch']+1.57)<.01,state
        if day=='0104':assert state['z']>.53 and state['pitch']<-.19,state
        if day=='0105':assert abs(state['x'])<.02 and abs(state['yaw'])<.025,state
        if day=='0106':assert abs(state['y']-.74)<.025,state
        if day=='0107':assert abs(state['yaw'])<.025 and abs(state['z']-.81)<.025,state
        if day=='0108':assert abs(state['x']+1.01)<.025,state
        if day=='0109':assert abs(state['y']-.46)<.025,state
        if day=='0110':assert abs(state['z']-.31)<.025,state
    if gate=='match' and not practice:state['narrow']=page.evaluate('window.__newyearNarrow')
    return state
if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--day',nargs='+',default=['0102','0103','0104','0105'])
    p.add_argument('--gate',nargs='+',default=['defense','match'])
    p.add_argument('--base',default='http://127.0.0.1:5190')
    args=p.parse_args()
    offsets={'0103-match':(2,-1),'0105-match':(-2,1),'0106-match':(-2,1),'0108-match':(2,-1)}
    for prefix,days in [('newyear-six-',[d for d in args.day if d<='0105']),
                        ('janweek-six-',[d for d in args.day if '0106'<=d<='0110'])]:
        if not days:continue
        run=argparse.Namespace(day=days,gate=args.gate,base=args.base)
        base.check(run,prefix,offsets,middle,choose,
           lambda page,day,practice:endpoint(page,day,practice,'match'),
           lambda page,day,practice:endpoint(page,day,practice,'defense'),retry_desk,
           practice_seeds={'0106-match':'practice-2'})
