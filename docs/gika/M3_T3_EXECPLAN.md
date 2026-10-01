# M3-T3 — undo seguro de create_task

## Objetivo
Desfazer exclusivamente uma criação Gika confirmada, por botão determinístico, sem Gemini.

## Contexto atual e auditoria PRE
2026-10-01, feat/gika-integration, fc30bf9c51a7978cf2cb22280ddaa67d59b48f6d, worktree limpo. Today.trash/ActivityDetail → sendCommand/activity.trash → contentCommand: payload {}, expectedRevision, soft-delete deletedAt/purgeAfter30dias e revisão incrementada. Trash.restore já restaura; purge é separado e proibido aqui. Não existe undo convencional de criação; existe lixeira. Queries ativas removem deletedAt. Receipt UID/operationId com hash e ack é gravado na mesma transação, antes da qual perfil/membership são revalidados; replay precede precondition e não escreve novamente. Outbox existente conserva envelopes, Gika continua online/queuefalse. Não criar coleção, endpoint de remoção ou writer paralelo.

## Contratos e diferença do plano
Undo é action UI, não tool. Contexto software em memória: UID original, creationOperationId/entityId real e revisão1. ID de undo determinístico SHA256(namespace,UID,creationOperationId), formato UUID; nunca título/data/modelo. Metadado opcional strict gikaUndo no envelope só permite activity.trash/revision1/target original/payload vazio, sem timestamps voláteis. Command layer valida UID, identidade e receipt de criação Gika na mesma transação existente. É necessária esta base mínima para distinguir um undo de um trash arbitrário; remoção permanece na implementação existente. Sem force delete/revision refresh. Já removida → erro claro sem escrever; alterada → conflito. Receipt do próprio undo retorna ack original/alreadyApplied após perda de resposta, inclusive concorrência. Histórico não é estado presente após restauração convencional posterior; replay não remove novamente.

## Não objetivos
M3-SMOKE live, fechamento M3, M4+, outras ferramentas/undo genérico, purge, batch, recorrência, chat persistido. Reload elimina card; backend pode reconciliar somente envelope preservado pelo transporte, não procurar por conteúdo.

## Passos e ownership
1. Tests RED do domínio/bridge e integração. 2. Schema/identidade compartilhados, validação mínima no contentCommand, bridge UI específico. 3. UI por card com guard de dupla ação, auth/signal e estado só após ack. 4. Evals/testes emuladores/UI/gates. 5. Revisão, evidência, tarefas/estado, commit/checkpoint limpo e parada.
Ownership serial /root: domain identity/gikaUndo, contentCommand, features/gika, testes/evals/docs/.agent. Sem subagentes. Superpowers indisponível: planejamento/TDD manual equivalente. humanizer-br oficial lida.

## Gates
lint, dois typechecks/build, unit, integração real Auth/Firestore, E2E local completo e check shell, audit produção. Emuladores/E2E sequenciais; regressões baseline T1/T2 reportadas, nenhum teste desabilitado. UI desktop/mobile/dark/Axe e agent-browser; nenhum Gemini live/segredo/billing/deploy.

## Rollback
Revert do commit de tarefa; preservar receipts já aplicados. Não apagar receipts nem reexecutar undo com identidade nova. Soft-delete continua recuperável na lixeira convencional. Model/arquitetura M0 intactos.

## Evidências e retomada
Em implementação; evidência final em M3_T3_EVIDENCE.md. Próxima ação autorizada exclusivamente T3; após concluir aguardar revisão e autorização/credencial M3-SMOKE, sem M4.

Revisão T3: vincular também entity.createdAt ao serverTime do receipt original para impedir ABA (purge convencional seguido de criação independente sob mesmo ID/revisão1). Teste real de comandos cobre este caso; undo não executa purge.

## Estado final
M3-T3 done:194 unit/76 integração,lint/dois TS/build e6 E2E focais finais PASS;63 E2E amplos50/13,check12/1,audit13 vulnerabilidades com baseline classificado e prova de timer emfc30bf9. Evidência completa M3_T3_EVIDENCE.md/ADR013. Código final preserva foco/aria-live e ABA; sem live/smoke/M4. Próxima ação: revisão humana T3, depois M3-SMOKE somente quando autorizado. Commit atômico/checkpoint documental posterior registra SHA real.
