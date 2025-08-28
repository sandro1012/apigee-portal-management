import { NextResponse } from "next/server";
import { resolveAppInfo } from "../../../../../../../lib/util/resolveApp";

export async function POST(req: Request, { params }: { params: { appId: string, consumerKey: string } }) {
  try {
    const { appId, consumerKey } = params;
    const urlObj = new URL(req.url);
    const org = urlObj.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    const body = await req.json().catch(()=>({}));
    const apiProduct = (body.apiProduct || "").toString();
    if (!apiProduct) return NextResponse.json({ error: "apiProduct obrigatório" }, { status: 400 });

    const { base, auth, info } = await resolveAppInfo(req, org, appId);
    const tries: string[] = [];
    if (info.devEmail) tries.push(`${base}/developers/${encodeURIComponent(info.devEmail)}/apps/${encodeURIComponent(info.name)}/keys/${encodeURIComponent(consumerKey)}/apiproducts/${encodeURIComponent(apiProduct)}?action=approve`);
    if (info.companyName) tries.push(`${base}/companies/${encodeURIComponent(info.companyName)}/apps/${encodeURIComponent(info.name)}/keys/${encodeURIComponent(consumerKey)}/apiproducts/${encodeURIComponent(apiProduct)}?action=approve`);

    let lastErr: any = null;
    for (const u of tries) {
      const r = await fetch(u, { method: "POST", headers: { Authorization: auth } });
      if (r.ok) return NextResponse.json(await r.json().catch(()=>({ ok:true })));
      lastErr = await r.text().catch(()=>r.statusText);
    }
    return NextResponse.json({ error: lastErr || "Falha ao adicionar product" }, { status: 400 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
