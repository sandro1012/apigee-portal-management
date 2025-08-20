import { listKvms } from "@/lib/apigee";

export async function POST(req: Request) {
  const { org, env } = await req.json();
  if (!org || !env) return new Response(JSON.stringify({error:"org/env requeridos"}), {status:400});
  try {
    const names = await listKvms(org, env);
    return Response.json(names);
  } catch (e:any) {
    return new Response(JSON.stringify({error: e.message || String(e)}), {status:500});
  }
}