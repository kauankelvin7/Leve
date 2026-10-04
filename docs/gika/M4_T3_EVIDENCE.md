# M4-T3 — reagendamento de tarefa simples

## Entrada/auditoria
PRE d23397136ce4033cd164f1628419cda2b97cf548, feat/gika-integration, worktree limpo antes de qualquer edição. AGENTS/fontes/ExecPlan/decisões/evidências M3/T1/T2 relidas. M4_T3_EXECPLAN.md persistido antes do código; auditor auxiliar somente leitura e implementação serial. Humanizer-br oficial aplicada; Superpowers indisponível/processo manual equivalente.

Today.save edita dueDate/dueTime opcional e envia activity.update/ActivityInput/revisão. CalendarCommandModel usa mesmo comando; drag/resize só eventos timed, não snap/duração inventados para task. moveScheduleToDate preserva schedule de task e altera dueDate; scheduleInstants/ActivityInput validam instantes, IANA/DST e lembretes. Recorrência distingue occurrence/future e split por updateFuture; nenhuma dessas operações exposta. Task sem horário não é evento all-day. Único writer contentCommand/atividade/revisão/receipt/contadores/reminderJobs convencional.

## Contrato entregue
Tool strict title/date do alvo/patch{dueDate,dueTime opcional}. Modelo não escolhe IDs/UID/revision/operation/receipt/query/fuso. Servidor resolve um dia autenticado (hoje por default ou explícito até366dias), cap50/partial, igualdade trim+case pt-BR, sem fuzzy. None/homônimos/partial/saturado/evento/série não produzem mutação. Recorrência exige decisão pela agenda convencional; não se presume ocorrência ou série.

Destino validado contra pedido original pelo parser civil já adotado: amanhã/+2/weekday incluindo hoje/data absoluta real. Segunda que vem/próxima/dia10 sem mês/ano pedem data completa. Destino bounded366dias. Horário HH:mm só explicitamente solicitado; omitido preserva ausência/horário/fuso/disambiguation reais. Remoção de horário por linguagem natural não exposta neste bloco. DST usa scheduleInstants existente antes do preview e no writer. Não apagar lembretes/campos automaticamente.

Policy original preview mantida: card mostra de/para/horário/fuso e botão Mover tarefa. Interpretação/descriptor nunca são sucesso nem escrevem. Botão determinístico guarda UID/requestId software/ID real/revisão original e usa rescheduleBridge→sendCommand→activity.update. Auth fresca após upstream/read/token/antes do commit/replay/ack; revisão não é renovada depois de conflito. Cancelar preview não escreve; cancelamento pósdispatch não garante rollback. Chat/preview não restaura no reload, sem persistência nova. Não é PendingAction genérico de M5 ou flag do modelo.

Patch temporal mínimo com tag exclusiva gikaReschedule adapta ActivityInput atual dentro de CADA tentativa da MESMA transação, via moveScheduleToDate/validação convencionais. Preserva título/notas/categoria/cor/estimativa/status/horário não pedido/reminders/metadata/ausência de opcionais. Receipt atômico existente guarda somente original+patch/horário/fuso mínimos para replay quando alvo sai do dia antigo. Sem coleção/índice/Rule/infra de dedup/outbox nova. At-most-once é transação, nunca Map. Divergência com mesmo ID conflita; outro UID tem namespace privado separado. Mismatch concorrente reconcilia receipt já comprometido uma vez antes de novo ack; provider não é chamado nesse replay.

UI usa RescheduledTask strict local derivado de descriptor+ack entity/op/revision correspondentes. Card de sucesso só depois de applied/alreadyApplied real; ack retido/póscommit perdido nunca confirma antes. Conflito preserva trabalho e diz “Essa tarefa mudou antes do reagendamento. Faça o pedido novamente.” Sem Undo genérico ou novas mutações.

## Testes/revisão
RED unit inicial módulos ausentes; GREEN parser/patch/schema/resolução/identidade. Unit cobre amanhã/sexta/segunda/absoluta/data civil trusted, aspas/case/trim/no fuzzy, ambíguas/inválidas/compound/time inventado/unknown, no-op e timezone/DST, preservação dos campos. Integração real com Auth/Firestore/command/receipt: criação de fixture, alvo exato, time/ausência, explicit19h, destinos civis, none/multiple/partial/cap50/recorrência, revisão, outro UID/mesmoID, reauth upstream/read/command/replay, função repetida, payload divergente, falha antes/depois commit e concorrência/retry/lost ack. Nenhuma escrita em deny.

Primeira integração expandida atingiu o limite EXISTENTE de120 interpretações por instância do harness (139 PASS/11 FAIL429). Separação dos novos testes para processo de integração próprio, sem relaxar quota/código; final150 PASS/5arquivos. Primeira focal UI5/7 PASS: dois testes procuravam label Mover tarefa depois de botão virar Movendo; timeout da nova sonda de double tap, não produto. ElementHandle mantém alvo original e assert de comando único; final7/7 PASS, sem desabilitar teste/alterar deadline original. Imports estáticos eliminaram warning novo de import dinâmico ineficaz; apenas warning chunks preexistente permanece.

Evals E30/M4-E21..E30 em EVALS.md. Auditor read-only não identificou bloqueio de spec/auth/strict/temporal/receipt/preview. Revisão React/humanizer/escopo e screenshots desktop light/mobile dark. Interpretação fixture, persistência/commands/receipts/Auth reais emulados demo-leve; não é prova Gemini live.

## Gates
- Lint PASS; build/dois TS PASS; unit295/39 arquivos PASS.
- Integração150/5 arquivos PASS.
- Focal reschedule7/7 PASS, desktop light/mobile dark/Axe, cancel/double tap/ack retido/lost ack/retry/conflict/auth; sete novos cenários também PASS na suíte ampla.
- Check: build/dois TS/295 unit PASS; shell12 PASS/1 FAIL baseline color-contrast demo (3,59..4,17:1 para4,5:1), estilos/demo/harness intactos.
- Audit produção:13 baseline(9moderate/4high), package/lock bytes iguais; sem audit fix/force.
- Local completa82:67 PASS/15 FAIL,25,7min.49/51 Gika PASS, dois rename antigos falharam em prazo de transporte. Resultado amplo não verde. Comparação isolada/sondas detalhada abaixo e em m4-t3-transport-baseline.json; comparação final atual8 PASS/2 FAIL históricos, base4 PASS/2 FAIL históricos +4 sondas PASS. Todas as51 Gika únicas tiveram passagem observada nas execuções atuais (49 ampla+2 rename finais).

## Baselines e classificação contra entrada
26 arquivos byte-idênticos a d233971 em m4-t3-baseline-files.json: conventionalUI/styles/timer/launcher/Rules/API/outbox/harness/deps. Três Planner conhecidos (completed4,28:1; Frequência escondida), design tutorial já concluído, signup botão não exact, Notas/Meu dia duplicados, backup/tutorial labels antigos preservados. Timer PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE comprovado fc30bf9/T3 passou aqui; passagem não corrige baseline. Offline antigo era regressão corrigida M2-S0, não baseline atual.

A suíte ampla adiantou duas falhas históricas de persistent52/164: activity.create ainda pendente no deadline10s, em vez de chegar aos problemas antigos de calendário/navigation. Sync entre abas, manual e dois rename também excederam deadline. DOM mostrava Salvando/Consultando, sem success/retry/conflict prematuros. Trace disponível de conflito: edição convencional HTTP200/10006,268ms, depois409/18,44ms; manual/creation/sync requests sem ack na asserção. Trace do rename lost não estava disponível/íntegro, não inventar timing/status para esse caso.

Cópia git archive d233971 com dependências iguais, API própria8789 e Vite5177; emuladores de teste compartilhados, escritores sequenciais. Somente porta proxy/fs.allow no setup temporário fora do repo; produto sem workaround. Agent-browser verificou base e atual. Originais na base: dois rename/manual/sync4PASS; persistent52/1642FAIL nas causas históricas de calendário/navigation depois de criação real. Quatro sondas PASS na base e na atual (comparação atual10 testes:8 PASS/2 FAIL nos mesmos calendar/navigation históricos). Sondas temporárias de atraso10200ms vs timeout ORIGINAL10000ms reproduzem rename lost/conflict/creation/manual nos dois SHAs: asserção vence antes, depois ack/retry/conflito/lista/history/reload reais continuam coerentes. Sem mudar testes convencionais/timeouts; sondas removidas antes do commit. Classificação: ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE, distinta de regressão do reagendamento. Não inferir causa infra mais específica sem prova.

## Limites/parada
M4-T3 somente task simples com data; T2 continua title-only. Sem batch/série/delete/organização/M5/novo undo. Sem Gemini live/chave fictícia/credencial/.env/billing/cartão/push/deploy/merge. gemini-3.5-flash-lite/medium mantidos; proxy/egress histórico Codex Remote só configuração ambiente, nada no produto. Warning MetadataLookup403 emulador não impediu gates.

M4-T3 concluída após classificação/revisão/gates/evidências; M4 permanece parcial. M4-SMOKE registrado blocked até revisão e autorização específica live; não executar agora, não iniciar M5. Commit atômico código/testes/docs/estado/tarefas, SHA real em checkpoint documental posterior; worktree limpo verificado ao concluir.

Checkpoint atômico M4-T3: `f774d9c9b1466683e418be8b59f83615eb9495e7`, branch feat/gika-integration e worktree limpo confirmados após commit. Checkpoint documental posterior só registra SHA real; nenhum gate funcional repetido por essa atualização de memória. M4 in_progress/M4-SMOKE blocked para revisão/autorização; parar antes de M5, sem live.
