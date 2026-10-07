import { defineConfig } from "@playwright/test";
// Runs against the static export served the way GitHub Pages serves it. WebGL goes through SwiftShader (software), so timings are not GPU numbers.
export default defineConfig({
  testDir: "tests/e2e", timeout: 90_000, retries: 0, workers: 1, reporter: [["list"]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  use: { baseURL: "http://127.0.0.1:8631", channel: "chrome", launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] }, viewport: { width: 1280, height: 800 } },
  webServer: { command: "node scripts/serve.ts 8631", url: "http://127.0.0.1:8631", reuseExistingServer: true },
});
