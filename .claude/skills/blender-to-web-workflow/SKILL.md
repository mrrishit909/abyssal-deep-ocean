---
name: blender-to-web-workflow
description: concept -> graybox -> validated Blender asset -> GLB -> browser runtime -> polish/test.
---

concept -> graybox -> validated Blender asset -> GLB -> browser runtime -> polish/test.

1. Visual direction + interaction contract. 2. Graybox in Blender; review silhouette and camera. 3. Final asset by reproducible Blender Python (`model/build.py`). 4. Export GLB with stable names/pivots. 5. `model/validate.py` re-imports into a fresh scene. 6. Integrate in R3F. 7. Motion, lighting and shaders live in the browser. 8. Poster still for mobile/reduced-motion/graphics failure. 9. Screenshots vs the approved concept; measure.

Run: `~/Applications/Blender.app/Contents/MacOS/Blender -b -P model/build.py` then `-P model/validate.py`.
