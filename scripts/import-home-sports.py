"""Import the player's GLBs and conservative world-up collision bounds from Godot."""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1])
OUT = ROOT / "public/models/sports"
OUT.mkdir(parents=True, exist_ok=True)
names = {"football":"足球场", "basketball":"篮球场", "tennis":"网球场", "badminton":"羽毛球场", "swim":"游泳池"}
data = {}
def numbers(s):
    return [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?(?:e[-+]?\d+)?", s, re.I)]

for key, name in names.items():
    folder = SOURCE / name / "游戏资产"
    shutil.copyfile(folder / (name+".glb"), OUT / (key+".glb"))
    raw = (folder / (name+".tscn")).read_text("utf-8")
    shapes = {}
    for kind, ident, body in re.findall(r'\[sub_resource type="(\w+)" id="([^"]+)"\]([^\[]+)', raw):
        p = numbers(body.split("(", 1)[1])
        if kind == "BoxShape3D":
            shapes[ident] = [[-n / 2 for n in p], [n / 2 for n in p]]
        else:
            shapes[ident] = [[op(p[axis::3]) for axis in range(3)] for op in (min,max)]
    boxes = []
    for part, body in re.findall(r'\[node name="[^"]+" type="CollisionShape3D" parent="([^"]+)"\]([^\[]+)', raw):
        assert "transform =" not in body and "rotation =" not in body
        pos = re.search(r"position = Vector3\((.*?)\)",body)
        xyz = numbers(pos[1]) if pos else [0,0,0]
        ident = re.search(r'SubResource\("(.*?)"\)',body)[1]
        boxes.append([part.split("/")[-1], *[round(v+xyz[i],4) for row in shapes[ident] for i,v in enumerate(row)]])
    data[key] = boxes
(ROOT/"src/home/sports-collision.json").write_text(json.dumps(data,separators=(",",":")), "utf-8")
