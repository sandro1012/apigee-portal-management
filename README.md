# Apigee KVM Portal – Starter (Token do Usuário ou Service Account)

**Novidades**: Dry-run (pré-visualização de diff) e botão "Baixar JSON".

Credenciais (prioridade):
1. cookie `gcp_token` (token do usuário)
2. env `GCP_USER_TOKEN`
3. `GCP_SA_JSON_BASE64` (Service Account)
