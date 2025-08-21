
import { cookies } from "next/headers";
import { requireSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  try { requireSession(); } catch { return new Response(JSON.stringify({ ok:false, error:'unauthorized' }), { status: 401 }); }
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") return new Response(JSON.stringify({ ok:false, error: "token inválido" }), { status: 400 });
    cookies().set("gcp_token", token, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 59 * 60 });
    return Response.json({ ok: true });
  } catch (e:any) { return new Response(JSON.stringify({ ok:false, error: e.message || String(e) }), { status: 500 }); }
}
export async function DELETE() {
  try { requireSession(); } catch { return new Response(JSON.stringify({ ok:false, error:'unauthorized' }), { status: 401 }); }
  cookies().delete("gcp_token");
  return Response.json({ ok: true });
}
