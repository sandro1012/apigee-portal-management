"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NewCredentialDrawer from "./components/NewCredentialDrawer";

type DevAppLite = { name: string; appId: string; developerId?: string; developerEmail?: string };

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

export default function AppsPage() {
  const search = useSearchParams();
  const router = useRouter();
  const org = search.get("org") || "";
  const [apps, setApps] = useState<DevAppLite[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const start = (page-1) * pageSize;
  const end = start + pageSize;
  const pageItems = apps.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(apps.length / pageSize));

  useEffect(() => {
    const run = async () => {
      if (!org) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetchJson(`/api/apps?org=${encodeURIComponent(org)}`);
        // espera campo apps ou lista direta
        const list: DevAppLite[] = res.apps || res || [];
        setApps(list);
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [org]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Apps</h1>

      <div className="flex items-center gap-3">
        <div className="text-sm">Org atual:</div>
        <div className="font-mono text-sm">{org || "(defina org)"}</div>
        <div className="ml-auto flex items-center gap-2">
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
      </div>

      {loading && <div>Carregando...</div>}
      {error && <div className="text-red-600 whitespace-pre-wrap">Erro: {error}</div>}

      <div className="divide-y rounded-2xl border overflow-hidden">
        {pageItems.map((app) => (
          <div key={app.appId} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-mono truncate">{app.name}</div>
              <div className="text-xs text-zinc-500 break-all">{app.appId}</div>
            </div>
            <NewCredentialDrawer
              appId={app.appId}
              appName={app.name}
              org={org}
              onCreated={()=>{/* noop; você pode forçar refresh se quiser */}}
            />
            <button
              className="px-3 py-1 rounded bg-black text-white"
              onClick={()=>router.push(`/ui/apps/${encodeURIComponent(app.appId)}?org=${encodeURIComponent(org)}`)}>
              Detalhes
            </button>
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
