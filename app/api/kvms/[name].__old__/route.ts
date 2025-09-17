// app/api/kvms/[name]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return String(process.env.GCP_USER_TOKEN);
  throw new Error(
    "Token Google não encontrado (salve via UI ou configure GCP_USER_TOKEN)."
  );
}

function getOrgEnvFrom(req: Request) {
  const u = new URL(req.url);
  return {
    org: u.searchParams.get("org") || "",
    env: u.searchParams.get("env") || "",
  };
}

export async function DELETE(
  req: Request,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;
    if (!name) {
      return NextResponse.json({ error: "name obrigatório" }, { status: 400 });
    }

    // org/env podem vir na query ou no body (fallback)
    let { org, env } = getOrgEnvFrom(req);
    if (!org) {
      try {
        const b: any = await req.json();
        org = b?.org || org;
        env = b?.env || env;
      } catch {
        /* body vazio */
      }
    }
    if (!org) {
      return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    }

    const bearer = await getBearer();
    const base = "https://apigee.googleapis.com/v1";
    const enc = encodeURIComponent;

    const path = env
      ? `/organizations/${enc(org)}/environments/${enc(
          env
        )}/keyvaluemaps/${enc(name)}`
      : `/organizations/${enc(org)}/keyvaluemaps/${enc(name)}`;

    const r = await fetch(`${base}${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bearer}` },
    });

    const txt = await r.text();
    const j = txt ? JSON.parse(txt) : null;
    if (!r.ok) {
      return NextResponse.json(
        { error: j?.error?.message || j?.message || txt || r.statusText },
        { status: r.status }
      );
    }

    return NextResponse.json({
      ok: true,
      deleted: name,
      scope: env ? "environment" : "organization",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || String(e) },
      { status: 500 }
    );
  }
}
