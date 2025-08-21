import { cookies } from "next/headers";
import { requireSession } from "../../../../lib/auth";

async function getBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return process.env.GCP_USER_TOKEN as string;
  throw new Error("Token Google não encontrado (salve via /ui/select ou configure GCP_USER_TOKEN).");
}

export async function GET(req: Request, ctx: { params: { appId: string } }) {
  try { requireSession(); } catch { return new Response(JSON.stringify({error:"unauthorized"}), {status:401}); }
  try {
    const { searchParams } = new URL(req.url);
    const org = searchParams.get("org");
    if (!org) return new Response(JSON.stringify({error:"org obrigatório"}), {status:400});

    const app = ctx.params.appId;
    const token = await getBearer();

    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apps/${encodeURIComponent(app)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!r.ok) return new Response(JSON.stringify({error: j.error?.message || r.statusText}), {status:r.status});

    const det = {
      appId: j.appId || j.name,
      name: j.name,
      developerId: j.developerId,
      developerEmail: j.developerEmail,
      status: j.status,
      createdAt: j.createdAt,
      lastModifiedAt: j.lastModifiedAt,
      attributes: j.attributes || [],
      apiProducts: j.apiProducts || [],
      credentials: j.credentials || []
    };
    return Response.json(det);
  } catch (e:any) {
    return new Response(JSON.stringify({error: e.message || String(e)}), {status:500});
  }
}
