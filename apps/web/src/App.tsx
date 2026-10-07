"use client";
import { useEffect, useMemo, useState } from "react";
import { loadData, type Data } from "./data";
import { set, state, useStore, VIEWS } from "./store";
import Intro from "./ui/Intro";
import Panels from "./ui/Panels";
import Scene from "./scene/Scene";
import { base } from "./data";

function webglOk() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }

export default function App() {
  const s = useStore(); const [data, setData] = useState<Data | null>(null); const [err, setErr] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search), rm = matchMedia("(prefers-reduced-motion: reduce)").matches || q.get("motion") === "reduced";
    const gfx = q.get("gfx") === "off" || !webglOk() ? "poster" : "webgl";
    const view = VIEWS.find((v) => v.id === q.get("view"))?.id;
    set({ reduced: rm, pauseMotion: rm, gfx, ...(view ? { view } : {}), ...(q.get("dive") ? { diveId: q.get("dive")! } : {}), ...(q.get("t") ? { t: Number(q.get("t")) } : {}), ...(q.get("skip") === "1" || view ? { introDone: true, introStep: 99 } : {}) });
    if (q.get("skip") === "1" || view) document.documentElement.style.setProperty("--mask", "200%");
    loadData().then((d) => { if (!q.get("t") && !(q.get("skip") === "1" || view)) { const o = d.observations.find((x) => x.id === "dive-06-structure"); if (o) set({ t: Math.max(0, o.t - 60) }); } setData(d); }).catch((e) => setErr(String(e)));
  }, []);
  // Deep link + history: the view lives in the URL hash so back/forward move between stations.
  useEffect(() => {
    const onHash = () => { const v = VIEWS.find((x) => x.id === location.hash.slice(1)); if (v && v.id !== state.view) set({ prevView: state.view, view: v.id }); };
    addEventListener("hashchange", onHash); onHash(); return () => removeEventListener("hashchange", onHash);
  }, []);
  // Playback clock.
  useEffect(() => {
    if (!data) return; let raf = 0, last = performance.now();
    const tick = (n: number) => { const dt = (n - last) / 1000; last = n; if (state.playing && !document.hidden) { const end = data.telemetry[state.diveId].at(-1)!.t; const t = Math.min(end, state.t + dt * state.speed); set({ t, playing: t < end }); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [data]);
  const dive = useMemo(() => data?.dives.find((d) => d.id === s.diveId), [data, s.diveId]);
  if (err) return <div className="boot" role="alert">Could not load data: {err}</div>;
  if (!data || !dive) return <div className="boot" role="status">Powering up the vehicle…</div>;
  return (
    <div className="app" data-view={s.view} data-intro={s.introDone ? "done" : "running"} data-gfx={s.gfx}>
      {s.gfx === "webgl" ? <Scene data={data} /> : <div className="poster" style={{ backgroundImage: `url(${base}/posters/submersible.png)` }} role="img" aria-label="Still of the ABYSSAL scientific submersible in dark water" data-testid="poster" />}
      <div className="vignette" aria-hidden />
      <Panels data={data} dive={dive} />
      {!s.introDone && <Intro onDone={() => {}} />}
    </div>
  );
}
