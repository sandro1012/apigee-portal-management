// app/api/apps/new/route.ts
import { NextResponse } from "next/server";
import { readBearer } from "../../../lib/util/resolveApp";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const org: string = body.org || "";
    const name: string = body.name || "";
    const devEmail: string | undefined = body.devEmail;
    const companyName: string | undefined = body.companyName;
    const attributes: { name: string; value: string }[] = Array.isArray(body.attributes) ? body.attributes : [];

    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name obrigatório" }, { status: 400 });
    if (!devEmail && !companyName) {
      return NextResponse.json({ error: "informe devEmail (developer) ou companyName (company)" }, { status: 400 });
    }

    const bearer = await readBearer();
    const base = "https://apigee.googleapis.com/v1";
    const h = { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" };
    const enc = encodeURIComponent;

    const payload = JSON.stringify({
      name,
      attributes,
    });

    let url = "";
    if (devEmail) {
      url = `${base}/organizations/${enc(org)}/developers/${enc(devEmail)}/apps`;
    } else {
      url = `${base}/organizations/${enc(org)}/companies/${enc(companyName!)}/apps`;
    }

    const r = await fetch(url, { method: "POST", headers: h, body: payload });
    const txt = await r.text();
    const j = txt ? JSON.parse(txt) : null;

    if (!r.ok) {
      return NextResponse.json({ error: j?.error?.message || txt || r.statusText }, { status: r.status });
    }

    // Retorna o próprio objeto criado
    return NextResponse.json(j);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
