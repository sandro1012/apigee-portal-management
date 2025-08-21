import { cookies } from "next/headers";
import { requireSession } from "../../../lib/auth";

async function getBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return process.env.GCP_USER_TOKEN as string;
  throw new Error("Token Google não encontrado (salve via /ui/select ou configure GCP_USER_TOKEN).");
}

export async function POST(req: Request) {
  try { requireSession(); } catch { return new Response(JSON.stringify({error:"unauthorized"}), {status:401}); }
  try {
    const { org } = await req.json();
    if (!org) return new Response(JSON.stringify({error:"org obrigatório"}), {status:400});
    const token = await getBearer();

    let startKey: string | undefined = undefined;
    const items: any[] = [];
    for (let i=0; i<10; i++) {
      const url = new URL(`https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apps`);
      url.searchParams.set("includeDevelopers", "true");
      url.searchParams.set("pageSize", "1000");
      if (startKey) url.searchParams.set("startKey", startKey);
      const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (!r.ok) return new Response(JSON.stringify({error: j.error?.message || r.statusText}), {status:r.status});
      const list = Array.isArray(j.app) ? j.app : (Array.isArray(j.apps) ? j.apps : (Array.isArray(j) ? j : []));
      items.push(...list);
      startKey = j.nextPageToken || j.next_key || undefined;
      if (!startKey) break;
    }

    const simplified = items.map((a:any)=> ({
      appId: a.appId || a.app_id || a.name,
      name: a.name || a.appName || a.app_id || a.appId,
      developerId: a.developerId || a.developer_id,
      developerEmail: a.developerEmail || a.developer?.email,
      status: a.status,
      createdAt: a.createdAt,
      lastModifiedAt: a.lastModifiedAt,
    }));
    return Response.json(simplified);
  } catch (e:any) {
    return new Response(JSON.stringify({error: e.message || String(e)}), {status:500});
  }
}
