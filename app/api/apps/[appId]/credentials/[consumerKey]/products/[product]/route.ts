import { NextResponse } from "next/server";
import { resolveAppInfo } from "../../../../../../../../lib/util/resolveApp";

export async function DELETE(req: Request, { params }: { params: { appId: string, consumerKey: string, product: string } }) {
  try {
    const { appId, consumerKey, product } = params;
    const urlObj = new URL(req.url);
    const org = urlObj.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const { base, auth, info } = await resolveAppInfo(req, org, appId);
    const tries: string[] = [];
    if (info.devEmail) tries.push(`${base}/developers/${encodeURIComponent(info.devEmail)}/apps/${encodeURIComponent(info.name)}/keys/${encodeURIComponent(consumerKey)}/apiproducts/${encodeURIComponent(product)}`);
    if (info.companyName) tries.push(`${base}/companies/${encodeURIComponent(info.companyName)}/apps/${encodeURIComponent(info.name)}/keys/${encodeURIComponent(consumerKey)}/apiproducts/${encodeURIComponent(product)}`);

    let lastErr: any = null;
    for (const u of tries) {
      const r = await fetch(u, { method: "DELETE", headers: { Authorization: auth } });
      if (r.ok) return NextResponse.json(await r.json().catch(()=>({ ok:true })));
      lastErr = await r.text().catch(()=>r.statusText);
    }
    return NextResponse.json({ error: lastErr || "Falha ao remover product" }, { status: 400 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
