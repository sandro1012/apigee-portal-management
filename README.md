# Apigee KVM Portal (Starter – GitHub + Vercel)

Este projeto é um **esqueleto** para um portal de KVMs do Apigee (X/Hybrid) pronto para **deploy na Vercel**.
Inclui endpoints para **export** (com paginação/merge/dedup no backend), **diff** e esboços iniciais da UI.

## Como usar (sem instalar nada localmente)
1. Faça upload deste repositório no **GitHub**.
2. Importe na **Vercel** como novo projeto.
3. Configure as **Environment Variables** na Vercel (Preview/Production):
   - `GCP_SA_JSON_BASE64` → JSON da service account do GCP em **base64**
   - `APIGEE_BASE` → `https://apigee.googleapis.com` (padrão)
   - (Opcional) `GOOGLE_APIGEE_ORGS` → lista de orgs (ex.: `org1,org2`)

> A service account precisa de permissão para chamar as **APIs do Apigee** no projeto.

## Endpoints principais
- `POST /api/kvm/export` → `{org, env, kvm}` → JSON unificado `{ keyValueEntries[], nextPageToken: "" }`
- `POST /api/kvm/diff` → `{before, after}` → `{add[], del[], chg[]}`
- `POST /api/kvms` → `{org, env}` → `["kvm1","kvm2", ...]` (lista KVMs do ambiente)
- `GET  /api/orgs` → lista simples de orgs
- `GET  /api/envs?org=...` → lista envs por org (mock inicial, ajuste conforme seu cenário)

## UI
- `/` → Home
- `/ui/select` → Form simples para testar export via API

## TODO (quando evoluir o portal)
- Autenticação (Google OAuth / NextAuth) e RBAC
- Tela de editor + diff visual
- Endpoint de **update** (delete+create+import por entradas) e backups em GCS
- Auditoria (logs ou BigQuery)

---

### Formato do JSON (export/update)
```json
{
  "keyValueEntries": [
    { "name": "chave1", "value": "valor1" },
    { "name": "chave2", "value": "valor2" }
  ],
  "nextPageToken": ""
}
```