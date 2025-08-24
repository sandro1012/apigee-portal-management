import { cookies } from "next/headers";
import { readBearer } from "./bearer";

type DevAppGlobal = {
  appId?: string;
  name?: string; // app name
  developerId?: string;
  owner?: string;
  developerEmail?: string;
};

export function getOrgFromReq(req: Request): string {
  const url = new URL(req.url);
  return url.searchParams.get("org") || cookies().get("org")?.value || "";
}

export async function resolveDevAndApp(req: Request, appId: string) {
  const org = getOrgFromReq(req);
  if (!org) throw new Error("missing org");

  const bearer = readBearer(req);
  const headers = { "Authorization": bearer, "Content-Type": "application/json" };

  // Get global app by id to discover developer and app name
  const g = await fetch(`https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apps/${encodeURIComponent(appId)}`, { headers });
  if (!g.ok) {
    const t = await g.text();
    throw new Error(`failed to fetch app by id: ${g.status} ${t}`);
  }
  const app = (await g.json()) as DevAppGlobal;
  const appName = app.name || "";
  let devId = app.developerEmail || app.owner || app.developerId || "";
  if (!devId) throw new Error("could not resolve developer for app");

  // If it's not an email, resolve to email
  if (!devId.includes("@")) {
    const d = await fetch(`https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(devId)}`, { headers });
    if (d.ok) {
      const dj = await d.json();
      devId = dj.email || devId;
    }
  }

  return { org, appName, developerEmail: devId, headers };
}
