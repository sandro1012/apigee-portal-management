import { NextResponse } from "next/server";
import { readBearer } from "../../../../../lib/util/bearer";

export async function GET(req: Request) {
  try {
    const b = readBearer(req);
    // não retorna o token inteiro por segurança
    const masked = b.replace(/Bearer\s+([\w-]{4})[\w.-]+([\w-]{4})/, "Bearer $1...$2");
    return NextResponse.json({ ok: true, authorizationHeaderPreview: masked });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 401 });
  }
}
