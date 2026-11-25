"""
Maket tarzı varlıklar: kat modülü, çatı, gecekondular, ağaçlar.
Çalıştır:  blender --background --python blender/gen_assets.py -- public/models/maket.glb
Blender Z-up çalışır; glTF çıktısı otomatik Y-up olur. Tüm parçaların orijini tabanda (z=0).
"""
import bpy, bmesh, sys, os
from mathutils import Vector

out = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "maket.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, rgb, rough=0.9, metal=0.0, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m

M = {
    "clay":   mat("clay",   (0.93, 0.91, 0.87)),
    "slab":   mat("slab",   (0.84, 0.82, 0.78)),
    "glass":  mat("glass",  (0.07, 0.12, 0.22), rough=0.15, metal=0.35),
    "accent": mat("accent", (0.776, 0.095, 0.027), rough=0.6),
    "oldwall": mat("oldwall", (0.66, 0.62, 0.56)),
    "oldroof": mat("oldroof", (0.40, 0.36, 0.34)),
    "dark":   mat("dark",   (0.18, 0.17, 0.17)),
    "leaf":   mat("leaf",   (0.60, 0.70, 0.54)),
    "trunk":  mat("trunk",  (0.45, 0.38, 0.32)),
}

def box(name, size, loc, m, bevel=0.0):
    """size=(x,y,z) toplam; loc = taban merkezi (z = alt yüz)."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    o.location = (loc[0], loc[1], loc[2] + size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        mod = o.modifiers.new("b", "BEVEL"); mod.width = bevel; mod.segments = 2
        bpy.ops.object.modifier_apply(modifier="b")
    o.data.materials.append(m)
    return o

def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    r = bpy.context.active_object
    r.name = name
    return r

def apply_mats_by_slot(obj):
    pass

# ---------- KAT MODÜLÜ ----------
W, D, H = 1.5, 1.5, 0.42
SL = 0.05
def make_floor(name):
    parts = []
    parts.append(box("slab", (W + 0.07, D + 0.07, SL), (0, 0, 0), M["slab"], 0.006))
    parts.append(box("core", (W, D, H - SL), (0, 0, SL), M["clay"]))
    zc = SL + (H - SL) * 0.18
    wh, ww = 0.22, 0.30
    # ön (+y) ve arka (-y): 3 pencere, ortası balkon kapısı
    for side in (1, -1):
        for i, x in enumerate((-0.5, 0.0, 0.5)):
            y = side * (D / 2)
            if i == 1:
                parts.append(box("door", (0.30, 0.02, 0.27), (x, y + side * 0.005, zc), M["glass"]))
                parts.append(box("frm", (0.35, 0.012, 0.31), (x, y + side * 0.002, zc - 0.02), M["slab"]))
                # balkon
                parts.append(box("bal", (0.50, 0.20, 0.028), (x, y + side * 0.10, SL), M["slab"], 0.004))
                parts.append(box("rail", (0.50, 0.008, 0.11), (x, y + side * 0.195, SL + 0.028), M["glass"]))
            else:
                parts.append(box("win", (ww, 0.02, wh), (x, y + side * 0.005, zc + 0.03), M["glass"]))
                parts.append(box("frm", (ww + 0.05, 0.012, wh + 0.05), (x, y + side * 0.002, zc + 0.005), M["slab"]))
    # yan cepheler (±x): 3 pencere
    for side in (1, -1):
        for y in (-0.5, 0.0, 0.5):
            x = side * (W / 2)
            parts.append(box("win", (0.02, ww, wh), (x + side * 0.005, y, zc + 0.03), M["glass"]))
            parts.append(box("frm", (0.012, ww + 0.05, wh + 0.05), (x + side * 0.002, y, zc + 0.005), M["slab"]))
    # köşe pilastrları
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(box("pil", (0.05, 0.05, H - SL), (sx * (W / 2), sy * (D / 2), SL), M["slab"]))
    # tek bir nesne, birden çok malzeme slotu
    return join_multi(parts, name)

def join_multi(parts, name):
    # farklı malzemeli parçaları birleştir; slotlar korunur
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    r = bpy.context.active_object
    r.name = name
    # slotları tekilleştir
    seen = {}
    for pi, poly in enumerate(r.data.polygons):
        pass
    bpy.ops.object.material_slot_remove_unused()
    return r

floor = make_floor("Floor")

# ---------- ÇATI ----------
roof_parts = [
    box("cap", (W + 0.10, D + 0.10, 0.06), (0, 0, 0), M["accent"], 0.008),
    box("stair", (0.42, 0.42, 0.20), (-0.35, -0.3, 0.06), M["clay"], 0.006),
    box("tank", (0.26, 0.26, 0.14), (0.38, 0.32, 0.06), M["slab"], 0.006),
    box("vent", (0.12, 0.12, 0.08), (0.3, -0.4, 0.06), M["dark"]),
]
roof = join_multi(roof_parts, "Roof")

# ---------- GECEKONDULAR ----------
def prism(name, w, d, h, rh, m):
    """Beşgen kesitli beşik çatı (x ekseninde sırt)."""
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in [
        (-w/2, -d/2, 0), (w/2, -d/2, 0), (w/2, d/2, 0), (-w/2, d/2, 0),
        (-w/2, -d/2, h), (w/2, -d/2, h), (w/2, d/2, h), (-w/2, d/2, h),
        (-w/2, 0, h + rh), (w/2, 0, h + rh)]]
    f = bm.faces.new
    f((v[0], v[1], v[2], v[3]))
    f((v[0], v[4], v[5], v[1])); f((v[3], v[2], v[6], v[7]))
    f((v[0], v[3], v[7], v[8], v[4])); f((v[1], v[5], v[9], v[6], v[2]))
    f((v[4], v[8], v[9], v[5])); f((v[7], v[6], v[9], v[8]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    return o

def hip(name, w, d, z, rh, m):
    bm = bmesh.new()
    o = 0.04
    base = [(-w/2-o, -d/2-o, z), (w/2+o, -d/2-o, z), (w/2+o, d/2+o, z), (-w/2-o, d/2+o, z)]
    top = [(-w*0.18, -d*0.12, z+rh), (w*0.18, -d*0.12, z+rh), (w*0.18, d*0.12, z+rh), (-w*0.18, d*0.12, z+rh)]
    vb = [bm.verts.new(p) for p in base]; vt = [bm.verts.new(p) for p in top]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((vb[i], vb[j], vt[j], vt[i]))
    bm.faces.new(vt); bm.faces.new(list(reversed(vb)))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(m)
    return ob

def house(name, w, d, h, kind):
    parts = [box("wall", (w, d, h), (0, 0, 0), M["oldwall"], 0.01)]
    if kind == "hip":
        parts.append(hip("roof", w, d, h, 0.20, M["oldroof"]))
    elif kind == "gable":
        parts = [box("wall", (w, d, h * 0.8), (0, 0, 0), M["oldwall"], 0.01), prism("roof", w + 0.06, d + 0.06, h * 0.8, 0.22, M["oldroof"])]
    else:  # flat
        parts.append(box("slab", (w + 0.06, d + 0.06, 0.04), (0, 0, h), M["oldroof"]))
        parts.append(box("tank", (0.16, 0.16, 0.12), (w * 0.2, d * 0.15, h + 0.04), M["slab"]))
    # kapı ve pencere
    parts.append(box("door", (0.12, 0.02, 0.22), (-w * 0.25, d / 2 + 0.004, 0), M["dark"]))
    parts.append(box("win", (0.14, 0.02, 0.12), (w * 0.22, d / 2 + 0.004, h * 0.35), M["dark"]))
    return join_multi(parts, name)

g1 = house("Old_1", 0.85, 0.70, 0.38, "hip")
g2 = house("Old_2", 1.00, 0.75, 0.42, "gable")
g3 = house("Old_3", 0.80, 0.80, 0.46, "flat")

# ---------- AĞAÇLAR ----------
def tree(name, kind):
    parts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=0.16, location=(0, 0, 0.08))
    t = bpy.context.active_object; t.data.materials.append(M["trunk"]); parts.append(t)
    if kind == 1:
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.13, subdivisions=2, location=(0, 0, 0.27))
        c = bpy.context.active_object
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=0.12, radius2=0.0, depth=0.30, vertices=8, location=(0, 0, 0.30))
        c = bpy.context.active_object
    c.data.materials.append(M["leaf"]); parts.append(c)
    bpy.ops.object.shade_smooth()
    return join_multi(parts, name)

t1 = tree("Tree_1", 1); t2 = tree("Tree_2", 2)

# yan yana görmek için ofset (loader isimle bulur; konum önemsiz)
for i, o in enumerate([floor, roof, g1, g2, g3, t1, t2]):
    o.location.x = i * 2.5
    o.select_set(False)

os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True,
                          export_cameras=False, export_lights=False, export_yup=True)
print("OK ->", out, os.path.getsize(out) // 1024, "KB")
