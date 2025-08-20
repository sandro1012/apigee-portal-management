import { listKvms } from "../../../lib/apigee";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { org, env } = await req.json();
  if (!org || !env) return new Response(JSON.stringify({error:"org/env requeridos"}), {status:400});
  try {
    const bearer = cookies().get("gcp_token")?.value;
    const names = await listKvms(org, env, bearer);
    return Response.json(names);
  } catch (e:any) {
    return new Response(JSON.stringify({error: e.message || String(e)}), {status:500});
  }
}
