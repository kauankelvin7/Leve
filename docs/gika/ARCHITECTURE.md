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

`CONTINUAR.md` referencia f7894a5, anterior ao HEAD real f6b21b6 (confirmado por git log). O pedido atual autoriza Gika, não a Fase 7 do plano sazonal nem deploy. O AGENTS.md original foi preservado e as regras do pacote anexadas; custo obrigatório R$ 0, sem publicação nem credenciais administrativas. `05-capacidade-e-revisao.md` é citado, mas não existe no checkout. Superpowers não está disponível; processo equivalente manual. humanizer-br é exigida pelo AGENTS.md; agora a implementação local oficial fornecida pelo usuário está em .agent/skills/humanizer-br/SKILL.md (ADR-008).

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

PWA: apps/web/public/sw.js cache leve-shell-v7, assets imutáveis e navegação network-first; /api excluído. main.tsx detecta update-ready e release-ready; não modificar política de cache por chat. Na entrada M0, vercel.json bloqueava microphone. M7 altera somente para microphone=(self), com gesto/permissão/fallback; ver seção M7. Publicação não é autorizada por criação de branch.

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

Registro M0: naquele checkpoint não havia provedor escolhido nem credencial. Escolha posterior autorizada em ADR-009 e implementação M2 abaixo; credencial ainda ausente. M1 permanece testável com mock. Não selecionar plano pago, ativar billing ou adivinhar chave. Timeouts, request size cap, limite por uid e orçamento de tool calls serão necessários já no endpoint M2; M9 revisa/hardens, não adia a proteção inicial. Sem App Check factual hoje; avaliar no M9.

Domínio não oferece batch transacional genérico nem undo universal. M6 não poderá declarar atomicidade via Promise.all de comandos: gate para contrato composto validado/transacional ou proposta explicitamente sequencial com resultados parciais e recuperação. Recorrência inteira não suportada por updateFuture; não inventar scope series. Voz M7 revisa Permissions-Policy para microphone=(self); não afirmar funcionamento em produção sem deploy/dispositivo reais. Proatividade M8 será opt-in/regra local, sem monitoramento LLM contínuo.

## Implementação M2 — 2026-09-30

Provider escolhido pelo usuário: Gemini Developer API gemini-3.5-flash-lite, medium, Free Tier sem billing (ADR-009/011). server/gika/model.ts é a interface de interpretação independente; gemini.ts não importa Firebase/commands. Uma chamada HTTP por pergunta; resultados da agenda nunca vão ao modelo. Narrativa livre é descartada; respostas/itens são formatados deterministicamente.

POST /api/gika/respond passa pelo middleware Firebase ID token existente e body cap 12 KiB; request {requestId,text} idêntica à M1. Admin executor verifica email, membership/profile ativos e controls normal. Só get_today/get_day/get_week; argumentos strict (sem uid/path), data civil do perfil, weekStartsOn e intervalo <=7 dias, distância <=366 dias. Toda allowlist/policy é validada antes de leituras; resultados strict com até50 itens, cap50 por grupo, dedup e exclusão de deletedAt. Query adicional de séries ativas (cap50) sinaliza horizonte incompleto; não materializa/escreve nenhuma ocorrência. Descrições/notas/identidade/reminders não são expostos.

Deadline model10s e rota15s, cap3calls/64KiB resposta, limites locais por uid 3/min/10/dia UTC, single flight, 120 requests/dia por instância, mapa<=5000. Limites em memória não são quota global distribuída nem garantem retenção entre cold starts: a garantia financeira depende de projeto Free Tier sem billing; quota upstream 429 é falha graciosa sem retry/fallback. M9 poderá revisar limite distribuído sem antecipar escrita de agenda em M2.

UI mantém GikaAdapter(request,signal), draft/retry/cancelamento e componentes M1. Response continua text/simulated, union real acrescenta reads obrigatórias; preview é permitido somente simulated:true. Produção usa apiAdapter; regressões M1 injetam mock pelo mesmo módulo adapter.ts. Resposta tardia é descartada por AbortSignal/uid; nenhuma pergunta entra na outbox/sendCommand. A consulta não é disparada ao abrir painel nem em background.

## M3-T1 implementado — uma criação simples

Auditoria refeita no PRE92cc9c7: Today.save → sendCommand → POST/api/commands → contentCommand/activity.create é o único caminho de escrita reutilizado. M0/ADR005 continuam válidos. A implementação M3-T1 segue o bridge cliente previsto: modelo → router → schemas strict → policy → descriptor → commandBridge/sendCommand → comando existente. O router não grava tarefas; a UI recebe createdTask somente depois do receipt real validado e correspondente ao envelope. Narrativa upstream é descartada; não é prova de sucesso.

create_task aceita somente title/dueDate/dueTime, declarados via parametersJsonSchema com additionalProperties:false e validados em runtime com Zod strict. title/civilDate/civilTime/timeZone e ActivityInput usam schemas existentes. Contexto civil vem do perfil autenticado. Hoje/amanhã/depois de amanhã/dia da semana/data civil explícita são resolvidos deterministicamente a partir do pedido original e comparados aos args. Dia da semana inclui hoje. Próxima sexta/que vem, ausência de título, título isolado, recorrência/lote/ações posteriores exigem esclarecimento; não inferir data. Pedido de criação explícito sem data pode criar tarefa sem data, conforme ActivityInput já permite. Horário só quando informado, com disambiguation reject e validação temporal do domínio.

UID, timezone, operationId/entityId/revisão/defaults não vêm do modelo. Bridge usa usuário corrente, mantém IDs da tentativa como Today e revalida UID/cancelamento após espera upstream e após getIdToken, antes do dispatch. /commands verifica novamente o token; contentCommand confere perfil/membership/controles na própria transação. Outbox da Gika desabilitada nesta etapa: queued/erro/receipt inválido nunca significam criação. Cancelamento após dispatch não garante rollback; a mesma tentativa mantém envelope estável enquanto pendente. Isso é base mínima do comando existente, não conclusão de M3-T2. Novas submissões/reloads/concurrency/duplicate protection amplo e undo permanecem pendentes em T2/T3. Nenhuma alteração de contentCommand/Rules/persistência ou nova arquitetura.

## M3-T2 — identidade durável com a infraestrutura existente

ADR-GIKA-012/M3_T2_EXECPLAN.md substituem a base de memória de T1. A UI já cria requestId por intenção e conserva no retry/double submit; agora bridge usa requestId como operationId/entityId e metadado opcional strict gika.requestTextHash. IDs não vêm do modelo, e conteúdo igual com novo ID continua permitindo nova tarefa. Envelope reconstruível não tem timestamp variável; ActivityInput/revisão/defaults iguais. UI/mock response não mudou.

contentCommand continua a única escrita. Mesma transação já existente lê auth/receipt/entidade e cria tarefa+receipt; agora inclui no receipt apenas hash do texto e snapshot task derivado do ActivityInput simples validado. Nenhuma coleção, índice, outbox, lock distribuído ou Map novo. Hash canônico integral rejeita outra intenção/payload para o mesmo ID; response original e revision1 retornam com alreadyApplied. UID do token delimita tanto tarefa quanto receipt.

ReadRepository.authorize preserva permissões e aceita propósito receipt exclusivamente para recuperação: serviceControls restringe novos pedidos antes do modelo, mas não bloqueia replay comprometido, como o receipt branch de contentCommand. Novos pedidos fazem uma autorização adicional de disponibilidade. ReadRepository ganhou recoverCreation: leitura privada de receipt depois de authorize, compara UID/hash, valida snapshot/response e reautoriza antes de devolver descriptor histórico. Retry após commit não invoca modelo nem recalcula data relativa/fuso; bridge obtém nova autorização e ack da mesma transação antes de mostrar createdTask. Race entre interpretações diferentes para mesmo pedido recupera snapshot uma vez após OPERATION_MISMATCH. Texto diferente continua conflito, sem segunda criação. Antes do commit não existe resultado comprometido: retry pode interpretar contra contexto atual, mantendo o mesmo ID; apenas uma transação pode criar.

Calls create_task iguais são colapsadas somente depois de schema strict de todas as chamadas; calls diferentes/mistas continuam negadas. Não colapsar solicitações intencionais distintas. Receipt de criação é histórico: não descreve estado atual de tarefa editada/apagada mais tarde e não restaura/executa undo. Retenção/exclusão são as do Leve (sem TTL observado, purge dos receipts na exclusão da conta); não armazenar chat nem logs de conteúdo/hash. Quota/indisponibilidade continuam fallback, agenda convencional independente. M3-T3 e posteriores permanecem fora desta entrega.

## M3-T3 — undo específico e determinístico

ADR013/M3_T3_EXECPLAN.md: ação UI sobre ack create_task, contexto em memória UID/operation/entity/revision1. creationUndoBridge → sendCommand/activity.trash → contentCommand existente; sem modelo/novo endpoint ou persistência Gika. ID software UUIDv8 derivado do namespace/UID/create operation, metadado strict gikaUndo limitado ao alvo original/rev1/payload vazio. Transação lê e valida receipt Gika original junto a auth/receipt undo/entidade e reutiliza soft-delete30dias; revision2 ack. Receipts atômicos existentes cobrem concorrência/lost ack/replay. Edição posterior conflita, já removida informa sem nova escrita, restauração posterior não é desfeita por replay histórico. Lixeira convencional permanece restaurável. Card é grupo acessível com ação/estado próprio; não restaura conversa após reload. Não fechar M3 nem executar live antes da revisão/M3-SMOKE.

## M4-T1 — conclusão única resolvida

complete_task{title,date:null|YYYY-MM-DD} não contém ID/UID/status/revisão. completePolicy valida contra pedido original/parser civil existente; default hoje do perfil, um dia explícito até366dias, igualdade trim+minúsculas pt-BR, sem fuzzy. reads.read autenticado/limitado fornece candidatos; resolução de TODOS estados/kinds antes de policy, partial/mais de um nega mutação. Apenas task pending não recorrente. Resolução já completed/sem candidato/ambígua é estruturada e não chama comandos.

ID/revision do read layer→completeTask descriptor→completionBridge/sendCommand/activity.setStatus→contentCommand existente. requestId software é operationId, entityId é alvo real separado. gikaCompletion{requestTextHash} canônico/strict; receipt EXISTENTE atomiza status+snapshot mínimo+ack, recuperável antes do provider com auth fresca. Nenhum Gemini/router/model escreve banco. Envelope pendente em memória conserva revisão no retry local; receipt é garantia entre instâncias. Resultado completedTask só após ack entity/op/revision+1; conflito não renova precondition. ADR014 documenta observações sem receipt e limites antes do primeiro commit/reload/timer. Sem update/reschedule/reopen/batch/série/undo novo/live.

### M4-T2 implementado — título como patch

`update_task{title,date,patch:{title}}` usa a resolução autenticada/bounded/exata do T1. Modelo não identifica entidades nem revisões; servidor produz descriptor original. Bridge → sendCommand → activity.update/contentCommand existente, expectedRevision original, tag strict gikaUpdate, patch-only. O writer convencional hidrata ActivityInput atual dentro de cada tentativa transacional e valida no ramo existente, preservando campos não solicitados e ausência de opcionais. Nenhuma segunda persistência. Receipt privado original+patch recupera rename depois de o nome antigo desaparecer. UI updatedTask só após ack; no-op sem command, conflito sem revision refresh. ADR015, M4_T2_EXECPLAN/EVIDENCE. Sem alteração temporal, status, recorrência, delete ou novo undo; M4-T3 permanece separado.

## M4-T3 — reagendamento simples com preview

reschedule_task strict `{title,date,patch:{dueDate,dueTime?}}` usa selector autenticado de um dia, default hoje civil, <=366dias, cap50/partial, matching exato trim/minúsculas sem fuzzy. Destino é ancorado no pedido original pelo parser civil existente: amanhã/+2/weekday incluindo hoje/YYYY-MM-DD/DD/MM/YYYY; próxima/que vem/dia10 sem mês/ano pede esclarecimento. Nenhum ID/revisão/UID/receipt/query/fuso do modelo. Somente task simples com data; evento/série/ocorrência não tem descriptor de mutação.

Horário omitido preserva dueTime ou ausência, fuso/disambiguation reais. Patch temporal adapta ActivityInput dentro de cada tentativa da MESMA transação activity.update usando moveScheduleToDate/scheduleInstants existentes, sem reconstrução de tarefa ou novos defaults. Revision original/ownership/auth/refs/reminders/receipt existentes; gikaReschedule guarda snapshot mínimo original+patch, permitindo recuperação antes do provider quando alvo deixa dia antigo. No-op sem command; conflito sem refresh; unknown/temporal inválido não escreve. T2 permanece title-only.

Contrato M1/M2 acrescenta descriptor preview/resolução estruturados; GikaReschedule mostra de/para/horário/fuso e botão Mover tarefa. Confirmação determinística→rescheduleBridge/sendCommand, sem interpretação upstream; rescheduledTask é resultado local validado só após ack real. Cancelamento antes de envio não escreve, retry depois de lost ack conserva requestId/revisão. Mismatch concorrente reconcilia receipt comprometido uma vez antes de novo ack. Sem infraestrutura genérica PendingAction/M5/undo, sem persistência de conversa no reload. ADR016/M4_T3_EXECPLAN.

## M5-T1 — classificação determinística complementar

`server/gika/actionPolicy.ts` classifica fatos strict fabricados pelo servidor em allow/clarify/confirm/deny tipados. Registro fechado das quatro mutações atuais; nenhuma ação futura herda allow. `policyAssessment.ts` deriva cardinalidade/estado/recorrência/completude/campos a partir da intenção validada, leitura autenticada e resolução já existentes, sem novas queries. Router exige allow para create/complete/update e confirm para reschedule antes de emitir descriptor. Schema, auth/ownership, precondition e receipt do domínio permanecem autoridades independentes; decisão não integra o contrato HTTP nem equivale a ack.

Replay utiliza apenas snapshot privado validado do receipt, reautorização e fatos históricos; receipt comprometido em corrida precede gate de resolução nova. UI ainda precisa ack convencional real. Engine sem provider/persistência/command/logger, adapter observa somente action/decision/reason/bucket anônimos pelo logger existente. Bulk, recorrência e destruição são classificáveis, mas não executáveis. Preview de uma tarefa preservado; PendingAction/confirmation genérico pertence a M5-T2, não implementado. ADR017/M5_T1_EVIDENCE.md.

## M5-T2 — confirmação específica sem persistência de preview

O contrato executável atual é GikaConfirmation strict: policy confirm/risk/reason, action fechada reschedule_task, descriptor original, resumo derivado before/after/changedFields e selo server-only ligado ao UID/operação/textHash/validade. O card é genérico na apresentação e fechado na execução; outros tipos não ganham executor por convenção. Só o comando activity.update convencional aplica o patch, com revisão e receipt atômicos; UI aguarda ack. Cancelamento não chama API/modelo nem escreve.

O antigo planejamento de PendingAction persistida é histórico: neste escopo o preview e a conversa continuam em memória. /api/gika/recover-confirmation é leitura privada de receipt comprometido, sem provider/resolução/renovação. Nova operação exige selo válido; receipt exato já comprometido permite replay mesmo expirado/rotacionado. Chave derivada do SCHEDULER_HMAC_SECRET existente, sem configuração frontend/dependência/coleção/writer adicional; produção sem chave falha fechada na confirmação. Preview local não comprometido pode invalidar após restart; reload não restaura card. ADR018 detalha limites e compatibilidade legacy. M5-T3/T4 não habilitados.

## M5-T3 — occurrence/future, sem motor paralelo

RecurrenceScope executável é occurrence/future, conforme Today/Planner; proposal 'all' é negada (não existe edição de toda a série histórica). Model proposals strict não têm IDs/UID/revisões/operation. Pedido original valida scope explícito fora de títulos entre aspas; servidor resolve alvo exato/civil/bounded e inspeciona série real. Ausência de escopo produz recurrenceChoice assinada, não grant. choose-recurrence é seleção autenticada/software-bound sem provider; revalida snapshot original antes da recurrenceConfirmation específica.

M5-T2 signer/chave/validade são reutilizados com propósitos distintos de choice/confirmation. Effect vincula operação, patch-only, scope, entidade/revisão/contexto e nova série software quando future. ContentCommand/activity.update/setStatus/updateFuture permanece único writer; snapshot canônico revalidado na mesma transação que receipt/mutação. Series.revision histórica não cobre split/materialização; hashes de série/alvo/conjunto futuro cobrem essas mudanças, sem refresh ou conteúdo privado no modelo.

Occurrence não modifica template/irmãs e mantém IDs; complete não suporta future. Future usa split convencional, novo seriesId/IDs, somente membros íntegros pending/revision1/template-equivalent, sem lacunas, cap50+sentinel51 e budget450. Controles/quotas/referências/reservedstock verificadas somente nesse novo ramo Gika; handlers manuais/worker não foram refatorados. Receipt privado original recupera antes de Gemini e sustenta replay exato. Ack future identifica a série realmente criada/revision1, occurrence ID original/revision+1. UI só confirma ack real; cancel/choice/preview sem mutação, reload sem restauração/execução. Sem batch/M5-T4/novo Undo/recorrência criada por IA.

## M6 — organização por proposta sobre o batch existente

Uma leitura bounded de hoje ou get_week precede ModelAdapter. Somente até5 tarefas pendentes datadas de hoje em diante entram no contexto mínimo (slot temporário, título/status/data/horário/fuso/indicador recorrente). Strict propose_organization cobre cada slot uma vez com keep/move; software resolve IDs, releitura integral/revisões, datas civis/DST, cap e occurrence explícito. Partial/saturado/escopo incompatível não emitem confirmação. O modelo não escolhe entidade, UID, revisão, comando ou receipt.

O mesmo BatchPlan incorpora antes/depois e preservados; signer/propósito batch selam todo efeito. Semana amplia somente essa variante para o intervalo civil existente. M5 sem organization conserva seleção de um dia e invariantes anteriores. Mesmo guard na transação activity.update revalida pendentes e preservados, sem renovar revisão; mesmo bridge sequencial/receipts/acks apresenta aplicado/já aplicado/conflito/falhou/pendente/desconhecido. Não há atomicidade global prometida.

Novo pedido invalida preview anterior; confirmar/cancelar não chamam Gemini. Offline bloqueia envio e confirmação, preserva draft/cancelamento e não executa ao reconectar; nenhuma fila nova. Conversa/preview não restauram reload. Sem writer/coleção/outbox/Rule/dependência/Undo novo; layout responsivo aprovado preservado. ADR021 e M6_EVIDENCE.md detalham limites e provas.


## M7 — voz preenche o mesmo composer

useVoiceInput encapsula somente SpeechRecognition/webkitSpeechRecognition nativas; estados, finais, limite do composer, preservação de draft e lifecycle/abort. GikaComposer oferece gesto, cancelamento e revisão/edit; não existe autoenvio/voice endpoint/parser/command/policy/confirmation/persistence. GikaLauncher keyed por session.uid descarta captura no logout/troca. Offline/loading/close abortam e não retomam ao reconectar. Header permite microfone somente self; API ausente/contexto inseguro/policy bloqueada deixam fallback textual.

Browser pode enviar áudio ao seu serviço de reconhecimento (MDN documenta Chrome server-based); não se escolhe nem se garante serviço/localidade/retention do fornecedor. UI informa isso antes do gesto. Leve não cria blobs, armazena áudio, loga transcrição ou envia áudio ao Gemini; apenas texto enviado conscientemente percorre pipeline textual normal. Fontes/suporte/gates/limites em M7_EVIDENCE.md; nenhum deploy ou hardware real em CI.

## M8 — regra local sobre a leitura existente

Today entrega facts da sua leitura existente bounded (três limit50, flags loading/error/partial) a daySuggestion. Somente4–5 tarefas pending hoje geram uma sugestão; fingerprint civil/IDs/horários, sem conteúdo privado, memória de até8 dismissals por contexto Today/UID. Nenhuma nova query/persistência/timer/model/command.

Pedir sugestão faz somente handoff autenticado por evento UI ao launcher existente, abre lazy panel e prepara “Organiza meu dia” se draft vazio. Draft existente preservado. Envio manual segue M6; confirmação M5/M6 continua necessária. Close invalida handoff ainda não consumido; sequência monotônica diferencia novas intenções. Offline mostra hint local, não abre novo painel nem enfileira pedido/reconexão. Reload não restaura sugestão descartada nem executa. Nenhum TTS/mic automático/Character; mesmas superfícies daily-brief/panel/tokens, sem CSS/dependência nova.

## M9 — limites preservados

Command/domain layer, Rules, modelo/router, receipts, scopes e persistência permanecem inalterados. Hardening no envguard/logger, CSS de origem e target do guia; guard de imports AST/verify/CI crítico usam dependências/harness já existentes. AppCheck adiado operacionalmente conforme ADR023; limiter por instância não promete proteção distribuída. Character Bible/specs em design/gika-character-foundation@3b3011c8b4ea0a5a19b5d7f18be06eb18767d8db foram lidos; no checkpoint inicial M9 não havia asset/rig real nem authoring Rive no ambiente. CHARACTER_ASSET_REQUIRED impede conclusão visual/RC; nenhum renderer/controller sem consumidor ou substituto genérico foi criado.

Retomada sobre e28da58: Rive CLI oficial1.3.0 instalado fora do projeto, autoria RML/compilação/renderização locais comprovadas por exemplo oficial temporário. Não é rig da Gika. Referência aprovada/visual lock em docs/gika/character; master/rig reais ainda ausentes. Autorização posterior78f03ea/ADR024 permite Free/splash durante desenvolvimento e Cadet na export final sem splash após aprovação integral do asset/rig; custo não bloqueia autoria e nenhuma assinatura foi iniciada. Dois ensaios auxiliares de auto-trace não passaram fidelidade/estrutura para rig, VECTOR_ASSET_HUMAN_REFINEMENT_REQUIRED. Detalhes/fontes/primeiras falhas em M9_EVIDENCE; nenhuma dependência/runtime/writer novo integrado.


Correção posterior ADR025: raster PNG em camadas + meshes/bones Rive é caminho oficialmente suportado e comprovado num busto fiel da própria referência. A necessidade inferida de vetor integral/humano definitivo foi superada; os auto-traces continuam reprovados. Fonte/RML/.riv de diagnóstico em assets/gika, sem importação no produto. Backing de pele/pálpebras, expressões registradas, underlap e matte ainda impedem aprovação visual final. Sem runtime/controller novo ou mudança no pipeline funcional; idle+blink aprovados precedem integração e QA completa. Não confundir oito artboards diagnósticos (quatro ensaios×duas cores) com estados semânticos concluídos.


Hybrid Bust v2 resolve no ensaio o backing/closed lids/underlap/matte com o PNG original e14camadas; RML/Rive permanecem fora de public/UI/React. Authoring/QA determinísticos, sem modelo/inpainting generativo/novo parser. Mecha master permanente conforme ordem de autoridade corrigida, donor só fornece pálpebras. Idle inclui blink; restante dos estados e lifecycle/performance de produto pendentes. Gate autoral PASS não declara Character/M9 final nem altera arquitetura funcional/licença final.


## Character — consumidor visual essencial (ADR026)

UI reduz fatos já conhecidos a flags/eventos sem payload; controller local determina rest/idle/blink/listening/thinking/clarify/success/error/offline e escreve somente GikaVisual.mode no rig. Nenhum conteúdo, UID/entityId/receipt/command chega ao renderer, nem a personagem pode executar ações. Listening apenas voz real; sucesso somente após ack validado, batch parcial continua explícito e não dispara success global. Commands, model adapters, signer/policy, Auth/Rules e persistência intactos.

Um RiveCanvas lazy e uma única presença: welcome enquanto conversa vazia, header quando ativa; fallback PNG v2 fiel inline no chunk do painel. Reduced motion (sistema ou perfil), closed/hidden/offline removem runtime; effect cleanup libera renderer/VM/file/observer/timer. Assets embutidos no RIV, WASM same-origin/CDN fallback desligado; CSP mínima wasm-unsafe-eval + img-src blob: para decode oficial. Rig unsigned/scriptless é artefato de desenvolvimento/revisão, não export final sem splash aprovado; ADR024 permanece. Não há voice/router/command/policy paralelo ou persistência de personagem/conversa.

## Conversa geral e roteamento (produção)

O mesmo adapter Gemini interpreta três categorias, representadas por chamadas estruturadas: `respond_conversation` para conversa geral, `get_today/get_day/get_week` para consultas e as ferramentas de ação existentes para agenda. O provider usa function calling obrigatório; o parser continua descartando narrativa livre. A resposta conversacional é texto validado (até 1.000 caracteres), não um descriptor. Não pode ser combinada com leituras ou ações; a resposta marcada como `conversation` não aceita dados ou efeitos de agenda.

O dispatcher preserva autenticação, `serviceControls/global`, quota e reautorização após o provider para todas as categorias. Uma saída sem ferramenta nunca assume criação. A criação exige verbo explícito no pedido atual: título + data isolados pedem esclarecimento. Demais ações conservam validators, policy, command layer, receipts, revisions e confirmações.

Follow-ups usam até seis turnos de conversa geral, com até 1.000 caracteres cada, em memória no painel. Não se incluem resultados de agenda, descriptors, receipts ou metadados de identidade. O painel é remontado por UID e perde o contexto no logout/troca de conta. O servidor valida o histórico como conteúdo não confiável; ele nunca autoriza ações anteriores. Não existe persistência de conversa ou novo caminho de escrita.
