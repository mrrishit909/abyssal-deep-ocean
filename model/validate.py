"""Fresh-scene re-import validation of the exported GLBs. Run: Blender -b -P model/validate.py
Checks stable names, parenting, no unapplied scale on browser-controlled parts, tri budget, materials. Exits 1 on failure."""
import bpy, os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
BUDGET = {"submersible.glb": {"tris": 6000, "bytes": 250_000}, "seabed-kit.glb": {"tris": 4000, "bytes": 150_000}}
REQUIRED = {"submersible.glb": ["Submersible", "Hull", "LeftThruster", "RightThruster", "ManipulatorArm", "CameraRig",
                                "SpotlightLeft", "SpotlightRight", "SonarArray", "SampleContainer"],
            "seabed-kit.glb": ["SeabedKit", "Rock1", "Rock2", "Rock3", "Rock4", "Vent1", "TerrainTile"]}
report, fail = {}, []
for name, req in REQUIRED.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path = os.path.join(HERE, "exports", name)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = {o.name.split(".")[0]: o for o in bpy.data.objects}
    missing = [r for r in req if r not in objs]
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")  # polys; glTF export triangulates
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
    mats = sorted({m.name for m in bpy.data.materials})
    size = os.path.getsize(path)
    root = req[0]
    orphan = [o.name for o in bpy.data.objects if o.parent is None and o.name.split(".")[0] != root]
    pivots_ok = all(tuple(round(c, 3) for c in objs[p].scale) == (1.0, 1.0, 1.0) for p in req[1:] if p in objs and objs[p].type == "EMPTY")
    report[name] = {"tris": tris, "bytes": size, "materials": mats, "missing": missing, "orphans": orphan, "pivots_unit_scale": pivots_ok}
    if missing: fail.append(f"{name}: missing {missing}")
    if tris > BUDGET[name]["tris"]: fail.append(f"{name}: {tris} tris over budget")
    if size > BUDGET[name]["bytes"]: fail.append(f"{name}: {size} bytes over budget")
    if orphan: fail.append(f"{name}: unparented {orphan}")
    if not pivots_ok: fail.append(f"{name}: a browser-controlled pivot has non-unit scale")
json.dump(report, open(os.path.join(HERE, "exports", "validation.json"), "w"), indent=1)
print(json.dumps(report, indent=1))
if fail:
    print("VALIDATION FAILED:", fail); sys.exit(1)
print("VALIDATION OK")
