import { getBearer, getOrg } from "../../../lib/auth";

export async function GET(req: Request, { params }: { params: { name: string } }) {
  try {
    const bearer = getBearer();
    if (!bearer) return new Response(JSON.stringify({ product: null, error: "missing token" }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });

    const u = new URL(req.url);
    const orgQuery = u.searchParams.get("org") || "";
    const org = orgQuery || getOrg();
    if (!org) return new Response(JSON.stringify({ product: null, error: "missing org" }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });

    const name = params.name;
    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apiproducts/${encodeURIComponent(name)}`;
    const r = await fetch(url, { headers: { Authorization: bearer } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return new Response(JSON.stringify({ product: null, error: j.error || j.message || r.statusText, status: r.status }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ product: j }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ product: null, error: e.message || "internal error" }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}
