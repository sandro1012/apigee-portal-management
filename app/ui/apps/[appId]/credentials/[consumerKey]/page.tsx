"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type ApiProductRef = { apiproduct: string; status?: string };
type Credential = { consumerKey: string; consumerSecret?: string; status?: string; apiProducts?: ApiProductRef[] };
type DevApp = { name: string; appId?: string; status?: string; credentials?: Credential[] };

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) {
    let msg = r.statusText;
    try { msg = (await r.text()) || msg; } catch {}
    throw new Error(msg);
  }
  return await r.json();
}

export default function CredentialDetailPage() {
  const { appId, consumerKey } = useParams<{ appId: string; consumerKey: string }>();
  const search = useSearchParams();
  const org = search.get("org") || "";
  const env = search.get("env") || "";

  const appIdStr = String(appId || "");
  const keyStr = String(consumerKey || "");
  const qs = (() => {
    const p = new URLSearchParams();
    if (org) p.set("org", org);
    if (env) p.set("env", env);
    const s = p.toString();
    return s ? `?${s}` : "";
  })();

  const [app, setApp] = useState<DevApp | null>(null);
  const [cred, setCred] = useState<Credential | null>(null);
  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // add/remove product
  const currentProducts = useMemo(() => (cred?.apiProducts || []).map(p => p.apiproduct), [cred]);
  const availableProducts = useMemo(() => allProducts.filter(p => !currentProducts.includes(p)), [allProducts, currentProducts]);
  const [addSel, setAddSel] = useState<string>("");

  // inline "nova credencial"
  const [createSel, setCreateSel] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>(""); // ms

  async function load() {
    setLoading(true); setErr("");
    try {
      // app + cred atual
      const detail: DevApp = await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}${qs}`);
      setApp(detail);
      const found = (detail.credentials || []).find(c => c.consumerKey === keyStr) || null;
      setCred(found);

      // lista de products (aceita múltiplos formatos)
      const pr = await fetchJson(`/api/products${qs}`);
      let names: string[] = [];
      if (Array.isArray(pr)) {
        if (pr.length > 0 && typeof pr[0] === "string") names = pr as string[];
        else if (pr.length > 0 && typeof pr[0] === "object" && (pr[0] as any)?.name) names = (pr as any[]).map(x => String((x as any).name));
      } else if ((pr as any)?.apiProduct && Array.isArray((pr as any).apiProduct)) {
        names = ((pr as any).apiProduct as any[]).map(x => String((x as any).name || (x as any).displayName || x));
      } else if ((pr as any)?.names && Array.isArray((pr as any).names)) {
        names = (pr as any).names as string[];
      }
      names = names.sort((a,b)=>a.localeCompare(b));
      setAllProducts(names);
      setAddSel(names[0] || "");
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally { setLoading(false); }
  }
  useEffect(() => { if (appIdStr && keyStr) load(); }, [appIdStr, keyStr, org, env]);

  // ações credencial
  async function approve() {
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(keyStr)}/status${qs}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve" })
    });
    await load();
  }
  async function revoke() {
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(keyStr)}/status${qs}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "revoke" })
    });
    await load();
  }
  async function del() {
    if (!confirm("Excluir credencial?")) return;
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(keyStr)}${qs}`, { method: "DELETE" });
    // volta para a lista de Apps
    window.location.href = `/ui/apps${qs}`;
  }

  async function addProduct() {
    if (!addSel) return;
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(keyStr)}/products/add${qs}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiProduct: addSel })
    });
    await load();
  }
  async function removeProduct(p: string) {
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials/${encodeURIComponent(keyStr)}/products/${encodeURIComponent(p)}${qs}`, { method: "DELETE" });
    await load();
  }

  // criar nova credencial (inline)
  async function createCredential() {
    if (createSel.length === 0) return alert("Selecione ao menos 1 API Product");
    const body: any = { apiProducts: createSel };
    if (expiresIn.trim()) {
      const n = Number(expiresIn.trim());
      if (!Number.isNaN(n)) body.keyExpiresIn = n;
    }
    await fetchJson(`/api/apps/${encodeURIComponent(appIdStr)}/credentials${qs}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    setCreateSel([]); setExpiresIn("");
    await load();
  }

  return (
    <main style={{display:'grid', gap:12}}>
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <h1 style={{margin:0}}>Credencial do App</h1>
        <span className="small" style={{border:'1px solid var(--border)', padding:'2px 6px', borderRadius:12}}>v3c</span>
      </div>

      {loading && <div>Carregando…</div>}
      {err && <div style={{color:'#c0392b', whiteSpace:'pre-wrap'}}>Erro: {err}</div>}

      {app && cred && (
        <div style={{display:'grid', gap:12}}>
          {/* Linha principal: App / Key / Secret */}
          <div style={{display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))'}}>
            <div className="card">
              <div className="small" style={{opacity:.7}}>App</div>
              <div style={{fontWeight:600, wordBreak:'break-word'}}>{app.name}</div>
            </div>
            <div className="card">
              <div className="small" style={{opacity:.7}}>Key</div>
              <div style={{fontFamily:'monospace', fontSize:13, wordBreak:'break-word'}}>{cred.consumerKey}</div>
            </div>
            <div className="card">
              <div className="small" style={{opacity:.7}}>Secret</div>
              <div style={{fontFamily:'monospace', fontSize:13, wordBreak:'break-word'}}>{cred.consumerSecret || "-"}</div>
            </div>
          </div>

          {/* Status + Ações */}
          <div style={{display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))'}}>
            <div className="card">
              <div className="small" style={{opacity:.7}}>Status</div>
              <div style={{textTransform:'capitalize'}}>{cred.status}</div>
            </div>
            <div className="card" style={{display:'grid', gap:8}}>
              <div className="small" style={{opacity:.7}}>Ações</div>
              <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                <button onClick={approve} className="primary">Aprovar</button>
                <button onClick={revoke} className="warn">Revogar</button>
                <button onClick={del} className="danger">Excluir credencial</button>
              </div>
            </div>
          </div>

          {/* Nova credencial (inline) */}
          <div className="card" style={{display:'grid', gap:8}}>
            <h3 style={{margin:'0 0 4px 0'}}>Nova credencial</h3>
            <div style={{display:'flex', flexWrap:'wrap', gap:8, alignItems:'flex-start'}}>
              <select
                multiple
                value={createSel}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                  setCreateSel(opts);
                }}
                style={{border:'1px solid var(--border)', borderRadius:8, padding:8, minWidth:240, height:132}}
              >
                {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                placeholder="keyExpiresIn (ms) opcional"
                value={expiresIn}
                onChange={e=>setExpiresIn(e.target.value)}
                style={{border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px'}}
              />
              <button onClick={createCredential} className="primary">Criar</button>
            </div>
            <small className="small" style={{opacity:.7}}>Selecione um ou mais products e, se quiser, defina expiração da key (em ms).</small>
          </div>

          {/* Products associados */}
          <div className="card" style={{display:'grid', gap:8}}>
            <h3 style={{margin:'0 0 4px 0'}}>Products associados</h3>
            <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
              {(cred.apiProducts || []).map(p => (
                <span key={p.apiproduct}
                  style={{
                    display:'inline-flex', alignItems:'center', gap:8,
                    border:'1px solid var(--border)', borderRadius:999,
                    padding:'4px 10px', fontSize:13
                  }}>
                  {p.apiproduct}
                  <button onClick={() => removeProduct(p.apiproduct)} className="danger" style={{padding:'2px 8px'}}>×</button>
                </span>
              ))}
              {(cred.apiProducts || []).length === 0 && (
                <div className="small" style={{opacity:.7}}>Nenhum product associado.</div>
              )}
            </div>

            <div style={{display:'flex', gap:8, alignItems:'center', marginTop:4}}>
              <select
                value={addSel}
                onChange={e=>setAddSel(e.target.value)}
                style={{border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', minWidth:220}}
              >
                {availableProducts.length === 0 && <option value="">Nenhum product disponível</option>}
                {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button disabled={!addSel} onClick={addProduct} className="primary">Adicionar</button>
            </div>
            <small className="small" style={{opacity:.7}}>O seletor mostra somente products ainda não associados.</small>
          </div>

          {/* Rodapé com Voltar */}
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <a href={`/ui/apps${qs}`}><button>Voltar à lista de Apps</button></a>
          </div>
        </div>
      )}
    </main>
  );
}
