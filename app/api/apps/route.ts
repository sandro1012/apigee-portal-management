import { NextResponse } from "next/server";
import { readBearer } from "../../../lib/util/bearer";

export async function POST(req: Request) {
  try {
    const { org } = await req.json();
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    const auth = readBearer(req);

    const items: any[] = [];
    let startKey: string | undefined = undefined;
    // Pagina até 50k itens (seguro)
    for (let i=0; i<50; i++) {
      const url = new URL(`https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apps`);
      url.searchParams.set("expand", "true");
      url.searchParams.set("count", "1000");
      if (startKey) url.searchParams.set("startKey", startKey);
      const r = await fetch(url.toString(), { headers: { Authorization: auth } });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) {
        const msg = (j?.error?.message || r.statusText || "Erro ao listar apps");
        return NextResponse.json({ error: msg }, { status: r.status });
      }
      const arr = Array.isArray(j) ? j : (j.app || j.apps || j.developerApps || j.application || []);
      items.push(...(Array.isArray(arr) ? arr : []));
      startKey = j.nextPageToken || j.next_key || j.startKey || undefined;
      if (!startKey) break;
    }

    // Normaliza saída mínima
    const out = items.map((it:any) => ({
      appId: it.appId || it.app_id || it.id || "",
      name: it.name || it.displayName || "",
      developerEmail: it.developerEmail || it.developerId || "",
      status: it.status || "",
      createdAt: it.createdAt,
      lastModifiedAt: it.lastModifiedAt,
    }));
    return NextResponse.json(out);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
