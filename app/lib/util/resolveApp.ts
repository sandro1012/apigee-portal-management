// app/lib/util/resolveApp.ts
import { cookies } from "next/headers";

export async function readBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return String(process.env.GCP_USER_TOKEN);
  throw new Error("Token Google não encontrado (salve via /ui/select ou configure GCP_USER_TOKEN).");
}

export type AppOwner = {
  appName: string;
  devEmail?: string;
  companyName?: string;
};

export async function resolveApp(org: string, appId: string, bearer?: string): Promise<AppOwner> {
  const token = bearer || (await readBearer());
  const base = "https://apigee.googleapis.com/v1";
  const h = { Authorization: `Bearer ${token}` };

  // Pega o app por appId (retorna name, attributes, developerId)
  const r = await fetch(
    `${base}/organizations/${encodeURIComponent(org)}/apps/${encodeURIComponent(appId)}`,
    { headers: h }
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Falha ao obter app ${appId}: ${r.status} ${t}`);
  }
  const j: any = await r.json();
  const appName: string = j.name || "";
  if (!appName) throw new Error("App sem 'name' no payload.");

  // companyName pode vir em attributes (companyId/companyName)
  let companyName: string | undefined;
  if (Array.isArray(j.attributes)) {
    const hit = j.attributes.find(
      (a: any) => a?.name && /^company(id|name)$/i.test(String(a.name))
    );
    if (hit?.value) companyName = String(hit.value);
  }

  // devEmail: tenta direto; se vier só developerId, busca o developer para pegar email
  let devEmail: string | undefined = j.developerEmail;
  const developerId: string | undefined = j.developerId;
  if (!devEmail && developerId) {
    const rd = await fetch(
      `${base}/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(developerId)}`,
      { headers: h }
    );
    if (rd.ok) {
      const dj: any = await rd.json();
      if (dj.email) devEmail = String(dj.email);
    }
  }

  return { appName, devEmail, companyName };
}

export function buildKeyUrls(org: string, owner: AppOwner, consumerKey: string): string[] {
  const enc = encodeURIComponent;
  const urls: string[] = [];
  if (owner.devEmail) {
    urls.push(
      `/v1/organizations/${enc(org)}/developers/${enc(owner.devEmail)}/apps/${enc(
        owner.appName
      )}/keys/${enc(consumerKey)}`
    );
  }
  if (owner.companyName) {
    urls.push(
      `/v1/organizations/${enc(org)}/companies/${enc(owner.companyName)}/apps/${enc(
        owner.appName
      )}/keys/${enc(consumerKey)}`
    );
  }
  // fallback org-level (alguns tenants aceitam)
  urls.push(`/v1/organizations/${enc(org)}/apps/${enc(owner.appName)}/keys/${enc(consumerKey)}`);
  return urls;
}
// --- Back-compat exports (rotas antigas esperam esses nomes) ---
export const resolveDevAndApp = resolveApp;
// NÃO exporte getBearer aqui; ele já existe nesse módulo

