# M5-T1 — policy determinística de mutações

## PRE/auditoria
Entrada156fe77dd94d24152c4af12c122ce90188b28271, feat/gika-integration e worktree limpo verificados antes de qualquer alteração. AGENTS/STATE/TASKS/ExecPlan/decisões/evidências finais M3/M4 relidos, M5_T1_EXECPLAN persistido antes do código. Humanizer-br local oficial lida; sem novas mensagens de interface nesta tarefa. Superpowers indisponível/processo manual equivalente, auditor auxiliar read-only, orquestrador serial.

Schemas strict/allowlist7 e parsers de intenção original/civil existentes; resolução de um dia/exata/autenticada/cap50/partial. Router renova authorize após provider/leitura/receipts. sendCommand/activity.create/setStatus/update/trash são writers convencionais, ownership/profile/membership/revisão/hash/receipt transacionais. Reschedule usa preview/botão específico em memória com UID/op/revisão; não é autorização PendingAction server-side T2. Undo de criação já aprovado continua botão determinístico/revisão/receipt original, fora do caminho de ferramentas de linguagem natural.

UI convencional delete é trash30dias; restore/purge separados. RecurrenceScopeDialog oferece occurrence/future e updateFuture divide série/IDs. ConfirmDialog possui confirm-title fixo, apresentação sem digest/expiração/autorização; série usa confirmação própria. Não existe batch genérico transacional; trash.empty é específico. Auditor detecta limites históricos nos handlers de série: trashSeries lê até500 sem indicador de truncamento e pode recuperar receipt antes de conferir estado atual da conta; não replica todas as proteções do contentCommand genérico. Não corrigidos nem habilitados nesta tarefa, sem alegar autorização uniforme.

## Implementação/decisões
server/gika/actionPolicy.ts é função pura/Zod, sem provedor, persistência, logger, comandos ou texto de modelo. Resultado discriminado runtime strict allow/clarify/confirm/deny com reason/risk enums. Facts runtime strict incluem action/effect/cardinality/recurrence/scope/entity/state/changedFields/validation/auth/completeness/noOp/execution; sem título/prompt/UID/entityId/revision/confirmed. Registro fechado de quatro mutações atuais, Object.hasOwn impede herança/prototype como action. Actions não registradas, facts inconsistentes, campos proibidos e estados impossíveis falham fechados, sem default allow. Risk low/medium/high expressável; apenas preview simples já implementado produz confirm low nesta etapa.

| Fato calculado pelo software | Decisão | Efeito nesta etapa |
|---|---|---|
| create simples/intenção e dados validados | allow | descriptor existente; ainda exige command ack |
| dados obrigatórios não resolvidos na intenção original | clarify/MISSING_REQUIRED_DATA | nenhuma mutação |
| complete task única pending | allow | setStatus/completed convencional |
| homônimos/nenhum alvo | clarify/AMBIGUOUS_TARGET ou TARGET_NOT_FOUND | sem descriptor |
| update task simples patch title | allow | activity.update título existente |
| campo fora do escopo/schema inválido | deny/FIELD_NOT_ALLOWED ou INVALID_PAYLOAD/INVALID_FACTS | schema continua barreira independente |
| reschedule task única e válida | confirm/RESCHEDULE_PREVIEW_REQUIRED/low | preview existente e botão explícito, nunca execução automática |
| partial/saturado | deny/INCOMPLETE_RESOLUTION | observação parcial existente ou rejeição, sem escrita |
| ação múltipla distinta/bulk/series cardinality | deny/BULK_NOT_SUPPORTED | nenhuma execução/preview em lote novo |
| recorrência sem escopo | clarify/RECURRENCE_SCOPE_REQUIRED | resolução unsupported já existente; use agenda convencional |
| escopo occurrence/future/series em facts recorrentes | deny/RECURRENCE_NOT_SUPPORTED | não habilita operação só por ter escopo |
| destructive/unknown | deny/DESTRUCTIVE_NOT_SUPPORTED ou UNKNOWN_ACTION | tools/bridges não habilitados |
| auth ausente/alterada | deny/AUTH_REQUIRED ou AUTH_CHANGED | middleware/authorize/commands continuam autoridade real |
| no-op/already-completed | deny/NO_CHANGE_REQUIRED | observação honesta existente, sem command/revision |

policyAssessment.ts deriva facts de intenção validada/read autenticado/resolução enum já existentes, sem query ou escolha de novo alvo. Classificação ocorre depois de schema e intenção original, antes de emitir descriptor; router exige allow para create/complete/update e confirm para reschedule. Unknown/malformed/múltiplas chamadas distintas também têm classificação fechada na validação. Igual function call repetida continua collapse técnico da mesma ação, não batch. Leituras get_today/day/week conservam política readRange existente.

Decision não entra no contrato HTTP/UI e não é flag de autorização: client/model não envia decisão aceita pelo servidor. Não existe endpoint/collection/Policy grant/PendingAction novo. Auth/ownership/validation/revision/receipt/ack intactos; command layer não lê decisão nem aceita ela para substituir suas verificações. Nenhuma UI/writer/Rule/outbox/modelo alterados. ADR017 registra a consolidação de classificação com fatos históricos separados de execução nova.

Receipt replay reautenticado tem execution=replay/state=historical somente a partir do snapshot privado VALIDADO existente. Não inferir estado atual nem refazer provider/resolução de operação já comprometida; bridge ainda precisa ack real e revisão original/alreadyApplied. Durante corrida pós-read, receipt recuperado/classificado precede gate da nova resolução; classificação histórica não renova revision nem habilita série/destruição.

Observabilidade backendLog existente: evento gika.policy_decision contém apenas action registrada ou unknown, decision/reason enums e bucket lt10/10..99/gte100ms, além de metadados normais timestamp/level/service. Sem prompt/título/token/UID/IDs/fields/payload/estado privado, analytics externo ou provider. Teste espia registro e compara chaves/ausência de valores privados.

## Testes/evals e iterações
RED inicial unit por módulo ausente, GREEN classificador. Unit prova create/incompleto/unique/ambiguous/rename/forbidden fields/confirm/unknown (incl __proto__/constructor)/bulk/recurrence/destructive/partial/saturated/auth/no-op/estado impossível/strict output/provider independence/facts/telemetria/replay. Architecture guard impede persistência em ambos módulos. Integração usa modelos fixture e Auth/Firestore/commands/receipts reais emulados; nova suíte dedicada não compartilha limiter global com suite maior.

Inicial161 integrações PASS; fixture de variante tool array tinha referência opcional incompatível com ModelCall no TS, corrigida com non-null em helper comprovado, sem mudança de regra de negócio. Auditor identificou precedência do receipt na corrida saturada: gate de nova resolução foi movido após recuperação/reautorização do receipt, regressão dedicada commit durante read. Testes adicionais forçam deny do classifier sobre quatro descriptors otherwise valid e comprovam bloqueio sem escrita. Permissão aparente allow com revision obsoleta continua409 convencional; outro UID nega command, replay não chama provider nem duplica, unknown/manipulated/client decision rejeitam strict. Logout/troca de UID durante token/ack e UI seguem regressões existentes executadas novamente, sem segundo serviço de autorização.

Evals M5-E01..E21 em EVALS.md. Sem modelo real/chave fictícia/Gemini live. Persistência real emulada, não certificado de produção nem aparelho físico.

## Gates/retomada
Lint/build/dois TS/323 unit em40 arquivos PASS. Integração final166/6 arquivos PASS, após prontidão dos emuladores. Execução ampla das51 Gika:50 PASS/1 FAIL (lost Undo ack); repetição focal final6/6 PASS incluindo o caso falho, criação/Undo/conclusão/título/preview. As51 únicas tiveram passagem observada, sem alegar uma execução ampla integralmente verde. Sem Gemini live, nenhum provider real/segredo. Audit readonly13(9moderate/4high) e26 arquivos convencionais byte-idênticos a156fe77, sem audit fix/refactor/timer/contraste fix. Check final limpo executado com resolução IPv4 somente no processo: build/dois TS/323 unit PASS; shell12 PASS/1 FAIL histórico de contraste3,66..4,17:1 vs4,5:1. Gates globais não integralmente verdes; baselines não corrigidos nem testes desabilitados. m5-t1-gates.json registra resultados sanitizados e tentativas anteriores.

Falha Undo classificada contra156fe77: ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE. O teste intercepta interpretação do modelo, não executa policy/router alterados; UI/bridge/command/harness originais permanecem idênticos. Trace sanitizado: create HTTP200/8690ms; undo/route.fetch pendentes até teardown, assertion retry10000ms expirada. Nenhum body/token/header/trace bruto registrado. Original atual PASS11,3s e entrada PASS7s. Sonda environment-only em ambas injeta atraso10200ms APÓS ack real do activity.trash: deadline original10000ms expira, retry depois retorna applied/alreadyApplied, mesma operação, um modelo fixture, zero tarefas ativas. Ambas sondas PASS, removidas do worktree; nenhuma mudança nos deadlines/produção. Não inferir causa infra mais específica. Evidência m5-t1-transport-baseline.json.

Iterações de gates não ocultadas: uma integração iniciou antes de Auth9099 disponível (ECONNREFUSED no setup,74 FAIL/92 PASS); execução após HTTP200 da prontidão passou166. Primeiro check final não chegou ao shell por preview bind IPv6 ::1 vs harness127.0.0.1 (localhost HTTP200/IPv4 não alcançável); configurações são byte-idênticas à entrada. Preferência NODE_OPTIONS=--dns-result-order=ipv4first somente processo, sem alteração no repo. Uma tentativa intermediária de check viu import AxeBuilder não usado na sonda temporária (TS6133); sonda removida antes do check final limpo. Não são resultados ocultos nem falhas classificadas como contraste.

Revisão independente read-only final aprovada sem blocker: replay comprometido precede gate de nova resolução, unknown/malformed razões tipadas, sem bypass/writer/campo wire novo ou habilitação de alto impacto.

M5 parcial, exclusivamente T1. Sem T2/batch/delete por linguagem natural/recorrência/organização/voz/proatividade/M6+, billing/segredo/push/deploy/merge. Sem mudanças em regras originais do Leve. Parar após T1 para revisão, não executar live automaticamente.

## Checkpoint/estado final

M5-T1 done; M5 in_progress, M5-T2/T3/T4 todo, sem início. Commit atômico `4561cf59db395ac4c10c58118890283a3e45ec1e` inclui código/testes/evidências/estado/tarefas/ADR017. Branch feat/gika-integration e git status vazio confirmados após commit. Este checkpoint documental apenas registra o SHA real, sem referência circular ou alteração funcional; worktree confirmado limpo novamente depois dele.
