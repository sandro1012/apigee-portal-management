import { NextResponse } from "next/server";
import { resolveApp as resolveDevAndApp, readBearer } from "../../../../../../../lib/util/resolveApp";

export async function POST(
  req: Request,
  { params }: { params: { appId: string; consumerKey: string } }
) {
  try {
    const { appId, consumerKey } = params;
    const url = new URL(req.url);
    const org = url.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const apiProduct: string | undefined = body?.apiProduct;
    if (!apiProduct) {
      return NextResponse.json({ error: "apiProduct obrigatório" }, { status: 400 });
    }

    const token = await readBearer();
    const headers = { Authorization: `Bearer ${token}`, "content-type": "application/json" };
    const base = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}`;
    const info = await resolveDevAndApp(org, appId, token);

    const enc = encodeURIComponent;
    const appName = info.appName;
    const keyBaseURLs: string[] = [];
    if (info.devEmail)
      keyBaseURLs.push(`${base}/developers/${enc(info.devEmail)}/apps/${enc(appName)}/keys/${enc(consumerKey)}`);
    if (info.companyName)
      keyBaseURLs.push(`${base}/companies/${enc(info.companyName)}/apps/${enc(appName)}/keys/${enc(consumerKey)}`);
    keyBaseURLs.push(`${base}/apps/${enc(appName)}/keys/${enc(consumerKey)}`);

    const attempts: string[] = [];

    // 1) POST .../apiproducts/{product}?action=approve (sem body)
    for (const kb of keyBaseURLs) {
      const u = `${kb}/apiproducts/${enc(apiProduct)}?action=approve`;
      attempts.push(`POST ${u}`);
      const r = await fetch(u, { method: "POST", headers });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    // 2) POST .../apiproducts/{product} com body {status:"approved"}
    for (const kb of keyBaseURLs) {
      const u = `${kb}/apiproducts/${enc(apiProduct)}`;
      attempts.push(`POST ${u} body:{status:approved}`);
      const r = await fetch(u, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: "approved" }),
      });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    // 3) POST .../keys/{key} com apiProducts no body (alguns tenants aceitam)
    for (const kb of keyBaseURLs) {
      attempts.push(`POST ${kb} body:{apiProducts:[{apiproduct,status}]}`);
      const r = await fetch(kb, {
        method: "POST",
        headers,
        body: JSON.stringify({
          status: "approved",
          apiProducts: [{ apiproduct: apiProduct, status: "approved" }],
        }),
      });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    // 4) POST .../keys/{key}?action=approve&apiproduct=NAME (estilo legado)
    for (const kb of keyBaseURLs) {
      const u = `${kb}?action=approve&apiproduct=${enc(apiProduct)}`;
      attempts.push(`POST ${u}`);
      const r = await fetch(u, { method: "POST", headers });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Not Found", attempts }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
