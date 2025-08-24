import { cookies } from "next/headers";

/** Lê o token do cookie `gcp_token` OU do header Authorization do request. 
 *  Sempre retorna no formato `Bearer <token>` e evita `Bearer Bearer ...` */
export function readBearer(req: Request): string {
  const hdr = (req.headers.get("authorization") || "").trim();
  const c = (cookies().get("gcp_token")?.value || "").trim();
  let raw = hdr || c;
  if (!raw) throw new Error("unauthorized: missing token");
  // normaliza removendo prefixo se já existir
  if (raw.toLowerCase().startsWith("bearer ")) raw = raw.slice(7).trim();
  return `Bearer ${raw}`;
}
