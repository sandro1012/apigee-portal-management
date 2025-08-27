"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

type ApiProdRef = { apiproduct: string; status?: string };
type Credential = {
  consumerKey: string;
  consumerSecret?: string;
  status?: string;
  expiresAt?: string;
  issuedAt?: string;
  apiProducts?: ApiProdRef[];
};
type DevApp = {
  name: string;
  appId?: string;
  developerId?: string;
  developerEmail?: string;
  status?: string;
  attributes?: { name: string; value: string }[];
  apiProducts?: string[];
  credentials?: Credential[];
};

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || r.statusText || "Erro";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export default function AppManageOrDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();
  const sp = useSearchParams();
  const org = sp.get("org") || "";
  const manage = sp.get("manage") === "1";

  const appIdStr = String(appId || "");

  const [app, setApp] = useState<DevApp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [products, setProducts] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({});
  const [addingForKey, setAddingForKey] = useState<Record<string, string>>({}); // key -> product a adicionar

  // carrega detalhes do app (+ lista de products se estiver em modo manage)
  useEffect(() => {
    if (!appIdStr) return;
    const run = async () => {
      setLoading(true);
      setErr("");
      try {
        const base = `/api/apps/${encodeURIComponent(appIdStr)}`;
        const qs = org ? `?org=${encodeURIComponent(org)}` : "";
        const detail = await fetchJson<DevApp>(base + qs);
        setApp(detail);

        if (manage) {
          try {
            const pr: any = await fetchJson(`/api/products${qs}`);
            const list = (pr && (pr.apiProduct || pr.names)) || pr || [];
            setProducts(Array.isArray(list) ? list : []);
          } catch {
            // não bloqueia a tela se falhar
            setProducts([]);
          }
        } else {
          setProducts([]);
        }
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [appIdStr, org, manage]);

  const refresh = async () => {
    const base = `/api/apps/${encodeURIComponent(appIdStr)}`;
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    const detail = await fetchJson<DevApp>(base + qs);
    setApp(detail);
  };

  function gotoManage(on = true) {
    const u = new URL(window.location.href);
    if (on) u.searchParams.set("manage", "1");
    else u.searchParams.delete("manage");
    router.push(u.pathname + u.search);
  }

  async function setStatus(key: string, action: "approve" | "revoke") {
    const url = `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(
      key
    )}/status${org ? `?org=${encodeURIComponent(org)}` : ""}`;
    await fetchJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refresh();
  }

  async function deleteKey(key: string) {
    if (!confirm("Tem certeza que deseja excluir esta credencial?")) return;
    const url = `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(
      key
    )}${org ? `?org=${encodeURIComponent(org)}` : ""}`;
    await fetchJson(url, { method: "DELETE" });
    await refresh();
  }

  async function bulkDelete() {
    const keys = Object.entries(selectedKeys)
      .filter(([k, v]) => v)
      .map(([k]) => k);
    if (keys.length === 0) return alert("Selecione ao menos 1 credencial.");
    if (!confirm(`Excluir ${keys.length} credencial(is)?`)) return;

    for (const k of keys) {
      try {
        const url = `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(
          k
        )}${org ? `?org=${encodeURIComponent(org)}` : ""}`;
        await fetchJson(url, { method: "DELETE" });
      } catch (e) {
        console.error("Falha ao excluir", k, e);
      }
    }
    setSelectedKeys({});
    await refresh();
  }

  async function removeProduct(key: string, product: string) {
    const url = `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(
      key
    )}/products/${encodeURIComponent(product)}${org ? `?org=${encodeURIComponent(org)}` : ""}`;
    await fetchJson(url, { method: "DELETE" });
    await refresh();
  }

  async function addProduct(key: string) {
    const prod = (addingForKey[key] || "").trim();
    if (!prod) return alert("Selecione um product para adicionar.");
    const url = `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(
      key
    )}/products/add${org ? `?org=${encodeURIComponent(org)}` : ""}`;
    await fetchJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiProduct: prod }),
    });
    setAddingForKey((s) => ({ ...s, [key]: "" }));
    await refresh();
  }

  const creds = useMemo(() => app?.credentials || [], [app]);

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
          {/* Cabeçalho com informações do App */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Nome</div>
              <div className="font-mono break-all">{app.name}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">App ID</div>
              <div className="font-mono break-all">{app.appId || "-"}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Developer</div>
              <div className="font-mono break-all">
                {app.developerEmail || app.developerId || "-"}
              </div>
            </div>
          </div>

          {/* Atributos */}
          {app.attributes && app.attributes.length > 0 && (
            <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-semibold mb-2">Atributos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {app.attributes.map((at, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{at.name}</span>
                    <span className="font-mono break-all">{at.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Botão para abrir/fechar modo Gerenciar */}
          <div className="flex gap-3">
            {!manage ? (
              <button
                onClick={() => gotoManage(true)}
                className="px-3 py-2 rounded bg-black text-white"
              >
                Gerenciar credenciais
              </button>
            ) : (
              <button
                onClick={() => gotoManage(false)}
                className="px-3 py-2 rounded border"
              >
                Voltar aos detalhes
              </button>
            )}
          </div>

          {/* Modo Gerenciar credenciais */}
          {manage && (
            <section className="space-y-4">
              <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Credenciais</h2>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 rounded bg-rose-600 text-white disabled:opacity-50"
                      disabled={!Object.values(selectedKeys).some(Boolean)}
                      onClick={bulkDelete}
                      title="Excluir credenciais selecionadas"
                    >
                      Excluir selecionadas
                    </button>
                  </div>
                </div>

                {creds.length === 0 && (
                  <div className="text-sm text-zinc-600 mt-2">
                    Este app não possui credenciais. Criação de credenciais está
                    desativada no portal (faça via CLI/pipeline).
                  </div>
                )}

                <div className="mt-3 space-y-4">
                  {creds.map((c) => {
                    const associated = c.apiProducts?.map((p) => p.apiproduct) || [];
                    const notAssoc = products.filter((p) => !associated.includes(p));
                    return (
                      <div key={c.consumerKey} className="border rounded-xl p-3">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={!!selectedKeys[c.consumerKey]}
                              onChange={(e) =>
                                setSelectedKeys((s) => ({
                                  ...s,
                                  [c.consumerKey]: e.target.checked,
                                }))
                              }
                              className="mt-1"
                              aria-label="Selecionar credencial"
                            />
                            <div>
                              <div className="text-xs text-zinc-500">Key</div>
                              <div className="font-mono text-sm break-all">
                                {c.consumerKey}
                              </div>
                              <div className="text-xs text-zinc-500 mt-2">Status</div>
                              <div className="capitalize">{c.status || "-"}</div>
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <div className="text-xs text-zinc-500">Secret</div>
                            <div className="font-mono text-sm break-all">
                              {c.consumerSecret || "-"}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
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
                            {associated.map((p) => (
                              <span
                                key={p}
                                className="inline-flex items-center gap-2 border rounded-full px-2 py-1 text-sm"
                              >
                                {p}
                                <button
                                  className="text-rose-600"
                                  title="remover"
                                  onClick={() => removeProduct(c.consumerKey, p)}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            {associated.length === 0 && (
                              <span className="text-sm text-zinc-600">Nenhum</span>
                            )}
                          </div>

                          {products.length > 0 && (
                            <div className="mt-2 flex gap-2 items-center">
                              <select
                                className="border rounded p-1"
                                value={addingForKey[c.consumerKey] || ""}
                                onChange={(e) =>
                                  setAddingForKey((s) => ({
                                    ...s,
                                    [c.consumerKey]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Adicionar product…</option>
                                {products.map((p) => (
                                  <option
                                    key={p}
                                    value={p}
                                    disabled={associated.includes(p)}
                                  >
                                    {p}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-50"
                                disabled={!addingForKey[c.consumerKey]}
                                onClick={() => addProduct(c.consumerKey)}
                              >
                                Adicionar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
