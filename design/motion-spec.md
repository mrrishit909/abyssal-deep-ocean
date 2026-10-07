# Motion spec

- Depth is the navigation metaphor. Stations sit at 0 / 1,000 / 2,000 / 3,000 / 4,000 / 5,000 m. Moving to a deeper station slides the panel up from below (`slide-down`), to a shallower one from above. The wheel over open water descends/ascends one station (700 ms lock).
- Ambient: buoyancy drift on the vehicle (0.8 rad/s, 0.18 units), thruster props, sonar array spin, organism tentacle sway. All stop under Pause Motion and reduced motion.
- Sonar ping: a ring in the terrain shader, 20 units/s for 3 s, from the vehicle.
- Camera: critically damped lerp (rate 2.2/s); instant under reduced motion.
- Observations grow from a faint dot to a lit marker as the vehicle comes within 250 m.
