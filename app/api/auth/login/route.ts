
import { cookies } from "next/headers";
import { signSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const { user, pass } = await req.json();
    const u = process.env.ADMIN_USER || "admin";
    const p = process.env.ADMIN_PASS || "admin";
    if (user !== u || pass !== p) return new Response(JSON.stringify({ error: "Usuário ou senha inválidos." }), { status: 401 });
    const token = signSession({ user });
    cookies().set("session", token, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 60 * 60 * 8 });
    return Response.json({ ok: true });
  } catch (e:any) { return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 }); }
}
