import { readBearer } from "../util/bearer";

/** Resolve dados essenciais do App e caminhos possíveis para credenciais. */
export async function resolveAppInfo(req: Request, org: string, appId: string) {
  const auth = readBearer(req);
  const base = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}`;
  const r = await fetch(`${base}/apps/${encodeURIComponent(appId)}`, { headers: { Authorization: auth } });
  const j = await r.json();
  if (!r.ok) {
    const msg = j?.error?.message || r.statusText || "Erro ao buscar app";
    throw new Error(msg);
  }
  const name: string = j.name || j.displayName || j.appName || j.app_id || "";
  let devEmail: string | undefined = j.developerEmail || j.developerId;
  // company name pode vir em atributo custom "companyId"
  let companyName: string | undefined = undefined;
  const attrs: Array<{name:string,value:string}> = j.attributes || [];
  for (const a of attrs) {
    if (!companyName && a.name && a.name.toLowerCase()==="companyid") companyName = a.value;
  }
  return { base, auth, info: { name, devEmail, companyName } };
}
