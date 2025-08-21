
import { gcpAccessToken } from "../../../../lib/apigee";
import { requireSession } from "../../../../lib/auth";

export async function GET() {
  try { requireSession(); } catch { return new Response(JSON.stringify({ ok:false, error:'unauthorized' }), {status:401}); }
  try {
    const t = await gcpAccessToken();
    return Response.json({ ok:true, tokenPreview: t?.slice(0,12)+"..." });
  } catch (e:any) { return new Response(JSON.stringify({ ok:false, error: e.message || String(e) }), {status:500}); }
}
