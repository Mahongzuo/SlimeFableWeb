"""Bake eight horizontal views of the shipped, standing GLBs. No external assets."""
import argparse
import base64
import importlib.util
import io
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"public/models/companions"
spec=importlib.util.spec_from_file_location("studio",ROOT/"scripts/qa-ranch-wildlife.py")
studio=importlib.util.module_from_spec(spec)
spec.loader.exec_module(studio)
TREES=["redwood-tree","nature-bamboo","nature-willow"]
ANIMALS="bear bull-moose great-horned-owl zebra thomsons-gazelle warthog grey-heron great-crested-grebe mute-swan chipmunk house-sparrow red-panda pheasant golden-eagle goat".split()
SOURCE="""
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {prepareCanopyMaterial} from './src/home/foliage/preserve-habitat';
const gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
gl.setClearColor(0,0);gl.setSize(576,576);
const camera=new T.OrthographicCamera(), scene=new T.Scene(), loader=new GLTFLoader();
scene.add(new T.HemisphereLight(0xfffbeb,0xa2aaa3,1.85));
const key=new T.DirectionalLight(0xffffff,1.35);key.position.set(3,8,4);scene.add(key);
window.bake=async([url,tree])=>{
 const gltf=await loader.loadAsync(url), root=gltf.scene;
 root.traverse(o=>{if(o.isMesh)for(const mat of [].concat(o.material))prepareCanopyMaterial(url.split('/').pop().slice(0,-4),mat);});
 const idle=gltf.animations.find(c=>/^(idle|survey)$/i.test(c.name));
 if(idle){const mixer=new T.AnimationMixer(root);mixer.clipAction(idle).play();mixer.update(0);}
 scene.add(root);root.updateMatrixWorld(true);
 const b=new T.Box3().setFromObject(root,true),c=b.getCenter(new T.Vector3()),v=b.getSize(new T.Vector3());
 const span=Math.max(v.y,Math.hypot(v.x,v.z))*1.05, unit=tree?v.y:Math.max(v.x,v.z);
 camera.left=camera.bottom=-span*.5;camera.right=camera.top=span*.5;camera.near=span*.1;camera.far=span*5;
 camera.updateProjectionMatrix();
 const views=[];
 for(let i=0;i<8;i++){const a=i*Math.PI*.25;
   camera.position.set(c.x+Math.sin(a)*2*span,c.y,c.z+Math.cos(a)*2*span);
   camera.lookAt(c);gl.render(scene,camera);views.push(gl.domElement.toDataURL());}
 root.removeFromParent();
 return {span:span/unit,center:v.y*.5/unit,views};
};
"""

def main(base):
    names=TREES+ANIMALS
    sheet=Image.new("RGBA",(8*192,len(TREES)*192+((len(ANIMALS)+1)//2)*96))
    metadata={}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel="chrome",headless=True,args=["--use-gl=angle"])
        page=browser.new_page()
        page.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve()")
        page.route("**/__bake",lambda r:r.fulfill(content_type="text/html",body="<title>Impostor bake</title>"))
        page.goto(base+"/__bake")
        page.add_script_tag(content=studio.browser_bundle(SOURCE).decode())
        for row,name in enumerate(names):
            folder="dreamworld" if name.startswith("nature-") else "ranch" if name in ["pheasant","red-panda"] else "companions"
            data=page.evaluate("args=>bake(args)",[f"/models/{folder}/{name}.glb",name in TREES])
            small=row-len(TREES)
            size=192 if name in TREES else 96
            x=0 if name in TREES else (small%2)*8*size
            y=row*size if name in TREES else len(TREES)*192+(small//2)*size
            for i,view in enumerate(data["views"]):
                img=Image.open(io.BytesIO(base64.b64decode(view.split(",")[1])))
                assert img.getchannel("A").getbbox(),name
                sheet.paste(img.resize((size,size),Image.Resampling.LANCZOS),(x+i*size,y))
            metadata[name]={"row":row,"span":round(data["span"],5),"center":round(data["center"],5),
                "tile":[x/sheet.width,1-(y+size)/sheet.height,size/sheet.width,size/sheet.height]}
        browser.close()
    sheet.save(OUT/"preserve-impostors.webp",quality=89,method=6)
    (OUT/"preserve-impostors.json").write_text(json.dumps(metadata,indent=2)+"\n",encoding="utf8")

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--base",default="http://127.0.0.1:5180")
    main(ap.parse_args().base)
