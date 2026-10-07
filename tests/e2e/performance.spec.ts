import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
// Budgets. Frame times here are SwiftShader (CPU rasteriser) numbers: they prove the scene is bounded, not that a GPU hits 60 fps.
const out = new URL("../../apps/web/out/", import.meta.url).pathname;
const size = (dir: string): number => readdirSync(dir).reduce((a, f) => { const p = join(dir, f), s = statSync(p); return a + (s.isDirectory() ? size(p) : f.endsWith(".js") ? gzipSync(readFileSync(p)).length : 0); }, 0);

test("download weight stays inside the budget", () => {
  expect(statSync(out + "models/submersible.glb").size).toBeLessThan(250_000);
  expect(statSync(out + "models/seabed-kit.glb").size).toBeLessThan(150_000);
  expect(size(out + "_next/static/chunks")).toBeLessThan(750_000); // gzipped JS incl. three.js
});
test("scene cost: draw calls and triangles are bounded", async ({ page }) => {
  await page.goto("/?skip=1&view=replay&t=6000"); await page.waitForFunction(() => typeof (window as unknown as { __abyssalStats?: unknown }).__abyssalStats === "function", null, { timeout: 30_000 }); await page.waitForTimeout(2000);
  const st = await page.evaluate(() => (window as unknown as { __abyssalStats: () => { calls: number; triangles: number } }).__abyssalStats());
  console.log("renderer", JSON.stringify(st));
  expect(st.calls).toBeLessThan(120); expect(st.triangles).toBeLessThan(120_000);
});
test("interaction stays responsive while the canvas renders", async ({ page }) => {
  await page.goto("/?skip=1&view=replay&t=6000"); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); await page.waitForTimeout(2000);
  const t0 = Date.now(); await page.getByTestId("scrub").fill("2400"); await expect(page.getByTestId("depth")).not.toHaveText("4,100 m");
  console.log("scrub-to-readout ms", Date.now() - t0); expect(Date.now() - t0).toBeLessThan(3000);
});
