# M3-SMOKE — cadeia real create_task

## PRE e autorização
2026-10-01, feat/gika-integration, PRE abbd1e2cbdcb7650782f41ef494e005eb6ec007f/worktree limpo. AGENTS, estado, tarefas, ExecPlan, decisões e evidências T1/T2/T3 relidos. Pedido atual aprova T3 e autoriza somente este smoke. Plano M3_SMOKE_EXECPLAN.md antes da execução. Superpowers indisponível/processo manual equivalente, serial/sem subagentes.

Conta exclusivamente fictícia leve.local@example.test nos emuladores Auth9099/Firestore8080 do projeto demo-leve. Nenhuma conta/dado de produção. API temporária em loopback8789 importa app existente; navegador usa UI real localhost5174. Encaminhamento de API no harness é configuração do teste, não código de produção. NODE_USE_ENV_PROXY=1 e proxy herdado somente nesse processo; TLS preservado. Causa histórica NETWORK / ENV_PROXY_NOT_ENABLED é limitação do Codex Remote, não adapter/modelo/arquitetura.

Credencial temporária recebida por stdin com echo desabilitado, usada somente neste smoke como GEMINI_API_KEY de servidor; nenhuma chave em arquivo/.env/argv/log/trace/HAR/evidência/resposta/commit. Nenhum VITE_* de segredo. Processo encerrado depois do teste; gates posteriores não receberam chave. Sem billing/cartão/Cloud Billing/fallback pago, SDK ou dependência nova; uma única chamada Developer API ao modelo explícito gemini-3.5-flash-lite, medium, sem retry upstream automático. Nenhuma ação de configuração financeira/deploy/push/merge.

## Resultado real: PASS
Entrada sintética: `Adiciona Teste Gika M3 amanhã`.
HTTP200, uma chamada upstream, uma function call `create_task`, nenhuma leitura/outra tool solicitada. Observador de fetch em memória inspeciona somente resposta desta chamada e guarda status/tool names; não registra body/headers/args upstream. Validação/policy/autorização reais retornam descriptor strict com título Teste Gika M3, dueDate2026-10-02, dueTime null/timeZone America/Sao_Paulo. Data esperada calculada independentemente pelo Temporal contra relógio/contexto civil do perfil.

UI real → /api/gika/respond → Gemini/Model Adapter → Tool Router → Validation → Policy → createTaskEnvelope/commandBridge/sendCommand → /api/commands → contentCommand/activity.create → transação Firestore emulado. Modelo não recebe UID/requestId/entityId/receipt/token nem tem writer/import de persistência. Inspeção arquitetural e testes source checks preservados; nenhum arquivo de produção alterado nesta entrega.

Primeiro comando real HTTP200/applied/revision1 foi persistido, mas ack ficou retido no harness. Card de sucesso inexistente mesmo após commit; depois a resposta foi perdida com route.abort. UI apresentou retry, sem afirmar criação. Segundo pedido conserva requestId/operationId/entityId, recupera receipt real ANTES do modelo, reenvia comando canônico e recebe HTTP200/alreadyApplied com mesmo entityId. Nenhuma nova chamada ao Gemini. Somente após esse ack entregue a UI mostra card estruturado, título/data/Tarefa adicionada. e Desfazer.

Consulta Admin somente leitura no harness comprova delta de exatamente uma entidade, título/data/tipo task/revision1 reais; ID do documento = entityId dos dois acks = ID da operação software. Receipt privado existente aponta para mesma entidade e snapshot do título. Toda outra atividade da conta comparada byte a byte e inalterada. Snapshot geral antes/depois descarta criação adicional, não somente contagem visual por título. Evidência JSON registra comparações booleanas, sem UID/tokens/IDs de usuário ou dados alheios.

## Undo opcional executado: PASS
Botão real Desfazer → bridge determinístico/sendCommand/activity.trash → HTTP200/ack aplicado para o ID exato → UI Criação desfeita. Persistência confirma deletedAt/revision2, não purge. Nenhuma outra atividade alterada e zero chamadas adicionais Gemini. Lista ativa convencional deixa de mostrar a tarefa. Única remoção é undo explicitamente permitido para essa criação sintética; nenhuma tool de delete/mutação posterior/batch/recorrência ou M4.

## Artefatos sanitizados
- evidence/m3-smoke.json: HTTP/tool/count/comparações/replay/undo permitidos, nenhum corpo upstream/segredo.
- evidence/m3-smoke-created.png: UI real de teste depois do ack de replay, antes do undo.
- scripts/gika-m3-smoke.mjs: harness opt-in; jamais importado pela produção ou executado automaticamente pelos gates. Credencial por stdin sem echo; não usar chave em comando shell. Navegador futuro recebe ambiente filtrado sem GEMINI_API_KEY. Sem trace/storageState/HAR; observações sanitizadas e cleanup em finally.

Primeira inicialização com stdin em pipes fechado pelo executor terminou antes de receber qualquer segredo/requisição (Node unsettled await). Reexecução em terminal com stty -echo recebeu segredo sem echo; único smoke live passou. Não houve segunda chamada live, chave fictícia ou retry paid.

## Gates finais
| Gate | Resultado executado nesta sessão |
|---|---|
| npm run lint | PASS final |
| npm run build | PASS, inclui ambos typechecks; chunk>500kB baseline |
| npm test | PASS194/36 arquivos |
| integração Auth/Firestore real emulada | PASS76/4 arquivos |
| E2E focal Gika (create/read/shell mock) | PASS32/32 em6min:12 criação/idempotência/undo,6 read/fallback,14 shell; desktop/mobile/dark/Axe/timer |
| npm run check | build/dois TS/194 unit PASS; shell12 PASS/1 FAIL baseline color-contrast demo Notas (eyebrow2,86:1/muted3,14:1) |
| npm audit --omit=dev --audit-level=high | FAIL baseline13:9 moderate/4 high; dependências/lockfile inalterados |
| agent-browser / sintaxe harness / diff/segredos/escopo | PASS; navegador sem erro/overlay e acesso renderizado; zero match de credencial em arquivos alterados/logs do smoke |

Writers integration/E2E local sequenciais. Gate check usa demo independente, não altera emuladores. Ausência real GEMINI_API_KEY→GIKA_NOT_CONFIGURED e agenda operante comprovadas novamente, junto de429/503/timeout/invalid/malformed determinísticos. Gates posteriores não receberam a credencial. Nenhum skipped/teste desabilitado. MetadataLookupWarning403 Admin não impediu testes.

Suíte global não declarada verde: comparação executável de12 falhas Planner/harness convencional e shell contraste está em T1/T2; timer PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE provado emfc30bf9/T3. Timer passou nesta focal; isso não elimina pendência preexistente. Nenhum arquivo convencional/estilo/dependência foi alterado. Não repetir suíte global16min sem mudança de produto; escopo smoke/documentação protegido por32 Gika e gates completos de unidade/integração. Artefatos históricos M1/auth gerados pelos gates restaurados/removidos somente quando inexistentes na entrada; sem alteração de evidência anterior.

## Checkpoint e limites
M3-SMOKE done, M3 done após prova live/gates/revisão. Commit atômico de harness/plano/evidência/estado/tarefas/evals; SHA real no checkpoint documental posterior, sem referência circular. M4 não iniciado e exige autorização nova. PASS deste cenário não é cobertura live de todas as ambiguidades/erros upstream nem certificado de release; evals determinísticos completam a regressão. Não repetir Gemini live nos gates.

Commit atômico M3-SMOKE/fechamento M3: `723d444295fafb08e7706b92a283bf3d1f2b0d0b` (feat/gika-integration), git status vazio confirmado após commit. Checkpoint documental posterior registra SHA real, sem repetir gates funcionais por alteração exclusivamente documental. M3 done/M4 não iniciado.
