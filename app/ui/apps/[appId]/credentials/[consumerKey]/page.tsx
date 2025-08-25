"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type ApiProductRef = { apiproduct: string; status?: string };
type Credential = { consumerKey: string; consumerSecret?: string; status?: string; apiProducts?: ApiProductRef[] };
type DevApp = { name: string; appId?: string; status?: string; credentials?: Credential[] };

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
  const qs = org ? ("?org=" + encodeURIComponent(org)) : "";
  const qsManage = org ? (`?org=${encodeURIComponent(org)}&manage=1`) : "?manage=1";

  const [app, setApp] = useState<DevApp | null>(null);
  const [cred, setCred] = useState<Credential | null>(null);
  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // add/remove product
  const currentProducts = useMemo(() => (cred?.apiProducts || []).map(p => p.apiproduct), [cred]);
  const availableProducts = useMemo(() => allProducts.filter(p => !currentProducts.includes(p)), [allProducts, currentProducts]);
  const [addSel, setAddSel] = useState<string>("");

  // inline "nova credencial"
  const [showCreate, setShowCreate] = useState(false);
  const [createSel, setCreateSel] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>(""); // ms

  async function load() {
    setLoading(true); setErr("");
    try {
      // app + cred atual
      const detail: DevApp = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
      setApp(detail);
      const found = (detail.credentials || []).find(c => c.consumerKey === keyStr) || null;
      setCred(found);

      // lista de products (aceita múltiplos formatos)
      const pr = await fetchJson(`/api/products${qs}`);
      let names: string[] = [];
      if (Array.isArray(pr)) {
        if (pr.length > 0 && typeof pr[0] === "string") names = pr as string[];
        else if (pr.length > 0 && typeof pr[0] === "object" && (pr[0] as any)?.name) names = (pr as any[]).map(x => String((x as any).name));
      } else if ((pr as any)?.apiProduct && Array.isArray((pr as any).apiProduct)) {
        names = ((pr as any).apiProduct as any[]).map(x => String((x as any).name || (x as any).displayName || x));
      } else if ((pr as any)?.names && Array.isArray((pr as any).names)) {
        names = (pr as any).names as string[];
      }
      names = names.sort((a,b)=>a.localeCompare(b));
      setAllProducts(names);
      setAddSel(names[0] || "");
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally { setLoading(false); }
  }
  useEffect(() => { if (appIdStr && keyStr) load(); }, [appIdStr, keyStr, org]);

  // ações credencial
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
    // volta para a UI do App (não para rota API)
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

  // criar nova credencial (inline)
  async function createCredential() {
    if (createSel.length === 0) return alert("Selecione ao menos 1 API Product");
    const body: any = { apiProducts: createSel };
    if (expiresIn.trim()) {
      const n = Number(expiresIn.trim());
      if (!Number.isNaN(n)) body.keyExpiresIn = n;
    }
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials${qs}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    setShowCreate(false); setCreateSel([]); setExpiresIn("");
    await load();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Credencial do App</h1>
        <span className="text-xs px-2 py-1 rounded-full border">v3b</span>
        <div className="ml-auto flex gap-2">
          <a className="px-3 py-2 rounded bg-zinc-900 text-white" href={`/ui/apps/${encodeURIComponent(appIdStr)}${qs}`}>Voltar ao App</a>
          <a className="px-3 py-2 rounded border" href={`/ui/apps/${encodeURIComponent(appIdStr)}${qsManage}`}>Abrir gestão do App</a>
        </div>
      </div>

      {loading && <div>Carregando…</div>}
      {err && <div className="text-red-600 whitespace-pre-wrap">Erro: {err}</div>}

      {app && cred && (
        <div className="space-y-6">
          {/* Linha principal: App / Key / Secret */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">App</div>
              <div className="font-medium break-all">{app.name}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Key</div>
              <div className="font-mono text-sm break-all">{cred.consumerKey}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Secret</div>
              <div className="font-mono text-sm break-all">{cred.consumerSecret || "-"}</div>
            </div>
          </div>

          {/* Status + Ações */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Status</div>
              <div className="capitalize">{cred.status}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900 md:col-span-2">
              <div className="text-xs text-zinc-500 mb-2">Ações</div>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={approve}>Aprovar</button>
                <button className="px-3 py-2 rounded bg-amber-600 text-white" onClick={revoke}>Revogar</button>
                <button className="px-3 py-2 rounded bg-rose-600 text-white" onClick={del}>Excluir credencial</button>
              </div>
            </div>
          </div>

          {/* Nova credencial (inline) */}
          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Nova credencial</h2>
              <button className="px-3 py-2 rounded border" onClick={()=>setShowCreate(v=>!v)}>
                {showCreate ? "Fechar" : "Abrir"}
              </button>
            </div>
            {showCreate && (
              <div className="flex flex-col md:flex-row gap-3 items-start">
                <select
                  multiple
                  value={createSel}
                  onChange={(e) => {
                    const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                    setCreateSel(opts);
                  }}
                  className="border rounded p-2 min-w-[240px] h-32"
                >
                  {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input
                  className="border rounded p-2"
                  placeholder="keyExpiresIn (ms) opcional"
                  value={expiresIn}
                  onChange={e=>setExpiresIn(e.target.value)}
                />
                <button className="px-3 py-2 rounded bg-black text-white" onClick={createCredential}>Criar</button>
              </div>
            )}
            {!showCreate && <div className="text-xs text-zinc-500">Abra para criar uma nova credencial com associação de products.</div>}
          </section>

          {/* Products associados */}
          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <h2 className="text-lg font-semibold mb-3">Products associados</h2>
            <div className="flex flex-wrap gap-2">
              {(cred.apiProducts || []).map(p => (
                <span key={p.apiproduct} className="inline-flex items-center gap-2 border rounded-full px-2 py-1 text-sm">
                  {p.apiproduct}
                  <button className="text-rose-600" title="remover" onClick={() => removeProduct(p.apiproduct)}>×</button>
                </span>
              ))}
              {(cred.apiProducts || []).length === 0 && (
                <div className="text-sm opacity-70">Nenhum product associado.</div>
              )}
            </div>

            <div className="mt-3 flex gap-2 items-center">
              <select
                className="border rounded p-2 min-w-[220px]"
                value={addSel}
                onChange={e=>setAddSel(e.target.value)}
              >
                {availableProducts.length === 0 && <option value="">Nenhum product disponível</option>}
                {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button className="px-3 py-2 rounded bg-indigo-600 text-white" disabled={!addSel} onClick={addProduct}>
                Adicionar
              </button>
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              A lista mostra apenas products ainda não associados.
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
