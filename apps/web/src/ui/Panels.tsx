"use client";
import { useEffect, useMemo, useRef } from "react";
import { envAt, sampleAt, sweptCells, pressureBar, zoneName } from "@abyssal/domain";
import type { Dive, Observation } from "@abyssal/schemas";
import type { Data } from "../data";
import { live, set, state, useStore, VIEWS, type View } from "../store";

const m = (n: number) => Math.round(n).toLocaleString("en-US");
const hms = (t: number) => `${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const go = (v: View) => { if (v === state.view) return; set({ prevView: state.view, view: v }); history.replaceState(null, "", `#${v}`); };

function Profile({ data, dive, t }: { data: Data; dive: Dive; t: number }) {
  const tel = data.telemetry[dive.id], W = 560, H = 120, T = tel.at(-1)!.t, D = Math.max(...tel.map((p) => p.depthM));
  const pts = tel.map((p) => `${(p.t / T) * W},${(p.depthM / D) * (H - 10) + 5}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="profile" role="img" aria-label={`Depth profile of ${dive.name}: surface to ${m(D)} metres and back`}>
      <polyline points={pts} fill="none" stroke="#13F4EF" strokeWidth="1.6" />
      <line x1={(t / T) * W} x2={(t / T) * W} y1="0" y2={H} stroke="#E7FBFF" strokeWidth="1" />
    </svg>
  );
}

function Readout({ data, dive }: { data: Data; dive: Dive }) {
  const s = useStore(), p = sampleAt(data.telemetry[dive.id], s.t), e = envAt(p.depthM);
  return (
    <dl className="readout" data-testid="readout">
      <div><dt>Depth</dt><dd data-testid="depth">{m(p.depthM)} m</dd></div><div><dt>Zone</dt><dd>{zoneName(p.depthM)}</dd></div>
      <div><dt>Heading</dt><dd>{m(p.heading)}°</dd></div><div><dt>Temp</dt><dd>{p.temperatureC.toFixed(1)} °C</dd></div>
      <div><dt>Pressure</dt><dd>{m(pressureBar(p.depthM))} bar</dd></div><div><dt>Battery</dt><dd>{p.batteryPct.toFixed(0)}%</dd></div>
      <div><dt>Surface light</dt><dd>{e.light > 0.01 ? `${(e.light * 100).toFixed(0)}%` : "none"}</dd></div>
    </dl>
  );
}

function Control({ data, dive }: { data: Data; dive: Dive }) {
  return (
    <section aria-labelledby="h-control"><h2 id="h-control">Mission Control</h2>
      <p className="lede">Three expeditions, six dives, all synthetic. Pick a dive; the map behind this panel draws every track and four depth layers (1,000 to 4,000 m).</p>
      {data.expeditions.map((x) => (
        <div key={x.id} className="exp"><h3>{x.name}</h3><p className="faint">{x.vessel} · {x.region} · {x.startedAt.slice(0, 10)}</p>
          <ul>{data.dives.filter((d) => d.expeditionId === x.id).map((d) => (
            <li key={d.id}><button className={`row ${d.id === dive.id ? "on" : ""}`} aria-pressed={d.id === dive.id} onClick={() => set({ diveId: d.id, t: 0, playing: false, selObs: null })} data-testid={`dive-${d.id}`}>
              <b>{d.name}</b><span>{m(d.maxDepthM)} m max · {data.observations.filter((o) => o.diveId === d.id).length} observations</span></button></li>))}</ul></div>))}
      <div className="cta"><button className="btn primary" data-testid="descend" onClick={() => { set({ t: 0, playing: false }); go("replay"); }}>Descend with {dive.name} →</button></div>
    </section>
  );
}

function Replay({ data, dive }: { data: Data; dive: Dive }) {
  const s = useStore(), T = data.telemetry[dive.id].at(-1)!.t;
  return (
    <section aria-labelledby="h-replay"><h2 id="h-replay">Dive Replay · {dive.name}</h2>
      <Profile data={data} dive={dive} t={s.t} />
      <label className="scrub">Time <input type="range" min={0} max={T} step={10} value={s.t} onChange={(e) => set({ t: Number(e.target.value), playing: false })} aria-valuetext={hms(s.t)} data-testid="scrub" /><output>{hms(s.t)} / {hms(T)}</output></label>
      <div className="transport">
        <button className="btn" onClick={() => set({ playing: !s.playing, t: s.t >= T ? 0 : s.t })} data-testid="play">{s.playing ? "Pause" : "Play"}</button>
        <label>Speed <select value={s.speed} onChange={(e) => set({ speed: Number(e.target.value) })}>{[30, 120, 300, 600].map((v) => <option key={v} value={v}>{v}×</option>)}</select></label>
        <button className="btn" onClick={() => set({ t: data.telemetry[dive.id].reduce((a, p) => (p.depthM > a.depthM ? p : a)).t, playing: false })} data-testid="to-max">Jump to max depth</button>
      </div>
      <Readout data={data} dive={dive} />
    </section>
  );
}

function Sonar({ data, dive }: { data: Data; dive: Dive }) {
  const s = useStore(), tel = data.telemetry[dive.id], GRID = 120, seen = useMemo(() => sweptCells(tel, s.t, GRID, 3000).size, [tel, s.t]);
  const full = useMemo(() => sweptCells(tel, tel.at(-1)!.t, GRID, 3000).size, [tel]);
  return (
    <section aria-labelledby="h-sonar"><h2 id="h-sonar">Sonar Explorer</h2>
      <p className="lede">The seabed is dark until the array has swept it: a 420 m range inside a 120° swath ahead of the vehicle, plus a 60 m near field. Play the dive or scrub to reveal more.</p>
      <dl className="readout"><div><dt>Revealed now</dt><dd data-testid="sonar-cells">{seen.toLocaleString("en-US")} cells</dd></div><div><dt>Whole dive</dt><dd>{full.toLocaleString("en-US")} cells</dd></div><div><dt>Area (50 m cells)</dt><dd>{((seen * 0.0025)).toFixed(1)} km²</dd></div></dl>
      <div className="transport"><button className="btn" data-testid="ping" onClick={() => set({ pingAt: performance.now() / 1000 })}>Send a ping</button>
        <button className="btn" onClick={() => set({ playing: !s.playing })}>{s.playing ? "Pause sweep" : "Run sweep"}</button>
        <button className="btn" onClick={() => set({ t: tel.at(-1)!.t, playing: false })}>Reveal the whole dive</button></div>
      <label className="scrub">Time <input type="range" min={0} max={tel.at(-1)!.t} step={10} value={s.t} onChange={(e) => set({ t: Number(e.target.value), playing: false })} aria-label="Sonar time" /></label>
    </section>
  );
}

function Species({ data, dive }: { data: Data; dive: Dive }) {
  const s = useStore(), list = data.observations.filter((o) => o.diveId === dive.id).sort((a, b) => a.depthM - b.depthM), sel = list.find((o) => o.id === s.selObs);
  return (
    <section aria-labelledby="h-species"><h2 id="h-species">Observations · {dive.name}</h2>
      <p className="lede">Records sorted by depth. In the water they appear as lights that grow as the vehicle approaches; selecting one jumps the replay to when it was logged.</p>
      <table className="obs" data-testid="obs-table"><thead><tr><th>Depth</th><th>Record</th><th>Type</th><th>Conf.</th></tr></thead>
        <tbody>{list.map((o: Observation) => <tr key={o.id} className={o.id === s.selObs ? "on" : ""}><td>{m(o.depthM)} m</td><td><button className="link" onClick={() => set({ selObs: o.id, t: Math.max(0, o.t - 20), playing: false })} data-testid={`obs-${o.id}`}>{o.label}</button></td><td>{o.type}</td><td>{Math.round(o.confidence * 100)}%</td></tr>)}</tbody></table>
      {sel && <aside className="note" data-testid="obs-detail"><h3>{sel.label}</h3><p>{sel.note}</p><p className="faint">Logged at {hms(sel.t)} · {m(sel.depthM)} m · confidence {Math.round(sel.confidence * 100)}%</p></aside>}
    </section>
  );
}

function Fleet({ data }: { data: Data }) {
  const s = useStore(), rov = data.fleet.find((r) => r.id === s.selRov)!;
  const drag = useRef<{ x: number; k: number } | null>(null);
  return (
    <section aria-labelledby="h-fleet"><h2 id="h-fleet">ROV Fleet</h2>
      <p className="lede">Drag anywhere on the model to turn it. The 3D vehicle is the same Blender asset for all five, parts named for the browser to drive (thrusters, arm, sonar).</p>
      <div className="drag" data-testid="drag-zone" onPointerDown={(e) => { drag.current = { x: e.clientX, k: live.drag }; (e.target as Element).setPointerCapture(e.pointerId); }} onPointerMove={(e) => { if (drag.current) live.drag = drag.current.k + (e.clientX - drag.current.x) * 0.01; }} onPointerUp={() => { drag.current = null; }} aria-hidden />
      <ul className="fleet">{data.fleet.map((r) => (<li key={r.id}><button className={`row ${r.id === rov.id ? "on" : ""}`} aria-pressed={r.id === rov.id} onClick={() => set({ selRov: r.id })} data-testid={`rov-${r.id}`}><b>{r.name}</b><span>{r.class} · {r.status}</span></button></li>))}</ul>
      <dl className="readout" data-testid="rov-detail"><div><dt>Rated depth</dt><dd>{m(rov.ratedDepthM)} m</dd></div><div><dt>Health</dt><dd>{rov.healthPct}%</dd></div><div><dt>Battery</dt><dd>{rov.batteryPct}%</dd></div><div><dt>Thrusters L/R</dt><dd>{rov.thrusterPct[0]} / {rov.thrusterPct[1]}%</dd></div></dl>
      <p>{rov.missionSummary}</p>
    </section>
  );
}

function Archive({ data }: { data: Data }) {
  const bands = [[0, 1000], [1000, 2000], [2000, 3000], [3000, 4000], [4000, 6000]] as const;
  return (
    <section aria-labelledby="h-archive"><h2 id="h-archive">Expedition Archive</h2>
      <p className="lede">Missions filed by the deepest point they reached, not by date. Each stratum lists the dives whose maximum depth falls in it.</p>
      {bands.map(([a, b]) => { const ds = data.dives.filter((d) => d.maxDepthM >= a && d.maxDepthM < b); return (
        <div className="stratum" key={a} data-testid={`stratum-${a}`}><h3>{m(a)}–{m(b)} m <span className="faint">{zoneName(a)}</span></h3>
          {ds.length ? <ul>{ds.map((d) => { const x = data.expeditions.find((e) => e.id === d.expeditionId)!; return <li key={d.id}><button className="row" onClick={() => { set({ diveId: d.id, t: 0, playing: false }); go("control"); }}><b>{x.name} · {d.name}</b><span>{x.region} · {m(d.maxDepthM)} m · {data.observations.filter((o) => o.diveId === d.id).length} observations</span></button></li>; })}</ul> : <p className="faint">Nothing filed here.</p>}</div>); })}
    </section>
  );
}

export default function Panels({ data, dive }: { data: Data; dive: Dive }) {
  const s = useStore(), idx = VIEWS.findIndex((v) => v.id === s.view), prev = VIEWS.findIndex((v) => v.id === s.prevView), dir = idx >= prev ? "down" : "up";
  // Wheel over the open water (outside the panel) descends/ascends one station, rate-limited. Panels scroll normally.
  const lock = useRef(0);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => { if ((e.target as Element).closest(".panel,.rail,.intro")) return; const n = performance.now(); if (n - lock.current < 700 || Math.abs(e.deltaY) < 20 || !state.introDone) return; lock.current = n; const i = VIEWS.findIndex((v) => v.id === state.view) + (e.deltaY > 0 ? 1 : -1); if (VIEWS[i]) go(VIEWS[i].id); };
    addEventListener("wheel", onWheel, { passive: true }); return () => removeEventListener("wheel", onWheel);
  }, []);
  const p = sampleAt(data.telemetry[dive.id], s.t);
  return (
    <div className="hud" data-testid="hud">
      <header className="top"><span className="brand">ABYSSAL</span><span className="gauge" data-testid="gauge">{m(s.view === "fleet" ? 0 : p.depthM)} m</span>
        <button className="btn ghost" aria-pressed={s.pauseMotion} onClick={() => set({ pauseMotion: !s.pauseMotion })} data-testid="pause-motion">{s.pauseMotion ? "Resume motion" : "Pause motion"}</button></header>
      <nav className="rail" aria-label="Stations">{VIEWS.map((v, i) => <button key={v.id} className={v.id === s.view ? "on" : ""} aria-current={v.id === s.view ? "page" : undefined} onClick={() => go(v.id)} data-testid={`nav-${v.id}`}><i>{m(v.depthM)} m</i><b>{v.label}</b><small>{v.blurb}</small></button>)}</nav>
      <main className={`panel ${s.reduced ? "" : `slide-${dir}`}`} key={s.view} tabIndex={-1}>
        {s.view === "control" && <Control data={data} dive={dive} />}{s.view === "replay" && <Replay data={data} dive={dive} />}{s.view === "sonar" && <Sonar data={data} dive={dive} />}
        {s.view === "species" && <Species data={data} dive={dive} />}{s.view === "fleet" && <Fleet data={data} />}{s.view === "archive" && <Archive data={data} />}
      </main>
    </div>
  );
}
