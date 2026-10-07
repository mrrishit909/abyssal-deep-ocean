"""ABYSSAL scientific submersible + seabed kit. Deterministic: same script -> same .blend and GLBs.
Run: Blender -b -P model/build.py   (writes model/source.blend, model/exports/*.glb, model/renders/poster.png)"""
import bpy, bmesh, math, os, random
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "exports")
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(HERE, "renders"), exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m

M = {
    "hull": mat("HullWhite", (0.78, 0.9, 0.92), 0.2, 0.35),
    "frame": mat("FrameNavy", (0.05, 0.2, 0.32), 0.1, 0.55),
    "glass": mat("Dome", (0.05, 0.35, 0.45), 0.0, 0.05),
    "light": mat("LampGlow", (0.9, 1, 1), 0, 0.2, (0.91, 0.98, 1.0), 6.0),
    "sonar": mat("SonarCyan", (0.07, 0.9, 0.9), 0, 0.3, (0.07, 0.96, 0.94), 2.0),
    "sample": mat("SampleViolet", (0.4, 0.2, 0.8), 0, 0.3, (0.62, 0.36, 1.0), 1.2),
    "rock": mat("Rock", (0.03, 0.07, 0.09), 0, 0.9),
    "vent": mat("VentGlow", (0.05, 0.2, 0.3), 0, 0.6, (0.03, 0.5, 0.99), 1.5),
}

def obj(name, mesh_fn, material, loc=(0, 0, 0), parent=None):
    bpy.ops.object.select_all(action="DESELECT")
    mesh_fn()
    o = bpy.context.active_object
    o.name = name
    o.location = loc
    o.data.materials.append(M[material] if isinstance(material, str) else material)
    if parent:
        o.parent = parent
    return o

def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    e.location = loc
    if parent:
        e.parent = parent
    return e

def smooth(o):
    for p in o.data.polygons: p.use_smooth = True

# Root pivot at the vehicle's centre of buoyancy. Y forward, Z up (Blender); glTF export converts to Y-up.
root = empty("Submersible", (0, 0, 0))

hull = obj("Hull", lambda: bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1), "hull", parent=root)
hull.scale = (0.9, 1.5, 0.7); smooth(hull)
dome = obj("Dome", lambda: bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.55), "glass", (0, 1.15, 0.28), hull)
dome.parent = root; dome.scale = (1, 1, 0.8); smooth(dome)
skid_l = obj("SkidLeft", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.07, depth=3.0, rotation=(math.pi / 2, 0, 0)), "frame", (-0.85, 0, -0.78), root)
skid_r = obj("SkidRight", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.07, depth=3.0, rotation=(math.pi / 2, 0, 0)), "frame", (0.85, 0, -0.78), root)
for sx in (-0.85, 0.85):
    obj("Strut", lambda: bpy.ops.mesh.primitive_cube_add(size=1), "frame", (sx, 0.2, -0.45), root).scale = (0.05, 0.06, 0.32)
    obj("Strut", lambda: bpy.ops.mesh.primitive_cube_add(size=1), "frame", (sx, -0.7, -0.45), root).scale = (0.05, 0.06, 0.32)

def thruster(name, x):
    pivot = empty(name, (x, -1.35, 0.1), root)
    t = obj(name + "Shroud", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.22, depth=0.55, rotation=(math.pi / 2, 0, 0)), "frame", parent=pivot)
    t.location = (0, 0, 0)
    prop = obj(name + "Prop", lambda: bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.18, depth=0.08, rotation=(math.pi / 2, 0, 0)), "sonar", (0, -0.1, 0), pivot)
    return pivot
thruster("LeftThruster", -1.0); thruster("RightThruster", 1.0)

arm = empty("ManipulatorArm", (0.35, 1.45, -0.45), root)
seg1 = obj("ArmUpper", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.05, depth=0.7, rotation=(math.pi / 2.6, 0, 0)), "frame", (0, 0.25, -0.15), arm)
elbow = empty("ArmElbow", (0, 0.5, -0.32), arm)
seg2 = obj("ArmFore", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.04, depth=0.55, rotation=(math.pi / 3, 0, 0)), "frame", (0, 0.18, -0.12), elbow)
claw = obj("ArmClaw", lambda: bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.1, depth=0.22, rotation=(math.pi / 2, 0, 0)), "sonar", (0, 0.42, -0.2), elbow)

cam = empty("CameraRig", (0, 1.3, 0.62), root)
obj("CameraHousing", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.1, depth=0.22, rotation=(math.pi / 2, 0, 0)), "frame", parent=cam)
obj("CameraLens", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.06, depth=0.04, rotation=(math.pi / 2, 0, 0)), "glass", (0, 0.12, 0), cam)

for side, x in (("Left", -0.55), ("Right", 0.55)):
    sp = empty(f"Spotlight{side}", (x, 1.05, 0.4), root)
    obj(f"Spot{side}Can", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.11, depth=0.3, rotation=(math.pi / 2, 0, 0)), "frame", parent=sp)
    obj(f"Spot{side}Lens", lambda: bpy.ops.mesh.primitive_circle_add(vertices=16, radius=0.085, fill_type="NGON", rotation=(math.pi / 2, 0, 0)), "light", (0, 0.151, 0), sp)

sonar = empty("SonarArray", (0, 0, 0.72), root)
obj("SonarDish", lambda: bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.28, radius2=0.04, depth=0.12), "sonar", parent=sonar)

sample = empty("SampleContainer", (0, -0.35, -0.72), root)
obj("SampleTube", lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.2, depth=0.7, rotation=(math.pi / 2, 0, 0)), "sample", parent=sample)

# --- seabed kit: separate asset, modular pieces with stable names
kit = empty("SeabedKit", (0, 0, 0))
def rock(name, seed, size, loc):
    random.seed(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=size)
    o = bpy.context.active_object; o.name = name
    for v in o.data.vertices:
        v.co *= 0.75 + random.random() * 0.5
    o.scale.z = 0.6; o.location = loc
    o.data.materials.append(M["rock"]); o.parent = kit; smooth(o)
for i, (s, z) in enumerate([(1.0, 0), (0.6, 0), (1.5, 0), (0.4, 0)]):
    rock(f"Rock{i+1}", 10 + i, s, (i * 3.0 - 4.5, 0, z))
vent = empty("Vent1", (-8, 0, 0), kit)
obj("VentChimney", lambda: bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.7, radius2=0.18, depth=2.2), "rock", (0, 0, 1.1), vent)
obj("VentGlowCap", lambda: bpy.ops.mesh.primitive_circle_add(vertices=14, radius=0.17, fill_type="NGON"), "vent", (0, 0, 2.21), vent)
tile = obj("TerrainTile", lambda: bpy.ops.mesh.primitive_grid_add(x_subdivisions=24, y_subdivisions=24, size=10), "rock", (4, 0, -0.1), kit)
random.seed(7)
for v in tile.data.vertices:
    v.co.z = math.sin(v.co.x * 0.9) * 0.18 + math.cos(v.co.y * 0.7) * 0.15 + random.random() * 0.06
smooth(tile)

# --- poster: sub only (kit hidden from render), three-quarter view, key + rim lights
def hide(o):
    o.hide_render = True
    for c in o.children: hide(c)
hide(kit)
bpy.ops.object.camera_add(location=(4.6, 4.2, 1.5)); cam_o = bpy.context.active_object
cam_o.name = "PosterCam"; scene.camera = cam_o; cam_o.data.lens = 40
cam_o.rotation_euler = (Vector((0, 0.2, 0)) - cam_o.location).to_track_quat("-Z", "Y").to_euler()
for name, loc, e, col in (("Key", (-4, 5, 4), 900, (0.9, 1, 1)), ("Rim", (5, -5, 2.5), 700, (0.07, 0.95, 0.94)), ("Fill", (4, 3, -2), 300, (0.6, 0.35, 1.0))):
    bpy.ops.object.light_add(type="POINT", location=loc); l = bpy.context.active_object
    l.name = name; l.data.energy = e; l.data.color = col
world = bpy.data.worlds.new("Abyss"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.008, 0.03, 0.05, 1)
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x, scene.render.resolution_y = 1280, 720
scene.render.filepath = os.path.join(HERE, "renders", "poster.png")

def export(name, parents):
    bpy.ops.object.select_all(action="DESELECT")
    def pick(o):
        o.select_set(True)
        for c in o.children: pick(c)
    for p in parents: pick(p)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_cameras=False, export_lights=False)

export("submersible.glb", [root])
export("seabed-kit.glb", [kit])
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "source.blend"))
try:
    bpy.ops.render.render(write_still=True)
except Exception as e:
    print("poster render failed:", e)
print("BUILD OK")
