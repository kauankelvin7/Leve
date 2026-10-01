# M4-SMOKE — prova real das três mutações

## PRE e ambiente
Entrada cfd96c3c6507a9134f643dfae58d007b3d67727d, feat/gika-integration, worktree limpo verificado antes de editar. AGENTS/CONTINUAR/fontes/STATE/TASKS/ExecPlan/decisões/evidências T1/T2/T3 relidos; revisão T3 e autorização exclusiva M4-SMOKE explícitas. Plano M4_SMOKE_EXECPLAN.md precede a execução. Superpowers indisponível/processo equivalente manual, humanizer-br local oficial preservada, auditor auxiliar somente leitura.

Auth9099 e Firestore8080 reais emulados do projeto demo-leve, conta nova fictícia @example.test com perfil de teste, quatro tarefas descartáveis criadas por sendCommand/activity.create convencional. Conta fictícia vizinha mantida intacta. Admin harness só prepara identidade/perfil/membership e lê evidências; NÃO escreve atividades, não substitui comandos. Nenhum dado pessoal/produção. API temporária loopback8789 importa app real; UI real localhost5174. Encaminhamento de transporte no Playwright é configuração do teste, sem mudança no produto.

Credencial temporária por stdin com echo desligado, somente GEMINI_API_KEY servidor em memória; browser subprocess sem segredo, sem trace/HAR/storageState. Não criar .env/arquivo/argv/header/log/evidência/commit com chave. Segredo removido e processo encerrado antes dos gates. Proxy herdado e NODE_USE_ENV_PROXY=1 apenas processo smoke, TLS intacto. NETWORK / ENV_PROXY_NOT_ENABLED histórico é configuração Codex Remote, não falha do adapter/modelo/arquitetura. Nenhuma configuração financeira/billing/cartão/Cloud Billing/fallback pago/produção/push/deploy/merge. Modelo gemini-3.5-flash-lite explícito/medium intacto; quatro chamadas sem retry upstream. Limite3/min respeitado aguardando próximo minuto para quarta, sem relaxar quota.

## Resultado live: PASS
| Pedido sintético | Gemini real | Efeito confirmado |
|---|---|---|
| Terminei Teste Gika Complete M4 | HTTP200 / complete_task | ID exato, pending→completed, completedAt real, revisão1→2 |
| Renomeia "Teste Gika Rename M4" para "Teste Gika Renomeado M4" | HTTP200 / update_task | somente title solicitado, título novo real, revisão1→2 |
| Move "Teste Gika Move M4" para amanhã | HTTP200 / reschedule_task | 01/10→02/10/2026 civil America/Sao_Paulo, 19:00 preservado |
| Move "Teste Gika Move Sem Horário M4" para amanhã | HTTP200 / reschedule_task | mesma data civil, dueTime null preservado, sem horário inventado |

Cada resposta upstream contém exclusivamente a função esperada, sem UID/entityId/activityId/revision/operationId/requestId/receipt finais nos args. Observer inspeciona resposta em memória e grava apenas status/tool/boolean, nunca body/headers/args. Schemas strict/policy original e resolver autenticado reais validados pelo router. Modelo recebe só solicitação/contexto civil, não documentos/identidades. Nenhuma alteração de model/router/bridge/persistência nesta tarefa; guards arquiteturais executados nos unitários.

Cadeia real: UI→Gemini/adapter→tool validation→resolução/policy→descriptor software→bridge/sendCommand→command layer/contentCommand convencional→transação atividade/revisão/receipt→ack→card estruturado. Complete usa activity.setStatus{status:completed}; rename activity.update{title}; move activity.update{dueDate}. Nenhuma tool adicional, batch, série, delete, Undo ou M5. Os quatro activity.create são somente setup convencional, fora do Gemini.

Para cada tarefa, primeiro command real HTTP200/applied/revision2 fica retido APÓS commit. UI ainda não tem card de sucesso. Harness perde resposta por route.abort, UI oferece retry sem afirmar sucesso. Retry conserva envelope integral/original revision/operationId/requestId/entityId, retorna HTTP200/alreadyApplied/revision2, mesmo receipt/ID. Zero chamada Gemini adicional; UI confirma apenas depois do ack entregue. Tarefa persistida permanece byte-identical ao primeiro commit após replay. Quatro entidades antes/depois (delta zero nas mutações), revisão final2 em cada; todos vizinhos da operação e todas atividades do outro UID comparados e inalterados.

Reagendamento: preview real com descriptor/ID/revisão/data/horário, zero command/receipt/escrita antes do botão. Botão Mover tarefa determinístico, nenhuma chamada Gemini para confirmar; double tap tem somente um dispatch inicial. Após retry, card real mostra entidade/data nova e horário somente no caso timed. Snapshot live compara os campos fora de schedule/instantes e valida dueDate/dueTime explicitamente: status/título/notas/cor/categoria/estimativa/lembretes/seriesId/occurrenceKey/criação intactos. Fuso/disambiguation e cálculo de dueAt foram comprovados nos gates determinísticos de integração, não por assert dedicado nesta chamada live. Revisão read-only detectou essa lacuna pequena depois da execução; harness futuro ganhou assert de igualdade do schedule restante e scheduleInstants, sem repetir Gemini nem atribuir retroativamente passagem desses asserts ao live. Rename conserva tudo exceto título/metadados de revisão; completion conserva tudo exceto status/completedAt/metadados convencionais.

Após quatro cenários, remover GEMINI_API_KEY no servidor e pedir consulta real retorna GIKA_NOT_CONFIGURED/503 sem upstream. UI oferece retry; fechar Gika e abrir agenda de amanhã exibe as duas tarefas movidas normalmente. Provider ausente degrada somente assistente. Outros modos de falha são cobertos novamente pelos unitários/integração/read-fallback, não alegados como novos cenários Gemini live.

## Artefatos
- evidence/m4-smoke.json: status/tool/datas/títulos fictícios/comparações/receipts/replay/UI; sem IDs de conta, segredo ou corpo upstream.
- evidence/m4-smoke-{complete,update,reschedule-timed,reschedule-untimed}.png: UI real após ack, somente conta/dados sintéticos; capturas inspecionadas.
- scripts/gika-m4-smoke.mjs: opt-in independente, não importado na produção nem executado automaticamente. Nenhuma chamada live fora deste smoke.

## Gates finais
Lint PASS; build/dois TS PASS;295 unit/39 arquivos PASS;150 integração/5 arquivos PASS. npm run check: build/TS/unit PASS, shell12 PASS/1 FAIL color-contrast demo baseline3,25..3,62:1 para4,5:1. npm audit --omit=dev --audit-level=high: mesmas13 vulnerabilidades baseline9moderate/4high, dependencies/lock inalterados, sem audit fix. E2E focal25/25 PASS (6 complete,6 update,7 reschedule,6 read/fallback), desktop/light/mobile/dark/Axe/ack/retry/conflito/logout, sem skipped. Sintaxe/lint finais do harness fortalecido PASS; asserts temporais adicionais não executados live nesta sessão.26 arquivos baseline byte-idênticos à entrada cfd96c3, evidence/m4-smoke-baseline-files.json. Resultado sanitizado dos gates em evidence/m4-smoke-gates.json.

Global não declarada integralmente verde. Baselines M4_T3_EVIDENCE.md continuam: Planner/harness, ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE e timer PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE; passagem eventual não corrige pendências. Sem produção alterada, não repetir ampla82 sem necessidade. Writers integração/E2E sequenciais; gates não recebem segredo. Artefatos históricos de gates restaurados/removidos apenas quando gerados nesta tarefa e ausentes na entrada.

## Limites/checkpoint
PASS prova os quatro pedidos live; ambiguidades/falhas extensas seguem evals determinísticos. Persistência real emulada, não produção nem aparelho físico/certificado de release. Fixtures descartáveis permanecem somente em emulador até reset habitual; nenhuma remoção de domínio executada neste smoke. Conversa/preview não persistem reload, limite atual preservado. Nenhuma ADR necessária: arquitetura inalterada. M4-SMOKE done/M4 done após gates/revisão/evidências, checkpoint atômico criado no fechamento. SHA real registrado no checkpoint documental posterior. Parar antes de M5; próxima tarefa M5-T1 permanece todo e exige autorização nova.

Commit atômico M4-SMOKE/fechamento M4: `2443993295e45d7dc215ac0a1ab250437cee6c44`, branch feat/gika-integration e worktree limpo confirmados após commit. Checkpoint documental posterior apenas registra SHA real, sem repetir live/gates funcionais. M4 done, parar antes de M5.
