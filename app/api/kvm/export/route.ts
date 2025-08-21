
import { exportKvm } from "../../../../lib/apigee";
import { cookies } from "next/headers";
import { requireSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  try { requireSession(); } catch { return new Response(JSON.stringify({error:"unauthorized"}), {status:401}); }
  const { org, env, kvm } = await req.json();
  if (!org || !env || !kvm) return new Response(JSON.stringify({error:"org/env/kvm requeridos"}), {status:400});
  try {
    const bearer = cookies().get("gcp_token")?.value;
    const data = await exportKvm(org, env, kvm, bearer);
    return Response.json(data);
  } catch (e:any) {
    return new Response(JSON.stringify({error: e.message || String(e)}), {status:500});
  }
}
