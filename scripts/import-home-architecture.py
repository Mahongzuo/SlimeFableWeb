"""Build local Y-up GLBs from Vinish's CC BY 4.0 architectural models.
Run with Python, NumPy and Pillow. Downloads are cached outside the repository.
"""

import io
import copy
import json
import struct
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from collections import defaultdict
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/models/architecture"
CACHE = Path(tempfile.gettempdir()) / "slimefable-home-buildings"
SOURCES = {
    "build-thatch": "cottages-and-cabins/thatched-cottage",
    "build-moon-gate": "chinese-buildings/moon-gate-garden-wall",
    "pack-pavilion": "chinese-buildings/hexagonal-garden-pavilion",
    "build-huizhou": "chinese-buildings/water-town-house",
    "build-teahall": "chinese-buildings/chinese-teahouse",
    "pasture-shelter": "farm-buildings/cattle-shelter",
    "pack-greenhouse": "farm-buildings/polytunnel",
    "waterside-stilt-house": "chinese-buildings/stilt-house",
    "build-covered-bridge": "chinese-buildings/chinese-teahouse",
    "watermill": "windmills-and-watermills/timber-watermill",
    "pack-windmill": "windmills-and-watermills/smock-mill",
    "build-lighthouse": "lighthouses/red-and-white-lighthouse",
    "build-red-pagoda": "japanese-buildings/five-story-pagoda",
}
# Calibrate source landmarks to the existing metre-scale collision surfaces.
# Each pair is a source coordinate and its game counterpart.
AXES = {
    "build-thatch": [
        [(-5.05, -2.51), (5.05, 2.51)],
        [(0, 0), (3.45, 1.91), (6.3, 3.87), (7.3, 4.42)],
        [(-3.3, -2.13), (3.3, 2.13)],
    ],
    "build-moon-gate": [
        [(-6.5, -3.005), (-1.4, -1.15), (1.4, 1.15), (6.5, 3.005)],
        [(0, 0), (2.8, 2.14), (3.1, 2.46), (4.4, 3.02)],
        [(-0.5, -0.46), (0.5, 0.46)],
    ],
    "pack-pavilion": [
        [(-3.4, -2.445), (3.4, 2.445)],
        [(0, 0), (0.42, 0.365), (3.0, 2.60), (5.3, 3.85), (6, 4.18)],
        [(-3, -2.16), (3.1, 2.25)],
    ],
    "build-huizhou": [
        [(-7, -2.60), (7, 2.60)],
        [(0, 0), (1, 0.19), (6.40, 2.84), (9, 4.14)],
        [(-5.3, -2.1), (3, 2.12), (5.2, 2.34)],
    ],
    "build-teahall": [
        [(-6.7, -2.98), (6.7, 2.98)],
        [(0, 0), (0.42, 0.24), (6.5, 2.68), (9.9, 3.57), (10.9, 3.78)],
        [(-6.1, -2.34), (-3.6, -1.95), (3.5, 0.8), (4.7, 1.57), (6.1, 2.50)],
    ],
    "pasture-shelter": [
        [(-6.3, -2.19), (6.3, 2.19)],
        [(0, 0), (3.6, 1.96), (5.2, 3.06)],
        [(-6.4, -1.57), (6.4, 1.57)],
    ],
    "pack-greenhouse": [
        [(-2.8, -2.35), (2.8, 2.35)],
        [(0, 0), (1.9, 2.43), (3, 3.48)],
        [(-6.1, -1.85), (6.1, 2.15)],
    ],
    "waterside-stilt-house": [
        [(-5.1, -2.396), (5.1, 2.396)],
        [(0, 0), (2.6, 0.91), (7.8, 2.37), (11.6, 3.76)],
        [(-4.7, -1.8), (4.7, 1.87)],
    ],
    "build-covered-bridge": [
        [(-6.7, -3.43), (6.7, 3.43)],
        [(6.48, 2.55), (9.9, 3.38), (10.9, 3.55)],
        [(-6.1, -1.43), (6.1, 1.43)],
    ],
    "watermill": [
        [(-3.92, -2.42), (3.50, 1.44), (5.80, 2.42)],
        [(0, 0), (2.30, 1.17), (5.3, 2.48), (8.6, 3.73)],
        [(-3.5, -1.82), (4.90, 1.82)],
    ],
    "pack-windmill": [
        [(-6.3, -2.515), (6.3, 2.515)],
        [(0, 0), (3.9, 1.55), (12.5, 3.70), (18.8, 6.22)],
        [(-5.6, -1.9), (3.4, 1.55)],
    ],
    "build-lighthouse": [
        [(-3.1, -1.74), (3.1, 1.74)],
        [(0, 0), (11, 3.68), (14.2, 4.89), (17.3, 6.11)],
        [(-3.1, -1.74), (3.1, 1.74)],
    ],
    "build-red-pagoda": [
        [(-4.25, -2.05), (4.25, 2.05)],
        [(0, 0), (1, 0.32), (14.2, 4.47), (20.6, 5.96)],
        [(-4.2, -2.05), (4.2, 2.05), (5.2, 2.11)],
    ],
}
TYPES = {5120: "i1", 5121: "u1", 5122: "<i2", 5123: "<u2", 5125: "<u4", 5126: "<f4"}
WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


class Source:
    def __init__(self, path):
        data = path.read_bytes()
        n = struct.unpack_from("<I", data, 12)[0]
        self.j = json.loads(data[20 : 20 + n])
        self.bin = data[28 + n :]

    def array(self, i):
        a = self.j["accessors"][i]
        view = self.j["bufferViews"][a["bufferView"]]
        dtype = np.dtype(TYPES[a["componentType"]])
        width = WIDTH[a["type"]]
        data = np.ndarray(
            (a["count"], width),
            dtype,
            buffer=self.bin,
            offset=view.get("byteOffset", 0) + a.get("byteOffset", 0),
            strides=(view.get("byteStride", width * dtype.itemsize), dtype.itemsize),
        ).copy()
        return data.astype(float) / np.iinfo(dtype).max if a.get("normalized") else data

    def jpeg(self, texture):
        from PIL import Image

        img = self.j["images"][self.j["textures"][texture]["source"]]
        view = self.j["bufferViews"][img["bufferView"]]
        offset = view.get("byteOffset", 0)
        im = Image.open(
            io.BytesIO(self.bin[offset : offset + view["byteLength"]])
        ).convert("RGB")
        im.thumbnail((512, 512), Image.Resampling.LANCZOS)
        dst = io.BytesIO()
        im.save(dst, "JPEG", quality=87, optimize=True)
        return dst.getvalue()


def source(key):
    path = CACHE / (key.split("/")[-1] + ".glb")
    if not path.exists():
        urllib.request.urlretrieve("https://models.vinish.dev/" + key + ".glb", path)
    return Source(path)


def transform(p, axes):
    out = np.empty_like(p, dtype=float)
    for i, pairs in enumerate(axes):
        x, y = np.asarray(pairs).T
        k = np.clip(np.searchsorted(x, p[:, i]) - 1, 0, len(x) - 2)
        out[:, i] = y[k] + (p[:, i] - x[k]) * (y[k + 1] - y[k]) / (x[k + 1] - x[k])
    return out


class Model:
    def __init__(self, key):
        self.key = key
        self.bin = bytearray()
        self.j = {
            "asset": {
                "version": "2.0",
                "generator": "SlimeFable architectural adaptation",
                "copyright": "vinish.dev, CC BY 4.0. See CREDITS.md.",
            },
            "scene": 0,
            "scenes": [{"nodes": []}],
            "nodes": [],
            "meshes": [],
            "materials": [],
            "accessors": [],
            "bufferViews": [],
        }
        self.images = {}
        self.mats = {}

    def view(self, b):
        self.bin.extend(b"\0" * (-len(self.bin) % 4))
        idx = len(self.j["bufferViews"])
        self.j["bufferViews"].append(
            {"buffer": 0, "byteOffset": len(self.bin), "byteLength": len(b)}
        )
        self.bin.extend(b)
        return idx

    def attr(self, data, code, kind, normalized=False, bounds=False):
        data = np.asarray(data, dtype=TYPES[code])
        a = {
            "bufferView": self.view(data.tobytes()),
            "componentType": code,
            "count": len(data),
            "type": kind,
        }
        if bounds:
            a.update(
                min=data.reshape(len(data), -1).min(0).tolist(),
                max=data.reshape(len(data), -1).max(0).tolist(),
            )
        if normalized:
            a["normalized"] = True
        self.j["accessors"].append(a)
        return len(self.j["accessors"]) - 1

    def mat(self, img, alpha):
        key = (img, alpha)
        if key in self.mats:
            return self.mats[key]
        pbr = {"roughnessFactor": 0.87, "metallicFactor": 0}
        m = {"pbrMetallicRoughness": pbr, "doubleSided": True}
        if img:
            if img not in self.images:
                i = len(self.images)
                self.images[img] = i
                self.j.setdefault("images", []).append(
                    {"bufferView": self.view(img), "mimeType": "image/jpeg"}
                )
                self.j.setdefault("textures", []).append({"source": i})
            pbr["baseColorTexture"] = {"index": self.images[img]}
        if alpha < 1:
            m["alphaMode"] = "BLEND"
            pbr["baseColorFactor"] = [1, 1, 1, alpha]
        self.mats[key] = len(self.j["materials"])
        self.j["materials"].append(m)
        return self.mats[key]

    def node(self, name, batches, pivot):
        primitives = []
        for material, parts in batches.items():
            attrs = np.concatenate([v for v, _ in parts])
            indices = np.concatenate(
                [
                    f + offset
                    for (_, f), offset in zip(
                        parts, np.cumsum([0] + [len(v) for v, _ in parts[:-1]])
                    )
                ]
            ).flatten()
            # Welding across the author's repeated primitive seams reduces payload
            # while keeping hard normals and UV splits at the tiled eaves.
            attrs, remap = np.unique(np.round(attrs, 6), axis=0, return_inverse=True)
            indices = remap[indices]
            pos, norm, uv, col = np.split(attrs, [3, 6, 8], axis=1)
            at = {
                "POSITION": self.attr(pos, 5126, "VEC3", bounds=True),
                "NORMAL": self.attr(norm, 5126, "VEC3"),
                "COLOR_0": self.attr(
                    np.column_stack((np.clip(col, 0, 1), np.ones(len(col)))) * 65535,
                    5123,
                    "VEC4",
                    True,
                ),
            }
            if (
                "baseColorTexture"
                in self.j["materials"][material]["pbrMetallicRoughness"]
            ):
                at["TEXCOORD_0"] = self.attr(uv, 5126, "VEC2")
            primitives.append(
                {
                    "attributes": at,
                    "indices": self.attr(
                        indices, 5123 if len(pos) <= 65535 else 5125, "SCALAR"
                    ),
                    "material": material,
                }
            )
        idx = len(self.j["nodes"])
        self.j["scenes"][0]["nodes"].append(idx)
        self.j["nodes"].append(
            {"name": name, "mesh": len(self.j["meshes"]), "translation": list(pivot)}
        )
        self.j["meshes"].append({"primitives": primitives})
        if name in ("Sails", "Wheel"):
            axis = 2 if name == "Sails" else 0
            q = np.zeros((5, 4))
            angles = np.arange(5) * np.pi / 4
            q[:, axis] = np.sin(angles)
            q[:, 3] = np.cos(angles)
            t = self.attr(
                np.linspace(0, 12 if axis == 2 else 9, 5), 5126, "SCALAR", bounds=True
            )
            self.j["animations"] = [
                {
                    "name": "Turn",
                    "samplers": [
                        {
                            "input": t,
                            "output": self.attr(q, 5126, "VEC4"),
                            "interpolation": "LINEAR",
                        }
                    ],
                    "channels": [
                        {"sampler": 0, "target": {"node": idx, "path": "rotation"}}
                    ],
                }
            ]

    def save(self):
        self.bin.extend(b"\0" * (-len(self.bin) % 4))
        self.j["buffers"] = [{"byteLength": len(self.bin)}]
        j = json.dumps(self.j, separators=(",", ":")).encode()
        j += b" " * (-len(j) % 4)
        data = (
            struct.pack("<4sII", "glTF".encode(), 2, 28 + len(j) + len(self.bin))
            + struct.pack("<I4s", len(j), b"JSON")
            + j
            + struct.pack("<I4s", len(self.bin), b"BIN\0")
            + self.bin
        )
        (OUT / (self.key + ".glb")).write_bytes(data)


def allowed(key, mat, center):
    if key == "build-thatch":
        return (
            (abs(center[:, 0]) < 5.1)
            & (abs(center[:, 2]) < 3.36)
            & (mat not in ("Plant", "Bark", "Leaves"))
        )
    if key == "build-moon-gate":
        return mat not in ("Stone", "Stone_Light", "Leaf", "Bamboo")
    if key == "build-covered-bridge":
        return mat in ("Roof_Grey", "Ridge", "Rafter")
    if key == "build-huizhou":
        return (mat != "Water") & ((mat != "Stone") | (center[:, 2] < 3.0))
    if key == "watermill":
        return mat not in ("Water", "Stone", "Stone_Dark")
    if key == "pack-greenhouse" and mat in ("Poly", "Wood_Fence"):
        # Remove the closed door leaf in front of the fixed timber jambs.
        return center[:, 2] < 6.025
    if key == "pasture-shelter":
        if mat in ("Concrete", "Hay"):
            return center[:, 2] < 5.45
        if mat == "Steel_Frame":
            return (center[:, 2] < 5.98) | (center[:, 1] > 1.4)
    return True


def bridge_supports(world, faces):
    # Keep whole connected timbers, including the caps above the cut line.
    # The original hard normals split the vertices along each beam's edges.
    _, welded = np.unique(np.round(world, 5), axis=0, return_inverse=True)
    corners = welded[faces]
    keep = world[faces][:, :, 1].min(1) < 2.42
    while True:
        grown = np.isin(corners, corners[keep]).any(1)
        if np.array_equal(keep, grown):
            return keep
        keep = grown


def import_mesh(model, src, bridge_frame=False):
    key = model.key
    axes = AXES[key]
    cache = {}

    def visit(index, parent):
        node = src.j["nodes"][index]
        assert not any(
            k in node for k in ("matrix", "rotation", "scale")
        ), "Review source coordinate system"
        off = parent + node.get("translation", [0, 0, 0])
        batches = defaultdict(list)
        name = node.get("name", key)
        moving = name in ("Wheel", "Sails")
        pivot = transform(off.reshape(1, 3), axes)[0] if moving else np.zeros(3)
        for pr in src.j["meshes"][node["mesh"]]["primitives"]:
            a = pr["attributes"]
            pos = src.array(a["POSITION"]).astype(float)
            faces = src.array(pr["indices"]).reshape(-1, 3)
            mat = src.j["materials"][pr.get("material", 0)]
            label = mat.get("name", "")
            world = pos + off
            mask = (
                bridge_supports(world, faces)
                if bridge_frame
                else allowed(key, label, world[faces].mean(1))
            )
            if not np.isscalar(mask):
                faces = faces[mask]
            elif not mask:
                continue
            if not len(faces):
                continue
            used, faces = np.unique(faces.reshape(-1), return_inverse=True)
            faces = faces.reshape(-1, 3)
            pos = pos[used]
            world = world[used]
            normals = src.array(a["NORMAL"])[used].astype(float)
            if moving:
                # Circular wheels and sails turn about their original, undistorted axes.
                scale = (
                    np.array([0.42, 0.50, 0.50])
                    if name == "Wheel"
                    else np.array([0.399, 0.399, 0.39])
                )
                p = pos * scale
                normals /= scale
            elif bridge_frame:
                p = world.copy()
                collars = p[:, 1] > 2.42
                p[collars, 1] = 2.42 + (p[collars, 1] - 2.42) * 0.72
                normals[collars, 1] /= 0.72
            else:
                p = transform(world, axes)
                for axis, pairs in enumerate(axes):
                    x, y = np.asarray(pairs).T
                    k = np.clip(np.searchsorted(x, world[:, axis]) - 1, 0, len(x) - 2)
                    normals[:, axis] /= (y[k + 1] - y[k]) / (x[k + 1] - x[k])
            normals /= np.maximum(1e-8, np.linalg.norm(normals, axis=1, keepdims=True))
            pbr = mat.get("pbrMetallicRoughness", {})
            factor = pbr.get("baseColorFactor", [1, 1, 1, 1])
            alpha = factor[3] if mat.get("alphaMode") == "BLEND" else 1.0
            uv = (
                src.array(a["TEXCOORD_0"])[used]
                if "TEXCOORD_0" in a
                else np.zeros((len(used), 2))
            )
            col = np.tile(factor[:3], (len(used), 1)).astype(float)
            if "COLOR_0" in a:
                col *= src.array(a["COLOR_0"])[used, :3]
            img = None
            if "baseColorTexture" in pbr:
                tex = pbr["baseColorTexture"]["index"]
                if tex not in cache:
                    cache[tex] = src.jpeg(tex)
                img = cache[tex]
            if key == "build-red-pagoda" and label in ("Vermilion", "Wood_Dark"):
                col *= np.array([1.32, 0.72, 0.58])
            if key == "pack-windmill":
                if label == "Weather":
                    col *= [0.42, 0.33, 0.23]
                if label == "Paint_White" and moving:
                    col *= [0.40, 0.29, 0.18]
                if label == "Canvas":
                    col *= [0.88, 0.84, 0.71]
            if key == "pack-greenhouse" and label == "Poly":
                col[:] = [0.56, 0.82, 0.83]
                alpha = 0.29
            if bridge_frame:
                img = (OUT / "timber.jpg").read_bytes()
                # Grain runs along the bridge boards, upright on the posts.
                uv = np.stack(
                    (
                        world[:, 0] * 0.75,
                        np.where(abs(normals[:, 1]) > 0.55, world[:, 2], world[:, 1])
                        * 0.75,
                    ),
                    1,
                )
                col = np.clip(col * 0.68 + 0.27, 0, 1)
            batches[model.mat(img, alpha)].append(
                (np.column_stack((p, normals, uv, col)), faces)
            )
        if batches:
            model.node(name if moving else key + "-" + name, batches, pivot)
        for child in node.get("children", []):
            visit(child, off)

    for idx in src.j["scenes"][0]["nodes"]:
        visit(idx, np.zeros(3))


def material_image(src, name):
    mat = next(m for m in src.j["materials"] if m["name"] == name)
    return src.jpeg(mat["pbrMetallicRoughness"]["baseColorTexture"]["index"])


def reduce_landmarks():
    import bpy

    # Run on the completed game-metre geometry so small fittings get reduced
    # together. Each import starts from a new background-only Blender scene.
    for key, ratio in [("build-red-pagoda", 0.42), ("pack-greenhouse", 0.61)]:
        path = str(OUT / (key + ".glb"))
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=path)
        for obj in list(bpy.context.scene.objects):
            if obj.type != "MESH":
                continue
            bpy.context.view_layer.objects.active = obj
            mod = obj.modifiers.new("Architectural detail budget", "DECIMATE")
            mod.ratio = ratio
            mod.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.ops.export_scene.gltf(
            filepath=path,
            export_format="GLB",
            export_animations=False,
            export_copyright="vinish.dev, CC BY 4.0. See CREDITS.md.",
            export_yup=True,
        )


def compact_geometry(key):
    """Quantize in mesh space. Keep mill pivots in game metres for their animation."""
    src = Source(OUT / (key + ".glb"))
    dst = Model(key)
    dst.j = copy.deepcopy(src.j)
    dst.j.update(accessors=[], bufferViews=[])
    for field in ("extensionsUsed", "extensionsRequired"):
        dst.j.setdefault(field, []).append("KHR_mesh_quantization")
    for im in dst.j.get("images", []):
        v = src.j["bufferViews"][im["bufferView"]]
        off = v.get("byteOffset", 0)
        im["bufferView"] = dst.view(src.bin[off : off + v["byteLength"]])

    def packed(v, component, bounds=False):
        # glTF requires a four-byte-aligned stride for vertex attributes.
        padded = np.column_stack((v, np.zeros(len(v)))).astype(TYPES[component])
        view = dst.view(padded.tobytes())
        dst.j["bufferViews"][view]["byteStride"] = padded.strides[0]
        a = {
            "bufferView": view,
            "count": len(v),
            "type": "VEC3",
            "componentType": component,
            "normalized": True,
        }
        if bounds:
            a.update(
                min=v.min(0).astype(int).tolist(), max=v.max(0).astype(int).tolist()
            )
        dst.j["accessors"].append(a)
        return len(dst.j["accessors"]) - 1

    def raw(i):
        a = src.j["accessors"][i]
        return dst.attr(src.array(i), a["componentType"], a["type"], bounds="min" in a)

    for mi, mesh in enumerate(dst.j["meshes"]):
        primitives = mesh["primitives"]
        extent = (
            max(
                float(abs(src.array(pr["attributes"]["POSITION"])).max())
                for pr in primitives
            )
            or 1.0
        )
        for node in dst.j["nodes"]:
            if node.get("mesh") == mi:
                assert not node.get("children") and "matrix" not in node
                node["scale"] = (
                    np.asarray(node.get("scale", [1, 1, 1])) * extent
                ).tolist()
        for pr in primitives:
            attrs = pr["attributes"]
            attrs["POSITION"] = packed(
                np.rint(src.array(attrs["POSITION"]) / extent * 32767), 5122, True
            )
            attrs["NORMAL"] = packed(
                np.rint(np.clip(src.array(attrs["NORMAL"]), -1, 1) * 127), 5120
            )
            if "COLOR_0" in attrs:
                color = src.array(attrs["COLOR_0"])
                if np.allclose(color, 1):
                    del attrs["COLOR_0"]
                else:
                    if color.shape[1] == 3:
                        color = np.column_stack((color, np.ones(len(color))))
                    attrs["COLOR_0"] = dst.attr(
                        np.rint(np.clip(color, 0, 1) * 255), 5121, "VEC4", True
                    )
            if "TEXCOORD_0" in attrs:
                attrs["TEXCOORD_0"] = raw(attrs["TEXCOORD_0"])
            pr["indices"] = raw(pr["indices"])
    for anim in dst.j.get("animations", []):
        for sampler in anim["samplers"]:
            for field in ("input", "output"):
                sampler[field] = raw(sampler[field])
    dst.save()


def main():
    CACHE.mkdir(exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    products = [
        ("tiles", "chinese-buildings/chinese-teahouse", "Roof_Grey"),
        ("timber", "cottages-and-cabins/treehouse-cabin", "Deck"),
        ("cladding", "cottages-and-cabins/treehouse-cabin", "Cladding"),
        ("shingles", "farm-buildings/gambrel-barn", "Roof_Shingle"),
        ("boards", "farm-buildings/gambrel-barn", "Barn_Red"),
    ]
    for filename, key, material in products:
        (OUT / (filename + ".jpg")).write_bytes(material_image(source(key), material))
    for key, asset in SOURCES.items():
        model = Model(key)
        if key == "build-covered-bridge":
            import_mesh(
                model,
                Source(ROOT / "public/models/dreamworld/build-covered-bridge.glb"),
                True,
            )
        import_mesh(model, source(asset))
        model.save()
        print(key, (OUT / (key + ".glb")).stat().st_size, flush=True)
    blender = (
        os.environ.get("BLENDER_BIN")
        or shutil.which("blender")
        or "D:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
    )
    subprocess.run(
        [
            blender,
            "-b",
            "--factory-startup",
            "-t",
            "3",
            "--python-exit-code",
            "1",
            "--python",
            str(Path(__file__).resolve()),
            "--",
            "--reduce",
        ],
        check=True,
    )
    for key in SOURCES:
        compact_geometry(key)


if __name__ == "__main__":
    if "--reduce" in sys.argv:
        reduce_landmarks()
    else:
        main()
