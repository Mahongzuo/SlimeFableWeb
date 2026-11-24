"""Record native capsule, ground-follow pivot and collision boom on both decks of the playable fleet."""
import argparse
import csv
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from matplotlib.figure import Figure

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:5190')
args=parser.parse_args()
out=Path(__file__).resolve().parents[1]/'qa/evidence'
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1024,'height':640})
    page.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve()')
    page.goto(args.base+'/level.html?id=1021-skirmish')
    page.wait_for_function('window.__slime?.ready')
    page.locator('[data-primary]').click()
    page.wait_for_function('__level.phase==="play" && __slime.aimReady')
    # Run real movement + camera synchronously under the prescribed delta. Renderer throughput
    # on a software GPU is deliberately independent of these playback frame rates.
    traces=page.evaluate("""()=>{
      const a=__slime,T=a.ctx.THREE, rows=[],checks=[];
      for(const hz of [30,60,120]){
        let t=0,part='';
        const dt=1/hz;
        function sample(){
          a.elapsed=t;t+=dt;a.movement(dt,t);a.camera(dt);
          if(a.aiming)a.aim();
          const direction=a.ctx.camera.getWorldDirection(new T.Vector3());
          const alignment=direction.x*(-Math.sin(a.yaw))+direction.z*(-Math.cos(a.yaw));
          if(alignment<.97)throw Error('azimuth lag: '+[hz,part,alignment,a.pitch]);
          const h=a.cameraHeight.height, eye=a.ctx.camera.position.y;
          rows.push({hz,part,t,x:a.position[0],z:a.position[2],foot:a.position[1],pivot:h,lookY:eye-Math.sin(a.pitch)*a.currentArm,eye,arm:a.currentArm});
        }
        function hold(seconds){for(let n=0;n<Math.round(hz*seconds);n++)sample()}
        function place(x,y,z){
          a.teleport([x,y,z]);a.grounded=true;a.jumps=0;a.currentArm=a.arm;a.keys.clear();a.aiming=true;a.aimBlend=1;
          a.pitch=.04;a.yaw=0;part='settle';hold(.4);
          if(Math.abs(a.cameraHeight.height-y)>.02)throw Error('teleport drift '+[hz,x,y,z,a.position,a.cameraHeight.height]);
        }
        function walk(label,positive,target,sprint=false,turn=false){
          part=label;a.keys.add(positive?'KeyS':'KeyW');if(sprint)a.keys.add('ShiftLeft');
          let n=0;
          while((positive?1:-1)*(target-a.position[2])>.01 && n++<hz*5){
            a.yaw=turn?.09*Math.sin(t*4):0;sample();
          }
          a.keys.clear();if(n>=hz*5)throw Error('route blocked '+[hz,label,...a.position]);
        }
        place(4.2,0,1.9);
        walk('upper walk + aim',true,6.85,false,true);
        part='upper stop';hold(.65);
        if(Math.abs(a.position[1]-2.1)>.02||Math.abs(a.cameraHeight.height-a.position[1])>.006)throw Error('upper stop');
        walk('upper reverse sprint',false,1.85,true);
        part='lower landing';hold(.6);
        if(Math.abs(a.position[1])>.02)throw Error('upper descent');
        place(4.20,-2.45,-5.65);
        walk('cargo sprint up',true,.2,true);
        part='cargo stop';hold(.65);
        if(Math.abs(a.position[1])>.02)throw Error('cargo climb');
        walk('cargo reverse walk',false,-5.6);
        part='hold stop';hold(.65);
        if(Math.abs(a.position[1]+2.45)>.02)throw Error('cargo descent');
        // Stand underneath the overhanging deck and pitch the camera upward into its underside.
        place(-.50,-2.45,-5.8);
        a.pitch=.80;part='beam retract';a.camera(dt);
        const short=a.currentArm;
        if(short>=a.arm-.15)throw Error('beam did not retract '+[hz,short]);
        rows.push({hz,part,t,x:a.position[0],z:a.position[2],foot:a.position[1],pivot:a.cameraHeight.height,lookY:a.ctx.camera.position.y-Math.sin(a.pitch)*short,eye:a.ctx.camera.position.y,arm:short});
        a.pitch=0;a.yaw=Math.PI/2;a.camera(dt);const released=a.currentArm;
        if(released<=short||released>=a.arm-.001)throw Error('beam recovery instant or blocked');
        part='beam release';hold(1.1);
        if(a.currentArm<a.arm-.035)throw Error('boom failed to extend '+[a.currentArm,a.arm]);
        checks.push({hz,short,released,rest:a.currentArm});
      }
      return {rows,checks};
    }""")
    page.goto(args.base+'/?date=1021')
    page.wait_for_function('window.__game?.slime?.ready')
    page.keyboard.press('Enter')
    page.wait_for_function('__game.state==="play"')
    harbor=page.evaluate("""()=>{
      const a=__slime,rows=[];
      for(const hz of [30,60,120]){
        const dt=1/hz,x=19.53,start=53.27;
        let t=15;
        a.keys.clear();a.pitch=.10;a.yaw=0;a.aiming=false;a.aimBlend=0;a.shake=0;
        a.teleport([x,a.world.support(x,start),start]);a.grounded=true;a.jumps=0;
        const sample=part=>{
          t+=dt;a.movement(dt,t);a.camera(dt);
          rows.push({hz,part,t,x:a.position[0],z:a.position[2],foot:a.position[1],
            pivot:a.cameraHeight.height,lookY:a.ctx.camera.position.y-(Math.sin(a.pitch)+.05)*a.currentArm,eye:a.ctx.camera.position.y,arm:a.currentArm});
        };
        for(let i=0;i<hz/2;i++)sample('park landing');
        const base=a.position[1];
        for(const up of [true,false]){
          a.keys.clear();a.yaw=up?Math.PI:0;a.keys.add('KeyW');const limit=up?59.72:53.30;let n=0;
          while((up?1:-1)*(limit-a.position[2])>.035 && n++<hz*6)sample(up?'park climb':'park descent');
          if(n>=hz*6)throw Error('park stairs blocked '+[hz,up,...a.position]);
          a.keys.clear();for(let i=0;i<Math.ceil(hz*.55);i++)sample('park stop');
          if(up&&a.position[1]<=base+.35)throw Error('park stair elevation '+[base,...a.position]);
          if(Math.abs(a.position[1]-a.cameraHeight.height)>.015)throw Error('park stop drift '+JSON.stringify({hz,up,pos:a.position,v:a.velocity,ground:a.grounded,cling:a.cling,h:a.cameraHeight.height}));
        }
      }
      return rows;
    }""")
    traces['rows'].extend(harbor)
    browser.close()
rows=traces['rows']
with (out/'native-stair-camera.csv').open('w',newline='',encoding='utf-8') as fp:
    writer=csv.DictWriter(fp,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
figure=Figure(figsize=(11,7),dpi=125,layout='constrained')
ax,bx=figure.subplots(2,1)
for hz in [30,60,120]:
    group=[r for r in rows if r['hz']==hz]
    segments=[]
    for row in group:
        if not segments or segments[-1][-1]['part']!=row['part']:segments.append([])
        segments[-1].append(row)
    colors={30:'#008c78',60:'#cf5638',120:'#3158a3'}
    for i,seg in enumerate(segments):
        t=[r['t'] for r in seg];color=colors[hz]
        for plot,field in [(ax,'pivot'),(bx,'arm')]:
            plot.plot(t,[r[field] for r in seg],color=color,linewidth=1.3,label=f'{hz} Hz' if i==0 else None)
        if hz==60:
            ax.plot(t,[r['foot'] for r in seg],color='#737373',linewidth=.9,linestyle=':',label='Capsule foot (60 Hz)' if i==0 else None)
            ax.plot(t,[r['eye'] for r in seg],color='#9b4d80',linewidth=.9,linestyle='--',label='Camera eye (60 Hz)' if i==0 else None)
        if seg[0]['part']=='park climb':
            # A smoothed pivot grazing a sampled tread used to collapse the boom to 2 cm.
            assert min(r['arm'] for r in seg)>.60,(hz,'false ground obstruction')
        if seg[0]['part'] in ('upper walk + aim','cargo sprint up','upper reverse sprint'):
            peak=lambda key:max(abs(b[key]-a[key]) for a,b in zip(seg,seg[1:]))
            assert peak('pivot')<peak('foot')*.92,(hz,seg[0]['part'],peak('pivot'),peak('foot'))
ax.set(ylabel='Height (m)',title='Fleet stairs and overhead beam (0–12 s)   |   Harbor windmill steps (15–21 s)')
bx.set(ylabel='Camera boom (m)',xlabel='Simulated gameplay time (s)')
for plot in [ax,bx]:plot.grid(alpha=.18);plot.legend()
figure.savefig(out/'native-stair-camera.png')
print('PASS native ship and harbor stairs at 30/60/120 simulated FPS',json.dumps(traces['checks']))
