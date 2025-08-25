"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type ApiProductRef = { apiproduct: string; status?: string };
type Credential = { consumerKey: string; consumerSecret?: string; status?: string; apiProducts?: ApiProductRef[] };
type DevApp = {
  name: string;
  appId?: string;
  status?: string;
  credentials?: Credential[];
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) {
    let msg = r.statusText;
    try { msg = (await r.text()) || msg; } catch {}
    throw new Error(msg);
  }
  return await r.json();
}

export default function CredentialDetailPage() {
  const { appId, consumerKey } = useParams<{ appId: string; consumerKey: string }>();
  const search = useSearchParams();
  const org = search.get("org") || "";
  const appIdStr = String(appId || "");
  const keyStr = String(consumerKey || "");

  const [app, setApp] = useState<DevApp | null>(null);
  const [cred, setCred] = useState<Credential | null>(null);
  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [addSel, setAddSel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const qs = org ? ("?org=" + encodeURIComponent(org)) : "";

  const currentProducts = useMemo(() => (cred?.apiProducts || []).map(p => p.apiproduct), [cred]);
  const availableProducts = useMemo(() => allProducts.filter(p => !currentProducts.includes(p)), [allProducts, currentProducts]);

  async function load() {
    setLoading(true); setErr("");
    try {
      // app + cred
      const detail: DevApp = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
      setApp(detail);
      const found = (detail.credentials || []).find(c => c.consumerKey === keyStr) || null;
      setCred(found);

      // products (lenient shapes: array of strings OR array of {name} OR {apiProduct:[]})
      const pr = await fetchJson(`/api/products${qs}`);
      let names: string[] = [];
      if (Array.isArray(pr)) {
        if (pr.length > 0 && typeof pr[0] === "string") {
          names = pr as string[];
        } else if (pr.length > 0 && typeof pr[0] === "object" && pr[0]?.name) {
          names = (pr as any[]).map((x: any) => String(x.name));
        }
      } else if (pr?.apiProduct && Array.isArray(pr.apiProduct)) {
        names = (pr.apiProduct as any[]).map((x: any) => String(x.name || x.displayName || x));
      } else if (pr?.names && Array.isArray(pr.names)) {
        names = pr.names as string[];
      }
      setAllProducts(names.sort((a,b)=>a.localeCompare(b)));
      if (names.length > 0) setAddSel(names[0]);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally { setLoading(false); }
  }

  useEffect(() => { if (appIdStr && keyStr) load(); }, [appIdStr, keyStr, org]);

  async function approve() {
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(keyStr)}/status${qs}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve" })
    });
    await load();
  }
  async function revoke() {
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(keyStr)}/status${qs}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "revoke" })
    });
    await load();
  }
  async function del() {
    if (!confirm("Excluir credencial?")) return;
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(keyStr)}${qs}`, { method: "DELETE" });
    // volta para a página do app
    window.location.href = `/ui/apps/${encodeURIComponent(appIdStr)}${qs}`;
  }
  async function addProduct() {
    if (!addSel) return;
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(keyStr)}/products/add${qs}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiProduct: addSel })
    });
    await load();
  }
  async function removeProduct(p: string) {
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(keyStr)}/products/${encodeURIComponent(p)}${qs}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Credencial do App</h1>
        <span className="text-xs px-2 py-1 rounded-full border">v3-products</span>
      </div>

      {loading && <div>Carregando…</div>}
      {err && <div className="text-red-600 whitespace-pre-wrap">Erro: {err}</div>}

      {app && cred && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">App</div>
              <div className="font-mono break-all">{app.name}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Key</div>
              <div className="font-mono break-all">{cred.consumerKey}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Status</div>
              <div className="capitalize">{cred.status}</div>
            </div>
          </div>

          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <h2 className="text-lg font-semibold mb-3">Secret</h2>
            <div className="font-mono break-all">{cred.consumerSecret || "-"}</div>
          </section>

          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <h2 className="text-lg font-semibold mb-3">Ações</h2>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={approve}>Aprovar</button>
              <button className="px-3 py-2 rounded bg-amber-600 text-white" onClick={revoke}>Revogar</button>
              <button className="px-3 py-2 rounded bg-rose-600 text-white" onClick={del}>Excluir credencial</button>
              <a className="px-3 py-2 rounded border" href={`/ui/apps/${encodeURIComponent(appIdStr)}${qs}`}>Voltar ao App</a>
            </div>
          </section>

          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <h2 className="text-lg font-semibold mb-3">Products associados</h2>
            <div className="flex flex-wrap gap-2">
              {(cred.apiProducts || []).map(p => (
                <span key={p.apiproduct} className="inline-flex items-center gap-2 border rounded-full px-2 py-1 text-sm">
                  {p.apiproduct}
                  <button className="text-rose-600" title="remover" onClick={() => removeProduct(p.apiproduct)}>×</button>
                </span>
              ))}
              {(cred.apiProducts || []).length === 0 && <div className="text-sm opacity-70">Nenhum product associado.</div>}
            </div>

            <div className="mt-3 flex gap-2 items-center">
              <select className="border rounded p-2 min-w-[220px]" value={addSel} onChange={e=>setAddSel(e.target.value)}>
                {availableProducts.length === 0 && <option value="">Nenhum product disponível</option>}
                {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button className="px-3 py-2 rounded bg-indigo-600 text-white" disabled={!addSel} onClick={addProduct}>Adicionar</button>
            </div>
            <div className="text-xs text-zinc-500 mt-2">A lista acima mostra apenas os products ainda não associados a esta credencial.</div>
          </section>
        </div>
      )}
    </div>
  );
}
