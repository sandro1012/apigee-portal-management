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
  status?: string;
  attributes?: { name: string; value: string }[];
  credentials?: Credential[];
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const txt = await r.text();
  const data = txt ? JSON.parse(txt) : null;
  if (!r.ok) throw new Error(data?.error || r.statusText);
  return data;
}

function normalizeProductNames(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    // pode já ser array de strings ou array de objetos {name}
    if (typeof input[0] === "string") return input as string[];
    return (input as any[]).map((x) => x?.name).filter(Boolean);
  }
  if (Array.isArray(input.apiProduct)) return input.apiProduct;
  if (Array.isArray(input.apiProducts)) return input.apiProducts.map((x: any) => x?.name).filter(Boolean);
  if (Array.isArray(input.names)) return input.names;
  return [];
}

export default function AppCredsManagePage() {
  const { appId } = useParams<{ appId: string }>();
  const search = useSearchParams();
  const org = search.get("org") || "";

  const appIdStr = String(appId || "");

  const [app, setApp] = useState<DevApp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // lista de products (nomes) para combo de adicionar a uma credencial
  const [products, setProducts] = useState<string[]>([]);

  // carrega detalhe do app + lista de products
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const qs = org ? "?org=" + encodeURIComponent(org) : "";
        const detail = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
        setApp(detail);

        // products (não bloqueia a tela se falhar)
        try {
          const pr = await fetchJson(`/api/products${qs}`);
          setProducts(normalizeProductNames(pr));
        } catch (_) {
          setProducts([]);
        }
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    if (appIdStr) load();
  }, [appIdStr, org]);

  async function refresh() {
    const qs = org ? "?org=" + encodeURIComponent(org) : "";
    const j = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
    setApp(j);
  }

  async function setStatus(key: string, action: "approve" | "revoke") {
    const qs = org ? "?org=" + encodeURIComponent(org) : "";
    await fetchJson(
      `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}/status${qs}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      }
    );
    await refresh();
  }

  async function deleteKey(key: string) {
    if (!confirm("Tem certeza que deseja excluir esta credencial?")) return;
    const qs = org ? "?org=" + encodeURIComponent(org) : "";
    await fetchJson(
      `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}${qs}`,
      { method: "DELETE" }
    );
    await refresh();
  }

  async function addProduct(key: string, product: string) {
    const qs = org ? "?org=" + encodeURIComponent(org) : "";
    await fetchJson(
      `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(
        key
      )}/products/add${qs}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiProduct: product }),
      }
    );
    await refresh();
  }

  async function removeProduct(key: string, product: string) {
    const qs = org ? "?org=" + encodeURIComponent(org) : "";
    await fetchJson(
      `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(
        key
      )}/products/${encodeURIComponent(product)}${qs}`,
      { method: "DELETE" }
    );
    await refresh();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Gerenciar credenciais do App{" "}
          <span className="text-xs px-2 py-1 rounded-full border ml-2">v3c</span>
        </h1>
      </div>

      {loading && <div>Carregando…</div>}
      {err && <div className="text-red-600 whitespace-pre-wrap">Erro: {err}</div>}

      {app && (
        <div className="space-y-6">
          {/* cards superiores (nome, id, status) */}
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

          {/* credenciais */}
          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Credenciais</h2>
              {/* removemos “Nova credencial” como combinado */}
            </div>

            {(app.credentials || []).length === 0 && (
              <div className="text-sm text-zinc-500">
                Este app não possui credenciais ativas.
              </div>
            )}

            <div className="space-y-4">
              {(app.credentials || []).map((c) => {
                const current = new Set((c.apiProducts || []).map((p) => p.apiproduct));
                const notAssoc = products.filter((p) => !current.has(p));
                return (
                  <div key={c.consumerKey} className="border rounded-xl p-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <div>
                        <div className="text-xs text-zinc-500">Key</div>
                        <div className="font-mono text-sm break-all">{c.consumerKey}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Secret</div>
                        <div className="font-mono text-sm break-all">
                          {c.consumerSecret || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Status</div>
                        <div className="capitalize">{c.status || "-"}</div>
                      </div>
                      <div className="flex gap-2">
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
                      <div className="text-xs text-zinc-500 mb-1">
                        Products associados
                      </div>
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
                            const sel = e.currentTarget
                              .previousSibling as HTMLSelectElement | null;
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
            </div>
          </section>

          {/* voltar ao app (link simples no final, como você pediu) */}
          <div className="pt-2">
            <a
              className="inline-flex items-center px-3 py-2 rounded bg-zinc-800 text-white hover:bg-zinc-700"
              href={`/ui/apps/${encodeURIComponent(appIdStr)}?org=${encodeURIComponent(org)}`}
            >
              Voltar ao App
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
