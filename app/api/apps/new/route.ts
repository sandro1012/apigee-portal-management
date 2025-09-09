// app/api/apps/new/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/** Lê o bearer do cookie gcp_token ou da env GCP_USER_TOKEN */
async function getBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return String(process.env.GCP_USER_TOKEN);
  throw new Error("Token Google não encontrado (salve via /ui/apps ou configure GCP_USER_TOKEN).");
}

type Attr = { name: string; value: string };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { org, name, devEmail, displayName, attributes } = body || {};

    // Requisitos: org, name, displayName, devEmail
    if (!org || !name || !displayName || !devEmail) {
      return NextResponse.json(
        { error: "Campos obrigatórios: org, name, displayName, devEmail." },
        { status: 400 }
      );
    }

    const bearer = await getBearer();
    const base = "https://apigee.googleapis.com/v1";

    // Normaliza attributes (opcionais). Remove linhas vazias e “Value” de placeholder.
    const attrs: Attr[] = Array.isArray(attributes)
      ? attributes
          .filter((a: any) => a && a.name != null)
          .map((a: any) => ({
            name: String(a.name).trim(),
            value: a.value == null ? "" : String(a.value).trim(),
          }))
          .filter((a: Attr) => a.name !== "" && a.value !== "" && a.value.toLowerCase() !== "value")
      : [];

    // Garante DisplayName
    if (!attrs.some((a) => a.name === "DisplayName")) {
      attrs.push({ name: "DisplayName", value: String(displayName) });
    }

    const url = `${base}/organizations/${encodeURIComponent(org)}/developers/${encodeURIComponent(
      devEmail
    )}/apps`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, attributes: attrs }),
    });

    const txt = await resp.text();
    const json = txt ? JSON.parse(txt) : null;

    if (!resp.ok) {
      return NextResponse.json(
        { error: json?.error?.message || json?.message || txt || resp.statusText },
        { status: resp.status }
      );
    }

    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
