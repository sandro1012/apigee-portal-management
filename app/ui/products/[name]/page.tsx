"use client";

import { useEffect, useMemo, useState } from "react";
import type { OperationConfig, OperationGroupPayload, HttpMethod } from "../../../../lib/schema/product";
import { operationGroupSchema } from "../../../../lib/schema/product";

const METHODS: HttpMethod[] = ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS","TRACE"];

type ApigeeProduct = {
  name: string;
  displayName?: string;
  description?: string;
  environments?: string[];
  operationGroup?: { operationConfigs?: OperationConfig[] };
  // outros campos ignorados para UI
};

export default function ProductDetailPage({ params }: { params: { name: string } }) {
  const productName = decodeURIComponent(params.name);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ApigeeProduct | null>(null);
  const [configs, setConfigs] = useState<OperationConfig[]>([]);

  // load product
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/products/${encodeURIComponent(productName)}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Falha ao obter produto");
        if (cancel) return;
        const p: ApigeeProduct = j.product;
        setProduct(p);
        const current = p?.operationGroup?.operationConfigs || [];
        setConfigs(current.length ? current : [{
          apiSource: "",
          operations: [{ resource: "/", methods: [] }],
          quota: { limit: "", interval: "", timeUnit: "" },
          attributes: [],
        }]);
      } catch (e: any) {
        if (!cancel) setError(e.message || "Erro");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [productName]);

  const preview: OperationGroupPayload = useMemo(() => ({
    operationConfigs: configs.map(c => ({
      apiSource: c.apiSource,
      operations: c.operations.map(op => ({
        resource: op.resource,
        methods: op.methods || [],
      })),
      quota: (c.quota && (c.quota.limit || c.quota.interval || c.quota.timeUnit)) ? c.quota : undefined,
      attributes: (c.attributes && c.attributes.length) ? c.attributes : undefined,
    })),
  }), [configs]);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const parsed = operationGroupSchema.safeParse(preview);
      if (!parsed.success) {
        const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("\n");
        throw new Error("Validação falhou:\n" + issues);
      }
      const r = await fetch(`/api/products/${encodeURIComponent(productName)}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationGroup: parsed.data }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.error) throw new Error(j?.error || "Falha ao atualizar product");
      // atualiza tela
      alert("Atualizado com sucesso!");
    } catch (e: any) {
      setError(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function updateConfig(idx: number, next: Partial<OperationConfig>) {
    setConfigs(prev => prev.map((c, i) => i === idx ? { ...c, ...next } : c));
  }
  function addConfig() {
    setConfigs(prev => [...prev, { apiSource: "", operations: [{ resource: "/", methods: [] }], quota: { limit: "", interval: "", timeUnit: "" }, attributes: [] }]);
  }
  function removeConfig(idx: number) {
    setConfigs(prev => prev.filter((_, i) => i !== idx));
  }
  function addOperation(ci: number) {
    setConfigs(prev => prev.map((c, i) => i === ci ? { ...c, operations: [...c.operations, { resource: "/", methods: [] }] } : c));
  }
  function updateOperation(ci: number, oi: number, patch: any) {
    setConfigs(prev => prev.map((c, i) => {
      if (i !== ci) return c;
      const ops = c.operations.map((op, j) => j === oi ? { ...op, ...patch } : op);
      return { ...c, operations: ops };
    }));
  }
  function removeOperation(ci: number, oi: number) {
    setConfigs(prev => prev.map((c, i) => {
      if (i !== ci) return c;
      const ops = c.operations.filter((_, j) => j !== oi);
      return { ...c, operations: ops.length ? ops : [{ resource: "/", methods: [] }] };
    }));
  }
  function toggleMethod(ci: number, oi: number, m: HttpMethod) {
    setConfigs(prev => prev.map((c, i) => {
      if (i !== ci) return c;
      const ops = c.operations.map((op, j) => {
        if (j !== oi) return op;
        const set = new Set(op.methods || []);
        if (set.has(m)) set.delete(m); else set.add(m);
        return { ...op, methods: Array.from(set) as HttpMethod[] };
      });
      return { ...c, operations: ops };
    }));
  }
  function updateQuota(ci: number, patch: any) {
    setConfigs(prev => prev.map((c, i) => i === ci ? { ...c, quota: { ...(c.quota || {}), ...patch } } : c));
  }
  function addAttr(ci: number) {
    setConfigs(prev => prev.map((c, i) => i === ci ? { ...c, attributes: [...(c.attributes || []), { name: "", value: "" }] } : c));
  }
  function updateAttr(ci: number, ai: number, patch: any) {
    setConfigs(prev => prev.map((c, i) => {
      if (i !== ci) return c;
      const attrs = (c.attributes || []).map((a, j) => j === ai ? { ...a, ...patch } : a);
      return { ...c, attributes: attrs };
    }));
  }
  function removeAttr(ci: number, ai: number) {
    setConfigs(prev => prev.map((c, i) => {
      if (i !== ci) return c;
      const attrs = (c.attributes || []).filter((_, j) => j !== ai);
      return { ...c, attributes: attrs };
    }));
  }

  if (loading) return <div className="p-6">Carregando…</div>;
  if (error) return <div className="p-6 text-red-600">Erro: {error}</div>;
  if (!product) return <div className="p-6">Produto não encontrado.</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Product: <span className="font-mono">{product.name}</span></h1>
        <p className="text-sm text-gray-500">{product.displayName || ""}</p>
        {product.environments?.length ? (<p className="text-sm mt-1">Environments: <span className="font-mono">{product.environments.join(", ")}</span></p>) : null}
      </div>

      <div className="space-y-4">
        {configs.map((cfg, idx) => (
          <div key={idx} className="rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <label className="w-36 text-sm text-gray-600">Proxy (apiSource)</label>
              <input
                className="flex-1 bg-white border rounded-lg px-3 py-2"
                placeholder="ex.: MyProxyName"
                value={cfg.apiSource}
                onChange={e => updateConfig(idx, { apiSource: e.target.value })}
              />
              <button onClick={() => removeConfig(idx)} className="text-red-600 text-sm px-2 py-1 border rounded-lg hover:bg-red-50">Remover</button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-sm font-medium">Operations</div>
              {cfg.operations.map((op, oi) => (
                <div key={oi} className="rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    <label className="w-24 text-sm text-gray-600">Path</label>
                    <input
                      className="flex-1 bg-white border rounded-lg px-3 py-2"
                      placeholder="/"
                      value={op.resource}
                      onChange={e => updateOperation(idx, oi, { resource: e.target.value })}
                    />
                    <button onClick={() => removeOperation(idx, oi)} className="text-red-600 text-xs px-2 py-1 border rounded-lg hover:bg-red-50">Remover</button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {METHODS.map(m => (
                      <label key={m} className={"px-2 py-1 rounded border text-xs cursor-pointer " + ((op.methods||[]).includes(m) ? "bg-black text-white" : "bg-white")} onClick={() => toggleMethod(idx, oi, m)}>
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => addOperation(idx)} className="text-sm px-3 py-1 border rounded-lg hover:bg-gray-50">+ Adicionar operation</button>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium">Quota (opcional)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <input className="bg-white border rounded-lg px-3 py-2" placeholder="limit (ex.: 10)" value={cfg.quota?.limit || ""} onChange={e => updateQuota(idx, { limit: e.target.value })} />
                <input className="bg-white border rounded-lg px-3 py-2" placeholder="interval (ex.: 1)" value={cfg.quota?.interval || ""} onChange={e => updateQuota(idx, { interval: e.target.value })} />
                <input className="bg-white border rounded-lg px-3 py-2" placeholder="timeUnit (ex.: second)" value={cfg.quota?.timeUnit || ""} onChange={e => updateQuota(idx, { timeUnit: e.target.value })} />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium">Attributes (opcionais)</div>
              {(cfg.attributes||[]).map((a, ai) => (
                <div key={ai} className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-2">
                  <input className="bg-white border rounded-lg px-3 py-2 md:col-span-2" placeholder="name" value={a.name} onChange={e => updateAttr(idx, ai, { name: e.target.value })} />
                  <input className="bg-white border rounded-lg px-3 py-2 md:col-span-2" placeholder="value" value={a.value||""} onChange={e => updateAttr(idx, ai, { value: e.target.value })} />
                  <button onClick={() => removeAttr(idx, ai)} className="text-red-600 text-xs px-2 py-1 border rounded-lg hover:bg-red-50">Remover</button>
                </div>
              ))}
              <button onClick={() => addAttr(idx)} className="mt-2 text-sm px-3 py-1 border rounded-lg hover:bg-gray-50">+ Adicionar atributo</button>
            </div>
          </div>
        ))}
        <button onClick={addConfig} className="text-sm px-3 py-1 border rounded-lg hover:bg-gray-50">+ Adicionar Operation Config</button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
        {error ? <span className="text-red-600 text-sm">{error}</span> : null}
      </div>
    </div>
  );
}
