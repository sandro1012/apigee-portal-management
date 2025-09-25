"use client";

import React, { useEffect, useMemo, useState } from "react";

type AuthType =
  | "None"
  | "Basic"
  | "Api Key"
  | "Token"
  | "TokenAPI"
  | "TokenPassword"
  | "TokenFormUrlencoded";

type ListenerApi = { key: string; label: string };

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

// helpers
function sanitizeClientIdToUnderscore(s: string) {
  const noAccents = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return noAccents
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function joinUrl(base: string, path: string): string {
  const b = (base || "").replace(/\/+$/, "");
  const p = (path || "").replace(/^\/+/, "");
  if (!b) return path || "";
  if (!p) return b;
  return `${b}/${p}`;
}
function dash(v?: string) {
  return v && v.trim() ? v.trim() : "-";
}

// default fields
type AuthFields = {
  oauthUrl?: string;
  scope?: string;
  key?: string;
  secret?: string;
  grantType?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  login?: string;
  senha?: string;
};
function defaultAuthFields(): AuthFields {
  return {
    oauthUrl: "",
    scope: "",
    key: "",
    secret: "",
    grantType: "client_credentials",
    apiKey: "",
    username: "",
    password: "",
    login: "",
    senha: "",
  };
}

// por API
type PerApiConfig = {
  checked: boolean;
  authType: AuthType;
  fields: AuthFields;
};

type HistoryItem = {
  ts: string;
  org: string;
  env: string;
  kvmName: string;
  wo: string;
  baseUrl: string;
  replicate: boolean;
  apis: { key: string; authType: AuthType }[];
};
const HISTORY_KEY = "webhookListenerHistory";
const HISTORY_MAX = 20;

export default function WebhookListenerPage() {
  // org/env
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState("");
  const [envs, setEnvs] = useState<string[]>([]);
  const [env, setEnv] = useState("");

  // dados cliente (histórico)
  const [empresa, setEmpresa] = useState("");
  const [nomeExtenso, setNomeExtenso] = useState("");
  const [clientId, setClientId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [wo, setWo] = useState("");

  // url base / replicar
  const [baseUrl, setBaseUrl] = useState("");
  const [replicar, setReplicar] = useState(true);

  // modelo global
  const [defaultAuthType, setDefaultAuthType] = useState<AuthType>("None");
  const [defaultFields, setDefaultFields] = useState<AuthFields>(defaultAuthFields());

  // por API
  const [apisState, setApisState] = useState<Record<string, PerApiConfig>>({});

  // criação / status
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  // histórico
  const [history, setHistory] = useState<HistoryItem[]>([]);
  useEffect(() => {
    fetch("/api/orgs").then(r => r.json()).then(setOrgs).catch(() => setOrgs([]));
  }, []);
  useEffect(() => {
    if (!org) { setEnv(""); setEnvs([]); return; }
    fetch(`/api/envs?org=${encodeURIComponent(org)}`).then(r => r.json()).then(setEnvs).catch(() => setEnvs([]));
  }, [org]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []);
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

  // inicializa estado por API
  const apisList = useMemo(() => LISTENER_APIS, []);
  useEffect(() => {
    setApisState(prev => {
      const next = { ...prev };
      for (const a of apisList) {
        if (!next[a.key]) next[a.key] = { checked: false, authType: defaultAuthType, fields: defaultAuthFields() };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apisList.length]);

  // mutadores
  function initApiStateIfNeeded(k: string) {
    setApisState(prev => prev[k] ? prev : ({ ...prev, [k]: { checked: false, authType: defaultAuthType, fields: defaultAuthFields() } }));
  }
  function toggleApi(k: string) {
    setApisState(prev => {
      const cur = prev[k] || { checked: false, authType: defaultAuthType, fields: defaultAuthFields() };
      return { ...prev, [k]: { ...cur, checked: !cur.checked } };
    });
  }
  function setApiAuthType(k: string, t: AuthType) {
    setApisState(prev => {
      const cur = prev[k] || { checked: false, authType: defaultAuthType, fields: defaultAuthFields() };
      return { ...prev, [k]: { ...cur, authType: t } };
    });
  }
  function setApiField(k: string, f: keyof AuthFields, v: string) {
    setApisState(prev => {
      const cur = prev[k] || { checked: false, authType: defaultAuthType, fields: defaultAuthFields() };
      return { ...prev, [k]: { ...cur, fields: { ...cur.fields, [f]: v } } };
    });
  }

  // validação
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
    if (!Object.values(apisState).some(a => a.checked)) return "Selecione ao menos uma API listener";

    // mínimos por API
    for (const [k, cfg] of Object.entries(apisState)) {
      if (!cfg.checked) continue;
      const F = (x: keyof AuthFields) => cfg.fields[x] || defaultFields[x] || "";
      switch (cfg.authType) {
        case "Basic":
          if (!F("key") || !F("secret")) return `API ${k}: Basic requer key + secret`;
          break;
        case "Api Key":
          if (!F("apiKey")) return `API ${k}: Api Key requer x-api-key`;
          break;
        case "Token":
        case "TokenFormUrlencoded":
          if (!F("oauthUrl") || !F("key") || !F("secret")) return `API ${k}: ${cfg.authType} requer oauthUrl + key + secret`;
          break;
        case "TokenAPI":
          if (!F("oauthUrl") || !F("login") || !F("senha")) return `API ${k}: TokenAPI requer oauthUrl + login + senha`;
          break;
        case "TokenPassword":
          if (!F("oauthUrl") || !F("username") || !F("password") || !F("key") || !F("secret"))
            return `API ${k}: TokenPassword requer oauthUrl + username + password + key + secret`;
          break;
      }
    }
    return null;
  }

  // serialização NOVO MODELO (13 campos)
  function valueArrayForApi(
    apiKey: string,
    base: string,
    replicate: boolean,
    auth: AuthType,
    fields: AuthFields,
    fallback?: { authType?: AuthType; fields?: AuthFields }
  ): string[] {
    // path sem -v2
    const apiPathName = apiKey.replace(/-v2$/, "");
    const path_url = replicate ? `/listener/${apiPathName}` : "-";
    const url_base = dash(base);

    const F = (k: keyof AuthFields) => {
      const v = fields[k] ?? "";
      if (v && String(v).trim()) return String(v).trim();
      const fb = fallback?.fields?.[k] ?? "";
      if (fb && String(fb).trim()) return String(fb).trim();
      return "";
    };

    // todos começam com url_base, path_url e type
    let url_token = "-";
    let granttype = "-";
    let scope = "-";
    let key = "-";
    let secret = "-";
    let login = "-";
    let senha = "-";
    let username = "-";
    let password = "-";
    let api_key = "-";

    switch (auth) {
      case "None":
        // tudo '-' mesmo
        break;
      case "Basic":
        key = dash(F("key"));
        secret = dash(F("secret"));
        break;
      case "Api Key":
        api_key = dash(F("apiKey"));
        break;
      case "Token":
        url_token = dash(F("oauthUrl"));
        granttype = dash(F("grantType") || "client_credentials");
        scope = dash(F("scope"));
        key = dash(F("key"));
        secret = dash(F("secret"));
        break;
      case "TokenFormUrlencoded":
        url_token = dash(F("oauthUrl"));
        granttype = dash(F("grantType") || "client_credentials");
        scope = dash(F("scope"));
        key = dash(F("key"));
        secret = dash(F("secret"));
        break;
      case "TokenAPI":
        url_token = dash(F("oauthUrl"));
        granttype = "password";
        scope = dash(F("scope"));
        key = dash(F("key") || "-");
        secret = dash(F("secret") || "-");
        login = dash(F("login"));
        senha = dash(F("senha"));
        break;
      case "TokenPassword":
        url_token = dash(F("oauthUrl"));
        granttype = "password";
        scope = dash(F("scope"));
        key = dash(F("key"));
        secret = dash(F("secret"));
        username = dash(F("username"));
        password = dash(F("password"));
        break;
    }

    return [
      url_base,        // 1
      path_url,        // 2
      auth,            // 3 (type)
      url_token,       // 4
      granttype,       // 5
      scope,           // 6
      key,             // 7
      secret,          // 8
      login,           // 9
      senha,           // 10
      username,        // 11
      password,        // 12
      api_key          // 13
    ];
  }

  async function createKvm() {
    const err = validateForm();
    if (err) { alert(err); return; }

    const safeId = sanitizeClientIdToUnderscore(clientId);
    const kvmName = `cw-${safeId}_webhook`;

    // monta a legenda + linhas das APIs selecionadas
    const entries: { name: string; value: string }[] = [];

    // legenda (com espaços, conforme especificação)
    entries.push({
      name: "00-Legenda",
      value:
        "url_base | path_url | type | url_token | granttype | scope | key | secret | login | senha | username | password | api_key",
    });

    const picked: { key: string; authType: AuthType }[] = [];
    for (const a of LISTENER_APIS) {
      const cfg = apisState[a.key];
      if (!cfg?.checked) continue;
      picked.push({ key: a.key, authType: cfg.authType });

      const parts = valueArrayForApi(
        a.key,
        baseUrl.trim(),
        replicar,
        cfg.authType,
        cfg.fields,
        { authType: defaultAuthType, fields: defaultFields }
      );

      entries.push({
        name: a.key,
        value: parts.join("|"),
      });
    }

    const json = { keyValueEntries: entries, nextPageToken: "" };

    setCreating(true); setMsg("Criando KVM...");
    try {
      const fd = new FormData();
      fd.set("org", org);
      fd.set("env", env);
      fd.set("kvm", kvmName);
      fd.set("encrypted", "true");
      fd.set("json", JSON.stringify(json));

      const res = await fetch("/api/kvm/create", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || res.statusText);

      setMsg(`KVM ${kvmName} criado com sucesso!`);
      alert(`KVM ${kvmName} criado com sucesso!`);

      // histórico
      pushHistory({
        ts: new Date().toISOString(),
        org,
        env,
        kvmName,
        wo: wo.trim(),
        baseUrl: baseUrl.trim(),
        replicate: replicar,
        apis: picked,
      });
    } catch (e: any) {
      setMsg("Falha: " + (e?.message || String(e)));
      alert("Falha ao criar KVM: " + (e?.message || String(e)));
    } finally {
      setCreating(false);
    }
  }

  // ====== UI ======
  return (
    <main>
      <h2>Webhook Listener — KVM compacto por tenant</h2>

      {/* Dados do cliente (histórico apenas) */}
      <section className="card" style={{ display: "grid", gap: 8, maxWidth: 980, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Dados do Cliente (somente registro na página)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          <label>Empresa Cliente* <input value={empresa} onChange={e => setEmpresa(e.currentTarget.value)} /></label>
          <label>Nome extenso da empresa* <input value={nomeExtenso} onChange={e => setNomeExtenso(e.currentTarget.value)} /></label>
          <label>ClientID* <small style={{ opacity: .7 }}>KVM = cw-ClientID_webhook</small>
            <input value={clientId} onChange={e => setClientId(e.currentTarget.value)} />
          </label>
          <label>CompanyID* <input value={companyId} onChange={e => setCompanyId(e.currentTarget.value)} /></label>
          <label>Responsável* <input value={responsavel} onChange={e => setResponsavel(e.currentTarget.value)} /></label>
          <label>E-mail responsável* <input type="email" value={email} onChange={e => setEmail(e.currentTarget.value)} /></label>
          <label>WO (Work Order)* <input value={wo} onChange={e => setWo(e.currentTarget.value)} placeholder="ex.: WO-12345" /></label>
        </div>
        <small style={{ opacity: .8 }}>Esses dados não vão para o Apigee — ficam no histórico abaixo.</small>
      </section>

      {/* Org/Env */}
      <section className="card" style={{ display: "grid", gap: 8, maxWidth: 980, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Destino (org/env)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          <label>Org*
            <select value={org} onChange={e => setOrg(e.currentTarget.value)}>
              <option value="">Selecione...</option>
              {orgs.map(o => (<option key={o} value={o}>{o}</option>))}
            </select>
          </label>
          <label>Env*
            <select value={env} onChange={e => setEnv(e.currentTarget.value)}>
              <option value="">Selecione...</option>
              {envs.map(x => (<option key={x} value={x}>{x}</option>))}
            </select>
          </label>
          <div />
        </div>
      </section>

      {/* Base URL */}
      <section className="card" style={{ display: "grid", gap: 8, maxWidth: 980, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Endpoint base</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          <label>URL Base* <input placeholder="https://cliente.com.br" value={baseUrl} onChange={e => setBaseUrl(e.currentTarget.value)} /></label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={replicar} onChange={e => setReplicar(e.currentTarget.checked)} />
            Replicar sufixo <code>/listener/{"{api}"}</code> (remove <code>-v2</code> no path)
          </label>
        </div>
      </section>

      {/* Modelo global */}
      <section className="card" style={{ display: "grid", gap: 8, maxWidth: 980, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Modelo global de autenticação (opcional)</h3>
        <label>Tipo (default)
          <select value={defaultAuthType} onChange={e => setDefaultAuthType(e.currentTarget.value as AuthType)}>
            {["None","Basic","Api Key","Token","TokenAPI","TokenPassword","TokenFormUrlencoded"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <GlobalAuthFields
          defaultAuthType={defaultAuthType}
          defaultFields={defaultFields}
          setDefaultFields={setDefaultFields}
        />
        <small>Usado como <b>fallback</b> quando a API não tiver valores próprios.</small>
      </section>

      {/* Seleção de APIs */}
      <ApisTable
        apis={LISTENER_APIS}
        apisState={apisState}
        defaultAuthType={defaultAuthType}
        setApiAuthType={setApiAuthType}
        setApiField={setApiField}
        toggleApi={toggleApi}
        initApiStateIfNeeded={initApiStateIfNeeded}
      />

      {/* Ações */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <button onClick={createKvm} disabled={creating} style={{ borderRadius: 8, padding: "8px 12px", fontWeight: 600, border: "1px solid var(--border,#333)", background: "#facc15", color: "#111" }}>
          Criar KVM
        </button>
        {msg && <small>{msg}</small>}
      </div>

      {/* Histórico */}
      <HistoryTable history={history} onClear={clearHistory} />
    </main>
  );
}

// ===== UI subcomponents =====
function GlobalAuthFields({
  defaultAuthType,
  defaultFields,
  setDefaultFields,
}: {
  defaultAuthType: AuthType;
  defaultFields: AuthFields;
  setDefaultFields: (f: AuthFields) => void;
}) {
  if (defaultAuthType === "None") {
    return <small style={{ opacity: .8 }}>Sem credenciais (campos ficam “-” no KVM).</small>;
  }
  if (defaultAuthType === "Basic") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        <label>key* <input value={defaultFields.key} onChange={e => setDefaultFields({ ...defaultFields, key: e.currentTarget.value })} /></label>
        <label>secret* <input value={defaultFields.secret} onChange={e => setDefaultFields({ ...defaultFields, secret: e.currentTarget.value })} /></label>
      </div>
    );
  }
  if (defaultAuthType === "Api Key") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        <label>x-api-key* <input value={defaultFields.apiKey} onChange={e => setDefaultFields({ ...defaultFields, apiKey: e.currentTarget.value })} /></label>
      </div>
    );
  }
  if (defaultAuthType === "Token") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        <label>url_token* <input value={defaultFields.oauthUrl} onChange={e => setDefaultFields({ ...defaultFields, oauthUrl: e.currentTarget.value })} /></label>
        <label>grant_type <input value={defaultFields.grantType} onChange={e => setDefaultFields({ ...defaultFields, grantType: e.currentTarget.value })} /></label>
        <label>scope <input value={defaultFields.scope} onChange={e => setDefaultFields({ ...defaultFields, scope: e.currentTarget.value })} /></label>
        <label>key* <input value={defaultFields.key} onChange={e => setDefaultFields({ ...defaultFields, key: e.currentTarget.value })} /></label>
        <label>secret* <input value={defaultFields.secret} onChange={e => setDefaultFields({ ...defaultFields, secret: e.currentTarget.value })} /></label>
      </div>
    );
  }
  if (defaultAuthType === "TokenFormUrlencoded") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        <label>url_token* <input value={defaultFields.oauthUrl} onChange={e => setDefaultFields({ ...defaultFields, oauthUrl: e.currentTarget.value })} /></label>
        <label>grant_type <input value={defaultFields.grantType} onChange={e => setDefaultFields({ ...defaultFields, grantType: e.currentTarget.value })} /></label>
        <label>scope <input value={defaultFields.scope} onChange={e => setDefaultFields({ ...defaultFields, scope: e.currentTarget.value })} /></label>
        <label>key* <input value={defaultFields.key} onChange={e => setDefaultFields({ ...defaultFields, key: e.currentTarget.value })} /></label>
        <label>secret* <input value={defaultFields.secret} onChange={e => setDefaultFields({ ...defaultFields, secret: e.currentTarget.value })} /></label>
      </div>
    );
  }
  if (defaultAuthType === "TokenAPI") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        <label>url_token* <input value={defaultFields.oauthUrl} onChange={e => setDefaultFields({ ...defaultFields, oauthUrl: e.currentTarget.value })} /></label>
        <label>scope <input value={defaultFields.scope} onChange={e => setDefaultFields({ ...defaultFields, scope: e.currentTarget.value })} /></label>
        <label>login* <input value={defaultFields.login} onChange={e => setDefaultFields({ ...defaultFields, login: e.currentTarget.value })} /></label>
        <label>senha* <input value={defaultFields.senha} onChange={e => setDefaultFields({ ...defaultFields, senha: e.currentTarget.value })} /></label>
        <label>key (opcional) <input value={defaultFields.key} onChange={e => setDefaultFields({ ...defaultFields, key: e.currentTarget.value })} /></label>
        <label>secret (opcional) <input value={defaultFields.secret} onChange={e => setDefaultFields({ ...defaultFields, secret: e.currentTarget.value })} /></label>
      </div>
    );
  }
  if (defaultAuthType === "TokenPassword") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        <label>url_token* <input value={defaultFields.oauthUrl} onChange={e => setDefaultFields({ ...defaultFields, oauthUrl: e.currentTarget.value })} /></label>
        <label>scope* <input value={defaultFields.scope} onChange={e => setDefaultFields({ ...defaultFields, scope: e.currentTarget.value })} /></label>
        <label>key* <input value={defaultFields.key} onChange={e => setDefaultFields({ ...defaultFields, key: e.currentTarget.value })} /></label>
        <label>secret* <input value={defaultFields.secret} onChange={e => setDefaultFields({ ...defaultFields, secret: e.currentTarget.value })} /></label>
        <label>username* <input value={defaultFields.username} onChange={e => setDefaultFields({ ...defaultFields, username: e.currentTarget.value })} /></label>
        <label>password* <input value={defaultFields.password} onChange={e => setDefaultFields({ ...defaultFields, password: e.currentTarget.value })} /></label>
      </div>
    );
  }
  return null;
}

function ApisTable({
  apis,
  apisState,
  defaultAuthType,
  setApiAuthType,
  setApiField,
  toggleApi,
  initApiStateIfNeeded,
}: {
  apis: ListenerApi[];
  apisState: Record<string, PerApiConfig>;
  defaultAuthType: AuthType;
  setApiAuthType: (k: string, t: AuthType) => void;
  setApiField: (k: string, f: keyof AuthFields, v: string) => void;
  toggleApi: (k: string) => void;
  initApiStateIfNeeded: (k: string) => void;
}) {
  return (
    <section className="card" style={{ display: "grid", gap: 10, maxWidth: 1100, marginBottom: 12 }}>
      <h3 style={{ margin: 0 }}>APIs listener</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px" }}>Selecionar</th>
              <th style={{ textAlign: "left", padding: "6px" }}>API</th>
              <th style={{ textAlign: "left", padding: "6px" }}>Auth type</th>
              <th style={{ textAlign: "left", padding: "6px" }}>Campos por API</th>
            </tr>
          </thead>
          <tbody>
            {apis.map(a => {
              const s = apisState[a.key] || { checked: false, authType: defaultAuthType, fields: defaultAuthFields() };
              return (
                <tr key={a.key} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px" }}>
                    <input
                      type="checkbox"
                      checked={!!s.checked}
                      onChange={() => { initApiStateIfNeeded(a.key); toggleApi(a.key); }}
                    />
                  </td>
                  <td style={{ padding: "6px" }}>{a.label}</td>
                  <td style={{ padding: "6px" }}>
                    <select
                      value={s.authType}
                      onChange={e => setApiAuthType(a.key, e.currentTarget.value as AuthType)}
                      disabled={!s.checked}
                    >
                      {["None","Basic","Api Key","Token","TokenAPI","TokenPassword","TokenFormUrlencoded"].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "6px" }}>
                    {s.checked && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
                        {s.authType === "Basic" && (
                          <>
                            <input placeholder="key*" value={s.fields.key || ""} onChange={e => setApiField(a.key, "key", e.currentTarget.value)} />
                            <input placeholder="secret*" value={s.fields.secret || ""} onChange={e => setApiField(a.key, "secret", e.currentTarget.value)} />
                          </>
                        )}
                        {s.authType === "Api Key" && (
                          <input placeholder="x-api-key*" value={s.fields.apiKey || ""} onChange={e => setApiField(a.key, "apiKey", e.currentTarget.value)} />
                        )}
                        {(s.authType === "Token" || s.authType === "TokenFormUrlencoded") && (
                          <>
                            <input placeholder="url_token*" value={s.fields.oauthUrl || ""} onChange={e => setApiField(a.key, "oauthUrl", e.currentTarget.value)} />
                            <input placeholder="grant_type (client_credentials)" value={s.fields.grantType || ""} onChange={e => setApiField(a.key, "grantType", e.currentTarget.value)} />
                            <input placeholder="scope (ex.: oob / None)" value={s.fields.scope || ""} onChange={e => setApiField(a.key, "scope", e.currentTarget.value)} />
                            <input placeholder="key*" value={s.fields.key || ""} onChange={e => setApiField(a.key, "key", e.currentTarget.value)} />
                            <input placeholder="secret*" value={s.fields.secret || ""} onChange={e => setApiField(a.key, "secret", e.currentTarget.value)} />
                          </>
                        )}
                        {s.authType === "TokenAPI" && (
                          <>
                            <input placeholder="url_token*" value={s.fields.oauthUrl || ""} onChange={e => setApiField(a.key, "oauthUrl", e.currentTarget.value)} />
                            <input placeholder="scope (opcional/None)" value={s.fields.scope || ""} onChange={e => setApiField(a.key, "scope", e.currentTarget.value)} />
                            <input placeholder="login*" value={s.fields.login || ""} onChange={e => setApiField(a.key, "login", e.currentTarget.value)} />
                            <input placeholder="senha*" value={s.fields.senha || ""} onChange={e => setApiField(a.key, "senha", e.currentTarget.value)} />
                            <input placeholder="key (opcional)" value={s.fields.key || ""} onChange={e => setApiField(a.key, "key", e.currentTarget.value)} />
                            <input placeholder="secret (opcional)" value={s.fields.secret || ""} onChange={e => setApiField(a.key, "secret", e.currentTarget.value)} />
                          </>
                        )}
                        {s.authType === "TokenPassword" && (
                          <>
                            <input placeholder="url_token*" value={s.fields.oauthUrl || ""} onChange={e => setApiField(a.key, "oauthUrl", e.currentTarget.value)} />
                            <input placeholder="scope*" value={s.fields.scope || ""} onChange={e => setApiField(a.key, "scope", e.currentTarget.value)} />
                            <input placeholder="key*" value={s.fields.key || ""} onChange={e => setApiField(a.key, "key", e.currentTarget.value)} />
                            <input placeholder="secret*" value={s.fields.secret || ""} onChange={e => setApiField(a.key, "secret", e.currentTarget.value)} />
                            <input placeholder="username*" value={s.fields.username || ""} onChange={e => setApiField(a.key, "username", e.currentTarget.value)} />
                            <input placeholder="password*" value={s.fields.password || ""} onChange={e => setApiField(a.key, "password", e.currentTarget.value)} />
                          </>
                        )}
                        {s.authType === "None" && <span style={{ opacity: .7 }}>Sem credenciais</span>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HistoryTable({ history, onClear }: { history: any[]; onClear: () => void }) {
  return (
    <section className="card" style={{ display: "grid", gap: 8, maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Últimos KVMs criados</h3>
        <button onClick={onClear} style={{ borderRadius: 8, padding: "6px 10px", border: "1px solid var(--border,#333)", background: "transparent", color: "var(--fg,#eee)" }}>
          Limpar histórico
        </button>
      </div>
      {history.length === 0 ? (
        <div style={{ opacity: .8 }}>Nenhum registro ainda.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px" }}>Data</th>
                <th style={{ textAlign: "left", padding: "6px" }}>WO</th>
                <th style={{ textAlign: "left", padding: "6px" }}>Org/Env</th>
                <th style={{ textAlign: "left", padding: "6px" }}>KVM</th>
                <th style={{ textAlign: "left", padding: "6px" }}>Base URL</th>
                <th style={{ textAlign: "left", padding: "6px" }}>Replicar</th>
                <th style={{ textAlign: "left", padding: "6px" }}>APIs (auth)</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px" }}>{new Date(h.ts).toLocaleString()}</td>
                  <td style={{ padding: "6px", fontFamily: "monospace" }}>{h.wo}</td>
                  <td style={{ padding: "6px" }}>{h.org} / {h.env}</td>
                  <td style={{ padding: "6px", fontFamily: "monospace" }}>{h.kvmName}</td>
                  <td style={{ padding: "6px" }}>{h.baseUrl}</td>
                  <td style={{ padding: "6px" }}>{h.replicate ? "sim" : "não"}</td>
                  <td style={{ padding: "6px" }}>
                    {h.apis.map((a: any) => `${a.key} (${a.authType})`).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
