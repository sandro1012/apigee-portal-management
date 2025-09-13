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

  const [list, setList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [detail, setDetail] = useState<ApiProduct|null>(null);
  const [err, setErr] = useState("");

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [proxies, setProxies] = useState<string[]>([]);

  const [addProxy, setAddProxy] = useState("");
  const [addPath, setAddPath] = useState("");
  const [addMethods, setAddMethods] = useState<Method[]>([]);
  const [addLimit, setAddLimit] = useState("");
  const [addInterval, setAddInterval] = useState("");
  const [addTimeUnit, setAddTimeUnit] = useState<Quota["timeUnit"]>("MINUTE");

  useEffect(() => {
    fetch("/api/orgs").then(r=>r.json()).then(setOrgs).catch(()=>setOrgs([]));
  }, []);

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

  async function openDetail(name: string) {
    if (!org || !name) return;
    setSelected(name);
    setDetail(null);
    try {
      const qs = `?org=${encodeURIComponent(org)}`;
      const j = await fetchJson<ApiProduct>(`/api/products/${encodeURIComponent(name)}${qs}`);
      setDetail(j);
      try {
        const apis = await fetchJson<{names:string[]}>(`/api/apis${qs}`);
        setProxies(Array.isArray(apis?.names) ? apis.names : []);
      } catch { setProxies([]); }
    } catch (e:any) {
      setErr(e.message || String(e));
    }
  }

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

  async function changeQuotaForApiSource(apiSource: string, q: Quota) {
    if (!detail) return;
    const rows = opRowsFromDetail(detail).map(r => (r.apiSource===apiSource ? { ...r, quota: q } : r));
    const newOg = toOperationGroup(rows);
    await applyOpGroup(newOg);
  }

  async function addOperation() {
    if (!detail || !selected) return;
    if (!addProxy || !addPath.trim() || addMethods.length===0) {
      alert("Selecione a API proxy, informe o path e pelo menos um método.");
      return;
    }
    const rows = opRowsFromDetail(detail);
    rows.push({
      apiSource: addProxy,
      resource: addPath.trim(),
      methods: addMethods,
      quota: (addLimit || addInterval || addTimeUnit) ? { limit:addLimit||undefined, interval:addInterval||undefined, timeUnit:addTimeUnit } : undefined,
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

      <div className="card" style={{display:'grid', gap:8, maxWidth:760, marginBottom:12}}>
        <label>Org
          <select value={org} onChange={e=>setOrg(e.target.value)}>
            <option value="">Selecione...</option>
            {orgs.map(o=>(<option key={o} value={o}>{o}</option>))}
          </select>
        </label>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button onClick={loadProducts} disabled={!org}>Listar products</button>
          <input placeholder="filtrar..." value={q} onChange={e=>setQ(e.target.value)} style={{flex:1}} />
        </div>
        {err && <div style={{color:"#ef4444"}}>Erro: {err}</div>}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr minmax(380px, 42%)', gap:12}}>
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
                  <th style={{textAlign:'left', padding:'8px 6px'}}>
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
                  <th style={{textAlign:'left', padding:'8px 6px'}}>Product</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n=>(
                  <tr key={n} style={{borderTop:'1px solid var(--border)'}}>
                    <td style={{padding:'8px 6px'}}>
                      <input type="checkbox" checked={!!checks[n]} onChange={e=> setChecks({...checks, [n]: e.currentTarget.checked})} />
                    </td>
                    <td style={{padding:'8px 6px', cursor:'pointer'}} onClick={()=>openDetail(n)}>
                      {n}
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && <tr><td colSpan={2} style={{padding:'10px 6px', opacity:.7}}>Nenhum product</td></tr>}
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
                <div className="card" style={{padding:12}}>
                  <div className="small" style={{opacity:.7}}>Nome</div>
                  <div style={{fontFamily:'monospace'}}>{detail.displayName || detail.name}</div>
                </div>
                <div className="card" style={{padding:12}}>
                  <div className="small" style={{opacity:.7}}>ID</div>
                  <div style={{fontFamily:'monospace'}}>{detail.name}</div>
                </div>
                <div className="card" style={{padding:12}}>
                  <div className="small" style={{opacity:.7}}>Approval</div>
                  <div>{detail.approvalType || "-"}</div>
                </div>
                <div className="card" style={{padding:12}}>
                  <div className="small" style={{opacity:.7}}>Descrição</div>
                  <div>{detail.description || "-"}</div>
                </div>
              </div>

              <div>
                <h4 style={{margin:'10px 0 8px'}}>Operations</h4>
                {rows.length===0 && (
                  <div className="card" style={{padding:12}}>Nenhum resource / operação associado.</div>
                )}

                {rows.length>0 && (
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', minWidth:820}}>
                      <thead>
                        <tr>
                          <th style={{textAlign:'left', padding:'8px 6px'}}>Proxy</th>
                          <th style={{textAlign:'left', padding:'8px 6px'}}>Path</th>
                          <th style={{textAlign:'left', padding:'8px 6px'}}>Methods</th>
                          <th style={{textAlign:'left', padding:'8px 6px'}}>Quota (limit / interval / unit)</th>
                          <th style={{textAlign:'left', padding:'8px 6px'}}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx)=>(
                          <tr key={idx} style={{borderTop:'1px solid var(--border)'}}>
                            <td style={{padding:'8px 6px'}}>{r.apiSource}</td>
                            <td style={{padding:'8px 6px', fontFamily:'monospace'}}>{r.resource}</td>
                            <td style={{padding:'8px 6px'}}>{r.methods.join(", ")}</td>
                            <td style={{padding:'8px 6px'}}>
                              <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
                                <input
                                  style={{width:90}}
                                  placeholder="limit"
                                  defaultValue={r.quota?.limit || ""}
                                  onBlur={(e)=>{
                                    const q = { limit: e.currentTarget.value || undefined, interval: r.quota?.interval, timeUnit: r.quota?.timeUnit||"MINUTE" as const };
                                    changeQuotaForApiSource(r.apiSource, q);
                                  }}
                                />
                                <input
                                  style={{width:90}}
                                  placeholder="interval"
                                  defaultValue={r.quota?.interval || ""}
                                  onBlur={(e)=>{
                                    const q = { limit: r.quota?.limit, interval: e.currentTarget.value || undefined, timeUnit: r.quota?.timeUnit||"MINUTE" as const };
                                    changeQuotaForApiSource(r.apiSource, q);
                                  }}
                                />
                                <select
                                  defaultValue={r.quota?.timeUnit || "MINUTE"}
                                  onChange={(e)=>{
                                    const q = { limit: r.quota?.limit, interval: r.quota?.interval, timeUnit: e.currentTarget.value as Quota["timeUnit"] };
                                    changeQuotaForApiSource(r.apiSource, q);
                                  }}
                                >
                                  <option value="SECOND">SECOND</option>
                                  <option value="MINUTE">MINUTE</option>
                                  <option value="HOUR">HOUR</option>
                                  <option value="DAY">DAY</option>
                                </select>
                              </div>
                            </td>
                            <td style={{padding:'8px 6px'}}>
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

              <div className="card" style={{padding:12}}>
                <h4 style={{margin:'0 0 8px'}}>Adicionar operation</h4>
                <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8}}>
                  <label>API Proxy
                    <select value={addProxy} onChange={e=>setAddProxy(e.target.value)}>
                      <option value="">Selecione…</option>
                      {proxies.map(p=>(<option key={p} value={p}>{p}</option>))}
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

                <div style={{marginTop:10}}>
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
