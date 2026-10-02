# ExecPlan — Gika no Leve

## Objetivo

Entregar a **Gika**, assistente inteligente do Leve, como interface de linguagem natural para consultar e operar a agenda sem duplicar regras de negócio, sem dar ao LLM acesso direto à persistência e sem tornar a IA requisito para o funcionamento básico do produto.

## Invariantes

1. O modelo interpreta; o aplicativo valida e executa.
2. Nenhuma mutação vai diretamente do LLM ao banco.
3. A camada existente de domínio/comandos é reutilizada sempre que possível.
4. Toda ferramenta possui schema de entrada e saída.
5. Mudanças destrutivas ou em lote obedecem policy explícita.
6. Recorrência nunca é modificada por ambiguidade silenciosa.
7. Operações mutáveis devem suportar idempotência quando houver retry.
8. A UI convencional continua funcional sem IA.
9. O estado do projeto é persistido em arquivos versionados.
10. Conclusão exige evidência.

## Estratégia multiagente

### Orchestrator
Responsável por:
- sequência das tarefas;
- ownership;
- `GIKA_STATE.md`;
- `GIKA_TASKS.yaml`;
- integração final;
- commits e gates.

Não delegar o controle do estado global a múltiplos agentes simultaneamente.

### Auditor
Read-only sobre código.
Entrega mapa factual do repositório, scripts e pontos de integração.

### Domain Agent
Analisa tarefas, datas, recorrência, categorias, offline/outbox, conflitos e idempotência.

### UI Agent
Ownership sobre componentes visuais da Gika e testes de UI, somente após M0.

### AI Integration Agent
Ownership sobre adapter do modelo, tool definitions, tool routing e schemas.

### Security Reviewer
Preferencialmente read-only.
Faz threat model, revisão de auth, segredos, prompt injection, rate limit, políticas e exposição de dados.

### QA / Eval Agent
Ownership sobre testes/evals e revisão comportamental.
Não “conserta” produção sem task explícita do orquestrador.

### Release Reviewer
Audita diff completo, gates, documentação, performance e rollback antes da release.

## Regra de paralelismo

Pode paralelizar:
- auditorias de módulos diferentes;
- revisão de segurança;
- levantamento de UI;
- criação de evals;
- testes que não alterem estado compartilhado;
- implementação em ownership de arquivos comprovadamente disjuntos.

Não paralelizar:
- dois agentes alterando os mesmos arquivos;
- duas mudanças de schema/domínio dependentes;
- migrações e consumidores da migração ao mesmo tempo;
- alterações concorrentes em `GIKA_STATE.md`, `GIKA_TASKS.yaml` ou `GIKA_DECISIONS.md`.

## Protocolo de tarefa

Para cada tarefa:

### PRE
1. Ler `AGENTS.md`.
2. Ler estado e tarefa.
3. `git status`.
4. `git rev-parse HEAD`.
5. Confirmar dependências `done`.
6. Definir ownership.
7. Registrar `in_progress`.

### EXECUTE
1. Fazer a menor mudança suficiente.
2. Evitar refactor não relacionado.
3. Adicionar/ajustar testes na mesma tarefa.
4. Registrar decisão se surgir alteração arquitetural.

### VERIFY
Executar, conforme scripts factuais descobertos:
- testes focados;
- typecheck;
- lint;
- build;
- testes de regressão relevantes.

### CHECKPOINT
1. Atualizar tarefa.
2. Atualizar estado.
3. Registrar evidências.
4. `git diff --check`.
5. Commit atômico.
6. `git status`.
7. Registrar SHA final.

## Política de falha

Quando algo falhar:

1. não mascarar erro;
2. registrar comando e mensagem curta;
3. classificar:
   - código novo;
   - baseline preexistente;
   - ambiente;
   - dependência externa;
4. corrigir apenas se estiver no escopo ou criar bloqueio explícito;
5. não marcar `done` sem explicar o gate não executado.

## M0 — Auditoria

Nenhum código de produção da Gika.

Entregáveis:
- arquitetura real do Leve atualizada em `docs/gika/ARCHITECTURE.md`;
- scripts e gates reais;
- mapas de schema/domínio;
- auth/persistência/offline;
- pontos de integração;
- policy matrix inicial;
- plano revisado.

Gate: M0 só termina quando nomes reais de arquivos, módulos e comandos substituírem suposições.

## M1 — UI shell

Criar experiência visual sem dependência da IA:
- botão Gika;
- painel/tela;
- composer;
- quick actions;
- estados loading/error/offline;
- mock adapter.

Gate: UI funciona com mock previsível e não degrada navegação existente.

## M2 — Read-only

Adicionar:
- adapter do provedor;
- tool routing;
- `get_today`;
- `get_day`;
- `get_week`;
- fallback.

A Gika não pode alterar dados nesta milestone.

Gate: evals read-only aprovados.

## M3 — Create

Adicionar apenas `create_task`.

Obrigatório:
- validação;
- idempotência;
- proteção contra duplicação;
- resultado estruturado;
- undo se compatível.

Estado M3: T1/T2/T3 concluídos; T3 executado exclusivamente a partir de fc30bf9. Planos/evidências específicos M3_T1/T2/T3_* e ADR012/013. T3 reutiliza activity.trash/receipts transacionais existentes, undo UI determinístico com UID/revisão/createdAt original; não adiciona delete tool ou purge. M3 permanece parcial mesmo após T3: M3-SMOKE bloqueado até revisão/autorização e credencial atual, cadeia real create_task/persistência/resultado obrigatória para fechamento. Não executar live nem iniciar M4 nesta tarefa. Gates focais PASS e baseline ampliado documentado nas evidências.

## M4 — Edit

Adicionar de forma incremental:
- complete;
- update;
- reschedule.

Um contrato por vez.

## M5 — Policy/recurrence/batch

Criar policy engine antes de operações de alto impacto.

Matriz inicial desejada:

| Ação | Política |
|---|---|
| leitura | auto |
| criar tarefa simples | auto |
| concluir tarefa única | auto |
| editar/reagendar uma tarefa | auto ou confirm conforme impacto |
| lote | confirm |
| apagar | confirm |
| alterar recorrência | scope explícito |
| apagar conta | blocked |

A matriz final deve respeitar o domínio real do Leve.

## M6 — Organização inteligente

A IA gera **proposta estruturada**, nunca executa diretamente.

Fluxo:
1. consultar contexto mínimo;
2. gerar plano;
3. validar schema;
4. mostrar diff/preview;
5. confirmar;
6. executar por command layer;
7. mostrar resultado/undo quando aplicável.

## M7 — Voz

Somente após o fluxo textual estar estável.

## M8 — Proatividade

Detecção local/regra simples identifica oportunidades.
O LLM só entra quando a pessoa pede análise/proposta ou quando o produto explicitamente permitir.

Evitar monitoramento contínuo desnecessário.

## M9 — Hardening

- segurança;
- privacy/data minimization;
- App Check ou mecanismo equivalente factual;
- rate limit;
- observabilidade;
- acessibilidade;
- performance;
- offline;
- regression suite;
- release checklist.

## Definition of Done global

A Gika só está pronta para release quando:

- nenhuma tool crítica bypassa policy/domain layer;
- testes do projeto e evals relevantes passam;
- casos de ambiguidade de data e recorrência são tratados;
- retry não cria duplicações indevidas;
- operações em lote têm preview/confirmation;
- IA indisponível não quebra a agenda;
- logs não vazam conteúdo sensível desnecessário;
- métricas e erros podem ser investigados;
- documentação corresponde ao código;
- release reviewer aprova o diff;
- estado final e SHA estão persistidos.

## Revisão factual após M0 — 2026-09-30

Base f6b21b6695f4953e28daace00edb05b2dd4bfde1, branch feat/gika-integration. Mapa em docs/gika/ARCHITECTURE.md, provas em M0_EVIDENCE.md. Não reiniciar Fase 7 sazonal. Auditoria executada serialmente pelo orquestrador; nenhum subagente concorreu sobre estado global.

### Contexto, ownership e não objetivos

Stack React/Vite/Express/Firebase; schema Activity; comandos em server/commands/content.ts; sendCommand/outbox existentes. M0 ownership apenas documentação/estado. M1 ownership features/gika, montagem mínima App.tsx, testes Gika e documentação. M2 server/gika, packages/domain/src/gika.ts e rota Express existente. Alterações sobre API/outbox/domínio requerem gate de emuladores. Não adicionar SDK ou alterar produção em M0; M1 não consulta/escreve dados reais; não publicar/ativar billing.

### Sequência e contratos

M1-T1 botão flutuante e painel lazy dentro Shell com ErrorBoundary local; offset de timer/nav, teclado e foco. M1-T2 composer/quick actions/estados; texto por humanizer-br antes de edição, conversa em memória por uid, simulação explícita. M1-T3 mock determinístico/injetável com cancelamento e erros previsíveis, nunca rotas/provedor reais. Aceite: E2E autenticado de abrir/fechar/foco/Escape/navigation, offline, erro, draft, conta, viewports/light/dark/solid/reduced motion e Axe; screenshots focais.

M1-T4 executa refinement solicitado (ADR-010) antes de concluir M1; gates visuais e automatizados completos. M2-T1 usa Gemini Developer API gemini-3.5-flash-lite, thinking_level medium, exclusivamente Free Tier (ADR-009). Implementar sem segredo; somente smoke real exige GEMINI_API_KEY. Não ativar billing/fallback pago. M2-T2 implementa schemas/allowlist/policy mínima e get_today/day/week, <=7 dias, contexto trusted, partial explícito. Autorização Admin inclui membership/profile; deadline, cap de request/tool calls e limite por uid desde ativação. M2-T3 E01/E02/E60/E70 + saída malformada/tool desconhecida/troca de conta e resultados parciais.

M3 usa apenas ActivityInput task não recorrente; commandBridge pelo sendCommand; runtime validation entrada/saída e IDs gerados por software. Idempotência já é requisito M3-T1; M3-T2 prova retries/deduplicação (não autorização para adiar segurança). M3-T3 undo condicionado à revisão e policy, nunca purge. M4 title/status/data simples; reschedule com preview confirm; recorrente desabilitado até M5. M5-T1 consolida policy alto impacto, não inicia policy pela primeira vez. M5-T2 confirmação server-side específica e receipt/replay/outbox; M5-T3 revisa diferenças de controles dos handlers série antes de occurrence/future. M5-T4 lote limitado com preview/resultados claros. M6 atomicidade real ou decisão documentada sobre execução parcial; gate explícito se domínio ainda não suporta. M7 Permissions-Policy e fallback. M8 regras locais, M9 hardening final e revisão de release.

### Gates reais e rollback

lint, build (inclui typechecks) e unit a cada mudança funcional; integração Auth/Firestore para auth/commands/Rules/outbox; E2E local autenticado para UI e fluxos. Não repetir gates de código sem motivo por tarefa documental. Registrar diffs/resultado/limitação, git diff --check, estado/tarefas e commit por tarefa. Rollback por revert do commit de tarefa em branch, preservando trabalho não relacionado; provider desligado/mock e agenda continuam funcionais. Deploy/merge/release externa ainda exigem autorização concreta.

### Pendências factuais

humanizer-br resolvida pelo usuário: fonte oficial local .agent/skills/humanizer-br/SKILL.md, criada e lida integralmente antes do M1 (ADR-008). 05-capacidade-e-revisao.md ausente: registrar e não inventar capacidade/billing; não bloqueia o mapa de código. Superpowers indisponível: processo manual equivalente já permitido pelo AGENTS.md. Provider escolhido pelo usuário (ADR-009); GEMINI_API_KEY ausente bloqueia somente smoke real, não implementação/testes locais.

### Refinement final M1 — pedido atualizado

M1-T4 inclui polimento final solicitado: aviso mais discreto, empty state útil, título/densidade mobile menores e chips visíveis sem scroll excessivo; composer inicialmente compacto, expansível, ícones integrados. Corrigir overflow causado por elementos ocultos sem retirar labels/live region. Não iniciar lógica real de IA nesta tarefa. Validar screenshots e gates antes do checkpoint.

### Checkpoint M2 e smoke real

M2-T1/T2 implementam provider/read tools/UI sem segredo; M2-T3 encerra evals determinísticos e revisão. O gate real foi explicitado em M2-SMOKE, dependente de T3: somente ele fica blocked por GEMINI_API_KEY ausente. M2 permanece in_progress até esse gate, sem declarar integração real concluída. M3-T1 depende também de M2-SMOKE; não iniciar mutações nesta sessão/M2. Script npm run gika:smoke usa a mesma interface/provider e pergunta sintética, nunca agenda ou persistência. Operar exclusivamente Free Tier sem billing; não configurar chave no browser/env VITE nem usar chave fictícia.

### M3-T1 autorizado — 2026-10-01

Pedido atual autoriza somente primeira criação simples. Plano concreto/auditoria em docs/gika/M3_T1_EXECPLAN.md. Bridge sendCommand/activity.create conforme M0, IDs/envelope pendente mínimos já exigidos pelo handler/Today; não iniciar revisão completa M3-T2 nem undo M3-T3. Guard de uid/signal opcional no client API; fresh command auth/transaction no servidor. Date/title intent determinísticos e resultados estruturados após ack. Não reutilizar segredo M2.

### M3-T3 autorizado — 2026-10-01

Plano factual M3_T3_EXECPLAN.md, PRE fc30bf9 limpo. Undo somente pelo botão sobre criação confirmada/receipt/UID/revisão1, activity.trash existente; nunca purge/Gemini. Não fechar M3 após T3: M3-SMOKE bloqueado até revisão/autorização explícita, M4 depende desse gate.

### M3-SMOKE autorizado após revisão T3 — 2026-10-01

PRE abbd1e2 limpo; pedido explícito autoriza somente smoke, supersede a espera histórica por revisão. M3_SMOKE_EXECPLAN.md/M3_SMOKE_EVIDENCE.md: conta/emuladores fictícios, uma chamada Gemini real, create_task → comando/receipt/persistência/UI e lost ack/retry; undo opcional determinístico sobre alvo exato. Proxy Codex Remote apenas no processo, nenhum workaround/alteração de produção. Gates finais sem segredo, baseline documentado. M4 não iniciado; requer autorização posterior independente do fechamento M3.


## Execução verificada M4-T1 — 2026-10-01

Pedido mais recente autorizou somente complete_task após M3 fechado, PRE56b9308 limpo. T1 done, M4 in_progress. M4_T1_EXECPLAN.md/M4_T1_EVIDENCE.md/ADR014 registram auditoria, diferença do selector original activityId para title/date strict e resolução bounded, reutilização activity.setStatus/revisão/receipt, auth/retry/ack UI.218 unit/98 integração/38 E2E Gika/lint/dois TS/build PASS;global58/11/check12/1/audit13 baseline explícitos. Sem live nem T2/T3. Próxima ação é revisão T1; parar antes de M4-T2.


### Checkpoint M4-T3 — tarefa exclusiva concluída

Autorização mais recente d233971; plano/auditoria M4_T3_EXECPLAN.md antes do código. reschedule_task temporal strict/selector autenticado civil/exato/bounded, preview/confirm específico em memória e activity.update/revision/receipt convencional/ADR016. Horário/fuso/DST e campos não pedidos preservados, sem evento/série/batch/Undo novo.295 unit/150 integração/7 focal/lint/doisTS/build PASS;ampla82=67/15 classificada por cópia isolada d233971/sondas, atual8/2 final históricos, todas51 Gika observadas PASS. check12/1/audit13 baseline,26 arquivos idênticos. M4-T3 done; M4 permanece in_progress aguardando M4-SMOKE após revisão/autorização live. M5 não iniciado. Evidências M4_T3_EVIDENCE.md/evidence/m4-t3-{gates,transport-baseline,baseline-files}.json; estado/tarefas fontes atuais. Sem Gemini live/segredo/produção/billing/push/deploy/merge.

### M4-SMOKE autorizado e verificado após revisão — 2026-10-01

PREcfd96c3 limpo. M4_SMOKE_EXECPLAN/EVIDENCE: quatro chamadas Gemini reais HTTP200 complete/update/reschedule timed+untimed, comandos/revisão/receipt/persistência real emulada/ack/UI/retry sem efeitos extras, preview sem write até confirmar, conta vizinha intacta e fallback missing-env.295 unit/150 integração/25 E2E/lint/build/dois TS PASS;check12/1/audit13 baseline,26 arquivos idênticos. Segredo somente memória/processo encerrado; proxy Codex Remote ambiente-only. Sem mudança de produção/arquitetura/ADR. M4-SMOKE e M4 done; M5-T1 todo, parar até nova autorização.

### M5-T3 autorizado após revisão M5-T2

Entrada local/origin fc0b66972164e3cee73c6c9a65969ea2e61d3994 limpa/exata e fetch verificados. Plano factual docs/gika/M5_T3_EXECPLAN.md; ADR019 distingue occurrence/future reais de all não suportado, choice separada de confirmation, contexto/revisões/hashes no selo e guards na transação convencional. Complete somente occurrence; update/reschedule future apenas conjunto íntegro/prístino/bounded, sem nova engine/writer/coleção. Gates/checkpoint e backup remoto da feat autorizados nesta tarefa; sem M5-T4/Gemini live/deploy/main/visual/dependências. Estado de conclusão e provas atuais em GIKA_STATE/TASKS/evidência M5_T3.

### M5-T4 autorizado após revisão M5-T3

Entrada local/origin1b09f5fb0d07388f8bf5d2ef8c5bf9eba0e089c4 limpa/exata e fetch verificados; plano vivo docs/gika/M5_T4_EXECPLAN.md, ADR020. Subconjunto complete/reschedule cap5pending/umdia explícito com título/exclusão exatos e resolução integral, nenhum truncamento/partial executável. Prévia integral selada no signer existente, childIDs software/UID/request/revs/patch/scopes/count/expiry; occurrence explícito permitido, future/all loterecusados sem alterar T3individual. Mesmo writer/receipts e guard transacional de todospendentes, execução itemizada/partial/recovery honestos sem promessa globalall-or-nothing. Botões determinísticos online-only/ackreal, semnova collection/conversa/writer/engine. Gates/checkpoints+push somente feat autorizados; não iniciar M6/live/deploy/main/visual/dependências. Estado/evidências atualizam ao fechar gates.

### M6 — execução autorizada após integração responsiva

Base c840492, feat/gika-integration local/origin limpa. Objetivo: propostas diárias/semananais de reagendamento, strict e confirmadas; sem organização automática. Auditoria factual: BatchPlan já suporta patch temporal diferente por item, executor sequencial, receipts e guard integral dos pendentes; apenas sourceDate impõe um dia. Reutilizar signer, guard, card, bridge e activity.update. T1: contexto mínimo com slots temporários, validação/releitura e sugestão sem execução. T2: mesma proposta alimenta confirmação batch, inclui preservados e resultado itemizado honesto. T3: intervalo civil de get_week no mesmo contrato, máximo7dias e5tarefas; não truncar/ignorar partial.

Ownership: domínio Gika schemas, server/gika proposta/router/model, UI Gika card existente, testes focais e estado/evidência. Sem novos writers/collections/outbox/Rules/dependências/undo. Modelo recebe apenas slots/título/status/data/horário/indicador recorrente, sem IDs/revisões/identidade/notas. Proposta cobre todos candidatos; referências desconhecidas, no-op inventado, data fora do horizonte, DST inválido ou revisão alterada bloqueiam. Recorrentes só occurrence explícito; future/all em organização composta permanecem indisponíveis conforme M5.

Gates: provas focais por tarefa + lint/doisTS/build/unit e emuladores quando executável; antes de fechar M6 audit0/0/0, integration completa, Gika E2E, shell/responsive e Axe. Commits atômicos T1/T2/T3, STATE/TASKS juntos; backup final feat. Rollback por revert dos commits sem apagar receipts. Evidência M6_EVIDENCE.md, evals correspondentes; sem live porque não há credencial autorizada nesta execução.
