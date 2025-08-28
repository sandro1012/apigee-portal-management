import { NextResponse } from "next/server";
import { readBearer } from "../../../../lib/util/bearer";

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
