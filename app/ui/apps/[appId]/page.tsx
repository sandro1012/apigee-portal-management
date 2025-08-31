"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";

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
  apiProducts?: string[];
  credentials?: Credential[];
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const t = await r.text();
  const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(j?.error || r.statusText);
  return j;
}

function classBtnPrimary() {
  return "inline-flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-400 hover:bg-yellow-500 text-black font-medium";
}
function classBtnGhost() {
  return "inline-flex items-center gap-2 px-3 py-2 rounded-md border border-yellow-400 text-yellow-400 hover:bg-yellow-400/10";
}
function classTag() {
  return "inline-flex items-center gap-2 border rounded-full px-2 py-1 text-sm";
}

export default function AppCredManagePage() {
  const { appId } = useParams<{ appId: string }>();
  const search = useSearchParams();
  const org = search.get("org") || "";
  const router = useRouter();

  const appIdStr = String(appId || "");
  const [app, setApp] = useState<DevApp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // lista de products p/ combos (usar no “adicionar product”)
  const [products, setProducts] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const qs = org ? `?org=${encodeURIComponent(org)}` : "";
        const detail = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
        setApp(detail);

        // tentar carregar products (não bloqueia a tela se falhar)
        try {
          const pr = await fetchJson(`/api/products${qs}`);
          const names: string[] = Array.isArray(pr)
            ? pr.map((x: any) => x?.name || x?.displayName).filter(Boolean)
            : (pr?.names || pr?.apiProduct || []);
          setProducts(
            (names || [])
              .map((n: any) => String(n))
              .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i)
              .sort((a: string, b: string) => a.localeCompare(b))
          );
        } catch {}
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    if (appIdStr) load();
  }, [appIdStr, org]);

  // refresh helper
  async function refresh() {
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    const j = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
    setApp(j);
  }

  async function setStatus(key: string, action: "approve" | "revoke") {
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
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
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    await fetchJson(
      `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}${qs}`,
      { method: "DELETE" }
    );
    await refresh();
  }

  async function addProduct(key: string, product: string) {
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
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
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    await fetchJson(
      `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(
        key
      )}/products/${encodeURIComponent(product)}${qs}`,
      { method: "DELETE" }
    );
    await refresh();
  }

  const creds = useMemo(() => app?.credentials || [], [app]);

  return (
    <div style={{ padding: 24 }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Gerenciar credenciais do App{" "}
          <span className="text-xs px-2 py-1 rounded-full border ml-2">v3c</span>
        </h1>
        <div className="flex items-center gap-2">
          {/* Voltar para a lista de Apps */}
          <a
            className={classBtnGhost()}
            href={`/ui/apps${org ? `?org=${encodeURIComponent(org)}` : ""}`}
          >
            Voltar para lista de Apps
          </a>
        </div>
      </div>

      {loading && <div>Carregando…</div>}
      {err && <div className="text-red-500 whitespace-pre-wrap">Erro: {err}</div>}

      {app && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Coluna 1: Dados do App */}
          <div className="rounded-2xl border border-yellow-500/40 p-4">
            <h2 className="font-semibold mb-3">App</h2>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <div className="text-xs opacity-70">Nome</div>
                <div className="font-mono break-all">{app.name}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">App ID</div>
                <div className="font-mono break-all">{app.appId || "-"}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Status</div>
                <div className="capitalize">{app.status || "-"}</div>
              </div>
            </div>
            <div className="mt-4">
              <a
                className={classBtnPrimary()}
                href={`/ui/apps/${encodeURIComponent(appIdStr)}${
                  org ? `?org=${encodeURIComponent(org)}&manage=1` : "?manage=1"
                }`}
              >
                Gerenciar (credenciais e products)
              </a>
            </div>
          </div>

          {/* Coluna 2-3: Credenciais */}
          <div className="lg:col-span-2 rounded-2xl border border-yellow-500/40 p-4">
            <h2 className="font-semibold mb-3">Credenciais</h2>

            {creds.length === 0 && (
              <div className="text-sm opacity-70">
                Este app não possui credenciais no momento.
              </div>
            )}

            <div className="space-y-4">
              {creds.map((c) => {
                const notAssoc = products.filter(
                  (p) => !(c.apiProducts || []).some((x) => x.apiproduct === p)
                );

                return (
                  <div key={c.consumerKey} className="rounded-xl border p-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <div className="text-xs opacity-70">Key</div>
                        <div className="font-mono text-sm break-all">{c.consumerKey}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-70">Secret</div>
                        <div className="font-mono text-sm break-all">
                          {c.consumerSecret || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs opacity-70">Status</div>
                        <div className="capitalize">{c.status || "-"}</div>
                      </div>
                      <div className="flex gap-2 items-start">
                        <button
                          className={classBtnPrimary()}
                          onClick={() => setStatus(c.consumerKey, "approve")}
                        >
                          Aprovar
                        </button>
                        <button
                          className={classBtnGhost()}
                          onClick={() => setStatus(c.consumerKey, "revoke")}
                        >
                          Revogar
                        </button>
                        <button
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white"
                          onClick={() => deleteKey(c.consumerKey)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs opacity-70 mb-1">Products associados</div>
                      <div className="flex flex-wrap gap-2">
                        {(c.apiProducts || []).map((p) => (
                          <span key={p.apiproduct} className={classTag()}>
                            {p.apiproduct}
                            <button
                              className="text-rose-500"
                              title="remover"
                              onClick={() => removeProduct(c.consumerKey, p.apiproduct!)}
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
                          className={classBtnPrimary()}
                          onClick={(e) => {
                            const sel = (e.currentTarget
                              .previousSibling as HTMLSelectElement)!;
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
          </div>

          {/* Rodapé com voltar */}
          <div className="lg:col-span-3">
            <a
              className={classBtnGhost()}
              href={`/ui/apps${org ? `?org=${encodeURIComponent(org)}` : ""}`}
            >
              Voltar para lista de Apps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
