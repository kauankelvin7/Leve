# Gika — estado persistente

## Estado atual

- Status global: `IN_PROGRESS`
- Milestones concluídos: `M0` e `M1` (shell/mock/refinement; limites da regressão ampliada abaixo)
- Milestone atual: `M2` (read-only; M1 visual aprovado pelo usuário)
- Tarefa atual: nenhuma; M2-T1 concluída, próxima M2-T2
- Branch: `feat/gika-integration`
- Repositório: `/workspace/Leve`, clone HTTPS de https://github.com/kauankelvin7/Leve.git
- Base auditada: `f6b21b6695f4953e28daace00edb05b2dd4bfde1`
- Último SHA verificado / último commit de tarefa Gika: `7a3c343` (M2-S0, worktree limpo antes de M2-T1)
- Worktree limpo no PRE M2-T1; gates provider PASS; checkpoint registra o commit anterior à tarefa atual
- Últimos gates: `lint/build/typechecks, 102 unit, 28 integração, 13 Gika E2E + Axe, 13 shell e 7 sazonal PASS; regressão ampliada 32: 27 PASS/5 FAIL, falha Gika corrigida e suite repetida 13 PASS; Planner com 3 falhas baseline explicadas e 1 intermitência, repetição offline atual PASS`
- Commit atual de tarefa: `feat(gika): M2-T1 add bounded Gemini read-only adapter` (contém este estado)

## Próxima ação

1. Ler .agent/skills/humanizer-br/SKILL.md antes de criar/revisar qualquer texto Gika; fonte oficial local autorizada pelo usuário (ADR-008).
2. Conferir AGENTS.md, estado, tarefas, ExecPlan, ADRs, git status e HEAD.
3. Pedido atual aprova M1 e autoriza M2 após classificação explícita de baseline/intermitência em M2-S0. Depois executar M2-T1/T2/T3 estritamente read-only, preservando contrato de UI dos mocks. Nenhuma mutação M3 é autorizada neste M2.
4. M2 autorizado: Gemini Developer API, gemini-3.5-flash-lite, thinking_level medium, exclusivamente Free Tier, sem billing/fallback pago. Implementar sem segredo; somente smoke real depende de GEMINI_API_KEY ausente.

## Bloqueios

- Documento 05-capacidade-e-revisao.md citado no AGENTS.md está ausente do checkout. Não impede auditoria factual dos limites de código, mas não inferir capacidade operacional/billing a partir dele.
- Smoke real futuro M2: GEMINI_API_KEY ausente; somente esse smoke poderá ser bloqueado. Implementação/testes locais sem segredo continuam autorizados. Não inventar chave nem billing.

## Riscos e limitações

- Regressão Planner ampliada não integralmente verde: contraste completed 4,28:1 e dois testes sem expandir Mais opções são baseline (prova em M1_EVIDENCE.md). Offline era regressão do dock Gika, demonstrada por hit-test base/branch e corrigida: sequência original 2 PASS, nova proteção de dock 3 PASS. Ver M2_PREFLIGHT.md. Nenhum teste desabilitado; nenhuma correção de domínio/Planner fora do escopo.
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

| 2026-09-30 | M1 | M1-T4 | done: refinement/polimento final; gates focais PASS, screenshots revisados e limites da regressão global documentados | `ea10ae9d69b2124e0ffc340bc0bfab9128454bbb` |

| 2026-09-30 | M2 | M2-S0 | done: baseline contraste/recorrência confirmados; regressão dock offline corrigida, gates PASS | commit M2-S0 após d8ee3f0 |

| 2026-09-30 | M2 | M2-T1 | done: adapter Gemini sem segredo; lint/build e 116 unit PASS | commit M2-T1 após 7a3c343 |
