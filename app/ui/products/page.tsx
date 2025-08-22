'use client';
import { useEffect, useMemo, useState } from 'react';

type ApiProduct = {
  name: string;
  displayName?: string;
  approvalType?: string;
  description?: string;
  attributes?: { name: string; value: string }[];
  apiResources?: string[];
  proxies?: string[];
  environments?: string[];
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

  const [selected, setSelected] = useState<ApiProduct|null>(null);
  const [detail, setDetail] = useState<ApiProduct|null>(null);
  const [resources, setResources] = useState<string[]>([]);
  const [newRes, setNewRes] = useState("");
  const [saving, setSaving] = useState(false);

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
    setSelected(null);
    setDetail(null);
  }

  async function openDetail(p: ApiProduct) {
    if (!org) return;
    setSelected(p);
    const res = await fetch(`/api/products/${encodeURIComponent(p.name)}?org=${encodeURIComponent(org)}`);
    const j = await res.json();
    if (!res.ok) { alert(j.error || "Erro ao carregar produto"); return; }
    setDetail(j);
    setResources(j.apiResources || []);
  }

  async function saveResources() {
    if (!org || !selected) return;
    setSaving(true);
    const res = await fetch(`/api/products/${encodeURIComponent(selected.name)}/update`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ org, apiResources: resources })
    });
    const j = await res.json().catch(()=>({}));
    setSaving(false);
    if (!res.ok) { alert(j.error || "Falha ao atualizar"); return; }
    alert("Atualizado!");
    // reload detail
    openDetail(selected);
  }

  const filtered = useMemo(()=> {
    const ql = q.toLowerCase();
    return items.filter(p => (p.displayName||p.name||'').toLowerCase().includes(ql) || (p.description||'').toLowerCase().includes(ql));
  }, [items, q]);

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

      <div style={{display:'grid', gridTemplateColumns:'1fr minmax(320px, 42%)', gap:12, marginTop:12}}>
        <div className="card" style={{minWidth:0}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'8px 6px'}}>Nome</th>
                <th style={{textAlign:'left', padding:'8px 6px'}}>Approval</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.name} style={{borderTop:'1px solid var(--border)', cursor:'pointer'}} onClick={()=>openDetail(p)}>
                  <td style={{padding:'8px 6px'}}>
                    <div style={{fontWeight:600}}>{p.displayName || p.name}</div>
                    <div className="small" style={{opacity:.8}}>{p.name}</div>
                    {p.description && <div className="small" style={{opacity:.8}}>{p.description}</div>}
                  </td>
                  <td style={{padding:'8px 6px'}}>{p.approvalType || '-'}</td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={2} style={{padding:'12px 8px', opacity:.7}}>Nenhum product</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card" style={{minWidth:0}}>
          <h3 style={{marginTop:0}}>Detalhes do product</h3>
          {!detail && <div className="small" style={{opacity:.8}}>Clique em um product para ver/editar recursos.</div>}
          {detail && (
            <div style={{display:'grid', gap:10}}>
              <div><b>Nome:</b> {detail.displayName || detail.name}</div>
              <div className="small" style={{opacity:.8}}><b>ID:</b> {detail.name}</div>
              {detail.description && <div><b>Descrição:</b> {detail.description}</div>}
              <div><b>Approval:</b> {detail.approvalType || '-'}</div>

              <div>
                <b>Recursos (apiResources)</b>
                <ul style={{margin:'6px 0 8px', paddingLeft:16}}>
                  {(resources || []).map((r, i)=>(
                    <li key={i} style={{display:'flex', alignItems:'center', gap:8}}>
                      <code style={{fontSize:12}}>{r}</code>
                      <button onClick={()=> setResources(prev => prev.filter((_, idx)=> idx!==i))}>remover</button>
                    </li>
                  ))}
                  {(resources || []).length===0 && <li className="small" style={{opacity:.7}}>Nenhum recurso</li>}
                </ul>
                <div style={{display:'flex', gap:8}}>
                  <input value={newRes} onChange={e=>setNewRes(e.target.value)} placeholder="/v1/** ou /minha-api/**" style={{flex:1}} />
                  <button onClick={()=>{ if(newRes.trim()){ setResources(prev=>[...prev, newRes.trim()]); setNewRes(""); }}}>incluir</button>
                </div>
              </div>

              <div style={{display:'flex', gap:8}}>
                <button onClick={saveResources} disabled={saving}>Salvar alterações</button>
                <button onClick={()=>{ if(selected) openDetail(selected); }}>Descartar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
