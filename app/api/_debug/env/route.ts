
import { requireSession } from "../../../../lib/auth";

export async function GET() {
  try { requireSession(); } catch { return new Response(JSON.stringify({ hasSa:false, error:"unauthorized" }), {status:401}); }
  try {
    const b64 = process.env.GCP_SA_JSON_BASE64;
    if (!b64) return new Response(JSON.stringify({ hasSa:false, error:"GCP_SA_JSON_BASE64 not set" }), {status:500});
    const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    return Response.json({ hasSa:true, client_email: sa.client_email, project_id: sa.project_id });
  } catch (e:any) { return new Response(JSON.stringify({ hasSa:false, error: e.message || String(e) }), {status:500}); }
}
