'use client';
import { useEffect, useState, useRef } from 'react';

type KvmEntry = { name: string; value: any };
type ExportResp = { keyValueEntries: KvmEntry[]; nextPageToken: string };
type DiffResp = { add: string[]; del: string[]; chg: {name:string; from:any; to:any}[]; counts?: {add:number; del:number; chg:number} };

function validateKvmSchema(data: any): { ok: boolean; message?: string } {
  if (!data || typeof data !== 'object') return { ok: false, message: 'JSON raiz deve ser um objeto' };
  if (!Array.isArray(data.keyValueEntries)) return { ok: false, message: 'keyValueEntries deve ser um array' };
  for (let i = 0; i < data.keyValueEntries.length; i++) {
    const it = data.keyValueEntries[i];
    if (!it || typeof it !== 'object') return { ok: false, message: `item #${i} inválido (não é objeto)` };
    if (typeof it.name !== 'string' || !it.name.trim()) return { ok: false, message: `item #${i} sem name string` };
    const v = it.value;
    const type = typeof v;
    if (!(type === 'string' || type === 'number' || type === 'boolean')) {
      return { ok: false, message: `item #${i} (${it.name}) valor deve ser string/number/boolean` };
    }
  }
  // opcional nextPageToken string
  if (typeof data.nextPageToken !== 'undefined' && typeof data.nextPageToken !== 'string') {
    return { ok: false, message: 'nextPageToken (quando presente) deve ser string' };
  }
  // duplicados?
  const names = new Set<string>();
  for (const it of data.keyValueEntries) {
    if (names.has(it.name)) return { ok: false, message: `chave duplicada: ${it.name}` };
    names.add(it.name);
  }
  return { ok: true };
}

export default function SelectUI() {
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState<string>('');
  const [envs, setEnvs] = useState<string[]>([]);
  const [env, setEnv] = useState<string>('');
  const [kvms, setKvms] = useState<string[]>([]);
  const [kvm, setKvm] = useState<string>('');
  const [result, setResult] = useState<string>('');

  const [tokenInput, setTokenInput] = useState<string>('');
  const [tokenSaved, setTokenSaved] = useState<boolean>(false);
  const [tokenMsg, setTokenMsg] = useState<string>('');

  const [editorJson, setEditorJson] = useState<string>('');
  const [editorStatus, setEditorStatus] = useState<string>('');
  const [diffPreview, setDiffPreview] = useState<DiffResp | null>(null);

  const [newKvmName, setNewKvmName] = useState<string>('');
  const [newKvmEncrypted, setNewKvmEncrypted] = useState<boolean>(true);
  const fileRef = useRef<HTMLInputElement|null>(null);
  const [createMsg, setCreateMsg] = useState<string>('');

  // ⬇️ loading para exclusão de KVM
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => { fetch('/api/orgs').then(r=>r.json()).then(setOrgs).catch(()=>setOrgs([])); }, []);
  useEffect(() => {
    if (!org) return;
    setEnv(''); setEnvs([]); setKvms([]); setKvm('');
    fetch(`/api/envs?org=${encodeURIComponent(org)}`).then(r=>r.json()).then(setEnvs).catch(()=>setEnvs([]));
  }, [org]);

  async function saveToken() {
    setTokenSaved(false); setTokenMsg('');
    const res = await fetch('/api/auth/token', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ token: tokenInput.trim() }) });
    const j = await res.json().catch(()=>({}));
    if (res.ok) { setTokenSaved(true); setTokenMsg('Token salvo (expira ~1h).'); } else { setTokenMsg('Falha ao salvar: ' + (j.error || res.statusText)); }
  }
  async function clearToken() { await fetch('/api/auth/token', { method: 'DELETE' }); setTokenSaved(false); setTokenMsg('Token limpo.'); }

  async function loadKvms() {
    if (!org || !env) return;
    const res = await fetch('/api/kvms', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({org, env})});
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Erro inesperado'); return; }
    setKvms(Array.isArray(data)? data : []);
  }

  async function exportKvm() {
    if (!org || !env || !kvm) return;
    const res = await fetch('/api/kvm/export', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({org, env, kvm})});
    const data: ExportResp = await res.json();
    if (!res.ok) { alert((data as any).error || 'Erro inesperado'); return; }
    const pretty = JSON.stringify(data, null, 2);
    setResult(pretty); setEditorJson(pretty);
    setEditorStatus('JSON carregado. Edite e clique em Salvar.');
    setDiffPreview(null);
  }

  function downloadJson() {
    const text = editorJson || result || '';
    if (!text.trim()) return;
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = URL.createObjectURL(blob); a.download = `${org||'org'}_${env||'env'}_${kvm||'kvm'}_${stamp}.json`; document.body.appendChild(a); a.click(); URL.revokeObjectURL(a.href); a.remove();
  }

  async function showDiff() {
    try {
      setEditorStatus('Validando JSON...');
      const parsed = JSON.parse(editorJson);
      const check = validateKvmSchema(parsed);
      if (!check.ok) { setEditorStatus('Schema inválido: ' + check.message); return; }
      setEditorStatus('Calculando diff...');
      const res = await fetch('/api/kvm/dry-run', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ org, env, kvm, data: parsed }) });
      const j: DiffResp | any = await res.json();
      if (!res.ok) { setEditorStatus('Falha: ' + (j.error || res.statusText)); return; }
      setDiffPreview(j as DiffResp);
      setEditorStatus('Prévia de alterações gerada.');
    } catch (e:any) { setEditorStatus('Erro: ' + (e.message || String(e))); }
  }

  async function saveEdit() {
    try {
      setEditorStatus('Validando JSON...');
      const parsed = JSON.parse(editorJson);
      const check = validateKvmSchema(parsed);
      if (!check.ok) { setEditorStatus('Schema inválido: ' + check.message); return; }
      setEditorStatus('Aplicando diffs...');
      const res = await fetch('/api/kvm/update', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ org, env, kvm, data: parsed }) });
      const j = await res.json();
      if (!res.ok) { setEditorStatus('Falha: ' + (j.error || res.statusText)); return; }
      setEditorStatus(`Sucesso! created=${j.created} updated=${j.updated} deleted=${j.deleted}`);
      setDiffPreview(null);
    } catch (e:any) { setEditorStatus('Erro: ' + (e.message || String(e))); }
  }

  async function createNewKvm() {
    if (!org || !env || !newKvmName.trim()) { setCreateMsg('Preencha org/env/nome.'); return; }
    const file = fileRef.current?.files?.[0];
    if (!file) { setCreateMsg('Envie o arquivo JSON obrigatório.'); return; }
    setCreateMsg('Validando JSON...');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const check = validateKvmSchema(json);
      if (!check.ok) { setCreateMsg('Schema inválido: ' + check.message); return; }

      const fd = new FormData();
      fd.set('org', org);
      fd.set('env', env);
      fd.set('kvm', newKvmName.trim());
      fd.set('encrypted', String(newKvmEncrypted));
      fd.set('json', JSON.stringify(json)); // backend espera string json

      setCreateMsg('Criando KVM...');
      const res = await fetch('/api/kvm/create', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) { setCreateMsg('Falha: ' + (j.error || res.statusText)); return; }
      setCreateMsg('KVM criado e entradas aplicadas!');
      await loadKvms();
      setKvm(newKvmName.trim());
    } catch (e:any) { setCreateMsg('Erro: ' + (e.message || String(e))); }
  }

  // ⬇️ Excluir KVM por completo
  async function deleteKvm() {
    if (!org || !env || !kvm) {
      alert('Selecione Org, Env e um KVM para excluir.');
      return;
    }
    if (!confirm(`Excluir o KVM "${kvm}" por completo? Esta ação é irreversível.`)) {
      return;
    }

    setDeleting(true);
    try {
      const qs = `?org=${encodeURIComponent(org)}&env=${encodeURIComponent(env)}`;
      const res = await fetch(`/api/kvms/${encodeURIComponent(kvm)}${qs}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || res.statusText);

      // limpa editor e recarrega lista
      setEditorJson('');
      setResult('');
      setDiffPreview(null);
      setKvm('');
      await loadKvms();

      alert('KVM excluído com sucesso!');
    } catch (e:any) {
      alert('Falha ao excluir KVM: ' + (e.message || String(e)));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main>
      <h2>Gerenciar KVMs</h2>
      <div className='card' style={{display:'grid', gap:8, marginBottom:16, maxWidth:760}}>
        <strong>Token Google (OAuth) – cole aqui</strong>
        <input type="password" value={tokenInput} onChange={e=>setTokenInput(e.target.value)} placeholder="ya29...." />
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button onClick={saveToken} disabled={!tokenInput.trim()}>Salvar token</button>
          <button onClick={clearToken}>Limpar token</button>
          {tokenSaved && <span style={{color:'#6ae37a'}}>✓</span>}
          {tokenMsg && <small>{tokenMsg}</small>}
        </div>
        <small>Sem token: backend tenta <code>GCP_USER_TOKEN</code> (env) ou Service Account.</small>
      </div>

      <section className='card' style={{display:'grid', gap:12, maxWidth: 760}}>
        <label>Org
          <select value={org} onChange={e=>setOrg(e.target.value)}>
            <option value="">Selecione...</option>
            {orgs.map(o=>(<option key={o} value={o}>{o}</option>))}
          </select>
        </label>
        <label>Env
          <select value={env} onChange={e=>setEnv(e.target.value)}>
            <option value="">Selecione...</option>
            {envs.map(x=>(<option key={x} value={x}>{x}</option>))}
          </select>
        </label>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button onClick={loadKvms}>Listar KVMs</button>
          <span style={{opacity:.7}}>(carregue a lista de KVMs do ambiente)</span>
        </div>
        <label>KVM
          <select value={kvm} onChange={e=>setKvm(e.target.value)}>
            <option value="">Selecione...</option>
            {kvms.map(m=>(<option key={m} value={m}>{m}</option>))}
          </select>
        </label>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button onClick={exportKvm} disabled={!kvm}>Exportar (carregar no editor)</button>
          <button onClick={downloadJson} disabled={!(editorJson || result)}>Baixar JSON</button>
          {/* Excluir KVM */}
          <button
            onClick={deleteKvm}
            disabled={!kvm || deleting}
            title="Exclui o KeyValueMap completo (org/env)"
            style={{ borderColor: '#dc2626' }}
          >
            {deleting ? 'Excluindo...' : 'Excluir KVM'}
          </button>
        </div>
      </section>

      <section style={{marginTop:24}}>
        <h3>Editor JSON (para o KVM selecionado)</h3>
        <textarea value={editorJson} onChange={e=>setEditorJson(e.target.value)} placeholder='{"keyValueEntries":[{"name":"foo","value":"bar"}]}' style={{width:'100%', height:260, fontFamily:'monospace'}}/>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <button onClick={showDiff} disabled={!org || !env || !kvm || !editorJson.trim()}>Pré-visualizar diff</button>
          <button onClick={saveEdit} disabled={!org || !env || !kvm || !editorJson.trim()}>Salvar</button>
          {editorStatus && <small>{editorStatus}</small>}
        </div>
        {diffPreview && (
          <div className='card' style={{marginTop:12}}>
            <strong>Diff</strong>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8, marginTop:8}}>
              <div><b>+ add</b><br/><small>{diffPreview.counts?.add ?? diffPreview.add.length} itens</small></div>
              <div><b>- del</b><br/><small>{diffPreview.counts?.del ?? diffPreview.del.length} itens</small></div>
              <div><b>~ chg</b><br/><small>{diffPreview.counts?.chg ?? diffPreview.chg.length} itens</small></div>
            </div>
            <pre style={{marginTop:8, background:'#0b0d1a', color:'#fff', borderColor:'var(--border)', overflow:'auto', maxHeight: 240}}>
{JSON.stringify(diffPreview, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <section style={{marginTop:36}}>
        <h3>Criar novo KVM (upload JSON <u>obrigatório</u>)</h3>
        <div className='card' style={{display:'grid', gap:8, maxWidth:760}}>
          <label>Nome do novo KVM
            <input value={newKvmName} onChange={e=>setNewKvmName(e.target.value)} placeholder="nome-do-kvm" />
          </label>
          <label style={{display:'flex', gap:8, alignItems:'center'}}>
            <input type="checkbox" checked={newKvmEncrypted} onChange={e=>setNewKvmEncrypted(e.target.checked)} />
            Criar como <b>encrypted</b>
          </label>
          <label>Arquivo JSON (obrigatório)
            <input type="file" accept="application/json" ref={fileRef} />
          </label>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <button onClick={createNewKvm} disabled={!org || !env || !newKvmName.trim() || !(fileRef.current && fileRef.current.files && fileRef.current.files.length > 0)}>Criar KVM</button>
            {createMsg && <small>{createMsg}</small>}
          </div>
        </div>
      </section>

      <section style={{marginTop:24}}>
        <h4>Preview da última exportação</h4>
        <pre className='card' style={{background:'#0b0d1a', color:'#fff', borderColor:'var(--border)', overflow:'auto', maxHeight: 360}}>
          {result || 'Resultado aparecerá aqui...'}
        </pre>
      </section>
    </main>
  );
}
