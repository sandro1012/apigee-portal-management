# Patch 3c — Fix imports + Drawer "Nova credencial" na lista de Apps

## O que muda
1) **Corrige os imports** de `resolveApp` nos endpoints:
   - `app/api/apps/[appId]/credentials/[consumerKey]/products/add/route.ts`
   - `app/api/apps/[appId]/credentials/[consumerKey]/products/[product]/route.ts`
   (Caminho ajustado para 9 níveis de `..`)

2) **Componente** `NewCredentialDrawer` para usar **na lista de Apps** (sem alterar sua página atual).  
   Você pode colocar um botão ao lado de cada App e abrir o drawer para criar a credencial sem sair da lista.

## Como aplicar
Descompacte este zip na **raiz do projeto** e faça:
```bash
git checkout -b feat/patch3c-drawer
git add .
git commit -m "fix(apps): resolveApp imports (product routes) + NewCredentialDrawer component"
git push -u origin feat/patch3c-drawer
```

## Como integrar o Drawer na listagem
No arquivo `app/ui/apps/page.tsx`, onde você renderiza cada item de app, importe e use:

```tsx
"use client";
import NewCredentialDrawer from "./components/NewCredentialDrawer";

// ... dentro do map de apps:
<div className="flex items-center gap-2">
  <span className="font-mono">{app.name}</span>
  <NewCredentialDrawer
    appId={app.appId}
    appName={app.name}
    org={org}
    onCreated={() => {/* opcional: recarregar lista */}}
  />
</div>
```

> Observação: o componente usa as rotas já existentes (`/api/products` e `/api/apps/{appId}/credentials`).  
> Certifique-se que o cookie `gcp_token` e o `org` (cookie ou `?org=`) estejam definidos como nas demais telas.
