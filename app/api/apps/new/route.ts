// app/api/apps/new/route.ts
import { NextResponse } from "next/server";
import { readBearer } from "../../../lib/util/resolveApp";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const org: string = body.org || "";
    const name: string = body.name || "";           // DisplayName (obrigatório)
    const devEmail: string = body.devEmail || "";   // sempre Developer App
    const attributes: { name: string; value: string }[] = Array.isArray(body.attributes) ? body.attributes : [];

    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name (DisplayName) obrigatório" }, { status: 400 });
    if (!devEmail) return NextResponse.json({ error: "devEmail obrigatório (Developer App)" }, { status: 400 });

    const bearer = await readBearer();
    const base = "https://apigee.googleapis.com/v1";
    const h = { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" };

    const r = await fetch(`${base}/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(devEmail)}/apps`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ name, attributes }),
    });

    const txt = await r.text();
    const j = txt ? JSON.parse(txt) : null;
    if (!r.ok) return NextResponse.json({ error: j?.error?.message || txt || r.statusText }, { status: r.status });

    return NextResponse.json(j);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
