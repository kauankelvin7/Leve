# M3-T3 — undo seguro da criação Gika

## PRE e auditoria
2026-10-01, feat/gika-integration, fc30bf9c51a7978cf2cb22280ddaa67d59b48f6d e worktree limpo validados antes de editar. AGENTS/estado/tarefas/ExecPlan/decisões/T1/T2 e documentos relevantes relidos. Skill humanizer-br local oficial aplicada; Superpowers indisponível, planejamento/TDD/revisão manual equivalente. ExecPlan persistido antes de implementação; execução serial sem subagentes.

Today.trash/ActivityDetail usam sendCommand/activity.trash, alvo real/payload vazio/revisão esperada. contentCommand implementa soft-delete com deletedAt/purgeAfter30dias e incremento da revisão. Trash.restore existe, purge é separado; não há undo universal de criação. Queries convencionais ocultam deletedAt; estoque permanece até purge. Receipts UID/operation/hash/ack, auth de perfil/membership e alteração de entidade/dataVersion/rates já são transacionais. Outbox conserva envelopes convencionais, Gika segue online/queuefalse. Nenhuma segunda lógica de remoção, coleção, endpoint, Rules ou dependência nova.

## Contrato provado
Contexto software em memória vincula UID original, UUID da criação/entidade real e revisão1. ID undo UUIDv8 SHA256(namespace,UID,creationOperationId), nunca título/data/conteúdo/modelo. Metadado strict gikaUndo só admite activity.trash/rev1/alvo original/payload{}, sem timestamps variáveis. Servidor compara envelope canônico/UID e valida receipt original Gika na mesma transação existente; então reutiliza o trash convencional. Receipt próprio torna double tap/retry/concurrency/lost response um único efeito.

Revisão esperada nunca é renovada. Edição posterior → conflito sem perda de trabalho/detalhes privados. Already removed sem receipt próprio → mensagem específica sem nova escrita. Replay após commit devolve ack original/alreadyApplied e não desfaz restauração convencional posterior. entity.createdAt deve igualar serverTime da criação original: protege ABA quando purge convencional seguido de outra criação reutiliza o mesmo ID/revisão1. Este teste usa purge SOMENTE para preparar o cenário convencional; não existe purge no fluxo de undo.

Ação UI não chama Gemini. Sucesso só após resultado estrito revision2/entity/operation correspondente. Guarda de UID antes/depois token/ack, middleware token e auth transacional inclusive replay. Pending/desfeita/conflito/erro com copy humanizer, aria-live e foco de feedback sem roubar foco do composer. Fechar/cancelar descarta resposta mas não implica rollback; reabrir pode reconciliar mesmo ID. A conversa/card não são restaurados após reload; sem persistência nova de chat. Transporte que conserve envelope pode reconciliar sem memória do processo.

## Testes/evals e revisão
Unit RED inicial demonstrou ausência do contrato/bridge; GREEN posterior. Integração real cobre alvo exato/dois itens iguais, lixeira/restore, concorrência/replay/lost ack, edição/já removida, UID diferente mesmo ID, origem ausente/convencional, ID arbitrário/campos/revisão inválidos, auth/replay suspenso e falha injetada antes/depois da transação. Spies de falha seguem HTTP503 público existente; primeira expectativa500 do teste foi corrigida para contrato503, sem alterar produto. Novo caso ABA adicionado na revisão e validado.

Primeira execução UI focal12:10 PASS/2 FAIL de Axe landmark-unique com dois cards de criação. Corrigida sem excluir regra Axe: cards são grupos acessíveis, com mesma copy/resultado estruturado, preservando contrato de dados. Regressão final registrada abaixo. Guard de close/reopen preserva retry; foco terminal acompanha a ação só se usuário não mudou o foco. Modelo desconhecido undo_create_task negado; source architecture checks sem acesso direto à persistência/sem interpretação no bridge de undo. Evals M3-E27..E29/E32..E35.

## Gates
| Gate | Resultado |
|---|---|
| lint / typecheck / build | PASS final, dois TS; warning chunks>500kB preexistente |
| unit | PASS194/36 arquivos |
| integração Auth/Firestore real emulada | PASS76/4 arquivos (48 Gika/28 convencionais) |
| agent-browser ao reiniciar API final | PASS acesso/render/controles/sem erro/overlay; executável local já disponível |
| E2E focal final (M3-T3 + timer, após última revisão de foco) | PASS6/6: cinco undo desktop/mobile/dark/Axe/foco/ack real + timer original, sem skipped |
| E2E local completa | 63 executados:50 PASS/13 FAIL;31 Gika PASS/1 FAIL timer preexistente;5 novos undos e18 criação/read PASS,5 Planner visual/4 convencionais/offline/7 sazonal PASS |
| check | build/dois TS/194 unit PASS; shell12 PASS/1 FAIL baseline color-contrast demo |
| npm audit --omit=dev --audit-level=high | FAIL baseline13:9 moderate/4 high; package/lockfile inalterados |

## Baseline e limites
Falhas históricas executáveis/isoladas em M3_T1_EVIDENCE.md e M3_T2_EVIDENCE.md. Nova prova byte a byte de23 arquivos em evidence/m3-t3-baseline-files.json contra PREfc30bf9: harness convencional/demo/styles/package/lockfile/API/outbox/Rules não mudaram. Contraste/timing demo no shell novamente falha (primeira execução Adicionar tarefa4,23:1; final repetida demo eyebrow3,25:1/muted3,62:1, mesmo caso12/1), não gate verde. Audit tem os mesmos13 da comparação isolada a9aff2f/T2; sem audit fix/force fora do escopo. Regressão offline antiga era dock M1 corrigido em M2-S0, não baseline atual: reportar execução desta sessão separadamente.

Emuladores/API reais e modelos fixture; sem chave fictícia/credencial temporária M2/Gemini live/billing/cartão/serviço pago/proxy de produção/push/deploy/merge. NETWORK/ENV_PROXY_NOT_ENABLED permanece configuração histórica Codex Remote; chamadas externas nesse ambiente exigiram proxy/egress no M2, nenhum workaround no produto. MetadataLookupWarning403 não impediu gates emulados. Processos integration/E2E que alteram dados executados sequencialmente. Sem declaração de teste em aparelho físico.

## Checkpoint e parada
M3-T3 done: critérios/evals/gates/revisão/evidências concluídos; commit atômico código/testes/docs/estado/tarefas. SHA real será registrado no checkpoint documental posterior. M3 permanece parcial após T3: M3-SMOKE bloqueado até revisão/autorização e credencial atual. Não iniciar M4.

### Timer/dock: classificação demonstrada em T3

Suíte completa adicionalmente falhou gika.spec botão respeita cronômetro real (desktop), sobreposição vertical mínima. Não é regressão introduzida pelo undo nem o problema offline antigo de M1/M2-S0. GikaLauncher/ActiveTimerBar/harness/estilos byte-idênticos a PREfc30bf9; painel/undo nem são abertos nesse teste. O teste original na cópia isoladafc30bf9 PASS1/1; a intermitência exige prova controlada, não apenas rerun verde.

Cópia por git archivefc30bf9, Vite5177 próprio/VITE_USE_EMULATORS, dependências idênticas via symlink. Somente fs.allow na configuração temporária fora do repo permite servir dependências/fontes compartilhadas; nenhum código de produto alterado. API convencional/emuladores já ativos; comparação executada após a suíte ampla, sem escritores concorrentes. Browser verificou base sem erros, fontes DM Sans carregadas em ambas.

Prova controlada nas duas versões com a animação CSS ORIGINAL timer-dock-in360ms: localizar bar.getAnimations(), pause()/currentTime=0, disparar resize existente, esperar3RAF, medir gap; finish() sem resize de conteúdo, esperar3RAF e medir; disparar resize novamente. Durante animação gap11,986px; após término gap-2,234px (sobreposição); após resize gap12px, exatamente nas duas versões. ResizeObserver mede caixa de conteúdo e não acompanha o fim do transform/scale; observador lê getBoundingClientRect transitório, guarda offset e não reavalia quando só transform termina. evidence/m3-t3-timer-baseline.json preserva números/versões/condições sanitizadas.

Classificação definitiva: PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE, defeito de geometria animada já presente na Gika antes de T3; comportamento depende do frame da medição. Não é falha adapter/model/domain, nem mascarada como regressão nova ou só erro de harness. Sem correção fora do undo nesta tarefa; pendência para escopo próprio. Resultado amplo continua50/13, nunca declarado verde.

Fechamento: execução focal final6/6 PASS após a última revisão de foco (5 novos undos, assert de foco em sucesso/conflito, desktop/mobile/dark/Axe; timer original). Suíte ampla preserva resultado50/13 e limitações acima. Check final repetido build/dois TS/194 unit PASS, shell12/1 FAIL baseline. Lint/build finais PASS; integração final76 PASS após proteção ABA. Nenhum teste desabilitado. Screenshots finais em m3-undo-desktop-light.png, m3-undo-mobile-dark.png e m3-undo-conflict.png; somente dados fictícios emulados. Revisão da spec/humanizer/React/auth/idempotência/ABA/escopo/diff/segredos/grafo concluída; artefatos históricos gerados pelos gates restaurados à entrada. Parar antes do M3-SMOKE/M4.
