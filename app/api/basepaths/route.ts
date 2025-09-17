// app/api/basepaths/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type BasepathDTO = { name: string; basePath: string; revision?: string };
type ApiListResponse = { proxies?: Array<{ name?: string }>; /* outros campos ignorados */ };
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
  // 1) Authorization: Bearer ...
  const hdr = req.headers.get("authorization");
  if (hdr && /^Bearer\s+/i.test(hdr)) return hdr.replace(/^Bearer\s+/i, "").trim();
  // 2) Cookie gcp_token (setado pelo /api/auth/token)
  const c = cookies();
  const fromCookie = c.get("gcp_token")?.value?.trim();
  if (fromCookie) return fromCookie;
  // 3) Env var fallback
  const fromEnv = process.env.APIGEE_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  return null;
}

async function apigeeGet(url: string, bearer: string) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${bearer}` },
    cache: "no-store",
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(JSON.stringify({ status: r.status, details: txt }));
  }
  // Pode vir JSON ou XML (em alguns endpoints de proxy endpoint). Aqui assumimos JSON;
  // quem precisar de XML vai ser tratado mais abaixo em ponto específico.
  const ct = r.headers.get("content-type") || "";
  if (/xml/i.test(ct)) {
    const xml = await r.text();
    return xml as unknown as any;
  }
  return r.json();
}

// Extrai BasePath de payload (objeto JSON comum ou XML string)
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
          hint:
            "Faça POST em /api/auth/token (gera cookie gcp_token), " +
            "ou envie Authorization: Bearer <token>, " +
            "ou configure APIGEE_TOKEN.",
        },
        { status: 401 }
      );
    }

    const base = mgmtBase();

    // 1) Lista de APIs (sem expand) — shape esperado: { proxies: [{ name }] }
    const urlApis = `${base}/v1/organizations/${encodeURIComponent(org)}/apis`;
    const apisPayload = (await apigeeGet(urlApis, bearer)) as ApiListResponse;
    const apiNames: string[] = Array.isArray(apisPayload?.proxies)
      ? apisPayload.proxies
          .map((p) => (p && typeof p.name === "string" ? p.name.trim() : ""))
          .filter(Boolean)
      : [];

    const out: BasepathDTO[] = [];
    const seen = new Set<string>();

    // Para evitar estouro de chamadas simultâneas, fazemos pequenos lotes
    const chunk = async <T, R>(arr: T[], size: number, fn: (item: T) => Promise<R>) => {
      for (let i = 0; i < arr.length; i += size) {
        const part = arr.slice(i, i + size);
        await Promise.allSettled(part.map(fn));
      }
    };

    await chunk(apiNames, 5, async (api) => {
      // 2) Deployments da API
      const urlApiDeps = `${base}/v1/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(api)}/deployments`;
      let deps: ApiDeployments;
      try {
        deps = await apigeeGet(urlApiDeps, bearer);
      } catch {
        return;
      }
      const depList = Array.isArray(deps?.deployments) ? deps.deployments : [];
      const revsInEnv = depList
        .filter((d) => String(d?.environment || "").trim() === env)
        .map((d) => String(d?.revision || "").trim())
        .filter(Boolean);

      if (revsInEnv.length === 0) return;

      // 3) Para cada revisão deployada no env, descobrir os ProxyEndpoints e extrair BasePath
      for (const rev of revsInEnv) {
        // 3.1 lista de ProxyEndpoints (pode ser array simples ou {proxies:[{name}]})
        const urlPEs = `${base}/v1/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(api)}/revisions/${encodeURIComponent(rev)}/proxies`;
        let peList: any;
        try {
          peList = await apigeeGet(urlPEs, bearer);
        } catch {
          continue;
        }
        const proxyEndpointNames: string[] = Array.isArray(peList)
          ? peList.map((x) => (typeof x === "string" ? x : String(x?.name || ""))).filter(Boolean)
          : Array.isArray(peList?.proxies)
          ? peList.proxies
              .map((x: any) => (typeof x === "string" ? x : String(x?.name || "")))
              .filter(Boolean)
          : [];

        for (const peName of proxyEndpointNames) {
          const urlPE = `${base}/v1/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(api)}/revisions/${encodeURIComponent(rev)}/proxies/${encodeURIComponent(peName)}`;
          let peCfg: any;
          try {
            peCfg = await apigeeGet(urlPE, bearer);
          } catch {
            continue;
          }
          const basePath = extractBasePath(peCfg);
          if (!basePath) continue;

          const key = `${api}:::${basePath}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ name: api, basePath, revision: rev });
        }
      }
    });

    out.sort((a, b) => (a.name + a.basePath).localeCompare(b.name + b.basePath));
    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    // Se vier um erro encapsulado com {status, details}, repasse do jeito útil
    let msg = e?.message ?? "unexpected error";
    try {
      const parsed = JSON.parse(msg);
      return NextResponse.json({ error: "Apigee error", ...parsed }, { status: parsed.status || 500 });
    } catch {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }
}
