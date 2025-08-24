import { NextResponse } from "next/server";
import { resolveDevAndApp } from "../../../../../../../../../lib/util/resolveApp";

export async function POST(req: Request, { params }: { params: { appId: string, consumerKey: string } }) {
  try {
    const { apiProduct } = await req.json();
    if (!apiProduct || typeof apiProduct !== "string") {
      return NextResponse.json({ error: "apiProduct (string) é obrigatório" }, { status: 400 });
    }

    const { org, appName, developerEmail, headers } = await resolveDevAndApp(req, params.appId);

    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(developerEmail)}/apps/${encodeURIComponent(appName)}/keys/${encodeURIComponent(params.consumerKey)}`;

    const body = { apiProducts: [apiProduct] };
    const r = await fetch(url, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const text = await r.text();
    if (!r.ok) return new NextResponse(text || JSON.stringify({ error: "falha ao adicionar product" }), { status: r.status });

    return new NextResponse(text, { status: 200, headers: { "content-type": "application/json" } });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
