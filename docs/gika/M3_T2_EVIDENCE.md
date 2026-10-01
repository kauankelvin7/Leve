# M3-T2 — idempotência de create_task

## PRE e auditoria

2026-10-01, feat/gika-integration, HEAD a9aff2f2009c36c23cc70ae380b642e12bc697a8, worktree limpo antes de qualquer alteração. Fontes de verdade, documentação Gika/T1 e humanizer-br oficial relidas. M3-T2 autorizado explicitamente pelo usuário; somente essa tarefa. ExecPlan persistido antes do código. Superpowers indisponível, planejamento/TDD/revisão manual equivalente; nenhum subagente.

Fluxo convencional reaudito: Today.save cria envelope pendente; sendCommand → POST /api/commands → contentCommand/activity.create. Outbox conserva envelope por uid:operationId e reconcilia via receipt; Gika segue online, queueOnNetworkError:false, sem segunda fila. Receipt existente por UID/operationId e hash canônico já resolve concorrência: transação cria tarefa+receipt+contadores juntos, devolve resultado original/alreadyApplied para replay, rejeita hash diferente. Não basta usar IDs novos por interpretação ou memória local do T1. Auditoria/diferenças/contratos completos em M3_T2_EXECPLAN.md e ADR-GIKA-012.

## Comportamento e garantia

- requestId criado pela UI é operationId/entityId estável, sob UID autenticado. Retries conservam UUID; nova intenção depois do sucesso recebe UUID novo, inclusive conteúdo igual. Modelo não recebe nem escolhe IDs/hash/receipt.
- Metadado opcional strict gika.requestTextHash vincula pedido ao ID. Hash do texto NÃO é chave de dedup. Não guardar texto original/chat. Gika aceita só activity.create simples, expectedRevision0/entity=operation, sem dependsOn/timestamp volátil. Defaults/payload canônicos, title/data/timezone validos no domínio existente.
- Na MESMA transação existente, receipt ganha somente hash do pedido e snapshot task derivado do ActivityInput validado. Sem nova coleção/índice/Map/locks/distribuição/outbox; nenhum acesso do modelo à persistência. Snapshot não é infraestrutura de undo.
- Retry depois de commit recupera snapshot privado antes do modelo, mesmo sem memória do adapter e após mudar contexto civil/fuso. Autoriza antes/depois da leitura e novamente pelo command layer. Bridge pede ack real/alreadyApplied e preserva ID/revisão/serverTime. Descriptor nunca significa sucesso. Snapshot é histórico, não estado atual de atividade possivelmente alterada posteriormente.
- Concorrência legítima com interpretação divergente recupera snapshot uma vez após mismatch. Outra intenção com mesmo ID/texto alterado ou payload diferente conflita explicitamente, sem segunda escrita. Outro UID tem namespace independente. Conta suspensa/logout/troca não recuperam nem executam como outra conta.
- Chamadas create_task iguais na mesma interpretação são colapsadas depois de schema strict de todas; diferentes/mistas/ID forjado negados. Novas submissões intencionais distintas não são colapsadas.
- Falha antes do commit não produz receipt/tarefa; mesmo ID pode tentar novamente com contexto vigente. Falha depois do commit não duplica. Cancelamento após dispatch não é rollback. Receipts sem TTL observado; exclusão da conta remove receipts. Não migrar receipts T1 sem vínculo original desconhecido. UI não persiste/restaura conversa após reload; uma retransmissão técnica precisa conservar o requestId, sem tentar deduzi-lo do conteúdo.

## Testes/evals

RED inicial: 3 falhas demonstraram IDs variáveis, ausência de vínculo ao texto e rejeição de calls iguais; 1 caso passou. Depois os4 passaram. Revisão encontrou trim/default de payload bruto que podia produzir receipt não reconstruível; novo teste RED alcançou a transação indevidamente. Validação do hash do envelope canônico corrigida só para Gika; teste GREEN antes de qualquer transação. Comandos convencionais mantêm semântica anterior. Segunda revisão comprovou RED HTTP503 ao recuperar uma criação concluída durante serviceControls restricted, embora o command layer já aceite esse replay. Propósito receipt na autorização conserva permissões e libera apenas reconciliação; novos pedidos continuam503 antes do modelo. Teste também verifica nenhum novo provider call/escrita.

Cobertura em gika-idempotency, gika-command-canonical, gika-api-adapter, gika.test.ts e gika-create.spec.ts: normal, replay sequencial, duas execuções HTTP concorrentes reais, lost response após commit, novo ID/conteúdo igual, outro UID/mesmo ID, payload/texto/hash diferente, falha precommit, falha póscommit, revogação/auth/ownership, double submit UI, repetição de function call e proibição de bypass. E11/M3-E19/E21..E26 adicionados a EVALS.md. E2E lost-response executa route.fetch contra API real antes de abortar a resposta; retry usa a rota real de recuperação e receipt applied/alreadyApplied, uma tarefa inclusive após reload.

## Gates executados

| Gate | Resultado atual |
|---|---|
| npm run lint | PASS |
| npm run typecheck / build | PASS, dois TS; warning de chunks baseline >500kB |
| npm test final | PASS,184 testes/35 arquivos |
| integração Auth/Firestore | PASS final,64 testes/4 arquivos;36 Gika/28 convencionais, incluindo canonicalização e replay durante restrição |
| E2E criação focal | PASS final,13/13 criação+read/fallback após reiniciar API final;7 criação real,6 leitura/fallback;14 mock PASS na suíte completa |
| E2E local completa | 58 executados,46 PASS/12 FAIL baseline;27 Gika PASS,5 Planner visual/4 convencionais/offline/7 sazonal PASS |
| npm run check | final: build/dois typechecks/184 unit PASS; shell12 PASS/1 FAIL baseline (contraste demo) |
| npm audit --omit=dev --audit-level=high | FAIL baseline,13 vulnerabilidades:9 moderate/4 high; cópia a9aff2f produz relatório idêntico |
| agent-browser | PASS após iniciar dev: acesso com conteúdo/controles, sem erro/overlay |

## Baseline e limites

Suíte ampla não é declarada verde. Três Planner baseline de T1 já reapareceram: completed4,28:1 e dois testes de frequência sem Mais opções. Offline/conflito/Planner visual passaram, sem intermitência Gika observada. Nove falhas adicionais da suíte T1 têm prova executável no checkpoint92cc9c7 (M3_T1_EVIDENCE.md); arquivos do harness/UI/estilos convencionais permanecem idênticos a a9aff2f. Mesmos12 casos/categorias reapareceram; resultado final46 PASS/12 FAIL, sem novos casos Gika. Execução ampla ocorreu antes dos dois últimos refinamentos de canonicalização/reconciliação; alterações restritas à Gika verificadas novamente por64 integração e13 E2E finais. Nenhuma mudança convencional, Rules, outbox, dependência ou estilo.

Primeiro check shell falhou em Configurações/demo (.muted2,79:1); repetição final também12 PASS/1 FAIL color-contrast de demo (rota varia). Mesmo caso na cópia isolada a9aff2f, build próprio/preview de produção, também FAIL color-contrast em Compras (eyebrow3,25:1; muted3,88:1). A rota inicial que falha varia com inicialização/timing; demo, estilos e harness byte a byte iguais. Não alegar contraste corrigido ou gate PASS. m3-t2-baseline-files.json e m3-t2-baseline-comparison.json registram prova sanitizada.

Audit produção executado também em a9aff2f: mesmo relatório/13 vulnerabilidades, package.json/lockfile inalterados, nenhuma dependência nova. Atualização potencialmente breaking fora do escopo registrada para revisão; não executar audit fix/force nem esconder esse gate. Relatórios não contêm segredos e evidência versionada registra somente counts/classificação/identidade da base.

Sem credencial atual autorizada: não houve chamada live Gemini, chave fictícia, reutilização da credencial M2, arquivo .env, billing, provider pago, proxy de produção, push/deploy/merge. Provider/modelo/configuração mantidos. NETWORK/ENV_PROXY_NOT_ENABLED histórico é configuração Codex Remote; nenhum workaround nesta tarefa. Emuladores reais, modelos fixture; prova de idempotência/command/persistência, não interpretação live. M3-T3/undo e mutações posteriores não iniciados.

## Checkpoint

M3-T2 done, M3 parcial. Estado/tarefas/evidências/evals/ADR012 atualizados no commit atômico da tarefa; checkpoint documental posterior registra SHA real e worktree limpo. Parar antes de M3-T3. Revisão de diff/limites do modelo/auth/metadata/rollback/humanizer e remoção somente de artefatos gerados pelo gate realizadas antes do commit.
