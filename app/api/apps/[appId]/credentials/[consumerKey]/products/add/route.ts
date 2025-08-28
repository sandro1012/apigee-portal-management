// app/api/apps/[appId]/credentials/[consumerKey]/products/add/route.ts
import { NextResponse } from "next/server";
import { readBearer, resolveApp, buildKeyUrls } from "../../../../../../../lib/util/resolveApp";

export async function POST(req: Request, ctx: { params: { appId: string; consumerKey: string } }) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const prod: string | undefined = body.apiProduct || body.product;
    if (!prod) return NextResponse.json({ error: "apiProduct obrigatório" }, { status: 400 });

    const token = await readBearer();
    const owner = await resolveApp(org, ctx.params.appId, token);
    const attempts: { url: string; body: any; status?: number; text?: string }[] = [];

    const headers = {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };

    const tryBodies = [
      { apiProducts: [prod] }, // formato 1
      { apiProduct: prod },    // formato 2
    ];

    for (const basePath of buildKeyUrls(org, owner, ctx.params.consumerKey)) {
      const endpoint = `https://apigee.googleapis.com${basePath}/apiproducts`;
      for (const b of tryBodies) {
        const r = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(b) });
        attempts.push({ url: endpoint, body: b, status: r.status, text: await r.text().catch(()=> "") });
        if (r.ok) {
          const j = await r.json().catch(() => ({}));
          return NextResponse.json(j);
        }
      }
    }

    return NextResponse.json({ error: "Not Found", attempts }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
