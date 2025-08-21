
import Link from "next/link";
import { cookies } from "next/headers";

export default function Home() {
  const logged = !!cookies().get("session")?.value;
  return (
    <main>
      <h1>Apigee KVM Portal</h1>
      {!logged ? (<p>Faça <Link href="/login">login</Link> para acessar.</p>) : (
        <ul><li><Link href="/ui/select">Selecionar Org/Env/KVM - Exportar, Editar & Criar</Link></li></ul>
      )}
    </main>
  );
}
