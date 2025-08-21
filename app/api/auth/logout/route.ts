
import { cookies } from "next/headers";
import { requireSession } from "../../../../lib/auth";

export async function GET() {
  try { requireSession(); } catch {}
  cookies().delete("session");
  return new Response(null, { status: 302, headers: { Location: "/login" }});
}
