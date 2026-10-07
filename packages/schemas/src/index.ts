// Shared types + runtime validators. One definition for the generator, the API and the web app.
export type Expedition = { id: string; name: string; vessel: string; region: string; startedAt: string; endedAt: string; centre: [number, number]; metadata: { objective: string } };
export type Dive = { id: string; expeditionId: string; vehicleId: string; name: string; startedAt: string; endedAt: string; maxDepthM: number; track: [number, number, number][] };
export type Telemetry = { t: number; depthM: number; heading: number; temperatureC: number; pressureBar: number; batteryPct: number; x: number; z: number };
export type Observation = { id: string; diveId: string; t: number; type: "species" | "geology" | "structure" | "debris"; label: string; confidence: number; x: number; z: number; depthM: number; note: string };
export type Rov = { id: string; name: string; class: string; ratedDepthM: number; healthPct: number; status: "on-mission" | "standby" | "maintenance"; missionSummary: string; thrusterPct: [number, number]; batteryPct: number };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export function validateTelemetry(r: unknown): r is Telemetry {
  const o = r as Telemetry;
  return !!o && [o.t, o.depthM, o.heading, o.temperatureC, o.pressureBar, o.batteryPct, o.x, o.z].every(isNum) && o.depthM >= 0 && o.batteryPct >= 0 && o.batteryPct <= 100 && o.heading >= 0 && o.heading < 360;
}
export function validateObservation(r: unknown): r is Observation {
  const o = r as Observation;
  return !!o && typeof o.id === "string" && typeof o.label === "string" && isNum(o.confidence) && o.confidence >= 0 && o.confidence <= 1 && [o.t, o.x, o.z, o.depthM].every(isNum);
}
