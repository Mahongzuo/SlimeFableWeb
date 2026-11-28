"""Adapt Joan Tieu's CC BY 4.0 pottery house. Run with numpy, trimesh and Pillow."""
from collections import defaultdict
from pathlib import Path
from tempfile import gettempdir
import importlib.util
import io
import re
import urllib.request

import numpy as np
import trimesh
from PIL import Image, ImageEnhance

spec = importlib.util.spec_from_file_location("architecture", Path(__file__).with_name("import-home-architecture.py"))
arch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(arch)
arch.OUT = Path(__file__).resolve().parents[1] / "public/models/companions"
uid = "04337ff5619b435eaeb606a563e9b481"
cache = Path(gettempdir()) / (uid + ".glb")
if not cache.exists():
    urllib.request.urlretrieve("https://huggingface.co/datasets/allenai/objaverse/resolve/main/glbs/000-032/" + uid + ".glb", cache)

# Retain the central storey at room scale and bring the tips of the eaves inside the yard.
axes = [
    [(-9,-9.2),(-3.1,-6.52),(-2.62,-5.96),(2.51,5.96),(3.1,6.56),(6.6,8.75)],
    [(.45,-.50),(1.85,-.08),(2.1,.025),(2.5,.43),(5.1,3.47),(7.9,5.72),(9.5,7.75),(12.35,9.65),(13.4,10.15),(16.64,11.4)],
    [(-6,-6.25),(-3.15,-4.83),(-2.7,-4.37),(2.74,4.34),(3.5,4.95),(5.2,6.30),(8.4,8.30)],
]
src = arch.Source(cache)
scene = trimesh.load(cache, process=False)
model = arch.Model("potters-residence")
model.j["asset"]["copyright"] = "Ancient Chinese Pottery by Joan Tieu, CC BY 4.0; adapted for SlimeFable. See CREDITS.md."
groups = defaultdict(lambda: defaultdict(list))

def texture(index, foliage):
    view = src.j["bufferViews"][src.j["images"][index]["bufferView"]]
    off = view.get("byteOffset", 0)
    im = Image.open(io.BytesIO(src.bin[off:off+view["byteLength"]])).convert("RGBA" if foliage else "RGB")
    im.thumbnail((1024,1024) if foliage else (2048,2048),Image.Resampling.LANCZOS)
    im = ImageEnhance.Color(im).enhance(.82 if foliage else .88)
    if not foliage:
        # Restore pigment in sunlight: keep painted highlights, turn lacquer toward chestnut
        # and grade the blue tile brushwork toward the harbour's muted celadon slate.
        rgb=np.asarray(im,dtype=float)/255
        r,g,b=rgb.transpose(2,0,1)
        warm=np.clip((r-np.maximum(g,b)-.035)*3.4,0,1)[...,None]
        grey=rgb @ np.array([.28,.57,.15])
        pigment=np.stack((grey*1.23+.06,grey*.86+.035,grey*.65+.032),axis=2)
        rgb=rgb*(1-warm*.62)+pigment*warm*.62
        blue=np.clip((b-r-.04)*3.5,0,1)[...,None]
        pigment=np.stack((grey*.71+.025,grey*.89+.04,grey*.95+.055),axis=2)
        rgb=rgb*(1-blue*.42)+pigment*blue*.42
        im=Image.fromarray(np.uint8(np.clip(rgb,0,1)*255))
    dst = io.BytesIO()
    im.save(dst, format="PNG" if foliage else "JPEG", **({} if foliage else {"quality":94,"optimize":True}))
    mat = model.mat(dst.getvalue(), 1)
    if foliage:
        model.j["images"][-1]["mimeType"] = "image/png"
        model.j["materials"][mat].update(alphaMode="MASK", alphaCutoff=.44)
    return mat
house_mat, leaf_mat = texture(0,False), texture(1,True)
model.j["materials"][house_mat]["pbrMetallicRoughness"]["baseColorFactor"]=[.64,.61,.57,1]

def split(poly, axis, bound, sign):
    inside, outside = [], []
    for a,b in zip(poly,poly[1:]+poly[:1]):
        da, db = sign*(a[axis]-bound), sign*(b[axis]-bound)
        (inside if da>=0 else outside).append(a)
        if (da<0)!=(db<0):
            p = a+(b-a)*(da/(da-db))
            inside.append(p)
            outside.append(p)
    return inside, outside

def subtract_box(attrs, faces, planes):
    """Clip the portal and old floor, preserving the original atlas UVs at every cut."""
    result = []
    for tri in attrs[faces]:
        if any(np.all(sign*(tri[:,ax]-at)<0) for ax,at,sign in planes):
            result.extend(tri)
            continue
        rest=list(tri)
        for ax,at,sign in planes:
            rest,outside=split(rest,ax,at,sign)
            for k in range(1,len(outside)-1):
                result.extend((outside[0],outside[k],outside[k+1]))
            if len(rest)<3:
                break
    a=np.asarray(result)
    return a, np.arange(len(a)).reshape(-1,3)

for node in sorted(scene.graph.nodes_geometry):
    name = node.split("_M_")[0]
    leaf = name.startswith("Ivy") or re.fullmatch(r"moss(?:[1-9]|1[0-2])?",name)
    upper = name.startswith(("Level1","Level0_Rooftop","Side_Rooftop","Top_Deco","Deco_Vase","ExtraRoof","Sign"))
    lower = name in {"Level0_Walls","Door_Frame","Level0_DecoFence","SideFence","Foundation","Lantern01","Lantern02","Color_Pot_Blue","Color_Pot_Red","Color_Pot_White","Color_Pot_Blue1"} or name.startswith("Windows_")
    if not (upper or lower or leaf):
        continue
    t,key=scene.graph[node]
    m=scene.geometry[key].copy()
    m.apply_transform(t)
    uv=m.visual.uv.copy()
    uv[:,1]=1-uv[:,1]  # trimesh presents UVs with a bottom-left origin.
    p=m.vertices
    a=np.column_stack((p,m.vertex_normals.copy(),uv,np.ones_like(p)))
    faces=m.faces
    if name in ("Door_Frame","Level0_Walls","Level0_DecoFence"):
        a,faces=subtract_box(a,faces,[(0,-.54,1),(0,.54,-1),(1,4.12,-1),(2,2.05,1)])
    if name=="Foundation":
        a,faces=subtract_box(a,faces,[(0,-2.64,1),(0,2.56,-1),(2,-2.72,1),(2,2.79,-1)])
        a,faces=subtract_box(a,faces,[(0,-1.1,1),(0,1.1,-1),(2,3.43,1)])
    p=a[:,:3].copy()
    delta=arch.transform(p+.001,axes)-arch.transform(p,axes)
    a[:,3:6]/=np.maximum(delta/.001,1e-5)
    a[:,3:6]/=np.maximum(np.linalg.norm(a[:,3:6],axis=1,keepdims=True),1e-10)
    a[:,:3]=arch.transform(p,axes)
    # A narrower lantern-shaped loft leaves the first roof's silhouette visible.
    taper=1-.28*np.clip((p[:,1]-6.8)/3.2,0,1)
    if upper or leaf or name.startswith("Windows_"):
        a[:,0]*=taper
        a[:,2]*=taper
    if name=="Deco_Vase":
        # The artist's porcelain roof ornament keeps its round silhouette at finial scale.
        a[:,:3]=(p-[-.4,12.42,-.19])*.41+[-.53,9.64,-.20]
    group = "ClimbingIvy" if leaf else "TiledLoft" if upper else "Threshold" if name=="Foundation" else "TimberHouse"
    groups[group][leaf_mat if leaf else house_mat].append((a,faces))
for group,batches in groups.items():
    model.node(group,batches,(0,0,0))
model.save()


# Related CC0 set dressing from the author's game-asset CDN.
court = {
    "plum-tree":36195, "peony-planter":36198, "garden-stone-bench":36196,
    "bonsai-in":36193, "hanging-silk":36188, "tea-set":36202, "scholars-writing":36217,
    "calligraphy-brush":36204, "inkstone-and":36205, "scroll-rack":36206,
    "folding-screen":36207, "hanging-scroll-pair":36208, "floor-cushion-set":36218,
}
for slug,number in court.items():
    target=arch.OUT / ("court-"+slug+".glb")
    if not target.exists():
        with urllib.request.urlopen(f"https://cdn.3dassets.dev/assets/{number}/v1/model.glb", timeout=35) as response:
            data=response.read()
        if data[:4]!=b"glTF":
            raise ValueError(slug)
        target.write_bytes(data)
