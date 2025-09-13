// app/api/apis/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function readBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return String(process.env.GCP_USER_TOKEN);
  throw new Error("Token Google não encontrado (salve via UI ou configure GCP_USER_TOKEN).");
}

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const org = u.searchParams.get("org") || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });

    const bearer = await readBearer();
    const base = "https://apigee.googleapis.com/v1";
    const enc = encodeURIComponent;

    // Lista nomes das APIs (proxies)
    const r = await fetch(`${base}/organizations/${enc(org)}/apis`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    const txt = await r.text();
    const j = txt ? JSON.parse(txt) : null;
    if (!r.ok) {
      return NextResponse.json({ error: j?.error?.message || j?.message || txt || r.statusText }, { status: r.status });
    }
    // Apigee normalmente retorna array de nomes
    const names: string[] = Array.isArray(j) ? j : (j?.names ?? []);
    return NextResponse.json({ names: Array.isArray(names) ? names : [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
