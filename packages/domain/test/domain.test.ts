import { describe, expect, it } from "vitest";
import { bathymetryTile, envAt, pressureBar, sampleAt, seabedDepth, sweptCells, observationVisibility, zoneName, mulberry32, heightGrid, SONAR_RANGE_M } from "../src/index.ts";
import { validateObservation, validateTelemetry, type Telemetry } from "@abyssal/schemas";

const tel = (t: number, x: number, z: number, heading = 0, depthM = 1000): Telemetry => ({ t, x, z, heading, depthM, temperatureC: 4, pressureBar: pressureBar(depthM), batteryPct: 90 - t / 100 });

describe("terrain", () => {
  it("is deterministic and in a plausible depth band", () => {
    expect(seabedDepth(100, -200)).toBe(seabedDepth(100, -200));
    for (const [x, z] of [[0, 0], [2900, 2900], [-2900, 1500]]) expect(seabedDepth(x, z)).toBeGreaterThan(3500);
  });
  it("the diagonal trench is deeper on average than ground 1.5 km off its axis", () => {
    const mean = (f: (k: number) => [number, number]) => Array.from({ length: 60 }, (_, k) => seabedDepth(...f(k))).reduce((a, b) => a + b) / 60;
    const on = mean((k) => [-1500 + k * 50, 1500 - k * 50]), off = mean((k) => [-1500 + k * 50 + 1500, 1500 - k * 50 + 1500]);
    expect(on).toBeGreaterThan(off);
  });
  it("neighbouring tiles share their edge samples", () => {
    const a = bathymetryTile(1, 0, 0), b = bathymetryTile(1, 1, 0);
    for (let j = 0; j < 17; j++) expect(a.depths[j * 17 + 16]).toBe(b.depths[j * 17]);
  });
  it("rejects out-of-range tiles", () => expect(() => bathymetryTile(1, 2, 0)).toThrow(RangeError));
  it("heightGrid has n*n samples", () => expect(heightGrid(8, 1000)).toHaveLength(64));
});
describe("depth environment", () => {
  it("light vanishes by 1,000 m and fog thickens with depth", () => {
    expect(envAt(0).light).toBe(1); expect(envAt(1000).light).toBe(0);
    expect(envAt(4000).fog).toBeGreaterThan(envAt(50).fog);
    expect(envAt(4000).particleSpeed).toBeGreaterThan(envAt(0).particleSpeed);
  });
  it("names the zones at their boundaries", () => {
    expect([199, 200, 999, 1000, 3999, 4000, 5999, 6000].map(zoneName)).toEqual(["Epipelagic", "Mesopelagic", "Mesopelagic", "Bathypelagic", "Bathypelagic", "Abyssopelagic", "Abyssopelagic", "Hadal"]);
  });
  it("pressure is about 400 bar at 4,000 m", () => expect(pressureBar(4000)).toBeCloseTo(403.1, 0));
  it("negative depth clamps to the surface", () => expect(envAt(-5).light).toBe(1));
});
describe("replay", () => {
  const path = [tel(0, 0, 0, 350), tel(100, 100, 200, 10), tel(200, 300, 200, 90)];
  it("clamps outside the dive", () => { expect(sampleAt(path, -5)).toBe(path[0]); expect(sampleAt(path, 999)).toBe(path[2]); });
  it("interpolates position and takes the short way round on heading", () => {
    const s = sampleAt(path, 50);
    expect(s.x).toBeCloseTo(50); expect(s.z).toBeCloseTo(100); expect(s.heading).toBeCloseTo(0);
  });
  it("throws on empty telemetry", () => expect(() => sampleAt([], 0)).toThrow());
});
describe("sonar", () => {
  const p = [tel(0, 0, 0, 0), tel(10, 0, 100, 0)];
  it("only reveals cells the vehicle has passed", () => {
    expect(sweptCells(p, -1, 60, 3000).size).toBe(0);
    expect(sweptCells(p, 0, 60, 3000).size).toBeLessThan(sweptCells(p, 10, 60, 3000).size);
  });
  it("reveals ahead of the heading, not behind, beyond the near field", () => {
    const grid = 60, half = 3000, cell = 100, s = sweptCells([tel(0, 0, 0, 0)], 0, grid, half);
    const idx = (x: number, z: number) => Math.floor((z + half) / cell) * grid + Math.floor((x + half) / cell);
    expect(s.has(idx(0, 300))).toBe(true); expect(s.has(idx(0, -300))).toBe(false);
    expect(s.has(idx(0, SONAR_RANGE_M + 200))).toBe(false);
  });
  it("observations emerge with proximity and not before their time", () => {
    const o = { id: "o", diveId: "d", t: 100, type: "species" as const, label: "x", confidence: 0.9, x: 0, z: 0, depthM: 1, note: "" };
    expect(observationVisibility(o, tel(10, 0, 0))).toBe(0);
    expect(observationVisibility(o, tel(100, 0, 0))).toBe(1);
    expect(observationVisibility(o, tel(100, 0, 400))).toBe(0);
    expect(observationVisibility(o, tel(100, 0, 175))).toBeCloseTo(0.5);
  });
});
describe("schemas + rng", () => {
  it("validators reject bad records", () => {
    expect(validateTelemetry(tel(0, 0, 0))).toBe(true);
    expect(validateTelemetry({ ...tel(0, 0, 0), batteryPct: 120 })).toBe(false);
    expect(validateTelemetry({ ...tel(0, 0, 0), depthM: NaN })).toBe(false);
    expect(validateObservation({ id: "a", label: "b", confidence: 2, t: 0, x: 0, z: 0, depthM: 0 })).toBe(false);
  });
  it("rng repeats per seed", () => { const a = mulberry32(5), b = mulberry32(5); expect([a(), a()]).toEqual([b(), b()]); });
});
