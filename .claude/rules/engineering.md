# Engineering rules

- No fabricated numbers: every figure in the UI or docs comes from the synthetic generator or a measured run, and says so.
- Synthetic data only in the public demo; adapters for real data are listed, not faked.
- Keep each change reviewable: one agent, one worktree, one concern.
- Do not copy code or assets from the reference blender-to-web repository; all assets here are original and scripted.
- Run `npm test` and `npm run e2e` before claiming done; report failures as they are.
