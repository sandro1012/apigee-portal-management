'use client';
import { useEffect, useMemo, useState } from 'react';

type AppItem = {
  appId: string;
  name: string;
  developerEmail?: string;
  status?: string;
};

export default function AppsPage() {
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState<string>("");
  const [items, setItems] = useState<AppItem[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AppItem|null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenMsg, setTokenMsg] = useState("");

  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  useEffect(() => { fetch('/api/orgs').then(r=>r.json()).then(setOrgs).catch(()=>setOrgs([])); }, []);

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
    setPage(1);
  }

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return items.filter(a => (`${a.name} ${a.appId||''}`).toLowerCase().includes(t));
  }, [items, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, (page)*pageSize);

  const manageHref = (a: AppItem) => {
    const u = new URL(`/ui/apps/${encodeURIComponent(a.appId)}`, window.location.origin);
    if (org) u.searchParams.set("org", org);
    return u.toString().replace(window.location.origin, "");
  };

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
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button onClick={loadApps} disabled={!org}>Listar apps</button>
          <input placeholder="filtrar..." value={q} onChange={e=>setQ(e.target.value)} style={{flex:1}} />
          <label className="small" style={{display:'flex', alignItems:'center', gap:6}}>
            por página:
            <select value={pageSize} onChange={e=>{ setPageSize(parseInt(e.target.value || '10')); setPage(1); }}>
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr minmax(280px, 36%)', gap:12, marginTop:12}}>
        <div className="card">
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'8px 6px'}}>App</th>
                <th style={{textAlign:'left', padding:'8px 6px'}}>Status</th>
                <th style={{textAlign:'left', padding:'8px 6px'}}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(a => (
                <tr key={a.appId || a.name} style={{borderTop:'1px solid var(--border)'}}>
                  <td style={{padding:'8px 6px'}}>
                    <div style={{fontWeight:600}}>{a.name}</div>
                    <div className="small" style={{opacity:.8}}>{a.appId}</div>
                  </td>
                  <td style={{padding:'8px 6px'}}>{a.status || '-'}</td>
                  <td style={{padding:'8px 6px'}}>
                    <a className="inline-block px-3 py-1 rounded bg-yellow-400 text-black font-medium" href={manageHref(a)}>Gerenciar</a>
                  </td>
                </tr>
              ))}
              {pageItems.length===0 && <tr><td colSpan={3} style={{padding:'12px 8px', opacity:.7}}>Nenhum app</td></tr>}
            </tbody>
          </table>

          <div style={{display:'flex', gap:8, alignItems:'center', justifyContent:'flex-end', marginTop:8}}>
            <button onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1}>Anterior</button>
            <span className="small">Página {page} de {totalPages}</span>
            <button onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages}>Próxima</button>
          </div>
        </div>

        <div className="card">
          <h3 style={{marginTop:0}}>Detalhes do App</h3>
          {!selected && <div className="small" style={{opacity:.8}}>Selecione um app na lista para ver detalhes.</div>}
          {selected && (
            <div style={{display:'grid', gap:8}}>
              <div><b>Nome:</b> {selected.name}</div>
              {selected.status && <div><b>Status:</b> {selected.status}</div>}
              <div className="small" style={{opacity:.8}}><code>{selected.appId}</code></div>
              <a className="inline-block px-3 py-1 rounded bg-yellow-400 text-black font-medium" href={manageHref(selected)}>Gerenciar</a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
