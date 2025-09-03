// app/api/apps/[appId]/route.ts
import { NextResponse } from "next/server";
import { readBearer, resolveApp } from "../../../lib/util/resolveApp";

export async function GET(req: Request, { params }: { params: { appId: string } }) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const bearer = await readBearer();
    const h = { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" };
    const base = "https://apigee.googleapis.com/v1";
    const enc = encodeURIComponent;

    const info = await resolveApp(org, params.appId, bearer);
    const appName = info.appName;

    let detailResp: Response | null = null;
    let detailJson: any = null;

    const tries: string[] = [];
    if (info.devEmail) {
      tries.push(`${base}/organizations/${enc(org)}/developers/${enc(info.devEmail)}/apps/${enc(appName)}`);
    }
    if (info.companyName) {
      tries.push(`${base}/organizations/${enc(org)}/companies/${enc(info.companyName)}/apps/${enc(appName)}`);
    }
    tries.push(`${base}/organizations/${enc(org)}/apps/${enc(appName)}`);

    let lastErrTxt = "";
    for (const u of tries) {
      const r = await fetch(u, { headers: h });
      if (r.ok) { detailResp = r; break; }
      lastErrTxt = await r.text().catch(() => r.statusText);
    }

    if (!detailResp) {
      return NextResponse.json({ error: lastErrTxt || "Falha ao obter app" }, { status: 400 });
    }

    detailJson = await detailResp.json();

    const out = {
      name: detailJson.name || appName,
      appId: params.appId,
      status: detailJson.status,
      developerEmail: detailJson.developerEmail || info.devEmail,
      developerId: detailJson.developerId,
      attributes: Array.isArray(detailJson.attributes) ? detailJson.attributes : [],
      apiProducts: Array.isArray(detailJson.apiProducts) ? detailJson.apiProducts : [],
      credentials: Array.isArray(detailJson.credentials) ? detailJson.credentials : [],
    };

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { appId: string } }) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const bearer = await readBearer();
    const enc = encodeURIComponent;
    const base = "https://apigee.googleapis.com/v1";
    const h = { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" };

    // Sempre Developer App (seu cenário), então precisamos do devEmail e appName
    const info = await resolveApp(org, params.appId, bearer);
    if (!info.devEmail) {
      return NextResponse.json({ error: "Não foi possível identificar o developer (devEmail) do App." }, { status: 400 });
    }
    const appName = info.appName;

    const delUrl = `${base}/organizations/${enc(org)}/developers/${enc(info.devEmail)}/apps/${enc(appName)}`;
    const r = await fetch(delUrl, { method: "DELETE", headers: h });
    const txt = await r.text();
    const j = txt ? JSON.parse(txt) : null;

    if (!r.ok) {
      return NextResponse.json({ error: j?.error?.message || txt || r.statusText }, { status: r.status });
    }

    // Apigee costuma devolver 204. Vamos padronizar uma resposta simples.
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
