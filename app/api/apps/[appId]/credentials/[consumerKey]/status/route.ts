import { NextResponse } from "next/server";
import { resolveApp, readBearer } from "../../../../../../lib/util/resolveApp";

export async function POST(
  req: Request,
  { params }: { params: { appId: string; consumerKey: string } }
) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const action: "approve" | "revoke" = body?.action;
    if (!action) {
      return NextResponse.json({ error: "action obrigatório (approve|revoke)" }, { status: 400 });
    }

    const bearer = await readBearer();
    const info = await resolveApp(org, params.appId, bearer);

    const base = "https://apigee.googleapis.com/v1";
    const enc = encodeURIComponent;
    const keyRelPaths: string[] = [];

    if (info.devEmail) {
      keyRelPaths.push(
        `/organizations/${enc(org)}/developers/${enc(info.devEmail)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}`
      );
    }
    if (info.companyName) {
      keyRelPaths.push(
        `/organizations/${enc(org)}/companies/${enc(info.companyName)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}`
      );
    }
    // Fallback org-level
    keyRelPaths.push(
      `/organizations/${enc(org)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}`
    );

    const headers = { Authorization: `Bearer ${bearer}`, "content-type": "application/json" as const };
    const approveStatus = action === "approve" ? "approved" : "revoked";
    const attempts: string[] = [];

    // 1) Tenta ?action=approve|revoke (varia por tenant)
    for (const rel of keyRelPaths) {
      const u = `${base}${rel}?action=${enc(action)}`;
      attempts.push(`POST ${u}`);
      const r = await fetch(u, { method: "POST", headers });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    // 2) Tenta body { status: "approved" | "revoked" }
    for (const rel of keyRelPaths) {
      const u = `${base}${rel}`;
      attempts.push(`POST ${u} body:{status:${approveStatus}}`);
      const r = await fetch(u, { method: "POST", headers, body: JSON.stringify({ status: approveStatus }) });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Not Found", attempts }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
