# Gika — estado persistente

## Estado atual

- Status global: `M4_T1_DONE_AWAITING_REVIEW`.
- M0/M1/M2/M3 concluídos. M4-T1 done, M4 parcial/in_progress; M4-T2/T3 todo, não iniciados.
- PRE `56b9308f8311fbd3e7e97a08530a366ede2b06c7`, branch feat/gika-integration, worktree limpo confirmado antes de editar. Fontes e evidências M3 relidas; M4_T1_EXECPLAN.md persistido antes do código.
- complete_task strict textual selector, resolução autenticada bounded, activity.setStatus convencional/revisão/receipts existentes, auth/policy/ack real. ADR014; nenhuma persistência paralela, undo/reopen/edição/lote/recorrência.
- Gates: lint/build/dois TS/218 unit/98 integração/38 E2E Gika PASS. Local69:58 PASS/11 FAIL subset baseline; check shell12 PASS/1 FAIL contraste demo; audit13 baseline. Evidências M4_T1_EVIDENCE.md/evidence/m4-t1-gates.json e23 arquivos idênticos à entrada. Timer/reflow passaram, pendências históricas preservadas.
- Dados/conta fictícios demo-leve, Auth/Firestore emulados. Nenhuma credencial/live nesta tarefa, produção/billing/push/deploy/merge não usados. Modelo estável gemini-3.5-flash-lite/medium preservado.

## Autorização atual

Pedido mais recente autoriza exclusivamente M4-T1 e supersede parada histórica antes de M4. Não reutilizar segredo nem executar Gemini live. Revisão manual equivalente e humanizer-br local oficial; auditor auxiliar somente leitura.

## Próxima ação

Revisar M4-T1 concluído e parar antes de M4-T2. Não iniciar T2 automaticamente. Smoke real M4 apenas após T1/T2/T3 revisados e nova autorização.

## Contratos preservados

Gika → Model Adapter → Tool Router → Validation → Policy → commandBridge/sendCommand → contentCommand existente. Modelo nunca acessa persistência nem escolhe UID/IDs. RequestId software por intenção/UID, receipt atômico/replay com snapshot privado; nova intenção igual continua permitida. UI só confirma ack validado. Undo software por UID/operation/entity/revision1/createdAt original→activity.trash convencional/revision2/soft-delete30dias; sem Gemini/purge/force-delete. ADR012/013 preservadas, nenhuma decisão arquitetural nova no smoke.

Complete_task: selector strict textual sem ID/UID do modelo, consulta de um dia default hoje civil ou explícito até366dias, resolução exata conservadora de todos estados/kinds, partial/ambígua impede mutação. activity.setStatus/expectedRevision/receipt existente, snapshot original/retry/alreadyApplied com ack real; no-op não persiste receipt. Conflito preserva edição e exige novo pedido. Sem reopen/undo genérico/timeEntry.stop; ADR014.

## Limites e pendências

- Gates globais não integralmente verdes:12 falhas históricas Planner/harness, shell contraste/timing e audit13(9 moderate/4 high) com prova executável isolada T1/T2/T3. check M4-T1 falhou no contraste demo2,86..3,30:1;11 falhas locais são subset das12 anteriores. Nenhuma mudança de estilos/harness/dependências; apenas guard opcional Gika no writer existente, fluxo convencional preservado. Não mascarar baseline.
- Timer PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE comprovadofc30bf9/T3 (gap-2,234px), passou nos38 Gika desta execução; passagem não corrige a pendência. Offline/dock M1 foi regressão corrigida M2-S0, distinta do timer atual; não chamar essa regressão de baseline.
- NETWORK / ENV_PROXY_NOT_ENABLED histórico: limitação Codex Remote; chamada externa exigiu proxy/egress herdado e NODE_USE_ENV_PROXY=1 exclusivamente no processo de smoke. Nenhum workaround no produto/TLS desabilitado.
- Smoke live prova um cenário create_task; erros/ambiguidades extensos seguem evals determinísticos, não provas live adicionais. Sem teste em aparelho físico/certificado de release.
- Conversa/card/undo não restaurados após reload; sem persistência nova de chat. Cancelar depois de dispatch não é rollback. Não apagar receipts; T1 sem vínculo não backfilled. Gika online/queuefalse, agenda convencional offline/outbox intacta.
- 05-capacidade-e-revisao.md ausente, Superpowers indisponível/processo manual equivalente. Warning chunks>500kB e MetadataLookupWarning403 emulador preexistentes/não impeditivos.

## Checkpoint

Último checkpoint de entrada `56b9308`; M3-SMOKE/fechamento M3 atômico `723d444295fafb08e7706b92a283bf3d1f2b0d0b`. M4-T1 concluído no commit atômico `c0de781413f00a00eeb3e498215f1f55db625ba7`, worktree limpo confirmado depois do commit. Este checkpoint documental posterior somente registra o SHA real, sem alteração funcional. M4-T2/T3 não iniciados; preservar histórico abaixo.

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

| 2026-10-01 | M3 parcial | M3-T3 | done: undo pelo activity.trash/receipts existente, auth/revisão/createdAt/ABA,194 unit/76 integração e6 focal PASS; global50/13 baseline demonstrado; parar antes de M3-SMOKE/M4 | `55b760ffa80a84070872e82a42a3d8f132f4141a` |

| 2026-10-01 | M3 | M3-SMOKE | PASS real HTTP200/create_task/receipt/persistência/UI/retry/undo; M3 done; parar antes de M4 | `723d444295fafb08e7706b92a283bf3d1f2b0d0b` |

| 2026-10-01 | M4 parcial | M4-T1 | done: conclusão única bounded via activity.setStatus/revisão/receipts existentes;218 unit/98 integração/38 E2E Gika PASS,global58/11 baseline;sem live;parar antes de T2 | `c0de781413f00a00eeb3e498215f1f55db625ba7` |
