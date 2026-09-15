# Leve

Leve é uma agenda pessoal progressiva para organizar atividades, calendário, notas e compras em um único espaço privado. A interface foi desenhada para uso diário no celular e no desktop, com dados persistentes, sincronização autenticada e recuperação explícita em caso de conflito ou falha de rede.

## Visão geral

- React, TypeScript e Vite no aplicativo web responsivo.
- Firebase Authentication e Firestore para identidade e dados privados por conta.
- API Express: toda mutação passa por `POST /api/commands` com token Firebase.
- PWA instalável, cache privado opt-in, outbox por aparelho e notificações configuráveis.
- Recorrência, lixeira, exportação/importação versionada e exclusão retomável.
- CORS configurável por `CORS_ORIGINS`; por padrão, a API aceita apenas o mesmo domínio.
- Logs estruturados com níveis (`debug`, `info`, `warn`, `error`), redação de segredos e `LOG_LEVEL` por ambiente.

## Requisitos e execução

Node.js 24.x e npm 11.19.1. O campo `packageManager` fixa a versão; o CI habilita Corepack e verifica divergências.

```sh
corepack enable
npm ci
npm run dev
```

O comando local inicia Auth/Firestore Emulator, API e Vite. Para dados fictícios, execute `npm run seed:local` e abra `http://localhost:5174/entrar`. Arquivos `.env*` não são versionados.

## Verificação

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:integration
npm run test:e2e:local
```

`npm run check` encadeia build, testes unitários e E2E. Os testes usam emuladores e dados fictícios; push com aplicativo fechado, leitor de tela externo e instalação em aparelho físico exigem validação adicional.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `apps/web/src/app` | Rotas, shell e providers |
| `apps/web/src/features` | Identidade, agenda, notas, compras e preferências |
| `apps/web/src/platform` | Firebase, API, tema, outbox e PWA |
| `server` | Comandos, autorização, repositórios e jobs |
| `packages/domain` | Schemas e regras compartilhadas |
| `workers/scheduler` | Tick HMAC gratuito |
| `tests` | Testes unitários, integração e navegador |
| `docs` | Decisões, runbooks e evidências resumidas |

## Segurança e operação

Dados são privados por UID e membership. O cliente não grava diretamente nas coleções de domínio. Comandos usam `operationId`, entidade estável e revisão esperada; conflitos preservam o conteúdo concorrente. Logs não devem conter tokens, cookies, senhas ou conteúdo privado.

Em produção, use `LOG_LEVEL=error` (ou `warn` para diagnóstico controlado). Em desenvolvimento, o padrão é `debug`. Nenhum recurso pago é ativado.

## Estado da entrega

A base local cobre o núcleo E00–E10 com emuladores e testes automatizados. A hospedagem autorizada está em `https://leve-agenda.vercel.app`; homologação final, push em aparelho fechado, cotas representativas e aceite permanecem gates externos. Consulte [CONTINUAR.md](CONTINUAR.md).

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).
