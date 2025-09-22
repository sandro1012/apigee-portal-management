"use client";

import React, { useEffect, useMemo, useState } from "react";

// ====== Modelos ======
type AuthType = "None" | "Basic" | "Api Key" | "Token" | "TokenAPI" | "TokenPassword" | "TokenFormUrlencoded";

type ListenerApi = {
  key: string; // ex: "productOrderStateChangeEvent"
  label: string;
};

// Lista base de APIs listener (v2 com hífen)
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
  { key: "serviceTestResultEvent-v2", label: "serviceTestResultEvent-v2" },
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
// mantém hífens e letras; troca espaços por hífen
function sanitizeKvmFragment(s: string) {
  return s.trim().replace(/\s+/g, "-");
}

// Gera pares { name, value } no padrão do seu KVM para UMA API
function buildKvmEntriesForApi(
  apiKey: string,
  baseWebhook: string,
  replicate: boolean,
  auth: AuthType,
  authFields: Record<string, string>
) {
  const entries: { name: string; value: string }[] = [];

  // webhook
  const webhook = replicate ? joinUrl(baseWebhook, `/listener/${apiKey}`) : baseWebhook;
  entries.push({ name: `${apiKey}_webhook`, value: webhook });

  // type
  entries.push({ name: `${apiKey}_type`, value: auth });

  // Por tipo de autenticação, gerar os demais campos
  switch (auth) {
    case "None":
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

    case "TokenFormUrlencoded":
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
const btnNeutral: React.CSSProperties = { ...btnBase, background: "transparent", color: "var(--fg, #eee)" };

type HistoryItem = {
  ts: string;         // ISO
  org: string;
  env: string;
  kvmName: string;
  wo: string;
  authType: AuthType;
  baseUrl: string;
  replicate: boolean;
  apis: string[];
};

const HISTORY_KEY = "webhookListenerHistory";
const HISTORY_MAX = 20;

export default function WebhookListenerPage() {
  // org/env
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState("");
  const [envs, setEnvs] = useState<string[]>([]);
  const [env, setEnv] = useState("");

  // tenant info (somente relatório em tela)
  const [empresa, setEmpresa] = useState("");
  const [nomeExtenso, setNomeExtenso] = useState("");
  const [clientId, setClientId] = useState(""); // vira o nome do KVM
  const [companyId, setCompanyId] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [wo, setWo] = useState(""); // número da WO

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

  // histórico
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // carregar org/env
  useEffect(() => { fetch("/api/orgs").then(r=>r.json()).then(setOrgs).catch(()=>setOrgs([])); }, []);
  useEffect(() => {
    if (!org) { setEnv(""); setEnvs([]); return; }
    fetch(`/api/envs?org=${encodeURIComponent(org)}`).then(r=>r.json()).then(setEnvs).catch(()=>setEnvs([]));
  }, [org]);

  // carregar/salvar histórico no localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as HistoryItem[];
        setHistory(Array.isArray(arr) ? arr : []);
      }
    } catch {}
  }, []);
  function pushHistory(item: HistoryItem) {
    try {
      const next = [item, ...history].slice(0, HISTORY_MAX);
      setHistory(next);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  }
  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  }

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
    if (!wo.trim()) return "Informe o número da WO";
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

    // Nome do KVM = cw-{ClientID}-webhook
    const kvmName = `cw-${sanitizeKvmFragment(clientId)}-webhook`;

    // Campos de auth para reutilizar
    const authFields = {
      oauthUrl, scope, key, secret, grantType, apiKey, username, password, login, senha,
    };

    // Monta entries por API selecionada
    const entries: { name: string; value: string }[] = [];
    const pickedApis: string[] = [];
    for (const api of apisList) {
      if (!selectedApis[api.key]) continue;
      pickedApis.push(api.key);
      entries.push(...buildKvmEntriesForApi(api.key, baseUrl.trim(), replicar, authType, authFields));
    }

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

      // registra no histórico (em tela + localStorage)
      pushHistory({
        ts: new Date().toISOString(),
        org,
        env,
        kvmName,
        wo: wo.trim(),
        authType,
        baseUrl: baseUrl.trim(),
        replicate: replicar,
        apis: pickedApis,
      });
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

      {/* Dados do cliente (somente para consulta; NÃO entram no KVM) */}
      <section className="card" style={{display:'grid', gap:8, maxWidth:980, marginBottom:12}}>
        <h3 style={{margin:0}}>Dados do Cliente (somente para registro)</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8}}>
          <label>Empresa Cliente*
            <input value={empresa} onChange={e=>setEmpresa(e.currentTarget.value)} />
          </label>
          <label>Nome extenso da empresa*
            <input value={nomeExtenso} onChange={e=>setNomeExtenso(e.currentTarget.value)} />
          </label>
          <label>ClientID* <small style={{opacity:.7}}>KVM = cw-ClientID-webhook</small>
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
          <label>WO (Work Order)*
            <input value={wo} onChange={e=>setWo(e.currentTarget.value)} placeholder="ex.: WO-12345" />
          </label>
        </div>
        <small style={{opacity:.8}}>
          Esses dados <b>não</b> são gravados no Apigee, apenas exibidos no histórico abaixo.
        </small>
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

      {/* Ações */}
      <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:16}}>
        <button style={btnPrimary} onClick={createKvm} disabled={creating}>Criar KVM</button>
        {msg && <small>{msg}</small>}
      </div>

      {/* Histórico em tela */}
      <section className="card" style={{display:'grid', gap:8, maxWidth:1100}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h3 style={{margin:0}}>Últimos KVMs criados</h3>
          <button style={btnNeutral} onClick={clearHistory}>Limpar histórico</button>
        </div>
        {history.length === 0 ? (
          <div style={{opacity:.8}}>Nenhum registro ainda.</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', minWidth:900}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left', padding:'6px'}}>Data</th>
                  <th style={{textAlign:'left', padding:'6px'}}>WO</th>
                  <th style={{textAlign:'left', padding:'6px'}}>Org/Env</th>
                  <th style={{textAlign:'left', padding:'6px'}}>KVM</th>
                  <th style={{textAlign:'left', padding:'6px'}}>Auth</th>
                  <th style={{textAlign:'left', padding:'6px'}}>Base URL</th>
                  <th style={{textAlign:'left', padding:'6px'}}>Replicar</th>
                  <th style={{textAlign:'left', padding:'6px'}}>APIs</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i)=>(
                  <tr key={i} style={{borderTop:'1px solid var(--border)'}}>
                    <td style={{padding:'6px'}}>{new Date(h.ts).toLocaleString()}</td>
                    <td style={{padding:'6px', fontFamily:'monospace'}}>{h.wo}</td>
                    <td style={{padding:'6px'}}>{h.org} / {h.env}</td>
                    <td style={{padding:'6px', fontFamily:'monospace'}}>{h.kvmName}</td>
                    <td style={{padding:'6px'}}>{h.authType}</td>
                    <td style={{padding:'6px'}}>{h.baseUrl}</td>
                    <td style={{padding:'6px'}}>{h.replicate ? "sim" : "não"}</td>
                    <td style={{padding:'6px'}}>{h.apis.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
