
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
    <div style={{minHeight:'calc(100dvh - 48px)', display:'grid', placeItems:'center',
      background:'radial-gradient(1000px 500px at 20% 10%, rgba(0,194,255,.18), transparent), radial-gradient(800px 500px at 80% 20%, rgba(122,0,255,.16), transparent)'}}>
      <div style={{position:'absolute', inset:0, background:'url(/logo.svg) no-repeat center 40px / 280px auto', opacity:.08, pointerEvents:'none'}} />
      <form onSubmit={onSubmit} style={{width:360, background:'#0a0c18', border:'1px solid #1b1e33', borderRadius:16, padding:24, boxShadow:'0 10px 40px rgba(0,0,0,.35)'}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
          <img src="/logo.svg" alt="logo" width={28} height={28} /><h2 style={{margin:0}}>Portal V.tal</h2>
        </div>
        <div style={{display:'grid', gap:10}}>
          <label>Usuário<input value={user} onChange={e=>setUser(e.target.value)} placeholder="admin" /></label>
          <label>Senha<input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" /></label>
          <button type="submit" style={{marginTop:6}}>Entrar</button>
          {msg && <small style={{opacity:.8}}>{msg}</small>}
        </div>
      </form>
    </div>
  );
}
