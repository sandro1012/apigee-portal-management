// app/api/basepaths/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type BasepathDTO = { name: string; basePath: string; revision?: string };
type ApiListResponse = { proxies?: Array<{ name?: string }> };
type ApiDeployments = {
  deployments?: Array<{
    apiProxy?: string;
    revision?: string | number;
    environment?: string;
  }>;
};

function mgmtBase() {
  return (process.env.APIGEE_BASE?.trim() || "https://apigee.googleapis.com").replace(/\/+$/, "");
}

function pickBearer(req: NextRequest): string | null {
  const hdr = req.headers.get("authorization");
  if (hdr && /^Bearer\s+/i.test(hdr)) return hdr.replace(/^Bearer\s+/i, "").trim();
  const c = cookies();
  const fromCookie = c.get("gcp_token")?.value?.trim();
  if (fromCookie) return fromCookie;
  const fromEnv = process.env.APIGEE_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  return null;
}

// Acrescenta access_token=... na URL (mantendo querys existentes), além do header Authorization.
function withAccessToken(url: string, token: string) {
  const u = new URL(url);
  if (!u.searchParams.get("access_token")) {
    u.searchParams.set("access_token", token);
  }
  return u.toString();
}

async function apigeeGet(url: string, bearer: string) {
  const finalUrl = withAccessToken(url, bearer);
  const r = await fetch(finalUrl, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: "application/json, */*",
    },
    cache: "no-store",
  });
  const ct = r.headers.get("content-type") || "";
  const text = await r.text();
  if (!r.ok) {
    throw new Error(JSON.stringify({ status: r.status, details: text }));
  }
  // alguns endpoints retornam JSON, outros podem retornar XML; tentamos JSON e caímos para string
  try {
    if (/json/i.test(ct) || text.trim().startsWith("{") || text.trim().startsWith("[")) {
      return JSON.parse(text);
    }
  } catch {}
  return text; // XML ou outro formato
}

function extractBasePath(payload: any): string {
  let basePath = "";
  if (payload && typeof payload === "object") {
    const httpConn =
      payload.HTTPProxyConnection ||
      payload?.ProxyEndpoint?.HTTPProxyConnection ||
      null;
    if (httpConn && typeof httpConn.BasePath === "string") {
      basePath = httpConn.BasePath;
    }
  }
  if (!basePath && typeof payload === "string") {
    const m = payload.match(/<BasePath>([^<]+)<\/BasePath>/i);
    if (m) basePath = m[1];
  }
  return (basePath || "").trim();
}

export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get("debug") === "1";
  const dbg: any = { steps: [] };

  try {
    const { searchParams } = new URL(req.url);
    const org = searchParams.get("org");
    const env = searchParams.get("env");
    if (!org || !env) {
      return NextResponse.json({ error: "Missing org/env" }, { status: 400 });
    }

    const bearer = pickBearer(req);
    if (!bearer) {
      return NextResponse.json(
        {
          error: "missing access token",
          hint: "POST /api/auth/token (gera cookie gcp_token), ou envie Authorization: Bearer <token>, ou configure APIGEE_TOKEN.",
        },
        { status: 401 }
      );
    }

    const base = mgmtBase();

    // 1) Lista de APIs (sem expand) — no seu CURL este endpoint funciona
    const urlApis = `${base}/v1/organizations/${encodeURIComponent(org)}/apis`;
    const apisPayload = (await apigeeGet(urlApis, bearer)) as ApiListResponse | any[];
    let apiNames: string[] = [];

    if (Array.isArray(apisPayload)) {
      // alguns tenants podem devolver array direto de strings/objetos
      apiNames = apisPayload
        .map((p: any) =>
          typeof p === "string" ? p.trim() : (p && typeof p.name === "string" ? p.name.trim() : "")
        )
        .filter(Boolean);
    } else if (apisPayload && Array.isArray(apisPayload.proxies)) {
      apiNames = apisPayload.proxies
        .map((p) => (p && typeof p.name === "string" ? p.name.trim() : ""))
        .filter(Boolean);
    }

    if (debug) dbg.steps.push({ step: "apis", count: apiNames.length, sample: apiNames.slice(0, 5) });

    const out: BasepathDTO[] = [];
    const seen = new Set<string>();

    // 2) Para cada API, buscar deployments e filtrar as revisões do env
    for (const api of apiNames) {
      const urlApiDeps = `${base}/v1/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(api)}/deployments`;
      let deps: ApiDeployments;
      try {
        deps = await apigeeGet(urlApiDeps, bearer);
      } catch (e: any) {
        if (debug) dbg.steps.push({ step: "deployments_error", api, error: e?.message });
        continue;
      }
      const depList = Array.isArray(deps?.deployments) ? deps.deployments : [];
      const revsInEnv = depList
        .filter((d) => String(d?.environment || "").trim() === env)
        .map((d) => String(d?.revision || "").trim())
        .filter(Boolean);

      if (debug) dbg.steps.push({ step: "deployments", api, revsInEnv });

      if (revsInEnv.length === 0) continue;

      // 3) Para cada revisão, descobrir proxy endpoints e extrair BasePath
      for (const rev of revsInEnv) {
        const urlPEs = `${base}/v1/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(api)}/revisions/${encodeURIComponent(rev)}/proxies`;
        let peList: any;
        try {
          peList = await apigeeGet(urlPEs, bearer);
        } catch (e: any) {
          if (debug) dbg.steps.push({ step: "proxy_list_error", api, rev, error: e?.message });
          continue;
        }

        const proxyEndpointNames: string[] = Array.isArray(peList)
          ? peList.map((x: any) => (typeof x === "string" ? x : String(x?.name || ""))).filter(Boolean)
          : Array.isArray(peList?.proxies)
          ? peList.proxies
              .map((x: any) => (typeof x === "string" ? x : String(x?.name || "")))
              .filter(Boolean)
          : [];

        if (debug) dbg.steps.push({ step: "proxy_list", api, rev, proxyEndpointNames });

        for (const peName of proxyEndpointNames) {
          const urlPE = `${base}/v1/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(api)}/revisions/${encodeURIComponent(rev)}/proxies/${encodeURIComponent(peName)}`;
          let peCfg: any;
          try {
            peCfg = await apigeeGet(urlPE, bearer);
          } catch (e: any) {
            if (debug) dbg.steps.push({ step: "proxy_cfg_error", api, rev, peName, error: e?.message });
            continue;
          }
          const basePath = extractBasePath(peCfg);
          if (!basePath) {
            if (debug) dbg.steps.push({ step: "no_basepath_found", api, rev, peName, snippet: typeof peCfg === "string" ? peCfg.slice(0, 200) : Object.keys(peCfg || {}) });
            continue;
          }

          const key = `${api}:::${basePath}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ name: api, basePath, revision: rev });
        }
      }
    }

    out.sort((a, b) => (a.name + a.basePath).localeCompare(b.name + b.basePath));

    if (debug) {
      return NextResponse.json(
        { debug: dbg, resultCount: out.length, sample: out.slice(0, 10), result: out },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
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
