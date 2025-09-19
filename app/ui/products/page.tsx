// app/ui/products/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";

// --- Tipos mínimos para a UI:
type Method = "GET"|"POST"|"PUT"|"PATCH"|"DELETE"|"HEAD"|"OPTIONS";
// timeUnit: UI usa UPPERCASE; convertemos para lowercase ao enviar
type Quota = { limit?: string; interval?: string; timeUnit?: string };
type Operation = { resource: string; methods: Method[] };
type OperationConfig = { apiSource: string; operations: Operation[]; quota?: Quota };
type OperationGroup = { operationConfigs: OperationConfig[]; operationConfigType?: "proxy" };

type ApiProduct = {
  name: string;
  displayName?: string;
  description?: string;
  approvalType?: string;
  attributes?: { name: string; value: string }[];
  apiResources?: string[];
  operationGroup?: OperationGroup;
};

// Pode ou não ter basePath (fallback via /api/apis não tem)
type BasepathDTO = { name: string; basePath?: string; revision?: string };

async function fetchJson<T=any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const txt = await r.text();
  const j = txt ? JSON.parse(txt) : null;
  if (!r.ok) throw new Error(j?.error || r.statusText);
  return j as T;
}

// --- helpers robustos ----
function normalizeProductNames(input: any): string[] {
  const out = new Set<string>();
  const push = (v: any) => {
    if (typeof v === "string" && v.trim()) out.add(v);
    else if (v && typeof v.name === "string" && v.name.trim()) out.add(v.name);
  };
  if (Array.isArray(input)) {
    for (const it of input) push(it);
  } else if (input && typeof input === "object") {
    const keys = ["names", "apiProduct", "apiproducts", "products", "items"];
    for (const k of keys) {
      const arr = (input as any)[k];
      if (Array.isArray(arr)) for (const it of arr) push(it);
    }
  }
  return Array.from(out);
}

// Converte UI -> formato aceito pela Apigee
function toApiTimeUnit(u?: string): "second"|"minute"|"hour"|"day"|"month"|"year"|undefined {
  if (!u) return undefined;
  const v = String(u).toLowerCase();
  if (["second","minute","hour","day","month","year"].includes(v)) return v as any;
  return undefined;
}

// Sanitiza name para o formato aceito pela Apigee (sem espaços)
function sanitizeProductName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-_]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .toLowerCase();
}

function mapAccess(v: string): "Public"|"Private" {
  return String(v).toLowerCase()==="private" ? "Private" : "Public";
}

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
  background: "#facc15",
  color: "#111",
  borderColor: "#eab308",
};
const btnDanger: React.CSSProperties = {
  ...btnBase,
  background: "#ef4444",
  color: "#fff",
  borderColor: "#dc2626",
};
const btnNeutral: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  color: "var(--fg, #eee)",
};

export default function ProductsPage() {
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState<string>("");
  const [envs, setEnvs] = useState<string[]>([]);
  const [env, setEnv] = useState<string>("");

  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [detail, setDetail] = useState<ApiProduct|null>(null);
  const [err, setErr] = useState("");

  const [checks, setChecks] = useState<Record<string, boolean>>({});

  // basepaths/proxies para o combo (com fallback)
  const [basepaths, setBasepaths] = useState<BasepathDTO[]>([]);
  // valor do option codificado "name||basePath"
  const [selectedProxyRef, setSelectedProxyRef] = useState<string>("");

  // add operation form
  const [addPath, setAddPath] = useState("");
  const [addMethods, setAddMethods] = useState<Method[]>([]);
  const [addLimit, setAddLimit] = useState("");
  const [addInterval, setAddInterval] = useState("");
  const [addTimeUnit, setAddTimeUnit] = useState<string>("MINUTE");

  // quota edição explícita por proxy (apiSource)
  const [quotaEdits, setQuotaEdits] = useState<Record<string, Quota>>({});

  // novo API Product
  const [newName, setNewName] = useState("");
  const [newDisplay, setNewDisplay] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newApproval, setNewApproval] = useState("auto");
  const [newAccess, setNewAccess] = useState<"Public"|"Private">("Public");
  const [newScopesText, setNewScopesText] = useState("");
  const [newEnvs, setNewEnvs] = useState<string[]>([]);
  const creatingRef = useRef(false); // guarda contra double-click

  useEffect(() => {
    fetch("/api/orgs").then(r=>r.json()).then(setOrgs).catch(()=>setOrgs([]));
  }, []);

  useEffect(() => {
    if (!org) { setEnv(""); setEnvs([]); return; }
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch(`/api/envs?org=${encodeURIComponent(org)}`, { signal: ac.signal });
        const data = await r.json();
        setEnvs(data);
      } catch {
        if (!ac.signal.aborted) setEnvs([]);
      }
    })();
    return () => ac.abort();
  }, [org]);

  // quando mudar env/ envs, por padrão seleciona o env atual para o novo product (se não houver seleção manual)
  useEffect(() => {
    if (env && (newEnvs.length===0 || (newEnvs.length===1 && newEnvs[0]!==env))) {
      setNewEnvs([env]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, envs.length]);

  async function loadProducts() {
    if (!org) return;
    setLoading(true);
    setErr("");
    try {
      const qs = `?org=${encodeURIComponent(org)}`;
      const j = await fetchJson<any>(`/api/products${qs}`);
      const names = normalizeProductNames(j);
      setList(names);
      setChecks({});
      setSelected("");
      setDetail(null);
    } catch (e:any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // Fallback robusto: tenta /api/basepaths; se vier vazio, usa /api/apis para listar nomes
  async function loadBasepaths() {
    setBasepaths([]);
    setSelectedProxyRef("");
    if (!org || !env) return;

    try {
      const qs = `?org=${encodeURIComponent(org)}&env=${encodeURIComponent(env)}`;
      const list = await fetchJson<any[]>(`/api/basepaths${qs}`);
      const arr = Array.isArray(list) ? list : [];
      const withBP: BasepathDTO[] = arr
        .map((x: any) => ({
          name: String(x?.name ?? ""),
          basePath: x?.basePath ? String(x.basePath) : undefined,
          revision: x?.revision ? String(x.revision) : undefined,
        }))
        .filter((x) => x.name);
      if (withBP.length > 0) {
        setBasepaths(withBP);
        const first = withBP[0];
        setSelectedProxyRef(`${first.name}||${first.basePath ?? ""}`);
        return;
      }
    } catch {
      // ignore; cai pro fallback
    }

    // Fallback: usa /api/apis (lista de proxies por nome)
    try {
      const qs = `?org=${encodeURIComponent(org)}&env=${encodeURIComponent(env)}`;
      const apis = await fetchJson<any>(`/api/apis${qs}`);
      let names: string[] = [];

      if (Array.isArray(apis?.proxies)) {
        names = apis.proxies
          .map((p: any) => (typeof p === "string" ? p : String(p?.name || "")))
          .filter(Boolean);
      } else if (Array.isArray(apis)) {
        names = apis
          .map((p: any) => (typeof p === "string" ? p : String(p?.name || "")))
          .filter(Boolean);
      }

      const uniq = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
      const dto = uniq.map((name) => ({ name } as BasepathDTO));
      setBasepaths(dto);
      if (dto.length) setSelectedProxyRef(`${dto[0].name}||`);
    } catch {
      setBasepaths([]);
      setSelectedProxyRef("");
    }
  }

  async function openDetail(name: string) {
    if (!org || !name) return;
    setSelected(name);
    setDetail(null);
    try {
      const qs = `?org=${encodeURIComponent(org)}`;
      const j = await fetchJson<ApiProduct>(`/api/products/${encodeURIComponent(name)}${qs}`);
      setDetail(j);

      // quotaEdits inicial por apiSource
      const rows = opRowsFromDetail(j);
      const seed: Record<string, Quota> = {};
      for (const r of rows) {
        const prev = seed[r.apiSource];
        seed[r.apiSource] = prev || { ...r.quota };
      }
      setQuotaEdits(seed);

      await loadBasepaths();
    } catch (e:any) {
      setErr(e.message || String(e));
    }
  }

  // Recarrega basepaths quando o env muda (se já há product selecionado)
  useEffect(() => {
    if (selected) {
      loadBasepaths();
    } else {
      setBasepaths([]);
      setSelectedProxyRef("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env]);

  const filtered: string[] = useMemo(() => {
    const t = (q || "").toLowerCase();
    return (Array.isArray(list) ? list : [])
      .filter(n => typeof n === "string")
      .map(n => n as string)
      .filter(n => n.toLowerCase().includes(t));
  }, [list, q]);

  function opRowsFromDetail(p: ApiProduct): Array<{
    apiSource: string;
    resource: string;
    methods: Method[];
    quota?: Quota;
  }> {
    const rows: Array<{apiSource:string;resource:string;methods:Method[];quota?:Quota}> = [];
    const og = p.operationGroup;
    if (og && Array.isArray(og.operationConfigs)) {
      for (const cfg of og.operationConfigs) {
        const api = cfg.apiSource;
        const quota = cfg.quota;
        for (const op of (cfg.operations||[])) {
          rows.push({ apiSource: api, resource: op.resource, methods: (op.methods||[]) as Method[], quota });
        }
      }
      return rows;
    }
    if (Array.isArray(p.apiResources) && p.apiResources.length>0) {
      for (const res of p.apiResources) {
        rows.push({ apiSource: "(apiResources)", resource: res, methods: ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"] });
      }
    }
    return rows;
  }

  async function applyOpGroup(newOg: OperationGroup) {
    if (!org || !selected) return;
    const qs = `?org=${encodeURIComponent(org)}`;
    await fetchJson(`/api/products/${encodeURIComponent(selected)}/update${qs}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operationGroup: newOg }),
    });
    await openDetail(selected);
  }

  function toOperationGroup(rows: Array<{apiSource:string;resource:string;methods:Method[];quota?:Quota}>): OperationGroup {
    const byApi = new Map<string, { ops: Operation[], quota?: Quota }>();
    for (const r of rows) {
      const bucket = byApi.get(r.apiSource) || { ops: [], quota: r.quota };
      bucket.ops.push({ resource: r.resource, methods: r.methods });
      if (r.quota) bucket.quota = r.quota;
      byApi.set(r.apiSource, bucket);
    }
    const operationConfigs: OperationConfig[] = Array.from(byApi.entries()).map(([apiSource, v]) => ({
      apiSource,
      operations: v.ops,
      quota: (v.quota && (v.quota.limit || v.quota.interval || v.quota.timeUnit))
        ? {
            limit: v.quota.limit,
            interval: v.quota.interval,
            timeUnit: toApiTimeUnit(v.quota.timeUnit) // lowercase para Apigee
          }
        : undefined,
    }));
    return { operationConfigs, operationConfigType: "proxy" };
  }

  async function removeOperation(row: {apiSource:string;resource:string}) {
    if (!detail) return;
    const rows = opRowsFromDetail(detail).filter(r => !(r.apiSource === row.apiSource && r.resource === row.resource));
    const newOg = toOperationGroup(rows);
    await applyOpGroup(newOg);
  }

  async function saveQuotaForApiSource(apiSource: string) {
    if (!detail) return;
    const qRaw = quotaEdits[apiSource] || {};
    const qNorm: Quota = {
      limit: qRaw.limit,
      interval: qRaw.interval,
      timeUnit: toApiTimeUnit(qRaw.timeUnit) // lowercase
    };
    const rows = opRowsFromDetail(detail).map(r => (r.apiSource===apiSource ? { ...r, quota: qNorm } : r));
    const newOg = toOperationGroup(rows);
    await applyOpGroup(newOg);
  }

  async function addOperation() {
    if (!detail || !selected) return;
    if (!selectedProxyRef || !addPath.trim() || addMethods.length===0) {
      alert("Selecione a API proxy, informe o path e pelo menos um método.");
      return;
    }

    // selectedProxyRef tem o formato "name||basePath"
    const [proxyName] = selectedProxyRef.split("||");
    const apiSource = (proxyName || "").trim();
    if (!apiSource) {
      alert("Não foi possível resolver o nome do proxy selecionado.");
      return;
    }

    const rows = opRowsFromDetail(detail);
    rows.push({
      apiSource,
      resource: addPath.trim(),
      methods: addMethods,
      quota: (addLimit || addInterval || addTimeUnit)
        ? { limit:addLimit||undefined, interval:addInterval||undefined, timeUnit: toApiTimeUnit(addTimeUnit) }
        : undefined,
    });
    const newOg = toOperationGroup(rows);
    await applyOpGroup(newOg);

    setAddPath(""); setAddMethods([]);
  }

  async function deleteSelected() {
    if (!org) return;
    const names = Object.keys(checks).filter(k => checks[k]);
    if (names.length===0) { alert("Selecione ao menos um product."); return; }
    if (!confirm(`Excluir ${names.length} product(s)? Esta ação é irreversível.`)) return;
    for (const n of names) {
      try {
        const qs = `?org=${encodeURIComponent(org)}`;
        await fetchJson(`/api/products/${encodeURIComponent(n)}${qs}`, { method: "DELETE" });
      } catch (e:any) {
        console.error("Falha ao excluir", n, e?.message || String(e));
      }
    }
    await loadProducts();
    alert("Concluído (verifique a lista).");
  }

  function parseScopes(txt: string): string[]|undefined {
    const arr = txt.split(/[,;\n]/g).map(s=>s.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }

  async function createProductRequest() {
    if (!org) {
      alert("Selecione uma org.");
      return;
    }
    if (!newName.trim() || !newDisplay.trim() || !newDescription.trim()) {
      alert("Preencha name, displayName e description.");
      return;
    }
    const id = sanitizeProductName(newName);
    if (!id) {
      alert("Nome inválido após sanitização. Use letras, números, hífen ou underscore.");
      return;
    }

    const body: any = {
      org,
      name: id,
      displayName: newDisplay.trim(),
      description: newDescription.trim(),
      approvalType: newApproval || "auto",
      attributes: [{ name: "access", value: mapAccess(newAccess) }],
    };

    const envsToSend = (newEnvs && newEnvs.length) ? newEnvs : (env ? [env] : []);
    if (envsToSend.length) body.environments = envsToSend;

    const scopes = parseScopes(newScopesText);
    if (scopes) body.scopes = scopes;

    await fetchJson(`/api/products?org=${encodeURIComponent(org)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  // Bloqueia Enter nos inputs de criação (evita submit implícito)
  function preventEnter(e: React.KeyboardEvent<HTMLInputElement|HTMLTextAreaElement>) {
    if (e.key === "Enter") {
      if (!(e.ctrlKey || e.metaKey || e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }

  async function handleCreateClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (creatingRef.current) return;
    creatingRef.current = true;
    try {
      await createProductRequest();
      setNewName("");
      setNewDisplay("");
      setNewDescription("");
      setNewApproval("auto");
      setNewAccess("Public");
      setNewScopesText("");
      setNewEnvs(env ? [env] : []);
      await loadProducts(); // atualiza grid
      alert("API Product criado com sucesso.");
    } catch (err: any) {
      alert("Erro ao criar product: " + (err?.message || String(err)));
    } finally {
      creatingRef.current = false;
    }
  }

  const rows = detail ? opRowsFromDetail(detail) : [];

  return (
    <main>
      <h2>API Products</h2>

      <div className="card" style={{display:'grid', gap:8, maxWidth:980, marginBottom:12}}>
        <label>Org
          <select value={org} onChange={e=>{ setOrg(e.target.value); setEnv(""); }}>
            <option value="">Selecione...</option>
            {orgs.map(o=>(<option key={o} value={o}>{o}</option>))}
          </select>
        </label>
        <label>Env
          <select value={env} onChange={e=>setEnv(e.target.value)}>
            <option value="">(opcional) — filtra APIs deployadas</option>
            {envs.map(x=>(<option key={x} value={x}>{x}</option>))}
          </select>
        </label>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button type="button" onClick={loadProducts} disabled={!org}>Listar products</button>
          <input placeholder="filtrar..." value={q} onChange={e=>setQ(e.target.value)} style={{flex:1}} />
        </div>
        {err && <div style={{color:"#ef4444"}}>Erro: {err}</div>}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr minmax(460px, 46%)', gap:12}}>
        {/* Lista */}
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <strong>Products</strong>
            <button type="button" style={btnDanger} onClick={deleteSelected} disabled={filtered.length===0 || filtered.every(n=>!checks[n])}>Excluir selecionados</button>
          </div>
          {loading && <div>Carregando…</div>}
          {!loading && (
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left', padding:'6px'}}>
                    <input
                      type="checkbox"
                      checked={filtered.length>0 && filtered.every(n => checks[n])}
                      onChange={e=>{
                        const checked = e.currentTarget.checked;
                        const all = {...checks};
                        for (const n of filtered) all[n] = checked;
                        setChecks(all);
                      }}
                    />
                  </th>
                  <th style={{textAlign:'left', padding:'6px'}}>Product</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n=>(
                  <tr key={n} style={{borderTop:'1px solid var(--border)'}}>
                    <td style={{padding:'6px'}}>
                      <input type="checkbox" checked={!!checks[n]} onChange={e=> setChecks({...checks, [n]: e.currentTarget.checked})} />
                    </td>
                    <td style={{padding:'6px', cursor:'pointer'}} onClick={()=>openDetail(n)}>
                      {n}
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && <tr><td colSpan={2} style={{padding:'8px', opacity:.7}}>Nenhum product</td></tr>}
              </tbody>
            </table>
          )}

          {/* Criar novo API Product */}
          <div style={{marginTop:12, padding:10, borderTop:"1px solid var(--border)"}}>
            <h4 style={{margin:"4px 0"}}>Novo API Product</h4>

            <div style={{display:"grid", gap:8, gridTemplateColumns:"1fr 1fr"}}>
              <label>
                <div className="small" style={{opacity:.8}}>name *</div>
                <input
                  placeholder="ex.: scope-teste"
                  value={newName}
                  onChange={e=>setNewName(e.target.value)}
                  onKeyDown={preventEnter}
                />
              </label>
              <label>
                <div className="small" style={{opacity:.8}}>displayName *</div>
                <input
                  placeholder="ex.: scope teste"
                  value={newDisplay}
                  onChange={e=>setNewDisplay(e.target.value)}
                  onKeyDown={preventEnter}
                />
              </label>
              <label style={{gridColumn:'1 / -1'}}>
                <div className="small" style={{opacity:.8}}>description *</div>
                <textarea
                  placeholder="Descrição do produto…"
                  value={newDescription}
                  onChange={e=>setNewDescription(e.target.value)}
                  onKeyDown={preventEnter}
                  rows={3}
                  style={{width:"100%"}}
                />
              </label>

              <label>
                <div className="small" style={{opacity:.8}}>approvalType</div>
                <select value={newApproval} onChange={e=>setNewApproval(e.target.value)}>
                  <option value="auto">auto</option>
                  <option value="manual">manual</option>
                </select>
              </label>
              <label>
                <div className="small" style={{opacity:.8}}>attributes.access</div>
                <select value={newAccess} onChange={e=>setNewAccess(e.target.value as any)}>
                  <option value="Public">Public</option>
                  <option value="Private">Private</option>
                </select>
              </label>

              <label>
                <div className="small" style={{opacity:.8}}>scopes (opcional)</div>
                <input
                  placeholder="escopo1, escopo2"
                  value={newScopesText}
                  onChange={e=>setNewScopesText(e.target.value)}
                  onKeyDown={preventEnter}
                />
              </label>
              <label>
                <div className="small" style={{opacity:.8}}>environments (opcional)</div>
                <select
                  multiple
                  size={Math.min(6, Math.max(2, envs.length || 2))}
                  value={newEnvs}
                  onChange={e=>{
                    const vals = Array.from(e.currentTarget.selectedOptions).map(o=>o.value);
                    setNewEnvs(vals);
                  }}
                >
                  {envs.map(x=>(
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </label>

              <div style={{gridColumn:'1 / -1', display:'flex', gap:8, justifyContent:'flex-end'}}>
                <button
                  type="button"
                  style={btnPrimary}
                  disabled={!org || !newName.trim() || !newDisplay.trim() || !newDescription.trim() || creatingRef.current}
                  onClick={handleCreateClick}
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detalhe */}
        <div className="card">
          <h3 style={{marginTop:0}}>Detalhes do product</h3>
          {!selected && <div className="small" style={{opacity:.8}}>Clique em um product à esquerda.</div>}

          {detail && (
            <div style={{display:'grid', gap:10}}>
              <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8}}>
                <div className="card" style={{padding:10}}>
                  <div className="small" style={{opacity:.7}}>Nome</div>
                  <div style={{fontFamily:'monospace'}}>{detail.displayName || detail.name}</div>
                </div>
                <div className="card" style={{padding:10}}>
                  <div className="small" style={{opacity:.7}}>ID</div>
                  <div style={{fontFamily:'monospace'}}>{detail.name}</div>
                </div>
                <div className="card" style={{padding:10}}>
                  <div className="small" style={{opacity:.7}}>Approval</div>
                  <div>{detail.approvalType || "-"}</div>
                </div>
                <div className="card" style={{padding:10}}>
                  <div className="small" style={{opacity:.7}}>Descrição</div>
                  <div>{detail.description || "-"}</div>
                </div>
              </div>

              <div>
                <h4 style={{margin:'8px 0'}}>Operations</h4>
                {/* ... tabela de operações existente ... */}
              </div>

              <div className="card" style={{padding:10}}>
                <h4 style={{margin:'0 0 8px'}}>Adicionar operation</h4>

                <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8}}>
                  <label>API Proxy
                    <select
                      value={selectedProxyRef}
                      onChange={e=>setSelectedProxyRef(e.target.value)}
                      disabled={!env}
                    >
                      <option value="">{env ? "Selecione…" : "Selecione um env"}</option>
                      {basepaths.map(p=>(
                        <option
                          key={`${p.name}:${p.basePath || ""}`}
                          value={`${p.name}||${p.basePath || ""}`}
                        >
                          {p.basePath ? `${p.name} — ${p.basePath}${p.revision ? ` (rev ${p.revision})` : ""}` : p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>Path (resource)
                    <input placeholder="/minha/rota" value={addPath} onChange={e=>setAddPath(e.target.value)} />
                  </label>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8, marginTop:8}}>
                  <label>Métodos
                    <select multiple size={6} value={addMethods as string[]} onChange={e=>{
                      const vals = Array.from(e.currentTarget.selectedOptions).map(o=>o.value as Method);
                      setAddMethods(vals);
                    }}>
                      {["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"].map(m=>(
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label>Quota limit
                    <input placeholder="e.g. 1000" value={addLimit} onChange={e=>setAddLimit(e.target.value)} />
                  </label>
                  <div style={{display:'grid', gap:8}}>
                    <label>Quota interval
                      <input placeholder="e.g. 1" value={addInterval} onChange={e=>setAddInterval(e.target.value)} />
                    </label>
                    <label>Time unit
                      <select value={addTimeUnit} onChange={e=>setAddTimeUnit(e.target.value as any)}>
                        <option value="SECOND">SECOND</option>
                        <option value="MINUTE">MINUTE</option>
                        <option value="HOUR">HOUR</option>
                        <option value="DAY">DAY</option>
                        <option value="MONTH">MONTH</option>
                        <option value="YEAR">YEAR</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div style={{marginTop:8}}>
                  <button type="button" style={btnPrimary} onClick={addOperation}>Adicionar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
