---
name: interactive-qa
description: click/drag/hover/idle/scroll/mobile/reduced-motion/graphics-failure/keyboard/hidden-tab testing.
---

click/drag/hover/idle/scroll/mobile/reduced-motion/graphics-failure/keyboard/hidden-tab testing.

Wait for scene effects before interacting (first WebGL frames hold the main thread): wait for the stats hook, then act. Retry focus-sensitive steps with `expect(...).toPass()`. Visual baselines use the poster fallback because WebGL output is not bit-stable.
