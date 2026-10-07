// Tiny external store. The render loop reads `live` (mutable, no React re-render per frame); the UI subscribes to `state`.
import { useSyncExternalStore } from "react";
import { Vector3 } from "three";
export type View = "control" | "replay" | "sonar" | "species" | "fleet" | "archive";
export const VIEWS: { id: View; label: string; depthM: number; blurb: string }[] = [
  { id: "control", label: "Mission Control", depthM: 0, blurb: "Pick an expedition and a dive" },
  { id: "replay", label: "Dive Replay", depthM: 1000, blurb: "Scrub the dive" },
  { id: "sonar", label: "Sonar Explorer", depthM: 2000, blurb: "Reveal the seabed" },
  { id: "species", label: "Observations", depthM: 3000, blurb: "What the lights found" },
  { id: "fleet", label: "ROV Fleet", depthM: 4000, blurb: "The vehicles" },
  { id: "archive", label: "Expedition Archive", depthM: 5000, blurb: "Everything, by depth" },
];
export type State = { view: View; prevView: View; diveId: string; selObs: string | null; selRov: string; playing: boolean; speed: number; introDone: boolean; introStep: number; reduced: boolean; pauseMotion: boolean; gfx: "webgl" | "poster"; pingAt: number; t: number };
export const state: State = { view: "control", prevView: "control", diveId: "dive-06", selObs: null, selRov: "rov-1", playing: false, speed: 120, introDone: false, introStep: 0, reduced: false, pauseMotion: false, gfx: "webgl", pingAt: -99, t: 0 };
/** Mutable per-frame values for the canvas; not reactive. */
export const live = { introDepth: 0, lightK: 0, fade: 1, drag: 0, creatureK: 0, subPos: new Vector3(), subDir: new Vector3(0, 0, -1), structure: new Vector3() };
let snap = { ...state };
const subs = new Set<() => void>();
export function set(p: Partial<State>) { Object.assign(state, p); snap = { ...state }; subs.forEach((f) => f()); }
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => snap, () => snap);
