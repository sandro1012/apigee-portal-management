import Link from "next/link";
import { cookies } from "next/headers";
export default function Home() {
  const logged = !!cookies().get("session")?.value;
  if (!logged) {
    return (
      <main>
        <div style={{minHeight:'80dvh', display:'grid', placeItems:'center', background:"linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.85)), url(/brand-wallpaper.png) center / cover no-repeat", borderRadius: 16, border: "1px solid var(--border)"}}>
          <div style={{textAlign:'center'}}>
            <img src="/brand-logo.png" alt="V.tal" width={120} height={120} style={{filter:'drop-shadow(0 10px 30px rgba(0,0,0,.6))'}}/>
            <h1>Apigee KVM Portal</h1>
            <p className="small">Preto · Branco · Amarelo</p>
            <p><Link href="/login"><button>Entrar</button></Link></p>
          </div>
        </div>
      </main>
    );
  }
  return (<main><h1>Apigee KVM Portal</h1><ul><li><Link href="/ui/select">Selecionar Org/Env/KVM - Exportar, Editar & Criar</Link></li></ul></main>);
}
