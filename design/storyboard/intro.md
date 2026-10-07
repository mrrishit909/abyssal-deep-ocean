# Intro storyboard (about 22 s, wall clock, skippable from the first frame)

| t (s) | Shot | What moves |
|---|---|---|
| 0.0 | Pure black. A sonar ping ring expands. | Depth meter 0 m |
| 1.4 | Descent. 50 / 200 / 1,000 / 4,000 m ticks light up as passed. Particles drift upward, surface light dies by 1,000 m. | Camera falls with the meter (power2.in), fog thickens |
| 11.2 | The Blender submersible is in frame; spotlights power on. | Lamp intensity 0 to 1 |
| 13.6 | A violet organism crosses behind the vehicle and lights the scene. | `live.creatureK` 0 to 1, a point light that peaks mid-crossing |
| 17.4 | A ring of pillars is in the beam. Headlights widen. | Spot angle and intensity up, terrain lamp pool grows |
| 19.8 | The widening light becomes a circular mask; Mission Control exists only inside it and the mask grows to cover the screen. | CSS `--mask` drives HUD `clip-path` and the light edge |

Hand-off: the same canvas, the same vehicle and the same lamps persist; the only thing that changes is that the HUD appears inside the light. There is no separate homepage.
Reduced motion: four static keyframes and one "Enter Mission Control" button.
