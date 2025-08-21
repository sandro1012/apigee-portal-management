import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function ProductsPage() {
  const logged = !!cookies().get("session")?.value;
  if (!logged) redirect("/login");
  return (
    <main>
      <div className="card" style={{maxWidth:880}}>
        <h2 style={{marginTop:0}}>API Products</h2>
        <p className="small">Em breve: listar, criar e editar API Products do Apigee.</p>
      </div>
    </main>
  );
}
