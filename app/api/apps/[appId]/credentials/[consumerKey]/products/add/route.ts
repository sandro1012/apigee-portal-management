import { NextResponse } from "next/server";
import { resolveDevAndApp } from "../../../../../../../../lib/util/resolveApp";

export async function POST(req: Request, { params }: { params: { appId: string, consumerKey: string } }) {
  try {
    const { org, appName, developerEmail, headers } = await resolveDevAndApp(req, params.appId);
    const body = await req.json().catch(() => ({}));
    const apiProduct = (body?.apiProduct || "").toString();
    if (!apiProduct) return NextResponse.json({ error: "apiProduct (string) é obrigatório" }, { status: 400 });

    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(developerEmail)}/apps/${encodeURIComponent(appName)}/keys/${encodeURIComponent(params.consumerKey)}/apiproducts`;

    const r = await fetch(url, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ apiproduct: apiProduct }),
    });
    const text = await r.text();
    if (!r.ok) return new NextResponse(text || JSON.stringify({ error: "Falha ao adicionar product" }), { status: r.status });

    return new NextResponse(text || "{}", { status: 200, headers: { "content-type": "application/json" } });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
