"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";

type Credential = {
  consumerKey: string;
  consumerSecret?: string;
  status?: string;
  apiProducts?: { apiproduct: string; status?: string }[];
};

type DevApp = {
  name: string;
  appId?: string;
  developerId?: string;
  developerEmail?: string;
  credentials?: Credential[];
  apiProducts?: string[];
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

export default function AppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const search = useSearchParams();
  const org = search.get("org") || "";
  const [app, setApp] = useState<DevApp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [createSel, setCreateSel] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await fetchJson(`/api/apps/${encodeURIComponent(appId)}?org=${encodeURIComponent(org)}`);
        setApp(detail);
        const pr = await fetchJson(`/api/products?org=${encodeURIComponent(org)}`);
        setAllProducts(pr?.apiProduct || pr?.names || []);
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    if (org) run();
  }, [appId, org]);

  const refresh = async () => {
    const detail = await fetchJson(`/api/apps/${encodeURIComponent(appId)}?org=${encodeURIComponent(org)}`);
    setApp(detail);
  };

  async function createCredential() {
    if (createSel.length === 0) return alert("Selecione ao menos 1 API Product");
    const body: any = { apiProducts: createSel };
    if (expiresIn) {
      const num = Number(expiresIn);
      if (!Number.isNaN(num)) body.keyExpiresIn = num;
    }
    await fetchJson(`/api/apps/${encodeURIComponent(appId)}/credentials?org=${encodeURIComponent(org)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setCreateSel([]); setExpiresIn("");
    await refresh();
  }

  async function setStatus(key: string, action: "approve"|"revoke") {
    await fetchJson(`/api/apps/${encodeURIComponent(appId)}/credentials/${encodeURIComponent(key)}/status?org=${encodeURIComponent(org)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refresh();
  }

  async function deleteKey(key: string) {
    if (!confirm("Tem certeza que deseja excluir esta credencial?")) return;
    await fetchJson(`/api/apps/${encodeURIComponent(appId)}/credentials/${encodeURIComponent(key)}?org=${encodeURIComponent(org)}`, { method: "DELETE" });
    await refresh();
  }

  async function addProduct(key: string, product: string) {
    await fetchJson(`/api/apps/${encodeURIComponent(appId)}/credentials/${encodeURIComponent(key)}/products/add?org=${encodeURIComponent(org)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiProduct: product }),
    });
    await refresh();
  }

  async function removeProduct(key: string, product: string) {
    await fetchJson(`/api/apps/${encodeURIComponent(appId)}/credentials/${encodeURIComponent(key)}/products/${encodeURIComponent(product)}?org=${encodeURIComponent(org)}`, {
      method: "DELETE"
    });
    await refresh();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Detalhes do App</h1>
      {loading && <div>Carregando...</div>}
      {error && <div className="text-red-600 whitespace-pre-wrap">Erro: {error}</div>}
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
              <div className="text-xs text-zinc-500">Developer</div>
              <div className="font-mono break-all">{app.developerEmail || app.developerId}</div>
            </div>
          </div>

          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900" id="new-cred">
            <h2 className="text-lg font-semibold mb-3">Nova credencial</h2>
            <div className="flex flex-col md:flex-row gap-3 items-start">
              <select multiple value={createSel} onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                setCreateSel(opts);
              }} className="border rounded p-2 min-w-[240px] h-32">
                {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="border rounded p-2" placeholder="keyExpiresIn (ms) opcional" value={expiresIn} onChange={e=>setExpiresIn(e.target.value)} />
              <button className="px-3 py-2 rounded bg-black text-white" onClick={createCredential}>Criar</button>
            </div>
          </section>

          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <h2 className="text-lg font-semibold mb-3">Credenciais</h2>
            <div className="space-y-4">
              {(app.credentials || []).map((c) => {
                const notAssoc = allProducts.filter(p => !(c.apiProducts || []).some(x => x.apiproduct === p));
                return (
                  <div key={c.consumerKey} className="border rounded-xl p-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <div><div className="text-xs text-zinc-500">Key</div><div className="font-mono text-sm break-all">{c.consumerKey}</div></div>
                      <div><div className="text-xs text-zinc-500">Secret</div><div className="font-mono text-sm break-all">{c.consumerSecret || "-"}</div></div>
                      <div><div className="text-xs text-zinc-500">Status</div><div className="capitalize">{c.status}</div></div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={()=>setStatus(c.consumerKey, "approve")}>Aprovar</button>
                        <button className="px-3 py-1 rounded bg-amber-600 text-white" onClick={()=>setStatus(c.consumerKey, "revoke")}>Revogar</button>
                        <button className="px-3 py-1 rounded bg-rose-600 text-white" onClick={()=>deleteKey(c.consumerKey)}>Excluir</button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-zinc-500 mb-1">Products associados</div>
                      <div className="flex flex-wrap gap-2">
                        {(c.apiProducts||[]).map(p => (
                          <span key={p.apiproduct} className="inline-flex items-center gap-2 border rounded-full px-2 py-1 text-sm">
                            {p.apiproduct}
                            <button className="text-rose-600" title="remover" onClick={()=>removeProduct(c.consumerKey, p.apiproduct)}>×</button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2 items-center">
                        <select className="border rounded p-1" defaultValue="">
                          <option value="" disabled>Adicionar product…</option>
                          {notAssoc.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <button className="px-2 py-1 rounded bg-indigo-600 text-white" onClick={(e)=>{
                          const sel = (e.currentTarget.previousSibling as HTMLSelectElement);
                          const val = sel?.value || "";
                          if (val) addProduct(c.consumerKey, val);
                        }}>Adicionar</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
