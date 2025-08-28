import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Criação de credencial desabilitada neste portal." }, { status: 405 });
}
