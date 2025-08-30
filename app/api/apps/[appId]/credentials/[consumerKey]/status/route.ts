import { NextResponse } from "next/server";
import { resolveApp as resolveDevAndApp, readBearer } from "../../../../../../lib/util/resolveApp";

export async function POST(
  req: Request,
  { params }: { params: { appId: string; consumerKey: string } }
) {
  try {
    const { appId, consumerKey } = params;
    const url = new URL(req.url);
    const org = url.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const data = await req.json().catch(() => ({}));
    const action = (data?.action === "approve" ? "approve" : data?.action === "revoke" ? "revoke" : undefined);
    if (!action) return NextResponse.json({ error: "action deve ser 'approve' ou 'revoke'" }, { status: 400 });

    const token = await readBearer();
    const headers = { Authorization: `Bearer ${token}`, "content-type": "application/json" };
    const base = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}`;
    const info = await resolveDevAndApp(org, appId, token);

    const enc = encodeURIComponent;
    const appName = info.appName;
    const urls: string[] = [];
    if (info.devEmail) urls.push(`${base}/developers/${enc(info.devEmail)}/apps/${enc(appName)}/keys/${enc(consumerKey)}`);
    if (info.companyName) urls.push(`${base}/companies/${enc(info.companyName)}/apps/${enc(appName)}/keys/${enc(consumerKey)}`);
    urls.push(`${base}/apps/${enc(appName)}/keys/${enc(consumerKey)}`);

    const status = action === "approve" ? "approved" : "revoked";
    const attempts: string[] = [];

    // 1) POST com body {status:"approved|revoked"}
    for (const u of urls) {
      attempts.push(`POST ${u} body:{status:${status}}`);
      const r = await fetch(u, { method: "POST", headers, body: JSON.stringify({ status }) });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    // 2) Fallback: POST ?action=approve|revoke (sem body)
    for (const u of urls) {
      const ur = `${u}?action=${action}`;
      attempts.push(`POST ${ur}`);
      const r = await fetch(ur, { method: "POST", headers });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Not Found", attempts }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
