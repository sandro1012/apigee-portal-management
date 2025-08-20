import { gcpAccessToken } from "../../../../lib/apigee";

export async function GET() {
  try {
    const t = await gcpAccessToken();
    return Response.json({ ok:true, tokenPreview: t?.slice(0,12)+"..." });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, error: e.message || String(e) }), {status:500});
  }
}
