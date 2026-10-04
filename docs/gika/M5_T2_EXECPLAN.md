# M5-T2 — Confirmation Contract + Preview

## Objetivo
Confirmação estruturada reutilizável derivada exclusivamente de policy confirm e dados resolvidos no servidor; reagendamento mantém exatamente um command convencional após botão explícito. Cancelamento/preview não escrevem. Sem Gemini no botão/recovery.

## PRE/contexto e auditoria
Entrada9c2c6fb474aa902820b815daa73108b0c38e5b7e, feat/gika-integration, worktree vazio verificados. M5-T1 done/hardening integrado/produção audit0. Fontes AGENTS/STATE/TASKS/ExecPlan/decisões/M4/M5-T1/humanizer relidas. Superpowers indisponível, processo manual equivalente; auditor auxiliar read-only, implementação serial do orquestrador.

Router resolve reschedule por leitura autenticada bounded/exata e classifier confirm. GikaReschedule/rescheduleBridge usam descriptor/requestId/revisão/UID em memória; contentCommand é único writer, activity.update/patch temporal/receipt atômicos. Preview/cancel sem writes. ConfirmDialog convencional é apresentação, não vínculo de segurança. RequestTextHash atual não autentica preview antes do primeiro commit; cliente pode forjar alvo/patch próprio. Recovery OPERATION_MISMATCH via respond pode invocar modelo se receipt ausente; será exclusivamente receipt-only. UI conversa não restaura reload.

## Diferenças/contratos
Plano histórico descrevia PendingAction persistida. Pedido mais recente proíbe nova persistência de previews/conversa; contrato stateless strict selado no servidor é necessário para tampering e será registrado em ADR018. Chave derivada com domínio separado do SCHEDULER_HMAC_SECRET existente; emulador demo/local validado pode usar chave aleatória em memória. Produção sem configuração falha fechada apenas em confirmação. Preview novo local antes de commit não cruza restart/instância com chave distinta; não renovar automaticamente: pedir novo preview. Configuração compartilhada existente permite múltiplas instâncias. Receipt original comprometido é autoridade para replay exato mesmo após expiração/rotação, com auth/ownership/hash integrais.

Contrato: policy confirm/risk/reason, action fechada (somente reschedule habilitado), target software/revisão/patch, summary before/after/changedFields calculado; token opaco autenticado UID/requestId/textHash/contrato/validade. Nenhum texto exibido vira payload. Token jamais logado. Metadata opcional no envelope convencional conserva token original no hash/receipt; novas operações Gika reschedule exigem selo. Receipts antigos/envelopes antigos exatos continuam replay; não backfill autorização de preview antigo. Nenhuma tool, writer, coleção, Rule, fila ou dependência nova.

## Passos/ownership
1. Orquestrador: schemas/helper de resumo e selo server-only; router emite só confirm e recovery receipt-only.
2. Guard na mesma transação contentCommand antes de nova mutação, depois de auth/receipt exato; alvo/patch/revisão/UID/textHash vinculados.
3. Bridge/card genéricos com estados awaiting_confirmation/confirming/confirmed/cancelled/conflict/failed. Cancel terminal; confirmação original/queuefalse/ack real; sem modelo.
4. Testes unitários/integração/E2E/evals, comparar domínio de reschedule antes/depois no SHA de entrada. Auditor read-only revisa diff. Orquestrador único dono de estado/tasks/decisões.

## Não objetivos
Batch, scope/series/recurrence/M5-T3+, delete, novos campos, Undo genérico, persistência de conversa, Gemini live, deploy/push/merge/main/visual, dependências e correções de baselines.

## Gates
Audit produção0; lint/doisTS/build/unit completos; Auth/Firestore integração (writers sequenciais); todos E2E Gika pertinentes e regressão7 reschedule. Check shell com contraste histórico explícito. Qualquer falha nova comparar à entrada, sem classificação automática.

## Rollback
Revert commit desta tarefa, não apagar receipts nem renovar revisões. Envelopes selados em trânsito precisam versão compatível até reconciliação; não declarar downgrade arbitrário seguro.

## Evidências/retomada
M5_T2_EVIDENCE.md e registros sanitizados após execução. M5-T2 done, M5-T3 todo. Gates/evidências concluídos em M5_T2_EVIDENCE.md/evidence/m5-t2-gates.json; revisão após checkpoint desta tarefa, sem iniciar T3.
