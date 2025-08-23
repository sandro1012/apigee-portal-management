import { cookies } from "next/headers";

type DevAppGlobal = {
  appId?: string;
  name?: string; // app name
  developerId?: string;
  owner?: string;
  developerEmail?: string;
};

function getBearerFromCookies() {
  const c = cookies().get("gcp_token")?.value;
  if (!c) throw new Error("unauthorized: missing gcp_token cookie");
  return c.startsWith("Bearer ") ? c : `Bearer ${c}`;
}

export function getOrgFromReq(req: Request): string {
  const url = new URL(req.url);
  return url.searchParams.get("org") || cookies().get("org")?.value || "";
}

export async function resolveDevAndApp(req: Request, appId: string) {
  const org = getOrgFromReq(req);
  if (!org) throw new Error("missing org");

  const bearer = getBearerFromCookies();
  const headers = { "Authorization": bearer, "Content-Type": "application/json" };

  const g = await fetch(`https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apps/${encodeURIComponent(appId)}`, { headers });
  if (!g.ok) {
    const t = await g.text();
    throw new Error(`failed to fetch app by id: ${g.status} ${t}`);
  }
  const app = (await g.json()) as DevAppGlobal;
  const appName = app.name || "";
  let devId = app.developerEmail || app.owner || app.developerId || "";
  if (!devId) throw new Error("could not resolve developer for app");

  if (!devId.includes("@")) {
    const d = await fetch(`https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(devId)}`, { headers });
    if (d.ok) {
      const dj = await d.json();
      devId = dj.email || devId;
    }
  }

  return { org, appName, developerEmail: devId, headers };
}
