# Color system: the water column

| Token | Hex | Where it lives in the world |
|---|---|---|
| Abyss Black | #02080D | Fog and clear colour below 1,000 m; intro opening; page background |
| Deep Navy | #031A2B | Panels, the fleet backdrop |
| Bioluminescent Cyan | #13F4EF | Sonar contours, ping ring, tracks, sub lamps' rim, structure core |
| Electric Blue | #087EFC | Depth layers, vents, structure pillars, depth labels |
| Jellyfish Violet | #9D5CFF | Organisms and species markers |
| Marine White | #E7FBFF | Headlight light, body text |

The palette is an environment: `envAt(depth)` (packages/domain/src/env.ts) turns depth into fog density, surface light, particle speed and the water tint, and the same value colours the scene background, so UI and world agree.
