import { getBearer, getOrg } from "../../../lib/auth";

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  try {
    const bearer = getBearer();
    const org = getOrg();
    if (!bearer) return new Response(JSON.stringify({ error: "missing token" }), { status: 401 });
    if (!org) return new Response(JSON.stringify({ error: "missing org" }), { status: 400 });
    const name = params.name;

    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apiproducts/${encodeURIComponent(name)}`;
    const r = await fetch(url, { headers: { Authorization: bearer } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return new Response(JSON.stringify({ error: j.error || j.message || r.statusText }), { status: r.status });

    return new Response(JSON.stringify({ product: j }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "internal error" }), { status: 500 });
  }
}
