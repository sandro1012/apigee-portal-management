
<<<<<<< HEAD
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
=======
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DevAppLite = { name: string; appId: string; developerId?: string; developerEmail?: string };

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

export default function AppsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<DevAppLite[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
>>>>>>> fix/patch3h-apps-restore

  const start = (page-1) * pageSize;
  const end = start + pageSize;
  const pageItems = apps.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(apps.length / pageSize));

<<<<<<< HEAD
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
=======
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        // Rota lê org do cookie (como antes). Não exigimos ?org= na URL.
        const res = await fetchJson(`/api/apps`);
        const list: DevAppLite[] = res.apps || res || [];
        setApps(list);
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);
>>>>>>> fix/patch3h-apps-restore

  const manageHref = (a: AppItem) => {
    const u = new URL(`/ui/apps/${encodeURIComponent(a.appId)}`, window.location.origin);
    if (org) u.searchParams.set("org", org);
    return u.toString().replace(window.location.origin, "");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Apps</h1>

      <div className="flex items-center gap-2 ml-auto">
        <label className="text-sm">Mostrar</label>
        <select
          className="border rounded p-1 text-sm"
          value={pageSize}
          onChange={(e)=>{ setPage(1); setPageSize(Number(e.target.value)); }}>
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="text-sm">por página</span>
      </div>

<<<<<<< HEAD
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
=======
      {loading && <div>Carregando...</div>}
      {error && <div className="text-red-600 whitespace-pre-wrap">Erro: {error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pageItems.map((app) => (
          <div key={app.appId} className="p-3 rounded-2xl border shadow-sm bg-white dark:bg-zinc-900 flex flex-col gap-2">
            <div className="font-mono truncate" title={app.name}>{app.name}</div>
            <div className="text-xs text-zinc-500 break-all">{app.appId}</div>
            <div className="text-xs text-zinc-500 break-all">{app.developerEmail || app.developerId}</div>
            <div className="mt-2">
              <button
                className="px-3 py-1 rounded bg-black text-white"
                onClick={()=>router.push(`/ui/apps/${encodeURIComponent(app.appId)}`)}>
                Detalhes
              </button>
>>>>>>> fix/patch3h-apps-restore
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button className="px-2 py-1 border rounded" disabled={page<=1} onClick={()=>setPage(p => Math.max(1, p-1))}>Anterior</button>
          <div className="text-sm">Página {page} / {totalPages}</div>
          <button className="px-2 py-1 border rounded" disabled={page>=totalPages} onClick={()=>setPage(p => Math.min(totalPages, p+1))}>Próxima</button>
        </div>
      )}
    </div>
  );
}
