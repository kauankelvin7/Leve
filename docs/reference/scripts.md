# Scripts npm

A fonte exata dos comandos é [`package.json`](../../package.json). Use `npm run docs:check` para verificar links locais, âncoras Markdown e nomes de scripts citados na documentação.

| Comando | Escopo |
|---|---|
| `npm run dev` / `npm run dev:local` | Ambiente local via `scripts/dev-local.mjs` |
| `npm run seed:local` | Dados sintéticos nos emuladores |
| `npm run lint` | ESLint e verificação de fronteiras |
| `npm run typecheck` | TypeScript web e servidor |
| `npm run build` | Typecheck e build web |
| `npm test` | Testes unitários Vitest |
| `npm run test:integration` | Testes Auth/Firestore Emulator |
| `npm run test:e2e:local` | Jornadas Playwright locais |
| `npm run verify` | Audit de produção, lint, build, unitários, integração e E2E crítico |
| `npm run migrate:notification-tokens` | Script de migração de tokens de notificação; requer revisão do procedimento e ambiente antes de uso |
| `npm run docs:check` | Links, âncoras e referências a scripts nos documentos Markdown |

Para os pré-requisitos de cada gate, consulte [executar testes](../guides/running-tests.md). A existência de um script não prova que ele foi executado em uma revisão específica.
