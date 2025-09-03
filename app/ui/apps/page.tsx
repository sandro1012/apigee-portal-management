"use client";
import { useEffect, useMemo, useState } from "react";

type Credential = {
  consumerKey: string;
  consumerSecret?: string;
  status?: string;
  apiProducts?: { apiproduct: string; status: string }[];
};
type AppItem = {
  appId: string;
  name: string;
  developerId?: string;
  developerEmail?: string;
  status?: string;
  createdAt?: string;
  lastModifiedAt?: string;
};
type AppDetail = AppItem & {
  credentials?: Credential[];
  apiProducts?: string[];
  attributes?: { name: string; value: string }[];
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const txt = await r.text();
  const data = txt ? JSON.parse(txt) : null;
  if (!r.ok) throw new Error(data?.error || r.statusText);
  return data;
}

export default function AppsPage() {
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState<string>("");
  const [envs, setEnvs] = useState<string[]>([]);
  const [env, setEnv] = useState<string>("");
  const [items, setItems] = useState<AppItem[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AppDetail | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenMsg, setTokenMsg] = useState("");

  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // === (1) ESTADOS + HELPERS para NOVO APP (Developer) e EXCLUIR APP ===
  const [newDevEmail, setNewDevEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newAttrs, setNewAttrs] = useState("clientId=Value\ncompanyId=Value");
  const [creating, setCreating] = useState(false);

  function parseAttrsText(txt: string): { name: string; value: string }[] {
    return (txt || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const i = line.indexOf("=");
        if (i === -1) return null;
        return { name: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
      })
      .filter(Boolean) as { name: string; value: string }[];
  }

  async function createApp() {
    try {
      if (!org) { alert("Selecione uma org"); return; }
      if (!newDisplayName.trim()) { alert("Preencha o DisplayName"); return; }
      if (!newDevEmail.trim()) { alert("Preencha o Developer email"); return; }

      setCreating(true);
      const attributes = parseAttrsText(newAttrs);
      const res = await fetch("/api/apps/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org,
          name: newDisplayName.trim(),
          devEmail: newDevEmail.trim(),
          attributes,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { alert(j.error || res.statusText); return; }

      // recarrega a lista e limpa o formulário
      await loadApps();
      setNewDevEmail("");
      setNewDisplayName("");
      setNewAttrs("clientId=Value\ncompanyId=Value");
      alert("App criado com sucesso.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteSelectedApp() {
    if (!selected) { alert("Selecione um app na lista primeiro."); return; }
    if (!org) { alert("Selecione a org."); return; }
    if (!selected.appId) { alert("App sem appId."); return; }
    if (!confirm(`Excluir app "${selected.name}"? Esta ação não pode ser desfeita.`)) return;

    const res = await fetch(`/api/apps/${encodeURIComponent(selected.appId)}?org=${encodeURIComponent(org)}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { alert("Falha ao excluir app: " + (j.error || res.statusText)); return; }

    await loadApps();
    setSelected(null);
    alert("App excluído com sucesso.");
  }
  // === FIM (1) ===

  useEffect(() => {
    fetch("/api/orgs").then(r => r.json()).then(setOrgs).catch(() => setOrgs([]));
  }, []);

  useEffect(() => {
    if (!org) return;
    setEnv(""); setEnvs([]);
    fetch(`/api/envs?org=${encodeURIComponent(org)}`)
      .then(r => r.json()).then(setEnvs).catch(() => setEnvs([]));
  }, [org]);

  async function saveToken() {
    setTokenMsg("");
    const res = await fetch("/api/auth/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tokenInput.trim() }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setTokenMsg("Token salvo (expira ~1h)."); else setTokenMsg("Falha: " + (j.error || res.statusText));
  }
  async function clearToken() {
    await fetch("/api/auth/token", { method: "DELETE" });
    setTokenMsg("Token limpo.");
  }

  async function loadApps() {
    if (!org) return;
    const j = await fetchJson("/api/apps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ org }) });
    setItems(Array.isArray(j) ? j : []);
    setSelected(null);
    setPage(1);
  }

  async function openAppById(appId: string) {
    if (!org) return;
    const j = await fetchJson(`/api/apps/${encodeURIComponent(appId)}?org=${encodeURIComponent(org)}`);
    setSelected(j);
  }

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return items.filter(a => (`${a.name} ${a.appId || ""}`).toLowerCase().includes(t));
  }, [items, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, (page) * pageSize);

  return (
    <main>
      <h2>Apps</h2>

      <div className="card" style={{ display: "grid", gap: 8, marginBottom: 12, maxWidth: 760 }}>
        <strong>Token Google (OAuth)</strong>
        <input type="password" placeholder="ya29..." value={tokenInput} onChange={e => setTokenInput(e.target.value)} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={saveToken} disabled={!tokenInput.trim()}>Salvar token</button>
          <button onClick={clearToken}>Limpar token</button>
          {tokenMsg && <small>{tokenMsg}</small>}
        </div>
        <small>Sem token salvo: backend tenta <code>GCP_USER_TOKEN</code> (env) ou Service Account.</small>
      </div>

      <div className="card" style={{ display: "grid", gap: 8, maxWidth: 760 }}>
        <label>Org
          <select value={org} onChange={e => setOrg(e.target.value)}>
            <option value="">Selecione...</option>
            {orgs.map(o => (<option key={o} value={o}>{o}</option>))}
          </select>
        </label>
        <label>Env (contexto)
          <select value={env} onChange={e => setEnv(e.target.value)}>
            <option value="">Selecione...</option>
            {envs.map(x => (<option key={x} value={x}>{x}</option>))}
          </select>
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={loadApps} disabled={!org}>Listar apps</button>
          <input placeholder="filtrar..." value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1 }} />
          <label className="small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            por página:
            <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value || "10")); setPage(1); }}>
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      {/* === (2) CARD NOVO APP (DEVELOPER) === */}
      <div className="card" style={{ display: "grid", gap: 8, maxWidth: 760, marginTop: 12 }}>
        <strong>Novo App (Developer)</strong>
        <label>Developer email
          <input placeholder="dev@empresa.com" value={newDevEmail} onChange={e=>setNewDevEmail(e.target.value)} />
        </label>
        <label>DisplayName (obrigatório)
          <input placeholder="Nome do App" value={newDisplayName} onChange={e=>setNewDisplayName(e.target.value)} />
        </label>
        <label>Atributos (opcional) — um por linha no formato <code>chave=valor</code>. Exemplo abaixo:
          <textarea rows={3} value={newAttrs} onChange={e=>setNewAttrs(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={createApp} disabled={!org || creating}>{creating ? "Criando..." : "Criar App"}</button>
        </div>
      </div>
      {/* === FIM (2) === */}

      <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(280px, 36%)", gap: 12, marginTop: 12 }}>
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>App</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(a => (
                <tr key={a.appId || a.name} style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                  onClick={() => a.appId ? openAppById(a.appId) : alert("App sem appId retornado pelo Apigee")}>
                  <td style={{ padding: "8px 6px" }}>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div className="small" style={{ opacity: .8 }}>{a.appId}</div>
                  </td>
                  <td style={{ padding: "8px 6px" }}>{a.status || "-"}</td>
                </tr>
              ))}
              {pageItems.length === 0 && <tr><td colSpan={2} style={{ padding: "12px 8px", opacity: .7 }}>Nenhum app</td></tr>}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
            <span className="small">Página {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Próxima</button>
          </div>
        </div>

        {/* Painel de detalhes à direita */}
        <div className="card">
          <h3 style={{marginTop:0}}>Detalhes do App</h3>
          {!selected && <div className="small" style={{opacity:.8}}>Selecione um app na lista para ver detalhes.</div>}
          {selected && (
            <div style={{display:'grid', gap:8}}>
              <div><b>Nome:</b> {selected.name}</div>
              {selected.developerEmail && <div><b>Developer:</b> {selected.developerEmail}</div>}
              {selected.status && <div><b>Status:</b> {selected.status}</div>}

              {selected.attributes && selected.attributes.length>0 && (
                <div>
                  <b>Atributos</b>
                  <ul>{selected.attributes.map((at,i)=>(<li key={i}><code>{at.name}</code>: {at.value}</li>))}</ul>
                </div>
              )}

              {selected.apiProducts && selected.apiProducts.length>0 && (
                <div>
                  <b>Products associados</b>
                  <ul>{selected.apiProducts.map((p,i)=>(<li key={i}>{p}</li>))}</ul>
                </div>
              )}

              {selected.credentials && selected.credentials.length>0 && (
                <div>
                  <b>Credenciais</b>
                  <ul>
                    {selected.credentials.map((c,i)=>(
                      <li key={i} style={{marginBottom:6}}>
                        <div><code>Key:</code> {c.consumerKey}</div>
                        {c.consumerSecret && <div className="small" style={{opacity:.8}}><code>Secret:</code> {c.consumerSecret}</div>}
                        <div className="small"><b>Status:</b> {c.status || '-'}</div>
                        {c.apiProducts && c.apiProducts.length>0 && (
                          <div className="small"><b>Products:</b> {c.apiProducts.map(p=>p.apiproduct).join(', ')}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* (3) Botões GERENCIAR e EXCLUIR no detalhe */}
              {selected.appId && (
                <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:8}}>
                  <button
                    onClick={()=>{
                      const orgParam = org ? `?org=${encodeURIComponent(org)}` : "";
                      window.location.href = `/ui/apps/${encodeURIComponent(selected.appId)}${orgParam}`;
                    }}
                    title="Gerenciar credenciais e products"
                  >
                    Gerenciar (credenciais e products)
                  </button>
                  <button
                    onClick={deleteSelectedApp}
                    style={{ background:'#ef4444', color:'#fff', border:'1px solid #dc2626' }}
                    title="Excluir App"
                  >
                    Excluir app
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
