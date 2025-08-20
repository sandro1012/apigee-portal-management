import { exportKvm, diffKvm } from "../../../../lib/apigee";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { org, env, kvm, data } = await req.json();
    if (!org || !env || !kvm || !data) return new Response(JSON.stringify({error:"org/env/kvm/data requeridos"}), {status:400});
    const bearer = cookies().get("gcp_token")?.value;
    const current = await exportKvm(org, env, kvm, bearer);
    const diff = diffKvm(current, data);
    const counts = { add: diff.add.length, del: diff.del.length, chg: diff.chg.length };
    return Response.json({ ...diff, counts });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 });
  }
}
