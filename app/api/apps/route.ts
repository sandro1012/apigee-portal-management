import { cookies } from "next/headers";

async function getBearer(): Promise<string> {
  const c = cookies().get("gcp_token")?.value;
  if (c) return c;
  if (process.env.GCP_USER_TOKEN) return String(process.env.GCP_USER_TOKEN);
  throw new Error("Token Google não encontrado (salve via /ui/select ou configure GCP_USER_TOKEN).");
}

function pickList(j: any): any[] {
  if (Array.isArray(j)) return j;
  if (Array.isArray(j.apps)) return j.apps;
  if (Array.isArray(j.app)) return j.app;
  if (Array.isArray(j.developerApps)) return j.developerApps;
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const org = body?.org;
    if (!org) return new Response(JSON.stringify({ error: "org obrigatório" }), { status: 400 });

    const token = await getBearer();
    const headers = { Authorization: `Bearer ${token}` };
    const base = `https://apigee.googleapis.com/v1/organizations/${encodeURIComponent(org)}/apps`;

    const attempts: string[] = [];
    const items: any[] = [];
    let pageCursor: string | undefined = undefined;

    // Função que tenta uma URL e devolve json (ou lança)
    const tryFetch = async (url: string) => {
      attempts.push(url);
      const r = await fetch(url, { headers });
      const t = await r.text();
      const j = t ? JSON.parse(t) : {};
      if (!r.ok) {
        throw new Error(j?.error?.message || r.statusText || "HTTP " + r.status);
      }
      return j;
    };

    // Até 20 páginas por segurança (evitar loop infinito)
    for (let i = 0; i < 20; i++) {
      // 1ª tentativa: expand=true SEM count
      const baseParams = new URLSearchParams();
      baseParams.set("expand", "true");
      if (pageCursor) baseParams.set("startKey", pageCursor);
      const firstUrl = `${base}?${baseParams.toString()}`;

      let ok = false;
      try {
        const j = await tryFetch(firstUrl);
        items.push(...pickList(j));
        pageCursor = j.nextPageToken || j.next_key || j.startKey || undefined;
        ok = true;
      } catch {
        // Fallbacks: (ordem pensada para cobrir variações de tenants)
        const furls: string[] = [];

        // expand=true&count=1000
        {
          const p = new URLSearchParams();
          p.set("expand", "true");
          p.set("count", "1000");
          if (pageCursor) p.set("startKey", pageCursor);
          furls.push(`${base}?${p.toString()}`);
        }
        // page_size=1000(+page_token)
        {
          const p = new URLSearchParams();
          p.set("page_size", "1000");
          if (pageCursor) p.set("page_token", pageCursor);
          furls.push(`${base}?${p.toString()}`);
        }
        // sem params (puro) + startKey se houver
        {
          furls.push(pageCursor ? `${base}?startKey=${encodeURIComponent(pageCursor)}` : base);
        }

        for (const u of furls) {
          try {
            const j = await tryFetch(u);
            items.push(...pickList(j));
            pageCursor = j.nextPageToken || j.next_key || j.startKey || undefined;
            ok = true;
            break;
          } catch {
            /* tenta próxima forma */
          }
        }
      }

      if (!ok) {
        return new Response(JSON.stringify({ error: "Falha ao listar apps", attempts }), { status: 400 });
      }
      if (!pageCursor) break; // acabou a paginação
    }

    return new Response(JSON.stringify(items), { headers: { "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 });
  }
}