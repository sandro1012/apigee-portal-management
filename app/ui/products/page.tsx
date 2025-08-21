'use client';
import { useEffect, useState } from 'react';

type ApiProduct = {
  name: string;
  displayName?: string;
  approvalType?: string;
  description?: string;
  attributes?: { name: string; value: string }[];
  apiResources?: string[];
  createdAt?: string;
  lastModifiedAt?: string;
};

export default function ProductsPage() {
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState<string>("");
  const [envs, setEnvs] = useState<string[]>([]);
  const [env, setEnv] = useState<string>("");
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [q, setQ] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [tokenMsg, setTokenMsg] = useState("");

  useEffect(() => { fetch('/api/orgs').then(r=>r.json()).then(setOrgs).catch(()=>setOrgs([])); }, []);
  useEffect(() => {
    if (!org) return;
    setEnv(""); setEnvs([]);
    fetch(`/api/envs?org=${encodeURIComponent(org)}`).then(r=>r.json()).then(setEnvs).catch(()=>setEnvs([]));
  }, [org]);

  async function saveToken() {
    setTokenMsg("");
    const res = await fetch('/api/auth/token', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ token: tokenInput.trim() }) });
    const j = await res.json().catch(()=>({}));
    if (res.ok) setTokenMsg("Token salvo (expira ~1h)."); else setTokenMsg("Falha: " + (j.error || res.statusText));
  }
  async function clearToken() { await fetch('/api/auth/token', { method: 'DELETE' }); setTokenMsg("Token limpo."); }

  async function loadProducts() {
    if (!org) return;
    const res = await fetch('/api/products', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ org }) });
    const j = await res.json();
    if (!res.ok) { alert(j.error || "Erro ao listar products"); return; }
    setItems(Array.isArray(j) ? j : []);
  }

  const filtered = items.filter(p => {
    const t = (p.displayName || p.name || "").toLowerCase();
    const d = (p.description || "").toLowerCase();
    const ql = q.toLowerCase();
    return t.includes(ql) || d.includes(ql);
  });

  return (
    <main>
      <h2>API Products</h2>

      <div className="card" style={{display:'grid', gap:8, marginBottom:12, maxWidth:760}}>
        <strong>Token Google (OAuth)</strong>
        <input type="password" placeholder="ya29..." value={tokenInput} onChange={e=>setTokenInput(e.target.value)} />
        <div style={{display:'flex', gap:8}}>
          <button onClick={saveToken} disabled={!tokenInput.trim()}>Salvar token</button>
          <button onClick={clearToken}>Limpar token</button>
          {tokenMsg && <small>{tokenMsg}</small>}
        </div>
        <small>Sem token salvo: backend tenta <code>GCP_USER_TOKEN</code> (env) ou Service Account.</small>
      </div>

      <div className="card" style={{display:'grid', gap:8, maxWidth:760}}>
        <label>Org
          <select value={org} onChange={e=>setOrg(e.target.value)}>
            <option value="">Selecione...</option>
            {orgs.map(o=>(<option key={o} value={o}>{o}</option>))}
          </select>
        </label>
        <label>Env (contexto)
          <select value={env} onChange={e=>setEnv(e.target.value)}>
            <option value="">Selecione...</option>
            {envs.map(x=>(<option key={x} value={x}>{x}</option>))}
          </select>
        </label>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button onClick={loadProducts} disabled={!org}>Listar products</button>
          <input placeholder="filtrar..." value={q} onChange={e=>setQ(e.target.value)} style={{flex:1}} />
        </div>
      </div>

      <div style={{marginTop:12}} className="card">
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign:'left', padding:'8px 6px'}}>Nome</th>
              <th style={{textAlign:'left', padding:'8px 6px'}}>Approval</th>
              <th style={{textAlign:'left', padding:'8px 6px'}}>Recursos</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.name} style={{borderTop:'1px solid var(--border)'}}>
                <td style={{padding:'8px 6px'}}>
                  <div style={{fontWeight:600}}>{p.displayName || p.name}</div>
                  <div className="small" style={{opacity:.8}}>{p.name}</div>
                  {p.description && <div className="small" style={{opacity:.8}}>{p.description}</div>}
                </td>
                <td style={{padding:'8px 6px'}}>{p.approvalType || '-'}</td>
                <td style={{padding:'8px 6px'}}>{(p.apiResources||[]).slice(0,3).join(', ')}{(p.apiResources||[]).length>3?'…':''}</td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={3} style={{padding:'12px 8px', opacity:.7}}>Nenhum product</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
