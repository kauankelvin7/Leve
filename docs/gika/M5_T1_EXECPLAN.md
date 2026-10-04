# M5-T1 — classificação determinística

## Objetivo/entrada
156fe77dd94d24152c4af12c122ce90188b28271, feat/gika-integration, worktree limpo. Exclusivamente M5-T1, dependência M4-SMOKE done. Policy pura e typed allow/clarify/confirm/deny entre schema/intenção validada/resolução e descriptor executável, independente de provider.

## Auditoria/contexto
Tool schemas strict e allowlist sete funções. Parsers civis/intenção original não confiam no modelo; resolução dia bounded/cap50/partial/exata. Router renova authorize após provider/leitura/receipt. Commands continuam únicos writers, revisão original/ownership/membership/receipt/hash transacionais; policy não fornece autorização nem resultado ack. Reschedule preview/card/botão específico em memória já exige confirmação, ADR016; não criar PendingAction genérico T2. Undo create determinístico activity.trash/revisão/receipt original separado, não delete tool. UI convencional trash30dias/restore/purge, série occurrence/future/split e window.confirm/ConfirmDialog/RecurrenceScopeDialog já existem. Não há batch genérico transacional; handlers de série têm limitações históricas documentadas.

## Contratos
Facts strict produzidos por software: action, tipo de efeito, cardinalidade, recorrência/escopo, tipo/estado do alvo, campos modificados, completude/read/no-op e estado da autorização existente. Sem prompt/título/UID/entity/revision/flag confirmed do Gemini. Decision discriminada com enums de reason/risk. Registro fechado: create simples allow; completion pending única allow; title patch allow; reschedule único confirm low preservando preview; ambiguidades/missing/recurrence clarify; partial/saturated/unknown/schema inconsistentes/unsupported fields/estado impossível deny; bulk e destructive deny/not-supported até etapas autorizadas. Sem default allow.

Engine não lê Firestore/provedor/comandos nem substitui validation/auth/revision. Router fabrica facts depois das barreiras existentes, classifica resultado de resolução antes de emitir descriptor; receipt replay classificado como histórico e ainda exige ack/reautorização, não interpretar sucesso como nova autorização. Decisões internas não viram flags executáveis no wire; manter contrato UI M1-M4. Observação estruturada via backendLog existente: action registrada ou unknown, decision/reason enum, bucket latência, sem conteúdo/IDs/payload/provider.

## Passos/ownership
Orquestrador: actionPolicy puro + adapter facts/gate server/gika, integração mínima router/validation, unit/integration/evals/docs/estado. Auditor auxiliar somente leitura. RED classifier casos obrigatórios, GREEN integração dos gates reais; revisão de spec/segurança/privacidade. Não alterar writers/UI/Rules/outbox/financeiro/modelo, batch/delete/series/T2+, undo genérico, live ou dependências.

## Gates
Unit focal/completo, lint, build/dois TS, Auth/Firestore integração; E2E Gika reais emulados cobrindo create/undo/complete/update/reschedule/read-fallback, check/audit readonly. Escritores sequenciais. Baselines classificados em M4 preservados e comparação byte por26 caminhos contra156fe77; qualquer falha nova comparar à entrada sem modificar timer/contraste/harness convencional.

## Rollback/evidências/retomada
Revert commit exclusivo, sem apagar receipts ou regras de domínio. M5_T1_EVIDENCE.md/gates sanitizados/evals, STATE/TASKS/ADR somente decisão nova. Commit atômico/checkpoint/clean; M5 parcial, parar antes de M5-T2. Sem Gemini live/chave.
