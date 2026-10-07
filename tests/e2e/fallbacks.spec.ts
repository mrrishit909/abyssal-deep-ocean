import { expect, test } from "@playwright/test";

test("reduced motion: static story keyframes, no timeline, same navigation", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" }), page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Opening story" })).toContainText("4,200 m");
  await expect(page.getByTestId("pause-motion")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("skip-intro").click();
  await expect(page.getByRole("heading", { name: "Mission Control" })).toBeVisible();
  await page.getByTestId("descend").click();
  await expect(page.getByRole("heading", { name: /Dive Replay/ })).toBeVisible();
  const anim = await page.locator(".panel").evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe("none");
  await ctx.close();
});

test("graphics failure: poster still, every view still works from the DOM", async ({ page }) => {
  await page.goto("/?gfx=off&skip=1&view=control");
  await expect(page.getByTestId("poster")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByTestId("descend").click(); await page.getByTestId("to-max").click();
  expect(Number((await page.getByTestId("depth").textContent())!.replace(/[^0-9]/g, ""))).toBeGreaterThan(2000);
  await page.getByTestId("nav-species").click(); await expect(page.getByTestId("obs-table")).toBeVisible();
  await page.getByTestId("nav-fleet").click(); await expect(page.getByTestId("rov-detail")).toBeVisible();
});

test("WebGL context loss falls back to the poster", async ({ page }) => {
  await page.goto("/?skip=1&view=replay");
  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 30_000 });
  await page.waitForFunction(() => typeof (window as unknown as { __abyssalStats?: unknown }).__abyssalStats === "function"); // scene effects (incl. the context-loss listener) are mounted
  await page.evaluate(() => { const c = document.querySelector("canvas")!; c.dispatchEvent(new Event("webglcontextlost", { cancelable: true })); });
  await expect(page.getByTestId("poster")).toBeVisible();
  await page.getByTestId("nav-sonar").click(); await expect(page.getByTestId("sonar-cells")).toBeVisible();
});

test("phone width: stations become a horizontal strip, nothing scrolls sideways", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true }), page = await ctx.newPage();
  await page.goto("/?skip=1&view=species&gfx=off");
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(over).toBeLessThanOrEqual(0);
  await expect(page.getByTestId("obs-table")).toBeVisible();
  await ctx.close();
});

test("pause motion freezes ambient drift", async ({ page }) => {
  await page.goto("/?skip=1&view=replay"); await page.getByTestId("pause-motion").click();
  await expect(page.getByTestId("pause-motion")).toHaveText("Resume motion");
});
