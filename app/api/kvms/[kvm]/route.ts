// app/api/kvms/[kvm]/route.ts
import { NextResponse } from "next/server";
import { readBearer } from "../../../lib/util/resolveApp";

function getOrgEnvFrom(req: Request) {
  const u = new URL(req.url);
  const org = u.searchParams.get("org") || "";
  const env = u.searchParams.get("env") || "";
  return { org, env };
}

export async function DELETE(req: Request, { params }: { params: { kvm: string } }) {
  try {
    const { org, env } = getOrgEnvFrom(req);
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    if (!params?.kvm) return NextResponse.json({ error: "kvm obrigatório" }, { status: 400 });

    const bearer = await readBearer();
    const base = "https://apigee.googleapis.com/v1";
    const enc = encodeURIComponent;

    const path = env
      ? `/organizations/${enc(org)}/environments/${enc(env)}/keyvaluemaps/${enc(params.kvm)}`
      : `/organizations/${enc(org)}/keyvaluemaps/${enc(params.kvm)}`;

    const r = await fetch(`${base}${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bearer}` },
    });

    const txt = await r.text();
    if (!r.ok) {
      let j: any = null;
      try { j = txt ? JSON.parse(txt) : null; } catch {}
      const msg = j?.error?.message || j?.message || txt || r.statusText;
      return NextResponse.json({ error: msg }, { status: r.status });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
