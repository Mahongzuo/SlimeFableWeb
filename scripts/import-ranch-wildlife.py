"""Build licensed GLBs. Run with Python, passing the source directory and Blender executable.
Sources and expected filenames are recorded in public/models/ranch/NOTICE.md.
Blender runs with factory settings in its own process, without touching an open scene.
"""

import json
import math
import os
from pathlib import Path
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/models/ranch"
SOURCES = {
    "hare": "brown-hare",
    "fox": "fox",
    "snow-fox": "fox",
    "deer": "deer",
    "white-deer": "deer",
    "nine-deer": "deer",
    "crane": "white-stork",
    "pheasant": "rooster",
    "capybara": "Gamideo_cozy_animals/Capybara",
    "otter": "Gamideo_cozy_animals/Otter",
    "red-panda": "Gamideo_cozy_animals/RedPanda",
}


def blender_pass(folder):
    import bpy
    import bmesh
    from mathutils import Vector

    for kind in ("hare", "crane", "pheasant", "capybara", "otter", "red-panda", "fox"):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(folder / (SOURCES[kind] + ".glb")))
        obj = next(
            o
            for o in bpy.context.scene.objects
            if o.type == "MESH" and o.data.materials
        )
        mesh = obj.data
        if kind in ("pheasant", "crane"):
            # Rest-pose geometry and skin weights share the same space; classify feathers by joints.
            colors = mesh.color_attributes.active_color
            for poly in mesh.polygons:
                mat = mesh.materials[poly.material_index].name
                for loop_id in poly.loop_indices:
                    vertex = mesh.vertices[mesh.loops[loop_id].vertex_index]
                    x, y, z = obj.matrix_world @ vertex.co
                    joint = obj.vertex_groups[
                        max(vertex.groups, key=lambda g: g.weight).group
                    ].name
                    hue = bird_plumage(kind, mat, joint, x, y, z)
                    if hue:
                        colors.data[loop_id].color_srgb = (*[v / 255 for v in hue], 1)
            inv = obj.matrix_world.inverted()
            for v in mesh.vertices:
                x, y, z = obj.matrix_world @ v.co
                joint = obj.vertex_groups[
                    max(v.groups, key=lambda g: g.weight).group
                ].name
                if kind == "pheasant" and joint.startswith("Tail"):
                    extend = max(0, y - 0.14)
                    y += extend * 2.45
                    z = 0.19 + (z - 0.19) * 0.34 - extend * 0.23
                    x *= 0.8
                if kind == "crane" and joint.startswith(("Neck", "Head", "Jaw")):
                    z += max(0, z - 0.72) * 0.23
                v.co = inv @ Vector((x, y, z))
            if kind == "pheasant":
                # Turn the rooster comb into a swept golden crest; tuck the wattles against the jaw.
                verts = {
                    i
                    for f in mesh.polygons
                    if mesh.materials[f.material_index].name == "Comb"
                    for i in f.vertices
                }
                for i in verts:
                    x, y, z = obj.matrix_world @ mesh.vertices[i].co
                    if z > 0.49:
                        y += 0.025 + (z - 0.49) * 2.35
                        z = 0.51 + (z - 0.49) * 0.38
                        x *= 1.9
                    else:
                        z = 0.48 + (z - 0.48) * 0.13
                    mesh.vertices[i].co = inv @ Vector((x, y, z))
            else:
                bill = {
                    i
                    for f in mesh.polygons
                    if mesh.materials[f.material_index].name == "Beak"
                    for i in f.vertices
                }
                for i in bill:
                    x, y, z = obj.matrix_world @ mesh.vertices[i].co
                    y -= max(0, -y - 0.36) * 0.75
                    mesh.vertices[i].co = inv @ Vector((x, y, z))
        if kind in ("capybara", "otter", "red-panda", "fox"):
            # Reconnect UV-seam vertices before smoothing the imported low-poly shapes.
            bm = bmesh.new()
            bm.from_mesh(mesh)
            bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.00001)
            bm.to_mesh(mesh)
            bm.free()
            inv = obj.matrix_world.inverted()
            for v in mesh.vertices:
                x, y, z = obj.matrix_world @ v.co
                if kind == "capybara":
                    muzzle = min(1.0, max(0.0, (-y - 0.5) / 0.55))
                    x *= 1 + 0.17 * muzzle
                    y -= 0.13 * muzzle
                    z -= 0.07 * muzzle
                elif kind == "otter" and y > 0.3:
                    y += 0.24 * (y - 0.3)
                elif kind == "red-panda" and y > 0.35:
                    x *= 1.12
                    y += 0.12 * (y - 0.35)
                v.co = inv @ Vector((x, y, z))
            for poly in mesh.polygons:
                poly.use_smooth = True
            mod = obj.modifiers.new("Silhouette smoothing", "SUBSURF")
            mod.levels = 1
        else:
            mod = obj.modifiers.new("Web silhouette", "DECIMATE")
            mod.ratio = {"crane": 0.30, "pheasant": 0.36, "hare": 0.40}[kind]
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        if kind == "fox":
            # The sample fox uses flat facets and a palette texture. Add visible eyes and a nose
            # in bind space, weighted to the same head joint as the existing face.
            from mathutils.bvhtree import BVHTree

            tree = BVHTree.FromPolygons(
                [v.co.copy() for v in mesh.vertices],
                [tuple(p.vertices) for p in mesh.polygons],
            )
            joint = next(g.name for g in obj.vertex_groups if "Head" in g.name)
            eyes = []
            for sign in (-1, 1):
                point, normal, _, _ = tree.ray_cast(
                    Vector((sign * 30, -54.5, 63.0)), Vector((-sign, 0, 0))
                )
                if point:
                    eyes.append(
                        (point + normal * 0.22, (1.0, 1.7, 1.35), (0.039, 0.022, 0.014))
                    )
                    eyes.append(
                        (
                            point + normal * 0.97 + Vector((0, -0.35, 0.53)),
                            (0.32, 0.33, 0.34),
                            (0.96, 0.89, 0.69),
                        )
                    )
            eyes.append(
                (Vector((0, -65.3, 56.2)), (2.5, 1.8, 1.45), (0.042, 0.028, 0.021))
            )
            for center, scale, color in eyes:
                bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8)
                part = bpy.context.object
                for v in part.data.vertices:
                    v.co = Vector([center[i] + scale[i] * v.co[i] for i in range(3)])
                for f in part.data.polygons:
                    f.use_smooth = True
                part.data.materials.append(painted_material("Face detail", color))
                part.vertex_groups.new(name=joint).add(
                    list(range(len(part.data.vertices))), 1, "REPLACE"
                )
                obj.select_set(True)
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.join()
        if kind == "pheasant":
            add_tail_plumes(obj)
        bpy.ops.export_scene.gltf(
            filepath=str(folder / (kind + "-edited.glb")),
            export_format="GLB",
            export_animation_mode="NLA_TRACKS",
            export_yup=True,
            export_vertex_color="ACTIVE",
            export_force_sampling=True,
            export_anim_slide_to_zero=True,
        )


def bird_plumage(kind, mat, joint, x, y, z):
    if mat.startswith(("Eye_", "Claw")):
        return None
    grain = int(6 * math.sin(y * 214 + z * 30 + abs(x) * 22))
    if kind == "crane":
        if mat == "Leg":
            return (68, 62, 61)
        if mat == "Beak":
            return (151, 135, 91)
        if mat == "Feather" and (joint.startswith(("Prim", "Sec", "Ter", "Tail"))):
            return (47 + grain, 50 + grain, 58 + grain)
        if z > 1.02 and -0.366 < y < -0.275:
            return (188, 48, 40)
        if joint.startswith(("Neck", "Head", "Jaw")) and y < -0.20 and z > 0.76:
            return (237, 226, 199) if 0.965 < z < 1.012 and y > -0.33 else (49, 52, 55)
        return (237 + grain, 233 + grain, 217 + grain)
    if mat == "Comb" or z > 0.50 and joint in ("Head", "Neck3"):
        return (246, 192 + grain, 54)
    if mat == "Beak":
        return (207, 167, 92)
    if mat == "Leg":
        return (177, 141, 85)
    if joint.startswith("Tail"):
        stripe = math.cos(y * 162 + abs(x) * 72 + z * 18) > 0.42
        return (73, 49, 35) if stripe else (182 + grain, 125 + grain, 69 + grain)
    if joint.startswith(("Wing", "Prim", "Sec", "Ter")):
        return (
            (36, 74 + grain, 87 + grain) if mat == "Feather" else (45, 100 + grain, 76)
        )
    if joint.startswith(("Head", "Neck", "Jaw")):
        if z < 0.47 and math.sin(z * 200 + y * 32) < -0.48:
            return (48, 51, 57)
        return (232, 145 + grain, 47)
    return (192 + grain, 53 + grain, 39)


def add_tail_plumes(obj):
    """Lanceolate central rectrices. A curved vane each side of a raised rachis catches sidelight."""
    import bpy
    from mathutils import Vector

    points, faces, bands = [], [], []
    inverse = obj.matrix_world.inverted()
    for feather in range(7):
        offset = feather - 3
        for station in range(25):
            t = station / 24
            span = (0.022 + (3 - abs(offset)) * 0.002) * (
                0.08 + math.sin(math.pi * t) ** 0.68
            )
            length = 0.68 - abs(offset) * 0.066
            cx = offset * (0.006 + t * 0.014)
            y = 0.105 + t * length
            z = 0.205 + t * 0.105 - t * t * 0.13 + (3 - abs(offset)) * 0.002
            base = len(points)
            for side in (-1, 0, 1):
                points.append(
                    inverse
                    @ Vector((cx + side * span, y, z + (0.003 if side == 0 else 0)))
                )
            if station:
                for k in range(2):
                    faces.append((base - 3 + k, base - 2 + k, base + 1 + k, base + k))
                    bands.append(0 if (station + abs(offset)) % 4 else 1)
    mesh = bpy.data.meshes.new("Tail vanes")
    mesh.from_pydata(points, [], faces)
    plume = bpy.data.objects.new("Tail vanes", mesh)
    bpy.context.collection.objects.link(plume)
    for color in ((0.38, 0.16, 0.05), (0.088, 0.047, 0.026)):
        mesh.materials.append(painted_material("Tail ink", color))
    for poly, index in zip(mesh.polygons, bands):
        poly.material_index = index
    plume.vertex_groups.new(name="Tail").add(list(range(len(points))), 1, "REPLACE")
    bpy.ops.object.select_all(action="DESELECT")
    plume.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()


def painted_material(label, color):
    import bpy

    name = label + " " + "-".join(str(round(c * 255)) for c in color)
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (*color, 1)
        shader.inputs["Roughness"].default_value = 0.48
    return mat


class Glb:
    def __init__(self, path):
        raw = path.read_bytes()
        n = struct.unpack_from("<I", raw, 12)[0]
        self.doc = json.loads(raw[20 : 20 + n])
        self.bin = bytearray(raw[28 + n :])

    def append(self, data):
        self.bin.extend(b"\0" * (-len(self.bin) % 4))
        idx = len(self.doc["bufferViews"])
        self.doc["bufferViews"].append(
            {"buffer": 0, "byteOffset": len(self.bin), "byteLength": len(data)}
        )
        self.bin.extend(data)
        return idx

    def data(self, index):
        view = self.doc["bufferViews"][index]
        offset = view.get("byteOffset", 0)
        return self.bin[offset : offset + view["byteLength"]]

    def accessor(self, index):
        import numpy as np

        a = self.doc["accessors"][index]
        v = self.doc["bufferViews"][a["bufferView"]]
        return np.ndarray(
            (a["count"], {"VEC2": 2, "VEC3": 3}[a["type"]]),
            dtype="<f4",
            buffer=self.bin,
            offset=v.get("byteOffset", 0) + a.get("byteOffset", 0),
            strides=(v.get("byteStride", {"VEC2": 8, "VEC3": 12}[a["type"]]), 4),
        ).copy()

    def save(self, path):
        # Compact obsolete texture payloads as well as interleaved geometry.
        used = {a["bufferView"] for a in self.doc["accessors"] if "bufferView" in a}
        used.update(im["bufferView"] for im in self.doc.get("images", []))
        chunks = [self.data(i) for i in range(len(self.doc["bufferViews"]))]
        self.bin = bytearray()
        for idx, view in enumerate(self.doc["bufferViews"]):
            self.bin.extend(b"\0" * (-len(self.bin) % 4))
            view["byteOffset"] = len(self.bin)
            if idx in used:
                self.bin.extend(chunks[idx])
            else:
                self.bin.extend(b"\0" * 4)
                view["byteLength"] = 4
        self.doc["buffers"][0]["byteLength"] = len(self.bin)
        self.bin.extend(b"\0" * (-len(self.bin) % 4))
        js = json.dumps(self.doc, separators=(",", ":")).encode()
        js += b" " * (-len(js) % 4)
        path.write_bytes(
            struct.pack("<4sII", b"glTF", 2, 28 + len(js) + len(self.bin))
            + struct.pack("<I4s", len(js), b"JSON")
            + js
            + struct.pack("<I4s", len(self.bin), b"BIN\0")
            + self.bin
        )


def deer_coat(glb, kind):
    import copy, io
    import numpy as np
    from PIL import Image, ImageDraw

    doc = glb.doc
    palettes = {
        "deer": ("#ab6844", "#603b2f", "#fff1ce"),
        "white-deer": ("#f0e7cd", "#b6cbd0", "#fff9ea"),
        "nine-deer": ("#56a09b", "#355b6c", "#ffdfa0"),
    }
    base, dark, spot = palettes[kind]

    def rgb(hex):
        return np.array(list(bytes.fromhex(hex[1:])))

    w, h = 512, 320
    yy, xx = np.mgrid[0:h, 0:w]
    v = np.clip(
        (yy / h - 0.15) * 0.9
        + 0.10 * np.sin(xx / w * 3.14)
        + 0.027 * np.sin(yy * 1.8 + xx * 0.27),
        0,
        1,
    )[:, :, None]
    image = Image.fromarray(((1 - v) * rgb(dark) + v * rgb(base)).astype("uint8"))
    draw = ImageDraw.Draw(image)
    for row in range(3):
        for i in range(10 - row):
            x = int(55 + i * 32 + row * 10)
            y = int(158 + row * 33 + 12 * math.sin(i * 0.58 + row * 0.7))
            draw.ellipse((x - 7 + row, y - 6, x + 8, y + 6), fill=spot)
    if kind == "nine-deer":
        for i, color in enumerate(
            ("#df9770", "#d8bb71", "#639cae", "#d2a5ac", "#8abb9c")
        ):
            pts = [
                (x, 202 + i * 8 + int(math.sin(x / 56) * 22)) for x in range(35, 374)
            ]
            draw.line(pts, fill=color, width=4)
    buf = io.BytesIO()
    image.save(buf, "PNG", optimize=True)
    im = len(doc["images"])
    doc["images"].append(
        {"mimeType": "image/png", "bufferView": glb.append(buf.getvalue())}
    )
    tex = len(doc["textures"])
    doc["textures"].append({"source": im})
    mats = doc["materials"]

    def linear(hex):
        return [((n / 255 + 0.055) / 1.055) ** 2.4 for n in rgb(hex)] + [1]

    for m in mats:
        name = m["name"]
        if name in ("Fur_Deer", "Fur_Fawn"):
            m["pbrMetallicRoughness"]["baseColorFactor"] = linear(base)
        if name == "Antler" and kind != "deer":
            m["pbrMetallicRoughness"]["baseColorFactor"] = linear(
                "#b6ac91" if kind == "white-deer" else "#d6a256"
            )
    for mesh in doc["meshes"]:
        if mesh is not doc["meshes"][0]:
            continue
        for prim in mesh["primitives"]:
            if mats[prim["material"]]["name"] != "Fur_Deer":
                continue
            mat = copy.deepcopy(mats[prim["material"]])
            mat["name"] = "Painted flank"
            mat["pbrMetallicRoughness"].update(
                baseColorTexture={"index": tex, "texCoord": 1}, baseColorFactor=[1] * 4
            )
            prim["material"] = len(mats)
            mats.append(mat)
            pos = glb.accessor(prim["attributes"]["POSITION"])
            uv = (
                np.stack(
                    ((pos[:, 2] + 0.552) / 1.23, (1.367 - pos[:, 1]) / 0.76), axis=1
                )
                .clip(0.001, 0.999)
                .astype("<f4")
            )
            prim["attributes"]["TEXCOORD_1"] = len(doc["accessors"])
            doc["accessors"].append(
                {
                    "bufferView": glb.append(uv.tobytes()),
                    "componentType": 5126,
                    "count": len(uv),
                    "type": "VEC2",
                }
            )


def finish(folder):
    import io
    import numpy as np
    from PIL import Image, ImageEnhance

    OUT.mkdir(parents=True, exist_ok=True)
    for kind, source in SOURCES.items():
        edited = kind not in ("deer", "white-deer", "nine-deer")
        edited_kind = "fox" if kind == "snow-fox" else kind
        glb = Glb(folder / ((edited_kind + "-edited" if edited else source) + ".glb"))
        doc = glb.doc
        if kind in ("deer", "white-deer", "nine-deer"):
            deer_coat(glb, kind)
        for im in doc.get("images", []):
            img = Image.open(io.BytesIO(glb.data(im["bufferView"])))
            if kind == "snow-fox":
                a = np.asarray(img.convert("RGB")).astype(float)
                grey = a.mean(axis=2)
                mask = np.clip((a[:, :, 0] - a[:, :, 2] - 5) / 46, 0, 1) * np.clip(
                    (grey - 25) / 36, 0, 1
                )
                fur = np.minimum(255, 138 + grey * 0.66)[:, :, None] * np.array(
                    [0.94, 0.98, 1]
                )
                img = Image.fromarray(
                    np.uint8(a * (1 - mask[:, :, None]) + fur * mask[:, :, None])
                )
            if kind == "fox":
                a = np.asarray(img.convert("RGB")).astype(float)
                warm = np.clip((a[:, :, 0] - a[:, :, 2] - 10) / 65, 0, 1)[:, :, None]
                img = Image.fromarray(
                    np.uint8(a * (1 - warm) + a * np.array([0.86, 0.65, 0.62]) * warm)
                )
            if kind == "capybara":
                img = ImageEnhance.Color(img.convert("RGB")).enhance(0.79)
            if max(img.size) > 1024 or kind in ("capybara", "fox", "snow-fox"):
                img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                buf = io.BytesIO()
                img.convert("RGB").save(buf, "JPEG", quality=88)
                im.update(mimeType="image/jpeg", bufferView=glb.append(buf.getvalue()))
        scale = {
            "capybara": [1.02, 0.81, 1.12],
            "otter": [0.88, 0.75, 1.2],
            "red-panda": [1, 0.88, 1.10],
        }.get(kind)
        if scale:
            scene = doc["scenes"][doc.get("scene", 0)]
            doc["nodes"].append(
                {"name": "FieldProportions", "children": scene["nodes"], "scale": scale}
            )
            scene["nodes"] = [len(doc["nodes"]) - 1]
        clips = {a["name"].lower() for a in doc.get("animations", [])}
        if "walk" not in clips or not clips.intersection({"survey", "idle"}):
            raise ValueError((kind, clips))
        if kind in ("capybara", "otter", "red-panda"):
            credit = "Cozy Animals 3D Models by Gamideo, CC0. https://dragofive.itch.io/cozy-animals-3d"
        elif kind in ("fox", "snow-fox"):
            credit = "Fox by PixelMannen (CC0), tomkranis, Asobo Studio and scurest (CC BY 4.0). https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox"
        else:
            credit = "Original model by vinish.dev, CC BY 4.0. https://vinish.dev/free-3d-models/"
        doc["asset"]["copyright"] = (
            credit + " Adapted for SlimeFable Web. See NOTICE.md."
        )
        glb.save(OUT / (kind + ".glb"))
        print(kind, sorted(clips), flush=True)


if __name__ == "__main__":
    if "--" in sys.argv:
        blender_pass(Path(sys.argv[sys.argv.index("--") + 1]))
    else:
        import subprocess

        source = Path(sys.argv[1]).resolve()
        subprocess.run(
            [
                sys.argv[2],
                "-b",
                "-t",
                "4",
                "--factory-startup",
                "--python-exit-code",
                "1",
                "-P",
                __file__,
                "--",
                str(source),
            ],
            check=True,
        )
        finish(source)
