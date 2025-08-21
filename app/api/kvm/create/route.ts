import { createKvm, updateKvmToMatch } from "../../../lib/apigee";
import { cookies } from "next/headers";
import { requireSession } from "../../../lib/auth";
import { kvmSchema } from "../../../lib/schema/kvm";

export async function POST(req: Request) {
  try { requireSession(); } catch { return new Response(JSON.stringify({error:"unauthorized"}), {status:401}); }
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return new Response(JSON.stringify({error:"Envie multipart/form-data com o arquivo JSON obrigatório"}), {status:400});
    }
    const form = await req.formData();
    const org = String(form.get("org") || "");
    const env = String(form.get("env") || "");
    const kvm = String(form.get("kvm") || "");
    const encrypted = String(form.get("encrypted") || "true") === "true";
    const jsonStr = String(form.get("json") || "");

    if (!org || !env || !kvm) return new Response(JSON.stringify({error:"org/env/kvm requeridos"}), {status:400});
    if (!jsonStr) return new Response(JSON.stringify({error:"JSON obrigatório não enviado"}), {status:400});

    let data: unknown;
    try { data = JSON.parse(jsonStr); } catch { return new Response(JSON.stringify({error:"JSON inválido"}), {status:400}); }
    const parsed = kvmSchema.safeParse(data);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
      return new Response(JSON.stringify({error:"Schema inválido", issues}), {status:400});
    }

    const bearer = cookies().get("gcp_token")?.value;
    await createKvm(org, env, kvm, encrypted, bearer);
    if (parsed.data.keyValueEntries.length) await updateKvmToMatch(org, env, kvm, parsed.data, bearer);
    return Response.json({ ok:true });
  } catch (e:any) { return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 }); }
}
