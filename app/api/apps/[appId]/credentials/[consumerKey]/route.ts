import { NextResponse } from "next/server";
import { resolveApp as resolveDevAndApp, readBearer, buildKeyUrls } from "../../../../../lib/util/resolveApp";

export async function DELETE(
  req: Request,
  { params }: { params: { appId: string; consumerKey: string } }
) {
  try {
    const { appId, consumerKey } = params;
    const url = new URL(req.url);
    const org = url.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const token = await readBearer();
    const headers = { Authorization: `Bearer ${token}` };
    const base = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}`;
    const info = await resolveDevAndApp(org, appId, token);

    const enc = encodeURIComponent;
    const appName = info.appName;
    const urls: string[] = [];
    if (info.devEmail) urls.push(`${base}/developers/${enc(info.devEmail)}/apps/${enc(appName)}/keys/${enc(consumerKey)}`);
    if (info.companyName) urls.push(`${base}/companies/${enc(info.companyName)}/apps/${enc(appName)}/keys/${enc(consumerKey)}`);
    urls.push(`${base}/apps/${enc(appName)}/keys/${enc(consumerKey)}`);

    const attempts: string[] = [];
    for (const u of urls) {
      attempts.push(`DELETE ${u}`);
      const r = await fetch(u, { method: "DELETE", headers });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Not Found", attempts }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
