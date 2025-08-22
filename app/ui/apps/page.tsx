'use client';
import { useEffect, useState } from 'react';

type Credential = {
  consumerKey: string;
  consumerSecret?: string;
  status?: string;
  apiProducts?: { apiproduct: string; status: string }[];
};
type AppItem = {
  appId: string;
  name: string;
  developerId?: string;
  developerEmail?: string;
  status?: string;
  createdAt?: string;
  lastModifiedAt?: string;
};
type AppDetail = AppItem & {
  credentials?: Credential[];
  apiProducts?: string[];
  attributes?: { name: string; value: string }[];
};

export default function AppsPage() {
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState<string>("");
  const [envs, setEnvs] = useState<string[]>([]);
  const [env, setEnv] = useState<string>("");
  const [items, setItems] = useState<AppItem[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AppDetail|null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
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

  async function loadApps() {
    if (!org) return;
    const res = await fetch('/api/apps', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ org }) });
    const j = await res.json();
    if (!res.ok) { alert(j.error || "Erro ao listar apps"); return; }
    setItems(Array.isArray(j) ? j : []);
    setSelected(null);
  }

  async function openAppById(appId: string) {
    if (!org) return;
    setLoadingDetail(true);
    const res = await fetch(`/api/apps/${encodeURIComponent(appId)}?org=${encodeURIComponent(org)}`);
    const j = await res.json();
    setLoadingDetail(false);
    if (!res.ok) { alert(j.error || "Erro ao carregar app"); return; }
    setSelected(j);
  }

  const filtered = items.filter(a => {
    const t = (`${a.name} ${a.appId || ''}`).toLowerCase();
    const ql = q.toLowerCase();
    return t.includes(ql);
  });

  return (
    <main>
      <h2>Apps</h2>

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
          <button onClick={loadApps} disabled={!org}>Listar apps</button>
          <input placeholder="filtrar..." value={q} onChange={e=>setQ(e.target.value)} style={{flex:1}} />
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr minmax(280px, 36%)', gap:12, marginTop:12}}>
        <div className="card">
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'8px 6px'}}>App</th>
                <th style={{textAlign:'left', padding:'8px 6px'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.appId || a.name} style={{borderTop:'1px solid var(--border)', cursor:'pointer'}}
                    onClick={()=> a.appId ? openAppById(a.appId) : alert('App sem appId retornado pelo Apigee')}>
                  <td style={{padding:'8px 6px'}}>
                    <div style={{fontWeight:600}}>{a.name}</div>
                    <div className="small" style={{opacity:.8}}>{a.appId}</div>
                  </td>
                  <td style={{padding:'8px 6px'}}>{a.status || '-'}</td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={2} style={{padding:'12px 8px', opacity:.7}}>Nenhum app</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{marginTop:0}}>Detalhes do App</h3>
          {!selected && <div className="small" style={{opacity:.8}}>Selecione um app na lista para ver detalhes.</div>}
          {selected && (
            <div style={{display:'grid', gap:8}}>
              <div><b>Nome:</b> {selected.name}</div>
              {selected.developerEmail && <div><b>Developer:</b> {selected.developerEmail}</div>}
              {selected.status && <div><b>Status:</b> {selected.status}</div>}
              {selected.attributes && selected.attributes.length>0 && (
                <div>
                  <b>Atributos</b>
                  <ul>{selected.attributes.map((at,i)=>(<li key={i}><code>{at.name}</code>: {at.value}</li>))}</ul>
                </div>
              )}
              {selected.apiProducts && selected.apiProducts.length>0 && (
                <div>
                  <b>Products associados</b>
                  <ul>{selected.apiProducts.map((p,i)=>(<li key={i}>{p}</li>))}</ul>
                </div>
              )}
              {selected.credentials && selected.credentials.length>0 && (
                <div>
                  <b>Credenciais</b>
                  <ul>
                    {selected.credentials.map((c,i)=>(
                      <li key={i} style={{marginBottom:6}}>
                        <div><code>Key:</code> {c.consumerKey}</div>
                        {c.consumerSecret && <div className="small" style={{opacity:.8}}><code>Secret:</code> {c.consumerSecret}</div>}
                        <div className="small"><b>Status:</b> {c.status || '-'}</div>
                        {c.apiProducts && c.apiProducts.length>0 && (
                          <div className="small"><b>Products:</b> {c.apiProducts.map(p=>p.apiproduct).join(', ')}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
