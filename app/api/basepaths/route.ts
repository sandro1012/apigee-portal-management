// app/api/basepaths/route.ts
import { NextRequest, NextResponse } from "next/server";

// 1) Tenta usar seu util (se existir). Se não existir no build, seguimos sem ele.
let resolveAppFn: null | ((org: string) => Promise<{ accessToken?: string; managementBase?: string }>) = null;
try {
  // ajuste o caminho se você não usa alias "@"
  // Se seu projeto tem alias "@", pode usar: import resolveApp from "@/lib/util/resolveApp"
  // Aqui uso relativo para evitar problemas de alias em build:
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("../../lib/util/resolveApp");
  resolveAppFn = (mod?.default || mod?.resolveApp) as any;
} catch {
  resolveAppFn = null;
}

type BasepathDTO = { name: string; basePath: string; revision?: string };
type DeployItem = { apiProxy?: string; revision?: string | number; basePath?: string; environment?: string };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const org = searchParams.get("org");
    const env = searchParams.get("env");
    if (!org || !env) {
      return NextResponse.json({ error: "Missing org/env" }, { status: 400 });
    }

    // 2) Descobre base e token
    const envBase = process.env.APIGEE_BASE?.trim() || "https://apigee.googleapis.com";
    let accessToken = (process.env.APIGEE_TOKEN || "").trim();

    if (resolveAppFn) {
      try {
        const { accessToken: t, managementBase } = await resolveAppFn(org);
        accessToken = (t || accessToken || "").trim();
        // Se seu resolveApp devolver uma base customizada, respeita:
        if (managementBase) {
          // se vier algo tipo https://apigee.googleapis.com
          // sobrepõe apenas se não há APIGEE_BASE definido
        }
      } catch {
        // segue com APIGEE_TOKEN se existir
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "missing access token", hint: "Defina APIGEE_TOKEN na Vercel ou faça resolveApp(org) retornar accessToken." },
        { status: 401 }
      );
    }

    // 3) Chama deployments do env
    const url = `${envBase.replace(/\/+$/, "")}/v1/organizations/${encodeURIComponent(org)}/environments/${encodeURIComponent(env)}/deployments`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json({ error: "Apigee error", details: txt }, { status: r.status });
    }

    const json: any = await r.json();

    // 4) Normaliza
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

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}
