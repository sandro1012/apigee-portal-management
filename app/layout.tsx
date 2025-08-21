import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession } from "../lib/auth"; // fixed path
import "./globals.css"; // fixed path

export const metadata = { title: "Apigee KVM Portal", description: "Starter portal for Apigee KVM management" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get("session")?.value || "";
  let logged = false, user = "";
  try { if (session) { const data = verifySession(session); logged = true; user = data?.user || ""; } } catch {}

  return (
    <html lang="pt-BR">
      <body>
        <div style={{display:"grid", gridTemplateColumns: logged ? "240px 1fr" : "1fr", minHeight:"100dvh"}}>
          {logged && (
            <aside style={{position:"relative", background:"#0a0a0a", borderRight:"1px solid var(--border)", padding:"16px 12px"}}>
              <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:16}}>
                <img src="/brand-logo.png" alt="V.tal" width={32} height={32} /><div style={{fontWeight:800, letterSpacing:.2}}>V.tal</div>
              </div>
              <nav style={{display:"grid", gap:8}}>
                <Link href="/" className="sidebar-link active">Início</Link>
                <Link href="/ui/select" className="sidebar-link">Gerenciar KVMs</Link>
                <a href="/api/auth/logout" className="sidebar-link" style={{color:"#ff9e9e"}}>Sair</a>
              </nav>
              <div style={{position:"absolute", bottom:12, left:12, right:12}} className="small">
                Logado como <b>{user || "admin"}</b>
              </div>
            </aside>
          )}
          <div style={{position:"relative"}}>
            {logged && (<div style={{position:"fixed", inset:0, zIndex:0, background:"linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.6)), url(/brand-wallpaper.png) center / cover no-repeat", opacity:.25, pointerEvents:"none"}} />)}
            <div style={{position:"relative", zIndex:1, maxWidth: logged ? "100%" : 1000, margin: logged ? "0" : "0 auto", padding: "24px"}}>{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
