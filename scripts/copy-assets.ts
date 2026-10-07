// Copies the generated data and the validated GLBs + poster into the web app's public folder.
import { cpSync, mkdirSync } from "node:fs";
const root = new URL("../", import.meta.url).pathname, pub = root + "apps/web/public/";
mkdirSync(pub + "data", { recursive: true }); mkdirSync(pub + "models", { recursive: true }); mkdirSync(pub + "posters", { recursive: true });
cpSync(root + "data/generated", pub + "data", { recursive: true });
cpSync(root + "model/exports/submersible.glb", pub + "models/submersible.glb");
cpSync(root + "model/exports/seabed-kit.glb", pub + "models/seabed-kit.glb");
cpSync(root + "model/renders/poster.png", pub + "posters/submersible.png");
console.log("assets copied");
