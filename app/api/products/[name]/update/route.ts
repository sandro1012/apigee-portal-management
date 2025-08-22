import { cookies } from "next/headers";
import { requireSession } from "../../../../../lib/auth";
import { apiResourcesSchema } from "../../../../lib/schema/product";

async function getBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return process.env.GCP_USER_TOKEN as string;
  throw new Error("Token Google não encontrado (salve via /api/auth/token ou configure GCP_USER_TOKEN).");
}

export async function POST(req: Request, ctx: { params: { name: string } }) {
  try { requireSession(); } catch { return new Response(JSON.stringify({error:"unauthorized"}), {status:401}); }
  try {
    const body = await req.json();
    const { org, apiResources } = body || {};
    if (!org) return new Response(JSON.stringify({error:"org obrigatório"}), {status:400});

    const parsed = apiResourcesSchema.safeParse({ apiResources: apiResources || [] });
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
      return new Response(JSON.stringify({error:"Schema inválido", issues}), {status:400});
    }

    const token = await getBearer();
    const name = ctx.params.name;

    // 1) GET current product
    const getUrl = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apiproducts/${encodeURIComponent(name)}`;
    const gr = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
    const current = await gr.json();
    if (!gr.ok) return new Response(JSON.stringify({error: current.error?.message || gr.statusText}), {status:gr.status});

    // 2) Build minimal PUT body preserving fields
    const allowed = ["name","displayName","approvalType","attributes","description","apiResources","proxies","environments","scopes","quota","quotaInterval","quotaTimeUnit"];
    const putBody: any = {};
    for (const k of allowed) if (k in current) (putBody as any)[k] = current[k];
    putBody.apiResources = parsed.data.apiResources;

    const putUrl = getUrl; // same
    const pr = await fetch(putUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(putBody)
    });
    const pj = await pr.json().catch(()=> ({}));
    if (!pr.ok) return new Response(JSON.stringify({error: pj.error?.message || pr.statusText, details: pj}), {status: pr.status});
    return Response.json({ ok: true, product: pj });
  } catch (e:any) {
    return new Response(JSON.stringify({error: e.message || String(e)}), {status:500});
  }
}
