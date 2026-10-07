// ABYSSAL API: the book's section 12 contract over the generated dataset. Plain node:http + ws, no framework.
// Telemetry is paged (never the raw firehose); the live socket replays a dive at an accelerated clock. In-memory notes are the one mutation (idempotent).
import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { WebSocketServer } from "ws";
import { bathymetryTile } from "../../../packages/domain/src/index.ts";
import type { Dive, Expedition, Observation, Rov, Telemetry } from "../../../packages/schemas/src/index.ts";

const load = <T,>(n: string) => JSON.parse(readFileSync(new URL(`../../../data/generated/${n}.json`, import.meta.url), "utf8")) as T;
export const openapi = {
  openapi: "3.1.0", info: { title: "ABYSSAL API", version: "1.0.0", description: "Synthetic deep-ocean demo data." },
  paths: {
    "/v1/expeditions": { get: { summary: "List expeditions" } }, "/v1/dives/{id}": { get: { summary: "One dive with its track" } },
    "/v1/dives/{id}/telemetry": { get: { summary: "Telemetry, paged (limit<=500, cursor) and optionally decimated (step)" } },
    "/v1/dives/{id}/observations": { get: { summary: "Observations for a dive" } }, "/v1/dives/{id}/observations/{oid}/notes": { post: { summary: "Add a note; requires Idempotency-Key" } },
    "/v1/bathymetry/tiles/{z}/{x}/{y}": { get: { summary: "17x17 depth tile" } }, "/v1/fleet": { get: { summary: "ROV fleet" } },
    "/v1/dives/{id}/live": { get: { summary: "WebSocket: replays telemetry as live frames (query speed=1..600)" } },
  },
};

export function build(opts: { port?: number } = {}) {
  const expeditions = load<Expedition[]>("expeditions"), dives = load<Dive[]>("dives"), telemetry = load<Record<string, Telemetry[]>>("telemetry"), observations = load<Observation[]>("observations"), fleet = load<Rov[]>("fleet");
  const notes = new Map<string, { id: string; obsId: string; text: string }>(); // keyed by idempotency key
  const send = (res: ServerResponse, code: number, body: unknown) => { res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,idempotency-key" }); res.end(JSON.stringify(body)); };
  const err = (res: ServerResponse, code: number, message: string) => send(res, code, { error: message });
  async function body(req: IncomingMessage) { let s = ""; for await (const c of req) { s += c; if (s.length > 10_000) throw new RangeError("body too large"); } return s ? JSON.parse(s) : {}; }

  const server: Server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url ?? "/", "http://x"), p = u.pathname.replace(/\/+$/, "") || "/", m = req.method ?? "GET";
      if (m === "OPTIONS") return send(res, 204, {});
      if (p === "/openapi.json") return send(res, 200, openapi);
      if (p === "/healthz") return send(res, 200, { ok: true });
      if (p === "/v1/expeditions" && m === "GET") return send(res, 200, expeditions);
      if (p === "/v1/fleet" && m === "GET") return send(res, 200, fleet);
      let g: RegExpMatchArray | null;
      if ((g = p.match(/^\/v1\/bathymetry\/tiles\/(\d+)\/(\d+)\/(\d+)$/)) && m === "GET") {
        const [z, x, y] = g.slice(1).map(Number); if (z > 6) return err(res, 400, "z must be 0..6");
        try { return send(res, 200, bathymetryTile(z, x, y)); } catch { return err(res, 404, "tile out of range"); }
      }
      if ((g = p.match(/^\/v1\/dives\/([\w-]+)(?:\/(telemetry|observations))?$/)) && m === "GET") {
        const dive = dives.find((d) => d.id === g![1]); if (!dive) return err(res, 404, "no such dive");
        if (!g[2]) return send(res, 200, dive);
        if (g[2] === "observations") return send(res, 200, observations.filter((o) => o.diveId === dive.id));
        const limit = Math.min(500, Math.max(1, Number(u.searchParams.get("limit") ?? 100))), cursor = Math.max(0, Number(u.searchParams.get("cursor") ?? 0)), step = Math.max(1, Number(u.searchParams.get("step") ?? 1));
        if (![limit, cursor, step].every(Number.isFinite)) return err(res, 400, "limit, cursor and step must be numbers");
        const all = telemetry[dive.id].filter((_, i) => i % step === 0), items = all.slice(cursor, cursor + limit);
        return send(res, 200, { items, total: all.length, nextCursor: cursor + limit < all.length ? cursor + limit : null });
      }
      if ((g = p.match(/^\/v1\/dives\/([\w-]+)\/observations\/([\w-]+)\/notes$/)) && m === "POST") {
        const key = req.headers["idempotency-key"]; if (typeof key !== "string" || !key) return err(res, 400, "Idempotency-Key header required");
        if (!observations.some((o) => o.id === g![2] && o.diveId === g![1])) return err(res, 404, "no such observation");
        const b = await body(req); if (typeof b.text !== "string" || !b.text.trim() || b.text.length > 500) return err(res, 422, "text must be 1..500 characters");
        const prior = notes.get(key); if (prior) return send(res, 200, prior);
        const note = { id: `note-${notes.size + 1}`, obsId: g[2], text: b.text.trim() }; notes.set(key, note);
        return send(res, 201, note);
      }
      return err(res, 404, "not found");
    } catch (e) { return err(res, e instanceof SyntaxError || e instanceof RangeError ? 400 : 500, e instanceof Error ? e.message : "error"); }
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const u = new URL(req.url ?? "/", "http://x"), g = u.pathname.match(/^\/v1\/dives\/([\w-]+)\/live$/), tel = g && telemetry[g[1]];
    if (!tel) { socket.destroy(); return; }
    const speed = Math.min(600, Math.max(1, Number(u.searchParams.get("speed") ?? 60)));
    wss.handleUpgrade(req, socket, head, (ws) => {
      let i = 0; const t = setInterval(() => { if (i >= tel.length) { ws.send(JSON.stringify({ done: true })); ws.close(); return; } ws.send(JSON.stringify(tel[i++])); }, Math.max(5, 1000 / speed * 60));
      ws.on("close", () => clearInterval(t));
    });
  });
  return { server, listen: (port = opts.port ?? 8630) => new Promise<number>((r) => server.listen(port, () => r((server.address() as { port: number }).port))), close: () => { wss.close(); return new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }); } };
}
if (import.meta.url === `file://${process.argv[1]}`) build().listen().then((p) => console.log(`ABYSSAL API on :${p}`));
