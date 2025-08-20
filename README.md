# Apigee KVM Portal – Starter (Token do Usuário ou Service Account)

Backend prioriza: cookie `gcp_token` → `GCP_USER_TOKEN` (env) → Service Account (`GCP_SA_JSON_BASE64`).

Endpoints:
- POST /api/kvms
- POST /api/kvm/export
- POST /api/kvm/diff
- POST /api/auth/token (salva cookie)
- DELETE /api/auth/token
- GET  /api/_debug/env
- GET  /api/_debug/token
