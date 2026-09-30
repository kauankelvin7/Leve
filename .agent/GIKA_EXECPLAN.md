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
