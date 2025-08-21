import { updateKvmToMatch } from "../../../../lib/apigee";
import { cookies } from "next/headers";
import { requireSession } from "../../../../lib/auth";
import { kvmSchema } from "../../../../lib/schema/kvm";

export async function POST(req: Request) {
  try { requireSession(); } catch { return new Response(JSON.stringify({error:"unauthorized"}), {status:401}); }
  try {
    const { org, env, kvm, data } = await req.json();
    if (!org || !env || !kvm) return new Response(JSON.stringify({error:"org/env/kvm requeridos"}), {status:400});

    const parsed = kvmSchema.safeParse(data);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
      return new Response(JSON.stringify({error:"Schema inválido", issues}), {status:400});
    }

    const bearer = cookies().get("gcp_token")?.value;
    const res = await updateKvmToMatch(org, env, kvm, parsed.data, bearer);
    return Response.json(res);
  } catch (e:any) { return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 }); }
}
