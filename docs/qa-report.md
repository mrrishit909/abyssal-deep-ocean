# QA report

Run on Apple M3 Pro, Chrome (stable), Playwright 1.63, WebGL through SwiftShader. Last full run: 18 e2e passed (three consecutive green runs), 24 unit/API tests passed.

| Matrix row (blueprint 18) | Covered by | Result |
|---|---|---|
| Intro: first load, skip, refresh mid-sequence | demo walk, "refresh mid-sequence" | pass |
| Intro: replay | not covered: reload is the replay, covered by refresh test | n/a |
| Input: click, drag, keyboard | demo walk (click, drag on the fleet model), keyboard test (focus, Enter, Tab) | pass |
| Input: touch/pointer | the drag zone uses pointer events with `touch-action: none`; exercised with mouse only | partial |
| Scroll: wheel, deep link | "wheel descends one station", "deep link keeps the station" | pass |
| Scroll: fast, reverse | wheel is rate-limited to 700 ms; reverse direction not tested | partial |
| Responsive | phone width 390 px: no horizontal overflow, table visible | pass (one size) |
| Motion: reduced | "reduced motion" test: static keyframes, no panel animation, same navigation | pass |
| Graphics: success | all WebGL tests | pass |
| Graphics: failure and context loss | "graphics failure", "context loss falls back to the poster" | pass |
| Graphics: slow GPU | SwiftShader is the slow GPU: median frame 33 ms | pass as a bound |
| Lifecycle: tab hidden | frame loop pauses on `visibilitychange`; not automated | manual only |
| Lifecycle: route change, back/forward | stations use `replaceState`, so back leaves the app; reload restores the hash | by design |
| Visual regression | 5 product states against the poster fallback | pass |
| Performance | tests/e2e/performance.spec.ts | pass |

A flake found and fixed during this work: the first WebGL frames hold the main thread for a few hundred milliseconds, and in that window `focus()` on a nav button can fail. The tests now wait for the scene's mount hook and retry the focus step. Real users on a GPU do not see this window, but a slow device might; it is a note for the performance backlog.
