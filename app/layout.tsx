
import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession } from "../lib/auth";

export const metadata = { title: "Apigee KVM Portal", description: "Starter portal for Apigee KVM management" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get("session")?.value || "";
  let logged = false, user = "";
  try { if (session) { const data = verifySession(session); logged = true; user = data?.user || ""; } } catch {}
  return (
    <html lang="pt-BR">
      <body style={{fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans", background:"#0f1120", color:"#e7e7ea"}}>
        <div style={{display:"grid", gridTemplateColumns: logged ? "240px 1fr" : "1fr", minHeight:"100dvh"}}>
          {logged && (
            <aside style={{background:"#0a0c18", borderRight:"1px solid #1b1e33", padding:"16px 12px"}}>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:16}}>
                <img src="/logo.svg" alt="logo" width={36} height={36} /><div style={{fontWeight:700}}>V.tal Portal</div>
              </div>
              <nav style={{display:"grid", gap:8}}>
                <Link href="/" style={{padding:"8px 10px", borderRadius:8, background:"#11142a"}}>Início</Link>
                <Link href="/ui/select" style={{padding:"8px 10px", borderRadius:8}}>Gerenciar KVMs</Link>
                <a href="/api/auth/logout" style={{padding:"8px 10px", borderRadius:8, color:"#ff8b8b"}}>Sair</a>
              </nav>
              <div style={{position:"absolute", bottom:12, left:12, right:12, opacity:0.6, fontSize:12}}>Logado como <b>{user || "admin"}</b></div>
            </aside>
          )}
          <div style={{maxWidth: logged ? "100%" : 1000, margin: logged ? "0" : "0 auto", padding: "24px"}}>{children}</div>
        </div>
      </body>
    </html>
  );
}
