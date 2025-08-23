import { NextResponse } from "next/server";

/**
 * Public token endpoint (no auth required).
 * POST { token, org } -> sets HttpOnly cookies (gcp_token, apigee_org)
 * DELETE -> clears cookies
 * GET -> health check
 */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const { token, org } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "missing token" }, { status: 400 });
    }
    const norm = /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`;

    const res = NextResponse.json({ ok: true });
    res.cookies.set("gcp_token", norm, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1h
    });
    if (org && typeof org === "string" && org.length) {
      res.cookies.set("apigee_org", org, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7d
      });
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "internal error" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("gcp_token", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  res.cookies.set("apigee_org", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
