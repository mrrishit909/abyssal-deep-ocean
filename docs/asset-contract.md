# Blender asset contract

Source of truth: `model/build.py` (deterministic). `model/source.blend` is its output, not a hand-edited file.

## submersible.glb (100 KB, 2,266 triangles, 6 materials)
Root `Submersible` at the centre of buoyancy. Y-forward / Z-up in Blender becomes -Z forward / Y-up in glTF: the nose points to -Z in the browser.

| Node | Kind | Driven by the browser |
|---|---|---|
| Hull, Dome, SkidLeft/Right, Strut | mesh | bobbing of the whole vehicle |
| LeftThruster, RightThruster | empty pivot (unit scale) | prop spin, scaled by playback state |
| ManipulatorArm (+ ArmElbow) | empty pivot | idle sway |
| CameraRig | empty pivot | none yet |
| SpotlightLeft, SpotlightRight | empty pivot | the browser places the real SpotLights at these positions; width and intensity follow the intro |
| SonarArray | empty pivot | continuous rotation |
| SampleContainer | empty pivot | none yet |

## seabed-kit.glb (52 KB, 1,536 triangles)
`SeabedKit` root with `Rock1..4`, `Vent1` (chimney and glow cap) and `TerrainTile`. The runtime instances the rocks 160 times (one draw call); the vent and tile are exported for future use and are not placed in the demo.

## Validation (`model/validate.py`)
Re-imports each GLB into an empty scene and fails on: a required node missing, an unparented object, a non-unit scale on a browser-controlled pivot, a triangle budget (6,000 / 4,000) or byte budget (250 KB / 150 KB) breach. Last run: VALIDATION OK (`model/exports/validation.json`).

## Known limits
Modeling is deliberately simple: low-poly primitives with a soft material set, enough for silhouette, hierarchy and motion. There are no UVs or textures, and no baked lighting; all lighting is live.
