import type { Telemetry } from "@abyssal/schemas";
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpAngle = (a: number, b: number, k: number) => (a + ((((b - a) % 360) + 540) % 360 - 180) * k + 360) % 360;
/** Telemetry sampled at time t (seconds from dive start); clamps outside the dive. Heading takes the short way round. */
export function sampleAt(tel: Telemetry[], t: number): Telemetry {
  if (!tel.length) throw new Error("empty telemetry");
  if (t <= tel[0].t) return tel[0];
  const last = tel[tel.length - 1];
  if (t >= last.t) return last;
  let lo = 0, hi = tel.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tel[m].t <= t) lo = m; else hi = m; }
  const a = tel[lo], b = tel[hi], k = (t - a.t) / (b.t - a.t);
  return { t, depthM: lerp(a.depthM, b.depthM, k), heading: lerpAngle(a.heading, b.heading, k), temperatureC: lerp(a.temperatureC, b.temperatureC, k), pressureBar: lerp(a.pressureBar, b.pressureBar, k), batteryPct: lerp(a.batteryPct, b.batteryPct, k), x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k) };
}
