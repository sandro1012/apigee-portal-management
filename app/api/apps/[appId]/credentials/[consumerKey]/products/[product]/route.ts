import { NextResponse } from "next/server";
import {
  resolveApp,
  readBearer,
  buildKeyUrls
} from "../../../../../../../lib/util/resolveApp";

export async function DELETE(req: Request, { params }: { params: { appId: string, consumerKey: string, product: string } }) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.get("org");
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const bearer = await readBearer();
    const info = await resolveApp(org, params.appId, bearer);

    const base = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}`;
    const enc = encodeURIComponent;

    // 1) Tenta o endpoint clássico de DELETE (alguns ambientes aceitam):
    const directTries: string[] = [];
    if (info.devEmail) {
      directTries.push(`${base}/developers/${enc(info.devEmail)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}/apiproducts/${enc(params.product)}`);
    }
    if (info.companyName) {
      directTries.push(`${base}/companies/${enc(info.companyName)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}/apiproducts/${enc(params.product)}`);
    }
    directTries.push(`${base}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}/apiproducts/${enc(params.product)}`);

    for (const u of directTries) {
      const r = await fetch(u, { method: "DELETE", headers: { Authorization: `Bearer ${bearer}` } });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    // 2) Fallback padrão do seu tenant:
    // POST .../keys/{key}?action=revoke  body: { "apiProducts": ["..."] }
    const revokeTries: string[] = [];
    if (info.devEmail) {
      revokeTries.push(`${base}/developers/${enc(info.devEmail)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}?action=revoke`);
    }
    if (info.companyName) {
      revokeTries.push(`${base}/companies/${enc(info.companyName)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}?action=revoke`);
    }
    revokeTries.push(`${base}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}?action=revoke`);

    const body = JSON.stringify({ apiProducts: [params.product] });
    for (const u of revokeTries) {
      const r = await fetch(u, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        body
      });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Not Found", attempts: [...directTries, ...revokeTries.map(u => `POST ${u} body:${body}`)] }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}