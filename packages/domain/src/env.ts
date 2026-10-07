// What the water looks like at a depth. The same function drives fog, light, particle speed and UI tint, so the world stays one thing.
export type Env = { fog: number; light: number; particleSpeed: number; tint: [number, number, number]; zone: string };
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export function zoneName(d: number) {
  return d < 200 ? "Epipelagic" : d < 1000 ? "Mesopelagic" : d < 4000 ? "Bathypelagic" : d < 6000 ? "Abyssopelagic" : "Hadal";
}
/** Surface light falls off by ~e-folding every 60 m; below 1,000 m none remains. */
export function envAt(depthM: number): Env {
  const d = Math.max(0, depthM);
  const light = d >= 1000 ? 0 : Math.exp(-d / 60);
  const fog = 0.002 + clamp(d / 4500) * 0.018;
  const surface: [number, number, number] = [0.03, 0.5, 0.62], deep: [number, number, number] = [0.008, 0.03, 0.05];
  const k = clamp(d / 1000);
  return { fog, light, particleSpeed: 0.25 + clamp(d / 4000) * 0.9, tint: [0, 1, 2].map((i) => surface[i] + (deep[i] - surface[i]) * k) as [number, number, number], zone: zoneName(d) };
}
/** Hydrostatic pressure in bar, seawater 1025 kg/m³ and 1 atm at the surface. */
export const pressureBar = (depthM: number) => 1.01325 + (1025 * 9.80665 * depthM) / 1e5;
