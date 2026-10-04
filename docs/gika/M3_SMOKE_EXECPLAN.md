# M3-SMOKE — plano de execução

## Objetivo
Provar create_task com Gemini real até receipt, persistência e UI, com retry da mesma operação sem duplicação; parar antes de M4.

## Contexto atual
PRE abbd1e2cbdcb7650782f41ef494e005eb6ec007f, branch feat/gika-integration e worktree limpo. T3 revisado/aprovado e smoke explicitamente autorizado pelo usuário. Conta fictícia leve.local@example.test, projeto demo-leve, Auth9099/Firestore8080. Modelo/provider/arquitetura preservados.

## Não objetivos
Produção, dados pessoais, billing, recorrência, batch, M4, novas funcionalidades ou correções arquiteturais. Não provar a configuração financeira da conta Google por inferência; nenhuma ação de billing é executada.

## Contratos
UI real → API real → Gemini real → schemas/policy existentes → sendCommand/activity.create → receipt transacional e entidade real. Interceptação de transporte do harness somente encaminha API local e retém/perde ack real para provar UI e replay; nenhuma fixture de interpretação. Observador upstream em memória registra apenas status/tool names e comparações booleanas; nunca headers/corpo/chave. Credencial recebida por stdin com echo do terminal desabilitado, somente env do servidor em memória, nunca cliente/arquivo/argv/log. Proxy herdado com NODE_USE_ENV_PROXY=1 somente no processo de teste.

## Passos
1. Releitura/preflight e confirmação de emuladores/conta fictícia.
2. Harness isolado importa app existente, servidor temporário local, navegador sem trace/HAR/storageState, uma interpretação live de tarefa descartável.
3. Persistir antes de perder ack; UI sem sucesso; retry com mesmo ID e receipt alreadyApplied; uma única entidade; card somente após ack real. Undo opcional determinístico e verificação de somente alvo soft-deleted.
4. Encerrar servidor/credencial; gates offline sem segredo: lint/typecheck/build/unit/integration/E2E Gika e check; registrar baseline sem mascarar falhas.
5. Evidência sanitizada, estado/tarefas/checkpoint atômico/worktree limpo. Se FAIL, classificar e não fechar M3.

## Ownership
Execução serial. Apenas harness de smoke, plano, evidência e memória Gika; nenhum código de produção alterado. Superpowers indisponível; processo manual equivalente.

## Gates
Critérios obrigatórios do pedido; lint/dois TS/build/unit/integração real emulada e E2E Gika/fallback. Writers sequenciais; preservar gates globais e baseline T1/T2/T3. Segredos/escopo/diff/grafo de dependências antes do commit.

## Rollback
Encerrar processo temporário remove credencial da memória; tarefa sintética pode ser desfeita pela UI existente. Reverter somente arquivos desta tarefa, preservando receipts e trabalho alheio. Sem reset/deploy/push.

## Evidências
PASS real HTTP200/create_task; receipt/persistência/UI/retry e undo provados. M3_SMOKE_EVIDENCE.md/evidence/m3-smoke.json e screenshot sintético; gates194 unit/76 integração/32 E2E/lint/build/dois TS PASS, check12/1 e audit13 baseline explícitos.

## Estado de retomada
M3-SMOKE done e M3 done; processo temporário encerrado/credencial ausente nos gates. Checkpoint atômico após revisão de escopo/diff/segredos; Commit atômico `723d444295fafb08e7706b92a283bf3d1f2b0d0b`, worktree limpo confirmado; registro documental posterior sem alteração funcional. M4 não iniciado: aguardar autorização.
