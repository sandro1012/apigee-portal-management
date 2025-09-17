// app/api/basepaths/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type BasepathDTO = { name: string; basePath: string; revision?: string };
type DeployItem = { apiProxy?: string; revision?: string|number; basePath?: string; environment?: string };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const org = searchParams.get("org");
    const env = searchParams.get("env");
    if (!org || !env) {
      return NextResponse.json({ error: "Missing org/env" }, { status: 400 });
    }

    const mgmtBase = (process.env.APIGEE_BASE?.trim() || "https://apigee.googleapis.com").replace(/\/+$/, "");
    const url = `${mgmtBase}/v1/organizations/${encodeURIComponent(org)}/environments/${encodeURIComponent(env)}/deployments`;

    // ===== Token sources (ordem de prioridade) =====
    // 1) Authorization header (se já veio)
    let bearer = "";
    const hdr = req.headers.get("authorization");
    if (hdr && /^Bearer\s+/i.test(hdr)) bearer = hdr.replace(/^Bearer\s+/i, "").trim();

    // 2) Cookie gcp_token (definido pelo seu /api/auth/token)
    if (!bearer) {
      const c = cookies();
      const fromCookie = c.get("gcp_token")?.value?.trim();
      if (fromCookie) bearer = fromCookie;
    }

    // 3) Variável de ambiente (fallback)
    if (!bearer) {
      const fromEnv = process.env.APIGEE_TOKEN?.trim();
      if (fromEnv) bearer = fromEnv;
    }

    if (!bearer) {
      return NextResponse.json(
        { error: "missing access token", hint: "Faça POST em /api/auth/token (ou envie Authorization: Bearer ..., ou configure APIGEE_TOKEN)." },
        { status: 401 }
      );
    }

    // ===== Chamada à Management API =====
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${bearer}` },
      cache: "no-store",
    });

    if (!r.ok) {
      const txt = await r.text();
      // Repasse o status e detalhes para depuração (sem expor o token)
      return NextResponse.json({ error: "Apigee error", status: r.status, details: txt }, { status: r.status });
    }

    const json: any = await r.json();

    // ===== Normalização =====
    const items: DeployItem[] = [];
    if (Array.isArray(json?.deployments)) items.push(...json.deployments);
    else if (Array.isArray(json)) items.push(...json);

    const map = new Map<string, BasepathDTO>();
    for (const d of items) {
      const name = String(d?.apiProxy ?? "").trim();
      const basePath = String(d?.basePath ?? "").trim();
      if (!name || !basePath) continue;
      const key = `${name}:::${basePath}`;
      if (!map.has(key)) {
        map.set(key, {
          name,
          basePath,
          revision: d?.revision ? String(d.revision) : undefined,
        });
      }
    }

    const out = Array.from(map.values()).sort((a, b) =>
      (a.name + a.basePath).localeCompare(b.name + b.basePath)
    );

    return NextResponse.json(out, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}
