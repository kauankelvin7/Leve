# Gika — estado persistente

## Estado atual

- Status global: `PAUSED_BEFORE_M4`
- Milestones concluídos: M0/M1/M2/M3. M3-T1/T2/T3/M3-SMOKE done; nenhuma tarefa ativa; M4 não iniciado.
- Branch feat/gika-integration, /workspace/Leve. PRE smoke abbd1e2cbdcb7650782f41ef494e005eb6ec007f e worktree limpo confirmados antes de editar. T3 aprovado pelo usuário e smoke exclusivamente autorizado com chave temporária atual.
- M3_SMOKE_EXECPLAN.md/M3_SMOKE_EVIDENCE.md/evidence/m3-smoke.json: Gemini real gemini-3.5-flash-lite/medium HTTP200, somente create_task, título Teste Gika M3/data civil2026-10-02 America/Sao_Paulo; uma criação real, ID/receipt/persistência/UI correspondentes. Ack perdido depois do commit não mostrou sucesso; retry mesmo ID→alreadyApplied/mesma entidade, nenhuma duplicação ou segunda chamada Gemini. Undo opcional activity.trash real→ack→soft-delete somente alvo/revision2; zero Gemini adicional.
- Gates finais: lint/build/dois TS/194 unit/76 integração/32 E2E Gika PASS (12 create/undo,6 read/fallback,14 mock, incl timer/mobile/dark/Axe). check build/dois TS/unit PASS e shell12 PASS/1 FAIL baseline; audit13 vulnerabilidades baseline, sem nova dependência.
- Conta/dados fictícios demo-leve em Auth/Firestore emulados. Credencial somente stdin sem echo/env servidor em memória, processo temporário encerrado; nenhuma chave em arquivo/.env/VITE/log/evidência/commit. Gates sem segredo, fallback missing-env real comprovado. Sem billing/push/deploy/merge ou código de produção alterado.

## Próxima ação

Parar antes de M4-T1/complete_task. Revisar checkpoint/evidências; só iniciar tarefa futura mediante autorização explícita. Nenhuma credencial permanece configurada; não reutilizar chave temporária desta sessão/M2 em tarefa posterior.

## Contratos preservados

Gika → Model Adapter → Tool Router → Validation → Policy → commandBridge/sendCommand → contentCommand existente. Modelo nunca acessa persistência nem escolhe UID/IDs. RequestId software por intenção/UID, receipt atômico/replay com snapshot privado; nova intenção igual continua permitida. UI só confirma ack validado. Undo software por UID/operation/entity/revision1/createdAt original→activity.trash convencional/revision2/soft-delete30dias; sem Gemini/purge/force-delete. ADR012/013 preservadas, nenhuma decisão arquitetural nova no smoke.

## Limites e pendências

- Gates globais não integralmente verdes:12 falhas históricas Planner/harness, shell contraste/timing e audit13(9 moderate/4 high) com prova executável isolada T1/T2/T3. check desta sessão falhou no contraste demo Notas2,86/3,14:1. Nenhuma mudança no código convencional/dependências; não mascarar baseline.
- Timer PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE comprovadofc30bf9/T3 (gap-2,234px), passou nesta focal32; passagem não corrige a pendência. Offline/dock M1 foi regressão corrigida M2-S0, distinta do timer atual; não chamar essa regressão de baseline.
- NETWORK / ENV_PROXY_NOT_ENABLED histórico: limitação Codex Remote; chamada externa exigiu proxy/egress herdado e NODE_USE_ENV_PROXY=1 exclusivamente no processo de smoke. Nenhum workaround no produto/TLS desabilitado.
- Smoke live prova um cenário create_task; erros/ambiguidades extensos seguem evals determinísticos, não provas live adicionais. Sem teste em aparelho físico/certificado de release.
- Conversa/card/undo não restaurados após reload; sem persistência nova de chat. Cancelar depois de dispatch não é rollback. Não apagar receipts; T1 sem vínculo não backfilled. Gika online/queuefalse, agenda convencional offline/outbox intacta.
- 05-capacidade-e-revisao.md ausente, Superpowers indisponível/processo manual equivalente. Warning chunks>500kB e MetadataLookupWarning403 emulador preexistentes/não impeditivos.

## Checkpoint

M3-SMOKE e fechamento M3 no commit atômico `723d444295fafb08e7706b92a283bf3d1f2b0d0b`, worktree limpo confirmado após o commit. Este checkpoint documental posterior registra o SHA real sem alteração funcional. PREabbd1e2/T3 atômico55b760ffa80a84070872e82a42a3d8f132f4141a preservados no histórico. M4 não iniciado.

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
