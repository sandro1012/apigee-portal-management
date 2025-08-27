import { NextResponse } from "next/server";
import { resolveDevAndApp } from "../../../../../../../lib/util/resolveApp";

export async function POST(req: Request, { params }: { params: { appId: string, consumerKey: string } }) {
  try {
    const { org, appName, developerEmail, headers } = await resolveDevAndApp(req, params.appId);
    const body = await req.json().catch(() => ({}));
    const action = (body?.action || "").toString().toLowerCase();
    if (!["approve","revoke"].includes(action)) {
      return NextResponse.json({ error: "action deve ser 'approve' ou 'revoke'" }, { status: 400 });
    }
    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(developerEmail)}/apps/${encodeURIComponent(appName)}/keys/${encodeURIComponent(params.consumerKey)}?action=${encodeURIComponent(action)}`;
    const r = await fetch(url, { method: "POST", headers });
    const text = await r.text();
    if (!r.ok) return new NextResponse(text || JSON.stringify({ error: "Falha ao alterar status" }), { status: r.status });
    return new NextResponse(text || "{}", { status: 200, headers: { "content-type": "application/json" } });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
