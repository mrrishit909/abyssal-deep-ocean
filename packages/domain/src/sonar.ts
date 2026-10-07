import type { Telemetry, Observation } from "@abyssal/schemas";
/** Sonar range falls with depth-independent water absorption but grows with array size; fixed 420 m here for the demo vehicle. */
export const SONAR_RANGE_M = 420;
export const SWATH_HALF_ANGLE = Math.PI / 3;
/** Cells of a grid x grid map (spanning ±half) swept by the vehicle so far: inside range and within the swath around the heading, at any sample up to time t. */
export function sweptCells(path: Telemetry[], t: number, grid: number, half: number): Set<number> {
  const out = new Set<number>(), cell = (2 * half) / grid;
  for (const p of path) {
    if (p.t > t) break;
    const h = (p.heading * Math.PI) / 180;
    const i0 = Math.max(0, Math.floor((p.x - SONAR_RANGE_M + half) / cell)), i1 = Math.min(grid - 1, Math.floor((p.x + SONAR_RANGE_M + half) / cell));
    const j0 = Math.max(0, Math.floor((p.z - SONAR_RANGE_M + half) / cell)), j1 = Math.min(grid - 1, Math.floor((p.z + SONAR_RANGE_M + half) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = -half + (i + 0.5) * cell - p.x, dz = -half + (j + 0.5) * cell - p.z, r = Math.hypot(dx, dz);
      if (r > SONAR_RANGE_M) continue;
      const bearing = Math.atan2(dx, dz), diff = Math.abs(((bearing - h + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      if (r < 60 || diff <= SWATH_HALF_ANGLE) out.add(j * grid + i);
    }
  }
  return out;
}
/** Observation opacity 0..1: it emerges from darkness as the vehicle comes within 250 m horizontally, and only once the dive has reached its timestamp. */
export function observationVisibility(o: Observation, p: Telemetry): number {
  if (p.t < o.t - 30) return 0;
  const d = Math.hypot(o.x - p.x, o.z - p.z);
  return Math.min(1, Math.max(0, (250 - d) / 150));
}
