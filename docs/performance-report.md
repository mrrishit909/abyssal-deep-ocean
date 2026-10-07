# Performance report

Hardware: Apple M3 Pro laptop, Chrome stable, **software WebGL (SwiftShader)**, 1280 x 800. No physical GPU was exercised, so there is **no claim of 60 fps** on any real device. Command: `node scripts/measure.mjs` after `npm run build` and `node scripts/serve.ts`.

| Measure | Value | Budget |
|---|---|---|
| Transfer, replay view (21 requests, uncompressed local server) | 987 KB | n/a |
| JS gzipped (all chunks) | 565 KB | 750 KB |
| Submersible GLB / seabed kit GLB | 100 KB / 52 KB | 250 / 150 KB |
| Draw calls / triangles / geometries / textures (replay view) | 47 / 44,738 / 47 / 2 | 120 / 120,000 |
| LCP | 4.7 s (shader compilation on the CPU rasteriser) | none set |
| CLS | 0 | 0.1 |
| Long-task total during load | 4.4 s | none set |
| Median / p95 frame time | 33.3 / 33.4 ms (30 fps, software) | none set |

What this does and does not say: draw calls and triangles are renderer-reported and device independent, so they are real bounds. LCP, long tasks and frame time are dominated by software rasterisation and would be far lower on a GPU, but I have not measured that. The 4.7 s LCP is an honest warning that the first frames are heavy (a custom terrain shader and 160 instanced rocks); the first mitigation to try is deferring the instanced rocks until after first paint.

Degradation: the frame loop stops when the tab is hidden; `?gfx=off` and context loss swap the canvas for the poster still; reduced motion drops all ambient animation. There is no automatic quality ladder (dpr is capped at 1.5): that is the next step if a real GPU run shows dropped frames.
