# Gika — estado persistente

## Estado atual

- Status global: `PAUSED_FOR_REVIEW`
- Milestones concluídos: `M0`, `M1`, `M2`; `M3` parcial, não done.
- Tarefas M3: `M3-T1` e `M3-T2` done; `M3-T3` todo e não iniciado.
- Tarefa ativa: nenhuma; parar após M3-T2, aguardando revisão/autorização para T3.
- Branch: `feat/gika-integration`; repositório `/workspace/Leve`, clone HTTPS https://github.com/kauankelvin7/Leve.git.
- Base M0: `f6b21b6695f4953e28daace00edb05b2dd4bfde1`.
- PRE M3-T2: `a9aff2f2009c36c23cc70ae380b642e12bc697a8`, SHA/branch/worktree limpo validados antes de qualquer alteração.
- Commit de tarefa M3-T2: este commit atômico de código/testes/docs/estado/tarefas; SHA real registrado no checkpoint documental posterior (sem auto-referência).
- Provas: docs/gika/M3_T2_EXECPLAN.md, M3_T2_EVIDENCE.md e evidence/m3-t2-baseline-*.json. ADR-GIKA-012 documenta extensão mínima dos receipts existentes; modelo não persiste, bridge único sendCommand/activity.create.
- Gates finais: lint/dois typechecks/build/184 unit em35 arquivos e64 integração em4 arquivos PASS.27 E2E Gika PASS na suíte completa;13 criação+read/fallback novamente PASS após última alteração e reinício API.5 Planner visual/4 convencionais/offline/7 sazonal PASS.58 locais46 PASS/12 FAIL baseline;check shell12 PASS/1 FAIL baseline;production audit13 vulnerabilidades baseline. Nenhum caso Gika falhou na execução completa/final.

## Próxima ação

1. Revisar M3-T2, evidências, ADR012 e checkpoint; conferir git status/SHA ao retomar.
2. Não iniciar M3-T3 automaticamente: autorização atual termina em M3-T2. Sem undo completo/complete/update/reschedule/delete/batch/recorrência por IA/M4+.
3. Próxima tarefa técnica é M3-T3, apenas depois de revisão/autorização explícita. Ler humanizer-br local oficial antes de textos de UI.
4. Não reutilizar credencial temporária M2. Smoke Gemini live de criação não executado sem credencial atual autorizada; fixtures/emuladores comprovam comandos/persistência/idempotência, não interpretação live.

## Contrato de M3-T2

UUID requestId criado pela UI também é operationId/entityId dentro do UID autenticado. Retry mantém UUID; nova intenção com conteúdo igual recebe UUID novo. Modelo não recebe/escolhe IDs/hash/receipt. Sem Map definitivo/segunda infraestrutura. Transação contentCommand existente grava tarefa+receipt+contadores atomicamente, devolve resultado original/alreadyApplied ou rejeita hash diferente.

Metadado opcional strict gika.requestTextHash vincula pedido ao ID, não dedup por conteúdo; receipt guarda apenas hash e snapshot task validado. Sem chat original. Envelope Gika canônico, expectedRevision0, sem timestamp volátil/dependsOn/outbox; comportamento convencional preservado. Retry recupera snapshot original sem modelo/memória e obtém ack real novamente. Auth/ownership mantidos; serviceControls restrito permite somente reconciliação concluída como command layer, novos pedidos bloqueados antes do modelo. Calls create_task iguais colapsadas após strict; diferentes/mistas continuam negadas.

## Bloqueios e limites

- Nenhum gate focal M3-T2 bloqueado; tarefa concluída. M3 permanece incompleto por T3/undo pendente. Sem credencial atual autorizada para smoke live M3.
- Regressão global não verde: mesmos12 casos baseline T1 (contraste completed e2 frequência Planner;9 harness design/persistent/refinements/session reproduzidos em92cc9c7). Arquivos convencionais/estilos/harness idênticos ao PREa9aff2f; prova em M3_T1_EVIDENCE.md e m3-t2-baseline-files.json. Offline foi regressão do dock M1 corrigida em M2-S0; passou de novo, não rotular como baseline/intermitência atual.
- Check shell:12 PASS/1 FAIL de contraste/timing demo, também FAIL no build/preview isoladoa9aff2f; rota que falha varia. Não apresentar como PASS.
- npm audit produção:13 vulnerabilidades(9 moderate/4 high), mesmo relatório em a9aff2f, package/lockfile inalterados. Não corrigir dependências fora do escopo nem usar audit fix/force; requer revisão própria.
- Receipts não têm TTL observado e são removidos ao excluir conta. Não apagar receipts para liberar retry. Snapshot é histórico, não estado atual de tarefa alterada depois; nenhuma execução de undo. Receipts T1 sem vínculo original não backfilled. Conversa/UI não é restaurada após reload; retransmissão técnica precisa conservar requestId, nunca inferi-lo do conteúdo. Downgrade T1 não é seguro para operações T2 em trânsito.
- Cancelar depois de dispatch não garante rollback; perda de resposta exige replay com o mesmo ID. Se nada foi persistido, retry usa contexto civil vigente. Gika continua sem outbox, agenda convencional conserva offline/outbox.
- NETWORK/ENV_PROXY_NOT_ENABLED histórico: configuração Codex Remote, não adapter/modelo. Chamadas externas exigiram proxy/egress no smoke M2; nenhum workaround de produção.
- 05-capacidade-e-revisao.md ausente; bundles baseline >500kB; handlers de série divergem em controles; useUserCollection mascara partial; batch genérico não existe e microphone=() bloqueia voz. Nenhum destes pontos expandido nesta tarefa.
- Superpowers indisponível, processo manual equivalente; humanizer-br oficial aplicada; nenhum subagente/dependência/coleção/Rules/chat persistido novo. Modelo gemini-3.5-flash-lite/medium e Free Tier/R$0 mantidos. Sem chave fictícia, segredo persistido, billing, fallback pago, push/deploy/merge.

## Checkpoint de retomada

Checkpoint documental posterior registra SHA real do commit atômico M3-T2 e worktree limpo. Conferir git log/diff: checkpoint posterior só contém documentação. Não há SHA auto-referente possível em arquivo versionado. T2 autorizado/concluído a partir de a9aff2f; parar antes de T3.

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

| 2026-10-01 | M2 | M2-SMOKE | done: diagnóstico NETWORK/ENV_PROXY_NOT_ENABLED; HTTP200 com proxy, smoke real E01/E02 PASS; M3 não iniciado | `c1c709d` |

| 2026-10-01 | M2 | fechamento final | done: causa Codex Remote documentada, gates finais PASS; M2/M2-SMOKE done, M3-T1 todo | checkpoint após c1c709d |

| 2026-10-01 | M3 parcial | M3-T1 | done: create_task pelo comando existente,175 unit/53 integração/25 E2E Gika PASS; baseline global classificado; parada para revisão antes de T2/T3 | `3fa05f0d447724e2ad41ad95e1482e3941c3a8de` |

| 2026-10-01 | M3 | M3-T2 | done: idempotência/recuperação via receipts atômicos; gates focais PASS, falhas baseline registradas; parar antes de T3 | commit desta tarefa após a9aff2f; SHA no checkpoint posterior |
