import { cookies } from "next/headers";
import { requireSession } from "../../../lib/auth";

// Lê bearer do cookie ou da env var (fallback)
async function getBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return process.env.GCP_USER_TOKEN as string;
  throw new Error("Token Google não encontrado (salve via /ui/select ou configure GCP_USER_TOKEN).");
}

// GET: usado pela UI para listar products (com paginação via startKey)
export async function GET(req: Request) {
  // NÃO exigimos requireSession aqui para não bloquear a UI
  try {
    const { searchParams } = new URL(req.url);
    const org = searchParams.get("org");
    if (!org) return new Response(JSON.stringify({ error: "org obrigatório" }), { status: 400 });

    const token = await getBearer();

    let startKey: string | undefined = undefined;
    const items: any[] = [];

    for (let i = 0; i < 20; i++) {
      const url = new URL(`https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apiproducts`);
      url.searchParams.set("expand", "true");
      url.searchParams.set("count", "1000");
      if (startKey) url.searchParams.set("startKey", startKey);

      const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (!r.ok) {
        return new Response(JSON.stringify({ error: j.error?.message || r.statusText }), { status: r.status });
      }

      const list = j.apiProduct || j.apiProducts || j;
      items.push(...(Array.isArray(list) ? list : []));
      startKey = j.nextPageToken || j.next_key || j.startKey || undefined;
      if (!startKey) break;
    }

    return Response.json(items);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 });
  }
}

// POST: mantém o seu endpoint atual (se algum lugar do app precisar usar POST)
export async function POST(req: Request) {
  try { requireSession(); } catch { return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }); }
  try {
    const { org } = await req.json();
    if (!org) return new Response(JSON.stringify({ error: "org obrigatório" }), { status: 400 });

    const token = await getBearer();

    let startKey: string | undefined = undefined;
    const items: any[] = [];

    for (let i = 0; i < 20; i++) {
      const url = new URL(`https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apiproducts`);
      url.searchParams.set("expand", "true");
      url.searchParams.set("count", "1000"); // máximo permitido
      if (startKey) url.searchParams.set("startKey", startKey);

      const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (!r.ok) return new Response(JSON.stringify({ error: j.error?.message || r.statusText }), { status: r.status });

      const list = j.apiProduct || j.apiProducts || j;
      items.push(...(Array.isArray(list) ? list : []));
      startKey = j.nextPageToken || j.next_key || j.startKey || undefined;
      if (!startKey) break;
    }

    return Response.json(items);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 });
  }
}
