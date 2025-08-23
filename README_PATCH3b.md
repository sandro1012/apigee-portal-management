# Patch 3b — Credenciais com ações granulares (UI + APIs)

Inclui:
- **Fix**: `status` usa `Content-Type: application/octet-stream` (requisito da Apigee para `?action=approve|revoke`).
- **APIs**:
  - `POST app/api/apps/[appId]/credentials/[consumerKey]/products/add` — adiciona 1 API Product ao key (usa `updateDeveloperAppKey`). 
  - `DELETE app/api/apps/[appId]/credentials/[consumerKey]/products/[product]` — remove a associação de um API Product do key.
- **UI** `app/ui/apps/[appId]/page.tsx`:
  - Formulário “Nova credencial” (multiselect de products, `keyExpiresIn` opcional).
  - Em cada credencial: **Aprovar / Revogar / Excluir**, listar products, **Adicionar** e **Remover** product.

## Como aplicar
Descompacte na raiz do projeto e faça:
```bash
git checkout -b feat/patch3b-cred-granular
git add .
git commit -m "feat(apps): granular cred mgmt (add/remove product) + status fix"
git push -u origin feat/patch3b-cred-granular
```

## Observações
- As rotas assumem cookie `gcp_token` com Bearer (Access Token do Google) e `org` via cookie ou `?org=`.
- Endpoints oficiais:
  - **Add product to key**: `POST /v1/organizations/{org}/developers/{developerEmail}/apps/{app}/keys/{key}` (updateDeveloperAppKey). 
  - **Remove product from key**: `DELETE /v1/organizations/{org}/developers/{developerEmail}/apps/{app}/keys/{key}/apiproducts/{apiproduct}`.
  - **Approve/Revoke key**: `POST .../keys/{key}?action=approve|revoke` (com `Content-Type: application/octet-stream`).
