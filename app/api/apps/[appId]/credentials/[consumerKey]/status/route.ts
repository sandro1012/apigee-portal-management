import { NextResponse } from "next/server";
import { resolveApp, readBearer } from "../../../../../../lib/util/resolveApp";

export async function POST(req: Request, { params }: { params: { appId: string, consumerKey: string } }) {
  try {
    // lê body uma única vez (para não consumir o stream duas vezes)
    let body: any = null;
    try { body = await req.json(); } catch {}

    const url = new URL(req.url);
    const org = url.searchParams.get("org") || body?.org;
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const action = (body?.action || "").toLowerCase();
    if (action !== "approve" && action !== "revoke") {
      return NextResponse.json({ error: "action deve ser 'approve' ou 'revoke'" }, { status: 400 });
    }

    const bearer = await readBearer();
    const info = await resolveApp(org, params.appId, bearer);

    const base = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}`;
    const enc = encodeURIComponent;

    const tries: string[] = [];
    if (info.devEmail) {
      tries.push(`${base}/developers/${enc(info.devEmail)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}?action=${enc(action)}`);
    }
    if (info.companyName) {
      tries.push(`${base}/companies/${enc(info.companyName)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}?action=${enc(action)}`);
    }
    tries.push(`${base}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}?action=${enc(action)}`);

    let lastText = "";
    for (const u of tries) {
      const r = await fetch(u, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        // body vazio ou {} funcionam; enviamos {} para evitar 415 em alguns setups
        body: "{}"
      });
      if (r.ok) return NextResponse.json({ ok: true });
      lastText = await r.text().catch(() => "");
    }

    return NextResponse.json({ error: "Not Found", attempts: tries }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
