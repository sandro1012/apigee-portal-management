// app/api/basepaths/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type BasepathDTO = { name: string; basePath: string; revision?: string };
type DeployItemEnv = { apiProxy?: string; revision?: string|number; basePath?: string; environment?: string };
type ApiDeployments = {
  deployments?: Array<{
    apiProxy?: string; // nome da API
    revision?: string | number;
    environment?: string;
  }>;
};

function getMgmtBase() {
  return (process.env.APIGEE_BASE?.trim() || "https://apigee.googleapis.com").replace(/\/+$/, "");
}

function pickBearer(req: NextRequest): string | null {
  // 1) Authorization header
  const hdr = req.headers.get("authorization");
  if (hdr && /^Bearer\s+/i.test(hdr)) return hdr.replace(/^Bearer\s+/i, "").trim();

  // 2) Cookie gcp_token
  const c = cookies();
  const fromCookie = c.get("gcp_token")?.value?.trim();
  if (fromCookie) return fromCookie;

  // 3) Env var (fallback)
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
  return r.json();
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
        { error: "missing access token", hint: "Faça POST em /api/auth/token (cookie gcp_token), ou envie Authorization: Bearer ..., ou configure APIGEE_TOKEN." },
        { status: 401 }
      );
    }

    const mgmtBase = getMgmtBase();

    // ====== TENTATIVA 1: deployments por ambiente ======
    // Em alguns tenants/hybrid isso vem vazio. Tentamos mesmo assim primeiro.
    try {
      const urlEnv = `${mgmtBase}/v1/organizations/${encodeURIComponent(org)}/environments/${encodeURIComponent(env)}/deployments`;
      const jsonEnv: any = await apigeeGet(urlEnv, bearer);
      const items: DeployItemEnv[] = [];
      if (Array.isArray(jsonEnv?.deployments)) items.push(...jsonEnv.deployments);
      else if (Array.isArray(jsonEnv)) items.push(...jsonEnv);

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
      const list = Array.from(map.values());
      if (list.length > 0) {
        list.sort((a, b) => (a.name + a.basePath).localeCompare(b.name + b.basePath));
        return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
      }
      // se caiu aqui: vazio -> tenta fallback
    } catch (e) {
      // se der erro nessa rota, seguimos com fallback
    }

    // ====== TENTATIVA 2 (FALLBACK): varrer APIs e descobrir basePath por revisão deployada ======
    // 2.1 lista de APIs
    const urlApis = `${mgmtBase}/v1/organizations/${encodeURIComponent(org)}/apis?expand=false`;
    const apis: string[] = await apigeeGet(urlApis, bearer); // retorna array de nomes

    const out: BasepathDTO[] = [];
    // Para controlar duplicatas name+basePath
    const seen = new Set<string>();

    // 2.2 para cada API, buscar deployments e filtrar por env
    for (const apiName of apis) {
      if (typeof apiName !== "string" || !apiName.trim()) continue;
      const api = apiName.trim();

      // deployments por API (não por ambiente)
      const urlApiDeps = `${mgmtBase}/v1/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(api)}/deployments`;
      let deps: ApiDeployments;
      try {
        deps = await apigeeGet(urlApiDeps, bearer);
      } catch (e) {
        // se uma API falhar, segue para a próxima
        continue;
      }

      const depList = Array.isArray(deps?.deployments) ? deps.deployments : [];
      // filtra revisões que estão no env solicitado
      const revsInEnv = depList
        .filter(d => String(d?.environment || "").trim() === env)
        .map(d => String(d?.revision || "").trim())
        .filter(Boolean);

      if (revsInEnv.length === 0) continue;

      // 2.3 para cada revisão deployada no env, descobrir os ProxyEndpoints e seus BasePaths
      for (const rev of revsInEnv) {
        // lista proxies (ProxyEndpoints) dessa revisão
        const urlPEs = `${mgmtBase}/v1/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(api)}/revisions/${encodeURIComponent(rev)}/proxies`;
        let proxyEndpoints: string[];
        try {
          proxyEndpoints = await apigeeGet(urlPEs, bearer); // array de nomes de ProxyEndpoint, ex: ["default"]
        } catch {
          continue;
        }

        for (const pe of proxyEndpoints) {
          if (typeof pe !== "string" || !pe.trim()) continue;
          const peName = pe.trim();

          // busca a configuração desse ProxyEndpoint (contém HTTPProxyConnection / BasePath)
          const urlPE = `${mgmtBase}/v1/organizations/${encodeURIComponent(org)}/apis/${encodeURIComponent(api)}/revisions/${encodeURIComponent(rev)}/proxies/${encodeURIComponent(peName)}`;
          let peConfig: any;
          try {
            peConfig = await apigeeGet(urlPE, bearer);
          } catch {
            continue;
          }

          // Procura por BasePath no objeto retornado.
          // O shape pode variar: muitos retornam XML como string; outros retornam JSON expandido.
          // Tentamos os casos comuns:
          let basePath = "";

          // Caso JSON expandido
          if (peConfig && typeof peConfig === "object") {
            // Alguns retornos têm HTTPProxyConnection.BasePath
            const httpConn = peConfig.HTTPProxyConnection || peConfig?.ProxyEndpoint?.HTTPProxyConnection;
            if (httpConn && typeof httpConn.BasePath === "string") {
              basePath = httpConn.BasePath;
            }
          }

          // Se ainda não achamos, pode ter vindo XML como string; tente extrair via RegExp
          if (!basePath && typeof peConfig === "string") {
            const m = peConfig.match(/<BasePath>([^<]+)<\/BasePath>/i);
            if (m) basePath = m[1];
          }

          basePath = String(basePath || "").trim();
          if (!basePath) continue;

          const key = `${api}:::${basePath}`;
          if (seen.has(key)) continue;
          seen.add(key);

          out.push({ name: api, basePath, revision: rev });
        }
      }
    }

    out.sort((a, b) => (a.name + a.basePath).localeCompare(b.name + b.basePath));
    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    // se jogamos erro com JSON de detalhes, preserve a mensagem
    let msg = e?.message ?? "unexpected error";
    try {
      const parsed = JSON.parse(msg);
      return NextResponse.json({ error: "Apigee error", ...parsed }, { status: parsed.status || 500 });
    } catch {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }
}
