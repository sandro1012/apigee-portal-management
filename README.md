# Apigee KVM Portal (Starter – GitHub + Vercel)

Starter minimalista para exportar KVM do Apigee com paginação/merge/dedup no backend.

## Variáveis de ambiente (Vercel)
- `GCP_SA_JSON_BASE64` (obrigatória)
- `APIGEE_BASE` (default: https://apigee.googleapis.com)
- `GOOGLE_APIGEE_ORGS` (opcional, para popular o menu de orgs)

## Endpoints
- `POST /api/kvms` → lista KVMs do env
- `POST /api/kvm/export` → exporta KVM
- `POST /api/kvm/diff` → diff entre JSONs

> Imports configurados via **caminhos relativos** (compatibilidade imediata).
