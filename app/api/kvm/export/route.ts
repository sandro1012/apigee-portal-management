import { exportKvm } from "../../../../lib/apigee";
export async function POST(req: Request) {
  const { org, env, kvm } = await req.json();
  if (!org || !env || !kvm) return new Response(JSON.stringify({error:"org/env/kvm requeridos"}), {status:400});
  try {
    const data = await exportKvm(org, env, kvm);
    return Response.json(data);
  } catch (e:any) {
    return new Response(JSON.stringify({error: e.message || String(e)}), {status:500});
  }
}
