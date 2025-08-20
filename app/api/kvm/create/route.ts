import { createKvm, updateKvmToMatch } from "../../../../lib/apigee";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      const body = await req.json().catch(()=>null);
      if (!body) return new Response(JSON.stringify({error:"Envie FormData (multipart) ou JSON com org/env/kvm/json"}), {status:400});
      const { org, env, kvm, encrypted = true, json } = body;
      if (!org || !env || !kvm) return new Response(JSON.stringify({error:"org/env/kvm requeridos"}), {status:400});
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      const bearer = cookies().get("gcp_token")?.value;
      await createKvm(org, env, kvm, !!encrypted, bearer);
      if (data?.keyValueEntries?.length) {
        await updateKvmToMatch(org, env, kvm, data, bearer);
      }
      return Response.json({ ok:true });
    }
    const form = await req.formData();
    const org = String(form.get("org") || "");
    const env = String(form.get("env") || "");
    const kvm = String(form.get("kvm") || "");
    const encrypted = String(form.get("encrypted") || "true") === "true";
    const jsonStr = String(form.get("json") || '{"keyValueEntries":[]}');
    if (!org || !env || !kvm) return new Response(JSON.stringify({error:"org/env/kvm requeridos"}), {status:400});
    const data = JSON.parse(jsonStr);
    const bearer = cookies().get("gcp_token")?.value;
    await createKvm(org, env, kvm, encrypted, bearer);
    if (data?.keyValueEntries?.length) {
      await updateKvmToMatch(org, env, kvm, data, bearer);
    }
    return Response.json({ ok:true });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 });
  }
}
