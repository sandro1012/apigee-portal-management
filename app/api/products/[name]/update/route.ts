import { getBearer, getOrg } from "../../../../lib/auth";
import { operationGroupSchema } from "../../../../lib/schema/product";

const ALLOWED_KEYS = new Set([
  "name","displayName","approvalType","attributes","description","environments","proxies","scopes","quota","quotaInterval","quotaTimeUnit","operationGroup","apiResources"
]);

export async function POST(req: Request, { params }: { params: { name: string } }) {
  try {
    const bearer = getBearer();
    const org = getOrg();
    if (!bearer) return new Response(JSON.stringify({ error: "missing token" }), { status: 401 });
    if (!org) return new Response(JSON.stringify({ error: "missing org" }), { status: 400 });
    const name = params.name;

    const raw = await req.json().catch(() => ({}));
    const groupInput = raw?.operationGroup ? raw.operationGroup : { operationConfigs: raw?.operationConfigs };
    const parsed = operationGroupSchema.safeParse(groupInput);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid payload", issues: parsed.error.flatten() }, null, 2), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const getUrl = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apiproducts/${encodeURIComponent(name)}`;
    const currentRes = await fetch(getUrl, { headers: { Authorization: bearer } });
    const current = await currentRes.json().catch(() => ({}));
    if (!currentRes.ok) {
      return new Response(JSON.stringify({ error: current.error || current.message || "failed to fetch product" }), { status: currentRes.status });
    }

    const putBody: any = {};
    for (const k of Object.keys(current)) {
      if (ALLOWED_KEYS.has(k)) putBody[k] = current[k];
    }
    putBody.operationGroup = parsed.data;
    if ("apiResources" in putBody) delete putBody.apiResources;

    const pr = await fetch(getUrl, {
      method: "PUT",
      headers: { Authorization: bearer, "Content-Type": "application/json" },
      body: JSON.stringify(putBody),
    });
    const pj = await pr.json().catch(() => ({}));
    if (!pr.ok) {
      return new Response(JSON.stringify({ error: pj.error || pj.message || "update failed", body: pj }, null, 2), { status: pr.status, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, product: pj }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "internal error" }), { status: 500 });
  }
}
