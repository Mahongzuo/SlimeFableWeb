"""Rebuild ocean art from threejs-water-pro/models. Requires numpy, scipy and DracoPy."""
import argparse
import json
import shutil
import struct
from pathlib import Path

import DracoPy
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

parser = argparse.ArgumentParser()
parser.add_argument('models', type=Path)
src = parser.parse_args().models
out = Path(__file__).resolve().parents[1] / 'public/ocean/models'
out.mkdir(exist_ok=True, parents=True)


def read(name):
    data = (src / (name + '.glb')).read_bytes()
    size = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20 + size]), data[28 + size:]


def view(doc, data, index):
    item = doc['bufferViews'][index]
    start = item.get('byteOffset', 0)
    return data[start:start + item['byteLength']]


def add_view(doc, data, value):
    data.extend(bytes(-len(data) % 4))
    doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(data), 'byteLength': len(value)})
    data.extend(value)
    return len(doc['bufferViews']) - 1


def decode(doc, data, prim):
    ext = prim['extensions']['KHR_draco_mesh_compression']
    m = DracoPy.decode(view(doc, data, ext['bufferView']))
    attrs = {key: m.get_attribute_by_unique_id(i)['data'] for key, i in ext['attributes'].items()}
    return m.faces, attrs


def write(name, doc, data):
    doc['buffers'] = [{'byteLength': len(data)}]
    header = json.dumps(doc, separators=(',', ':')).encode()
    header += b' ' * (-len(header) % 4)
    data.extend(bytes(-len(data) % 4))
    (out / (name + '.glb')).write_bytes(struct.pack('<4sIIII', b'glTF', 2, 28 + len(header) + len(data), len(header), 0x4e4f534a)
                                       + header + struct.pack('<II', len(data), 0x004e4942) + data)


# Keep the skin, animation channels, node transforms and embedded PBR images intact.
for name in ['fish', 'grass', 'seaweed', 'seaweed_tall']:
    doc, source = read(name)
    data = bytearray(source)
    for mesh in doc['meshes']:
        for prim in mesh['primitives']:
            faces, attrs = decode(doc, source, prim)
            for i, array in [(prim['indices'], faces)] + [(prim['attributes'][k], v) for k, v in attrs.items()]:
                acc = doc['accessors'][i]
                dtype = {5123: '<u2', 5126: '<f4', 5125: '<u4', 5121: 'u1'}[acc['componentType']]
                acc['bufferView'] = add_view(doc, data, array.astype(dtype).tobytes())
            del prim['extensions']['KHR_draco_mesh_compression']
    for key in ['extensionsRequired', 'extensionsUsed']:
        doc[key].remove('KHR_draco_mesh_compression')
    write(name, doc, data)
shutil.copyfile(src / 'rocks.glb', out / 'rocks.glb')


def component_labels(pos, triangles):
    _, welded = np.unique(np.round(pos, 3), axis=0, return_inverse=True)
    edges = welded[triangles]
    graph = coo_matrix((np.ones(edges.size), (edges.ravel(), edges[:, [1, 2, 0]].ravel())), shape=(welded.max()+1,)*2)
    return connected_components(graph, directed=False)[1][welded]


island, source = read('island')
doc = {k: island[k] for k in ['asset', 'textures', 'samplers', 'materials', 'extensionsUsed', 'extensionsRequired']}
for key in ['extensionsUsed', 'extensionsRequired']:
    doc[key].remove('KHR_draco_mesh_compression')
doc.update(bufferViews=[], accessors=[], scenes=[{'nodes': []}], scene=0, nodes=[], meshes=[], images=[])
data = bytearray()
for image in island['images']:
    pixels = view(island, source, image['bufferView'])
    doc['images'].append({**image, 'bufferView': add_view(doc, data, pixels)})
    if image['name'].startswith('Ground054'):
        (out / ('island-normal.jpg' if 'Normal' in image['name'] else 'island-sand.jpg')).write_bytes(pixels)


def pieces(prim):
    faces, attrs = decode(island, source, prim)
    labels = component_labels(attrs['POSITION'], faces)
    groups = []
    for label in np.unique(labels):
        tri = faces[labels[faces[:, 0]] == label]
        verts, indices = np.unique(tri, return_inverse=True)
        groups.append((prim['material'], indices.ravel(), {k: v[verts].copy() for k, v in attrs.items()}))
    return groups


# Sample the visible top of each rock into the same unit coordinates as its export.
# Heights are quantized in thousandths of the outcrop width; -1 is open sand.
profiles = []
supports = {}
resolution = 49


def rock_profile(points, faces):
    heights = np.full((resolution, resolution), -1, dtype=np.int32)
    for p, q, r in points[faces.reshape(-1, 3)]:
        v = q-p
        w = r-p
        det = v[0]*w[2] - w[0]*v[2]
        if abs(det) < 1e-9:
            continue
        lo = np.maximum(0, np.ceil((np.minimum(np.minimum(p,q),r)[[0,2]]+.5)*(resolution-1)).astype(int))
        hi = np.minimum(resolution-1, np.floor((np.maximum(np.maximum(p,q),r)[[0,2]]+.5)*(resolution-1)).astype(int))
        for iz in range(lo[1], hi[1]+1):
            for ix in range(lo[0], hi[0]+1):
                dx, dz = ix/(resolution-1)-.5-p[0], iz/(resolution-1)-.5-p[2]
                u, t = (dx*w[2] - dz*w[0])/det, (dz*v[0] - dx*v[2])/det
                if u >= 0 and t >= 0 and u+t <= 1:
                    heights[iz, ix] = max(heights[iz, ix], round(1000*(p[1]+u*v[1]+t*w[1])))
    return heights.ravel().tolist()


def cut_base(group, level):
    mat, faces, attrs = group
    pos = attrs['POSITION']
    faces = faces.reshape(-1, 3)
    inside = pos[:, 2] >= level
    kept = faces[inside[faces].all(1)].ravel().tolist()
    extra = {k: [] for k in attrs}
    edges = {}

    def crossing(a, b):
        edge = tuple(sorted((a, b)))
        if edge not in edges:
            edges[edge] = len(pos) + len(edges)
            t = (level-pos[a, 2])/(pos[b, 2]-pos[a, 2])
            for k, v in attrs.items():
                extra[k].append(v[a]+t*(v[b]-v[a]))
        return edges[edge]

    for tri in faces[inside[faces].any(1) & ~inside[faces].all(1)]:
        loop = []
        for a,b in zip(tri, np.roll(tri,-1)):
            if inside[a]:
                loop.append(a)
            if inside[a] != inside[b]:
                loop.append(crossing(a,b))
        for j in range(1,len(loop)-1):
            kept.extend([loop[0],loop[j],loop[j+1]])
    if not kept:
        return None
    verts, indices = np.unique(kept,return_inverse=True)
    return mat, indices.ravel(), {k:(np.vstack([v,extra[k]]) if extra[k] else v)[verts] for k,v in attrs.items()}


def add_asset(name, groups):
    positions = np.concatenate([attrs['POSITION'] for _, _, attrs in groups])
    low, high = positions.min(0), positions.max(0)
    if name.startswith(('palm','outcrop')):
        level = low[2] + (high[2]-low[2]) * (.052 if name.startswith('palm') else .22)
        groups = [cut for g in groups if (cut := cut_base(g, level)) is not None]
        positions = np.vstack([a['POSITION'] for _,_,a in groups])
        low, high = positions.min(0), positions.max(0)
    base = positions[positions[:,2] <= low[2]+.0005]
    origin = (low + high) * .5
    if name.startswith('palm'):
        origin[:2] = np.median(base[:,:2],axis=0)
    origin[2] = low[2]
    # All specimens have unit height (plants) or width (rock outcrops) and a base at y=0.
    dimension = max((high-low)[:2]) if name.startswith('outcrop') else (high-low)[2]
    rim = (base[:,:2]-origin[:2])/dimension
    rim[:,1] *= -1
    supports[name] = {'rim':np.unique(np.round(rim,4),axis=0).tolist(), 'height':float((high[2]-low[2])/dimension)}
    primitives = []
    for mat in sorted(set(g[0] for g in groups)):
        arrays, indices, offset = {}, [], 0
        for material, faces, attrs in groups:
            if material != mat:
                continue
            indices.extend(faces + offset)
            offset += len(attrs['POSITION'])
            for k, values in attrs.items():
                if k in ('POSITION', 'NORMAL'):
                    if k == 'POSITION':
                        values = (values - origin) / dimension
                    values = values[:, [0, 2, 1]].copy()
                    values[:, 2] *= -1
                arrays.setdefault(k, []).append(values)
        attributes = {}
        if name.startswith('outcrop'):
            profiles.append(rock_profile(np.concatenate(arrays['POSITION']), np.asarray(indices)))
        for k, values in arrays.items():
            arr = np.concatenate(values).astype('<f4')
            acc = dict(type='VEC'+str(arr.shape[1]), componentType=5126, count=len(arr), bufferView=add_view(doc, data, arr.tobytes()))
            if k == 'POSITION':
                acc.update(min=arr.min(0).tolist(), max=arr.max(0).tolist())
            attributes[k] = len(doc['accessors'])
            doc['accessors'].append(acc)
        idx = len(doc['accessors'])
        doc['accessors'].append(dict(componentType=5123,type='SCALAR',count=len(indices),bufferView=add_view(doc,data,np.asarray(indices,dtype='<u2').tobytes())))
        primitives.append(dict(attributes=attributes,indices=idx,material=mat))
    doc['scenes'][0]['nodes'].append(len(doc['nodes']))
    doc['nodes'].append(dict(name=name,mesh=len(doc['meshes'])))
    doc['meshes'].append(dict(name=name,primitives=primitives))


trunks, fronds = [pieces(p) for p in island['meshes'][5]['primitives']]
stems = [g for g in trunks if np.ptp(g[2]['POSITION'][:, 2]) > 3]
crowns = np.array([p[p[:, 2] > p[:, 2].max() - .25].mean(0) for _, _, a in stems for p in [a['POSITION']]])
trees = [[] for _ in stems]
for g in trunks + fronds:
    p = g[2]['POSITION']
    near = ((p[:, None, :] - crowns) ** 2).sum(2).min(0).argmin()
    trees[near].append(g)
for i, tree in enumerate(trees):
    add_asset('palm'+str(i), tree)
for i, g in enumerate(pieces(island['meshes'][4]['primitives'][0]) + pieces(island['meshes'][6]['primitives'][0])):
    add_asset('outcrop'+str(i), [g])
for i in range(3):
    clusters = pieces(island['meshes'][i]['primitives'][0])
    center = max(clusters, key=lambda g: len(g[1]))[2]['POSITION'].mean(0)
    add_asset('shrub'+str(i), [g for g in clusters if np.linalg.norm(g[2]['POSITION'].mean(0)[:2] - center[:2]) < 1.2])
write('island-specimens', doc, data)

(out.parents[2] / 'src/home/island-rock-profiles.json').write_text(
    json.dumps({'resolution': resolution, 'heights': profiles}, separators=(',', ':')), encoding='utf8')

(out.parents[2] / 'src/home/island-supports.json').write_text(json.dumps(supports,separators=(',',':')),encoding='utf8')

# The coastal renderer recenters each original boulder to a [-1,1] box.
rocks, buffer = read('rocks')
coastal = []
for node in rocks['nodes']:
    if 'mesh' not in node:
        continue
    prim = rocks['meshes'][node['mesh']]['primitives'][0]
    acc = rocks['accessors'][prim['attributes']['POSITION']]
    buf = rocks['bufferViews'][acc['bufferView']]
    points = np.ndarray((acc['count'],3),dtype='<f4',buffer=buffer,
                        offset=buf.get('byteOffset',0)+acc.get('byteOffset',0),
                        strides=(buf.get('byteStride',12),4))
    unit = (points-points.min(0))/np.ptp(points,axis=0)*2-1
    lower = unit[unit[:,1]<-.30]
    coastal.append(np.unique(lower.round(4),axis=0).tolist())
(out.parents[2]/'src/home/coast-rock-supports.json').write_text(json.dumps(coastal,separators=(',',':')),encoding='utf8')
