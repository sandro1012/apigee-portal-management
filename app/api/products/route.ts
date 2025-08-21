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
    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apiproducts?expand=true&pageSize=1000`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!r.ok) return new Response(JSON.stringify({error: j.error?.message || r.statusText}), {status:r.status});

    const list = j.apiProduct || j.apiProducts || j;
    return Response.json(Array.isArray(list) ? list : []);
  } catch (e:any) {
    return new Response(JSON.stringify({error: e.message || String(e)}), {status:500});
  }
}
