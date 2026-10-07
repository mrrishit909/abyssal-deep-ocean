"use client";
import dynamic from "next/dynamic";
const App = dynamic(() => import("../src/App"), { ssr: false, loading: () => <div className="boot" role="status">Powering up the vehicle…</div> });
export default function Page() { return <App />; }
