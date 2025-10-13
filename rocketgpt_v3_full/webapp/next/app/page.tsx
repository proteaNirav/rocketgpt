'use client';
import { useState } from 'react';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
export default function Home(){
  const [task,setTask]=useState('Draft a 3-step GTM plan for a freemium AI tool');
  const [persona,setPersona]=useState('professional');
  const [mode,setMode]=useState('/organize');
  const [out,setOut]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const go = async () => {
    setLoading(true);
    try{
      const r = await fetch(`${API_BASE}/plan-and-generate`, {method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({task, persona, mode, org_prefs:['ChatGPT','Claude']})});
      const j = await r.json(); setOut(j);
    }catch(e:any){ setOut({error:e.message}); } finally{ setLoading(false); }
  };
  return (<main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">🚀 RocketGPT — Orchestrator</h1>
      <p className="opacity-80 mb-6">Plan + AutoPilot (Groq) generation.</p>
      <section className="card space-y-3">
        <label className="font-semibold">Task</label>
        <textarea className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700" value={task} onChange={e=>setTask(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className="font-semibold">Persona</label>
            <select className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700" value={persona} onChange={e=>setPersona(e.target.value)}>
              <option>beginner</option><option>professional</option><option>expert</option>
            </select></div>
          <div><label className="font-semibold">Mode</label>
            <select className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700" value={mode} onChange={e=>setMode(e.target.value)}>
              <option>/fast</option><option>/deep</option><option>/creative</option><option>/organize</option><option>/live</option>
            </select></div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button className="btn" onClick={go} disabled={loading}>{loading? 'Running…':'Plan & Generate'}</button>
          <a className="underline" href={`${API_BASE}/health`} target="_blank">Health</a>
          <a className="underline" href={`${API_BASE}/metrics`} target="_blank">Metrics</a>
          <a className="underline" href={`${API_BASE}/system-prompt`} target="_blank">System Prompt</a>
        </div>
      </section>
      <section className="card mt-4"><h3 className="text-lg font-semibold mb-2">Result</h3>
        <pre>{out ? JSON.stringify(out,null,2) : 'Click “Plan & Generate”…'}</pre></section>
    </main>);
}