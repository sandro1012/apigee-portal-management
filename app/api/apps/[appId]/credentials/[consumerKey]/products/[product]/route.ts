import { NextResponse } from "next/server";
import { resolveDevAndApp } from "../../../../../../../lib/util/resolveApp";

// Removes an API Product association from a Key
export async function DELETE(req: Request, { params }: { params: { appId: string, consumerKey: string, product: string } }) {
  try {
    const { org, appName, developerEmail, headers } = await resolveDevAndApp(req, params.appId);

    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(developerEmail)}/apps/${encodeURIComponent(appName)}/keys/${encodeURIComponent(params.consumerKey)}/apiproducts/${encodeURIComponent(params.product)}`;

    const r = await fetch(url, { method: "DELETE", headers });
    const text = await r.text();
    if (!r.ok) return new NextResponse(text || JSON.stringify({ error: "falha ao remover product" }), { status: r.status });

    return new NextResponse(text || "{}", { status: 200, headers: { "content-type": "application/json" } });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
