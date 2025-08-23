import { NextResponse } from "next/server";
import { resolveDevAndApp } from "../../../../../lib/util/resolveApp";

export async function POST(req: Request, { params }: { params: { appId: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const { apiProducts, keyExpiresIn } = body as { apiProducts?: string[]; keyExpiresIn?: number };
    if (!apiProducts || !Array.isArray(apiProducts) || apiProducts.length === 0) {
      return NextResponse.json({ error: "apiProducts is required (non-empty array)" }, { status: 400 });
    }

    const { org, appName, developerEmail, headers } = await resolveDevAndApp(req, params.appId);

    const url = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(developerEmail)}/apps/${encodeURIComponent(appName)}/keys/create`;

    const payload: any = { apiProducts };
    if (typeof keyExpiresIn === "number") payload.keyExpiresIn = String(keyExpiresIn);

    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    const text = await r.text();
    if (!r.ok) return new NextResponse(text || JSON.stringify({ error: "create failed" }), { status: r.status });

    return new NextResponse(text, { status: 200, headers: { "content-type": "application/json" } });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
