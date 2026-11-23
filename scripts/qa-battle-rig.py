"""Record the actual encounter rigs in isolation without HUD, VFX or pointer capture."""
import argparse
import base64
import shutil
import socket
import subprocess
import time
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'qa/evidence/1021-enemy-animation.mp4'
FPS = 30

STUDIO = """
const T = await import('/node_modules/three/build/three.module.js');
const {createBattleRig} = await import('/src/themes/battle-rig.ts');
const scene = new T.Scene(), camera = new T.PerspectiveCamera(31, 16/10, .06, 24);
const renderer = new T.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(800,500);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
document.body.style.margin='0';document.body.append(renderer.domElement);
const ground=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
scene.add(new T.HemisphereLight('#fcf1dd','#b29b87',1.7));
const sun=new T.DirectionalLight('#ffe1ad',3.2);sun.position.set(3,5,4);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0006;sun.shadow.normalBias=.017;scene.add(sun);
const rim=new T.DirectionalLight('#b1eafa',2.25);rim.position.set(-3,3,-2);scene.add(rim);
const rigs=[createBattleRig(true),createBattleRig(false)];rigs.forEach(r=>scene.add(r.root));
window.sample=(n,idx)=>{
  const ship=idx===0,r=rigs[idx],t=n/30;
  rigs.forEach((m,i)=>m.root.visible=idx===i);
  scene.background=new T.Color(ship?'#b9ccca':'#c8bcaa');
  scene.fog=new T.FogExp2(scene.background,.052);
  ground.material.color.set(ship?'#9d846f':'#8a806d');
  const walkEnd=32,start=40,end=ship?91:111;
  if(n===0)r.reset();
  if(n===start)r.attack();
  if(n===end+6)r.hit(-1);
  if(n===end+17)r.hit(1);
  if(n===end+31)r.defeat();
  r.root.position.x=ship?Math.min(n/walkEnd,1)*.48-.48:0;
  r.root.position.z=ship?0:Math.min(n/walkEnd,1)*.86-.86;
  r.update(1/30,n<walkEnd?.86:0);
  if(ship){camera.position.set(1.58,1.11,3.80);camera.lookAt(0,.84,0);}
  else {camera.position.set(2.26,1.42,4.42);camera.lookAt(.05,.75,.36);}
  renderer.render(scene,camera);
  return renderer.domElement.toDataURL('image/jpeg',.955).split(',')[1];
};
"""

def capture(base, output):
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    output.parent.mkdir(exist_ok=True, parents=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 800,'height': 500})
        page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
        page.route('**/rig-review',lambda route: route.fulfill(content_type='text/html',body='<!doctype html><body></body>'))
        page.goto(base+'/rig-review'); page.evaluate("async()=>{"+STUDIO+"}")
        process = subprocess.Popen([ffmpeg,'-loglevel','error','-y','-f','image2pipe','-framerate',str(FPS),
            '-c:v','mjpeg','-i','pipe:0','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',str(output)],stdin=subprocess.PIPE)
        try:
            for kind,frames in enumerate([158,179]):
                for n in range(frames):
                    frame = base64.b64decode(page.evaluate('([i,k])=>sample(i,k)',[n,kind]))
                    if n==(62 if kind==0 else 73):
                        (output.parent/('1021-canvas-pose.jpg' if kind==0 else '1021-banner-pose.jpg')).write_bytes(frame)
                    process.stdin.write(frame)
            process.stdin.close()
            if process.wait():raise RuntimeError('ffmpeg encode failed')
        finally:
            if process.poll() is None:process.kill()
            browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',help='existing Vite dev server')
    parser.add_argument('--output',type=Path,default=OUTPUT)
    args=parser.parse_args()
    if args.base:
        capture(args.base,args.output)
    else:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
        base=f'http://127.0.0.1:{port}'
        server=subprocess.Popen(['node','node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',str(port),'--strictPort'],cwd=ROOT,stdout=subprocess.DEVNULL)
        try:
            for _ in range(50):
                try:
                    with urlopen(base+'/src/themes/battle-rig.ts',timeout=1):break
                except OSError:time.sleep(.2)
            capture(base,args.output)
        finally:
            server.terminate()
            server.wait()
