import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Apigee KVM Portal (Starter)</h1>
      <ul style={{marginTop: 16}}>
        <li><Link href="/ui/select">Selecionar Org/Env/KVM e exportar</Link></li>
      </ul>
      <hr style={{margin: "24px 0"}}/>
      <h3>Debug</h3>
      <ul>
        <li><Link href="/api/_debug/env">/api/_debug/env</Link></li>
        <li><Link href="/api/_debug/token">/api/_debug/token</Link></li>
      </ul>
    </main>
  );
}
