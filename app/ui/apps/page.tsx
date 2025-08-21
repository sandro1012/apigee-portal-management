import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function AppsPage() {
  const logged = !!cookies().get("session")?.value;
  if (!logged) redirect("/login");
  return (
    <main>
      <div className="card" style={{maxWidth:880}}>
        <h2 style={{marginTop:0}}>Apps</h2>
        <p className="small">Em breve: listar, criar e editar Apps do Apigee.</p>
      </div>
    </main>
  );
}
