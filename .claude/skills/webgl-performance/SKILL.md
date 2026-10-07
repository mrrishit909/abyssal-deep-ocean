---
name: webgl-performance
description: Budgets and how they are measured.
---

Budgets and how they are measured.

- Track draw calls, triangles, geometries, textures from `renderer.info` (exposed as `window.__abyssalStats`-style hook in tests).
- GLB and JS weight are asserted in tests/e2e/performance.spec.ts.
- Software-rendered (SwiftShader) frame times are bounds, not GPU results; report the hardware you tested.
