// app/api/basepaths/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * Resposta simplificada:
 * [
 *   { name: "FibraOn_INTERNO" },
 *   { name: "Confinamento-v1" },
 *   ...
 * ]
 *
 * Observação: Não tenta descobrir basePath aqui (evita chamadas pesadas/lentas).
 * A UI deve aceitar basePath opcional. O objetivo é popular o combo imediatamente.
 */

type ProxyName = { name: string };

function mgmtBase() {
  return (process.env.APIGEE_BASE?.trim() || "https://apigee.googleapis.com").replace(/\/+$/, "");
}

function pickBearer(req: NextRequest): string | null {
  // 1) Authorization: Bearer ...
  const hdr = req.headers.get("authorization");
  if (hdr && /^Bearer\s+/i.test(hdr)) return hdr.replace(/^Bearer\s+/i, "").trim();

  // 2) Cookie gcp_token (gerado pelo /api/auth/token)
  const c = cookies();
  const fromCookie = c.get("gcp_token")?.value?.trim();
  if (fromCookie) return fromCookie;

  // 3) Env var (fallback)
  const fromEnv = process.env.APIGEE_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  return null;
}

// Faz GET na Apigee com header Authorization e também com ?access_token=... (igual ao seu curl)
async function apigeeGet(url: string, bearer: string) {
  const u = new URL(url);
  if (!u.searchParams.get("access_token")) {
    u.searchParams.set("access_token", bearer);
  }
  const r = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json, */*" },
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(JSON.stringify({ status: r.status, details: text }));
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const org = searchParams.get("org");
    const env = searchParams.get("env"); // mantemos para interface, mas não usamos aqui
    if (!org) {
      return NextResponse.json({ error: "Missing org" }, { status: 400 });
    }

    const bearer = pickBearer(req);
    if (!bearer) {
      return NextResponse.json(
        {
          error: "missing access token",
          hint: "Faça POST em /api/auth/token (gera cookie gcp_token), envie Authorization: Bearer <token>, ou configure APIGEE_TOKEN.",
        },
        { status: 401 }
      );
    }

    // Lista de APIs (igual ao curl que funciona pra você)
    const base = mgmtBase();
    const urlApis = `${base}/v1/organizations/${encodeURIComponent(org)}/apis`;
    const payload = await apigeeGet(urlApis, bearer);

    // O seu tenant retorna: { proxies: [{ name, apiProxyType }] }
    let names: string[] = [];
    if (payload && Array.isArray(payload.proxies)) {
      names = payload.proxies
        .map((p: any) => (p && typeof p.name === "string" ? p.name.trim() : ""))
        .filter(Boolean);
    } else if (Array.isArray(payload)) {
      // fallback (se algum dia vier array simples)
      names = payload
        .map((p: any) =>
          typeof p === "string" ? p.trim() : (p && typeof p.name === "string" ? p.name.trim() : "")
        )
        .filter(Boolean);
    }

    const uniq = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    const result: ProxyName[] = uniq.map((name) => ({ name }));

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    let msg = e?.message ?? "unexpected error";
    try {
      const parsed = JSON.parse(msg);
      return NextResponse.json({ error: "Apigee error", ...parsed }, { status: parsed.status || 500 });
    } catch {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }
}