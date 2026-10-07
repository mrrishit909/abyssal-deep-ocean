// Hook: after an edit, if model/build.py changed remind the agent to re-run build + validate (the GLB is a build artefact).
import { readFileSync } from "node:fs";
let input = ""; try { input = readFileSync(0, "utf8"); } catch {}
if (/model\/build\.py/.test(input)) console.error("model/build.py changed: run `npm run model` (build + fresh-import validate), then `node scripts/copy-assets.ts`.");
