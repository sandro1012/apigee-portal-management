import { diffKvm } from "@/lib/apigee";

export async function POST(req: Request) {
  const { before, after } = await req.json();
  if (!before || !after) return new Response(JSON.stringify({error:"before/after requeridos"}), {status:400});
  try {
    const diff = diffKvm(before, after);
    return Response.json(diff);
  } catch (e:any) {
    return new Response(JSON.stringify({error: e.message || String(e)}), {status:500});
  }
}