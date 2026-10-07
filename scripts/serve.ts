// Serves apps/web/out the way GitHub Pages would. Usage: node scripts/serve.ts [port] [mountPath]
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join } from "node:path";
const root = new URL("../apps/web/out/", import.meta.url).pathname, port = Number(process.argv[2] ?? 8631), mount = process.argv[3] ?? "";
const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml", ".mp4": "video/mp4" };
createServer((req, res) => {
  let p = decodeURIComponent((req.url ?? "/").split("?")[0]); if (mount && p.startsWith(mount)) p = p.slice(mount.length) || "/";
  let f = join(root, p); if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": types[extname(f)] ?? "application/octet-stream" }); res.end(readFileSync(f));
}).listen(port, () => console.log(`http://127.0.0.1:${port}${mount}/`));
