import Link from "next/link";
export default function Home() {
  return (
    <main>
      <h1>Apigee KVM Portal (Starter)</h1>
      <p>Teste o fluxo de exportação via UI simples.</p>
      <ul>
        <li><Link href="/ui/select">Selecionar Org/Env/KVM e exportar</Link></li>
      </ul>
    </main>
  );
}
