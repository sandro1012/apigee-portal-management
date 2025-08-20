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

  // Token input
  const [tokenInput, setTokenInput] = useState<string>("");
  const [tokenSaved, setTokenSaved] = useState<boolean>(false);
  const [tokenMsg, setTokenMsg] = useState<string>("");

  useEffect(() => {
    fetch('/api/orgs').then(r=>r.json()).then(setOrgs).catch(()=>setOrgs([]));
  }, []);

  useEffect(() => {
    if (!org) return;
    setEnv(""); setEnvs([]); setKvms([]); setKvm("");
    fetch(`/api/envs?org=${encodeURIComponent(org)}`)
      .then(r=>r.json()).then(setEnvs).catch(()=>setEnvs([]));
  }, [org]);

  async function saveToken() {
    setTokenSaved(false); setTokenMsg("");
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ token: tokenInput.trim() })
    });
    const j = await res.json().catch(()=>({}));
    if (res.ok) { setTokenSaved(true); setTokenMsg("Token salvo (expira ~1h)."); }
    else { setTokenMsg("Falha ao salvar: " + (j.error || res.statusText)); }
  }
  async function clearToken() {
    await fetch('/api/auth/token', { method: 'DELETE' });
    setTokenSaved(false); setTokenMsg("Token limpo.");
  }

  async function loadKvms() {
    if (!org || !env) return;
    const res = await fetch('/api/kvms', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({org, env})});
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Erro inesperado"); return; }
    setKvms(Array.isArray(data)? data : []);
  }

  async function exportKvm() {
    if (!org || !env || !kvm) return;
    const res = await fetch('/api/kvm/export', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({org, env, kvm})});
    const data: ExportResp = await res.json();
    if (!res.ok) { alert((data as any).error || "Erro inesperado"); return; }
    setResult(JSON.stringify(data, null, 2));
  }

  return (
    <main>
      <h2>Exportar KVM</h2>

      <div style={{display:'grid', gap:8, marginBottom:16, maxWidth:640, padding:12, border:'1px solid #ddd', borderRadius:8}}>
        <strong>Token Google (OAuth) – cole aqui</strong>
        <input type="password" value={tokenInput} onChange={e=>setTokenInput(e.target.value)} placeholder="ya29...." />
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button onClick={saveToken} disabled={!tokenInput.trim()}>Salvar token</button>
          <button onClick={clearToken}>Limpar token</button>
          {tokenSaved && <span style={{color:'green'}}>✓</span>}
          {tokenMsg && <small>{tokenMsg}</small>}
        </div>
        <small>Se você não colar token, o backend tentará usar <code>GCP_USER_TOKEN</code> (env) ou a Service Account.</small>
      </div>

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
