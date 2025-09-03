"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type CredProduct = { apiproduct: string; status?: string };
type Credential = {
  consumerKey: string;
  consumerSecret?: string;
  status?: string;
  apiProducts?: CredProduct[];
};
type AppDetail = {
  name: string;
  appId?: string;
  status?: string;
  developerEmail?: string;
  developerId?: string;
  attributes?: { name: string; value: string }[];
  credentials?: Credential[];
};

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const txt = await r.text();
  const data = txt ? JSON.parse(txt) : null;
  if (!r.ok) throw new Error(data?.error || r.statusText);
  return data as T;
}

/** Converte qualquer payload de products para string[] de nomes. */
function toProductNames(pr: any): string[] {
  // aceita vários formatos: array de objetos, array de strings, {apiProduct:[...]}, {names:[...]}
  const list = Array.isArray(pr) ? pr : (pr?.apiProduct || pr?.names || []);
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((x: any) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") return x.name || x.displayName || x.apiproduct || "";
      return "";
    })
    .filter(Boolean);
}

export default function ManageAppPage() {
  const { appId } = useParams<{ appId: string }>();
  const search = useSearchParams();
  const org = search.get("org") || "";
  const appIdStr = String(appId || "");

  const [app, setApp] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // products apenas para o dropdown de adicionar (opcional)
  const [allProducts, setAllProducts] = useState<string[]>([]);

  const btnBase: React.CSSProperties = {
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 600,
    border: "1px solid var(--border, #333)",
    cursor: "pointer",
    lineHeight: 1.1,
  };
  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    background: "#facc15", // amarelo
    color: "#111",
    borderColor: "#eab308",
  };
  const btnDanger: React.CSSProperties = {
    ...btnBase,
    background: "#ef4444", // vermelho
    color: "#fff",
    borderColor: "#dc2626",
  };
  const btnNeutral: React.CSSProperties = {
    ...btnBase,
    background: "transparent",
    color: "var(--fg, #eee)",
  };

  const chip: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid var(--border, #333)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 13,
  };

  useEffect(() => {
    if (!appIdStr) return;
    const run = async () => {
      setLoading(true);
      setErr("");
      try {
        const qs = org ? `?org=${encodeURIComponent(org)}` : "";
        // carrega detalhes do app
        const detail = await fetchJson<AppDetail>(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
        setApp(detail);

        // tenta carregar lista de products (não bloqueia)
        try {
          const pr = await fetchJson<any>(`/api/products${qs}`);
          setAllProducts(toProductNames(pr));
        } catch {
          setAllProducts([]);
        }
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [appIdStr, org]);

  const refresh = async () => {
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    const j = await fetchJson<AppDetail>(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
    setApp(j);
  };

  async function setStatus(key: string, action: "approve" | "revoke") {
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}/status${qs}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refresh();
  }

  async function deleteKey(key: string) {
    if (!confirm("Tem certeza que deseja excluir esta credencial?")) return;
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}${qs}`, {
      method: "DELETE",
    });
    await refresh();
  }

  async function addProduct(key: string, product: string) {
    if (!product) return;
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}/products/add${qs}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiProduct: product }),
    });
    await refresh();
  }

  async function removeProduct(key: string, product: string) {
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    await fetchJson(
      `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}/products/${encodeURIComponent(product)}${qs}`,
      { method: "DELETE" }
    );
    await refresh();
  }

  const creds = useMemo(() => app?.credentials || [], [app]);

  return (
    <div style={{ padding: 24, color: "var(--fg, #eee)" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>
          Gerenciar credenciais do App{" "}
          <span style={{ fontSize: 12, border: "1px solid var(--border, #333)", padding: "2px 8px", borderRadius: 999, marginLeft: 8 }}>
            v3c
          </span>
        </h1>
        <a href={`/ui/apps${org ? `?org=${encodeURIComponent(org)}` : ""}`} style={btnPrimary} title="Voltar para a lista de Apps">
          ← Voltar para lista de Apps
        </a>
      </div>

      {loading && <div>Carregando…</div>}
      {err && <div style={{ color: "#ef4444", whiteSpace: "pre-wrap" }}>Erro: {err}</div>}

      {/* Detalhes do App */}
      {app && (
        <div className="card" style={{ border: "1px solid var(--border, #333)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, fontWeight: 700 }}>App Details</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <div style={{ border: "1px solid var(--border, #333)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Status</div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{app.status || "-"}</div>
            </div>
            <div style={{ border: "1px solid var(--border, #333)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Name</div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", wordBreak: "break-all" }}>{app.name}</div>
            </div>
            <div style={{ border: "1px solid var(--border, #333)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>App ID</div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", wordBreak: "break-all" }}>{app.appId || "-"}</div>
            </div>
          </div>

          {/* Atributos (se houver) */}
          {Array.isArray(app.attributes) && app.attributes.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Atributos</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
                {app.attributes.map((a, i) => (
                  <div key={i} style={{ border: "1px solid var(--border, #333)", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{a.name}</div>
                    <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{a.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista de credenciais */}
      <div className="card" style={{ border: "1px solid var(--border, #333)", borderRadius: 16, padding: 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, fontWeight: 700 }}>Credenciais</h2>

        {creds.length === 0 && <div style={{ opacity: 0.8 }}>Este app não possui credenciais.</div>}

        {creds.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--border, #333)" }}>Key</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--border, #333)" }}>Secret</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--border, #333)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--border, #333)" }}>Products</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--border, #333)" }}>Ações</th>
                  <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid var(--border, #333)" }}>Adicionar product</th>
                </tr>
              </thead>
              <tbody>
                {creds.map((c) => {
                  const assoc = c.apiProducts?.map((p) => p.apiproduct) || [];
                  const notAssoc = allProducts.filter((p) => typeof p === "string" && !assoc.includes(p));
                  return (
                    <tr key={c.consumerKey} style={{ borderTop: "1px solid var(--border, #333)" }}>
                      {/* Key */}
                      <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", wordBreak: "break-all" }}>
                          {c.consumerKey}
                        </div>
                      </td>

                      {/* Secret */}
                      <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", wordBreak: "break-all", opacity: 0.9 }}>
                          {c.consumerSecret || "-"}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "10px 8px", verticalAlign: "top", textTransform: "capitalize" }}>
                        {c.status || "-"}
                      </td>

                      {/* Products (chips com X vermelho) */}
                      <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {(c.apiProducts || []).map((p) => (
                            <span key={p.apiproduct} style={chip}>
                              {p.apiproduct}
                              <button
                                onClick={() => removeProduct(c.consumerKey, p.apiproduct)}
                                title="Remover"
                                style={{
                                  cursor: "pointer",
                                  background: "transparent",
                                  border: 0,
                                  color: "#ef4444", // vermelho visível no fundo escuro
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button style={btnPrimary} onClick={() => setStatus(c.consumerKey, "approve")}>Aprovar</button>
                          <button style={btnNeutral} onClick={() => setStatus(c.consumerKey, "revoke")}>Revogar</button>
                          <button style={btnDanger} onClick={() => deleteKey(c.consumerKey)}>Excluir</button>
                        </div>
                      </td>

                      {/* Add product */}
                      <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <select
                            defaultValue=""
                            style={{ background: "transparent", color: "var(--fg, #eee)", border: "1px solid var(--border, #333)", borderRadius: 8, padding: "6px 8px" }}
                            onChange={(e) => {
                              const val = e.currentTarget.value;
                              if (val) addProduct(c.consumerKey, val);
                              e.currentTarget.value = "";
                            }}
                          >
                            <option value="" disabled>Adicionar…</option>
                            {notAssoc.map((p) => (
                              <option key={p} value={p} style={{ color: "#111" }}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
