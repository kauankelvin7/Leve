# M3-T1 — primeira criação simples

## PRE e auditoria real

2026-10-01, branch feat/gika-integration, HEAD92cc9c74f5d865265ebe80a100386f992c97d20d, worktree limpo. AGENTS, estado/tarefas/ExecPlan/ADRs, Product/Architecture/Security/Evals/PLANS e humanizer-br relidos. M2/M2-SMOKE done; autorização atual somente M3-T1. Credencial temporária M2 não será reutilizada.

Today.tsx:save monta ActivityInput task (title/schedule/defaults), cria operationId/entityId no software, expectedRevision0, clientCreatedAt e retém pending envelope quando a tentativa falha. sendCommand em platform/api.ts envia POST/api/commands com Firebase token; offline opt-in pode enfileirar NETWORK_ERROR. server/app.ts autentica e despacha para server/commands/content.ts:contentCommand. Este único handler valida ActivityInput e aplica transação de autorização/profile/membership, estoque, rate limits, dataVersion, receipts/idempotência/revisão, status e jobs. Gika não terá escrita própria.

## Contrato e diferenças do plano

Preservar o bridge cliente planejado no M0: router interpreta/valida/politiza e retorna descriptor de create_task; apiAdapter só confirma após sendCommand/activity.create retornar CommandResult validado. Somente uma criação por solicitação; sem misturar criação/leitura, lote ou recorrência. Modelo não escolhe uid/path/IDs/timezone/revisões/defaults. Solicitação explicitamente criada ou título com data (Academia amanhã); sem título ou data ambígua retorna pergunta. Título deve corresponder ao conteúdo solicitado; data/horário civil resolvidos deterministicamente e comparados aos argumentos do modelo, sem inventar horário.

Base mínima obrigatória antes da implementação: manter envelope operationId/entityId/clientCreatedAt da tentativa pendente, como Today já faz, sem novo mecanismo de persistência/dedup. Retry manual da tentativa não reinterpreta nem gera novos IDs. M3-T2 continua todo: revisão ampla de retries/concurrency/duplicate protection não será iniciada. Outbox não receberá ações Gika nesta primeira criação (queueOnNetworkError:false): falha/resultado desconhecido nunca é sucesso; offline continua indisponível. Undo M3-T3 não implementado.

sendCommand não possui signal/guard de uid atualmente. Acrescentar opções opcionais somente usadas pelo bridge Gika para cancelar antes de dispatch e conferir uid novamente após espera de getIdToken; preservar comportamento dos demais callers e regras de negócio. API /commands faz nova autenticação, contentCommand revalida autorização na transação imediatamente antes de escrita. Cancelar após dispatch não prova rollback: resultado incerto não recebe confirmação falsa; retry mantém receipt existente.

## Passos e ownership

1. registrar M3-T1 in_progress e auditoria; testes de schemas/date/explicit intent.
2. create_task tipada no adapter/router/policy, descriptor somente validado; nenhuma persistência no model/router.
3. bridge sendCommand/guard UID e resultado structured; UI atual recebe createdTask apenas após ack real.
4. unit/integration emulator/E2E criação+falhas+isolamento, evals e regressão completa aplicável; estado/tarefas/evidências e commit atômico.

Ownership: packages/domain/src/gika.ts; server/gika; features/gika; platform/api.ts apenas signal/expectedUid opcionais; testes/docs/.agent. Sem novo SDK/dependência, escrita/handler paralelo, changes Rules/domain/contentCommand.

## Gates, rollback e parada

lint/build/dois typechecks/unit; integração Auth/Firestore; E2E UI autenticado/M1/M2/Planner/sazonal e shell gate. Falhas baseline Planner já classificadas não serão mascaradas nem consertadas fora do escopo. Gemini real sem credencial atual não executado; fixtures de modelo não provam interpretação real. Revert do commit de tarefa restaura M2, sem reset/force/push/deploy. Parar após M3-T1; M3-T2/T3 ficam todo.

## Evidências e estado de retomada

M3-T1 concluído: lint/typechecks/build,175 unit/53 integração e25 E2E Gika PASS (5 criação real emulada). Suite inteira56:44 PASS/12 FAIL baseline; check shell12 PASS/1 FAIL baseline reproduzido na cópia92cc9c7. Nove falhas adicionais de harness reproduzidas na UI original, sem Gika. Ver M3_T1_EVIDENCE.md e JSON/screenshots versionados. Sem smoke live Gemini atual. Próxima ação: revisão humana da primeira mutação; não iniciar T2/T3 até autorização. M3 milestone permanece parcial.
