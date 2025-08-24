
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";

type CredProduct = { apiproduct: string; status?: string };
type Credential = {
  consumerKey: string;
  consumerSecret?: string;
  status?: string;
  apiProducts?: CredProduct[];
};
type DevApp = {
  name: string;
  appId?: string;
  developerEmail?: string;
  developerId?: string;
  credentials?: Credential[];
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

export default function CredentialDetailPage() {
  const router = useRouter();
  const { appId, consumerKey } = useParams<{ appId: string; consumerKey: string }>();
  const search = useSearchParams();
  const org = search.get("org") || "";

  const [app, setApp] = useState<DevApp | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<string[]>([]);

  const cred = useMemo(() => {
    return (app?.credentials || []).find(c => c.consumerKey === consumerKey) || null;
  }, [app, consumerKey]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await fetchJson(`/api/apps/${encodeURIComponent(appId)}${org ? `?org=${encodeURIComponent(org)}` : ""}`);
        setApp(detail);
        const pr = await fetchJson(`/api/products${org ? `?org=${encodeURIComponent(org)}` : ""}`);
        setProducts(pr?.apiProduct || pr?.names || []);
      } catch (e:any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [appId, org]);

  const refresh = async () => {
    const detail = await fetchJson(`/api/apps/${encodeURIComponent(appId)}${org ? `?org=${encodeURIComponent(org)}` : ""}`);
    setApp(detail);
  };

  async function setStatus(action: "approve"|"revoke") {
    await fetchJson(`/api/apps/${encodeURIComponent(appId)}/credentials/${encodeURIComponent(consumerKey)}/status${org ? `?org=${encodeURIComponent(org)}` : ""}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refresh();
  }

  async function deleteKey() {
    if (!confirm("Tem certeza que deseja excluir esta credencial?")) return;
    await fetchJson(`/api/apps/${encodeURIComponent(appId)}/credentials/${encodeURIComponent(consumerKey)}${org ? `?org=${encodeURIComponent(org)}` : ""}`, {
      method: "DELETE",
    });
    // volta para a página do app
    router.push(`/ui/apps/${encodeURIComponent(appId)}${org ? `?org=${encodeURIComponent(org)}` : ""}`);
  }

  async function addProduct(p: string) {
    await fetchJson(`/api/apps/${encodeURIComponent(appId)}/credentials/${encodeURIComponent(consumerKey)}/products/add${org ? `?org=${encodeURIComponent(org)}` : ""}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiProduct: p }),
    });
    await refresh();
  }

  async function removeProduct(p: string) {
    await fetchJson(`/api/apps/${encodeURIComponent(appId)}/credentials/${encodeURIComponent(consumerKey)}/products/${encodeURIComponent(p)}${org ? `?org=${encodeURIComponent(org)}` : ""}`, {
      method: "DELETE",
    });
    await refresh();
  }

  const notAssoc = useMemo(() => {
    const set = new Set((cred?.apiProducts || []).map(p => p.apiproduct));
    return products.filter(p => !set.has(p));
  }, [products, cred]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Credencial do App</h1>
      {loading && <div>Carregando...</div>}
      {error && <div className="text-red-600 whitespace-pre-wrap">Erro: {error}</div>}

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

          <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Secret</div>
            <div className="font-mono break-all">{cred.consumerSecret || "-"}</div>
          </div>

          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <h2 className="text-lg font-semibold mb-3">Ações</h2>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={()=>setStatus("approve")}>Aprovar</button>
              <button className="px-3 py-1 rounded bg-amber-600 text-white" onClick={()=>setStatus("revoke")}>Revogar</button>
              <button className="px-3 py-1 rounded bg-rose-600 text-white" onClick={deleteKey}>Excluir credencial</button>
              <button className="px-3 py-1 rounded border" onClick={()=>router.push(`/ui/apps/${encodeURIComponent(appId)}${org ? `?org=${encodeURIComponent(org)}` : ""}`)}>Voltar ao App</button>
            </div>
          </section>

          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <h2 className="text-lg font-semibold mb-3">Products associados</h2>
            <div className="flex flex-wrap gap-2">
              {(cred.apiProducts || []).map(p => (
                <span key={p.apiproduct} className="inline-flex items-center gap-2 border rounded-full px-2 py-1 text-sm">
                  {p.apiproduct}
                  <button className="text-rose-600" onClick={()=>removeProduct(p.apiproduct)} title="remover">×</button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2 items-center">
              <select className="border rounded p-1" defaultValue="">
                <option value="" disabled>Adicionar product…</option>
                {notAssoc.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button className="px-2 py-1 rounded bg-indigo-600 text-white" onClick={(e)=>{
                const sel = (e.currentTarget.previousSibling as HTMLSelectElement);
                const val = sel?.value || "";
                if (val) addProduct(val);
              }}>Adicionar</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
