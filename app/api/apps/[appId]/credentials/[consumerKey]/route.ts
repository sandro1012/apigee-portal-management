import { NextResponse } from "next/server";
import { resolveDevAndApp } from "../../../../../../lib/util/resolveApp";

export async function DELETE(req: Request, { params }: { params: { appId: string, consumerKey: string } }) {
  try {
    const { org, appName, developerEmail, headers } = await resolveDevAndApp(req, params.appId);
    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(developerEmail)}/apps/${encodeURIComponent(appName)}/keys/${encodeURIComponent(params.consumerKey)}`;
    const r = await fetch(url, { method: "DELETE", headers });
    const text = await r.text();
    if (!r.ok) return new NextResponse(text || JSON.stringify({ error: "Falha ao excluir credencial" }), { status: r.status });
    return new NextResponse(text || "{}", { status: 200, headers: { "content-type": "application/json" } });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
