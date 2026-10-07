// Deterministic synthetic bathymetry: bilinear value noise over a lattice, plus a trench. Units: metres, x/z east/north from the site centre.
import { mulberry32 } from "./rng.ts";
const N = 64;
function lattice(seed: number) {
  const r = mulberry32(seed);
  return Float64Array.from({ length: N * N }, () => r());
}
const L = lattice(4207);
const sm = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, z: number) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = sm(x - xi), fz = sm(z - zi);
  const g = (i: number, j: number) => L[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
  const a = g(xi, zi) + (g(xi + 1, zi) - g(xi, zi)) * fx;
  const b = g(xi, zi + 1) + (g(xi + 1, zi + 1) - g(xi, zi + 1)) * fx;
  return a + (b - a) * fz;
}
/** Seabed depth in metres (positive down) at (x, z). Site spans about ±3 km; mean 4,000 m, a trench running diagonally. */
export function seabedDepth(x: number, z: number): number {
  const s = 1 / 700;
  const rough = noise(x * s, z * s) * 0.65 + noise(x * s * 2.3, z * s * 2.3) * 0.25 + noise(x * s * 5, z * s * 5) * 0.1;
  const trench = Math.exp(-(((x + z) / 1.4142) ** 2) / (2 * 450 ** 2)) * 380;
  return 3750 + rough * 420 + trench;
}
/** Grid of depths for rendering/tiling: n x n samples over [-half, half]. */
export function heightGrid(n: number, half: number): Float32Array {
  const out = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) out[j * n + i] = seabedDepth(-half + (2 * half * i) / (n - 1), -half + (2 * half * j) / (n - 1));
  return out;
}
/** Slippy-style tile: z=0 is the whole site. Returns 17x17 samples so neighbouring tiles share edges. */
export function bathymetryTile(z: number, x: number, y: number, half = 3000): { z: number; x: number; y: number; size: number; depths: number[] } {
  const n = 2 ** z, span = (2 * half) / n, size = 17, depths: number[] = [];
  if (x < 0 || y < 0 || x >= n || y >= n) throw new RangeError("tile out of range");
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++)
    depths.push(Math.round(seabedDepth(-half + x * span + (span * i) / (size - 1), -half + y * span + (span * j) / (size - 1)) * 10) / 10);
  return { z, x, y, size, depths };
}
