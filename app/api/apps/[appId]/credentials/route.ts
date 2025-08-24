import { NextResponse } from "next/server";
import { resolveDevAndApp } from "../../../../../lib/util/resolveApp";

export async function POST(req: Request, { params }: { params: { appId: string } }) {
  try {
    const { org, appName, developerEmail, headers } = await resolveDevAndApp(req, params.appId);
    const body = await req.json().catch(() => ({}));
    const apiProducts: string[] = Array.isArray(body?.apiProducts) ? body.apiProducts : [];
    const keyExpiresIn: number | undefined = typeof body?.keyExpiresIn === "number" ? body.keyExpiresIn : undefined;
    if (apiProducts.length === 0) {
      return NextResponse.json({ error: "apiProducts (array) é obrigatório" }, { status: 400 });
    }

    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(developerEmail)}/apps/${encodeURIComponent(appName)}/keys/create`;

    const payload: any = { apiProducts };
    if (typeof keyExpiresIn === "number") payload.keyExpiresIn = keyExpiresIn;

    const r = await fetch(url, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    if (!r.ok) return new NextResponse(text || JSON.stringify({ error: "Falha ao criar credencial" }), { status: r.status });

    return new NextResponse(text, { status: 200, headers: { "content-type": "application/json" } });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
