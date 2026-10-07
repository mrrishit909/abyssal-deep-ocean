"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { live, set, state, useStore } from "../store";

// Steps follow blueprint section 3: 0 black + ping, 1 descent, 2 vehicle + lights, 3 organism, 4 structure + lights widen, 5 light mask into Mission Control.
const CHECKS = [50, 200, 1000, 4000];
export default function Intro({ onDone }: { onDone: () => void }) {
  const s = useStore();
  const [depth, setDepth] = useState(0), [ping, setPing] = useState(0), [caption, setCaption] = useState("");
  const mask = useRef<HTMLDivElement>(null), root = useRef<HTMLDivElement>(null), tl = useRef<gsap.core.Timeline | null>(null);

  const finish = (instant: boolean) => {
    tl.current?.kill(); document.documentElement.style.setProperty("--mask", "200%"); live.introDepth = 4200; live.lightK = 1; live.fade = 1;
    set({ introDone: true, introStep: 99 });
    if (instant && root.current) root.current.style.display = "none";
    onDone();
  };

  useEffect(() => {
    if (s.reduced) return; // reduced motion: static keyframes below, no timeline
    gsap.ticker.lagSmoothing(0); // the story is on the wall clock: a slow GPU drops frames, it does not stretch the sequence
    const t = gsap.timeline({ defaults: { ease: "power1.inOut" }, onComplete: () => finish(false) });
    tl.current = t;
    const obj = { d: 0 }, m = { v: 0 };
    t.call(() => { set({ introStep: 0 }); setCaption("Surface. Silence. One ping."); }, [], 0)
      .call(() => setPing(1), [], 0.3)
      .call(() => { set({ introStep: 1 }); setCaption("Descending"); }, [], 1.4)
      .to(obj, { d: 4200, duration: 12, ease: "power2.in", onUpdate: () => { live.introDepth = obj.d; setDepth(Math.round(obj.d)); } }, 1.4)
      .call(() => { set({ introStep: 2 }); setCaption("Lights on."); }, [], 11.2)
      .to(live, { lightK: 1, duration: 1.2 }, 11.2)
      .call(() => { set({ introStep: 3 }); setCaption("Something large crosses behind us."); }, [], 13.6)
      .to(live, { creatureK: 1, duration: 3.2, ease: "none" }, 13.6)
      .call(() => { set({ introStep: 4 }); setCaption("A structure that should not be here."); }, [], 17.4)
      .to(live, { lightK: 2.6, duration: 2.4, ease: "power2.in" }, 17.4)
      .call(() => { set({ introStep: 5 }); setCaption(""); }, [], 19.8)
      .to(m, { v: 160, duration: 1.8, ease: "power2.inOut", onUpdate: () => document.documentElement.style.setProperty("--mask", `${m.v}%`) }, 19.8);
    return () => { t.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.reduced]);

  if (s.introDone && !s.reduced) return null;
  if (s.reduced) {
    const frames = [["0 m", "Surface light, one sonar ping."], ["1,000 m", "The last daylight is gone."], ["4,200 m", "The vehicle's lights come on; a large organism passes behind."], ["4,200 m", "A structure appears in the beam. Mission Control opens."]];
    return (
      <div className="intro intro-static" ref={root} role="dialog" aria-label="Opening story" data-testid="intro">
        <ol>{frames.map(([d, c], i) => <li key={i}><b>{d}</b> {c}</li>)}</ol>
        <button className="btn primary" onClick={() => finish(true)} data-testid="skip-intro">Enter Mission Control</button>
      </div>
    );
  }
  return (
    <div className="intro" ref={root} data-testid="intro" data-step={s.introStep}>
      <div className="intro-dark" style={{ opacity: s.introStep === 0 ? 1 : 0 }} />
      <div className={`ping ${ping ? "on" : ""}`} aria-hidden />
      <div className="depth-meter" aria-live="off"><span>{depth.toLocaleString("en-US")}</span> m
        <div className="checks">{CHECKS.map((c) => <i key={c} className={depth >= c ? "hit" : ""}>{c.toLocaleString("en-US")} m</i>)}</div></div>
      <p className="caption" role="status">{caption}</p>
      <button className="btn skip" onClick={() => { const t = tl.current; if (t && t.time() < 19.8) { live.introDepth = 4200; t.seek(19.8); } else finish(false); }} data-testid="skip-intro" autoFocus>Skip intro</button>
      <div className="light-mask" ref={mask} aria-hidden />
    </div>
  );
}
