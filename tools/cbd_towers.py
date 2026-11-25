"""Curated architectural skyscraper importer, optimizer and night-lit instancer from H:\\appdata\\H\\cbd.zip."""
from __future__ import annotations

import hashlib
import io
import math
import os
import tempfile
import zipfile

import bmesh
import bpy
from mathutils import Euler, Matrix

import blib as B

CBD_ZIP = r"H:\appdata\H\cbd.zip"

# 9 curated distinct prototypes from H:\appdata\H\cbd.zip
SOURCES = {
    "meridian":       ("cbd/Waterfront-R2-Tower-Assets.zip", "01-Meridian-Spire.glb", "hero"),
    "crosswind":      ("cbd/Waterfront-R2-Tower-Assets.zip", "02-Crosswind.glb", "steel"),
    "boreal":         ("cbd/Waterfront-R2-Tower-Assets.zip", "04-Boreal.glb", "blue"),
    "harbor_gate":    ("cbd/Waterfront-R2-Tower-Assets.zip", "13-Harbor-Gate.glb", "stone"),
    "arc_crown":      ("cbd/CBD-Office-Tower-Assets.zip", "Buildings/01-Arc-Crown.glb", "blue"),
    "limestone":      ("cbd/CBD-Office-Tower-Assets.zip", "Buildings/02-Limestone-Frame.glb", "stone"),
    "glass_terraces": ("cbd/CBD-Office-Tower-Assets.zip", "Buildings/03-Glass-Terraces.glb", "blue"),
    "linked_spires":  ("cbd/CBD-Office-Tower-Assets.zip", "Buildings/05-Linked-Spires.glb", "blue"),
    "canted_prism":   ("cbd/CBD-Office-Tower-Assets.zip", "Buildings/06-Canted-Prism.glb", "pale"),
}

HERO_SLOTS = {
    1:  "canted_prism",    # (-38, -55, 24x22, 118m) West avenue
    2:  "limestone",       # (-72, -32, 28x24,  86m)
    3:  "boreal",          # (-40, -14, 22x20, 152m) West landmark
    4:  "limestone",       # (-96,   8, 30x28,  66m)
    5:  "arc_crown",       # (-38,  24, 22x22, 108m) West viaduct hero sail crown
    6:  "harbor_gate",     # (-108,-52, 30x28,  58m)
    7:  "glass_terraces",  # (-104, 32, 26x24,  78m)
    8:  "limestone",       # (-66,  34, 22x20,  92m)
    9:  "crosswind",       # ( 38, -62, 24x22, 138m) East avenue diagrid
    10: "glass_terraces",  # ( 72, -44, 30x26,  96m)
    11: "meridian",        # ( 40, -18, 24x22, 168m) East tallest supertall
    12: "arc_crown",       # ( 84,   4, 28x24,  78m) East curved ribbon tower
    13: "boreal",          # ( 38,  28, 24x22, 122m) East avenue river-side
    14: "harbor_gate",     # (112, -18, 30x28,  62m)
    15: "glass_terraces",  # (108,  32, 26x22,  76m)
    16: "canted_prism",    # ( 68,  30, 22x18,  96m)
    17: "arc_crown",       # ( 24, 104, 22x18,  46m)
    18: "canted_prism",    # ( 56, 112, 24x20,  58m)
    19: "limestone",       # (-56, 112, 26x20,  38m)
    20: "limestone",       # (-116,104, 26x22,  52m)
    21: "harbor_gate",     # ( 24,-112, 22x20,  42m)
    22: "linked_spires",   # (-34,-116, 26x22,  56m)
    23: "canted_prism",    # (120,  78, 24x22,  44m)
    24: "harbor_gate",     # (-124, 76, 24x22,  48m)
}

FAR_CYCLE = ("limestone", "canted_prism", "harbor_gate", "arc_crown", "glass_terraces")

LOBBY_Z_MAX = 11.5

_DROP_WHOLE_MESH_KEYS = (
    "paving |", "paving|", "plinth | paving",
    "horizontal silicone", "slender horizontal silicone",
    "office tower | horizontal floor", "offices | sparse workstations",
    "tower | interior slabs", "tower | occupied ceiling",
    "landmark | slab stack", "landmark | warm offices",
)

_DROP_ALWAYS_MAT_KEYS = (
    "shadow joints", "graphite facade joints", "slate gasket", "mineral joints",
    "pale oak furniture", "dark upholstery", "office furnishings", "家具",
)

_DROP_UPPER_INTERIOR_MAT_KEYS = (
    "concrete", "matte mineral ceiling", "off-white acoustic ceilings", "warm-grey carpet",
    "warm mineral panels", "楼板", "顶面", "3300 k", "3500k", "warm office",
    "办公灯", "商业间接光", "core ·",
)

_GLAZING_ALL_KEYS = (
    "vision glass", "blue-grey glazing", "建筑玻璃", "low-iron", "低铁玻璃",
    "entry doors", "clear laminated", "spandrel", "釉面玻璃", "釉面窗槛",
    "reflective screen", "solar glass",
)

_SPANDREL_KEYS = ("spandrel", "釉面玻璃", "釉面窗槛", "reflective screen", "solar glass")
_LOBBY_GLASS_KEYS = ("low-iron", "low iron", "低铁玻璃", "entry doors", "clear laminated", "podium · blue-grey")
_UPPER_CURTAIN_GLASS_KEYS = ("vision glass", "blue-grey glazing", "建筑玻璃")

_PROTOS = {}
_SHARED_MATS = {}


def _clean_mat(name: str, color, rough: float = 0.5, metal: float = 0.0,
               alpha: float = 1.0, emission=None, emis_strength: float = 0.0,
               double_sided: bool = False):
    """Build a stripped clean Principled BSDF (zero clearcoat, zero transmission)."""
    if name in _SHARED_MATS and _SHARED_MATS[name].name in bpy.data.materials:
        return _SHARED_MATS[name]
    existing = bpy.data.materials.get(name)
    if existing is not None:
        _SHARED_MATS[name] = existing
        return existing

    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = not double_sided
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    rgb = B.srgb(color) if isinstance(color, str) else tuple(color[:3])
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Alpha"].default_value = alpha
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = 0.0
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.0
    if emission is not None and emis_strength > 0:
        er = B.srgb(emission) if isinstance(emission, str) else tuple(emission[:3])
        bsdf.inputs["Emission Color"].default_value = (*er, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emis_strength
    m.surface_render_method = "BLENDED" if alpha < 0.999 else "DITHERED"
    _SHARED_MATS[name] = m
    return m


def _classify_material(raw_name: str, face_z: float, tone_mode: str):
    """Map an original glTF material name + face elevation to clean night WebGL material."""
    low = raw_name.lower()

    # 1. Spandrels & dark ceramic frit panels -> deep glossy opaque curtain divider bands
    if any(k in low for k in _SPANDREL_KEYS):
        return _clean_mat("CBD_Spandrel", "#101b29", rough=0.18, metal=0.44)

    # 2. Ground-floor transparent lobby glass -> clear night glazing revealing illuminated lobbies
    if any(k in low for k in _LOBBY_GLASS_KEYS) or (face_z <= LOBBY_Z_MAX and any(k in low for k in _UPPER_CURTAIN_GLASS_KEYS)):
        return _clean_mat("CBD_Glass_Lobby", "#3d617a", rough=0.10, metal=0.18, alpha=0.28)

    # 3. Upper-tower curtain glass -> opaque shader-hooked City window colour (facadeGlass + glow!)
    if any(k in low for k in _UPPER_CURTAIN_GLASS_KEYS):
        mat_win = bpy.data.materials.get("City window colour")
        if mat_win is None:
            mat_win = B.vmat("City window colour", 0.40, 0.14)
        return mat_win

    # 4. Ground lobby warm lighting & wash strips
    if any(k in low for k in ("3000 k", "2900k", "warm lobby", "檐下灯", "洗墙光", "商业间接光")):
        return _clean_mat("CBD_Emit_Lobby", "#ffd394", rough=0.35, emission="#ffc475", emis_strength=2.6)

    # 5. Architectural Metals & Curtain Framing
    if any(k in low for k in ("polished aluminium", "silver highlights", "抛光收边", "satin silver", "陽极", "阳极氧化银铝", "brushed silver", "satin aluminium")):
        return _clean_mat("CBD_Metal_Silver", "#a6b4c4", rough=0.24, metal=0.78)
    if any(k in low for k in ("斜撑钢", "painted steel")):
        return _clean_mat("CBD_Metal_Steel", "#99a8b8", rough=0.30, metal=0.70)
    if any(k in low for k in ("bronze", "古铜色门框")):
        return _clean_mat("CBD_Metal_Bronze", "#866446", rough=0.34, metal=0.68)
    if any(k in low for k in ("graphite", "obsidian", "设备百叶", "窗头与暗框", "charcoal aluminium", "dark anodized", "recessed reveals", "框架收边")):
        return _clean_mat("CBD_Metal_Dark", "#384454", rough=0.34, metal=0.62)
    if any(k in low for k in ("zinc", "屋面钛锌")):
        return _clean_mat("CBD_Roof_Zinc", "#536172", rough=0.42, metal=0.54)

    # 6. Exterior Stone & Podium Finishes (explicit calibrated night tones — never [1,1,1] chalk!)
    if any(k in low for k in ("charcoal granite", "石墨色实体框架", "blue graphite")):
        return _clean_mat("CBD_Stone_Charcoal", "#38414e", rough=0.50, metal=0.10)
    if any(k in low for k in ("limestone", "浅色石灰岩")):
        if "honey" in low or "warm" in low or "satin limestone piers" in low:
            return _clean_mat("CBD_Stone_LobbyWarm", "#a89072", rough=0.48, metal=0.0)
        return _clean_mat("CBD_Stone_Limestone", "#a69d8f", rough=0.56, metal=0.0)
    if any(k in low for k in ("门厅石材", "silicate plaster", "mushroom-grey", "oak soffit", "lobby", "plinth")):
        return _clean_mat("CBD_Stone_LobbyWarm", "#a48c6e", rough=0.48, metal=0.0)
    return _clean_mat("CBD_Stone_Grey", "#737c88", rough=0.56, metal=0.0)


def _strip_inward_twin_glass(bm, mat_names_by_slot):
    """Remove invisible inner-surface twin faces of closed 2-8cm double-glazed window boxes."""
    cell_size = 0.45
    buckets = {}
    candidates = []
    for f in bm.faces:
        mn = mat_names_by_slot[f.material_index].lower() if f.material_index < len(mat_names_by_slot) else ""
        if not any(k in mn for k in _GLAZING_ALL_KEYS):
            continue
        c = f.calc_center_median()
        n = f.normal.copy()
        a = f.calc_area()
        idx = len(candidates)
        candidates.append((f, c, n, a))
        key = (int(round(c.x / cell_size)), int(round(c.y / cell_size)), int(round(c.z / cell_size)))
        buckets.setdefault(key, []).append(idx)

    to_delete = set()
    for idx, (f1, c1, n1, a1) in enumerate(candidates):
        if f1 in to_delete:
            continue
        bx = int(round(c1.x / cell_size))
        by = int(round(c1.y / cell_size))
        bz = int(round(c1.z / cell_size))
        best_j = -1
        best_dist = 1e9
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    for j in buckets.get((bx + dx, by + dy, bz + dz), ()):
                        if j <= idx:
                            continue
                        f2, c2, n2, a2 = candidates[j]
                        if f2 in to_delete:
                            continue
                        if n1.dot(n2) > -0.94:
                            continue
                        if min(a1, a2) <= 1e-4 or max(a1, a2) / min(a1, a2) > 1.75:
                            continue
                        delta = c1 - c2
                        norm_sep = abs(delta.dot(n1))
                        if norm_sep > 0.14:
                            continue
                        tan_sep2 = max(0.0, delta.length_squared - norm_sep * norm_sep)
                        if tan_sep2 > 0.16:  # < 0.40m lateral alignment
                            continue
                        if norm_sep < best_dist:
                            best_dist = norm_sep
                            best_j = j
        if best_j >= 0:
            f2, c2, n2, _ = candidates[best_j]
            # Exterior pane sits in front along its own outward normal: (c_outer - c_inner).dot(n_outer) > 0
            s1 = (c1 - c2).dot(n1)
            if s1 > 0.004:
                to_delete.add(f2)
            elif s1 < -0.004:
                to_delete.add(f1)

    if to_delete:
        bmesh.ops.delete(bm, geom=list(to_delete), context="FACES")
    return len(to_delete)


def _pane_vcol(proto_key: str, cx: float, cy: float, cz: float, nx: float, ny: float):
    """Clustered architectural office lighting & unlit night reflection tint for Col attribute."""
    floor = int(cz / 3.90)
    # Tangential coordinate along facade perimeter handles flat, stepped & curved facades smoothly
    hl = math.hypot(nx, ny)
    if hl > 1e-4:
        tx, ty = -ny / hl, nx / hl
        along = cx * tx + cy * ty
    else:
        along = cx + cy
    bay = int(math.floor(along / 8.5))
    sub_pane = int(math.floor(along / 4.25))
    side_bucket = int(round((math.atan2(ny, nx) + math.pi) * 2.0)) if hl > 1e-4 else 0

    floor_sig = f"{proto_key}:f:{floor}".encode("ascii")
    fh = int.from_bytes(hashlib.md5(floor_sig).digest()[:4], "little")
    floor_activity = (fh % 100) / 100.0

    bay_sig = f"{proto_key}:{floor}:{bay}:{side_bucket}".encode("ascii")
    bh = int.from_bytes(hashlib.md5(bay_sig).digest()[:4], "little")
    v = (bh % 1000) / 1000.0

    pane_sig = f"{proto_key}:{floor}:{sub_pane}:{side_bucket}".encode("ascii")
    ph = int.from_bytes(hashlib.md5(pane_sig).digest()[:4], "little")
    pv = (ph % 1000) / 1000.0

    # Keep ~84% deep cool reflective curtain glass and ~16% coherent lit office wings
    cutoff_bias = 0.06 if floor_activity < 0.25 else (-0.05 if floor_activity > 0.78 else 0.0)
    lit_thresh = 0.14 + cutoff_bias
    if v < lit_thresh and pv < 0.84:
        # Bright golden active bay (occupied=1.0) vs soft muted warm late-night office (occupied~0.32)
        return B.srgb("#e6bd7a") if (v < 0.065 and pv < 0.72) else B.srgb("#736550")
    if v < lit_thresh + 0.04 and pv < 0.55:
        return B.srgb("#635943")  # Subtle recessed warm task lamp (occupied~0.16)

    # Unlit cool reflective curtain glass palette (R <= B so zero warm emission, lets sky reflect)
    cold = ("#142539", "#182d44", "#1d344e", "#16293f")[(ph >> 3) % 4]
    return B.srgb(cold)


def _build_prototype(key: str, tmpdir: str):
    if key in _PROTOS:
        return _PROTOS[key]

    z_inner, member, tone_mode = SOURCES[key]
    glb_path = os.path.join(tmpdir, f"{key}.glb")
    if not os.path.exists(glb_path):
        with zipfile.ZipFile(CBD_ZIP) as zroot:
            with zipfile.ZipFile(io.BytesIO(zroot.read(z_inner))) as nz:
                with open(glb_path, "wb") as out:
                    out.write(nz.read(member))

    before = set(o.name for o in bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=glb_path)
    imported = [bpy.data.objects[n] for n in set(o.name for o in bpy.data.objects) - before if n in bpy.data.objects]

    meshes = [o for o in imported if o.type == "MESH"]
    for e in [o for o in imported if o.type != "MESH"]:
        bpy.data.objects.remove(e, do_unlink=True)

    kept = []
    for ob in meshes:
        low_obj = ob.name.lower()
        if any(k in low_obj for k in _DROP_WHOLE_MESH_KEYS):
            bpy.data.objects.remove(ob, do_unlink=True)
            continue
        ob.data.transform(ob.matrix_world)
        ob.matrix_world.identity()
        kept.append(ob)

    if not kept:
        raise RuntimeError(f"Prototype {key} had no geometry left after drop")

    bpy.ops.object.select_all(action="DESELECT")
    for ob in kept:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = kept[0]
    if len(kept) > 1:
        bpy.ops.object.join()
    proto_obj = bpy.context.active_object

    me = proto_obj.data
    orig_mats = [me.materials[i].name if (i < len(me.materials) and me.materials[i]) else "" for i in range(max(1, len(me.materials)))]

    bm = bmesh.new()
    bm.from_mesh(me)
    # Transform all prototypes so entrance canopy (-Y) faces +X and base rests at z=0 centered at (0, 0)
    bmesh.ops.transform(bm, matrix=Matrix.Rotation(math.pi / 2, 4, "Z"), verts=bm.verts)
    min_z = min(v.co.z for v in bm.verts)
    xs0 = [v.co.x for v in bm.verts]
    ys0 = [v.co.y for v in bm.verts]
    bmesh.ops.translate(bm, verts=bm.verts, vec=(-0.5 * (min(xs0) + max(xs0)), -0.5 * (min(ys0) + max(ys0)), -min_z))

    # Pass 1: Delete joints, furniture, upper hidden interiors (z > LOBBY_Z_MAX), and microscopic glass rims
    to_del = []
    for f in bm.faces:
        mn = orig_mats[f.material_index].lower() if f.material_index < len(orig_mats) else ""
        if any(k in mn for k in _DROP_ALWAYS_MAT_KEYS):
            to_del.append(f)
            continue
        c = f.calc_center_median()
        if c.z > LOBBY_Z_MAX and any(k in mn for k in _DROP_UPPER_INTERIOR_MAT_KEYS):
            to_del.append(f)
            continue
        if any(k in mn for k in _GLAZING_ALL_KEYS):
            min_e = min((e.calc_length() for e in f.edges), default=1.0)
            if min_e < 0.095 and f.calc_area() < 0.35:
                to_del.append(f)
    if to_del:
        bmesh.ops.delete(bm, geom=to_del, context="FACES")

    bm.normal_update()
    twins_removed = _strip_inward_twin_glass(bm, orig_mats) if "Waterfront-R2" in z_inner else 0
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)

    xs = [v.co.x for v in bm.verts]
    ys = [v.co.y for v in bm.verts]
    zs = [v.co.z for v in bm.verts]
    bw, bd, bh = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)

    # Split each prototype cleanly into _body (no vertex colors) and _win (City window colour + Col)
    # 1. Body submesh: keep non-window faces, append materials BEFORE bm_body.to_mesh(me_body)
    bm_body = bm.copy()
    del_body = []
    for f in bm_body.faces:
        raw_name = orig_mats[f.material_index] if f.material_index < len(orig_mats) else ""
        c = f.calc_center_median()
        if _classify_material(raw_name, c.z, tone_mode).name == "City window colour":
            del_body.append(f)
    if del_body:
        bmesh.ops.delete(bm_body, geom=del_body, context="FACES")
    loose_body = [v for v in bm_body.verts if not v.link_faces]
    if loose_body:
        bmesh.ops.delete(bm_body, geom=loose_body, context="VERTS")

    body_mats = []
    body_mat_map = {}
    for f in bm_body.faces:
        raw_name = orig_mats[f.material_index] if f.material_index < len(orig_mats) else ""
        c = f.calc_center_median()
        target_mat = _classify_material(raw_name, c.z, tone_mode)
        if target_mat.name not in body_mat_map:
            body_mat_map[target_mat.name] = len(body_mats)
            body_mats.append(target_mat)
        f.material_index = body_mat_map[target_mat.name]

    me_body = bpy.data.meshes.new(f"CBD_Proto_{key}_body")
    for mat in body_mats:
        me_body.materials.append(mat)
    bm_body.to_mesh(me_body)
    bm_body.free()
    for attr in list(me_body.color_attributes):
        me_body.color_attributes.remove(attr)
    used_slots = {p.material_index for p in me_body.polygons}
    assert len(used_slots) == len(body_mats), f"{key}: used {used_slots} != {len(body_mats)} body_mats"
    me_body.update()

    # 2. Window submesh: upper curtain glass only, merged back into quads before Col assignment
    bm_win = bm.copy()
    del_win = []
    for f in bm_win.faces:
        raw_name = orig_mats[f.material_index] if f.material_index < len(orig_mats) else ""
        c = f.calc_center_median()
        if _classify_material(raw_name, c.z, tone_mode).name != "City window colour":
            del_win.append(f)
    if del_win:
        bmesh.ops.delete(bm_win, geom=del_win, context="FACES")
    loose_win = [v for v in bm_win.verts if not v.link_faces]
    if loose_win:
        bmesh.ops.delete(bm_win, geom=loose_win, context="VERTS")

    me_win = None
    win_quads = 0
    win_tris = 0
    if len(bm_win.faces) > 0:
        bmesh.ops.remove_doubles(bm_win, verts=bm_win.verts, dist=0.006)
        bm_win.normal_update()
        bmesh.ops.join_triangles(
            bm_win,
            faces=list(bm_win.faces),
            angle_face_threshold=0.08,
            angle_shape_threshold=0.80,
            cmp_seam=False,
            cmp_sharp=False,
            cmp_uvs=False,
            cmp_vcols=False,
            cmp_materials=False,
        )
        bm_win.normal_update()
        bm_win.faces.ensure_lookup_table()
        win_vcols = []
        for f in bm_win.faces:
            f.material_index = 0
            f.smooth = False
            c = f.calc_center_median()
            n = f.normal
            win_vcols.append(_pane_vcol(key, c.x, c.y, c.z, n.x, n.y))

        mat_win = bpy.data.materials.get("City window colour")
        if mat_win is None:
            mat_win = B.vmat("City window colour", 0.40, 0.14)
        me_win = bpy.data.meshes.new(f"CBD_Proto_{key}_win")
        me_win.materials.append(mat_win)
        bm_win.to_mesh(me_win)
        ca = me_win.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
        for poly in me_win.polygons:
            rgb = win_vcols[poly.index]
            for li in poly.loop_indices:
                ca.data[li].color = (*rgb, 1.0)
        me_win.update()
        win_quads = sum(1 for p in me_win.polygons if len(p.vertices) >= 4)
        win_tris = sum(len(p.vertices) - 2 for p in me_win.polygons)
    bm_win.free()

    bm.free()
    bpy.data.objects.remove(proto_obj, do_unlink=True)
    if me.users == 0:
        bpy.data.meshes.remove(me)

    body_tris = sum(len(p.vertices) - 2 for p in me_body.polygons)
    _PROTOS[key] = (me_body, me_win, bw, bd, bh)
    print(f"CBD_PROTO {key:15s} body_tris={body_tris:6d} body_mats={len(body_mats):2d} (used={len(used_slots):2d}) "
          f"win_quads={win_quads:5d} win_tris={win_tris:5d} stripped_twins={twins_removed:5d} "
          f"size=({bw:.1f}, {bd:.1f}, {bh:.1f})")
    return _PROTOS[key]


_TMP_DIR = None


def _ensure_tmp():
    global _TMP_DIR
    if _TMP_DIR is None:
        _TMP_DIR = tempfile.TemporaryDirectory(prefix="cbd_towers_")
    return _TMP_DIR.name


def cleanup():
    global _TMP_DIR
    if _TMP_DIR is not None:
        _TMP_DIR.cleanup()
        _TMP_DIR = None
    _PROTOS.clear()
    _SHARED_MATS.clear()


def place_tower(x: float, y: float, w: float, d: float, h: float, style: str, seed: int, far: bool = False):
    """Place a curated CBD skyscraper instance into the exact (x, y, w, d, h) layout slot."""
    tmpdir = _ensure_tmp()
    key = FAR_CYCLE[seed % len(FAR_CYCLE)] if far else HERO_SLOTS.get(seed, FAR_CYCLE[seed % len(FAR_CYCLE)])
    me_body, me_win, bw, bd, bh = _build_prototype(key, tmpdir)

    if far or abs(x) >= 90:
        swap_rot = (math.pi / 2) if ((w < d) != (bw < bd)) else 0.0
        rot_z = (0.0 if x < 0 else math.pi) + swap_rot
        eff_bw, eff_bd = (bd, bw) if swap_rot else (bw, bd)
    else:
        rot_z = 0.0 if x < 0 else math.pi
        eff_bw, eff_bd = bw, bd

    s_xy = min((w + 3.0) / eff_bw, (d + 3.0) / eff_bd)
    s_z = max(0.84 * s_xy, min(1.38 * s_xy, h / bh))

    mtx = (
        Matrix.Translation((x, y, 0.0))
        @ Euler((0.0, 0.0, rot_z), "XYZ").to_matrix().to_4x4()
        @ Matrix.Diagonal((s_xy, s_xy, s_z, 1.0))
    )

    objs = []
    ob_body = bpy.data.objects.new(f"CBD_{key}_{seed}_body", me_body)
    ob_body["grove_instance"] = True
    bpy.context.scene.collection.objects.link(ob_body)
    ob_body.matrix_world = mtx
    objs.append(ob_body)

    if me_win is not None:
        ob_win = bpy.data.objects.new(f"CBD_{key}_{seed}_win", me_win)
        ob_win["grove_instance"] = True
        bpy.context.scene.collection.objects.link(ob_win)
        ob_win.matrix_world = mtx
        objs.append(ob_win)

    actual_half_x = 0.5 * eff_bw * s_xy
    return objs, actual_half_x
