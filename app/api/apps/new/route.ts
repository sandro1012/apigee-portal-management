import { NextResponse } from "next/server";
import { readBearer } from "../../../../lib/util/bearer";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { org, name, devEmail, displayName, attributes } = body || {};

    if (!org || !name || !devEmail || !displayName) {
      return NextResponse.json(
        { error: "Campos obrigatórios: org, name, displayName, devEmail." },
        { status: 400 }
      );
    }

    const bearer = await readBearer();
    const base = "https://apigee.googleapis.com/v1";

    // monta attributes, garantindo DisplayName
    const attrs: { name: string; value: string }[] = Array.isArray(attributes)
      ? attributes.filter((a: any) => a && a.name && typeof a.value !== "undefined")
      : [];
    if (!attrs.some(a => a.name === "DisplayName")) {
      attrs.push({ name: "DisplayName", value: String(displayName) });
    }

    const resp = await fetch(
      `${base}/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(devEmail)}/apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, attributes: attrs }),
      }
    );

    const text = await resp.text();
    const json = text ? JSON.parse(text) : null;
    if (!resp.ok) {
      return NextResponse.json(
        { error: json?.error?.message || json?.message || text || resp.statusText },
        { status: resp.status }
      );
    }
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
