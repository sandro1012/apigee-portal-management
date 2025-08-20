import { GoogleAuth } from "google-auth-library";

export async function gcpAccessToken(scopes: string[] = ["https://www.googleapis.com/auth/cloud-platform"]) {
  const saB64 = process.env.GCP_SA_JSON_BASE64;
  if (!saB64) throw new Error("GCP_SA_JSON_BASE64 não configurado (ou forneça um token do usuário)");
  const creds = JSON.parse(Buffer.from(saB64, "base64").toString("utf8"));
  const auth = new GoogleAuth({ credentials: creds, scopes });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Falha ao obter access token GCP");
  return token;
}

// escolhe o bearer na ordem: cookie/env -> SA
export async function ensureBearer(bearerFromRequest?: string) {
  if (bearerFromRequest) return bearerFromRequest;               // cookie do usuário (UI)
  if (process.env.GCP_USER_TOKEN) return process.env.GCP_USER_TOKEN; // env var (expira ~1h)
  return await gcpAccessToken();                                  // SA (se configurada)
}

type KvmEntry = { name: string; value: any };
type KvmPage = { keyValueEntries?: KvmEntry[]; nextPageToken?: string } | any;

export async function listKvms(org: string, env: string, bearer?: string): Promise<string[]> {
  const token = await ensureBearer(bearer);
  const base = process.env.APIGEE_BASE || "https://apigee.googleapis.com";
  const url = `${base}/v1/organizations/${org}/environments/${env}/keyvaluemaps`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
  if (!res.ok) { const body = await res.text(); throw new Error(`Apigee listKvms ${res.status} – ${body}`); }
  const data = await res.json();
  if (Array.isArray(data)) return data.map(String);
  if (Array.isArray(data.keyvaluemaps)) {
    return data.keyvaluemaps.map((v: any) => typeof v === "string" ? v : v.name).filter(Boolean);
  }
  return Object.values(data).flat().map((v: any) => typeof v === "string" ? v : v?.name).filter(Boolean);
}

export async function exportKvm(org: string, env: string, map: string, bearer?: string) {
  const token = await ensureBearer(bearer);
  const base = process.env.APIGEE_BASE || "https://apigee.googleapis.com";
  const pageSize = 100;
  let next = "";
  const all: KvmEntry[] = [];
  do {
    const u = new URL(`${base}/v1/organizations/${org}/environments/${env}/keyvaluemaps/${map}/entries`);
    u.searchParams.set("pageSize", String(pageSize));
    if (next) u.searchParams.set("pageToken", next);
    const res = await fetch(u.toString(), { headers: { Authorization: `Bearer ${token}` }});
    if (!res.ok) { const body = await res.text(); throw new Error(`Apigee exportKvm ${res.status} – ${body}`); }
    const data = await res.json() as KvmPage;
    if (Array.isArray(data?.keyValueEntries)) all.push(...data.keyValueEntries);
    next = data?.nextPageToken || "";
  } while (next);
  const byName = new Map<string, KvmEntry>();
  for (const e of all) byName.set(e.name, e);
  return { keyValueEntries: [...byName.values()].sort((a,b)=>a.name.localeCompare(b.name)), nextPageToken: "" };
}

export function diffKvm(a: {keyValueEntries: KvmEntry[]}, b: {keyValueEntries: KvmEntry[]}) {
  const A = new Map(a.keyValueEntries.map(e=>[e.name, e.value]));
  const B = new Map(b.keyValueEntries.map(e=>[e.name, e.value]));
  const keysA = new Set(A.keys()), keysB = new Set(B.keys());
  const add = [...keysB].filter(k => !keysA.has(k));
  const del = [...keysA].filter(k => !keysB.has(k));
  const chg = [...new Set([...keysA, ...keysB])]
    .filter(k => A.get(k) != B.get(k))
    .map(name => ({ name, from: A.get(name), to: B.get(name) }));
  return { add, del, chg };
}
