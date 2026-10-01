# M3-T2 — identidade e recuperação de create_task

## Objetivo
Uma intenção lógica cria no máximo uma tarefa, inclusive concorrência e perda da resposta. Nova intenção com o mesmo conteúdo continua permitida. Somente M3-T2 autorizado; parar antes de T3.

## Contexto atual e auditoria PRE
Branch feat/gika-integration, HEAD a9aff2f2009c36c23cc70ae380b642e12bc697a8, worktree limpo confirmado antes de editar em 2026-10-01. AGENTS, estado/grafo, planos/ADRs, evidências T1 e documentação relevante relidos. Superpowers indisponível: planejamento, TDD e revisão manual equivalentes. humanizer-br local oficial lida integralmente.

Today.save cria envelope pendente; sendCommand → POST /api/commands → contentCommand é a única escrita de atividades. contentCommand lê autorização, entidade e commandReceipts/{uid}_{operationId} na mesma transação; hash canônico inclui TODO o envelope, inclusive clientCreatedAt. Receipt e tarefa são criados atomicamente. Repetição igual retorna response original/alreadyApplied; hash diferente retorna OPERATION_MISMATCH. Outbox IndexedDB já indexa uid:operationId, preserva envelope e reconcilia receipts; Gika mantém queueOnNetworkError:false, sem segunda fila. Receipts não têm TTL/limpeza periódica: account-data remove os receipts ao excluir a conta.

Diferença encontrada frente ao plano: T1 gera IDs aleatórios na interpretação e preserva somente um envelope em memória. Não protege novas instâncias/concorrência após perder essa memória. GET /commands devolve só o resultado, sem o descriptor ou vínculo ao texto; não basta para recuperar uma data relativa originalmente normalizada. A garantia atômica existente resolve deduplicação, mas precisa de identidade determinística e metadados mínimos de reconciliação.

## Não objetivos
Undo, complete/update/reschedule/delete/batch/recorrência/voz/M4+, armazenamento de chat, nova coleção/outbox, novos locks/Map como garantia, dependências, billing, chamada Gemini live ou workaround de proxy. Não corrigir falhas baseline fora do escopo.

## Contratos
- requestId é UUID criado pela UI antes do upstream; operationId e entityId da Gika usam esse UUID, dentro do namespace UID já existente. Modelo não recebe IDs, hashes ou receipts. Nova intenção após sucesso recebe novo UUID; retry conserva UUID.
- Envelope ganha metadado opcional strict gika:{requestTextHash:SHA256}. Só aceito para activity.create, expectedRevision0, entityId=operationId, sem dependsOn/clientCreatedAt. Pedidos Gika são online; omitir o timestamp opcional evita reconstrução variável do hash. Fluxo convencional/outbox/expiração permanecem iguais.
- Receipt existente ganha somente gika:{requestTextHash,task}. Snapshot derivado do ActivityInput validado e escrito na MESMA transação da tarefa. Não persistir texto original/chat. Hash não é chave de dedup; vincula a identidade ao pedido. Não adicionar execução/base específica de undo.
- Repositório de leitura consulta receipt privado antes do modelo, depois de autorizar; recuperação de operação já concluída mantém auth/ownership e permite replay mesmo em serviceControls restricted/constrained, como a transação existente. Somente novas interpretações exigem serviço normal; nenhuma escrita nova durante restrição. Normal requests fazem uma autorização adicional para separar disponibilidade do provider da recuperação; compara UID/hash e valida snapshot/response. Recupera descriptor original mesmo após mudança de data/fuso, sem consumir Gemini. Bridge ainda pede ack ao comando existente, nunca confia em narrativa ou descriptor como sucesso.
- Hash do envelope recebido deve igualar o envelope canônico reconstruível (defaults simples/título normalizado), antes de persistir; validação adicional apenas Gika, comandos convencionais mantidos.
- Mesmo ID/outro texto ou payload diverge explicitamente; nenhuma segunda intenção executada. Mesmo ID/outra conta usa namespace distinto. Autorização é repetida na transação inclusive para receipts concluídos.
- Function calls create_task estritamente iguais na mesma resposta são colapsadas após schema strict; chamadas diferentes/mistas continuam negadas. Isso não deduplica submissões deliberadas distintas.

## Passos / ownership
Executor único /root: docs/estado/tarefas, schemas identity/gika, commandBridge/apiAdapter, server/commands/content.ts (somente metadado do receipt), server/gika reads/router/createPolicy, testes unit/integration/E2E. Primeiro testes de identidade/concurrency/recuperação, provar RED; depois mudança mínima, gates e revisão. Nenhum subagente necessário.

## Gates
Unitários, lint, dois typechecks/build, integração Auth/Firestore real (incluindo concorrência), E2E Gika/UI e suíte local completa, npm run check, diff/segredos/escopo. Emuladores sequenciais entre integração e navegador. Gates baseline conhecidos de T1 serão executados e classificados sem desabilitação. Não usar a credencial M2 antiga.

## Rollback
Reverter somente commit desta tarefa, sem reset destrutivo. Metadata opcional é retrocompatível com comandos convencionais e receipts anteriores. Snapshot de receipts criados nesta versão não permite nova escrita de um retry antigo por remoção do código; rollout deve manter identidade/receipts, não limpar os receipts. Não considerar downgrade para T1 seguro para retries Gika já iniciados.

## Evidências / estado de retomada
PRE e implementação concluídos. REDs de identidade/calls, canonicalização e replay em restrição comprovados e corrigidos. Gates finais: lint/typechecks/build/184 unit/64 integração PASS;27 E2E Gika na suíte completa e13 criação+read novamente após última alteração/reinícioAPI PASS.58 locais46 PASS/12 FAIL baseline;check shell12 PASS/1 FAIL baseline;production audit13 vulnerabilidades idênticas à cópiaa9aff2f. Evidência detalhada M3_T2_EVIDENCE.md. T2 done, M3 parcial, parar antes de T3. Commit atômico de tarefa e checkpoint documental registram SHA real/worktree limpo.

Commit de tarefa verificado: `56800b2f933e6d6ee0043856698bd6473eb13e37`; worktree limpo após commit. Checkpoint documental posterior, sem alteração funcional; aguardar revisão, não iniciar T3.
