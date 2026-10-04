# M4-SMOKE — execução exclusiva após revisão

## Objetivo/contexto
Entrada cfd96c3c6507a9134f643dfae58d007b3d67727d, feat/gika-integration, worktree limpo. T1/T2/T3 aprovados explicitamente. Provar Gemini real gemini-3.5-flash-lite/medium → tool strict → validation/resolution/policy → bridge UI → comandos/revisão/receipt transacional existentes → persistência emulada → ack/UI. Nenhuma mudança de produção ou arquitetura.

## Contratos/passos
1. Reler AGENTS/fontes/estado/grafo/ExecPlan/ADRs/evidências M4. Conferir ambiente demo-leve/Auth9099/Firestore8080; conta nova fictícia e vizinho fictício não afetado.
2. Harness opt-in scripts/gika-m4-smoke.mjs: stdin com terminal echo desligado, segredo apenas GEMINI_API_KEY em memória servidor; browser sem segredo/trace/HAR/storageState. Proxy herdado/NODE_USE_ENV_PROXY=1 somente subprocesso, TLS intacto.
3. Fixtures descartáveis criadas pelo sendCommand/activity.create convencional. Complete/rename/move com horário e move sem horário. Contexto civil America/Sao_Paulo atual.
4. Até quatro chamadas reais, sem fallback/retry upstream. Respeitar limite3/min aguardando próximo minuto para quarta. Nunca relaxar quota/billing.
5. Complete/update imediatos após interpretação; reschedule exige preview, zero command/receipt/escrita até botão. Reter ack depois do commit, verificar ausência de success, simular resposta perdida e retry original applied→alreadyApplied/revisão2/mesmo alvo/ID/receipt, zero Gemini extra. Double tap confirmação não produz outro dispatch inicial.
6. Conferir campos não solicitados/horário/ausência preservados, delta zero de entidades, vizinhos/UID intactos, funções permitidas e ausência de identidades finais nos args upstream. Remover segredo e provar fallback missing-env sem upstream, agenda disponível.
7. Evidência somente allowlist de status/tools/booleans/datas/títulos sintéticos. Não serializar erros privados/body/header/token/chave. Encerrar servidor/browser/processo antes dos gates.

## Ownership/não objetivos
Somente harness/evidências/docs/estado/tarefas, orquestrador serial. Sem delete/undo/batch/série/M5, produção, deploy/push/merge, dependência ou workaround de proxy no produto. Dados descartáveis podem permanecer só no emulador; não executar exclusão para limpeza.

## Gates
node --check do harness, lint, build/dois TS, unit, integração Auth/Firestore, E2E focais complete/update/reschedule/read-fallback, check e audit readonly. Baselines globais previamente classificados em M4_T3_EVIDENCE preservados; não repetir ampla82 sem alteração de produção nem corrigir timer/contraste/audit. Diff/segredos/grafo/worktree/commit final.

## Rollback/evidências/retomada
Revert do commit exclusivo sem apagar receipts ou trabalho alheio. Resultado live em evidence/m4-smoke.json e M4_SMOKE_EVIDENCE.md. FAIL não fecha M4, classifica sem expansão automática; PASS fecha M4-SMOKE/M4 após gates. Parar antes de M5. Nenhuma ADR nova esperada.
