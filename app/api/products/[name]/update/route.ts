// app/api/products/[name]/update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function readBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return String(process.env.GCP_USER_TOKEN);
  throw new Error("Token Google não encontrado (salve via UI ou configure GCP_USER_TOKEN).");
}

export async function POST(req: Request, { params }: { params: { name: string } }) {
  try {
    const name = params?.name || "";
    if (!name) return NextResponse.json({ error: "name obrigatório" }, { status: 400 });

    const u = new URL(req.url);
    let org = u.searchParams.get("org") || "";
    const body = await req.json().catch(() => ({}));
    if (!org) org = body?.org || "";
    const incomingOpGroup = body?.operationGroup;
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const bearer = await readBearer();
    const base = "https://apigee.googleapis.com/v1";
    const enc = encodeURIComponent;
    const hdr = { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" };

    // Busca produto atual
    const rGet = await fetch(`${base}/organizations/${enc(org)}/apiproducts/${enc(name)}`, { headers: { Authorization: `Bearer ${bearer}` } });
    const txtGet = await rGet.text();
    const current = txtGet ? JSON.parse(txtGet) : null;
    if (!rGet.ok) return NextResponse.json({ error: current?.error?.message || current?.message || txtGet || rGet.statusText }, { status: rGet.status });

    // Monta payload de update:
    // mantemos campos importantes e substituímos operationGroup
    const updated = {
      ...current,
      name: current.name || name,
      operationGroup: incomingOpGroup || current.operationGroup || undefined,
      apiResources: undefined, // removemos para não conflitar com operationGroup
    };

    // PUT para atualizar o product
    const rPut = await fetch(`${base}/organizations/${enc(org)}/apiproducts/${enc(name)}`, {
      method: "PUT",
      headers: hdr,
      body: JSON.stringify(updated),
    });
    const txtPut = await rPut.text();
    const out = txtPut ? JSON.parse(txtPut) : null;
    if (!rPut.ok) {
      return NextResponse.json({ error: out?.error?.message || out?.message || txtPut || rPut.statusText }, { status: rPut.status });
    }

    return NextResponse.json(out);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
