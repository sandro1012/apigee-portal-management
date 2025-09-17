// app/api/apps/new/route.ts
import { NextResponse } from "next/server";
import { readBearer } from ".../../lib/util/resolveApp"; // caminho correto (3 níveis)

type Attr = { name: string; value: string };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const org: string = body?.org;
    const name: string = body?.name;
    const devEmail: string | undefined = body?.devEmail?.trim() || undefined;
    const companyName: string | undefined = body?.companyName?.trim() || undefined;
    const attributes: Attr[] = Array.isArray(body?.attributes) ? body.attributes : [];

    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name obrigatório" }, { status: 400 });
    if (!devEmail && !companyName) {
      return NextResponse.json({ error: "Informe devEmail (developer app) OU companyName (company app)." }, { status: 400 });
    }

    const token = await readBearer();
    const base = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };

    const payload: any = { name };
    if (attributes.length > 0) payload.attributes = attributes;

    let url = "";
    if (devEmail) {
      url = `${base}/developers/${encodeURIComponent(devEmail)}/apps`;
    } else {
      url = `${base}/companies/${encodeURIComponent(companyName!)}/apps`;
    }

    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    const txt = await r.text();
    const data = txt ? JSON.parse(txt) : null;

    if (!r.ok) {
      return NextResponse.json({ error: data?.error?.message || r.statusText || "Falha ao criar app" }, { status: r.status || 500 });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
