// app/api/kvms/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return String(process.env.GCP_USER_TOKEN);
  throw new Error("Token Google não encontrado (salve via UI ou configure GCP_USER_TOKEN).");
}

function getOrgEnvFrom(req: Request) {
  const u = new URL(req.url);
  const org = u.searchParams.get("org") || "";
  const env = u.searchParams.get("env") || "";
  return { org, env };
}

async function listKvms(org: string, env?: string) {
  const bearer = await getBearer();
  const base = "https://apigee.googleapis.com/v1";
  const enc = encodeURIComponent;

  const path = env
    ? `/organizations/${enc(org)}/environments/${enc(env)}/keyvaluemaps`
    : `/organizations/${enc(org)}/keyvaluemaps`;

  const r = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  const txt = await r.text();
  const j = txt ? JSON.parse(txt) : null;
  if (!r.ok) throw new Error(j?.error?.message || j?.message || txt || r.statusText);

  // Apigee X costuma devolver { keyValueMaps: [{name,...}, ...] } ou, em alguns tenants, só array de nomes
  const raw = j?.keyValueMaps ?? j?.keyvaluemaps ?? j?.names ?? j;
  const arr = Array.isArray(raw) ? raw : [];
  const names = arr.map((x: any) => (typeof x === "string" ? x : x?.name)).filter(Boolean);
  return names as string[];
}

export async function GET(req: Request) {
  try {
    const { org, env } = getOrgEnvFrom(req);
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    const names = await listKvms(org, env || undefined);
    return NextResponse.json({ names });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let { org, env } = { org: "", env: "" };
    try {
      const b = await req.json();
      org = b?.org || "";
      env = b?.env || "";
    } catch {}
    if (!org) {
      // fallback para querystring
      const q = getOrgEnvFrom(req);
      org = org || q.org;
      env = env || q.env;
    }
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    const names = await listKvms(org, env || undefined);
    return NextResponse.json({ names });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
