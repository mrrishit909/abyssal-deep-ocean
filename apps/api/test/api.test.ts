import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { build } from "../src/server.ts";

const api = build(); let base = "", port = 0;
beforeAll(async () => { port = await api.listen(0); base = `http://127.0.0.1:${port}`; });
afterAll(() => api.close());
const j = async (path: string, init?: RequestInit) => { const r = await fetch(base + path, init); return { status: r.status, body: await r.json() as any }; };

describe("contract", () => {
  it("lists expeditions, fleet and publishes OpenAPI 3.1", async () => {
    expect((await j("/v1/expeditions")).body).toHaveLength(3);
    expect((await j("/v1/fleet")).body).toHaveLength(5);
    expect((await j("/openapi.json")).body.openapi).toBe("3.1.0");
  });
  it("returns a dive and 404s an unknown one", async () => {
    expect((await j("/v1/dives/dive-01")).body.track.length).toBeGreaterThan(10);
    expect((await j("/v1/dives/nope")).status).toBe(404);
  });
  it("pages telemetry with a cursor and never exceeds the limit cap", async () => {
    const a = (await j("/v1/dives/dive-01/telemetry?limit=50")).body;
    expect(a.items).toHaveLength(50); expect(a.nextCursor).toBe(50); expect(a.total).toBe(181);
    const b = (await j(`/v1/dives/dive-01/telemetry?limit=9999&cursor=${a.nextCursor}`)).body;
    expect(b.items.length).toBeLessThanOrEqual(500); expect(b.items[0].t).toBeGreaterThan(a.items[49].t);
    expect((await j("/v1/dives/dive-01/telemetry?step=10&limit=500")).body.total).toBe(19);
    expect((await j("/v1/dives/dive-01/telemetry?limit=abc")).status).toBe(400);
  });
  it("filters observations by dive", async () => {
    const o = (await j("/v1/dives/dive-06/observations")).body as any[];
    expect(o.every((x) => x.diveId === "dive-06")).toBe(true); expect(o.some((x) => x.type === "structure")).toBe(true);
  });
  it("serves bathymetry tiles and rejects bad ones", async () => {
    const t = (await j("/v1/bathymetry/tiles/2/1/3")).body; expect(t.depths).toHaveLength(289);
    expect((await j("/v1/bathymetry/tiles/2/9/0")).status).toBe(404);
    expect((await j("/v1/bathymetry/tiles/9/0/0")).status).toBe(400);
  });
});
describe("idempotent notes", () => {
  const post = (key: string | null, text: unknown, id = "dive-06-structure") => j(`/v1/dives/dive-06/observations/${id}/notes`, { method: "POST", headers: { "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) }, body: JSON.stringify({ text }) });
  it("requires the key, validates text, replays safely", async () => {
    expect((await post(null, "hi")).status).toBe(400);
    expect((await post("k1", "")).status).toBe(422);
    expect((await post("k1", "x".repeat(501))).status).toBe(422);
    expect((await post("k1", "Second pass needed", "missing")).status).toBe(404);
    const a = await post("k2", "Second pass needed"), b = await post("k2", "Second pass needed");
    expect(a.status).toBe(201); expect(b.status).toBe(200); expect(b.body.id).toBe(a.body.id);
  });
});
describe("live socket", () => {
  it("streams telemetry frames and rejects unknown dives", async () => {
    const frames = await new Promise<any[]>((res) => { const got: any[] = [], ws = new WebSocket(`ws://127.0.0.1:${port}/v1/dives/dive-01/live?speed=600`); ws.on("message", (m) => { got.push(JSON.parse(String(m))); if (got.length === 3) { ws.close(); res(got); } }); });
    expect(frames.map((f) => f.t)).toEqual([0, 60, 120]);
    await new Promise<void>((res) => { const ws = new WebSocket(`ws://127.0.0.1:${port}/v1/dives/none/live`); ws.on("error", () => res()); });
  });
});
