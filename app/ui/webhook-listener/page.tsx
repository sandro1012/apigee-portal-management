"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// ====== Modelos ======
type AuthType = "None" | "Basic" | "Api Key" | "Token" | "TokenAPI" | "TokenPassword" | "TokenFormUrlencoded";

type ListenerApi = {
  key: string; // ex: "productOrderStateChangeEvent"
  label: string;
};

// Lista base de APIs listener (adicione/remova aqui conforme necessário)
const LISTENER_APIS: ListenerApi[] = [
  { key: "cancelProductOrderCreateEvent", label: "cancelProductOrderCreateEvent" },
  { key: "cancelTroubleTicketCreateEvent", label: "cancelTroubleTicketCreateEvent" },
  { key: "configurationResultEvent", label: "configurationResultEvent" },
  { key: "productOrderAttributeValueChangeEvent", label: "productOrderAttributeValueChangeEvent" },
  { key: "productOrderCreateEvent", label: "productOrderCreateEvent" },
  { key: "productOrderInformationRequiredEvent", label: "productOrderInformationRequiredEvent" },
  { key: "productOrderInProvisioning", label: "productOrderInProvisioning" },
  { key: "productOrderStateChangeEvent", label: "productOrderStateChangeEvent" },
  { key: "productOrderStateChangeEvent-v2", label: "productOrderStateChangeEvent-v2" },
  { key: "serviceTestResultEvent", label: "serviceTestResultEvent" },
  { key: "serviceTestResultEvent_v2", label: "serviceTestResultEvent_v2" },
  { key: "troubleTicketAttributeValueChangeEvent", label: "troubleTicketAttributeValueChangeEvent" },
  { key: "troubleTicketInformationRequiredEvent", label: "troubleTicketInformationRequiredEvent" },
  { key: "troubleTicketStateChangeEvent", label: "troubleTicketStateChangeEvent" },
  { key: "workOrderAttributeValueChangeEvent", label: "workOrderAttributeValueChangeEvent" },
  { key: "workOrderStateChangeEvent", label: "workOrderStateChangeEvent" },
];

// ====== Helpers ======
async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const t = await r.text();
  const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(j?.error || r.statusText);
  return j as T;
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

function toNone(v?: string) {
  return v && v.trim() ? v.trim() : "None";
}

// Gera pares { name, value } no padrão do seu KVM para UMA API
function buildKvmEntriesForApi(apiKey: string, baseWebhook: string, replicate: boolean, auth: AuthType, authFields: Record<string, string>) {
  const entries: { name: string; value: string }[] = [];

  // webhook
  const webhook = replicate ? joinUrl(baseWebhook, `/listener/${apiKey}`) : baseWebhook;
  entries.push({ name: `${apiKey}_webhook`, value: webhook });

  // type
  entries.push({ name: `${apiKey}_type`, value: auth });

  // Por tipo de autenticação, gerar os demais campos
  switch (auth) {
    case "None":
      // Sem nada além de webhook/type
      entries.push({ name: `${apiKey}_oauth`, value: "None" });
      entries.push({ name: `${apiKey}_scope`, value: "None" });
      entries.push({ name: `${apiKey}_key`, value: "None" });
      entries.push({ name: `${apiKey}_secret`, value: "None" });
      entries.push({ name: `${apiKey}_granttype`, value: "None" });
      entries.push({ name: `${apiKey}_username`, value: "None" });
      entries.push({ name: `${apiKey}_password`, value: "None" });
      entries.push({ name: `${apiKey}_login`, value: "None" });
      entries.push({ name: `${apiKey}_senha`, value: "None" });
      entries.push({ name: `${apiKey}_api_key`, value: "None" });
      break;

    case "Basic":
      // Key/Secret usados como user/pass
      entries.push({ name: `${apiKey}_oauth`, value: "None" });
      entries.push({ name: `${apiKey}_scope`, value: "None" });
      entries.push({ name: `${apiKey}_key`, value: toNone(authFields.key) });
      entries.push({ name: `${apiKey}_secret`, value: toNone(authFields.secret) });
      entries.push({ name: `${apiKey}_username`, value: toNone(authFields.key) });
      entries.push({ name: `${apiKey}_password`, value: toNone(authFields.secret) });
      entries.push({ name: `${apiKey}_granttype`, value: "None" });
      entries.push({ name: `${apiKey}_login`, value: "None" });
      entries.push({ name: `${apiKey}_senha`, value: "None" });
      entries.push({ name: `${apiKey}_api_key`, value: "None" });
      break;

    case "Api Key":
      entries.push({ name: `${apiKey}_oauth`, value: "None" });
      entries.push({ name: `${apiKey}_scope`, value: "None" });
      entries.push({ name: `${apiKey}_api_key`, value: toNone(authFields.apiKey) });
      entries.push({ name: `${apiKey}_key`, value: "None" });
      entries.push({ name: `${apiKey}_secret`, value: "None" });
      entries.push({ name: `${apiKey}_granttype`, value: "None" });
      entries.push({ name: `${apiKey}_username`, value: "None" });
      entries.push({ name: `${apiKey}_password`, value: "None" });
      entries.push({ name: `${apiKey}_login`, value: "None" });
      entries.push({ name: `${apiKey}_senha`, value: "None" });
      break;

    case "Token": // client_credentials
      entries.push({ name: `${apiKey}_oauth`, value: toNone(authFields.oauthUrl) });
      entries.push({ name: `${apiKey}_scope`, value: toNone(authFields.scope) });
      entries.push({ name: `${apiKey}_key`, value: toNone(authFields.key) });
      entries.push({ name: `${apiKey}_secret`, value: toNone(authFields.secret) });
      entries.push({ name: `${apiKey}_granttype`, value: toNone(authFields.grantType || "client_credentials") });
      entries.push({ name: `${apiKey}_username`, value: "None" });
      entries.push({ name: `${apiKey}_password`, value: "None" });
      entries.push({ name: `${apiKey}_login`, value: "None" });
      entries.push({ name: `${apiKey}_senha`, value: "None" });
      entries.push({ name: `${apiKey}_api_key`, value: "None" });
      break;

    case "TokenAPI": // password com login/senha; key/secret opcionais
      entries.push({ name: `${apiKey}_oauth`, value: toNone(authFields.oauthUrl) });
      entries.push({ name: `${apiKey}_scope`, value: toNone(authFields.scope) });
      entries.push({ name: `${apiKey}_key`, value: toNone(authFields.key) });
      entries.push({ name: `${apiKey}_secret`, value: toNone(authFields.secret) });
      entries.push({ name: `${apiKey}_granttype`, value: "password" });
      entries.push({ name: `${apiKey}_login`, value: toNone(authFields.login) });
      entries.push({ name: `${apiKey}_senha`, value: toNone(authFields.senha) });
      entries.push({ name: `${apiKey}_username`, value: "None" });
      entries.push({ name: `${apiKey}_password`, value: "None" });
      entries.push({ name: `${apiKey}_api_key`, value: "None" });
      break;

    case "TokenPassword": // Salesforce-like
      entries.push({ name: `${apiKey}_oauth`, value: toNone(authFields.oauthUrl) });
      entries.push({ name: `${apiKey}_scope`, value: toNone(authFields.scope) });
      entries.push({ name: `${apiKey}_key`, value: toNone(authFields.key) });
      entries.push({ name: `${apiKey}_secret`, value: toNone(authFields.secret) });
      entries.push({ name: `${apiKey}_granttype`, value: "password" });
      entries.push({ name: `${apiKey}_username`, value: toNone(authFields.username) });
      entries.push({ name: `${apiKey}_password`, value: toNone(authFields.password) });
      entries.push({ name: `${apiKey}_login`, value: "None" });
      entries.push({ name: `${apiKey}_senha`, value: "None" });
      entries.push({ name: `${apiKey}_api_key`, value: "None" });
      break;

    case "TokenFormUrlencoded": // semelhante ao Token, mas destacando content-type
      entries.push({ name: `${apiKey}_oauth`, value: toNone(authFields.oauthUrl) });
      entries.push({ name: `${apiKey}_scope`, value: toNone(authFields.scope) });
      entries.push({ name: `${apiKey}_key`, value: toNone(authFields.key) });
      entries.push({ name: `${apiKey}_secret`, value: toNone(authFields.secret) });
      entries.push({ name: `${apiKey}_granttype`, value: toNone(authFields.grantType || "client_credentials") });
      entries.push({ name: `${apiKey}_username`, value: "None" });
      entries.push({ name: `${apiKey}_password`, value: "None" });
      entries.push({ name: `${apiKey}_login`, value: "None" });
      entries.push({ name: `${apiKey}_senha`, value: "None" });
      entries.push({ name: `${apiKey}_api_key`, value: "None" });
      break;
  }

  return entries;
}

// ====== UI ======

const btnBase: React.CSSProperties = {
  borderRadius: 8, padding: "8px 12px", fontWeight: 600,
  border: "1px solid var(--border, #333)", cursor: "pointer", lineHeight: 1.1,
};
const btnPrimary: React.CSSProperties = { ...btnBase, background: "#facc15", color: "#111", borderColor: "#eab308" };
const btnDanger: React.CSSProperties = { ...btnBase, background: "#ef4444", color: "#fff", borderColor: "#dc2626" };
const btnNeutral: React.CSSProperties = { ...btnBase, background: "transparent", color: "var(--fg, #eee)" };

export default function WebhookListenerPage() {
  // org/env
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState("");
  const [envs, setEnvs] = useState<string[]>([]);
  const [env, setEnv] = useState("");

  // tenant info
  const [empresa, setEmpresa] = useState("");
  const [nomeExtenso, setNomeExtenso] = useState("");
  const [clientId, setClientId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");

  // base url + replicar
  const [baseUrl, setBaseUrl] = useState("");
  const [replicar, setReplicar] = useState(true);

  // seleção de APIs
  const [selectedApis, setSelectedApis] = useState<Record<string, boolean>>({});

  // auth
  const [authType, setAuthType] = useState<AuthType>("None");
  // campos dinâmicos
  const [oauthUrl, setOauthUrl] = useState("");
  const [scope, setScope] = useState("");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [grantType, setGrantType] = useState("client_credentials");
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");

  // estado
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  // carregar org/env
  useEffect(() => { fetch("/api/orgs").then(r=>r.json()).then(setOrgs).catch(()=>setOrgs([])); }, []);
  useEffect(() => {
    if (!org) { setEnv(""); setEnvs([]); return; }
    fetch(`/api/envs?org=${encodeURIComponent(org)}`).then(r=>r.json()).then(setEnvs).catch(()=>setEnvs([]));
  }, [org]);

  // UI helpers
  const apisList = useMemo(() => LISTENER_APIS, []);

  function toggleApi(k: string) {
    setSelectedApis(prev => ({ ...prev, [k]: !prev[k] }));
  }

  function validateForm(): string | null {
    if (!empresa.trim()) return "Empresa Cliente é obrigatório";
    if (!nomeExtenso.trim()) return "Nome extenso da empresa é obrigatório";
    if (!clientId.trim()) return "ClientID é obrigatório";
    if (!companyId.trim()) return "CompanyID é obrigatório";
    if (!responsavel.trim()) return "Responsável é obrigatório";
    if (!email.trim()) return "E-mail responsável é obrigatório";
    if (!org) return "Selecione a org";
    if (!env) return "Selecione o env";
    if (!baseUrl.trim()) return "Informe a URL Base";
    const anyApi = apisList.some(a => selectedApis[a.key]);
    if (!anyApi) return "Selecione ao menos uma API listener";
    // valida mínimos por tipo
    if (authType === "Basic" && (!key.trim() || !secret.trim())) return "Basic: informe Key e Secret";
    if (authType === "Api Key" && !apiKey.trim()) return "Api Key: informe x-api-key";
    if (authType === "Token") {
      if (!oauthUrl.trim() || !key.trim() || !secret.trim()) return "Token: oauthUrl, key e secret são obrigatórios";
    }
    if (authType === "TokenAPI") {
      if (!oauthUrl.trim() || !login.trim() || !senha.trim()) return "TokenAPI: oauthUrl, login e senha são obrigatórios";
      // key/secret opcionais
    }
    if (authType === "TokenPassword") {
      if (!oauthUrl.trim() || !username.trim() || !password.trim() || !key.trim() || !secret.trim())
        return "TokenPassword: oauthUrl, username, password, key e secret são obrigatórios";
    }
    if (authType === "TokenFormUrlencoded") {
      if (!oauthUrl.trim() || !key.trim() || !secret.trim()) return "TokenFormUrlencoded: oauthUrl, key, secret são obrigatórios";
    }
    return null;
  }

  async function createKvm() {
    const err = validateForm();
    if (err) { alert(err); return; }

    // Nome do KVM
    const kvmName = `listener-${companyId.trim()}`;

    // Campos de auth para reutilizar
    const authFields = {
      oauthUrl, scope, key, secret, grantType, apiKey, username, password, login, senha,
    };

    // Monta entries por API selecionada
    const entries: { name: string; value: string }[] = [];
    for (const api of apisList) {
      if (!selectedApis[api.key]) continue;
      entries.push(...buildKvmEntriesForApi(api.key, baseUrl.trim(), replicar, authType, authFields));
    }

    // Você pode incluir alguns metadados gerais do tenant no KVM (opcional):
    entries.push({ name: `tenant_empresa`, value: empresa.trim() });
    entries.push({ name: `tenant_nome_extenso`, value: nomeExtenso.trim() });
    entries.push({ name: `tenant_client_id`, value: clientId.trim() });
    entries.push({ name: `tenant_company_id`, value: companyId.trim() });
    entries.push({ name: `tenant_responsavel`, value: responsavel.trim() });
    entries.push({ name: `tenant_email`, value: email.trim() });

    const json = {
      keyValueEntries: entries.map(e => ({ name: e.name, value: e.value })),
      nextPageToken: ""
    };

    // Envia para /api/kvm/create (FormData)
    setCreating(true); setMsg("Criando KVM...");
    try {
      const fd = new FormData();
      fd.set("org", org);
      fd.set("env", env);
      fd.set("kvm", kvmName);
      fd.set("encrypted", "true");
      fd.set("json", JSON.stringify(json));

      const res = await fetch("/api/kvm/create", { method: "POST", body: fd });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.error || res.statusText);

      setMsg(`KVM ${kvmName} criado com sucesso!`);
      alert(`KVM ${kvmName} criado com sucesso!`);
    } catch (e:any) {
      const m = e?.message || String(e);
      setMsg("Falha: " + m);
      alert("Falha ao criar KVM: " + m);
    } finally {
      setCreating(false);
    }
  }

  // ====== UI ======
  return (
    <main>
      <h2>Webhook Listener — KVM padrão por tenant</h2>

      {/* Dados do tenant */}
      <section className="card" style={{display:'grid', gap:8, maxWidth:980, marginBottom:12}}>
        <h3 style={{margin:0}}>Dados do Cliente</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8}}>
          <label>Empresa Cliente*
            <input value={empresa} onChange={e=>setEmpresa(e.currentTarget.value)} />
          </label>
          <label>Nome extenso da empresa*
            <input value={nomeExtenso} onChange={e=>setNomeExtenso(e.currentTarget.value)} />
          </label>
          <label>ClientID*
            <input value={clientId} onChange={e=>setClientId(e.currentTarget.value)} />
          </label>
          <label>CompanyID*
            <input value={companyId} onChange={e=>setCompanyId(e.currentTarget.value)} />
          </label>
          <label>Responsável*
            <input value={responsavel} onChange={e=>setResponsavel(e.currentTarget.value)} />
          </label>
          <label>E-mail responsável*
            <input type="email" value={email} onChange={e=>setEmail(e.currentTarget.value)} />
          </label>
        </div>
      </section>

      {/* Org/Env */}
      <section className="card" style={{display:'grid', gap:8, maxWidth:980, marginBottom:12}}>
        <h3 style={{margin:0}}>Destino (org/env)</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8}}>
          <label>Org*
            <select value={org} onChange={e=>setOrg(e.currentTarget.value)}>
              <option value="">Selecione...</option>
              {orgs.map(o=>(<option key={o} value={o}>{o}</option>))}
            </select>
          </label>
          <label>Env*
            <select value={env} onChange={e=>setEnv(e.currentTarget.value)}>
              <option value="">Selecione...</option>
              {envs.map(x=>(<option key={x} value={x}>{x}</option>))}
            </select>
          </label>
          <div />
        </div>
      </section>

      {/* URL Base e replicação */}
      <section className="card" style={{display:'grid', gap:8, maxWidth:980, marginBottom:12}}>
        <h3 style={{margin:0}}>Endpoint base</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8}}>
          <label>URL Base*
            <input placeholder="https://cliente.com.br" value={baseUrl} onChange={e=>setBaseUrl(e.currentTarget.value)} />
          </label>
          <label style={{display:'flex', gap:8, alignItems:'center'}}>
            <input type="checkbox" checked={replicar} onChange={e=>setReplicar(e.currentTarget.checked)} />
            Replicar sufixo <code>/listener/{"{api}"}</code> automaticamente
          </label>
        </div>
        <small>Ex.: base + <code>/listener/productOrderStateChangeEvent</code> quando “replicar” estiver habilitado.</small>
      </section>

      {/* Seleção de APIs */}
      <section className="card" style={{display:'grid', gap:8, maxWidth:980, marginBottom:12}}>
        <h3 style={{margin:0}}>APIs listener</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:6}}>
          {apisList.map(a=>(
            <label key={a.key} style={{display:'flex', gap:8, alignItems:'center'}}>
              <input type="checkbox" checked={!!selectedApis[a.key]} onChange={()=>toggleApi(a.key)} />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Autenticação */}
      <section className="card" style={{display:'grid', gap:8, maxWidth:980, marginBottom:12}}>
        <h3 style={{margin:0}}>Credenciais para autenticação</h3>
        <label>Tipo
          <select value={authType} onChange={e=>setAuthType(e.currentTarget.value as AuthType)}>
            {["None","Basic","Api Key","Token","TokenAPI","TokenPassword","TokenFormUrlencoded"].map(t=>(
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        {/* Campos condicionais */}
        {authType === "Basic" && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8}}>
            <label>Key* <input value={key} onChange={e=>setKey(e.currentTarget.value)} /></label>
            <label>Secret* <input value={secret} onChange={e=>setSecret(e.currentTarget.value)} /></label>
          </div>
        )}

        {authType === "Api Key" && (
          <div style={{display:'grid', gridTemplateColumns:'1fr', gap:8}}>
            <label>x-api-key* <input value={apiKey} onChange={e=>setApiKey(e.currentTarget.value)} /></label>
          </div>
        )}

        {(authType === "Token" || authType === "TokenFormUrlencoded") && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8}}>
            <label>URL OAuth2* <input value={oauthUrl} onChange={e=>setOauthUrl(e.currentTarget.value)} placeholder="ex.: https://.../oauth/token" /></label>
            <label>scope <input value={scope} onChange={e=>setScope(e.currentTarget.value)} placeholder="None / oob / infraco..." /></label>
            <label>grant_type <input value={grantType} onChange={e=>setGrantType(e.currentTarget.value)} placeholder="client_credentials" /></label>
            <label>key* <input value={key} onChange={e=>setKey(e.currentTarget.value)} /></label>
            <label>secret* <input value={secret} onChange={e=>setSecret(e.currentTarget.value)} /></label>
          </div>
        )}

        {authType === "TokenAPI" && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8}}>
            <label>URL OAuth2* <input value={oauthUrl} onChange={e=>setOauthUrl(e.currentTarget.value)} /></label>
            <label>scope <input value={scope} onChange={e=>setScope(e.currentTarget.value)} placeholder="None / oob / infraco..." /></label>
            <label>key (opcional) <input value={key} onChange={e=>setKey(e.currentTarget.value)} /></label>
            <label>secret (opcional) <input value={secret} onChange={e=>setSecret(e.currentTarget.value)} /></label>
            <label>Login* <input value={login} onChange={e=>setLogin(e.currentTarget.value)} /></label>
            <label>Senha* <input value={senha} onChange={e=>setSenha(e.currentTarget.value)} /></label>
          </div>
        )}

        {authType === "TokenPassword" && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8}}>
            <label>URL OAuth2* <input value={oauthUrl} onChange={e=>setOauthUrl(e.currentTarget.value)} /></label>
            <label>scope* <input value={scope} onChange={e=>setScope(e.currentTarget.value)} /></label>
            <label>key* <input value={key} onChange={e=>setKey(e.currentTarget.value)} /></label>
            <label>secret* <input value={secret} onChange={e=>setSecret(e.currentTarget.value)} /></label>
            <label>username* <input value={username} onChange={e=>setUsername(e.currentTarget.value)} /></label>
            <label>password* <input value={password} onChange={e=>setPassword(e.currentTarget.value)} /></label>
          </div>
        )}
      </section>

      {/* Ação */}
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <button style={btnPrimary} onClick={createKvm} disabled={creating}>Criar KVM</button>
        <button style={btnNeutral} onClick={()=>{ /* reset leve */ setMsg(""); }} disabled={creating}>Limpar status</button>
        {msg && <small>{msg}</small>}
      </div>
    </main>
  );
}
