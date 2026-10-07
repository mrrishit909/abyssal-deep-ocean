---
name: motion-direction
description: GSAP timelines, easing, camera choreography and reduced-motion rules.
---

GSAP timelines, easing, camera choreography and reduced-motion rules.

- The intro is on the wall clock (`gsap.ticker.lagSmoothing(0)`); a slow GPU drops frames, it never stretches the story.
- Hand-off uses a shared object, mask or camera move. No hard cut, no fade to a homepage.
- Skip is available from the first frame and fast-forwards into the hand-off.
- Reduced motion: static keyframes plus a single enter control; continuous ambient motion off; a Pause Motion control exists.
