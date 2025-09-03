import { NextResponse } from "next/server";
import { readBearer, resolveApp } from "../../../../lib/util/bearer";

export async function GET(req: Request, { params }: { params: { appId: string } }) {
  try {
    const { appId } = params;
    const urlObj = new URL(req.url);
    const org = urlObj.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    if (!appId) return NextResponse.json({ error: "appId obrigatório" }, { status: 400 });

    const auth = readBearer(req);
    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apps/${encodeURIComponent(appId)}`;
    const r = await fetch(url, { headers: { Authorization: auth } });
    const j = await r.json().catch(()=>({}));
    if (!r.ok) {
      const msg = j?.error?.message || r.statusText || "Erro ao buscar app";
      return NextResponse.json({ error: msg }, { status: r.status });
    }
    return NextResponse.json(j);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
export async function DELETE(req: Request, { params }: { params: { appId: string } }) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const bearer = await readBearer();
    const info = await resolveApp(org, params.appId, bearer); // { appName, devEmail?, companyName? }
    const base = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}`;
    const tries: string[] = [];

    if (info.devEmail) {
      const u = `${base}/developers/${encodeURIComponent(info.devEmail)}/apps/${encodeURIComponent(info.appName)}`;
      tries.push(`DELETE ${u}`);
      const r = await fetch(u, { method: "DELETE", headers: { Authorization: `Bearer ${bearer}` } });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    if (info.companyName) {
      const u = `${base}/companies/${encodeURIComponent(info.companyName)}/apps/${encodeURIComponent(info.appName)}`;
      tries.push(`DELETE ${u}`);
      const r = await fetch(u, { method: "DELETE", headers: { Authorization: `Bearer ${bearer}` } });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    // Fallback org-level (alguns tenants aceitam)
    {
      const u = `${base}/apps/${encodeURIComponent(info.appName)}`;
      tries.push(`DELETE ${u}`);
      const r = await fetch(u, { method: "DELETE", headers: { Authorization: `Bearer ${bearer}` } });
      if (r.ok) return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Not Found", attempts: tries }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}