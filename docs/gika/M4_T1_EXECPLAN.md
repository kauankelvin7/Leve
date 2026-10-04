# M4-T1 — complete_task

## Objetivo
Concluir uma tarefa única por intenção explícita, resolução autenticada e comando convencional; UI só confirma ack real. Parar antes de M4-T2, sem Gemini live.

## Contexto atual / auditoria antes do código
PRE56b9308f8311fbd3e7e97a08530a366ede2b06c7, feat/gika-integration, worktree limpo. Fontes/estado/evidências M3/skill local relidos; auditoria auxiliar somente leitura, implementação serial. Today.changeStatus/ActivityDetail.status → sendCommand/activity.setStatus payload{status:completed}, expectedRevision atual → contentCommand, único writer. Transação existente valida UID/profile/membership/entity/revisão, incrementa revision/completedAt/dataVersion e grava receipt UID/operationId/hash juntos. Replay vem antes da revisão atual. Status completed repetido convencionalmente incrementaria revision: Gika precisa impedir esse comando para intenção nova já concluída.

reads.read reutiliza consultas bounded do calendário, cap50/partial e estados pending/completed/canceled, tarefas/eventos/séries. Activity.title usa trim/min1/max120, sem normalizedTitle/index. Igualdade conservadora trim + toLocaleLowerCase(pt-BR), sem fuzzy/substrings/remoção de acentos. Default hoje civil do perfil; data explícita determinística usa parser civil já adotado, uma data/dia apenas, distância<=366, sem busca de atrasadas/sem data/histórico. Candidatos de todos estados/kinds permanecem na resolução antes de decidir; nunca escolher pending e esconder completed homônima. Partial impede certeza. Uma série/evento/cancelada é incompatível, sem comando.

Diferenças: plano M0 complete_task{activityId} não atende pedido atual; schema strict será{title,date:null|YYYY-MM-DD}, modelo não recebe/escolhe ID/revisão/UID. Servidor deriva ID/revisão via read layer autorizada. recoverCreation suporta só criação: unificar recuperação de criação/conclusão no receipt EXISTENTE, sem nova infraestrutura/coleção/outbox. Snapshot mínimo no commit precisa preservar ID/título/data/fuso/revisão original para reconstruir replay após resposta perdida. Nova intenção recebe UUID novo. Read depois do provider é reautorizada antes/depois da resolução; command middleware/transação repetem autorização.

ActivityDetail encerra timer antes de concluir, Today não. Reutilizar semântica Today, sem antecipar timeEntry.stop. Reabrir convencional é status pending; apenas documentar, não expor undo/reopen. Conflito não renova revisão nem faz retry automático; UI pede novo pedido e mantém texto. Envelope pendente de conclusão em memória no adapter conserva alvo/revisão da mesma tentativa, equivalente ao pending convencional; não é garantia definitiva de dedup, que continua receipt transacional. Após perder memória antes de qualquer commit pode haver nova resolução, como M3; após commit receipt prevalece entre instâncias. Nenhuma escrita de intenção preparada/chat para suportar reload.

## Não objetivos
Update/reschedule/reopen/delete/batch/recorrência/organização/undo genérico, M4-T2/T3, live, billing, contraste/timer/audit fix, dependência/Rules/outbox nova.

## Contratos
complete_task strict → validação da intenção original → período determinístico → repository.read → resolução → policy → descriptor software completeTask{id,title,dueDate,timeZone,revision} ou completionResolution estruturado. Descriptor nunca é sucesso. Bridge único sendCommand/activity.setStatus esperado completed, revision original, operationId=requestId; gikaCompletion{requestTextHash} strict vincula ID ao texto. Servidor protege tipo/task simples/estado pending na MESMA transação e guarda snapshot mínimo obtido da entidade validada. Receipt replay retorna resultado original antes de revisar estado atual; payload diferente conflita. Resultado completedTask só após ack op/entity/revision+1 correspondente. Já concluída é observação honesta sem segunda mutação.

## Passos
1. Plano/auditoria persistidos; RED unidade para schema/intenção/resolução e identidade.
2. Contratos/model/policy/router/read recovery; bridge/UI; guard adicional no command existente sem mudar callers convencionais.
3. Unit/integration/E2E reais emulados: resolução/ambiguidade/auth/conflict/falhas/retry/concurrency/lost ack/strict/sem bypass/ack UI.
4. Gates/avaliações/revisão contra56b9308; registrar qualquer falha nova, preservar baseline.
5. Estado/tarefas/evidências/ADR se necessário, commit atômico/checkpoint/worktree limpo; parar T1.

## Ownership
Root edita domínio Gika/server Gika/guard content/frontend Gika/testes/docs. Auditor auxiliar não edita nem roda writers. Humanizer-br oficial local para copy; Superpowers ausente/processo manual equivalente.

## Gates
Lint/dois TS/build/unit/integration Auth+Firestore; E2E Gika + convencional relevante e check. Writers sequenciais. Baseline global/audit13/timer não corrigidos; falha nova exige comparação56b9308. Diff/segredos/dependências/escopo/revisão.

## Rollback
Revert da tarefa preservando receipts/dados/trabalho alheio; não apagar receipts para liberar retry. Sem reset/push/deploy/merge. Feature não condiciona agenda convencional.

## Evidências / estado de retomada
Implementação e revisão concluídas; lint/build/dois TS/218 unit/98 integração PASS. Check shell12/1 e audit13 baseline; local69:58 PASS/11 FAIL baseline,38 Gika PASS. RED/GREEN de espaços internos e intenção cruzada com prefixo cortês registrados em M4_T1_EVIDENCE.md. M4-T1 done; M4-T2/T3 todo. Sem live. Evidência final M4_T1_EVIDENCE.md/evidence/m4-t1-gates.json; checkpoint atômico e SHA no registro documental posterior. Próxima ação é revisão T1, parar antes de T2.
