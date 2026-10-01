# M4-T2 — update_task (título)

## Objetivo
Renomear uma tarefa simples inequívoca por pedido explícito. Patch apenas title, command layer convencional, sucesso estruturado só após ack. Parar antes de M4-T3, sem live.

## Contexto atual / auditoria antes do código
PRE02fe03e0ddf09d8f589c11a6cccc1c9c2df5bad5, feat/gika-integration, worktree limpo. Fontes/AGENTS/evidências M3/M4-T1/humanizer local relidos. Superpowers indisponível/processo manual equivalente; auditor auxiliar read-only, implementação serial.
Today.startEdit/save → sendCommand/activity.update + ActivityInput COMPLETO + expectedRevision → contentCommand único writer. Editor permite title, descriptionPlain, categoryId, colorHex, estimatedMinutes, schedule e reminderSpecs; type/status/recurrence possuem semântica separada. Título é primeiro e único campo exposto aqui. Schedule/data/horário/fuso/disambiguation são preservados, não editados. Separação de reagendamento é viável: patch sem schedule; M4-T3 permanece todo.
activity.update convencional valida ActivityInput strict; transaction preserva status/completedAt/createdAt/series, recalcula instantes, valida referências/categoria e recria reminderJobs para pending. Edição de completed/canceled é convencional; não herdar pending-only de conclusão. Categoria arquivada pode causar422 convencional, não contornar.
ReadItem M4-T1 omite campos privados/hidden e não pode virar fullInput com defaults. Diferença de contrato necessária: tag optional strict gikaUpdate limitada a activity.update/revision>0; payload{title} strict. Dentro de CADA callback transacional (não variável externa reutilizada em retry), projetar ActivityInput atual old preservando presença dos opcionais, aplicar patch e validar schema existente; depois usar MESMO ramo update/ref/reminders/receipt. Sem writer/endpoint/coleção ou regra de negócio paralela. Snapshot mínimo do receipt guarda descriptor original+patch para recuperar mesma operação após o nome antigo desaparecer; não precisa armazenar fullInput/descrição.

## Não objetivos
Outros campos editáveis, data/horário/reagendamento, status/reopen/delete/batch/recorrência/organização/undo genérico/M4-T3/M5+, live/billing, fixes de timer/contraste/audit/dependências/Rules/outbox.

## Contratos
update_task strict{title,date:null|civilDate,patch:{title}}; modelo não recebe/escolheIDs/UID/revision/operation/query/receipt. Validar intenção textual explícita antiga→nova, respeitar quotes/literais e não usar RHS como contexto temporal. Resolver só título exato trim/minúsculas, um dia hoje civil ou explicitamente mencionado até366dias, read layer cap/partial existente; todos estados/kinds contam antes de escolher. Ambígua/partial/none/unsupported sem command. No-op igualdade EXATA após trim, sem revision; mudança de case é alteração legítima.
updateTask{id,title,dueDate,timeZone,revision,patch} descriptor software → updateBridge/sendCommand/activity.update payloadpatch, gikaUpdate{requestTextHash}, revision original/requestId software. Auth após upstream/read/token/ack e dentro da transaction. Revision conflict sem current privado/refresh; copy específica, draft mantido, novo pedido explícito. Receipt replay antes de hidratação/preconditions, sem segunda escrita, entre instâncias. Envelope pendente local conserva alvo/revisão; receipt definitivo. Observações sem receipt/reload seguem limites ADR014.

## Passos / ownership
Root docs/estado/tarefas, domínio Gika, policies/router/read recovery, guard contentCommand, bridge/UI/testes. Auditor não escreve nem roda writers. RED unidade para schema/intent/patch/preservação; implementação mínima; unidade/integração/E2E e evals; revisão spec/security/copy/diff; evidência/commit/checkpoint limpo e parada.

## Gates
Lint/dois TS/build/unit; integração Auth+Firestore real emulada; E2E Gika+convencionais relevantes/local completo e check/audit. Writers sequenciais. Baselines explícitos comparados a02fe03e; qualquer falha nova investigada, não corrigir fora do escopo. Sem testes desabilitados/live/chave fictícia.

## Rollback
Revert tarefa preservando dados/receipts/trabalho alheio; não reset/push/deploy/merge. Downgrade não apagar receipts de operações em trânsito.

## Evidências / estado de retomada
Plano persistido antes do código. M4-T2 done; M4-T3 todo/não iniciado. M4_T2_EVIDENCE.md e artefatos sanitizados:262 unit/123 integração/10 E2E finais/lint/build/dois TS PASS;62/13 amplo com causas comparadas02fe;check12/1 e audit13 baseline. ADR015, apenas título. Sondas temporárias removidas; parar para revisão antes de T3. Commit atômico/estado no checkpoint documental posterior.
