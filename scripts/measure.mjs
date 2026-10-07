// Measures load + frame cost in the static export. Usage: node scripts/measure.mjs [url]. SwiftShader (CPU) rendering: these are bounds, not GPU numbers.
import { chromium } from "playwright";
const url = process.argv[2] ?? "http://127.0.0.1:8631/?skip=1&view=replay&t=6000";
const b = await chromium.launch({ channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
let bytes = 0, reqs = 0; p.on("response", async (r) => { reqs++; try { bytes += (await r.body()).length; } catch {} });
await p.addInitScript(() => { window.__m = { lcp: 0, cls: 0, long: 0 }; new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__m.lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__m.cls += e.value; })).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__m.long += e.duration))).observe({ type: "longtask", buffered: true }); });
await p.goto(url); await p.waitForFunction(() => typeof window.__abyssalStats === "function"); await p.waitForTimeout(1500);
const frames = await p.evaluate(() => new Promise((res) => { const t = []; let last = performance.now(); const f = (n) => { t.push(n - last); last = n; if (t.length < 90) requestAnimationFrame(f); else res(t); }; requestAnimationFrame(f); }));
const m = await p.evaluate(() => ({ ...window.__m, stats: window.__abyssalStats() }));
frames.sort((a, c) => a - c);
console.log(JSON.stringify({ transferKB: Math.round(bytes / 1024), requests: reqs, lcpMs: Math.round(m.lcp), cls: +m.cls.toFixed(3), longTaskMs: Math.round(m.long), medianFrameMs: +frames[45].toFixed(1), p95FrameMs: +frames[85].toFixed(1), renderer: m.stats }, null, 1));
await b.close();
