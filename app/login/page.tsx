'use client';
import { useState } from 'react';
export default function LoginPage() {
  const [user, setUser] = useState(''); const [pass, setPass] = useState(''); const [msg, setMsg] = useState('');
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setMsg('Autenticando...');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ user, pass }) });
    const j = await res.json().catch(()=>({}));
    if (res.ok) { window.location.href = '/ui/select'; } else { setMsg(j.error || 'Falha de login'); }
  }
  return (
    <div style={{minHeight:'100dvh', display:'grid', placeItems:'center', background:"linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.85)), url(/brand-wallpaper.png) center / cover no-repeat"}}>
      <form onSubmit={onSubmit} className="card" style={{width:380, backdropFilter:"blur(4px)"}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
          <img src="/brand-logo.png" alt="logo" width={28} height={28} /><h2 style={{margin:0}}>Portal V.tal</h2>
        </div>
        <p className="small" style={{marginTop:0}}>Entre com seu usuário/senha.</p>
        <div style={{display:'grid', gap:10}}>
          <label>Usuário<input value={user} onChange={e=>setUser(e.target.value)} placeholder="admin" /></label>
          <label>Senha<input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" /></label>
          <button type="submit" style={{marginTop:6}}>Entrar</button>
          {msg && <small style={{opacity:.9}}>{msg}</small>}
        </div>
      </form>
    </div>
  );
}
