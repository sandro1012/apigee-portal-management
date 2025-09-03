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

  // --- UI: Novo/Excluir App ---
  const [showNew, setShowNew] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [newType, setNewType] = useState<"developer" | "company">("developer");
  const [newName, setNewName] = useState("");
  const [newDevEmail, setNewDevEmail] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newAttrs, setNewAttrs] = useState(""); // chave=valor por linha

  const [delAppId, setDelAppId] = useState("");

  function parseAttrs(txt: string): { name: string; value: string }[] {
    return txt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [k, ...rest] = line.split("=");
        return { name: k.trim(), value: rest.join("=").trim() };
      });
  }

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

  // --- actions: criar/excluir app ---
  async function createApp() {
    if (!org) { alert("Selecione a Org."); return; }
    if (!newName.trim()) { alert("Informe o nome do App."); return; }
    if (newType === "developer" && !newDevEmail.trim()) { alert("Informe o e-mail do developer."); return; }
    if (newType === "company" && !newCompany.trim()) { alert("Informe o nome da company."); return; }

    setCreating(true);
    try {
      const body:any = { org, name: newName.trim(), attributes: parseAttrs(newAttrs) };
      if (newType === "developer") body.devEmail = newDevEmail.trim();
      else body.companyName = newCompany.trim();

      const r = await fetch("/api/apps/new", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(j?.error || r.statusText);

      setShowNew(false);
      setNewName(""); setNewDevEmail(""); setNewCompany(""); setNewAttrs("");
      await loadApps();
      alert("App criado com sucesso!");
    } catch (e:any) {
      alert("Falha ao criar app: " + (e.message || String(e)));
    } finally {
      setCreating(false);
    }
  }

  async function deleteApp() {
    if (!org) { alert("Selecione a Org."); return; }
    if (!delAppId) { alert("Selecione um App para excluir."); return; }
    if (!confirm("Tem certeza que deseja excluir este App? Esta ação é irreversível.")) return;

    setDeleting(true);
    try {
      const url = `/api/apps/${encodeURIComponent(delAppId)}?org=${encodeURIComponent(org)}`;
      const r = await fetch(url, { method: "DELETE" });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(j?.error || r.statusText);
      setShowDel(false);
      setDelAppId("");
      await loadApps();
      alert("App excluído com sucesso!");
    } catch (e:any) {
      alert("Falha ao excluir app: " + (e.message || String(e)));
    } finally {
      setDeleting(false);
    }
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

      {/* AÇÕES – NOVO / EXCLUIR */}
      <div className="card" style={{display:'flex', gap:8, alignItems:'center', maxWidth:760, marginTop:8}}>
        <button onClick={()=>setShowNew(true)}>Novo App</button>
        <button onClick={()=>setShowDel(true)} disabled={items.length===0}>Excluir App</button>
      </div>

      {/* Drawer: Novo App */}
      {showNew && (
        <div className="card" style={{display:'grid', gap:8, maxWidth:760, border:'1px solid var(--border)'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <strong>Criar novo App</strong>
            <button onClick={()=>setShowNew(false)}>Fechar</button>
          </div>

          <label style={{display:'flex', gap:8, alignItems:'center'}}>
            Tipo:
            <select value={newType} onChange={e=>setNewType(e.target.value as any)}>
              <option value="developer">Developer App</option>
              <option value="company">Company App</option>
            </select>
          </label>

          <label>Nome do App
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="MeuApp" />
          </label>

          {newType === "developer" && (
            <label>Developer e-mail
              <input value={newDevEmail} onChange={e=>setNewDevEmail(e.target.value)} placeholder="usuario@dominio.com" />
            </label>
          )}
          {newType === "company" && (
            <label>Company name
              <input value={newCompany} onChange={e=>setNewCompany(e.target.value)} placeholder="MinhaCompany" />
            </label>
          )}

          <label>Atributos (opcional) – um por linha: chave=valor
            <textarea rows={4} value={newAttrs} onChange={e=>setNewAttrs(e.target.value)} placeholder={"DisplayName=Meu App\nclientId=MinhaEmpresa"} />
          </label>

          <div style={{display:'flex', gap:8}}>
            <button onClick={createApp} disabled={creating || !org}>{creating ? "Criando..." : "Criar App"}</button>
            <button onClick={()=>setShowNew(false)}>Cancelar</button>
          </div>
          <small>Observação: criação não gera credenciais automaticamente.</small>
        </div>
      )}

      {/* Drawer: Excluir App */}
      {showDel && (
        <div className="card" style={{display:'grid', gap:8, maxWidth:760, border:'1px solid var(--border)'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <strong>Excluir App</strong>
            <button onClick={()=>setShowDel(false)}>Fechar</button>
          </div>

          <label>Selecione o App
            <select value={delAppId} onChange={e=>setDelAppId(e.target.value)}>
              <option value="">Selecione...</option>
              {items.map(a => (
                <option key={a.appId} value={a.appId}>{a.name} — {a.appId}</option>
              ))}
            </select>
          </label>

          <div style={{display:'flex', gap:8}}>
            <button onClick={deleteApp} disabled={deleting || !delAppId || !org}>{deleting ? "Excluindo..." : "Excluir"}</button>
            <button onClick={()=>setShowDel(false)}>Cancelar</button>
          </div>
          <small>Esta ação é irreversível.</small>
        </div>
      )}

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

              {/* Botão GERENCIAR com o mesmo visual dos outros botões */}
              {selected.appId && (
                <div style={{display:'flex', justifyContent:'flex-end', marginTop:8}}>
                  <button
                    onClick={()=>{
                      const orgParam = org ? `?org=${encodeURIComponent(org)}` : "";
                      window.location.href = `/ui/apps/${encodeURIComponent(selected.appId)}${orgParam}`;
                    }}
                    title="Gerenciar credenciais e products"
                  >
                    Gerenciar (credenciais e products)
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
