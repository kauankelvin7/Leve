# Gika — estado persistente

## Estado atual

- Status global: `PAUSED_FOR_REVIEW`
- Milestones concluídos: M0/M1/M2; M3 parcial, não done.
- M3-T1/T2/T3 done; nenhuma tarefa ativa, M3-SMOKE blocked até revisão/autorização e credencial atual. M4 não iniciado.
- Branch feat/gika-integration; repositório /workspace/Leve, clone HTTPS https://github.com/kauankelvin7/Leve.git.
- PRE M3-T3: fc30bf9c51a7978cf2cb22280ddaa67d59b48f6d, SHA/branch/worktree limpo validados antes de alterar. Última tarefa T3 concluída neste commit atômico; SHA real no checkpoint documental posterior. T2 histórico56800b2f933e6d6ee0043856698bd6473eb13e37; entradafc30bf9.
- Provas T3: M3_T3_EXECPLAN.md/M3_T3_EVIDENCE.md, ADR013, evals e evidence/m3-t3-baseline-files.json. Lint/dois TS/build/194 unit e76 integração PASS. E2E completa63:50 PASS/13 FAIL (12 baseline anteriores + timer/dock preexistente demonstrado emfc30bf9);31 Gika PASS/1 FAIL timer. Focal final6/6 PASS (5 undo +timer).5 Planner visual/4 convencionais/offline/7 sazonal PASS. Check final build/dois TS/194 unit PASS, shell12/1 FAIL baseline; audit13 vuln baseline.

## Próxima ação autorizada

1. Revisar M3-T3/ADR013/evidências e checkpoint; validar git status/SHA ao retomar.
2. Parar após M3-T3 para revisão. Não executar Gemini live/M3-SMOKE nem iniciar M4. Smoke futuro deve cobrir linguagem natural → create_task → persistência → resultado e só então fechar M3.
3. Não reutilizar chave temporária M2, segredo ausente/sem nova autorização. humanizer-br oficial local é fonte de UI.

## Contrato T3

Gika creation ack → contexto software UID/operation/entity real/revision1 → botão determinístico → creationUndoBridge/sendCommand/activity.trash existente. ID undo UUIDv8 SHA256(namespace/UID/creationOperationId) independente de conteúdo/modelo. gikaUndo metadado strict, canonicalização e receipt de criação Gika validado na MESMA transação contentCommand, auth/membership/perfil/UID repetidos inclusive replay. Soft-delete30dias, revision2 e receipt existente; nenhuma coleção/endpoint/writer/outbox nova, purge/Gemini/tool undo ausentes.

Nunca renovar revisão para vencer conflito. Edição posterior causa REVISION_CONFLICT; já removida sem receipt undo dá GIKA_UNDO_ALREADY_REMOVED; replay do undo retorna ack histórico/alreadyApplied sem outro efeito, inclusive depois de restore convencional. createdAt deve igualar serverTime da criação para proteger ID reutilizado depois de purge convencional (ABA). UI só confirma ack validado e descarta saída ao mudar UID/cancelar; foco/live region revisados. Guard local evita double tap, transação dá garantia definitiva concorrente.

## Limites/bloqueios

- M3-SMOKE bloqueado deliberadamente até revisão/autorização; não declarar interpretação live create_task comprovada. T3 usa fixtures de modelo e Auth/Firestore/API emuladas reais. M3 permanece aberto após T3.
- Reload não restaura conversa/card/contexto; não persistir chat para oferecer undo após reload. Transporte com envelope original pode reconciliar receipt entre processos. Cancelar após dispatch não implica rollback. Não apagar receipts para liberar retry; conta removida apaga receipts segundo semântica existente, sem TTL novo.
- Receipts antigos T1 não vinculados não recebem backfill/undo. Gika online/queuefalse; agenda convencional mantém offline/outbox. Modelo gemini-3.5-flash-lite/medium e Free Tier/R$0 preservados, sem billing/fallback pago.
- Regressão global historicamente12 FAIL baseline locais (3 Planner:contraste completed e2 frequência;9 harness legados) e check shell12/1 contraste/timing demo, com prova executável isolada T1/T2 e23 arquivos byte-idênticos ao PRE T3. Não mascarar como PASS. Audit13 vuln(9 moderate/4 high) baseline, package/lockfile inalterados. Nesta sessão50/13 inclui adicionalmente a intermitência preexistente do timer: source e prova controlada emfc30bf9/T3 idênticas (gap-2,234px), documento m3-t3-timer-baseline.json. Não é regressão T3; é pendência de UI anterior, exige escopo próprio de correção. Não apresentar suíte integralmente verde.
- Offline/dock M1 era regressão corrigida M2-S0; gate convencional offline passou novamente T3. Não chamar essa regressão de baseline ou intermitência atual. Novo undo sem intermitência observada; dock/timer preexistente teve intermitência confirmada, distinta do offline.
- NETWORK/ENV_PROXY_NOT_ENABLED histórico é configuração Codex Remote; chamadas externas no M2 exigiram proxy/egress habilitado. Nenhum workaround no produto. Warning chunks>500kB preexistente/MetadataLookupWarning403 emuladores sem impedir testes.
- 05-capacidade-e-revisao.md ausente; Superpowers indisponível/processo manual equivalente. Sem dependência/Rules/chat persistido/subagente/segredo/billing/push/deploy/merge. Alterações fora do escopo convencional não autorizadas.

## Checkpoint

fc30bf9 é checkpoint de entrada T3. Tarefa T3 concluída e gates/evidências revisados para commit atômico. SHA real será registrado em checkpoint documental posterior após confirmar worktree limpo, sem SHA auto-referente em arquivo versionado.

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

| 2026-10-01 | M3 | M3-T2 | done: idempotência/recuperação via receipts atômicos; gates focais PASS, falhas baseline registradas; parar antes de T3 | `56800b2f933e6d6ee0043856698bd6473eb13e37` |

| 2026-10-01 | M3 parcial | M3-T3 | done: undo pelo activity.trash/receipts existente, auth/revisão/createdAt/ABA,194 unit/76 integração e6 focal PASS; global50/13 baseline demonstrado; parar antes de M3-SMOKE/M4 | commit atômico T3 neste checkpoint |
