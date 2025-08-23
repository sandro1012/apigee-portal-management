import { cookies, headers } from "next/headers";

export function getBearer(): string {
  const h = headers();
  const c = cookies();
  const raw = c.get("gcp_token")?.value || h.get("x-apigee-token") || h.get("authorization") || "";
  if (!raw) return "";
  return raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;
}

export function getOrg(): string {
  const h = headers();
  const c = cookies();
  return h.get("x-apigee-org") || c.get("apigee_org")?.value || process.env.APIGEE_ORG || "";
}
