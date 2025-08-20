'use client';
import { useEffect, useState } from 'react';
type ExportResp = { keyValueEntries: {name:string; value:any}[]; nextPageToken: string };
export default function SelectUI() {
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState<string>("");
  const [envs, setEnvs] = useState<string[]>([]);
  const [env, setEnv] = useState<string>("");
  const [kvms, setKvms] = useState<string[]>([]);
  const [kvm, setKvm] = useState<string>("");
  const [result, setResult] = useState<string>("");
  useEffect(() => { fetch('/api/orgs').then(r=>r.json()).then(setOrgs).catch(()=>setOrgs([])); }, []);
  useEffect(() => {
    if (!org) return; setEnv(""); setEnvs([]); setKvms([]); setKvm("");
    fetch(`/api/envs?org=${encodeURIComponent(org)}`).then(r=>r.json()).then(setEnvs).catch(()=>setEnvs([]));
  }, [org]);
  async function loadKvms() {
    if (!org || !env) return;
    const res = await fetch('/api/kvms', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({org, env})});
    const data = await res.json(); setKvms(Array.isArray(data)? data : []);
  }
  async function exportKvm() {
    if (!org || !env || !kvm) return;
    const res = await fetch('/api/kvm/export', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({org, env, kvm})});
    const data: ExportResp = await res.json(); setResult(JSON.stringify(data, null, 2));
  }
  return (
    <main>
      <h2>Exportar KVM</h2>
      <div style={{display:'grid', gap:12, maxWidth: 640}}>
        <label>Org
          <select value={org} onChange={e=>setOrg(e.target.value)}>
            <option value="">Selecione...</option>
            {orgs.map(o=>(<option key={o} value={o}>{o}</option>))}
          </select>
        </label>
        <label>Env
          <select value={env} onChange={e=>setEnv(e.target.value)}>
            <option value="">Selecione...</option>
            {envs.map(x=>(<option key={x} value={x}>{x}</option>))}
          </select>
        </label>
        <div style={{display:'flex', gap:8}}>
          <button onClick={loadKvms}>Listar KVMs</button>
          <span style={{opacity:.7}}>(carregue a lista de KVMs do ambiente)</span>
        </div>
        <label>KVM
          <select value={kvm} onChange={e=>setKvm(e.target.value)}>
            <option value="">Selecione...</option>
            {kvms.map(m=>(<option key={m} value={m}>{m}</option>))}
          </select>
        </label>
        <button onClick={exportKvm} disabled={!kvm}>Exportar</button>
      </div>
      <pre style={{marginTop:16, background:'#111', color:'#0f0', padding:12, borderRadius:8, overflow:'auto', maxHeight: 480}}>
        {result || 'Resultado aparecerá aqui...'}
      </pre>
    </main>
  );
}
