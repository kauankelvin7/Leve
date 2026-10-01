# M4-T3 — reagendamento simples

Entrada d23397136ce4033cd164f1628419cda2b97cf548, feat/gika-integration, worktree limpo verificado antes de editar. Fontes obrigatórias/evidências M3/T1/T2 relidas; humanizer-br oficial, processo manual equivalente ao Superpowers indisponível. Auditor auxiliar somente leitura; raiz possui estado/código/testes, sem writers concorrentes.

## Auditoria e diferenças do plano
Today.save (Today.tsx:190–246) edita dueDate e dueTime opcional e envia activity.update com ActivityInput/revisão. CalendarCommandModel usa o mesmo comando; drag/resize aplica somente eventos timed, não duração/snap15min a task. content.ts moveScheduleToDate preserva schedule da task ao mudar data; scheduleInstants/ActivityInput validam civil/IANA/DST/lembretes. contentCommand autentica e atomiza entidade/revisão/receipt/contadores/reminders. Recorrência distingue occurrence/future via updateFuture/split; bloqueada aqui, sem presumir escopo. Task sem horário não é event all-day.

M0 propunha ID do modelo: como T1/T2, tool strict title/date(selector)/patch{dueDate,dueTime opcional}; servidor resolve ID/revisão de um dia autenticado (default hoje, explícito <=366dias, cap50/partial). Sem fuzzy ou busca livre/histórico. Destino validado contra pedido original e parser civil já adotado: weekday próxima ocorrência incluindo hoje; amanhã/+2 e YYYY-MM-DD/DD/MM/YYYY. Segunda que vem/próxima/dia10 sem mês/ano pedem data completa; não criar nova regra temporal. Destino até366dias para manter bound. Horário HH:mm explicitamente pedido; omitido preserva horário/ausência/fuso/disambiguation reais, não defaults do perfil. DST validado com scheduleInstants existente antes de preview e novamente no writer. Não remover horário/lembretes implicitamente.

Policy original exige preview: descriptor estruturado, data/hora/fuso reais e botão Mover tarefa; nenhuma mutação só pela interpretação. Confirmação determinística do card conserva UID/requestId/revisão/patch, chama bridge→sendCommand→activity.update. Não envolve novo Gemini; não é PendingAction alto impacto/M5. Auth fresca no token/commit/replay/ack; versão original jamais renovada. Não adicionar undo genérico. Preview em memória, não restaurado após reload. Retry após dispatch conserva operação e receipt atômico existente; cancelamento pósdispatch não promete rollback.

Base narrow de T2 estendida por tag exclusiva gikaReschedule, patch temporal strict (T2 permanece title-only). Hidratação local a cada tentativa da MESMA transação convencional usando moveScheduleToDate e ActivityInput, preservando demais campos. Receipt mínimo descriptor original+patch+horário/fuso atual, no mesmo documento existente, permite replay depois do alvo mudar de dia. Sem nova coleção/Rules/índice/outbox/persistência paralela. No-op sem command/receipt/revisão; observações não duráveis conforme ADR014.

## Execução/gates
1. RED unit schemas/parser/resolução/preservação/identidade; implementar contrato/policy/receipt/bridge/preview conforme auditoria.
2. Auth/Firestore reais emulados, modelos fixture: válido/tempo/alvo/partial/recorrência/no-op/auth/revisão/replay/concorrência/lost response/divergência/pre/póscommit/unknown/arquitetura.
3. E2E desktop/mobile/dark/Axe: preview sem escrita, cancelar, ack retido/double tap/retry/conflito/auth, dados sintéticos exclusivamente. UI confirma só após ack.
4. Lint/build/dois TS/unit/integração/full E2E local/check/audit somente leitura; falhas novas comparadas a d233971, baselines preservados sem auditfix/timer/contraste.
5. Revisão spec/security/humanizer/diff; evidências/evals/estado/tarefas; commit atômico, checkpoint SHA real e worktree limpo. T3 done, M4 parcial aguardando M4-SMOKE após revisão; parar antes de M5 e sem Gemini live.
