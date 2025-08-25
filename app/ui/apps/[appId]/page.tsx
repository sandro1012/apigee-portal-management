"use client";
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Attr = { name: string; value: string };
type Credential = { consumerKey: string; consumerSecret?: string; status?: string; apiProducts?: { apiproduct: string; status?: string }[] };
type DevApp = {
  name: string;
  appId?: string;
  status?: string;
  attributes?: Attr[];
  developerEmail?: string; developerId?: string;
  credentials?: Credential[];
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}
function credHref(appId: string, key: string, org: string) {
  const base = "/ui/apps/" + encodeURIComponent(appId) + "/credentials/" + encodeURIComponent(key);
  return base + (org ? ("?org=" + encodeURIComponent(org)) : "");
}

export default function AppDetailSimple() {
  const { appId } = useParams<{ appId: string }>();
  const search = useSearchParams();
  const org = search.get("org") || "";
  const manageFlag = search.get("manage") === "1";
  const appIdStr = String(appId || "");

  const [app, setApp] = useState<DevApp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr("");
      try {
        const qs = org ? ("?org=" + encodeURIComponent(org)) : "";
        const detail = await fetchJson("/api/apps/" + encodeURIComponent(appIdStr) + qs);
        setApp(detail);

        if (manageFlag) {
          const firstKey = detail?.credentials?.[0]?.consumerKey;
          if (firstKey) {
            window.location.href = credHref(appIdStr, firstKey, org);
            return;
          }
        }
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally { setLoading(false); }
    };
    if (appIdStr) run();
  }, [appIdStr, org, manageFlag]);

  const firstKey = app?.credentials?.[0]?.consumerKey;
  const credLink = firstKey ? credHref(appIdStr, firstKey, org) : null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Detalhes do App</h1>
      {loading && <div>Carregando…</div>}
      {err && <div className="text-red-600 whitespace-pre-wrap">Erro: {err}</div>}

      {app && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Nome</div>
              <div className="font-mono break-all">{app.name}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">App ID</div>
              <div className="font-mono break-all">{app.appId}</div>
            </div>
            <div className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">Status</div>
              <div className="capitalize">{app.status}</div>
            </div>
          </div>

          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <h2 className="text-lg font-semibold mb-3">Ações</h2>
            <div className="flex flex-wrap gap-2">
              {credLink && <a className="px-3 py-2 rounded bg-indigo-600 text-white" href={credLink}>Gerenciar</a>}
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              Dica: “Gerenciar” abre a visão completa com criação/revogação de credenciais e associação de products.
            </div>
          </section>

          <section className="p-4 rounded-2xl shadow bg-white dark:bg-zinc-900">
            <h2 className="text-lg font-semibold mb-3">Atributos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(app.attributes || []).map(a => (
                <div key={a.name} className="border rounded-xl p-3">
                  <div className="text-xs text-zinc-500">{a.name}</div>
                  <div className="font-mono break-all">{a.value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
