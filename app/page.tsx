import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Apigee KVM Portal (Starter)</h1>
      <p style={{marginTop: 8}}>
        Este é um starter minimalista para rodar na Vercel e falar com as APIs do Apigee usando uma Service Account.
      </p>
      <ul style={{marginTop: 16}}>
        <li><Link href="/ui/select">Selecionar Org/Env/KVM e exportar</Link></li>
        <li><a href="https://vercel.com/docs" target="_blank" rel="noreferrer">Docs Vercel</a></li>
      </ul>
      <hr style={{margin: "24px 0"}}/>
      <h3>Endpoints</h3>
      <ul>
        <li><code>POST /api/kvm/export</code> &rarr; Exporta um KVM (merge+dedup)</li>
        <li><code>POST /api/kvm/diff</code> &rarr; Diff entre dois JSONs</li>
        <li><code>POST /api/kvms</code> &rarr; Lista KVMs de um env</li>
        <li><code>GET /api/orgs</code> &rarr; Lista orgs</li>
        <li><code>GET /api/envs?org=ORG</code> &rarr; Lista envs da org</li>
      </ul>
    </main>
  );
}