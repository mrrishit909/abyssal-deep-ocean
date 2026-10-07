// Synthetic expeditions, dives, telemetry, observations and fleet. Deterministic (seeded). Nothing here is a real vessel, vehicle or species record.
import { mkdirSync, writeFileSync } from "node:fs";
import { mulberry32, seabedDepth, pressureBar } from "../../packages/domain/src/index.ts";
import type { Expedition, Dive, Telemetry, Observation, Rov } from "../../packages/schemas/src/index.ts";

const r = mulberry32(2026);
const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
const expeditions: Expedition[] = [
  { id: "exp-kermadec", name: "Kermadec Descent 1", vessel: "RV Halcyon (fictional)", region: "Southwest Pacific", startedAt: "2026-03-02T00:00:00Z", endedAt: "2026-03-19T00:00:00Z", centre: [-30.5, -178.2], metadata: { objective: "Map a trench wall and sample vent communities" } },
  { id: "exp-mid", name: "Mid-Atlantic Ridge Survey", vessel: "RV Meridian (fictional)", region: "North Atlantic", startedAt: "2026-05-11T00:00:00Z", endedAt: "2026-05-30T00:00:00Z", centre: [37.2, -32.1], metadata: { objective: "Hydrothermal field census" } },
  { id: "exp-abyssal", name: "Abyssal Plain Transect", vessel: "RV Halcyon (fictional)", region: "Southwest Pacific", startedAt: "2026-08-04T00:00:00Z", endedAt: "2026-08-20T00:00:00Z", centre: [-25.1, -170.9], metadata: { objective: "Photograph the abyssal plain and a suspected hidden structure" } },
];
const fleet: Rov[] = [
  { id: "rov-1", name: "ABY-1 Kestrel", class: "Work-class ROV", ratedDepthM: 6000, healthPct: 96, status: "on-mission", missionSummary: "Dive 1 of Kermadec Descent: trench wall transect.", thrusterPct: [88, 91], batteryPct: 74 },
  { id: "rov-2", name: "ABY-2 Lantern", class: "Survey AUV", ratedDepthM: 4500, healthPct: 91, status: "standby", missionSummary: "Awaiting redeploy after sonar recalibration.", thrusterPct: [93, 90], batteryPct: 100 },
  { id: "rov-3", name: "ABY-3 Ogre", class: "Heavy-lift ROV", ratedDepthM: 3000, healthPct: 78, status: "maintenance", missionSummary: "Left thruster seal replacement, back in 3 days.", thrusterPct: [61, 82], batteryPct: 40 },
  { id: "rov-4", name: "ABY-4 Wren", class: "Compact inspection ROV", ratedDepthM: 1500, healthPct: 99, status: "standby", missionSummary: "Shallow vent verification.", thrusterPct: [97, 98], batteryPct: 100 },
  { id: "rov-5", name: "ABY-5 Hadal", class: "Full-ocean-depth lander", ratedDepthM: 11000, healthPct: 88, status: "on-mission", missionSummary: "Lander descent for the abyssal transect.", thrusterPct: [0, 0], batteryPct: 63 },
];
const species = ["Dumbo octopus", "Ghost anglerfish", "Black swallower", "Vampire squid", "Sea cucumber swarm", "Giant siphonophore", "Cusk eel", "Glass sponge field"];
const geology = ["Basalt pillow flow", "Manganese nodule field", "Fault scarp", "Hydrothermal chimney"];

const dives: Dive[] = [], telemetry: Record<string, Telemetry[]> = {}, observations: Observation[] = [];
const plan = [["exp-kermadec", "rov-1", 4200, 0], ["exp-kermadec", "rov-1", 3900, 1], ["exp-mid", "rov-2", 3200, 2], ["exp-mid", "rov-2", 2800, 3], ["exp-abyssal", "rov-5", 4300, 4], ["exp-abyssal", "rov-1", 4100, 5]] as const;
plan.forEach(([expId, veh, maxDepth, n], idx) => {
  const id = `dive-${String(idx + 1).padStart(2, "0")}`, SAMPLES = 181, DURATION = 3 * 3600;
  let x = (r() - 0.5) * 1200, z = (r() - 0.5) * 1200, heading = r() * 360, battery = 100;
  const tel: Telemetry[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const u = i / (SAMPLES - 1), t = Math.round(u * DURATION);
    // descend over 40%, work the bottom 40%, ascend 20%; hug the seabed (minus 30 m) while working
    const profile = u < 0.4 ? u / 0.4 : u < 0.8 ? 1 : 1 - (u - 0.8) / 0.2;
    const floor = seabedDepth(x, z) - 30;
    const depthM = Math.min(floor, maxDepth * profile) * (u < 0.4 || u > 0.8 ? 1 : 1);
    heading = (heading + (r() - 0.5) * 24 + 360) % 360;
    if (Math.abs(x) > 1400 || Math.abs(z) > 1400) heading = (((Math.atan2(-x, -z) * 180) / Math.PI) + (r() - 0.5) * 50 + 360) % 360; // turn back toward the site centre
    const speed = u < 0.4 || u > 0.8 ? 4 : 3.2; // m per sample-step scale: x4 below
    x += Math.sin((heading * Math.PI) / 180) * speed * 20; z += Math.cos((heading * Math.PI) / 180) * speed * 20;
    x = Math.max(-1800, Math.min(1800, x)); z = Math.max(-1800, Math.min(1800, z));
    battery -= 0.2 + r() * 0.1;
    tel.push({ t, depthM: Math.round(depthM * 10) / 10, heading: Math.round(heading * 10) / 10, temperatureC: Math.round((2 + 20 * Math.exp(-depthM / 300) + r() * 0.05) * 100) / 100, pressureBar: Math.round(pressureBar(depthM) * 10) / 10, batteryPct: Math.round(battery * 10) / 10, x: Math.round(x), z: Math.round(z) });
  }
  telemetry[id] = tel;
  const start = new Date(Date.parse("2026-03-04T08:00:00Z") + idx * 9 * 86400000);
  dives.push({ id, expeditionId: expId, vehicleId: veh, name: `Dive ${idx + 1}`, startedAt: start.toISOString(), endedAt: new Date(start.getTime() + DURATION * 1000).toISOString(), maxDepthM: Math.max(...tel.map((p) => p.depthM)), track: tel.filter((_, i) => i % 6 === 0).map((p) => [p.x, p.z, p.depthM]) });
  const nObs = 8 + Math.floor(r() * 4);
  for (let k = 0; k < nObs; k++) {
    const bottom = tel.filter((p) => p.t > DURATION * 0.4), p = pick(bottom), geo = r() < 0.3;
    observations.push({ id: `${id}-obs-${k + 1}`, diveId: id, t: p.t, type: geo ? "geology" : "species", label: geo ? pick(geology) : pick(species), confidence: Math.round((0.55 + r() * 0.43) * 100) / 100, x: p.x + Math.round((r() - 0.5) * 120), z: p.z + Math.round((r() - 0.5) * 120), depthM: p.depthM, note: geo ? "Logged from sonar and camera pass." : "Single individual, drifting into the lights." });
  }
});
// The hidden structure from the intro: found on the last dive of the abyssal transect.
const last = dives[dives.length - 1], lt = telemetry[last.id].find((p) => p.t >= 7200)!;
observations.push({ id: `${last.id}-structure`, diveId: last.id, t: lt.t, type: "structure", label: "Hidden structure (unidentified, about 280 m across)", confidence: 0.62, x: lt.x + 60, z: lt.z + 90, depthM: lt.depthM, note: "Regular geometry on a sediment plain. Needs a second pass before anyone names it." });

const out = new URL("../generated/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const write = (n: string, v: unknown) => writeFileSync(out + n, JSON.stringify(v));
write("expeditions.json", expeditions); write("dives.json", dives); write("telemetry.json", telemetry); write("observations.json", observations); write("fleet.json", fleet);
console.log(`generated ${expeditions.length} expeditions, ${dives.length} dives, ${Object.values(telemetry).reduce((a, t) => a + t.length, 0)} telemetry rows, ${observations.length} observations, ${fleet.length} vehicles`);
