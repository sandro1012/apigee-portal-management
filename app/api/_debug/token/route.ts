import { cookies } from "next/headers";

export async function GET() {
  const v = cookies().get("gcp_token")?.value;
  const has = !!v;
  const preview = v ? (v.slice(0, 8) + "…" + v.slice(-6)) : null;
  return new Response(JSON.stringify({ hasToken: has, tokenPreview: preview }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
