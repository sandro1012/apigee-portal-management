import { NextResponse } from "next/server";
import { resolveApp as resolveDevAndApp, readBearer, buildKeyUrls } from "../../../../../../lib/util/resolveApp";

export async function POST(req: Request, { params }: { params: { appId: string, consumerKey: string } }) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const { action } = await req.json();
    if (!action || (action !== "approve" && action !== "revoke")) {
      return NextResponse.json({ error: "action deve ser 'approve' ou 'revoke'" }, { status: 400 });
    }
    const status = action === "approve" ? "approved" : "revoked";

    const bearer = await readBearer();
    const info = await resolveApp(org, params.appId, bearer);

    const base = "https://apigee.googleapis.com/v1";
    const enc = encodeURIComponent;
    const headers = {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    };

    const tries: string[] = [];
    if (info.devEmail) {
      tries.push(`${base}/organizations/${enc(org)}/developers/${enc(info.devEmail)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}`);
    }
    if (info.companyName) {
      tries.push(`${base}/organizations/${enc(org)}/companies/${enc(info.companyName)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}`);
    }
    // fallback org-level
    tries.push(`${base}/organizations/${enc(org)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}`);

    const body = JSON.stringify({ status });

    let lastText = "";
    for (const u of tries) {
      const r = await fetch(u, { method: "POST", headers, body });
      if (r.ok) return NextResponse.json({ ok: true });
      lastText = await r.text();
    }
    return NextResponse.json({ error: "Not Found", attempts: tries }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
