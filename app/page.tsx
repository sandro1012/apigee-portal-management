// app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const logged = !!cookies().get("session")?.value;
  if (!logged) {
    redirect("/login");
  }
  return (
    <main>
      <div className="card" style={{ maxWidth: 880 }}>
        <h1 style={{ marginTop: 0 }}>Portal de Management Apigee</h1>
        <p style={{ opacity: 0.9 }}>
          Esse portal foi criado com intuito de facilitar o <b>gerenciamento de KVMs</b>,{" "}
          <b>Apps</b> e <b>API Products</b> do Apigee da V.tal. Centralizamos operações
          comuns do dia a dia em uma interface simples: listar, exportar, comparar e atualizar recursos.
        </p>
        <div className="small" style={{ opacity: 0.8 }}>
          Dica: Use um token Google válido (ou service account) para autenticar as ações no backend.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          marginTop: 16,
        }}
      >
        <Link href="/ui/products" className="card" style={{ display: "block" }}>
          <h3 style={{ marginTop: 0 }}>API Products</h3>
          <p className="small">Listagem e operações</p>
        </Link>

        <Link href="/ui/apps" className="card" style={{ display: "block" }}>
          <h3 style={{ marginTop: 0 }}>Apps</h3>
          <p className="small">Listagem e operações</p>
        </Link>

        <Link href="/ui/select" className="card" style={{ display: "block" }}>
          <h3 style={{ marginTop: 0 }}>Gerenciar KVMs</h3>
          <p className="small">Exportar, editar e criar KVMs por ambiente</p>
        </Link>

        {/* 🔥 Novo card do Webhook Listener */}
        <Link href="/ui/webhook-listener" className="card" style={{ display: "block" }}>
          <h3 style={{ marginTop: 0 }}>Webhook Listener</h3>
          <p className="small">Criar KVM padrão de callbacks por tenant</p>
        </Link>
      </div>
    </main>
  );
}
