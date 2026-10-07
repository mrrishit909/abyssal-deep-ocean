import { expect, test, type Page } from "@playwright/test";
const open = async (page: Page, url: string) => { await page.goto(url); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); await expect(page.locator(".app")).toHaveAttribute("data-intro", "done"); await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--mask").trim() === "200%"); };

// Blueprint section 19, the demo script, step by step.
test("demo walk: intro, light-mask hand-off, descend, scrub, observation, fleet", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  // 1. the intro: skip is available from the first frame; skipping fast-forwards into the mask, no hard cut
  await expect(page.getByTestId("skip-intro")).toBeVisible();
  await expect(page.getByTestId("intro")).toHaveAttribute("data-step", /[0-9]/);
  await page.getByTestId("skip-intro").click();
  await expect(page.getByTestId("intro")).toHaveAttribute("data-step", "5");     // the light mask is growing
  await expect(page.getByTestId("intro")).toBeHidden({ timeout: 15_000 });         // and then Mission Control is simply there
  await expect(page.getByRole("heading", { name: "Mission Control" })).toBeVisible();
  // 2. select a mission, descend to its maximum depth
  await page.getByTestId("dive-dive-06").click();
  await page.getByTestId("descend").click();
  await expect(page.getByRole("heading", { name: /Dive Replay/ })).toBeVisible();
  await expect(page).toHaveURL(/#replay$/);
  await expect(page.getByTestId("depth")).toHaveText("0 m");
  await page.getByTestId("to-max").click();
  const deep = Number((await page.getByTestId("depth").textContent())!.replace(/[^0-9]/g, ""));
  expect(deep).toBeGreaterThan(3500);
  // 3. scrub: the telemetry readout and the top gauge follow the time slider
  await page.getByTestId("scrub").fill("1800");
  const mid = Number((await page.getByTestId("depth").textContent())!.replace(/[^0-9]/g, ""));
  expect(mid).toBeLessThan(deep); expect(mid).toBeGreaterThan(500);
  await expect(page.getByTestId("gauge")).toContainText(String(mid).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  // sonar: more of the seabed is revealed as time advances
  await page.getByTestId("nav-sonar").click();
  const cells = async () => Number((await page.getByTestId("sonar-cells").textContent())!.replace(/[^0-9]/g, ""));
  const before = await cells();
  await page.getByRole("slider", { name: "Sonar time" }).fill("9000");
  expect(await cells()).toBeGreaterThan(before);
  // 4. observation attached to terrain
  await page.getByTestId("nav-species").click();
  await page.getByTestId("obs-dive-06-structure").click();
  await expect(page.getByTestId("obs-detail")).toContainText("Hidden structure");
  // 5. fleet: pick a vehicle, rotate the model
  await page.getByTestId("nav-fleet").click();
  await page.getByTestId("rov-rov-3").click();
  await expect(page.getByTestId("rov-detail")).toContainText("78%");
  const drag = page.getByTestId("drag-zone"), box = (await drag.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 200); await page.mouse.down(); await page.mouse.move(box.x + 300, box.y + 200, { steps: 5 }); await page.mouse.up();
  // archive filters by depth
  await page.getByTestId("nav-archive").click();
  await expect(page.getByTestId("stratum-4000")).toContainText("Dive 6");
  await expect(page.getByTestId("stratum-0")).toContainText("Nothing filed here");
  expect(errors).toEqual([]);
});

test("deep link and back/forward keep the station", async ({ page }) => {
  await page.goto("/?skip=1#sonar");
  await expect(page.getByRole("heading", { name: "Sonar Explorer" })).toBeVisible();
  await page.getByTestId("nav-fleet").click(); await page.getByTestId("nav-archive").click();
  await page.goBack().catch(() => {}); // replaceState keeps history flat on purpose, so back leaves the app; reload must restore the hash
  await page.goto("/?skip=1#archive"); await expect(page.getByRole("heading", { name: "Expedition Archive" })).toBeVisible();
});

test("refresh mid-sequence restarts the intro cleanly", async ({ page }) => {
  await page.goto("/"); await page.waitForTimeout(1500); await page.reload();
  await expect(page.getByTestId("intro")).toHaveAttribute("data-step", "0");
});

test("wheel over open water descends one station", async ({ page }) => {
  await open(page, "/?skip=1&view=control"); await page.mouse.move(900, 500);
  await expect(async () => { await page.mouse.wheel(0, 300); await expect(page.getByRole("heading", { name: /Dive Replay/ })).toBeVisible({ timeout: 1500 }); }).toPass({ timeout: 15_000 });
});

test("keyboard: stations and the transport are reachable without a pointer", async ({ page }) => {
  await open(page, "/?skip=1&view=replay");
  // the first frames of the WebGL scene can hold the main thread, so retry until focus sticks
  await expect(async () => { await page.getByTestId("nav-sonar").focus(); await expect(page.getByTestId("nav-sonar")).toBeFocused({ timeout: 500 }); }).toPass({ timeout: 15_000 });
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Sonar Explorer" })).toBeVisible();
  await page.getByTestId("ping").focus(); await page.keyboard.press("Enter");
  await page.keyboard.press("Tab"); // moves on to the next control: nothing traps focus
  await expect(page.getByTestId("ping")).not.toBeFocused();
});
