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

## Domínio e fluxos existentes — M0-T2

A entidade real é `Activity` em `packages/domain/src/content.ts`. Não há entidade separada de tarefa/rotina no domínio auditado: tarefa é schedule.type/kind `task`; compromisso é `event`; repetição é série + ocorrências de Activity. `ActivityInput` é estrito: title até 120, descriptionPlain até 5000, categoryId nullable, colorHex/estimatedMinutes opcionais, schedule e até três reminderSpecs. Cada entidade tem revision, schemaVersion 1, createdAt/updatedAt/deletedAt; atividade possui status pending/completed/canceled, completedAt, seriesId e occurrenceKey.

| Schedule | Campos reais / semântica |
|---|---|
| task | dueDate/dueTime nullable, timeZone IANA, disambiguation reject/earlier/later; horário requer data |
| event com horário | startDate/startTime/endDate/endTime/timeZone/disambiguation; fim após início |
| event dia inteiro | startDate/endDateExclusive/timeZone; fim civil exclusivo, sem instantes artificiais |

`civilDateSchema` usa Temporal e exige data real; `scheduleInstants` calcula dueAt/startsAt/endsAt UTC e recusa hora inexistente. Gika não deve inventar horário/duração para uma tarefa. Datas relativas usam data atual e fuso do perfil, não UTC do servidor como substituto silencioso.

Category usa name até 40, colorHex, sortOrder 0–1000, meta e archivedAt. Servidor mantém normalizedName e recusa nome duplicado ativo. Categoria referenciada deve existir no mesmo uid, sem deletedAt/archivedAt. Não aceitar ID livre de outra conta.

| Intenção Gika | Comando/fluxo existente | Payload e revisões |
|---|---|---|
| criar tarefa simples | Today.tsx → platform/api.sendCommand → POST /api/commands → server/commands/content.contentCommand | activity.create + ActivityInput completo; expectedRevision 0 |
| editar tarefa/compromisso | mesmo fluxo, activity.update | substitui ActivityInput completo; revisão corrente; preservar campos não alterados |
| concluir/reabrir | Today.tsx e ActivityDetail.tsx → activity.setStatus | {status: completed/pending}; revisão corrente |
| reagendar ocorrência | calendarMutationModel + buildCalendarUpdateCommand em calendarCommandModel.ts → activity.update | ActivityInput validado; preservar duração ao mover; revisão corrente |
| editar esta e próximas | buildCalendarUpdateCommand → activity.updateFuture | {activity, newSeriesId}; entityId da ocorrência e revisão corrente |
| excluir/restaurar | activity.trash / activity.restore | {} e revisão corrente; trash define purgeAfter em 30 dias |
| excluir série | activity.trashSeries | entityId ocorrência, revisão corrente; alto impacto |
| excluir definitivamente | activity.purge | apenas item na lixeira; comando não será exposto inicialmente |

Today.tsx guarda CommandEnvelope pendente em ref e reutiliza operationId/entityId enquanto a tentativa lógica e payload forem os mesmos. Gika deverá fazer o mesmo, incluindo clientCreatedAt estável. NOVA mensagem voluntária igual não é automaticamente retry. `CommandResult` informa applied/alreadyApplied, revision e serverTime; não prova que todo contexto local foi atualizado.

Recorrência: recurrenceRuleSchema suporta daily/weekly/monthly, interval 1–30, until ou count 2–366 (não ambos), monthlyPolicy lastDay/skip. createActivitySeries grava users/{uid}/series/{id} com activity, recurrence, revision, state e contadores. Materializa horizonte de 45 dias; IDs de ocorrência são hash uid:seriesId:occurrenceKey (32 caracteres). server/reminders.materializeRecurringActivities expande via worker com verificações de conta e estoque. A UI pergunta occurrence/future; não existe contrato de atualização da série inteira. updateFutureActivities divide a série, remove ocorrências futuras e recria-as com nova série e IDs; portanto proposals/pending actions anteriores ficam obsoletos. trashSeries afeta toda a série e exige confirmação própria.

Limites factuais do servidor: 5000 atividades, 50 categorias, 500 notas, 50 listas, 200 itens/lista. Leitura cliente limitada a 50 por query não equivale ao estoque total. `useUserCollection` mascara partial como false: não reutilizar esse resultado como evidência de agenda completa. `useCalendarRange` mantém partial/cached/error e consulta três grupos por intervalo, deduplicando em useLiveQueries.

Testes existentes a reutilizar: content-domain, dates, calendar-command-model, calendar-mutation-model, calendar-model, outbox-policy; testes integration/identity e E2E calendar-planner cobrem fluxos autenticados. Nenhuma mudança de domínio nesta etapa.

## Auth, persistência, offline e riscos — M0-T3

Cliente: platform/firebase.ts inicializa Auth com browserLocalPersistence. AuthProvider usa onIdTokenChanged, clearQueryCache e geração para descartar respostas atrasadas de conta anterior. GET /api/session retorna SessionResult. Protected exige e-mail verificado, membership active, profile.accountState active. Perfil efetivo inclui timeZone; ativação fixa America/Sao_Paulo e updateProfile preserva fuso atual. Não criar configuração paralela de fuso.

Servidor: server/app.ts verifica Bearer com auth.verifyIdToken(token, true), incluindo revogação. contentCommand verifica e-mail e, dentro da transação, perfil/membership. Firestore Admin ignora Rules: o novo executor de leitura da Gika deverá checar explicitamente membership/profile, além do token. Firestore Rules permitem somente leituras privadas por uid/e-mail verificado/conta ativa, lists <=50; escrita cliente é negada por catch-all. Rules não dão leitura ao cliente de series/receipts/usageBuckets.

Persistência: activities/categories/notes/timeEntries/shoppingLists sob users/{uid}; itens sob shoppingLists/{id}/items; series sob users/{uid}; users/{uid}/internal/counts e activeTimer. commandReceipts/{uid}_{operationId} e usageBuckets por uid/minuto/dia são internos ao servidor. server/commands/identity.commandHash faz hash canônico do envelope. Retry do mesmo envelope retorna alreadyApplied; mesmo operationId com outro hash causa OPERATION_MISMATCH. entityId estável evita recriar sob ID diferente. Atualização exige expectedRevision exata e devolve REVISION_CONFLICT com estado atual, sem last-write-wins. Conteúdo desse details é privado e não deve ir para logs.

`contentCommand` genérico verifica serviceControls restricted, limite 60/min e 1000/dia, clientCreatedAt acima de 72h e estoque. Auditoria encontrou diferenças nos handlers de série: createSeries não replica todos os limites/expiração do genérico; updateFuture/trashSeries não consultam os mesmos controles/usageBuckets. Não declarar política/rate limit universal. Gika manterá essas operações desabilitadas até revisão/testes de M5; não refatorar backend fora de escopo em M0.

Offline é opt-in: leve.offlineEnabled; persistentLocalCache com persistentMultipleTabManager. IndexedDB leve-local-v1 v4 contém outbox-v2 (key uid:operationId e índice uid-createdAt), drafts e session-cache. sendCommand enfileira só NETWORK_ERROR, conta originária ainda igual, offline habilitado, comando não account.* e queueOnNetworkError !== false; sinaliza SAVED_LOCALLY como ApiError 202, não como sucesso servidor. Não inferir que request que perdeu resposta não executou: reaproveitar IDs e consultar receipt. flushOutbox usa liderança navigator.locks ou lease localStorage de 30s, ordena createdAt, respeita dependsOn, para em conflito/erro de rede. Após 72h reconcilia GET /api/commands/:operationId; ausência de receipt exige revisão, não replay cego. Cache de sessão permite abertura offline para conta previamente válida, não uma nova autorização de servidor.

Gika textual não funcionará com provedor offline. M1 mock deve poder mostrar esse estado sem quebrar Shell. M3+ preservará o caminho sendCommand/outbox e distinguirá fila local, aplicado, conflito, falha e resultado desconhecido. Chat/pending proposals começam em memória e são limpos no logout/troca de uid; nenhum histórico privado novo em localStorage ou Firestore por conveniência. Abort/generation devem descartar chamadas antigas após troca de conta.

Riscos adicionais: fallback de lease não é lock transacional; retry com envelope regenerado duplica efeito; confirmação não pode usar revisão nova silenciosamente; dado parcial ou cached não autoriza lote; undo requer estado/revisão fresca e policy, não rollback irrestrito; nenhum batch transacional genérico existe hoje. O service worker não cacheia /api; ele cuida apenas do shell/assets, enquanto dados privados seguem Firebase/outbox.

Segredos: env cliente VITE_FIREBASE_* públicos; Vite recusa nomes sensíveis com prefixo VITE_. server/platform/firebase.ts requer FIREBASE_PROJECT_ID, modo demo local com Auth+Firestore juntos, sem produção/emuladores misturados. Credenciais do provedor deverão ficar só no servidor. server/logger.ts aplica redação; não logar prompts, título/descrição, payload de comando ou tokens. Não há App Check integrado nos arquivos auditados; novo endpoint terá autorização/limites explícitos antes de ativar provedor.
