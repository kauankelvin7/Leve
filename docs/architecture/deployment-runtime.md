# Runtime local e configuração de deploy

Este documento descreve os entrypoints e manifests versionados. Eles mostram como o projeto pode ser executado ou configurado; não comprovam que um deploy ou serviço remoto esteja ativo.

## Desenvolvimento local

`npm run dev` executa [scripts/dev-local.mjs](../../scripts/dev-local.mjs): Firebase Auth Emulator em `localhost:9099`, Firestore Emulator em `localhost:8080`, servidor Express local em `localhost:8788` e Vite em `localhost:5174`. O projeto usa `demo-leve` e a configuração impede combinar emuladores com produção/Vercel.

`npm run seed:local` carrega dados sintéticos. As portas e opções dos emuladores também estão em [firebase.json](../../firebase.json). Para abrir apenas Vite, `npm run dev:web` exige que a API esteja disponível separadamente.

## Aplicação web e API

[vercel.json](../../vercel.json) declara framework Vite, instala pelo lockfile, executa `npm run build`, serve `dist` e aplica rewrites para rotas web. Regras de rewrite excluem endpoints de API e assets do fallback SPA.

A API de código é [Express em server/app.ts](../../server/app.ts). O adapter [api/[...path].ts](../../api/%5B...path%5D.ts) exporta essa aplicação para o entrypoint HTTP da Vercel. No desenvolvimento local, [server/dev.ts](../../server/dev.ts) a serve em `localhost:8788`. São adapters diferentes para a mesma aplicação Express; este repositório não declara uma API Express separada como serviço de deploy permanente.

## Serviços e configuração

- Firebase Authentication e Firestore são configurados no cliente pelo módulo [platform/firebase.ts](../../apps/web/src/platform/firebase.ts); o servidor usa Firebase Admin em [server/platform/firebase.ts](../../server/platform/firebase.ts).
- A integração Gika lê `GEMINI_API_KEY` exclusivamente no servidor em [gemini.ts](../../server/gika/gemini.ts). Não coloque chaves de servidor em variáveis `VITE_*`.
- O Worker em [workers/scheduler/wrangler.toml](../../workers/scheduler/wrangler.toml) declara Cron de um minuto e `workers_dev = false`. Seu handler precisa de `SCHEDULER_HMAC_SECRET` e origem da API; [index.js](../../workers/scheduler/src/index.js) não envia tick sem ambos.
- `api/internal/tick` valida a assinatura e a janela de timestamp em [server/reminders.ts](../../server/reminders.ts). O payload de configuração não substitui a autorização do endpoint.

Os valores secretos são configuração externa e não devem ser copiados para documentação, commits ou logs. A política para serviços pagos, publicação e autorização está em [AGENTS.md](../../AGENTS.md) e [SECURITY.md](../../SECURITY.md).
