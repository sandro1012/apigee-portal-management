// app/ui/products/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

// --- Tipos mínimos para a UI:
type Method = "GET"|"POST"|"PUT"|"PATCH"|"DELETE"|"HEAD"|"OPTIONS";
type Quota = { limit?: string; interval?: string; timeUnit?: "SECOND"|"MINUTE"|"HOUR"|"DAY" };
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

type BasepathDTO = { name: string; basePath: string; revision?: string };

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

  // basepaths ativos no env e seleção do basePath
  const [basepaths, setBasepaths] = useState<BasepathDTO[]>([]);
  const [selectedBasepath, setSelectedBasepath] = useState<string>("");

  // add operation form
  const [addPath, setAddPath] = useState("");
  const [addMethods, setAddMethods] = useState<Method[]>([]);
  const [addLimit, setAddLimit] = useState("");
  const [addInterval, setAddInterval] = useState("");
  const [addTimeUnit, setAddTimeUnit] = useState<Quota["timeUnit"]>("MINUTE");

  // quota edição explícita por proxy (apiSource)
  const [quotaEdits, setQuotaEdits] = useState<Record<string, Quota>>({});

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

  async function loadBasepaths() {
    if (!org || !env) { setBasepaths([]); setSelectedBasepath(""); return; }
    try {
      const qs = `?org=${encodeURIComponent(org)}&env=${encodeURIComponent(env)}`;
      const list = await fetchJson<BasepathDTO[]>(`/api/basepaths${qs}`);
      const safe = (Array.isArray(list) ? list : []).map(x => ({
        name: String(x?.name ?? ""),
        basePath: String(x?.basePath ?? ""),
        revision: x?.revision ? String(x.revision) : undefined,
      })).filter(x => x.name && x.basePath);
      setBasepaths(safe);
      if (safe.length && !selectedBasepath) setSelectedBasepath(safe[0].basePath);
    } catch {
      setBasepaths([]);
      setSelectedBasepath("");
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
      setSelectedBasepath("");
    }
  }, [env]); // eslint-disable-line react-hooks/exhaustive-deps

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
      quota: v.quota && (v.quota.limit || v.quota.interval || v.quota.timeUnit) ? v.quota : undefined,
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
    const q = quotaEdits[apiSource] || {};
    const rows = opRowsFromDetail(detail).map(r => (r.apiSource===apiSource ? { ...r, quota: q } : r));
    const newOg = toOperationGroup(rows);
    await applyOpGroup(newOg);
  }

  async function addOperation() {
    if (!detail || !selected) return;
    if (!selectedBasepath || !addPath.trim() || addMethods.length===0) {
      alert("Selecione a API proxy (basePath), informe o path e pelo menos um método.");
      return;
    }

    // Descobre o proxy name a partir do basePath selecionado
    const bp = basepaths.find(x => x.basePath === selectedBasepath);
    const proxyName = bp?.name || "";
    if (!proxyName) {
      alert("Não foi possível resolver o nome do proxy para o basePath selecionado.");
      return;
    }

    const rows = opRowsFromDetail(detail);
    rows.push({
      apiSource: proxyName,
      resource: addPath.trim(),
      methods: addMethods,
      quota: (addLimit || addInterval || addTimeUnit)
        ? { limit:addLimit||undefined, interval:addInterval||undefined, timeUnit:addTimeUnit }
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

  const rows = detail ? opRowsFromDetail(detail) : [];

  return (
    <main>
      <h2>API Products</h2>

      <div className="card" style={{display:'grid', gap:8, maxWidth:860, marginBottom:12}}>
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
          <button onClick={loadProducts} disabled={!org}>Listar products</button>
          <input placeholder="filtrar..." value={q} onChange={e=>setQ(e.target.value)} style={{flex:1}} />
        </div>
        {err && <div style={{color:"#ef4444"}}>Erro: {err}</div>}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr minmax(420px, 46%)', gap:12}}>
        {/* Lista */}
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <strong>Products</strong>
            <button style={btnDanger} onClick={deleteSelected} disabled={filtered.length===0 || filtered.every(n=>!checks[n])}>Excluir selecionados</button>
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
                        const all = {...checks};
                        for (const n of filtered) all[n] = e.currentTarget.checked;
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
                {rows.length===0 && (
                  <div className="card" style={{padding:10}}>Nenhum resource / operação associado.</div>
                )}

                {rows.length>0 && (
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', minWidth:820}}>
                      <thead>
                        <tr>
                          <th style={{textAlign:'left', padding:'6px'}}>Proxy</th>
                          <th style={{textAlign:'left', padding:'6px'}}>Path</th>
                          <th style={{textAlign:'left', padding:'6px'}}>Methods</th>
                          <th style={{textAlign:'left', padding:'6px'}}>Quota (limit / interval / unit)</th>
                          <th style={{textAlign:'left', padding:'6px'}}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx)=>(
                          <tr key={`${r.apiSource}-${r.resource}-${idx}`} style={{borderTop:'1px solid var(--border)'}}>
                            <td style={{padding:'6px'}}>{r.apiSource}</td>
                            <td style={{padding:'6px', fontFamily:'monospace'}}>{r.resource}</td>
                            <td style={{padding:'6px'}}>{r.methods.join(", ")}</td>
                            <td style={{padding:'6px'}}>
                              <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
                                <input
                                  style={{width:84}}
                                  placeholder="limit"
                                  value={quotaEdits[r.apiSource]?.limit ?? (r.quota?.limit || "")}
                                  onChange={(e)=> setQuotaEdits(prev => ({...prev, [r.apiSource]: { ...(prev[r.apiSource]||{}), limit: e.currentTarget.value }}))}
                                />
                                <input
                                  style={{width:84}}
                                  placeholder="interval"
                                  value={quotaEdits[r.apiSource]?.interval ?? (r.quota?.interval || "")}
                                  onChange={(e)=> setQuotaEdits(prev => ({...prev, [r.apiSource]: { ...(prev[r.apiSource]||{}), interval: e.currentTarget.value }}))}
                                />
                                <select
                                  value={quotaEdits[r.apiSource]?.timeUnit ?? (r.quota?.timeUnit || "MINUTE")}
                                  onChange={(e)=> setQuotaEdits(prev => ({...prev, [r.apiSource]: { ...(prev[r.apiSource]||{}), timeUnit: e.target.value as Quota["timeUnit"] }}))}
                                >
                                  <option value="SECOND">SECOND</option>
                                  <option value="MINUTE">MINUTE</option>
                                  <option value="HOUR">HOUR</option>
                                  <option value="DAY">DAY</option>
                                </select>
                                <button
                                  style={{...btnPrimary, padding:"6px 10px"}}
                                  onClick={()=> saveQuotaForApiSource(r.apiSource)}
                                  title="Salvar quota deste proxy"
                                >
                                  Salvar quota
                                </button>
                              </div>
                            </td>
                            <td style={{padding:'6px'}}>
                              <button
                                style={{...btnDanger, padding:"6px 10px"}}
                                onClick={()=> removeOperation({ apiSource:r.apiSource, resource:r.resource })}
                                title="Remover operação"
                              >
                                Remover
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card" style={{padding:10}}>
                <h4 style={{margin:'0 0 8px'}}>Adicionar operation</h4>

                <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8}}>
                  <label>API Proxy
                    <select
                      value={selectedBasepath}
                      onChange={e=>setSelectedBasepath(e.target.value)}
                      disabled={!env}
                    >
                      <option value="">{env ? "Selecione…" : "Selecione um env"}</option>
                      {basepaths.map(p=>(
                        <option key={`${p.name}:${p.basePath}`} value={p.basePath}>
                          {p.name} — {p.basePath}{p.revision ? ` (rev ${p.revision})` : ""}
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
                      </select>
                    </label>
                  </div>
                </div>

                <div style={{marginTop:8}}>
                  <button style={btnPrimary} onClick={addOperation}>Adicionar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
