# ABYSSAL

Deep-ocean exploration demo (blueprint 01, Advanced Engineering Build Book Vol. VII). The public site is static; the Blender asset is scripted.

- Build the asset: `npm run model` (needs Blender 4.5 at ~/Applications). Then `node scripts/copy-assets.ts`.
- Data: `npm run seed` (deterministic, synthetic). Tests: `npm test` (domain + API), `npm run e2e` after `npm run build`.
- Worlds: 1 scene unit = 10 m, depth is drawn at 0.02 units/m, vehicle drawn 4x. x east, scene z = -north.
- Multi-agent is the DEVELOPMENT process (see .claude/agents); the product contains no agents.
- Everything in the UI is synthetic. Do not present it as real survey data.
