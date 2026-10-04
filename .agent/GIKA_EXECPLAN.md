# ExecPlan — Gika no Leve

## Finalização autorizada — M9, Liquid Glass e RC

**Objetivo:** concluir M9 sobre a Gika facial aprovada, adaptar seletivamente as superfícies de vidro e entregar uma única linha verificável para revisão de merge. Não constitui novo milestone.

**Contexto:** entrada `2fc1663503a609db286dde6971f719bb1b13102f`; React/Vite, CSS Glass histórico, comandos/receipts e harness de emuladores existentes. Aprovação facial e reconciliação documental registradas, sem port histórico necessário. O cliente conecta emuladores somente em DEV; verificações autenticadas devem preservar essa restrição, sem habilitar emuladores no produto de produção.

**Não objetivos/contratos:** sem main, deploy, pagamento, Gemini live, corpo/gestos ou nova funcionalidade. Auth, Rules, comandos, policy, confirmation, revisions, receipts, recorrência, batch, organização, voz, proatividade e Character permanecem intactos. Glass modifica somente superfícies, com fallback sólido, contraste AA e blur máximo 24px.

**Passos/gates:** (1) regressão M9 fresh completa e checkpoint congelado; (2) branch `feat/liquid-glass-system` exatamente dessa base; (3) harness com cores modernas, limites, isolamento e self-tests; congelar harness; (4) inventário/manifesto protegido e capturas before de rotas reais; (5) lotes de até cinco componentes, cada qual com Glass check/E2E, lint, ambos typechecks, build e focais; (6) capturas after, inspeção real, acessibilidade/responsividade/performance; (7) integração preferencialmente fast-forward; (8) regressão total e UAT sintético, evidência final, push e igualdade local/remoto/worktree limpo. Primeiras falhas preservadas; nenhum timeout/retry/asserção relaxado.

**Ownership:** executor principal possui Git, estado, tarefas, CSS/TSX de superfícies e documentos de release; auditorias paralelas somente leitura. Harness e manifesto ficam protegidos por hashes após validação. Dependências de produção não mudam.

**Rollback:** commits pequenos e semânticos; retirar Glass de uma superfície inviável preservando o componente original. Reversão posterior por commits específicos, nunca reset destrutivo. A base M9 congelada preserva o produto anterior ao Glass.

**Evidências/retomada:** logs locais sanitizados em `/tmp/leve-final-run`; resultados persistidos em `docs/release/M9_FINAL.md`, `docs/release/BRANCH_RECONCILIATION.md`, `docs/glass/` e evidência RC final conforme cada gate for realmente concluído. M9 fresh concluído; única falha de teste reduced obsoleto corrigida em337789b com17afetados verdes. M9_DONE_RC_READY; próximo checkpoint congela base, Glass não iniciado.

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

Base c840492, feat/gika-integration local/origin limpa. Objetivo: propostas diárias/semanais de reagendamento, strict e confirmadas; sem organização automática. Auditoria factual: BatchPlan já suporta patch temporal diferente por item, executor sequencial, receipts e guard integral dos pendentes; apenas sourceDate impõe um dia. Reutilizar signer, guard, card, bridge e activity.update. T1: contexto mínimo com slots temporários, validação/releitura e sugestão sem execução. T2: mesma proposta alimenta confirmação batch, inclui preservados e resultado itemizado honesto. T3: intervalo civil de get_week no mesmo contrato, máximo7dias e5tarefas; não truncar/ignorar partial. A restrição de um dia continua obrigatória para batches sem proposta de organização.

Ownership: domínio Gika schemas, server/gika proposta/router/model, UI Gika card existente, testes focais e estado/evidência. Sem novos writers/collections/outbox/Rules/dependências/undo. Modelo recebe apenas slots/título/status/data/horário/fuso da tarefa/indicador recorrente, sem IDs/revisões/identidade/notas. Proposta cobre todos candidatos; referências desconhecidas, no-op inventado, data fora do horizonte, DST inválido ou revisão alterada bloqueiam. Recorrentes só occurrence explícito; future/all em organização composta permanecem indisponíveis conforme M5. Horário sugerido pode mudar somente como patch explícito no diff selado; remoção de horário não suportada. Semana usa weekStartsOn/fuso do perfil e não reorganiza dias já passados. Offline bloqueia confirmar/retomar, preserva cancelamento e não dispara ao reconectar; o bridge para antes do próximo envio, conservando resultados já reconhecidos.

Gates: provas focais por tarefa + lint/doisTS/build/unit e emuladores quando executável; antes de fechar M6 audit0/0/0, integration completa, Gika E2E, shell/responsive e Axe. Commits atômicos T1/T2/T3, STATE/TASKS juntos; backup final feat. Rollback por revert dos commits sem apagar receipts. Evidência M6_EVIDENCE.md, evals correspondentes; sem live porque não há credencial autorizada nesta execução.


### M7 — execução sequencial autorizada

Objetivo: voz somente preenche composer, revisão/envio manual pelo fluxo textual existente. Base25eecb0 local/origin/fetch exatos/worktree limpo; M6 aprovado, T1→T2 automáticos. Contexto: GikaComposer tem botão visual desabilitado; GikaLauncher é key por session.uid e desmonta na troca de conta. Header vercel.json microphone=() bloqueia captura. SpeechRecognition/webkitSpeechRecognition nativas são enhancement com suporte desigual; MDN confirma que alguns navegadores enviam áudio a serviço remoto, sem garantia offline/local. Nenhuma dependência necessária.

Contratos/passos: T1 controlador nativo pt-BR/finais somente/sem autoenvio, cancel/cleanup/late-events/draft e UI acessível no composer; Permissions-Policy microphone=(self), camera/geolocation negados. T2 evals/fixture nativa simulada e E2E focal voz→texto→envio manual, denied/unsupported/offline/logout, regressão crítica existente e shell/Axe. Sem voice router/commands/policy/persistência/Gemini áudio. Ownership features/gika composer/controlador/CSS mínimo, vercel.json, testes focais e estado/evidências/evals/arquitetura. Gates audit0/lint/doisTS/build/unit, integração completa por header, E2E focal e regressões proporcionais. Rollback revert dos commits M7; texto convencional continua independente. Evidência M7_EVIDENCE.md; próximo checkpoint T1 após gates, depois T2; M8 fora do escopo. Não alegar microfone real/produção sem dispositivo e deployment autorizados.

M7 concluído T1/T2: contratos e abordagem acima comprovados por522unit/252integração/37E2Eselecionados/17shell/Axe/audit0. Copy/hints ajustados após regressão reflow200% comprovada, sem alterar shell/commands. Evidência preserva primeiras tentativas/limitações. Parar antes M8 e aguardar revisão; backup final somente feat.

### M8 — proatividade local autorizada

Objetivo: sugestão discreta sobre dados já carregados no Meu dia; nenhuma IA/comando na detecção. Entrada44b8928 local/origin/fetch limpa. Contexto: Today possui activityQuery de3limit50 com loading/error/partial/cached; buildDailyBrief inclui eventos/notas/descriptions e TTS convencional, não reutilizar esse payload nem alterar áudio. Não há opener Gika compartilhado; reutilizar padrão de evento Tutorial, UID atual e intenção fixa, sem dados de tarefa/autoridade/modelo.

Contrato: somente4–5task pending datadas de hoje, seleção hoje, leitura completa/sem erro; union<=150, cap5 existente. Nenhum atraso/semana/humor inferido ou query nova. Fingerprint determinístico dia/IDs/horários ordenados, sem títulos/revisões/notas; somente memória de dismiss no contexto montado/UID, bounded8. Navegar/reload pode encerrar contexto, nunca dispara IA/commands. Cached legitimamente disponível pode sugerir, clique offline mostra aviso local sem carregar panel/lazyimport nem preparar request; nenhuma fila/autoenvio.

Passos/ownership: T1 função pura features/gika/proactivity + unit/estado. T2 superfície inline Today usando panel/heading/ações/tokens atuais e GikaMark; evento explicitamente prepara intenção existente no composer, preserva draft, envio textual permanece consciente. M6 preview/confirmation/commands intactos; não adicionar executor. Gates T1 unit/lint/doisTS/build; finalaudit0/lint/doisTS/build/unit/E2Eproatividade+regressão crítica/shell/Axe/inspeção visual. Integração server redundante: nenhuma alteração nessa camada. Evidência M8_EVIDENCE/EVALS. Rollback revert dos commits sem dados novos. Próxima ação T1→T2 automático; parar antes M9/Character/TTS/TQA/live/deploy/PR/main.

## M9 autorizado — hardening e RC

Objetivo: medir e corrigir somente riscos concretos; T1 segurança/limites/AppCheck, T2 telemetria técnica sanitizada, T3 visual/performance/offline/Character conforme asset real, T4 harness/CI/regressão/RC. Entrada2e73b3a local/origin/fetch limpa/exata. Contexto: Auth/Rules/commands/receipts/confirmation/recurrence/batch/M6–M8 maduros, logger/CSP existentes, scripts verify ainda ausentes. Character branch contém somente especificações, nenhum .riv/avatar/master; ordem antiga antesM6 obsoleta. Sem ferramenta Rive/rig real, manter GikaMark e registrar CHARACTER_ASSET_REQUIRED; não inventar renderer/provider sem consumidor.

Contratos/ownership: preservar domínio/writepath/quotas/UID/revisions/receipts/FreeTier. Alterar somente causa demonstrada nos donos (envguard, logger/app, lazy UI, harness/CI e testes correspondentes). Sem stack/serviço novo/collection/outbox/IAoffline/vozauto/TTS/main/deploy. Passos: comprovar risco/teste focal; menor fix; gates pertinentes e commit por T1/T2/T3; T4 scripts reutilizados, guardrail imports via parser AST já instalado pelo ESLint (TypeScript7 não fornece compiler API neste pacote), documentação operacional curta, regressão completa. Nenhuma etapa paralela/M10/closure.

Gates: auditprodução0/lint/doisTS/build/unit/integration/RulesAuth; Gika ampla/voz/proatividade/Planner/calendário/PWAoffline/session/design/shell/Axe. Viewports390/853/1024/1366/1920/2560, light/dark/solid/reduced/200/teclado. Medir chunks/bootstrap/abertura/memória/layout antes/depois; guardar primeira falha, nunca aumentar deadlines/retries/relaxar domínio. Rollback: reverter somente commits M9 com git revert se autorizado; não reset/clean/rebase. Evidência única docs/gika/M9_EVIDENCE.md, STATE/TASKS por tarefa, checkpoint e backup somentefeat. RC_READY somente gates verdes, limitações de rig/hardware/live/UAT explícitas.

M9-T3 blocked exclusivamente CHARACTER_ASSET_REQUIRED; usuário autorizou continuidade de T4 independente. Verify reutiliza gates e oito E2E existentes; CI crítico/AST boundaries/CONTRIBUTING curto, sem TQA ou dependência nova. RC visual fica impedido até rig/asset reais; nenhum M9_DONE_RC_READY por fallback.

### Retomada Character sobre e28da58 — plano fornecido pelo usuário

Referência JPEG aprovada copiada sem alteração para docs/gika/character/reference e visual lock persistido. Rive CLI oficial1.3.0 instalado fora do projeto e autoria RML local comprovada, supersedendo a ausência histórica de ferramenta. Publicação/exportação Free com splash versus Cadet+ limpa exige decisão humana para manter R$0; RIVE_ZERO_COST_PRODUCT_BLOCKER é adicional ao asset ainda ausente. Build unsigned local sem scripts não constitui licença/exceção comprovada para publicação sem splash. Não instalar runtime/controller antes de master/rig fiel e spike funcional; não criar falso master a partir do exemplo oficial. Depois da decisão, seguir master→idle/blink→motions→integração incremental→gates completos do plano atual, sem nova fase/stack/writer. No estado documental atual, validar bytes/hash/links/YAML/diff e manter T3/T4 blocked; não repetir regressões históricas sem código novo.

Autorização posterior78f03ea (ADR024) resolve essa decisão: Free/splash em todo desenvolvimento, Cadet somente na export final sem splash após aprovação integral do asset/rig. Não assinar agora nem trocar tecnologia. Dois ensaios auxiliares de reconstrução foram renderizados/revisados e rejeitados por lacunas/contaminação/fragmentação e ausência de anatomia separada para rig; VECTOR_ASSET_HUMAN_REFINEMENT_REQUIRED registrado com previews QA. Retomar pelo refinamento manual fiel, não pelo runtime sobre auto-trace reprovado. Histórico do bloqueio financeiro preservado, mas não aplicável como impedimento atual de autoria.


### Estratégia corrigida — busto raster+mesh+bone (ADR025)

Pedido posterior: manter auto-traces reprovados e investigar caminho híbrido oficial antes de bloqueio humano definitivo. Fonte neutra da prancha, crop365,377–454,481,89×104; pixels aprovados separados em12PNGs transparentes, sem geração/trace. Ensaio RML/.riv compilado, meshes realmente dirigidos pelos bones; rest/idle fiéis em light/dark. Blink mostra ausência de base limpa sob olhos; não é acabamento aprovado. Arquivos fonte em assets/gika/source/hybrid-bust e authoring em assets/gika/rive/hybrid-bust-spike, sem consumidor no produto.

Ownership dentro do M9-T3: reconstruir somente backing do rosto, registrar lids/bocas da referência, underlap cabelo/queixo e matte; repetir idle+blink e QA de mecha/identidade/escala antes de estados e integração. Não exigir vetor integral, novo personagem, expansão corporal universal ou nova etapa. Braços/gestos adicionais somente se necessários e derivados da identidade aprovada. Não inventar pixels ocultos automaticamente como concluídos. M9/T3 in_progress, T4 blocked para RC; limites detalhados em M9_EVIDENCE. Gates atuais focais de autoria/RGB/meshes/links/YAML/boundaries; gates completos após integração real, históricos não viram nova aprovação.


Hybrid Bust v2: PNG original recebido dentro deZIP (2aea8b31), normalização da mecha permanente conforme autoridade visual corrigida. Reutiliza fonte RML v1; reconstrução não generativa somente backing1202pixels/closed lashes registradas/underlap oculto/matte.14PNGs, idle com blink, QA100capturas light/dark/24–72px e guard reproduzível de rosto/mecha. Gate de autoria PASS, sem aprovação integral do rig/personagem. Próximos listening/thinking e estados do mesmo busto; não integrar no produto neste pedido. Estado M9/T3 in_progress e RC blocked; preservar primeiras falhas/proveniência, validar produto somente depois de integração autorizada.

### Estados essenciais e integração autorizados sobre aa7690ff

Direção v2 aprovada pelo usuário: finalizar somente rest/idle/blink/listening/thinking/clarify/success/error/offline; reutilizar as14camadas sem novos pixels/personagem/gestos extras. Um artboard transparente/scriptless, uma state machine e um mode numérico via ViewModel oficial (inputs legados deprecated). Controller local recebe apenas flags/eventos técnicos; não recebe conteúdo/IDs nem imports de domínio/commands/model. Voz real governa listening, request/execução governa thinking, success somente ack validado; cancelar/fechar não executam nada.

Ownership: assets/gika/rive/essential-bust, UI features/gika/character e ligações de apresentação nas UI existentes, CSS de tamanho fixo, runtime oficial mínimo e CSP WASM estritamente necessária. Lazy apenas painel aberto/visível, fallback v2 fiel, sistema+perfil reduced motion, cleanup em close/unmount/account switch; WASM/RIV same-origin sem analytics. Gates: autoria/capturas dos nove estados+transições/curl, audit/lint/guard/doisTS/build/unit/integration; Gika/shell/responsive/Axe/viewports/200%; medidas de chunk/lazy/RAF/cleanup/layout. Não abrir novas fases nem expandir gestos. Cadet/export final sem splash e aprovação integral do rig continuam distintos da direção aprovada. Rollback por revert somente dos commits desta integração, nunca reset destrutivo. Resultados/primeiras falhas em M9_EVIDENCE; estado só após prova real, parar para revisão.


### Composição final autorizada sobre 057744ff

PRE fetch/branch/local=origin/worktree limpos e documentos Character persistidos na branch design lidos. Ownership permanece M9: CSS do painel, alpha demonstrado na fonte/rig essencial, launcher, fixtures e evidência. Não refazer os nove estados/controller nem contratos funcionais. Corrigir somente matte localizado e colisão footer comprovada; M8 usa contas sintéticas isoladas, cap5/assertions/deadlines intactos. Revalidar gates e registrar primeiras falhas. Fonte principal e turnaround devem demonstrar nitidez e partes suficientes antes de GikaPresence; não criar substituto/rig placeholder nem ampliar119×117. HALF_BODY_SOURCE_INSUFFICIENT e corte natural pendente impedem READY/export, mesmo com regressão técnica aprovada. Cadet não assinado; não declarar T3/T4 done antes da aprovação visual e export oficial sem splash.


Direção posterior sobre f056244: meia-altura removida do requisito de M9; bust-only e portrait UI explícito autorizados. Fonte insuficiente continua documentada, sem novo asset/pixels. Preparar /dev/gika-character isolado de produção, capturas e controles do runtime real; parar para revisão humana antes de repetir regressão final ou export. Isso substitui a exigência de meia-altura do parágrafo anterior, sem apagar seu histórico.


### Retomada final Glass sobre dcf8c9c — escopo autorizado

M9 congelado b0e7bae; sem reabertura. Forced colors: medir sem alterar inline-flex React/Text, usar system colors em Compras, nunca liberar unmeasured. Responsividade: calendário390/200%, scroll interno e mobile páginas reais. Gika: mesmo opener/panel lazy dentro da nav com portrait aprovado, excluir dock fixed e observadores obsoletos; não tocar assets/controller/domínio. Concluir overlays/Gika somente com primitivo central e manifesto7. Gates Glass fresh/selftests/after+review/perf antes de FF para integration; então regressão total sintética/RC-UAT, evidência final e push. Git/runtime/CSS/estado pertencem ao root; auditoria paralela somente leitura. Main/produção/live/paid intactos. Falhas iniciais preservadas, sem deadlines/retries/assertions relaxados.
