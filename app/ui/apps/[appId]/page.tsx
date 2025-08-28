"use client";
import React, { useEffect, useState } from "react";
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
  status?: string;
  attributes?: { name: string; value: string }[];
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

function credHref(appId: string, key: string, org: string) {
  const base = "/ui/apps/" + encodeURIComponent(appId) + "/credentials/" + encodeURIComponent(key);
  return base + (org ? ("?org=" + encodeURIComponent(org)) : "");
}

export default function AppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const search = useSearchParams();
  const org = search.get("org") || "";

  const appIdStr = String(appId || "");

  const [app, setApp] = useState<DevApp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [products, setProducts] = useState<string[]>([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr("");
      try {
        const base = "/api/apps/" + encodeURIComponent(appIdStr);
        const qs = org ? ("?org=" + encodeURIComponent(org)) : "";
        const detail = await fetchJson(base + qs);
        setApp(detail);
        try {
          const pr = await fetchJson("/api/products" + qs);
          // aceitar array puro ou objeto
          const list = Array.isArray(pr) ? pr : (pr?.apiProduct || pr?.names || []);
          setProducts(Array.isArray(list) ? list.map(String) : []);
        } catch {
          // segue sem bloquear
        }
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    if (appIdStr) run();
  }, [appIdStr, org]);

  async function refresh() {
    const base = "/api/apps/" + encodeURIComponent(appIdStr);
    const qs = org ? ("?org=" + encodeURIComponent(org)) : "";
    const detail = await fetchJson(base + qs);
    setApp(detail);
  }

  async function setStatus(key: string, action: "approve" | "revoke") {
    const url =
      "/api/apps/" +
      encodeURIComponent(appIdStr) +
      "/credentials/" +
      encodeURIComponent(key) +
      "/status" +
      (org ? ("?org=" + encodeURIComponent(org)) : "");
    await fetchJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refresh();
  }

  async function deleteKey(key: string) {
    if (!confirm("Tem certeza que deseja excluir esta credencial?")) return;
    const url =
      "/api/apps/" +
      encodeURIComponent(appIdStr) +
      "/credentials/" +
      encodeURIComponent(key) +
      (org ? ("?org=" + encodeURIComponent(org)) : "");
    await fetchJson(url, { method: "DELETE" });
    await refresh();
  }

  async function addProduct(key: string, product: string) {
    const url =
      "/api/apps/" +
      encodeURIComponent(appIdStr) +
      "/credentials/" +
      encodeURIComponent(key) +
      "/products/add" +
      (org ? ("?org=" + encodeURIComponent(org)) : "");
    await fetchJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiProduct: product }),
    });
    await refresh();
  }

  async function removeProduct(key: string, product: string) {
    const url =
      "/api/apps/" +
      encodeURIComponent(appIdStr) +
      "/credentials/" +
      encodeURIComponent(key) +
      "/products/" +
      encodeURIComponent(product) +
      (org ? ("?org=" + encodeURIComponent(org)) : "");
    await fetchJson(url, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Detalhes do App</h1>
        <span className="text-xs px-2 py-1 rounded-full border">v3c</span>
      </div>

      {loading && <div>Carregando…</div>}
      {err && <div className="text-red-600 whitespace-pre-wrap">Erro: {err}</div>}

      {app && (
        <div className="space-y-6">
          {/* Cabeçalho em cards */}
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
              <div className="capitalize">{app.status || "-"}</div>
            </div>
          </div>

          {/* Atributos */}
          {(app.attributes?.length ?? 0) > 0 && (
            <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-semibold mb-2">Atributos</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {app.attributes!.map((at, i) => (
                  <li key={i} className="border rounded-xl p-2">
                    <span className="text-xs text-zinc-500">{at.name}</span>
                    <div className="font-mono break-all">{at.value}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Credenciais */}
          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Credenciais</h2>
              {/* dica topo */}
              <span className="text-xs text-zinc-500">
                Dica: use “Gerenciar” ao lado da key para abrir a visão completa.
              </span>
            </div>

            <div className="space-y-4">
              {(app.credentials || []).map((c) => {
                const notAssoc = products.filter(
                  (p) => !(c.apiProducts || []).some((x) => x.apiproduct === p)
                );
                const href = credHref(appIdStr, c.consumerKey, org);
                return (
                  <div key={c.consumerKey} className="border rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                      <div>
                        <div className="text-xs text-zinc-500">Key</div>
                        <div className="flex items-center gap-2">
                          <a href={href} className="font-mono text-sm underline break-all">
                            {c.consumerKey}
                          </a>
                          <a
                            href={href}
                            className="px-2 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-semibold"
                          >
                            Gerenciar
                          </a>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Secret</div>
                        <div className="font-mono text-sm break-all">{c.consumerSecret || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Status</div>
                        <div className="capitalize">{c.status || "-"}</div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className="px-3 py-1 rounded bg-emerald-600 text-white"
                          onClick={() => setStatus(c.consumerKey, "approve")}
                        >
                          Aprovar
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-amber-600 text-white"
                          onClick={() => setStatus(c.consumerKey, "revoke")}
                        >
                          Revogar
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-rose-600 text-white"
                          onClick={() => deleteKey(c.consumerKey)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs text-zinc-500 mb-1">Products associados</div>
                      <div className="flex flex-wrap gap-2">
                        {(c.apiProducts || []).map((p) => (
                          <span
                            key={p.apiproduct}
                            className="inline-flex items-center gap-2 border rounded-full px-2 py-1 text-sm"
                          >
                            {p.apiproduct}
                            <button
                              className="text-rose-600"
                              title="remover"
                              onClick={() => removeProduct(c.consumerKey, p.apiproduct)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="mt-2 flex gap-2 items-center">
                        <select className="border rounded p-1" defaultValue="">
                          <option value="" disabled>
                            Adicionar product…
                          </option>
                          {notAssoc.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <button
                          className="px-2 py-1 rounded bg-indigo-600 text-white"
                          onClick={(e) => {
                            const sel = e.currentTarget.previousSibling as HTMLSelectElement;
                            const val = sel?.value || "";
                            if (val) addProduct(c.consumerKey, val);
                          }}
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {(app.credentials?.length ?? 0) === 0 && (
                <div className="text-sm text-zinc-500">Este app não possui credenciais.</div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
