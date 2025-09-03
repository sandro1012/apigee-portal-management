import { NextResponse } from "next/server";
import { resolveApp, readBearer } from "../../../../../../lib/util/resolveApp";

export async function POST(req: Request, { params }: { params: { appId: string, consumerKey: string } }) {
  try {
    // Lê body uma única vez (se vier)
    let bodyIn: any = null;
    try { bodyIn = await req.json(); } catch {}

    const url = new URL(req.url);
    const org = url.searchParams.get("org") || bodyIn?.org;
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const action = String(bodyIn?.action || "").toLowerCase();
    if (action !== "approve" && action !== "revoke") {
      return NextResponse.json({ error: "action deve ser 'approve' ou 'revoke'" }, { status: 400 });
    }

    const bearer = await readBearer();
    const info = await resolveApp(org, params.appId, bearer); // { appName, devEmail?, companyName? }

    const base = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}`;
    const enc = encodeURIComponent;

    // constrói os 3 caminhos possíveis (developer/company/org-level)
    const baseKeyUrls: string[] = [];
    if (info.devEmail) {
      baseKeyUrls.push(`${base}/developers/${enc(info.devEmail)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}`);
    }
    if (info.companyName) {
      baseKeyUrls.push(`${base}/companies/${enc(info.companyName)}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}`);
    }
    baseKeyUrls.push(`${base}/apps/${enc(info.appName)}/keys/${enc(params.consumerKey)}`);

    // 1) Tentar POST ...?action=approve|revoke SEM body e SEM content-type
    const attempts: string[] = [];
    for (const u0 of baseKeyUrls) {
      const u = `${u0}?action=${enc(action)}`;
      attempts.push(`POST (no body) ${u}`);
      const r = await fetch(u, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}` },
      });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    // 2) POST com Content-Length: 0
    for (const u0 of baseKeyUrls) {
      const u = `${u0}?action=${enc(action)}`;
      attempts.push(`POST (Content-Length:0) ${u}`);
      const r = await fetch(u, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, "Content-Length": "0" },
      });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    // 3) POST com Accept: application/json (ainda sem body)
    for (const u0 of baseKeyUrls) {
      const u = `${u0}?action=${enc(action)}`;
      attempts.push(`POST (Accept: application/json) ${u}`);
      const r = await fetch(u, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json" },
      });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    // 4) Fallback: atualizar status via body no endpoint da key (sem ?action).
    //    Alguns tenants aceitam {"status":"revoked"|"approved"}.
    const statusBody = JSON.stringify({ status: action === "approve" ? "approved" : "revoked" });
    for (const u of baseKeyUrls) {
      attempts.push(`POST ${u} body:${statusBody}`);
      const r = await fetch(u, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        body: statusBody,
      });
      if (r.ok) return NextResponse.json({ ok: true });
    }
    for (const u of baseKeyUrls) {
      attempts.push(`PUT ${u} body:${statusBody}`);
      const r = await fetch(u, {
        method: "PUT",
        headers: { Authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        body: statusBody,
      });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Not Found", attempts }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
