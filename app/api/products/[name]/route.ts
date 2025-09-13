// app/api/products/[name]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function readBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return String(process.env.GCP_USER_TOKEN);
  throw new Error("Token Google não encontrado (salve via UI ou configure GCP_USER_TOKEN).");
}

export async function GET(req: Request, { params }: { params: { name: string } }) {
  try {
    const u = new URL(req.url);
    const org = u.searchParams.get("org") || "";
    const name = params?.name || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name obrigatório" }, { status: 400 });

    const bearer = await readBearer();
    const base = "https://apigee.googleapis.com/v1";
    const enc = encodeURIComponent;

    const r = await fetch(`${base}/organizations/${enc(org)}/apiproducts/${enc(name)}`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    const txt = await r.text();
    const j = txt ? JSON.parse(txt) : null;
    if (!r.ok) return NextResponse.json({ error: j?.error?.message || j?.message || txt || r.statusText }, { status: r.status });

    return NextResponse.json(j);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { name: string } }) {
  try {
    const u = new URL(req.url);
    const org = u.searchParams.get("org") || "";
    const name = params?.name || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name obrigatório" }, { status: 400 });

    const bearer = await readBearer();
    const base = "https://apigee.googleapis.com/v1";
    const enc = encodeURIComponent;

    const r = await fetch(`${base}/organizations/${enc(org)}/apiproducts/${enc(name)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (r.ok || r.status === 204) return NextResponse.json({ ok: true, deleted: name });

    const txt = await r.text();
    let msg = txt;
    try {
      const j = txt ? JSON.parse(txt) : null;
      msg = j?.error?.message || j?.message || txt || r.statusText;
    } catch {}
    return NextResponse.json({ error: msg }, { status: r.status || 400 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
