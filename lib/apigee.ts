
import { GoogleAuth } from "google-auth-library";

export async function gcpAccessToken(scopes: string[] = ["https://www.googleapis.com/auth/cloud-platform"]) {
  const saB64 = process.env.GCP_SA_JSON_BASE64;
  if (!saB64) throw new Error("GCP_SA_JSON_BASE64 não configurado");
  const creds = JSON.parse(Buffer.from(saB64, "base64").toString("utf8"));
  const auth = new GoogleAuth({ credentials: creds, scopes });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Falha ao obter access token GCP");
  return token;
}

export async function ensureBearer(bearerFromRequest?: string) {
  if (bearerFromRequest) return bearerFromRequest;
  if (process.env.GCP_USER_TOKEN) return process.env.GCP_USER_TOKEN;
  return await gcpAccessToken();
}

type KvmEntry = { name: string; value: any };
type KvmPage = { keyValueEntries?: KvmEntry[]; nextPageToken?: string } | any;

const BASE = process.env.APIGEE_BASE || "https://apigee.googleapis.com";

export async function listKvms(org: string, env: string, bearer?: string): Promise<string[]> {
  const token = await ensureBearer(bearer);
  const url = `${BASE}/v1/organizations/${org}/environments/${env}/keyvaluemaps`;
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
  const pageSize = 100; let next = ""; const all: KvmEntry[] = [];
  do {
    const u = new URL(`${BASE}/v1/organizations/${org}/environments/${env}/keyvaluemaps/${map}/entries`);
    u.searchParams.set("pageSize", String(pageSize)); if (next) u.searchParams.set("pageToken", next);
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

export async function createKvm(org: string, env: string, name: string, encrypted: boolean, bearer?: string) {
  const token = await ensureBearer(bearer);
  const url = `${BASE}/v1/organizations/${org}/environments/${env}/keyvaluemaps`;
  const body = { name, encrypted };
  const res = await fetch(url, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type":"application/json" }, body: JSON.stringify(body)
  });
  if (!res.ok) { const txt = await res.text(); throw new Error(`createKvm ${res.status} – ${txt}`); }
  return await res.json();
}

export async function createEntry(org: string, env: string, map: string, entry: KvmEntry, bearer?: string) {
  const token = await ensureBearer(bearer);
  const url = `${BASE}/v1/organizations/${org}/environments/${env}/keyvaluemaps/${map}/entries`;
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type":"application/json" }, body: JSON.stringify(entry) });
  if (!res.ok) { const t = await res.text(); throw new Error(`createEntry ${res.status} – ${t}`); }
  return await res.json();
}

export async function updateEntry(org: string, env: string, map: string, entry: KvmEntry, bearer?: string) {
  const token = await ensureBearer(bearer);
  const url = `${BASE}/v1/organizations/${org}/environments/${env}/keyvaluemaps/${map}/entries/${encodeURIComponent(entry.name)}`;
  const res = await fetch(url, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type":"application/json" }, body: JSON.stringify(entry) });
  if (!res.ok) { const t = await res.text(); throw new Error(`updateEntry ${res.status} – ${t}`); }
  return await res.json();
}

export async function deleteEntry(org: string, env: string, map: string, entryName: string, bearer?: string) {
  const token = await ensureBearer(bearer);
  const url = `${BASE}/v1/organizations/${org}/environments/${env}/keyvaluemaps/${map}/entries/${encodeURIComponent(entryName)}`;
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }});
  if (!res.ok) { const t = await res.text(); throw new Error(`deleteEntry ${res.status} – ${t}`); }
  return await res.json();
}

export async function updateKvmToMatch(org: string, env: string, map: string, target: {keyValueEntries: KvmEntry[]}, bearer?: string) {
  const token = await ensureBearer(bearer);
  const current = await exportKvm(org, env, map, token);
  const curMap = new Map(current.keyValueEntries.map(e=>[e.name, e.value]));
  const tgtMap = new Map(target.keyValueEntries.map(e=>[e.name, e.value]));
  const toCreate: KvmEntry[] = []; const toUpdate: KvmEntry[] = []; const toDelete: string[] = [];
  for (const [name, value] of tgtMap.entries()) {
    if (!curMap.has(name)) toCreate.push({ name, value });
    else if (curMap.get(name) != value) toUpdate.push({ name, value });
  }
  for (const [name] of curMap.entries()) if (!tgtMap.has(name)) toDelete.push(name);
  for (const e of toCreate) await createEntry(org, env, map, e, token);
  for (const e of toUpdate) await updateEntry(org, env, map, e, token);
  for (const n of toDelete) await deleteEntry(org, env, map, n, token);
  return { created: toCreate.length, updated: toUpdate.length, deleted: toDelete.length };
}

export function diffKvm(a: {keyValueEntries: KvmEntry[]}, b: {keyValueEntries: KvmEntry[]}) {
  const A = new Map(a.keyValueEntries.map(e=>[e.name, e.value]));
  const B = new Map(b.keyValueEntries.map(e=>[e.name, e.value]));
  const keysA = new Set(A.keys()), keysB = new Set(B.keys());
  const add = [...keysB].filter(k => !keysA.has(k));
  const del = [...keysA].filter(k => !keysB.has(k));
  const chg = [...new Set([...keysA, ...keysB])].filter(k => A.get(k) != B.get(k)).map(name => ({ name, from: A.get(name), to: B.get(name) }));
  return { add, del, chg };
}
