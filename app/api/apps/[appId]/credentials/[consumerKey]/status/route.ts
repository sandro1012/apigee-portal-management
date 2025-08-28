// app/api/apps/[appId]/credentials/[consumerKey]/status/route.ts
import { NextResponse } from "next/server";
import { readBearer, resolveApp, buildKeyUrls } from "../../../../../../lib/util/resolveApp";

export async function POST(req: Request, ctx: { params: { appId: string; consumerKey: string } }) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const { action } = await req.json().catch(() => ({} as any));
    const status =
      action === "approve" ? "approved" : action === "revoke" ? "revoked" : undefined;
    if (!status) return NextResponse.json({ error: "action inválida (approve|revoke)" }, { status: 400 });

    const token = await readBearer();
    const owner = await resolveApp(org, ctx.params.appId, token);
    const attempts: string[] = [];
    const h = {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };

    for (const path of buildKeyUrls(org, owner, ctx.params.consumerKey)) {
      attempts.push(`https://apigee.googleapis.com${path}`);
      const r = await fetch(`https://apigee.googleapis.com${path}`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        return NextResponse.json(j);
      }
    }

    return NextResponse.json({ error: "Not Found", attempts }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
