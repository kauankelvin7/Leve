# Gika — estado persistente

## Estado atual

- Status global: `IN_PROGRESS`
- Milestones concluídos: `M0` e `M1` (shell/mock/refinement; limites da regressão ampliada abaixo)
- Milestone atual: `M2` (read-only; M1 visual aprovado pelo usuário)
- Tarefa atual: nenhuma em execução; M2-SMOKE blocked após execução real FAIL/GIKA_UNAVAILABLE; parada antes do M3
- Branch: `feat/gika-integration`
- Repositório: `/workspace/Leve`, clone HTTPS de https://github.com/kauankelvin7/Leve.git
- Base auditada: `f6b21b6695f4953e28daace00edb05b2dd4bfde1`
- Último SHA verificado / último commit de tarefa Gika: `f5484919b792e1d0ee6687627c614c231fd136aa` (checkpoint M2, worktree limpo no PRE M2-SMOKE)
- Worktree limpo no PRE M2-SMOKE; somente documentação/estado alterados nesta tarefa, sem mudanças de modelo ou produção
- Últimos gates: M2-T3 lint/build/typechecks, 134 unit, 42 integração, 8 E2E finais (6 API Gika + 2 Planner) PASS; mock14 PASS em T2. Planner: contraste e dois harness de recorrência baseline; regressão offline dock corrigida e sequência original PASS. Nenhuma intermitência sem classificação pendente.
- Commit desta tarefa: `docs(gika): checkpoint failed M2 smoke and stop before M3` (registra resultado real e mantém M2 aberto)

## Próxima ação

1. Ler .agent/skills/humanizer-br/SKILL.md antes de criar/revisar qualquer texto Gika; fonte oficial local autorizada pelo usuário (ADR-008).
2. Conferir AGENTS.md, estado, tarefas, ExecPlan, ADRs, git status e HEAD.
3. Autorização mais recente: somente smoke real com credencial temporária nesta tarefa e gates necessários; parar antes do M3. Smoke real executado FAIL/GIKA_UNAVAILABLE; não declarar M2 concluído.
4. Não reutilizar a credencial temporária. Não foi escrita em arquivo/env/log/commit; subprocesso encerrado. Nenhuma configuração financeira ou de modelo alterada.

## Bloqueios

- M2-SMOKE: execução real em 2026-10-01 retornou exit1 FAIL/GIKA_UNAVAILABLE. Primeira interpretação falhou; E02 não alcançado. Sem status HTTP/causa upstream observáveis pelo contrato sanitizado; não inferir credencial inválida, modelo inexistente ou quota. T1/T2/T3 seguem concluídas; somente smoke permanece bloqueado. Credencial de uso único descartada; não repetir requests nesta tarefa, não iniciar M3.

## Riscos e limitações

- 05-capacidade-e-revisao.md ausente: pendência documental não bloqueante; não inferir capacidade/billing a partir dele.

- Regressão Planner ampliada não integralmente verde: contraste completed 4,28:1 e dois testes sem expandir Mais opções são baseline (prova em M1_EVIDENCE.md). Offline era regressão do dock Gika, demonstrada por hit-test base/branch e corrigida: sequência original 2 PASS, nova proteção de dock 3 PASS. Ver M2_PREFLIGHT.md. Nenhum teste desabilitado; nenhuma correção de domínio/Planner fora do escopo.
- Bundles baseline >500 kB; nenhuma otimização fora de escopo. Ver M0_EVIDENCE.md.
- Handlers de série divergem em controles/limites da command layer genérica; revisão obrigatória antes de expor em M5.
- useUserCollection mascara partial; Gika não usará isso como prova de consulta completa.
- Batch transacional genérico não existe; gate M6. Header microphone=() bloqueia voz; gate M7.
- Superpowers indisponível; processo manual equivalente conforme AGENTS.md. Nenhum subagente utilizado.
- M1 mock em memória segue injetável; M2 produção usa API read-only; credencial temporária foi usada somente no smoke e não está disponível ao servidor. Limites Gika locais não equivalem a quota global entre instâncias. Não houve deploy, merge, push ou uso de credenciais de produção.

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

| 2026-09-30 | M2 | M2-T1 | done: adapter Gemini sem segredo; lint/build e 116 unit PASS | `a1334eb` |

| 2026-09-30 | M2 | M2-T2 | done: consultas autenticadas e contrato UI; gates offline PASS | `ac27289` |

| 2026-10-01 | M2 | M2-T3 | done: evals offline, autorização após espera, gates PASS e somente smoke real blocked | `fd0682d` |

| 2026-10-01 | M2 | M2-SMOKE | blocked: chave ausente; script executado exit2 sem rede, único bloqueio de M2 | `fd0682d` |

| 2026-10-01 | M2 | M2-SMOKE | FAIL/blocked: execução real exit1 GIKA_UNAVAILABLE; 15 testes focais PASS; sem retry/segredo persistido; M3 não iniciado | checkpoint após f548491 |
