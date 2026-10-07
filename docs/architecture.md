# Architecture

```
model/build.py ──Blender──> source.blend + exports/{submersible,seabed-kit}.glb + renders/poster.png
model/validate.py ─fresh-scene re-import─> exports/validation.json (fails the build on any contract breach)
data/simulators/generate.ts ──> data/generated/*.json (seeded, synthetic)
        │                              │
scripts/copy-assets.ts ──────────> apps/web/public/{data,models,posters}
                                       │
apps/web (Next.js 16 static export) ───┘      apps/api (node:http + ws) serves the same JSON on the book's /v1 contract
   App ─ store (external, useSyncExternalStore) ─ Panels (all DOM) + Scene (R3F canvas) + Intro (GSAP)
packages/domain: terrain, depth environment, replay interpolation, sonar coverage, observation visibility (pure, tested)
packages/schemas: shared types + runtime validators
```

**Client/server boundary.** The public demo is static: no server is needed and the same JSON the API returns is fetched as files. `apps/api` implements the blueprint's section 12 contract (paged telemetry, tiles, observations, fleet, an idempotent notes mutation, a WebSocket replay) so the UI could be pointed at it; the UI does not call it in the static build.

**State.** One external store holds product state (view, dive, replay time, selection, flags). The render loop reads the mutable `live` object and `state` directly, so a playback tick never re-renders React. Panels subscribe through `useStore`.

**Units.** 1 scene unit = 10 m horizontally; depth is drawn 0.02 units per metre (4,200 m = 84 units) and the vehicle is drawn 4x so it reads. These are presentation scales, stated in the UI copy where it matters.

**Budgets** (asserted in tests/e2e/performance.spec.ts): submersible GLB < 250 KB, seabed kit < 150 KB, gzipped JS < 750 KB, draw calls < 120, triangles < 120,000.

**Not built.** PostgreSQL/PostGIS and TimescaleDB (the schema in the book is the target; the demo reads JSON), MapLibre/deck.gl overlays, FastAPI (the API is Node, the contract is the same), object storage, KTX2/Meshopt (the assets are small enough that they are not needed), Docker services beyond web and api, OpenTelemetry, auth.
