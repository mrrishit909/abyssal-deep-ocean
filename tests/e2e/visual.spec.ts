import { expect, test } from "@playwright/test";
// Visual regression on the product surfaces with the canvas swapped for the poster (WebGL output is not bit-stable across GPUs).
for (const view of ["control", "replay", "species", "fleet", "archive"]) {
  test(`visual: ${view}`, async ({ page }) => {
    await page.goto(`/?gfx=off&skip=1&view=${view}&t=3000`); await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
    await expect(page.getByTestId("hud")).toBeVisible(); await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`${view}.png`);
  });
}
