"use client";

import React, { useEffect, useState } from "react";

type Props = {
  appId: string;
  appName: string;
  org: string;
  onCreated?: () => void;
};

export default function NewCredentialDrawer({ appId, appName, org, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setError("");
        const r = await fetch(`/api/products?org=${encodeURIComponent(org)}`);
        const j = await r.json().catch(() => ({}));
        setProducts(j?.apiProduct || j?.names || []);
      } catch (e: any) {
        setError(e.message || "Falha ao carregar products");
      }
    })();
  }, [open, org]);

  async function create() {
    if (selected.length === 0) { alert("Selecione ao menos 1 product"); return; }
    try {
      setBusy(true);
      const body: any = { apiProducts: selected };
      if (expiresIn) {
        const n = Number(expiresIn);
        if (!Number.isNaN(n)) body.keyExpiresIn = n;
      }
      const r = await fetch(`/api/apps/${encodeURIComponent(appId)}/credentials?org=${encodeURIComponent(org)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const t = await r.text();
      if (!r.ok) throw new Error(t || "Falha ao criar credencial");
      setOpen(false); setSelected([]); setExpiresIn("");
      onCreated && onCreated();
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="px-3 py-1 rounded border" onClick={() => setOpen(true)}>Nova credencial</button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 shadow-xl p-4 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Nova credencial — <span className="font-mono">{appName}</span></h2>
              <button onClick={()=>setOpen(false)} className="text-xl">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-zinc-500 mb-1">API Products</div>
                <select multiple className="w-full border rounded p-2 h-40"
                  value={selected}
                  onChange={e => setSelected(Array.from(e.target.selectedOptions).map(o => o.value))}>
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">keyExpiresIn (ms) — opcional</div>
                <input className="w-full border rounded p-2" value={expiresIn} onChange={e=>setExpiresIn(e.target.value)} placeholder="ex.: 0 = nunca expira" />
              </div>
              {error && <div className="text-red-600 text-sm whitespace-pre-wrap">{error}</div>}
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" disabled={busy} onClick={create}>
                  {busy ? "Criando..." : "Criar"}
                </button>
                <button className="px-4 py-2 rounded border" onClick={()=>setOpen(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
