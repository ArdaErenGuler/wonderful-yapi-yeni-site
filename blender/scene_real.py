"""
Gerçekçi kentsel dönüşüm dioraması. Blender 5.x.

  blender -b -P blender/scene_real.py -- test  OUT_DIR
  blender -b -P blender/scene_real.py -- hero  OUT_DIR [N]
  blender -b -P blender/scene_real.py -- projects OUT_DIR

Dokular ve HDRI: Poly Haven (CC0) -> blender/tex
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "tex")
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODE = argv[0] if argv else "test"
OUT = argv[1] if len(argv) > 1 else os.path.join(HERE, "renders")
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def clamp(v, a=0.0, b=1.0): return max(a, min(b, v))
def ease_out(t): return 1 - (1 - t) ** 3
def ease_io(t): return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2

# ------------------------------------------------------------------ malzemeler
_cache = {}
def principled(m):
    return m.node_tree.nodes["Principled BSDF"]

def solid(name, rgb, rough=0.6, metal=0.0, alpha=1.0, spec=0.5):
    if name in _cache: return _cache[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = principled(m)
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Alpha"].default_value = alpha
    _cache[name] = m
    return m

def tex_mat(name, base, scale=1.0, tint=None, nstr=0.8, rough_mul=1.0):
    key = f"{name}"
    if key in _cache: return _cache[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links
    b = principled(m)
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale)
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    def img(suffix, color):
        t = N.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(os.path.join(TEX, f"{base}_{suffix}.jpg"), check_existing=True)
        t.projection = "BOX"; t.projection_blend = 0.3
        if not color: t.image.colorspace_settings.name = "Non-Color"
        L.new(mp.outputs["Vector"], t.inputs["Vector"])
        return t
    col = img("Diffuse", True).outputs["Color"]
    if tint:
        mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        L.new(col, mix.inputs[6]); mix.inputs[7].default_value = (*tint, 1)
        col = mix.outputs[2]
    L.new(col, b.inputs["Base Color"])
    L.new(img("Rough", False).outputs["Color"], b.inputs["Roughness"])
    nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = nstr
    L.new(img("nor_gl", False).outputs["Color"], nm.inputs["Color"])
    L.new(nm.outputs["Normal"], b.inputs["Normal"])
    _cache[key] = m
    return m

GLASS = lambda: solid("glass", (0.05, 0.09, 0.15), rough=0.05, metal=0.75)
FRAME = lambda: solid("frame", (0.10, 0.10, 0.11), rough=0.4, metal=0.8)
GOLD = lambda: solid("gold", (0.78, 0.58, 0.22), rough=0.28, metal=1.0)
RAIL = lambda: solid("rail", (0.7, 0.85, 0.9), rough=0.05, alpha=0.28)
FACADE = lambda: tex_mat("facade", "painted_plaster_wall", 0.9, tint=(0.96, 0.95, 0.93), nstr=0.5)
CONC = lambda: tex_mat("conc", "brushed_concrete_03", 0.9, tint=(0.88, 0.88, 0.87), nstr=0.7)

# ------------------------------------------------------------------ geometri yardımcıları
def box(size, loc, mat, bevel=0.0, rot=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = size
    o.location = (loc[0], loc[1], loc[2] + size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if rot: o.rotation_euler.z = rot
    if bevel:
        md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 2; md.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="b")
    o.data.materials.append(mat)
    return o

def cyl(r, h, loc, mat, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=(loc[0], loc[1], loc[2] + h / 2))
    o = bpy.context.active_object
    o.data.materials.append(mat)
    return o

def join(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.material_slot_remove_unused()
    return o

def smooth(o, angle=40):
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.shade_smooth()

def instance(src, name):
    o = src.copy(); o.name = name
    bpy.context.collection.objects.link(o)
    return o

# ------------------------------------------------------------------ KAT MODÜLÜ
W, D, H, SL = 1.5, 1.5, 0.42, 0.05

def make_floor_mesh(variant=0):
    P = []
    P.append(box((W + 0.08, D + 0.08, SL), (0, 0, 0), CONC(), 0.008))
    P.append(box((W, D, H - SL), (0, 0, SL), FACADE()))
    zc = SL + (H - SL) * 0.16
    ww, wh = 0.34, 0.25
    for side in (1, -1):
        for i, x in enumerate((-0.5, 0.0, 0.5)):
            y = side * (D / 2)
            if i == 1:  # balkon kapısı + balkon
                P.append(box((0.44, 0.03, 0.30), (x, y + side * 0.004, zc - 0.015), FRAME(), 0.004))
                P.append(box((0.38, 0.034, 0.27), (x, y + side * 0.008, zc), GLASS()))
                P.append(box((0.01, 0.036, 0.27), (x, y + side * 0.010, zc), FRAME()))
                P.append(box((0.56, 0.24, 0.03), (x, y + side * 0.12, SL - 0.005), CONC(), 0.004))
                P.append(box((0.56, 0.006, 0.11), (x, y + side * 0.235, SL + 0.025), RAIL()))
                P.append(box((0.57, 0.012, 0.012), (x, y + side * 0.235, SL + 0.135), FRAME()))
                if variant % 2 == 0:  # klima ünitesi
                    P.append(box((0.10, 0.06, 0.08), (x + 0.17, y + side * 0.05, SL + 0.03), solid("ac", (0.82, 0.82, 0.8), 0.5)))
            else:
                P.append(box((ww + 0.05, 0.03, wh + 0.05), (x, y + side * 0.004, zc + 0.02), FRAME(), 0.004))
                P.append(box((ww, 0.034, wh), (x, y + side * 0.008, zc + 0.045), GLASS()))
                P.append(box((0.008, 0.036, wh), (x, y + side * 0.010, zc + 0.045), FRAME()))
                P.append(box((ww + 0.09, 0.05, 0.012), (x, y + side * 0.02, zc + 0.012), CONC()))  # denizlik
    for side in (1, -1):
        for y in (-0.5, 0.0, 0.5):
            x = side * (W / 2)
            P.append(box((0.03, ww + 0.05, wh + 0.05), (x + side * 0.004, y, zc + 0.02), FRAME(), 0.004))
            P.append(box((0.034, ww, wh), (x + side * 0.008, y, zc + 0.045), GLASS()))
            P.append(box((0.05, ww + 0.09, 0.012), (x + side * 0.02, y, zc + 0.012), CONC()))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box((0.06, 0.06, H - SL), (sx * (W / 2), sy * (D / 2), SL), CONC(), 0.005))
    return join(P, f"Floor{variant}")

def make_roof_mesh():
    P = [box((W + 0.12, D + 0.12, 0.05), (0, 0, 0), CONC(), 0.008)]
    # altın parapet bandı
    t = 0.035
    for (sx, sy, ex, ey) in [(0, (D + 0.12) / 2 - t / 2, W + 0.12, t), (0, -((D + 0.12) / 2 - t / 2), W + 0.12, t)]:
        P.append(box((ex, ey, 0.09), (sx, sy, 0.05), GOLD(), 0.004))
    for sx in (1, -1):
        P.append(box((t, D + 0.12 - 2 * t, 0.09), (sx * ((W + 0.12) / 2 - t / 2), 0, 0.05), GOLD(), 0.004))
    P.append(box((0.42, 0.42, 0.20), (-0.35, -0.3, 0.05), FACADE(), 0.006))
    P.append(cyl(0.12, 0.16, (0.38, 0.32, 0.05), solid("tank", (0.75, 0.76, 0.78), 0.4, 0.6), 20))
    P.append(cyl(0.006, 0.45, (0.3, -0.4, 0.05), FRAME(), 6))
    P.append(box((0.10, 0.10, 0.07), (0.45, -0.1, 0.05), solid("vent", (0.55, 0.56, 0.58), 0.5, 0.5)))
    return join(P, "RoofMesh")

# ------------------------------------------------------------------ GECEKONDU
TINTS = [(0.95, 0.88, 0.72), (0.78, 0.84, 0.88), (0.95, 0.74, 0.68), (0.86, 0.86, 0.82), (0.95, 0.9, 0.62), (0.8, 0.8, 0.78)]
def wall_mat(i):
    if i % 2 == 0: return tex_mat(f"wallA{i}", "painted_plaster_wall", 0.7, tint=TINTS[i % 6], nstr=0.9)
    return tex_mat(f"wallB{i}", "painted_plaster_wall", 1.3, tint=TINTS[i % 6], nstr=1.2)
ROOFMAT_IRON = lambda: tex_mat("iron", "worn_corrugated_iron", 1.4, nstr=1.2)
ROOFMAT_TILE = lambda: tex_mat("tile", "clay_roof_tiles_02", 1.2, nstr=1.0)

def tri_prism(w, d, z, rh, mat):
    bm = bmesh.new()
    o = 0.05
    pts = [(-w/2-o, -d/2-o, z), (w/2+o, -d/2-o, z), (w/2+o, d/2+o, z), (-w/2-o, d/2+o, z),
           (-w/2-o, 0, z+rh), (w/2+o, 0, z+rh)]
    v = [bm.verts.new(p) for p in pts]
    bm.faces.new((v[0], v[1], v[5], v[4])); bm.faces.new((v[3], v[4], v[5], v[2]))
    bm.faces.new((v[0], v[4], v[3])); bm.faces.new((v[1], v[2], v[5]))
    bm.faces.new((v[0], v[3], v[2], v[1]))
    me = bpy.data.meshes.new("pr"); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("pr", me); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob

def hip_roof(w, d, z, rh, mat):
    bm = bmesh.new(); o = 0.05
    base = [(-w/2-o, -d/2-o, z), (w/2+o, -d/2-o, z), (w/2+o, d/2+o, z), (-w/2-o, d/2+o, z)]
    top = [(-w*0.2, -d*0.1, z+rh), (w*0.2, -d*0.1, z+rh), (w*0.2, d*0.1, z+rh), (-w*0.2, d*0.1, z+rh)]
    vb = [bm.verts.new(p) for p in base]; vt = [bm.verts.new(p) for p in top]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((vb[i], vb[j], vt[j], vt[i]))
    bm.faces.new(vt); bm.faces.new(list(reversed(vb)))
    me = bpy.data.meshes.new("hp"); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("hp", me); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob

def make_house(idx, rnd):
    w = 0.8 + rnd.random() * 0.3; d = 0.7 + rnd.random() * 0.15; h = 0.40 + rnd.random() * 0.12
    kind = idx % 3
    wm = wall_mat(idx)
    P = [box((w, d, h * (0.8 if kind == 1 else 1)), (0, 0, 0), wm, 0.008)]
    if kind == 0: P.append(hip_roof(w, d, h, 0.2, ROOFMAT_TILE()))
    elif kind == 1: P.append(tri_prism(w, d, h * 0.8, 0.2, ROOFMAT_IRON()))
    else:
        P.append(box((w + 0.07, d + 0.07, 0.035), (0, 0, h), CONC(), 0.004))
        P.append(cyl(0.07, 0.14, (w * 0.22, d * 0.15, h + 0.035), solid("tankb", (0.18, 0.28, 0.5), 0.5, 0.2), 14))
        for k in range(3):  # çatıda lastikler
            P.append(box((0.07, 0.07, 0.03), (-w * 0.25 + k * 0.1, -d * 0.2, h + 0.035), solid("tire", (0.05, 0.05, 0.05), 0.9)))
    P.append(box((0.12, 0.02, 0.22), (-w * 0.25, d / 2 + 0.004, 0), solid("door", (0.25, 0.17, 0.12), 0.8)))
    P.append(box((0.15, 0.02, 0.12), (w * 0.2, d / 2 + 0.004, h * 0.35), GLASS()))
    P.append(box((0.17, 0.014, 0.14), (w * 0.2, d / 2 + 0.002, h * 0.33), FRAME()))
    P.append(box((0.05, 0.05, 0.16), (w * 0.3, -d * 0.2, h * (0.8 if kind == 1 else 1) + (0.1 if kind else 0.12)), solid("chim", (0.5, 0.45, 0.4), 0.9)))
    if rnd.random() < 0.5:
        s = cyl(0.045, 0.012, (-w * 0.3, d * 0.1, h + 0.15), solid("dish", (0.85, 0.85, 0.85), 0.4, 0.3), 14)
        s.scale = (1, 1, 0.5); P.append(s)
    if idx % 2 == 0:  # bahçe duvarı
        t = 0.025; ex = 0.12
        P.append(box((w + 2 * ex, t, 0.1), (0, d / 2 + ex, 0), solid("fence", (0.7, 0.68, 0.64), 0.9)))
    return join(P, f"House{idx}")

def make_rubble(w, d, rnd):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1)
    o = bpy.context.active_object
    o.scale = (w * 0.55, d * 0.55, 0.12)
    bpy.ops.object.transform_apply(scale=True)
    tx = bpy.data.textures.new("cl", "CLOUDS"); tx.noise_scale = 0.35
    md = o.modifiers.new("d", "DISPLACE"); md.texture = tx; md.strength = 0.14
    bpy.ops.object.modifier_apply(modifier="d")
    o.data.materials.append(solid("rubble", (0.10, 0.09, 0.08), 1.0))
    o.location.z = 0.02
    smooth(o)
    return o

def make_tree(kind, rnd):
    P = [cyl(0.018, 0.2, (0, 0, 0), solid("trunk", (0.25, 0.17, 0.12), 0.9), 8)]
    g = [(0.30, 0.45, 0.17), (0.38, 0.52, 0.2), (0.26, 0.4, 0.14)]
    gm = solid(f"leaf{kind}", g[kind % 3], 0.8)
    if kind % 3 == 2:
        for k in range(3):
            bpy.ops.mesh.primitive_cone_add(radius1=0.15 - k * 0.03, radius2=0.0, depth=0.22, vertices=9, location=(0, 0, 0.26 + k * 0.14))
            c = bpy.context.active_object; c.data.materials.append(gm); P.append(c)
    else:
        for k in range(5):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.09 + rnd.random() * 0.05,
                location=((rnd.random() - .5) * 0.15, (rnd.random() - .5) * 0.15, 0.27 + rnd.random() * 0.14))
            c = bpy.context.active_object; c.data.materials.append(gm); P.append(c)
    t = join(P, f"Tree{kind}"); smooth(t); return t

# ------------------------------------------------------------------ ARAÇ ve VİNÇ
def make_car(color):
    body = solid(f"car{color}", color, 0.3, 0.6)
    P = [box((0.34, 0.15, 0.06), (0, 0, 0.03), body, 0.015), box((0.19, 0.13, 0.05), (-0.02, 0, 0.09), GLASS(), 0.012)]
    for sx in (-0.11, 0.11):
        for sy in (-0.075, 0.075):
            w = cyl(0.03, 0.025, (sx, sy, 0.0), solid("tireb", (0.04, 0.04, 0.04), 0.9), 12)
            w.rotation_euler.x = math.pi / 2; w.location.z = 0.03
            P.append(w)
    return join(P, "Car")

def make_crane():
    Y = solid("crane", (0.95, 0.72, 0.1), 0.5, 0.2)
    P = []
    mast_h = 4.7
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box((0.03, 0.03, mast_h), (sx * 0.06, sy * 0.06, 0), Y))
    for k in range(18):
        z = k * (mast_h / 18)
        P.append(box((0.16, 0.014, 0.014), (0, 0.06, z), Y)); P.append(box((0.16, 0.014, 0.014), (0, -0.06, z + 0.1), Y))
    mast = join(P, "CraneMast")
    J = [box((3.0, 0.05, 0.05), (0.6, 0, mast_h + 0.05), Y), box((3.0, 0.05, 0.05), (0.6, 0, mast_h + 0.28), Y)]
    for k in range(14):
        J.append(box((0.03, 0.04, 0.26), (-0.9 + k * 0.22, 0, mast_h + 0.05), Y))
    J.append(box((0.5, 0.2, 0.24), (-1.1, 0, mast_h - 0.05), solid("cw", (0.45, 0.45, 0.47), 0.8)))
    J.append(box((0.22, 0.2, 0.22), (0.05, 0, mast_h - 0.2), solid("cab", (0.9, 0.9, 0.9), 0.4)))
    J.append(cyl(0.004, 1.6, (1.9, 0, mast_h - 1.55), solid("cable", (0.05, 0.05, 0.05), 0.5), 6))
    J.append(box((0.07, 0.04, 0.05), (1.9, 0, mast_h - 1.6), Y))
    jib = join(J, "CraneJib")
    jib.parent = mast; jib.location = (0, 0, 0)
    return mast, jib

# ------------------------------------------------------------------ SAHNE
class Site: pass

def build_site(cfg, seed=11):
    S = Site(); rnd = random.Random(seed)
    R = cfg["radius"]; RA = cfg["roadAt"]
    S.R = R
    # taban
    box((2 * R + 0.36, 2 * R + 0.36, 0.42), (0, 0, -0.55), solid("plinth", (0.012, 0.012, 0.014), 0.12, 0.2), 0.02)
    box((2 * R + 0.40, 2 * R + 0.40, 0.025), (0, 0, -0.135), GOLD(), 0.004)
    ground = box((2 * R, 2 * R, 0.11), (0, 0, -0.11), tex_mat("grass", "leafy_grass", 0.45, tint=(0.78, 1.0, 0.55), nstr=0.8), 0.004)
    # orta parsel (toprak / beton)
    plot = RA - 0.45
    box((2 * plot, 2 * plot, 0.02), (0, 0, 0), tex_mat("plot", "brushed_concrete_03", 0.7, tint=(0.97, 0.95, 0.9), nstr=0.8))
    # yollar
    asph = tex_mat("asph", "asphalt_02", 0.7, nstr=1.0)
    curb = tex_mat("curb", "brushed_concrete_03", 0.9, tint=(0.95, 0.95, 0.94))
    def span(a, b): return (b - a, (a + b) / 2)
    segs = [span(-R, -RA - 0.45), span(-RA + 0.45, RA - 0.45), span(RA + 0.45, R)]
    for ax in (1, -1):
        box((2 * R, 0.8, 0.012), (0, ax * RA, 0), asph)
        box((0.8, 2 * R, 0.0125), (ax * RA, 0, 0), asph)
        for off in (-0.45, 0.45):
            for (ln, c) in segs:
                box((ln, 0.07, 0.05), (c, ax * RA + off, 0), curb)
                box((0.07, ln, 0.05), (ax * RA + off, c, 0), curb)
    # şerit çizgileri
    white = solid("paint", (0.9, 0.9, 0.88), 0.6)
    for ax in (1, -1):
        n = int(2 * R / 0.5)
        for k in range(n):
            u = -R + 0.25 + k * 0.5
            if min(abs(u - RA), abs(u + RA)) > 0.55:
                box((0.24, 0.02, 0.003), (u, ax * RA, 0.0125), white)
                box((0.02, 0.24, 0.003), (ax * RA, u, 0.013), white)
    # ağaçlar
    trees = [make_tree(k, rnd) for k in range(3)]
    for src in trees: src.hide_render = True; src.hide_viewport = True
    nT = int(14 + R * 7)
    for i in range(nT):
        x = (rnd.random() * 2 - 1) * (R - 0.4); z = (rnd.random() * 2 - 1) * (R - 0.4)
        if abs(x) < RA + 0.6 and abs(z) < RA + 0.6: continue
        if abs(abs(x) - RA) < 0.55 or abs(abs(z) - RA) < 0.55: continue
        t = instance(trees[rnd.randrange(3)], f"T{i}")
        t.hide_render = False
        t.location = (x, z, 0.0); t.rotation_euler.z = rnd.random() * 6.28
        sc = 1.0 + rnd.random() * 0.9; t.scale = (sc, sc, sc)
    # yol kenarı ağaçlar (sokak ağaçları)
    for ax in (1, -1):
        for k in range(int(R)):
            u = -R + 0.8 + k * (2 * R - 1.6) / max(1, int(R) - 1)
            for (px, pz) in ((u, ax * RA + 0.62), (ax * RA + 0.62, u)):
                if abs(px) < RA - 0.6 and abs(pz) < RA - 0.6: continue
                t = instance(trees[0], "S"); t.hide_render = False
                t.location = (px, pz, 0.0); t.scale = (0.8, 0.8, 0.8)
    # arabalar
    colors = [(0.8, 0.8, 0.82), (0.1, 0.15, 0.3), (0.6, 0.08, 0.08), (0.9, 0.9, 0.9), (0.15, 0.15, 0.16)]
    car_src = [make_car(c) for c in colors]
    for c in car_src: c.hide_render = True; c.hide_viewport = True
    for i in range(6):
        c = instance(car_src[i % len(colors)], f"C{i}"); c.hide_render = False
        if i % 2:
            c.location = (-R + 1 + rnd.random() * (2 * R - 2), RA + (0.2 if i % 4 == 1 else -0.2), 0.012)
            c.rotation_euler.z = 0 if i % 4 == 1 else math.pi
        else:
            c.location = (RA + (0.2 if i % 4 == 0 else -0.2), -R + 1 + rnd.random() * (2 * R - 2), 0.012)
            c.rotation_euler.z = math.pi / 2 if i % 4 == 0 else -math.pi / 2
    # eski yapılar
    houses = [make_house(k, random.Random(k + seed)) for k in range(6)]
    for h in houses: h.hide_render = True; h.hide_viewport = True
    S.olds = []
    for i, o in enumerate(cfg["olds"]):
        sc = o.get("s", 1.0)
        h = instance(houses[i % 6], f"Old{i}"); h.hide_render = False
        h.location = (o["x"], o["z"], 0.02)
        h.rotation_euler.z = rnd.randrange(4) * math.pi / 2 + (rnd.random() - .5) * 0.25
        h.scale = (sc, sc, sc)
        rub = make_rubble(0.9 * sc, 0.8 * sc, rnd)
        rub.location = (o["x"], o["z"], 0.02); rub.rotation_euler.z = rnd.random() * 6
        S.olds.append(dict(obj=h, rub=rub, delay=rnd.random() * 0.4, sc=sc, tilt=(rnd.random() - .5) * 0.5))
    # yeni bloklar
    floor_src = [make_floor_mesh(v) for v in range(2)]
    roof_src = make_roof_mesh()
    for s in floor_src + [roof_src]: s.hide_render = True; s.hide_viewport = True
    S.towers = []
    for ti, t in enumerate(cfg["towers"]):
        fl = []
        sx, sy = t["w"] / W, t["d"] / D
        for i in range(t["floors"]):
            f = instance(floor_src[i % 2], f"F{ti}_{i}"); f.hide_render = False
            f.location = (t["x"], t["z"], 0.02 + i * H); f.scale = (sx, sy, 1)
            f.rotation_euler.z = math.pi if i % 2 else 0
            fl.append(f)
        rf = instance(roof_src, f"Roof{ti}"); rf.hide_render = False
        rf.location = (t["x"], t["z"], 0.02 + t["floors"] * H); rf.scale = (sx, sy, 1)
        S.towers.append(dict(floors=fl, roof=rf, n=t["floors"], x=t["x"], z=t["z"], sx=sx, sy=sy))
    # vinç
    mast, jib = make_crane()
    cx, cz = cfg.get("crane", (0.1, -1.7))
    mast.location = (cx, cz, 0.02)
    S.mast, S.jib = mast, jib
    return S

def set_state(S, p, mode="hero"):
    collapse = clamp((p - 0.30) / 0.25); build = clamp((p - 0.5) / 0.45)
    for o in S.olds:
        s = ease_io(clamp(collapse * 1.4 - o["delay"]))
        sc = o["sc"]
        o["obj"].scale = (sc * (1 + 0.1 * s), sc * (1 + 0.1 * s), max(0.001, sc * (1 - 0.93 * s)))
        o["obj"].hide_render = s >= 0.7
        o["obj"].rotation_euler.y = o["tilt"] * s * 0.3
        rs = ease_out(clamp(s * 1.6))
        o["rub"].scale = (max(0.001, rs),) * 3
        o["rub"].hide_render = rs < 0.01
    for t in S.towers:
        for i, f in enumerate(t["floors"]):
            s = ease_out(clamp(build * (t["n"] + 1) - i))
            f.scale = (t["sx"], t["sy"], max(0.001, s))
            f.hide_render = s < 0.002
        rs = ease_out(clamp((build - 0.92) * 12))
        t["roof"].scale = (t["sx"] * max(rs, 0.001), t["sy"] * max(rs, 0.001), max(rs, 0.001))
        t["roof"].hide_render = rs < 0.002
    crane_on = 0.42 < p < 0.985
    S.mast.hide_render = not crane_on
    S.jib.hide_render = not crane_on
    S.jib.rotation_euler.z = math.radians(25 + 80 * p)

# ------------------------------------------------------------------ dünya, ışık, kamera
def setup_world(res, samples, engine):
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    w = bpy.data.worlds.new("w"); scene.world = w; w.use_nodes = True
    N = w.node_tree.nodes; L = w.node_tree.links
    env = N.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(TEX, "sky.hdr"))
    mp = N.new("ShaderNodeMapping"); tc = N.new("ShaderNodeTexCoord")
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(200))
    L.new(tc.outputs["Generated"], mp.inputs["Vector"]); L.new(mp.outputs["Vector"], env.inputs["Vector"])
    bg = N["Background"]; bg.inputs["Strength"].default_value = 1.2
    L.new(env.outputs["Color"], bg.inputs["Color"])
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 9.0; sun.angle = math.radians(1.2)
    sun.color = (1.0, 0.95, 0.86)
    so = bpy.data.objects.new("sun", sun); bpy.context.collection.objects.link(so)
    so.rotation_euler = (math.radians(48), math.radians(8), math.radians(-30))
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        if engine == "eevee":
            try: scene.render.engine = eng; break
            except TypeError: continue
    if engine == "cycles":
        scene.render.engine = "CYCLES"; scene.cycles.samples = samples; scene.cycles.use_denoising = True
        scene.cycles.device = "CPU"
    else:
        try:
            scene.eevee.taa_render_samples = samples
            scene.eevee.use_raytracing = True
        except Exception as e: print("eevee opts:", e)
    scene.view_settings.view_transform = "AgX"
    try: scene.view_settings.look = "AgX - High Contrast"
    except Exception: scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.45

cam_obj = None; target = None
def setup_camera(focal=42):
    global cam_obj, target
    cam = bpy.data.cameras.new("cam"); cam.lens = focal; cam.clip_end = 200
    cam_obj = bpy.data.objects.new("cam", cam); bpy.context.collection.objects.link(cam_obj)
    target = bpy.data.objects.new("tgt", None); bpy.context.collection.objects.link(target)
    c = cam_obj.constraints.new("TRACK_TO"); c.target = target; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    scene.camera = cam_obj

def place_camera(az_deg, elev_deg, dist, tz=1.5):
    az, el = math.radians(az_deg), math.radians(elev_deg)
    cam_obj.location = (dist * math.cos(el) * math.sin(az), -dist * math.cos(el) * math.cos(az), tz + dist * math.sin(el))
    target.location = (0, 0, tz)

def render(path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

# ------------------------------------------------------------------ yerleşimler
def hero_layout():
    olds = []
    for i in range(3):
        for j in range(3):
            olds.append(dict(x=(i - 1) * 1.45 + (j % 2) * 0.15, z=(j - 1) * 1.35))
    olds += [dict(x=-2.9, z=1.5), dict(x=3.0, z=-1.6), dict(x=2.8, z=1.8), dict(x=-3.0, z=-1.3)]
    return dict(olds=olds, radius=5.7, roadAt=3.9,
                towers=[dict(x=-0.9, z=0.1, w=1.5, d=1.5, floors=9), dict(x=1.1, z=-0.15, w=1.4, d=1.4, floors=7)])

def project_layout(oldN, towers, floors):
    show = min(oldN, 36); cols = math.ceil(math.sqrt(show))
    sp = 1.05 if show > 12 else 1.45; sc = 0.8 if show > 12 else 1.0
    rows = math.ceil(show / cols)
    olds = [dict(x=((i % cols) - (cols - 1) / 2) * sp, z=((i // cols) - (rows - 1) / 2) * sp, s=sc) for i in range(show)]
    tc = math.ceil(math.sqrt(towers)); trows = math.ceil(towers / tc)
    ts = [dict(x=((i % tc) - (tc - 1) / 2) * 2.4, z=((i // tc) - (trows - 1) / 2) * 2.4, w=1.5, d=1.5, floors=floors + (i % 2)) for i in range(towers)]
    ext = max(cols * sp / 2 + 0.6, tc * 2.4 / 2 + 0.4, 2.6)
    return dict(olds=olds, towers=ts, radius=ext + 3.4, roadAt=ext + 1.2, ext=ext, crane=(ext * 0.2, -ext * 0.8))

PROJECTS = [(1, 280, 5, 8), (2, 6, 2, 6), (3, 6, 2, 6), (4, 700, 6, 9), (5, 412, 4, 8), (6, 3, 1, 5), (7, 10, 3, 8), (8, 1500, 8, 6), (9, 44, 2, 6)]

# ------------------------------------------------------------------ ana akış
if MODE == "test":
    S = build_site(hero_layout())
    setup_world((960, 540), 32, "eevee"); setup_camera()
    import time
    for p in (0.1, 0.45, 0.8):
        t0 = time.time(); set_state(S, p)
        place_camera(30 + 50 * p, 27, 23.5, tz=0.8)
        render(os.path.join(OUT, f"test_{int(p*100)}.png"))
        print("TIME", p, round(time.time() - t0, 1), "s")

elif MODE == "hero":
    N = int(argv[2]) if len(argv) > 2 else 72
    engine = argv[3] if len(argv) > 3 else "eevee"
    S = build_site(hero_layout())
    setup_world((1280, 720), 48, engine); setup_camera()
    for i in range(N):
        p = i / (N - 1)
        set_state(S, p)
        place_camera(30 + 50 * p, 27, 23.5, tz=0.8)
        render(os.path.join(OUT, f"hero_{i:03d}.png"))
        print("FRAME", i, flush=True)

elif MODE == "projects":
    engine = argv[2] if len(argv) > 2 else "eevee"
    first = True
    for (pid, oldN, towers, floors) in PROJECTS:
        # her proje için temiz sahne
        bpy.ops.wm.read_factory_settings(use_empty=True); _cache.clear()
        scene = bpy.context.scene
        cfg = project_layout(oldN, towers, floors)
        S = build_site(cfg, seed=pid)
        setup_world((1280, 720), 48, engine); setup_camera()
        R = cfg["ext"] * 2.1 + 6
        for tag, p in (("before", 0.0), ("after", 1.0)):
            set_state(S, p)
            place_camera(38, 28, R * 1.12, tz=1.3)
            render(os.path.join(OUT, f"proj_{pid}_{tag}.png"))
            print("DONE", pid, tag, flush=True)
