
import { updateKvmToMatch } from "../../../../lib/apigee";
import { cookies } from "next/headers";
import { requireSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  try { requireSession(); } catch { return new Response(JSON.stringify({error:"unauthorized"}), {status:401}); }
  try {
    const { org, env, kvm, data } = await req.json();
    if (!org || !env || !kvm || !data) return new Response(JSON.stringify({error:"org/env/kvm/data requeridos"}), {status:400});
    const bearer = cookies().get("gcp_token")?.value;
    const res = await updateKvmToMatch(org, env, kvm, data, bearer);
    return Response.json({ ok:true, ...res });
  } catch (e:any) { return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 }); }
}
