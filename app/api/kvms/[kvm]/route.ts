// app/api/kvms/[kvm]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function readBearer(): Promise<string> {
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

export async function DELETE(req: Request, { params }: { params: { kvm: string } }) {
  try {
    const { org, env } = getOrgEnvFrom(req);
    const kvm = params?.kvm || "";
    if (!org) return NextResponse.json({ error: "org obrigatório" }, { status: 400 });
    if (!kvm) return NextResponse.json({ error: "kvm obrigatório" }, { status: 400 });

    const bearer = await readBearer();
    const base = "https://apigee.googleapis.com/v1";
    const enc = encodeURIComponent;

    // Tentativas: primeiro no nível environment (se informado), depois org-level.
    const tries: string[] = [];
    if (env) tries.push(`${base}/organizations/${enc(org)}/environments/${enc(env)}/keyvaluemaps/${enc(kvm)}`);
    tries.push(`${base}/organizations/${enc(org)}/keyvaluemaps/${enc(kvm)}`);

    let lastErrTxt = "";
    let lastStatus = 500;

    for (const url of tries) {
      const r = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${bearer}` },
      });

      if (r.ok || r.status === 204) {
        return NextResponse.json({ ok: true, deleted: kvm, used: url, attempts: tries });
      }

      lastStatus = r.status;
      lastErrTxt = await r.text().catch(() => r.statusText);
    }

    // Nenhuma tentativa deu certo
    let errorMsg = "Falha ao excluir KVM.";
    try {
      const j = lastErrTxt ? JSON.parse(lastErrTxt) : null;
      errorMsg = j?.error?.message || j?.message || lastErrTxt || errorMsg;
    } catch {
      // mantém errorMsg
    }

    // Se todas deram 404, devolve 404; senão 400/500 conforme último status
    const status = lastStatus === 404 ? 404 : (lastStatus >= 400 && lastStatus < 600 ? lastStatus : 400);
    return NextResponse.json({ error: errorMsg, attempts: tries }, { status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
