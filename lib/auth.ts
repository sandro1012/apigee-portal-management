
import { cookies } from "next/headers";
import crypto from "crypto";

const DEFAULT_EXP_SECS = 60 * 60 * 8;

function getSecret() { return process.env.APP_SECRET || "dev_secret_change_me"; }
function b64u(input: Buffer | string) { return Buffer.from(input).toString("base64url"); }
function b64uJson(obj: any) { return b64u(Buffer.from(JSON.stringify(obj))); }
function parseB64uJson(s: string) { return JSON.parse(Buffer.from(s, "base64url").toString("utf8")); }

export function signSession(payload: Record<string, any>, expSec: number = DEFAULT_EXP_SECS) {
  const secret = getSecret(); const body = { ...payload, exp: Date.now() + expSec * 1000 };
  const b = b64uJson(body); const sig = crypto.createHmac("sha256", secret).update(b).digest("base64url");
  return `${b}.${sig}`;
}

export function verifySession(token: string) {
  const secret = getSecret(); const [b, sig] = token.split(".");
  if (!b || !sig) throw new Error("token inválido");
  const good = crypto.createHmac("sha256", secret).update(b).digest("base64url");
  if (good !== sig) throw new Error("assinatura inválida");
  const data = parseB64uJson(b);
  if (!data.exp || Date.now() > Number(data.exp)) throw new Error("expirado");
  return data;
}

export function getSessionCookie() { return cookies().get("session")?.value || ""; }
export function requireSession() { const t = getSessionCookie(); if (!t) throw new Error("unauthorized"); return verifySession(t); }
