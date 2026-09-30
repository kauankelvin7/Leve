# Gika — estado persistente

## Estado atual

- Status global: `IN_PROGRESS`
- Milestone concluído: `M0` (cinco tarefas, cinco commits)
- Milestone atual: `M1`
- Tarefa atual: `M1-T4` (`todo`)
- Branch: `feat/gika-integration`
- Repositório: `/workspace/Leve`, clone HTTPS de https://github.com/kauankelvin7/Leve.git
- Base auditada: `f6b21b6695f4953e28daace00edb05b2dd4bfde1`
- Último SHA verificado / último commit de tarefa Gika: `8a9ee7ea8960e4da9a77cada46e2f294e53e4003` (verificado antes de M1-T3)
- Worktree limpo no último checkpoint: `sim, após M0-T5; este checkpoint altera apenas documentos/estado`
- Último gate executado: `M1-T3: lint/build/typechecks PASS; 101 unit/26 arquivos PASS; 12 E2E locais + Axe PASS (2 min); screenshots revisados`
- Commit de checkpoint: `feat(gika): M1-T3 add deterministic mock and isolation gates` (contém este arquivo)

## Próxima ação

1. Ler .agent/skills/humanizer-br/SKILL.md antes de criar/revisar qualquer texto Gika; fonte oficial local autorizada pelo usuário (ADR-008).
2. Conferir AGENTS.md, estado, tarefas, ExecPlan, ADRs, git status e HEAD.
3. Iniciar M1-T4: refinement visual solicitado antes do M2, ownership UI Gika/mock/testes. Não adicionar provedor/SDK nem mutação real no M1.
4. M2 autorizado: Gemini Developer API, gemini-3.5-flash-lite, thinking_level medium, exclusivamente Free Tier, sem billing/fallback pago. Implementar sem segredo; somente smoke real depende de GEMINI_API_KEY ausente.

## Bloqueios

- Documento 05-capacidade-e-revisao.md citado no AGENTS.md está ausente do checkout. Não impede auditoria factual dos limites de código, mas não inferir capacidade operacional/billing a partir dele.
- Checkout ausente da sessão anterior: resolvido pelo clone HTTPS. Staging antigo em /workspace/scratch/gika-agent-pack não é a fonte de verdade atual.

## Riscos e limitações

- Bundles baseline >500 kB; nenhuma otimização fora de escopo. Ver M0_EVIDENCE.md.
- Handlers de série divergem em controles/limites da command layer genérica; revisão obrigatória antes de expor em M5.
- useUserCollection mascara partial; Gika não usará isso como prova de consulta completa.
- Batch transacional genérico não existe; gate M6. Header microphone=() bloqueia voz; gate M7.
- Superpowers indisponível; processo manual equivalente conforme AGENTS.md. Nenhum subagente utilizado.
- M1 usa apenas mock em memória. Não houve deploy, merge, push ou uso de credenciais de produção.

## Checkpoint de retomada

O SHA acima identifica o último commit de tarefa, anterior ao commit que grava este checkpoint (não há SHA auto-referente possível em arquivo versionado). Conferir git log e diff de commits posteriores. O checkpoint esperado posterior só contém estado/documentação. Se HEAD divergir por mudanças adicionais, investigar antes de continuar; não ignorar divergência. Histórico e tarefas são fonte de verdade.

## Histórico

| Data | Milestone | Tarefa | Resultado | Commit |
|---|---|---|---|---|
| 2026-09-30 | M0 | M0-T1 | done — docs(gika): M0-T1 map repository and quality baseline | `ab35fc545d746af350d646a3ef012b1f79ebc3c3` |
| 2026-09-30 | M0 | M0-T2 | done — docs(gika): M0-T2 trace agenda domain and recurrence | `4cd81d5e91eb3479656407d3ca154713e4294e9a` |
| 2026-09-30 | M0 | M0-T3 | done — docs(gika): M0-T3 audit auth persistence and offline | `6fd5ce12683b19434cc30c205e42b0cf93d2bc40` |
| 2026-09-30 | M0 | M0-T4 | done — docs(gika): M0-T4 map shell design system and navigation | `15ce9d11adf065b0bc9bdc766011fed926493451` |
| 2026-09-30 | M0 | M0-T5 | done — docs(gika): M0-T5 define integration contracts and policy gates | `033566c350f081f3c3f50953666756b7afb4c38b` |
| 2026-09-30 | M1 | M1-T1 | blocked: humanizer-br ausente; não iniciada | checkpoint após M0-T5 |

| 2026-09-30 | M1 | M1-S0 | done: skill local oficial criada e lida; bloqueio resolvido | commit M1-S0 após 5c9c486 |

| 2026-09-30 | M1 | M1-T1 | done: botão/painel, 2 E2E + Axe, lint/build/typecheck e 93 unit PASS | commit M1-T1 após dbd3a9dc778fc47fa19cf355bfb5ce57d8a83ac6 |

| 2026-09-30 | M1 | M1-T2 | done: composer/estados/offline, 4 E2E cobertos e gates PASS | commit M1-T2 após 82a1d3cc0d10b6db147c83cdeb812822711b5047 |

| 2026-09-30 | M1 | M1-T3 | done: mock cancelável/validado, 101 unit e 12 E2E + Axe PASS | commit M1-T3 após 8a9ee7e |
