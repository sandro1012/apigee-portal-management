"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useParams } from "next/navigation";

type Credential = {
  consumerKey: string;
  consumerSecret?: string;
  status?: string;
  apiProducts?: { apiproduct: string; status?: string }[];
};
type AppDetail = {
  name: string;
  appId?: string;
  developerEmail?: string;
  status?: string;
  attributes?: { name: string; value: string }[];
  credentials?: Credential[];
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const text = await r.text();
  let j: any = null;
  try { j = text ? JSON.parse(text) : null; } catch {}
  if (!r.ok) throw new Error(j?.error || r.statusText || text || "Erro");
  return j;
}

export default function AppManagePage() {
  const { appId } = useParams<{appId:string}>();
  const search = useSearchParams();
  const org = search.get("org") || "";
  const appIdStr = String(appId||"");

  const [app, setApp] = useState<AppDetail|null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(()=>{
    const load = async () => {
      setLoading(true); setErr("");
      try {
        const qs = org ? ("?org=" + encodeURIComponent(org)) : "";
        const j = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
        setApp(j);
      } catch (e:any) {
        setErr(e.message || String(e));
      } finally { setLoading(false); }
    };
    if (appIdStr) load();
  }, [appIdStr, org]);

  async function setStatus(key: string, action: "approve"|"revoke") {
    const qs = org ? ("?org=" + encodeURIComponent(org)) : "";
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}/status${qs}`, {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ action })
    });
    // refresh
    const j = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
    setApp(j);
  }

  async function removeProduct(key: string, product: string) {
    const qs = org ? ("?org=" + encodeURIComponent(org)) : "";
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}/products/${encodeURIComponent(product)}${qs}`, { method: "DELETE" });
    const j = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
    setApp(j);
  }

  async function addProduct(key: string, product: string) {
    const qs = org ? ("?org=" + encodeURIComponent(org)) : "";
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}/products/add${qs}`, {
      method: "POST", headers: {"content-type":"application/json"},
      body: JSON.stringify({ apiProduct: product })
    });
    const j = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
    setApp(j);
  }

  const backHref = useMemo(()=>{
    const u = new URL("/ui/apps", window.location.origin);
    if (org) u.searchParams.set("org", org);
    return u.toString().replace(window.location.origin, "");
  }, [org]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciar credenciais do App <span className="text-xs px-2 py-1 rounded-full border ml-2">v3c</span></h1>
        <a href={backHref} className="px-3 py-1 rounded bg-yellow-400 text-black font-medium">← Voltar aos Apps</a>
      </div>

      {loading && <div>Carregando…</div>}
      {err && <div className="text-red-600 whitespace-pre-wrap">Erro: {err}</div>}
      {app && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Nome</div>
              <div className="font-mono break-all">{app.name}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">App ID</div>
              <div className="font-mono break-all">{app.appId}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Status</div>
              <div className="capitalize">{app.status}</div>
            </div>
          </div>

          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <h2 className="text-lg font-semibold mb-3">Credenciais</h2>
            <div className="space-y-4">
              {(app.credentials || []).map((c) => {
                const notAssoc = []; // products list opcional removida por ora
                return (
                  <div key={c.consumerKey} className="border rounded-xl p-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <div>
                        <div className="text-xs text-zinc-500">Key</div>
                        <div className="font-mono text-sm break-all">{c.consumerKey}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Secret</div>
                        <div className="font-mono text-sm break-all">{c.consumerSecret || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Status</div>
                        <div className="capitalize">{c.status}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={()=>setStatus(c.consumerKey, "approve")}>Aprovar</button>
                        <button className="px-3 py-1 rounded bg-amber-600 text-white" onClick={()=>setStatus(c.consumerKey, "revoke")}>Revogar</button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs text-zinc-500 mb-1">Products associados</div>
                      <div className="flex flex-wrap gap-2">
                        {(c.apiProducts||[]).map(p => (
                          <span key={p.apiproduct} className="inline-flex items-center gap-2 border rounded-full px-2 py-1 text-sm">
                            {p.apiproduct}
                            <button className="text-rose-600" title="remover" onClick={()=>removeProduct(c.consumerKey, p.apiproduct!)}>×</button>
                          </span>
                        ))}
                      </div>
                      {/* Adicionar product (lista de products carregada na tela de Apps) poderia ser integrada depois */}
                      <div className="mt-2 flex gap-2 items-center">
                        <input className="border rounded p-1" placeholder="digite o product exato…" id={`add-${c.consumerKey}`} />
                        <button className="px-2 py-1 rounded bg-indigo-600 text-white" onClick={()=>{
                          const inp = document.getElementById(`add-${c.consumerKey}`) as HTMLInputElement | null;
                          const val = inp?.value?.trim() || "";
                          if (val) addProduct(c.consumerKey, val);
                        }}>Adicionar</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(app.credentials||[]).length===0 && <div className="text-sm opacity-70">Nenhuma credencial para este app.</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
