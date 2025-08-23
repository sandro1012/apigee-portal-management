# Patch 3 — Apps: Ações de Credenciais (criar / aprovar / revogar / excluir)

Arquivos adicionados/alterados:

- `lib/util/resolveApp.ts` – resolve org, developerEmail e appName a partir do `appId` global.
- `app/api/apps/[appId]/credentials/route.ts` – **POST** cria nova credencial (keys/create) com lista de API Products.
- `app/api/apps/[appId]/credentials/[consumerKey]/status/route.ts` – **POST** `{action:"approve"|"revoke"}` muda status do key.
- `app/api/apps/[appId]/credentials/[consumerKey]/route.ts` – **DELETE** remove a credencial inteira.
- `app/ui/apps/[appId]/page.tsx` – UI com botões de Aprovar/Revogar/Excluir e formulário para criar nova credencial.

## Como aplicar

Descompacte o conteúdo do `.zip` na raiz do projeto (mesmo nível de `app/` e `lib/`). Em seguida:

```bash
git checkout -b feat/patch3-credentials
git add .
git commit -m "feat(apps): cred actions (create/approve/revoke/delete) + UI"
git push -u origin feat/patch3-credentials
```

Faça o deploy na Vercel.

## Pré-requisitos

- Cookie `gcp_token` com o **Access Token** do Google (o mesmo usado nas rotas atuais).
- Cookie ou querystring `org` com o nome da organização (ex.: `?org=vtal-apigeehybrid-dev`).

## Notas

- Implementação usa endpoints oficiais do Apigee.
- A página de detalhes de App agora mostra as credenciais e permite ações rápidas. Para adicionar/remover **products** de uma credencial, podemos incluir no Patch 3.1 um editor granular por product.
