import type { Dive, Expedition, Observation, Rov, Telemetry } from "@abyssal/schemas";
export type Data = { expeditions: Expedition[]; dives: Dive[]; telemetry: Record<string, Telemetry[]>; observations: Observation[]; fleet: Rov[] };
export const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export async function loadData(): Promise<Data> {
  const g = async <T,>(n: string) => (await fetch(`${base}/data/${n}.json`)).json() as Promise<T>;
  const [expeditions, dives, telemetry, observations, fleet] = await Promise.all([g<Expedition[]>("expeditions"), g<Dive[]>("dives"), g<Record<string, Telemetry[]>>("telemetry"), g<Observation[]>("observations"), g<Rov[]>("fleet")]);
  return { expeditions, dives, telemetry, observations, fleet };
}
