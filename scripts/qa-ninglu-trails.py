"""Headless production checks for the north trails, authored residence and inland water."""
import argparse
import base64
import io
import importlib.util
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
out=root/'qa/evidence'
spec=importlib.util.spec_from_file_location('home_qa',root/'scripts/qa-home-companions.py')
game=importlib.util.module_from_spec(spec)
spec.loader.exec_module(game)

def run(browser,base):
    ctx,p=game.start(browser,base)
    errors=[]
    p.on('console',lambda m: errors.append(m.text) if m.type=='error' and ('Shader Error' in m.text or 'VALIDATE_STATUS' in m.text) else None)
    p.on('pageerror',lambda err: errors.append(str(err)))
    game.tap(p,'close')
    p.keyboard.press('F3')
    p.add_style_tag(content='.toast,#toast{display:none!important}')
    p.evaluate("""()=>{window.pipe=a.ctx.pipeline;window.cu=pipe.postHook.compositeMat.uniforms;
       const post=pipe.postHook,renderPost=post.render.bind(post);
       post.render=(args)=>{window.postArgs=args;renderPost(args)};
       window.relight=(atlas,offset)=>{
         const T=a.ctx.THREE,black=new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);black.needsUpdate=true;
         renderPost({...postArgs,causticsMap:atlas?postArgs.causticsMap:black,time:postArgs.time+offset});
         const r=a.renderer;pipe.quadMesh.material=pipe.blitMat;r.setRenderTarget(null);r.render(pipe.quadScene,pipe.quadCam);
         const data=r.domElement.toDataURL('image/png');black.dispose();return data;
       };
       window.enter=(x,z,h=.10)=>{view=null;s.teleport([-21+x*.72,.14+h*.72,16+z*.72]);step(2)};
       a.director.setTime(790);a.director.mode='clear';a.director.update(a.director.weather.time+80);step(32);
    }""")
    def shot(name):
        path=out/('ninglu-trails-'+name+'.jpg')
        p.screenshot(path=path,type='jpeg',quality=91)
        print(name,flush=True)
        return path
    def look(eye,target):
        p.evaluate("([e,t])=>{look(e,t);step(2)}",[eye,target])
    metrics={}
    def measure():
        return p.evaluate("""()=>{const ms=a.bench(12),canvas=a.renderer.domElement;
          return {meanFrameMs:ms,width:canvas.width,height:canvas.height,
            activeTufts:a.ctx.grassField.stats.activeTufts,renderPreset:'medium',frames:12}}""")
    p.wait_for_function("g.cottage.parts.length>=32")
    p.evaluate('enter(0,10.42,0)')
    look([-8,8.3,32.8],[-21,2,16]);shot('courtyard')
    look([-22.7,1.35,25.7],[-20.8,1.56,17.6]);shot('moon-gate')
    p.evaluate("view=null;s.yaw=0")
    p.keyboard.down('w')
    try:
        p.evaluate("for(let i=0;i<120&&s.position[2]>14.38;i++)step()")
    finally:
        p.keyboard.up('w')
    print('walk',p.evaluate('s.position.slice()'),flush=True)
    assert p.evaluate("g.cottage.inside && s.position[2]<15.0")
    routes=p.evaluate("""()=>{function walk(pts){let pos=[-21,.14,16+10.42*.72];
      for(const [x,z] of pts){let xx=-21+x*.72,zz=16+z*.72;
        for(let i=0;i<300;i++){const dx=xx-pos[0],dz=zz-pos[2],d=Math.hypot(dx,dz);if(d<.031)break;
          const v=Math.min(d,.045)/d;pos=s.world.moveCapsule(pos,[dx*v,0,dz*v]).position;
          pos[1]=s.world.support(pos[0],pos[2],pos[1],true)??0;}
        if(Math.hypot(xx-pos[0],zz-pos[2])>.04)throw Error('blocked '+pos+' goal '+[xx,zz]);}return pos[1];}
      const gallery=[[0,6.5],[0,-2.52]],stair=[...gallery,[-.895,-2.7],[-.895,-8.54],[.90,-8.54],[.90,-2.58]];
      return {lower:[-7.95,-4.05,4.05,7.95].map(x=>walk([...gallery,[x,-2.52],[x,-4.95]])),
        upper:[-7.95,-4.05,4.05,7.95].map(x=>walk([...stair,[x,-2.58],[x,-4.95]])),
        wings:[-8,8].map(x=>walk([[0,6.52],[x,6.52],[x,4.29]]))};}""")
    metrics['roomFloors']=routes
    p.evaluate('enter(-7.95,-5.15)')
    look([-26.64,2.13,13.34],[-26.95,.93,10.58]);day=shot('kitchen-day')
    p.evaluate("a.director.setTime(90);a.director.mode='rain';a.director.update(a.director.weather.time+70);step(3)")
    night=shot('kitchen-rain-night')
    area=(350,155,600,355)
    delta=ImageStat.Stat(ImageChops.difference(Image.open(day).crop(area),Image.open(night).crop(area))).mean
    metrics['fixedLightDayNightDelta']=delta
    assert max(delta)<2,delta
    p.evaluate("a.director.setTime(790);a.director.mode='clear';a.director.update(a.director.weather.time+80);enter(7.95,-5.15,3.38)")
    look([-15.46,4.43,13.24],[-15.08,3.64,10.75]);shot('upstairs')
    p.evaluate('enter(-8,4.3)')
    look([-26.65,1.75,19.53],[-27.21,.86,17.07]);shot('pet-room')
    p.evaluate('view=null;go(23,144)')
    look([23.8,1.58,136.8],[23.5,.85,153]);shot('seam-low')
    look([36.1,8.3,139],[23.1,.68,146]);shot('seam-high')
    p.evaluate('view=null;go(23,164)')
    look([23,2.1,150],[17.6,1.05,171]);shot('verge-low')
    look([38,13,160],[20,.65,171]);shot('verge-high')
    metrics['north-trail-render']=measure()
    p.evaluate("""()=>{const r=g.preserves.rects.find(r=>r.biome==='marsh');
      go((r.minX+r.maxX)/2,(r.minZ+r.maxZ)/2);step(2)}""")
    p.wait_for_function(game.PRESERVE_READY,timeout=90000)
    p.evaluate("step(25)")
    w=p.evaluate("""()=>g.preserves.wildlife.filter(w=>w.r.biome==='marsh').map(w=>({id:w.id,x:w.x,z:w.z,y:w.model.group.position.y,bed:s.world.terrain(w.x,w.z)}))""")
    metrics['wetlandResidents']=w
    bird=w[-1]
    look([bird['x']+2.9,1.28,bird['z']+3.1],[bird['x'],.46,bird['z']])
    p.evaluate('step(12)');shot('water-birds')
    metrics['wetland-residents-render']=measure()
    assert p.evaluate('a.ctx.waterWaves.animalEvents.some(e=>e.w>0 && Math.abs(e.z-a.ctx.U.uTime.value)<1.8)')
    p.evaluate("""()=>{l.home.expansions.push({id:'tile_-1_2',gx:-1,gz:2,theme:'jiangnan',unlockedAt:1});g.builder.rebuildFromSave();step(2)}""")
    pond=p.evaluate("""()=>{const pond=pipe.waters.find(w=>w.mesh.geometry.type==='CircleGeometry'&&w.mesh.geometry.parameters.radius>1);return [pond.mesh.position.x,pond.level,pond.mesh.position.z]}""")
    creek=p.evaluate("""()=>{const e=pipe.waters.find(w=>w.mesh.name==='forest-water'),f=e.mesh.userData.levelAt;
      for(let z=113;z<120;z+=.2)for(let x=-100;x<-90;x+=.2){
        const h=f(x,z),n=[0,1,0];
        if(h!==undefined && pipe.inlandWaterLevel(x,z,n)===h && h-s.world.terrain(x,z)>.021 && Math.abs(n[0])+Math.abs(n[2])>.05)return [x,h,z,...n];
      }throw Error('missing sloping creek');}""")
    x,level,z,*normal=creek
    p.evaluate('([x,z])=>go(x,z)',[x,z]);look([x,level-.011,z],[x+.1,level-.007,z-.55])
    assert p.evaluate('Math.abs(cu.uSeaLevel.value-'+str(level)+')<.003 && cu.uOcean.value===1')
    metrics['forestCreek']={'level':level,'normal':normal}
    shot('forest-creek-line')
    samples=[('lake',[2,-.45,114]),('river',[-6.42,-.38,9]),('pond',[pond[0]+2.8,pond[1],pond[2]+1.8])]
    for name,(x,level,z) in samples:
        p.evaluate('([x,z])=>{go(x,z);step(2)}',[x,z])
        bed=p.evaluate('([x,z])=>s.world.terrain(x,z)',[x,z])
        assert bed<level-.04,(name,bed,level)
        for label,dy,aim in [('above',.65,-.48),('line',0,-.055),('under',max(-.7,(bed-level)*.55),.33)]:
            look([x,level+dy,z],[x+.15,level+dy+aim,z-3.1])
            u=p.evaluate('({water:cu.uOcean.value,level:cu.uSeaLevel.value,depth:cu.uCamDepth.value,atlas:cu.tCaustics.value?.image?.width,near:a.camera.near})')
            assert u['water']==1 and abs(u['level']-level)<.012 and u['atlas']>0,(name,label,u,level)
            if label=='under' and name=='pond':
                assert u['near']<(level+dy-bed)*.65,u
            metrics[name+'-'+label]=u
            shot(name+'-'+label)
        if name=='lake':
            look([x,level-.7,z],[x+.35,level+2.1,z-.84])
            shot('lake-upward')
            metrics['submerged-lake-render']=measure()
            look([x,level-.65,z],[x+1,bed,z-2])
            p.evaluate('step(4)')
            shot('lake-bed-early')
            p.evaluate('step(15)')
            look([x,level-.65,z],[x+1,bed,z-2])
            caustic=shot('lake-bed')
        # Recompose precisely the same HDR and depth buffers with only the caustic map changed.
        if name!='lake':
            depth=(bed+level)*.5
            look([x,depth,z],[x+.5,bed-.40,z-.86]);shot(name+'-bed')
        def capture(atlas,offset):
            data=p.evaluate("([atlas,t])=>relight(atlas,t)",[atlas,offset])
            return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB')
        with_light,without=capture(True,0),capture(False,0)
        diff=ImageStat.Stat(ImageChops.difference(with_light,without)).mean
        metrics[name+'-caustic-contribution']=diff
        assert max(diff)>.08,(name,'no focused light reached visible bed',diff)
        later,without_later=capture(True,1.5),capture(False,1.5)
        first_pattern=ImageChops.difference(with_light,without)
        next_pattern=ImageChops.difference(later,without_later)
        motion=ImageStat.Stat(ImageChops.difference(first_pattern,next_pattern)).mean
        metrics[name+'-caustic-motion']=motion
        assert max(motion)>.07,(name,'stationary caustics',motion)
    p.evaluate("go(5,70);look([5,-.5,70],[5,-.35,67]);step(2)")
    assert p.evaluate('cu.uOcean.value===0')
    assert not errors,errors
    (out/'ninglu-trails-measurements.json').write_text(json.dumps(metrics,indent=2,ensure_ascii=False),encoding='utf8')
    sheet=Image.new('RGB',(1080,536),'#f6f2e8')
    pen=ImageDraw.Draw(sheet)
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
    for col,(key,label) in enumerate([('pond','荷塘'),('river','南溪'),('lake','镜湖')]):
        for row,(kind,caption) in enumerate([('line','水线'),('bed','水底焦散')]):
            x,y=360*col,268*row
            photo=Image.open(out/('ninglu-trails-'+key+'-'+kind+'.jpg'))
            sheet.paste(photo.resize((360,240),Image.Resampling.LANCZOS),(x,y))
            pen.text((x+12,y+241),label+' · '+caption,fill='#334e47',font=font)
    sheet.save(out/'ninglu-trails-inland-water.jpg',quality=93)
    ctx.close()
    ctx,phone=game.start(browser,base,portrait=True)
    game.tap(phone,'close')
    phone.locator('.hud-buttons [data-act=guide]').click()
    phone.locator('[data-guide-sec=companions]').click()
    card=phone.locator('.g-card h4',has_text='凝露小院与家具')
    card.scroll_into_view_if_needed()
    assert card.is_visible()
    phone.screenshot(path=out/'ninglu-trails-portrait-guide.jpg',type='jpeg',quality=91)
    phone.locator('.guide-modal [data-act=close]').last.click()
    phone.evaluate("go(2,114);look([2,-.45,114],[2.1,-.52,111]);step(12)")
    assert phone.evaluate("a.ctx.pipeline.postHook.compositeMat.uniforms.uOcean.value===1")
    phone.screenshot(path=out/'ninglu-trails-portrait-waterline.jpg',type='jpeg',quality=91)
    ctx.close()

if __name__=='__main__':
    args=argparse.ArgumentParser()
    args.add_argument('--base',default='http://127.0.0.1:5180')
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-webgl','--use-gl=angle','--ignore-gpu-blocklist'])
        run(browser,args.parse_args().base)
        browser.close()
