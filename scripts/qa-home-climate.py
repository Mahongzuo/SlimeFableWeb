"""Check home weather in an isolated non-Beijing Chrome session and render seasonal evidence."""
from pathlib import Path
import argparse
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont, ImageOps

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=5217)
port = parser.parse_args().port
out = Path(__file__).resolve().parents[1] / "qa/evidence"
with sync_playwright() as pw:
    browser = pw.chromium.launch(channel="chrome", headless=True, args=["--enable-unsafe-swiftshader"])
    page = browser.new_page(viewport={"width":1100,"height":730}, timezone_id="America/Los_Angeles")
    page.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
      window.testBeijingClock=Date.parse('2026-11-30T23:59:59+08:00');Date.now=()=>window.testBeijingClock;""")
    errors=[]
    page.on("pageerror",lambda e: errors.append(str(e)))
    page.on("console",lambda m: errors.append(m.text) if m.type=="error" and "favicon" not in m.text and "404" not in m.text else None)
    page.goto(f"http://127.0.0.1:{port}/?date=1015")
    page.wait_for_function("window.__slime?.ready && window.__game?.state==='title'", timeout=90000)
    assert page.locator('[data-sky-status]').inner_text().startswith('北京时间 11-30 · 秋季')
    page.evaluate("window.testBeijingClock+=1100")
    page.wait_for_function("document.querySelector('[data-sky-status]').textContent.includes('12-01 · 冬季')")
    page.locator('[data-weather]').select_option('snow')
    page.reload()
    page.wait_for_function("window.__slime?.ready && window.__game?.state==='title'", timeout=90000)
    assert page.locator('[data-weather]').input_value()=='snow'
    page.locator('[data-act=start]').click()
    page.locator('[data-act=pause]').click()
    assert page.locator('[data-weather]').input_value()=='snow'
    page.locator('[data-weather]').select_option('rain')
    assert page.evaluate("__app.director.mode")=='rain'
    page.locator('[data-act=resume]').click()
    page.wait_for_function("__game.state==='play'")
    assert not errors, errors
    # Return to the actual title selector for each change. Hide its overlay for clean reference frames.
    page.wait_for_function("__app.ctx.weather.time > 2")
    page.evaluate("__game.toTitle();__app.renderer.setAnimationLoop(null)")
    page.wait_for_function("__app.scene.getObjectByName('garden-build-huizhou')?.children[0]?.children.length>0",timeout=60000)
    def shot(name, date, mode, pos=(8,6,8), target=(-8,2,-8)):
        page.evaluate("v=>{testBeijingClock=Date.parse(v);__app.step(.03)}",date)
        page.locator('[data-weather]').select_option(mode)
        page.evaluate("""([p,t])=>{const a=__app;a.camera.position.fromArray(p);a.camera.lookAt(...t);a.camera.updateMatrixWorld();
          const d=a.director;d.update(d.weather.time+90);a.step(.03);
          document.querySelector('#game-ui').style.visibility='hidden';}""",[pos,target])
        page.screenshot(path=out/f"home-climate-{name}.jpg",quality=90)
        page.evaluate("document.querySelector('#game-ui').style.visibility=''")
        assert not errors, errors
    for name,month in [('spring',4),('summer',7),('autumn',10),('winter',1)]:
        shot(name,f'2026-{month:02}-15T13:00:00+08:00','clear')
    for name,mode,hour in [('winter-snow','snow',13),('cloudy','cloudy',13),('mist','mist',8),('rain','rain',14),('rainbow','rainbow',15),('night','clear',22)]:
        camera=((-8,5,26),(12,7,-18)) if name=='rainbow' else ()
        shot(name,f'2026-01-15T{hour:02}:00:00+08:00',mode,*camera)
    page.locator('[data-weather]').select_option('auto')
    assert page.evaluate("__app.director.mode")=='auto'
    browser.close()

items=[('spring','春 · 四月'),('summer','夏 · 七月'),('autumn','秋 · 十月'),('winter-snow','冬 · 一月落雪')]
sheet=Image.new('RGB',(960,650),'#f1efe7')
draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
for i,(key,name) in enumerate(items):
    x,y=(i%2)*480,(i//2)*325
    with Image.open(out/f'home-climate-{key}.jpg') as frame:
        sheet.paste(ImageOps.fit(frame,(472,284)),(x+4,y+3))
    draw.text((x+12,y+292),name,font=font,fill='#334c45')
sheet.save(out/'home-climate-seasons.jpg',quality=91)
print("Passed Beijing midnight, saved weather, title/pause controls, four seasons and weather and night views.")
