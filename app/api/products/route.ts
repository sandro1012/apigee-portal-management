// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";

const APIGEE_BASE = process.env.APIGEE_BASE || "https://apigee.googleapis.com";

// Util: lê token do cookie gcp_token
function getToken(req: NextRequest): string | undefined {
  const c = req.cookies.get("gcp_token");
  return c?.value;
}

// Util: resposta JSON com no-store
function json(data: any, init?: number | ResponseInit) {
  const res = NextResponse.json(data, init as any);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

// ---- GET /api/products?org=ORG
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const org = searchParams.get("org") || "";
    if (!org) return json({ error: "org obrigatório" }, { status: 400 });

    const token = getToken(req);
    if (!token) return json({ error: "token ausente (faça /api/auth/token antes)" }, { status: 401 });

    const url = `${APIGEE_BASE}/v1/organizations/${encodeURIComponent(org)}/apiproducts`;
    const r = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    const text = await r.text();
    const body = text ? JSON.parse(text) : null;

    if (!r.ok) {
      return json(
        { error: "Apigee error", status: r.status, details: text },
        { status: r.status }
      );
    }

    // Apigee pode devolver array simples de nomes OU objetos, então repasso bruto.
    return json(body ?? []);
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, { status: 500 });
  }
}

// ---- POST /api/products?org=ORG
// Body esperado (qualquer campo opcional pode faltar):
// {
//   name: string (obrigatório, sem espaços; se vier com espaços a UI deve sanitizar)
//   displayName: string (obrigatório)
//   description: string (obrigatório)
//   approvalType?: "auto" | "manual"
//   environments?: string[]
//   scopes?: string[]
//   attributes?: Array<{ name: string; value: string }>
// }
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const org = searchParams.get("org") || "";
    if (!org) return json({ error: "org obrigatório" }, { status: 400 });

    const token = getToken(req);
    if (!token) return json({ error: "token ausente (faça /api/auth/token antes)" }, { status: 401 });

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, { status: 400 });
    }

    const name = String(body?.name || "").trim();
    const displayName = String(body?.displayName || "").trim();
    const description = String(body?.description || "").trim();

    if (!name || !displayName || !description) {
      return json({ error: "name, displayName e description são obrigatórios" }, { status: 400 });
    }

    // Monta payload exatamente como seu curl
    const payload: any = {
      name,
      displayName,
      description,
    };

    if (body?.approvalType) payload.approvalType = String(body.approvalType);
    if (Array.isArray(body?.environments) && body.environments.length) payload.environments = body.environments;
    if (Array.isArray(body?.scopes) && body.scopes.length) payload.scopes = body.scopes;

    // attributes: garantir access Public|Private se vier
    if (Array.isArray(body?.attributes)) {
      payload.attributes = body.attributes.map((a: any) => ({
        name: String(a?.name ?? ""),
        value: String(a?.value ?? ""),
      })).filter((a: any) => a.name);
    }

    const url = `${APIGEE_BASE}/v1/organizations/${encodeURIComponent(org)}/apiproducts`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      next: { revalidate: 0 },
    });

    const text = await r.text();
    const resp = text ? JSON.parse(text) : null;

    if (!r.ok) {
      return json(
        { error: "Apigee error", status: r.status, details: text },
        { status: r.status }
      );
    }

    // Criado com sucesso — devolve o objeto criado
    // (front pode em seguida chamar GET para atualizar a lista)
    return json(resp ?? { ok: true }, { status: 201 });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, { status: 500 });
  }
}
