import { NextResponse } from "next/server";
import { resolveAppInfo } from "../../../../../../lib/util/resolveApp";

export async function POST(req: Request, { params }: { params: { appId: string, consumerKey: string } }) {
  try {
    const { appId, consumerKey } = params;
    const urlObj = new URL(req.url);
    const org = urlObj.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    const body = await req.json().catch(()=>({}));
    const action: string = (body.action || "").toString().toLowerCase();
    if (!["approve","revoke"].includes(action)) {
      return NextResponse.json({ error: "action inválida (approve|revoke)" }, { status: 400 });
    }

    const { base, auth, info } = await resolveAppInfo(req, org, appId);
    const tries: string[] = [];
    if (info.devEmail) tries.push(`${base}/developers/${encodeURIComponent(info.devEmail)}/apps/${encodeURIComponent(info.name)}/keys/${encodeURIComponent(consumerKey)}`);
    if (info.companyName) tries.push(`${base}/companies/${encodeURIComponent(info.companyName)}/apps/${encodeURIComponent(info.name)}/keys/${encodeURIComponent(consumerKey)}`);
    if (tries.length===0) return NextResponse.json({ error: "Não foi possível resolver developer/company do app." }, { status: 400 });

    let lastErr: any = null;
    for (const u of tries) {
      // 1) Tenta corpo JSON {status:"approved|revoked"}
      const r1 = await fetch(u, { method: "POST", headers: { Authorization: auth, "content-type":"application/json" }, body: JSON.stringify({ status: action==="approve" ? "approved" : "revoked" }) });
      if (r1.ok) return NextResponse.json(await r1.json().catch(()=>({ ok:true })));
      // 2) Fallback estilo action=approve
      const u2 = `${u}?action=${action}`;
      const r2 = await fetch(u2, { method: "POST", headers: { Authorization: auth } });
      if (r2.ok) return NextResponse.json(await r2.json().catch(()=>({ ok:true })));
      lastErr = await r2.text().catch(()=>r2.statusText);
    }

    return NextResponse.json({ error: lastErr || "Falha ao atualizar status" }, { status: 400 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
