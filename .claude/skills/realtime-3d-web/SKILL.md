---
name: realtime-3d-web
description: Three.js / R3F practice.
---

Three.js / R3F practice.

- Instance repeated props (one draw call). Fog and background carry depth/state.
- Custom shaders only where the effect cannot be a material: keep uniforms few, no per-frame allocations.
- Pause rendering when the tab is hidden; handle `webglcontextlost` by swapping to the poster.
- GLB: stable node names, unit-scale pivots, Meshopt/Draco/KTX2 when the budget needs them.
