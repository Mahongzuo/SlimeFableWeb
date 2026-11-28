"""Import the author's matching GLB and Godot collision scene. Accepts the asset directory."""
import json
import re
import shutil
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
assets = Path(sys.argv[1])
scene = (assets / '凝露小院.tscn').read_text(encoding='utf-8')
shapes = {}
for kind, key, values in re.findall(r'\[sub_resource type="(\w+)" id="(Shape_\d+)"\]\n\w+ = \w+\(([^)]+)\)', scene):
    v = [float(n) for n in values.split(',')]
    shapes[key] = (kind, list(zip(v[::3], v[1::3], v[2::3])))
boxes = []
nodes = re.findall(r'type="CollisionShape3D" parent="Collision/([^"]+)"\]\nposition = Vector3\(([^)]+)\)\nshape = SubResource\("([^"]+)"\)', scene)
assert nodes and len(nodes) == scene.count('type="CollisionShape3D"')
for group, position, key in nodes:
    offset = [float(n) for n in position.split(',')]
    kind, points = shapes[key]
    def record(lo, hi):
        boxes.append([group] + [round(v + offset[i], 4) for bound in (lo, hi) for i, v in enumerate(bound)])
    if kind == 'BoxShape3D':
        record([-.5*n for n in points[0]], [.5*n for n in points[0]])
        continue
    lo, hi = [list(map(fn, zip(*points))) for fn in (min, max)]
    if group != 'Stair':
        record(lo, hi)
        continue
    # Indexed boxes follow the authored ramp and both sloping rails, including their clear underside.
    ends = [[p[1] for p in points if p[2] == z] for z in (lo[2], hi[2])]
    for i in range(24):
        a, b = i/24, (i+1)/24
        mid = (a+b)*.5
        y0, y1 = [fn(ends[0])*(1-mid) + fn(ends[1])*mid for fn in (min, max)]
        record([lo[0], y0, lo[2]*(1-a)+hi[2]*a], [hi[0], y1, lo[2]*(1-b)+hi[2]*b])
(root/'src/home/ninglu-collision.json').write_text('[\n' + ',\n'.join(json.dumps(b,separators=(',', ':')) for b in boxes) + '\n]\n',encoding='utf-8')
shutil.copyfile(assets/'凝露小院.glb', root/'public/models/companions/ninglu-courtyard.glb')
print(len(nodes), 'authored colliders converted into', len(boxes), 'indexed boxes')
