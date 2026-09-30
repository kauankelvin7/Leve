# Gika — arquitetura factual do Leve

Auditoria M0 em 2026-09-30. Base: `f6b21b6695f4953e28daace00edb05b2dd4bfde1`, main clonada por HTTPS, worktree inicialmente limpo. Branch: `feat/gika-integration`. Este documento distingue código existente de contratos planejados da Gika.

## Stack, entradas e qualidade — M0-T1

Versões declaradas em `package.json`: React/React DOM 19.3.0, TypeScript 7.0.2, Vite 8.3.0, React Router 7.18.3, Express 5.2.1, Firebase 12.19.0, Firebase Admin 13.6.0, Zod 4.6.2, Temporal polyfill 0.5.1. Requer Node 24.x e npm 11.19.1; npm 11.9.0 do ambiente substituído apenas por invocação `npx --yes npm@11.19.1`, sem alterar lockfile. Java 21 presente.

| Caminho real | Responsabilidade |
|---|---|
| `apps/web/src/main.tsx` | React StrictMode, BrowserRouter, ErrorBoundary, AuthProvider, fontes e PWA |
| `apps/web/src/app/App.tsx` | Protected, Shell, rotas e imports lazy |
| `apps/web/vite.config.ts` | root web, env na raiz, proxy /api → localhost:8788, saída dist |
| `api/[...path].ts`, `server/app.ts`, `server/dev.ts` | Entradas HTTP, Express e servidor local |
| `packages/domain/src/content.ts`, `identity.ts` | Schemas e tipos compartilhados |
| `server/commands/` | Domínio mutável e transações |
| `apps/web/src/platform/` | Auth/Firestore cliente, API, outbox, tema, PWA |
| `workers/scheduler/src/index.js`, `server/reminders.ts` | Tick HMAC, lembretes, materialização e limpeza |
| `tests/unit`, `tests/integration`, `tests/e2e-local`, `tests/e2e` | Gates automatizados distintos |
| `vercel.json` | Build root, dist, rewrites, CSP e Permissions-Policy |

| Comando real | Prova / pré-requisito |
|---|---|
| `npx --yes npm@11.19.1 ci --include=dev` | Instalação exata pelo package-lock |
| `npm run lint` | ESLint, zero warnings |
| `npm run typecheck` | tsc cliente e servidor |
| `npm run build` | typecheck + build Vite |
| `npm test` | Vitest, somente tests/unit/**/*.test.ts |
| `npm run test:integration` | Firebase Auth/Firestore Emulator, demo-leve, Java 21; Vitest sequencial |
| `npm run test:e2e:local` | Playwright Chromium; global setup e dev-local com emuladores efêmeros |
| `npm run test:e2e` | Suite shell distinta; playwright.config.ts |
| `npm run check` | build + unit + E2E shell; não inclui integração ou E2E autenticado |
| `npm run dev`, `npm run seed:local` | API 8788, Vite 5174, Auth 9099, Firestore 8080; dados fictícios |

`.github/workflows/ci.yml` executa instalação, audit de produção, lint, typecheck, unit, build e integração. Planner e sazonal têm workflows focais separados. Os resultados desta sessão serão registrados em `docs/gika/M0_EVIDENCE.md`, sem reutilizar PASS histórico de CONTINUAR.md como prova do SHA atual.

## Documentação e escopo

`CONTINUAR.md` referencia f7894a5, anterior ao HEAD real f6b21b6 (confirmado por git log). O pedido atual autoriza Gika, não a Fase 7 do plano sazonal nem deploy. O AGENTS.md original foi preservado e as regras do pacote anexadas; custo obrigatório R$ 0, sem publicação nem credenciais administrativas. `05-capacidade-e-revisao.md` é citado, mas não existe no checkout. Superpowers não está disponível; processo equivalente manual. humanizer-br é exigida pelo AGENTS.md para textos da interface e ainda precisa estar disponível antes de M1.
