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

## Shell, navegação e design system — M0-T4

App.tsx contém Protected → Shell → Outlet com Suspense. Entradas públicas: entrar/registrar/recuperar/privacidade/demo; autenticadas: hoje/calendario/notas/compras/atividade/revisao/buscar/configuracoes/lixeira. Gika planejada dentro de Shell, não no login/demo. Abrir/fechar assistente não altera pathname nem abandona formulário. Usar lazy-load do painel e ErrorBoundary local para falha da Gika não desmontar a agenda.

Fontes reais em main.tsx: DM Sans 400/500/600 e Nunito 400–800. design-tokens.json instala grupos color/space/radius como CSS custom properties. Ordem CSS: app, glass, refinements, editorial, theme-runtime. platform/theme.ts e packages/domain/src/themes.ts resolvem paletas/light/dark/system; Shell recebe solid/reduce-motion/high-contrast conforme perfil. Painel deve usar var(--color-text), --color-solid, --color-accent e tokens correntes; sem paleta própria ou fonte nova. Componentes reais a reutilizar: Icon, LoadingState, LoadError, BackButton, Avatar. ConfirmDialog usa dialog.showModal, Escape e restauração de foco; aria-labelledby está fixo em confirm-title, logo não montar dois diálogos com esse ID. RecurrenceScopeDialog em features/activities/calendar já implementa occurrence/future e deve manter esse vocabulário de domínio.

Mobile: refinements.css muda app-shell para bloco em <= breakpoint mobile e sidebar para navegação inferior fixa; usa env(safe-area-inset-bottom/top/right). ActiveTimerBar e barra de erro usam z-index 12 no canto inferior; no mobile ficam acima da navegação e has-active-timer aumenta espaço inferior. Um botão flutuante Gika não pode cobrir timer/quick-add/nav: reservar deslocamento quando timer ativo e verificar viewports 1440x900, 1366x768, 1024x768, 430x932, 390x844, 360x800. Painel mobile usa altura disponível/scroll interno e safe area; composer continua visível com teclado, 200% e conteúdo longo.

M1 exige foco inicial no composer, Tab contido quando modal, Escape fecha, foco retorna ao acionador; labels, live region de mensagens sem repetir todo histórico, loading/error/offline com retry preservando texto; IME não envia Enter antes de compositionend. reduced motion e preferência reduceMotion prevalecem. Fechar não executa comando. Estados e quick actions serão claramente simulados enquanto mock; não alegar consulta/salvamento real.

PWA: apps/web/public/sw.js cache leve-shell-v7, assets imutáveis e navegação network-first; /api excluído. main.tsx detecta update-ready e release-ready; não modificar política de cache por chat. vercel.json bloqueia microphone em Permissions-Policy: M7 depende de revisão específica desse header e consentimento/fallback. Publicação não é autorizada por criação de branch.

Evidência visual existente: tests/e2e-local/design, calendar-planner-visual, seasonal-experience e docs/screenshots. Nenhum screenshot novo necessário para mapa documental sem UI nova; M1 exigirá E2E autenticado/axe + screenshots focais e não poderá alegar validação em aparelho real com base em emulação desktop.

## Integração concreta planejada — M0-T5

Os caminhos abaixo são novos arquivos planejados, não código já existente:

- `apps/web/src/features/gika/`: GikaLauncher, painel/composer, estado de conversa, mockAdapter e commandBridge. Montagem em Shell de App.tsx com ErrorBoundary local e identidade por uid.
- `packages/domain/src/gika.ts`: schemas Zod estritos de request, tools, resultado mínimo e propostas/pending actions; importar ActivityInput/civilDateSchema/timeZoneSchema/entityIdSchema, não copiar regras.
- `server/gika/`: modelAdapter, toolRouter, readTools, policy e contexto autenticado. Rota Express `/api/gika/respond` registrada após middleware Firebase em server/app.ts; api/[...path].ts reaproveitado. Sem chave em VITE_ e sem SDK no M1.
- Bridge de mutação usa `apps/web/src/platform/api.ts:sendCommand`, nunca setDoc/updateDoc. create/update/setStatus reutilizam comandos existentes de server/commands/content.ts. Não há API CRUD paralela.

Fluxo M1: texto → mock previsível → resposta simulada; nenhum acesso a modelo ou mutação. Fluxo M2: texto → apiRequest autenticado → adapter servidor → allowlist somente leituras → executor determinístico → resultado validado → resposta. Leitura Admin será feita por executor de software, nunca pelo modelo ou query livre, com uid do token, perfil/membership ativo, intervalo limitado e dados projetados. Extrair a especificação das queries de useCalendarRange para função compartilhável somente quando necessário em M2, protegendo semântica inclusiva/exclusiva e overlap por testes. Não importar hook React no servidor.

Fluxo M3/M4: tool router valida intenção e policy antes de produzir descriptor tipado; bridge valida saída, traduz descriptor a comando conhecido e chama sendCommand. Não aceitar command/uid/path/envelope arbitrários gerados pelo LLM. Manter um envelope estável por ação lógica, idempotência existente e atualizações de revisão explícitas. O backend existente permanece autoridade de autorização/dados. Conteúdo vindo de tasks é dado não confiável, nunca instrução.

Fluxo M5 de alto impacto requer pending action server-side, identidade/digest/revisões/expiração, confirmação humana específica e executor no caminho de comandos autenticado. Acrescentar comando Gika mediado à dispatch de /api/commands somente nesta etapa, com delegação ao domínio existente e testes de receipt/retry/outbox; nunca expor generic arbitrary command. Confirmação meramente verbal do modelo ou flag `confirmed: true` enviado pelo modelo não é autorização. A implementação concreta de receipts da confirmação é gate M5 antes de habilitar essas ferramentas. Nenhum high-impact descriptor será executável pelo bridge de M3/M4.

### Contratos de ferramentas

Todas as entradas e saídas terão schemas runtime estritos em gika.ts. O modelo não fornece uid, credenciais, IDs de criação, operação/revisão, instante de agora ou timezone arbitrário. Contexto trusted contém uid autenticado, profile.timeZone, locale pt-BR, weekStartsOn, now UTC, today civil. Resultado de validação inválido é falha tipada e não produz efeitos.

| Tool | Entrada proposta fechada | Resultado mínimo / execução |
|---|---|---|
| get_today | {} | resolve today no fuso do perfil; intervalo de um dia |
| get_day | {date: civilDateSchema} | intervalo inclusivo date..date |
| get_week | {date: civilDateSchema} | semana contendo date conforme weekStartsOn; máximo sete dias |
| create_task (M3) | {title, dueDate: civilDate ou null, dueTime: civilTime ou null} | tarefa simples sem recorrência/lembrete; defaults descriptionPlain '', categoryId null, reminderSpecs [], timeZone trusted, reject; ActivityInput validado; create revisão 0 |
| complete_task (M4) | {activityId: entityIdSchema} | ID resolvido apenas dentre entidades conhecidas na conta; status completed; leitura fresca/revisão obrigatória |
| update_task (M4) | {activityId, title?} com ao menos alteração | merge determinístico com ActivityInput corrente; não aceitar substituição de campos ocultos |
| reschedule_task (M4) | {activityId, date: civilDateSchema, time?: civilTimeSchema ou null} | somente task não recorrente nesta fase; distinguir time omitido de null e preservar demais campos |

Saída de consulta: {startDate, endDate, timeZone, partial, cached, items:[{id,revision,title,kind,status,schedule,seriesId,occurrenceKey}]}. Retirar descriptionPlain, notas, compras, reminders e dados de identidade não necessários. Validar dados lidos e limites antes de enviar ao modelo; não usar type assertion como validação. Cap 50 por grupo e marcar partial se saturado; deduplicar IDs e excluir deletedAt. Resposta não afirma agenda vazia/completa se erro, partial ou cache desatualizado. Não materializar séries via leitura da Gika.

Saída de mutação: descriptor de ação validado → CommandResult validado; estados applied/alreadyApplied, queued (SAVED_LOCALLY), conflict (409), failed e unknown; returned revision/refresco de consulta, sem inventar item. Modelo não decide sucesso. `requestId` e `actionId` são UUIDs gerados pelo aplicativo e vinculados a uid, tentativa lógica e payload. Retry de rede da mesma ação mantém operationId/entityId/clientCreatedAt; texto igual enviado novamente pode ser nova intenção. Cancelar, editar proposta ou troca de conta invalida ação anterior.

PendingAction planejada: {id, ownerUid, tool, createdAt, expiresAt, summary, payload validado, payloadDigest, expectedRevisions, status: awaiting_confirmation/confirmed/executed/canceled/expired}. ownerUid e dados de autorização são atribuídos/verificados pelo servidor; não vão ao modelo. A UI confirma ID+digest, revalida contexto e não substitui revisões sem novo preview. Expiração e digest usados para bloquear replay. Undo de criação usa activity.trash com revisão fresca se entidade não foi modificada; não purga e não reverte alterações concorrentes.

### Gates de decisão e limitações concretas

Provedor não foi escolhido, nem há credencial configurada. O custo obrigatório R$ 0 exige decisão humana antes de habilitar provedor real no M2; M1 continua viável só com mock. Não selecionar plano pago, ativar billing ou adivinhar chave. Timeouts, request size cap, limite por uid e orçamento de tool calls serão necessários já no endpoint M2; M9 revisa/hardens, não adia a proteção inicial. Sem App Check factual hoje; avaliar no M9.

Domínio não oferece batch transacional genérico nem undo universal. M6 não poderá declarar atomicidade via Promise.all de comandos: gate para contrato composto validado/transacional ou proposta explicitamente sequencial com resultados parciais e recuperação. Recorrência inteira não suportada por updateFuture; não inventar scope series. Voz M7 precisa resolver Permissions-Policy microphone=() antes de afirmar funcionamento em produção. Proatividade M8 será opt-in/regra local, sem monitoramento LLM contínuo.
