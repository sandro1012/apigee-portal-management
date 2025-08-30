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
  credentials?: Credential[];
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const t = await r.text();
  const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(j?.error || r.statusText);
  return j;
}

export default function AppManageV3() {
  const router = useRouter();
  const { appId } = useParams<{ appId: string }>();
  const search = useSearchParams();
  const org = search.get("org") || "";

  const appIdStr = String(appId || "");
  const [app, setApp] = useState<DevApp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [products, setProducts] = useState<string[]>([]); // todos os products do org

  const ACCENT = "#facc15"; // amarelo (Tailwind amber-400)

  // carrega detalhes do app e lista de products do org
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const qs = org ? `?org=${encodeURIComponent(org)}` : "";
        const detail = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
        setApp(detail);

        // products do org (robusto, já existente na sua API)
        const pr = await fetchJson(`/api/products${qs}`);
        const names: string[] =
          Array.isArray(pr) ? pr.map((p: any) => p.name || p.displayName || "").filter(Boolean)
          : Array.isArray(pr.apiProduct) ? pr.apiProduct.map((p: any) => p.name).filter(Boolean)
          : Array.isArray(pr.names) ? pr.names
          : [];
        setProducts(names);
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    if (appIdStr) load();
  }, [appIdStr, org]);

  const backToList = () => {
    const url = "/ui/apps" + (org ? `?org=${encodeURIComponent(org)}` : "");
    router.push(url);
  };

  const refresh = async () => {
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    const detail = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
    setApp(detail);
  };

  async function setStatus(key: string, action: "approve" | "revoke") {
    try {
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
    } catch (e: any) {
      alert(`Falha ao ${action === "approve" ? "aprovar" : "revogar"}: ${e.message || e}`);
    }
  }

  async function deleteKey(key: string) {
    if (!confirm("Tem certeza que deseja excluir esta credencial?")) return;
    try {
      const qs = org ? `?org=${encodeURIComponent(org)}` : "";
      await fetchJson(
        `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(key)}${qs}`,
        { method: "DELETE" }
      );
      await refresh();
    } catch (e: any) {
      alert(`Falha ao excluir: ${e.message || e}`);
    }
  }

  async function addProduct(key: string, product: string) {
    if (!product) return;
    try {
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
    } catch (e: any) {
      alert(`Falha ao adicionar product: ${e.message || e}`);
    }
  }

  async function removeProduct(key: string, product: string) {
    try {
      const qs = org ? `?org=${encodeURIComponent(org)}` : "";
      await fetchJson(
        `/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(
          key
        )}/products/${encodeURIComponent(product)}${qs}`,
        { method: "DELETE" }
      );
      await refresh();
    } catch (e: any) {
      alert(`Falha ao remover product: ${e.message || e}`);
    }
  }

  // UI helpers
  const cardStyle: React.CSSProperties = {
    border: `2px solid ${ACCENT}`,
    borderRadius: 14,
    padding: 16,
    background: "var(--card-bg, #fff)",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "6px 8px",
    fontSize: 12,
    color: "#6b7280", // zinc-500
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "6px 8px",
    verticalAlign: "top",
    wordBreak: "break-word",
  };

  const btn: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    fontWeight: 600,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
  };

  const btnWarn: React.CSSProperties = { ...btn, background: "#f59e0b", borderColor: "#f59e0b" }; // amber-500
  const btnDanger: React.CSSProperties = { ...btn, background: "#dc2626", borderColor: "#dc2626" }; // red-600
  const btnGhost: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    fontWeight: 600,
    border: `1px solid ${ACCENT}`,
    color: "#111",
    background: "transparent",
    cursor: "pointer",
  };

  const allCreds = useMemo(() => app?.credentials || [], [app]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Gerenciar credenciais do App</h1>
        <span
          style={{
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
          }}
        >
          v3c+
        </span>
      </div>

      {loading && <div>Carregando…</div>}
      {err && <div style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>Erro: {err}</div>}

      {app && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Detalhes do App */}
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 700 }}>
              App Details
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <th style={thStyle}>Status</th>
                  <td style={tdStyle}>
                    <span style={{ textTransform: "capitalize" }}>{app.status || "-"}</span>
                  </td>
                </tr>
                <tr>
                  <th style={thStyle}>Name</th>
                  <td style={tdStyle}>
                    <code>{app.name}</code>
                  </td>
                </tr>
                <tr>
                  <th style={thStyle}>App ID</th>
                  <td style={tdStyle}>
                    <code>{app.appId}</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Credenciais */}
          <section style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Credenciais</h2>
            {allCreds.length === 0 && (
              <div style={{ opacity: 0.7, fontSize: 14 }}>
                Este app ainda não possui credenciais.
              </div>
            )}

            {allCreds.map((c) => {
              const currentProducts = (c.apiProducts || []).map((x) => x.apiproduct);
              const notAssoc = products.filter((p) => !currentProducts.includes(p));
              return (
                <div key={c.consumerKey} style={cardStyle}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <th style={thStyle}>Key</th>
                        <td style={tdStyle}>
                          <code style={{ wordBreak: "break-all" }}>{c.consumerKey}</code>
                        </td>
                      </tr>
                      <tr>
                        <th style={thStyle}>Secret</th>
                        <td style={tdStyle}>
                          <code style={{ wordBreak: "break-all" }}>
                            {c.consumerSecret || "-"}
                          </code>
                        </td>
                      </tr>
                      <tr>
                        <th style={thStyle}>Status</th>
                        <td style={tdStyle}>
                          <span style={{ textTransform: "capitalize" }}>{c.status || "-"}</span>
                        </td>
                      </tr>
                      <tr>
                        <th style={thStyle}>Products</th>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {currentProducts.map((p) => (
                              <span
                                key={p}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 8,
                                  border: `1px solid ${ACCENT}`,
                                  borderRadius: 999,
                                  padding: "2px 10px",
                                  fontSize: 13,
                                  background: "#FFFBEB", // amber-50
                                }}
                              >
                                {p}
                                <button
                                  title="remover"
                                  onClick={() => removeProduct(c.consumerKey, p)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#b91c1c",
                                    cursor: "pointer",
                                    fontWeight: 800,
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          {/* Adicionar product */}
                          {notAssoc.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                                marginTop: 10,
                              }}
                            >
                              <select
                                defaultValue=""
                                style={{
                                  border: "1px solid #d1d5db",
                                  borderRadius: 8,
                                  padding: "6px 8px",
                                  minWidth: 220,
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    addProduct(c.consumerKey, val);
                                    // reseta o select
                                    e.currentTarget.value = "";
                                  }
                                }}
                              >
                                <option value="" disabled>
                                  Adicionar product…
                                </option>
                                {notAssoc.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                              <span style={{ fontSize: 12, opacity: 0.75 }}>
                                Selecione para associar imediatamente
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Ações */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 12,
                      borderTop: "1px dashed #e5e7eb",
                      paddingTop: 10,
                    }}
                  >
                    <button style={btn} onClick={() => setStatus(c.consumerKey, "approve")}>
                      Aprovar
                    </button>
                    <button style={btnWarn} onClick={() => setStatus(c.consumerKey, "revoke")}>
                      Revogar
                    </button>
                    <button style={btnDanger} onClick={() => deleteKey(c.consumerKey)}>
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Rodapé: Voltar */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button style={btnGhost} onClick={backToList}>
              Voltar para lista de Apps
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
