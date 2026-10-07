"use client";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { envAt, heightGrid, mulberry32, sampleAt, seabedDepth, sweptCells, observationVisibility } from "@abyssal/domain";
import type { Data } from "../data";
import { base } from "../data";
import { live, set, state, useStore } from "../store";

// 1 scene unit = 10 m horizontally, depth is drawn at 0.02 units per metre. x east, scene z = -north. The vehicle is drawn 4x so it reads.
const U = 0.1, DY = 0.02, HALF = 3000, GRID = 120, SUB_SCALE = 4;
const toScene = (x: number, z: number, depthM: number) => new THREE.Vector3(x * U, -depthM * DY, -z * U);

const terrainVert = /* glsl */ `
varying vec2 vUv; varying vec3 vW; varying float vDepth;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vDepth = -position.y / ${DY.toFixed(3)}; gl_Position = projectionMatrix * viewMatrix * w; }`;
const terrainFrag = /* glsl */ `
uniform sampler2D uReveal; uniform vec3 uSub; uniform vec3 uDir; uniform float uCone; uniform float uLamp; uniform float uPing; uniform float uFog; uniform vec3 uFogColor; uniform float uScan;
varying vec2 vUv; varying vec3 vW; varying float vDepth;
void main(){
  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
  float seen = texture2D(uReveal, vUv).r;
  vec3 rel = vW - uSub; float d = length(rel);
  float cone = smoothstep(uCone, uCone + 0.08, dot(normalize(rel), uDir)) * uLamp / (1.0 + d * d * 0.0025);
  float lit = cone * max(0.0, dot(n, normalize(-rel + vec3(0.0, 8.0, 0.0))));
  float contour = smoothstep(0.985, 1.0, abs(sin(vDepth * 0.11)));
  vec3 base = vec3(0.008, 0.035, 0.055) + vec3(0.02, 0.07, 0.09) * max(0.0, n.y);
  vec3 col = base * 0.4 + vec3(0.9, 1.0, 1.0) * lit;
  col += seen * (vec3(0.07, 0.96, 0.94) * (0.07 + contour * 0.55) + vec3(0.03, 0.5, 0.99) * 0.05);
  float ring = smoothstep(7.0, 0.0, abs(d - uPing)) * step(uPing, 60.0) * uScan;
  col += vec3(0.07, 0.96, 0.94) * ring * 0.9;
  float f = 1.0 - exp(-uFog * d * 0.35);
  col = min(col, vec3(0.85, 0.95, 0.97));
  gl_FragColor = vec4(mix(col, uFogColor, f), 1.0);
}`;

function Terrain({ data }: { data: Data }) {
  const { geo, tex, mat } = useMemo(() => {
    const g = new THREE.PlaneGeometry(2 * HALF * U, 2 * HALF * U, GRID, GRID); g.rotateX(-Math.PI / 2);
    const h = heightGrid(GRID + 1, HALF), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) p.setY(k, -h[k] * DY);
    g.computeVertexNormals();
    // PlaneGeometry rows run +z to -z after the rotation; heightGrid rows run -north.. so mirror: row j of the plane is z=-north_j.
    const t = new THREE.DataTexture(new Uint8Array(GRID * GRID * 4), GRID, GRID, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
    const m = new THREE.ShaderMaterial({ vertexShader: terrainVert, fragmentShader: terrainFrag, uniforms: { uReveal: { value: t }, uSub: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3(0, 0, -1) }, uCone: { value: 0.93 }, uLamp: { value: 0 }, uPing: { value: 999 }, uFog: { value: 0.02 }, uFogColor: { value: new THREE.Color("#02080D") }, uScan: { value: 0 } } });
    return { geo: g, tex: t, mat: m };
  }, []);
  const lastIdx = useRef(-1), last = useRef("");
  useFrame(() => {
    const s = state, tel = data.telemetry[s.diveId], p = sampleAt(tel, s.t);
    const u = mat.uniforms;
    u.uSub.value.copy(live.subPos); u.uDir.value.copy(live.subDir).setY(-0.25).normalize();
    u.uLamp.value = 70 * live.lightK; u.uCone.value = 0.93 - 0.55 * Math.max(0, live.lightK - 1);
    const e = envAt(p.depthM); u.uFog.value = Math.max(0.012, e.fog * 6);
    u.uScan.value = s.view === "sonar" || s.view === "replay" ? 1 : 0.35;
    const age = (performance.now() / 1000 - s.pingAt); u.uPing.value = age < 3 ? age * 20 : 999;
    const idx = Math.floor(s.t / 60) + s.diveId.length * 1000;
    if (idx !== lastIdx.current || last.current !== s.diveId) {
      lastIdx.current = idx; last.current = s.diveId;
      const cells = sweptCells(tel, s.t, GRID, HALF), d = tex.image.data as Uint8Array;
      d.fill(0);
      // sweptCells index = j*GRID+i with j = north row; the plane's v axis already runs south..north after rotateX, so write directly.
      for (const c of cells) { const o = c * 4; d[o] = 255; d[o + 3] = 255; }
      tex.needsUpdate = true;
    }
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

function Particles() {
  const ref = useRef<THREE.ShaderMaterial>(null), cam = useThree((s) => s.camera);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(), n = 1400, a = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) a[i] = Math.random(); g.setAttribute("position", new THREE.BufferAttribute(a, 3)); return g; }, []);
  const mat = useMemo(() => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uA: { value: 0.5 } },
    vertexShader: `uniform float uT; uniform vec3 uCam; varying float vA; void main(){ vec3 b = position; vec3 p = uCam + (vec3(fract(b.x + 0.0), fract(b.y + uT), fract(b.z)) - 0.5) * 90.0; vA = 1.0 - abs(fract(b.y + uT) - 0.5) * 2.0; vec4 mv = viewMatrix * vec4(p, 1.0); gl_PointSize = 120.0 / -mv.z + 1.0; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(0.75, 0.97, 1.0, (1.0 - r * 2.0) * vA * uA); }` }), []);
  const t = useRef(0);
  useFrame((_, dt) => {
    const e = envAt(-(cam.position.y) / DY);
    if (!state.pauseMotion) t.current += dt * e.particleSpeed * 0.012;
    mat.uniforms.uT.value = t.current; mat.uniforms.uCam.value.copy(cam.position); mat.uniforms.uA.value = 0.15 + 0.5 * live.fade;
  });
  return <points ref={ref as never} geometry={geo} material={mat} frustumCulled={false} />;
}

function Sub({ data }: { data: Data }) {
  const gltf = useLoader(GLTFLoader, `${base}/models/submersible.glb`);
  const root = useRef<THREE.Group>(null), spotL = useRef<THREE.SpotLight>(null), spotR = useRef<THREE.SpotLight>(null);
  const scene = useMemo(() => { const s = gltf.scene.clone(true); s.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && "emissive" in m) m.envMapIntensity = 0.4; }); return s; }, [gltf]);
  const parts = useMemo(() => ({ l: scene.getObjectByName("LeftThruster"), r: scene.getObjectByName("RightThruster"), arm: scene.getObjectByName("ManipulatorArm"), sonar: scene.getObjectByName("SonarArray") }), [scene]);
  useFrame((st) => {
    const g = root.current; if (!g) return;
    const s = state, intro = !s.introDone && s.introStep < 99, tt = st.clock.elapsedTime;
    const p = sampleAt(data.telemetry[s.diveId], s.t), v = toScene(p.x, p.z, p.depthM);
    if (s.view === "fleet" && s.introDone) { g.position.set(0, 0, 0); g.rotation.set(0.12, tt * 0.25 + live.drag, 0); }
    else if (intro) { g.position.set(live.structure.x - 2, live.structure.y + 9, live.structure.z + 34); g.rotation.set(0, 0.02, 0); }
    else { g.position.copy(v); g.rotation.set(0, -(p.heading * Math.PI) / 180, 0); }
    if (!s.pauseMotion) { g.position.y += Math.sin(tt * 0.8) * 0.18; g.rotation.z = Math.sin(tt * 0.6) * 0.03; }
    live.subPos.copy(g.position).y += 0; live.subDir.set(-Math.sin(g.rotation.y), 0, -Math.cos(g.rotation.y));
    const spin = s.pauseMotion ? 0 : 12 * (s.playing ? 1 : 0.2) * 0.016;
    if (parts.l) parts.l.rotation.z += spin; if (parts.r) parts.r.rotation.z -= spin;
    if (parts.arm && !s.pauseMotion) parts.arm.rotation.x = Math.sin(tt * 0.5) * 0.12;
    if (parts.sonar) parts.sonar.rotation.y = s.pauseMotion ? 0 : tt * 1.2;
    const k = live.lightK; for (const sp of [spotL.current, spotR.current]) if (sp) { sp.intensity = 3500 * k; sp.angle = 0.28 + Math.max(0, k - 1) * 0.8; }
  });
  return (
    <group ref={root}>
      <group scale={SUB_SCALE}>
        <primitive object={scene} />
        <spotLight ref={spotL} position={[-0.55, 0.4, -1.05]} target-position={[-0.55, -0.2, -12]} color="#E7FBFF" penumbra={0.7} distance={80} decay={1.4} />
        <spotLight ref={spotR} position={[0.55, 0.4, -1.05]} target-position={[0.55, -0.2, -12]} color="#E7FBFF" penumbra={0.7} distance={80} decay={1.4} />
      </group>
    </group>
  );
}

function Kit() {
  // Rocks from the Blender seabed kit, instanced (one draw call) across the site at seeded positions, sitting on the synthetic seabed.
  const gltf = useLoader(GLTFLoader, `${base}/models/seabed-kit.glb`);
  const ref = useRef<THREE.InstancedMesh>(null);
  const rock = useMemo(() => { let m: THREE.Mesh | null = null; gltf.scene.traverse((o) => { if (!m && o.name.startsWith("Rock") && (o as THREE.Mesh).isMesh) m = o as THREE.Mesh; }); return m as unknown as THREE.Mesh; }, [gltf]);
  useEffect(() => {
    const im = ref.current; if (!im) return; const r = mulberry32(99), d = new THREE.Object3D();
    for (let i = 0; i < 160; i++) { const x = (r() - 0.5) * 5600, z = (r() - 0.5) * 5600, sc = 1.5 + r() * 5; d.position.set(x * U, -seabedDepth(x, z) * DY + 0.2, -z * U); d.rotation.set(0, r() * 6.28, 0); d.scale.setScalar(sc); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
    im.instanceMatrix.needsUpdate = true;
  }, [rock]);
  return <instancedMesh ref={ref} args={[rock.geometry, new THREE.MeshStandardMaterial({ color: "#10303f", roughness: 0.9 }), 160]} frustumCulled={false} />;
}

function Creature() {
  const g = useRef<THREE.Group>(null), light = useRef<THREE.PointLight>(null);
  const tent = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);
  useFrame((st) => {
    if (!g.current) return;
    const s = state, tt = st.clock.elapsedTime, p = sampleAt(window.__abyssalData!.telemetry[s.diveId], s.t), c = toScene(p.x, p.z, p.depthM);
    // In the intro (step 4) it crosses behind the vehicle once; afterwards it hangs in the water near the vehicle, drifting.
    const k = s.introDone ? 0 : live.creatureK;
    const show = !s.introDone ? k > 0 && k < 1 : true;
    g.current.visible = show;
    if (!s.introDone) g.current.position.set(live.structure.x + (k - 0.5) * 90, live.structure.y + 20 + Math.sin(k * 6) * 2, live.structure.z + 14);
    else g.current.position.set(c.x + 40 + Math.sin(tt * 0.1) * 6, c.y + 12, c.z + 30);
    g.current.rotation.y = Math.PI / 2 * (k > 0.5 ? 1 : -1);
    const pulse = 0.5 + 0.5 * Math.sin(tt * (s.pauseMotion ? 0 : 2.2));
    if (light.current) light.current.intensity = (s.introDone ? 80 : 2200 * Math.sin(Math.PI * k)) * (0.6 + 0.4 * pulse);
    g.current.children.forEach((c2, i) => { if (i > 0 && !s.pauseMotion) c2.rotation.z = Math.sin(tt * 2 + i) * 0.35; });
  });
  return (
    <group ref={g} scale={3.2} visible={false}>
      <mesh><sphereGeometry args={[1.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#9D5CFF" emissive="#9D5CFF" emissiveIntensity={1.6} transparent opacity={0.7} /></mesh>
      {tent.map((i) => <group key={i} rotation={[0, (i / tent.length) * Math.PI * 2, 0]}><mesh position={[0.9, -1.4, 0]}><cylinderGeometry args={[0.025, 0.012, 2.8, 5]} /><meshStandardMaterial color="#13F4EF" emissive="#13F4EF" emissiveIntensity={2} /></mesh></group>)}
      <pointLight ref={light} color="#9D5CFF" distance={160} decay={1.6} />
    </group>
  );
}

function Structure({ data }: { data: Data }) {
  // The hidden structure: ring of pillars with a lit core, at the logged observation position (dive-06). Its pillars are emissive on one face only.
  const obs = data.observations.find((o) => o.id === "dive-06-structure")!;
  const pos = toScene(obs.x, obs.z, seabedDepth(obs.x, obs.z)); const g = useRef<THREE.Group>(null);
  live.structure.copy(pos);
  useFrame(() => { if (g.current) g.current.visible = state.diveId === "dive-06"; });
  return (
    <group ref={g} position={pos}>
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos((i / 8) * Math.PI * 2) * 14, 5, Math.sin((i / 8) * Math.PI * 2) * 14]}><boxGeometry args={[2.2, 10, 2.2]} /><meshStandardMaterial color="#0b2a3d" roughness={0.8} emissive="#087EFC" emissiveIntensity={0.9} /></mesh>)}
      <mesh position={[0, 2, 0]}><cylinderGeometry args={[5, 5.6, 4, 6]} /><meshStandardMaterial color="#13303f" emissive="#13F4EF" emissiveIntensity={1.1} /></mesh>
      <pointLight position={[0, 8, 0]} color="#13F4EF" intensity={500} distance={70} decay={1.5} />
    </group>
  );
}

function Markers({ data }: { data: Data }) {
  const obs = useMemo(() => data.observations, [data]), refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((st) => {
    const s = state, p = sampleAt(data.telemetry[s.diveId], s.t);
    obs.forEach((o, i) => { const m = refs.current[i]; if (!m) return; const on = o.diveId === s.diveId, vis = on ? Math.max(observationVisibility(o, p), s.selObs === o.id ? 1 : 0, s.view === "species" ? 0.35 : 0) : 0;
      m.visible = vis > 0.01; m.scale.setScalar((0.6 + vis) * (s.selObs === o.id ? 2 : 1) * (1 + (s.pauseMotion ? 0 : 0.12 * Math.sin(st.clock.elapsedTime * 3 + i)))); (m.material as THREE.MeshBasicMaterial).opacity = vis; });
  });
  return <>{obs.map((o, i) => <mesh key={o.id} ref={(m) => { refs.current[i] = m; }} position={toScene(o.x, o.z, o.depthM)}><sphereGeometry args={[1.1, 12, 8]} /><meshBasicMaterial color={o.type === "species" ? "#9D5CFF" : o.type === "structure" ? "#13F4EF" : "#087EFC"} transparent opacity={0} depthWrite={false} /></mesh>)}</>;
}

function Tracks({ data }: { data: Data }) {
  const lines = useMemo(() => data.dives.map((d) => ({ id: d.id, obj: new THREE.Line(new THREE.BufferGeometry().setFromPoints(d.track.map(([x, z, dep]) => toScene(x, z, dep))), new THREE.LineBasicMaterial({ color: "#13F4EF", transparent: true, opacity: 0.5 })) })), [data]);
  const layers = [1000, 2000, 3000, 4000], lay = useRef<THREE.Group>(null);
  useFrame(() => {
    for (const l of lines) { l.obj.visible = state.introDone && (state.view === "control" || state.view === "archive" || l.id === state.diveId); (l.obj.material as THREE.LineBasicMaterial).opacity = l.id === state.diveId ? 0.6 : 0.25; }
    if (lay.current) lay.current.visible = state.view === "control";
  });
  return (
    <>
      {lines.map((l) => <primitive key={l.id} object={l.obj} />)}
      <group ref={lay}>{layers.map((d) => <mesh key={d} position={[0, -d * DY, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * HALF * U, 2 * HALF * U]} /><meshBasicMaterial color="#087EFC" transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} /></mesh>)}</group>
    </>
  );
}

function Rig({ data }: { data: Data }) {
  const { camera, scene } = useThree(), tmp = useMemo(() => new THREE.Vector3(), []), look = useMemo(() => new THREE.Vector3(), []);
  useFrame((st, dt) => {
    const s = state, p = sampleAt(data.telemetry[s.diveId], s.t), v = toScene(p.x, p.z, p.depthM), h = (p.heading * Math.PI) / 180, fwd = new THREE.Vector3(Math.sin(h), 0, -Math.cos(h));
    const e = envAt(p.depthM); let want = tmp, tgt = look;
    if (!s.introDone) {
      // Intro: the camera falls with the depth meter (above the site), then settles behind the vehicle looking at the structure.
      const S = live.structure, settle = THREE.MathUtils.clamp((live.introDepth - 3700) / 500, 0, 1), y = -live.introDepth * DY;
      want.set(S.x + 10, THREE.MathUtils.lerp(y + 6, S.y + 15, settle), S.z + 56); tgt.set(S.x, THREE.MathUtils.lerp(y - 30, S.y + 6, settle), S.z + 6);
      if (s.introStep >= 5) { want.set(S.x + 4, S.y + 16, S.z + 46); tgt.set(S.x, S.y + 7, S.z); }
      scene.fog = new THREE.FogExp2("#02080D", 0.004 + live.introDepth / 4500 * 0.014); scene.background = new THREE.Color("#02080D");
      const sun = scene.getObjectByName("sun") as THREE.DirectionalLight | undefined; if (sun) sun.intensity = 3.2 * Math.exp(-live.introDepth / 60);
    } else {
      const tint = new THREE.Color(...e.tint); scene.fog = new THREE.FogExp2(tint, e.fog); scene.background = tint;
      const sun = scene.getObjectByName("sun") as THREE.DirectionalLight | undefined; if (sun) sun.intensity = 3.2 * e.light;
      if (s.view === "control") want.set(v.x + 160, v.y + 150, v.z + 260), tgt.set(v.x, -3300 * DY, v.z);
      else if (s.view === "sonar") want.set(v.x, v.y + 130, v.z + 1), tgt.copy(v);
      else if (s.view === "fleet") want.set(0, v.y * 0 + 4, 24), tgt.set(0, 0, 0);
      else if (s.view === "archive") want.set(v.x + 220, v.y + 190, v.z + 300), tgt.set(v.x, -3500 * DY, v.z);
      else want.copy(v).addScaledVector(fwd, -(s.view === "species" ? 26 : 22)).add(new THREE.Vector3(0, s.view === "species" ? 9 : 7, 0)), tgt.copy(v).addScaledVector(fwd, 14);
    }
    const k = s.reduced ? 1 : 1 - Math.exp(-dt * 2.2);
    camera.position.lerp(want, k); (camera as THREE.PerspectiveCamera).lookAt(tgt.x, tgt.y, tgt.z);
    // Fleet view floats the vehicle at the origin, far above the seabed, so move the fog to match the display.
    if (s.introDone && s.view === "fleet") { scene.fog = new THREE.FogExp2("#031A2B", 0.01); camera.position.set(0, 4, 24); camera.lookAt(0, 0, 0); }
  });
  return null;
}

function Lifecycle() {
  const { setFrameloop, gl } = useThree();
  useEffect(() => {
    const vis = () => setFrameloop(document.hidden ? "never" : "always");
    const lost = (e: Event) => { e.preventDefault(); set({ gfx: "poster" }); };
    document.addEventListener("visibilitychange", vis); gl.domElement.addEventListener("webglcontextlost", lost);
    return () => { document.removeEventListener("visibilitychange", vis); gl.domElement.removeEventListener("webglcontextlost", lost); };
  }, [setFrameloop, gl]);
  return null;
}

declare global { interface Window { __abyssalData?: Data; __abyssalStats?: () => unknown } }

function Stats() {
  const gl = useThree((s) => s.gl);
  useEffect(() => { window.__abyssalStats = () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures }); }, [gl]);
  return null;
}

export default function Scene({ data }: { data: Data }) {
  useStore();
  window.__abyssalData = data;
  return (
    <Canvas className="stage" data-testid="stage" dpr={[1, 1.5]} camera={{ fov: 55, near: 0.2, far: 2500, position: [0, -80, 30] }} gl={{ antialias: false, powerPreference: "high-performance" }} onCreated={({ gl }) => gl.setClearColor("#02080D")}>
      <ambientLight intensity={0.6} color="#2a4f7a" /><hemisphereLight args={["#13F4EF", "#02080D", 0.25]} /><directionalLight name="sun" position={[30, 80, 20]} intensity={3} color="#E7FBFF" />
      <Rig data={data} /><Terrain data={data} /><Particles /><Sub data={data} /><Kit /><Creature /><Structure data={data} /><Markers data={data} /><Tracks data={data} /><Lifecycle /><Stats />
    </Canvas>
  );
}
