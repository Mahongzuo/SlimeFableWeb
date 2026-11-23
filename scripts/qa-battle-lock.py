"""Exercise lock-on and skill payment in an isolated Vite browser fixture."""
import argparse
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base', required=True, help='private Vite development URL')
args=parser.parse_args()
fixture="""<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><script type=module>
import {Stage} from '/src/level/stage.ts';
import {battleLook} from '/src/themes/battle-preview.ts';
import {SlimeCharacter} from '/src/slime/character.ts';
import {mountBattleLock} from '/src/level/battle-lock.ts';
const stage=new Stage(battleLook(false));
const actor=new SlimeCharacter(stage,{world:{boxes:[],surfaces:[{min:[-50,-50],max:[50,50],height:0}]},
 spawn:[0,0,0],battleTargets:[[0,0,-4],[2.4,0,-4]],ui:false,onDodgePress:()=>window.dodges++});
const lock=mountBattleLock(actor,stage,msg=>window.denied=msg);
let t=0;
function step(count=1){for(let i=0;i<count;i++){lock.update(.025,actor.mode==='play');actor.update(t+=.025,.025);}}
Object.assign(window,{actor,lock,stage,step,dodges:0});
const startup=setInterval(()=>{step();if(actor.ready){clearInterval(startup);actor.play();step(5)}},16);
</script>"""
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':720,'height':560},has_touch=True)
    page.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.route('**/lock-fixture.html',lambda route:route.fulfill(content_type='text/html',body=fixture))
    page.goto(args.base+'/lock-fixture.html')
    page.wait_for_function("window.actor?.mode==='play' && lock.target?.id===0")
    page.keyboard.press('Tab')
    assert page.evaluate('actor.battleAim.hard && lock.target.id===0')
    page.keyboard.press('t')
    assert page.evaluate('actor.battleAim.hard && lock.target.id===1')
    page.evaluate('step(45)')
    assert page.evaluate('actor.yaw < -.32 && actor.yaw > -.66')
    assert page.locator('.battle-lock-marker').get_attribute('data-hard')=='true'
    assert page.evaluate("""()=>{const t=lock.target;t.position=[2.4,0,-8];actor.setElement(4,true);
        const energy=actor.skills.energy;const cast=actor.castSkill('Q');
        return cast===null && actor.skills.energy===energy && !actor.skills.getCooldown(4,'Q') && denied.includes('射程');}""")
    assert page.evaluate("""()=>{const t=lock.target;t.position=[1.2,0,-3];
      actor.world.boxes.push({name:'partition',min:[-2,0,-1.65],max:[3,3,-1.5]});
      step();const cd=actor.skills.getCooldown(4,'Q');const cast=actor.castSkill('Q');
      return !cast && !cd && !actor.skills.getCooldown(4,'Q') && denied.includes('遮挡');}""")
    assert page.locator('.battle-lock-marker').get_attribute('data-status')=='blocked'
    assert page.evaluate("""()=>{actor.setElement(0,true);return !!actor.castSkill('Q') && actor.skills.energy===0}""")
    page.evaluate('step(36)')
    assert page.evaluate('!actor.battleAim.hard && !lock.target')
    page.evaluate("actor.world.boxes.pop();actor.combat.targets[1].position=[2.4,0,-4];actor.yaw=0;step(35)")
    page.locator('.battle-lock-controls button').first.tap()
    assert page.evaluate('actor.battleAim.hard')
    chosen=page.evaluate('lock.target.id')
    page.locator('.battle-lock-controls button').last.tap()
    assert page.evaluate('lock.target.id')!=chosen
    # Sideways dodge displacement through the same capsule used by the encounter.
    page.evaluate("actor.dodgeMotion=[.6,0,0];step();actor.dodgeMotion=null")
    assert page.evaluate("""()=>{const id=lock.target.id,t=lock.target;actor.attack();
       const d=actor.combat.direction,dx=t.position[0]-actor.position[0],dz=t.position[2]-actor.position[2];
       return id===lock.target.id && (d[0]*dx+d[2]*dz)/Math.hypot(dx,dz)>.99}""")
    assert page.evaluate("""()=>{actor.setElement(3,true);const t=lock.target,h=t.health;
       return !!actor.castSkill('E') && t.health<h && t.aura===3}""")
    assert page.evaluate("""()=>{const t=lock.target;t.health=500;actor.setElement(0,true);
      actor.teleport([0,0,0]);actor.velocity=[0,0,0];t.position=[0,0,-1.15];
      actor.combat.active=false;actor.combat.index=-1;actor.combat.queued=false;
      const start=t.hits;actor.attack();let previous=actor.combat.index,switched=false,reaimed=false,min=100;
      for(let i=0;i<170;i++){actor.attack();step();
        if(!switched && actor.combat.queued){t.position=[actor.position[0]+1.15,0,actor.position[2]];switched=true;}
        if(switched&&actor.combat.index!==previous){
          const dx=t.position[0]-actor.position[0],dz=t.position[2]-actor.position[2],d=actor.combat.direction;
          reaimed ||= d[0]>.65 && (d[0]*dx+d[2]*dz)/Math.hypot(dx,dz)>.995;
        }
        previous=actor.combat.index;
        min=Math.min(min,Math.hypot(t.position[0]-actor.position[0],t.position[2]-actor.position[2]));
      }
      return switched&&reaimed&&min>=.719&&t.hits>=start+3;}""")
    page.evaluate('lock.target.health=0;step(2)')
    assert page.evaluate('!actor.battleAim.hard && (!lock.target||lock.target.health>0)')
    assert page.evaluate("""()=>{const t=actor.combat.targets.find(e=>e.health>0);t.position=[0,0,-6];actor.teleport([0,0,0]);
      actor.yaw=0;actor.setElement(0,true);actor.skills.reset();step(25);
      const hp=t.health;if(!actor.castSkill('E'))return false;
      step(2);t.position=[5,0,-6];step(50);return t.health===hp;}""")
    assert page.evaluate("""()=>{const t=actor.combat.targets.find(e=>e.health>0);t.position=[0,0,-6];
      actor.skills.reset();actor.yaw=0;step(25);const hp=t.health;if(!actor.castSkill('E'))return false;
      actor.world.boxes.push({name:'intercept',min:[-1,0,-3.3],max:[1,2,-3]});
      step(50);return t.health===hp;}""")
    page.mouse.click(80,80,button='right')
    assert page.evaluate('dodges')==1
    page.keyboard.press('Escape')
    page.evaluate('step()')
    assert not page.locator('.battle-lock-controls').is_visible()
    assert not page.locator('.battle-lock-marker').is_visible()
    assert not errors,errors
    print('PASS soft target, Tab/T and touch switching, camera, blocked/far Q, self AoE, side dodge attacks, occlusion/death/pause release and RMB.')
    browser.close()
