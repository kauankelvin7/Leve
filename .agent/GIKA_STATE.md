# Gika — estado persistente

## Estado atual

- Status global: `M4_DONE_STOP_BEFORE_M5`.
- M0/M1/M2/M3/M4 done; M4-T1/T2/T3 revisados e M4-SMOKE real PASS. M5 não iniciado.
- Entrada cfd96c3c6507a9134f643dfae58d007b3d67727d, feat/gika-integration/worktree limpo antes de editar; fontes e evidências relidas, M4_SMOKE_EXECPLAN.md antes da execução.
- Quatro chamadas Gemini reais HTTP200 complete_task/update_task/reschedule_task timed+untimed. Validation/resolution/policy→commands convencionais→receipt/persistência real emulada→ack/UI, retry applied→alreadyApplied sem upstream extra, preview antes do move/nenhuma escrita até confirmar/double tap, time19:00/null preservado, vizinhos/UID intactos. Só conta/dados fictícios demo-leve.
- Gates finais lint/build/dois TS/295 unit/150 integração/25 E2E PASS. check12/1 contraste demo e audit13 baseline;26 arquivos baseline byte-idênticos. Produção/arquitetura/modelo/Rules/outbox/dependências inalterados.
- Credencial temporária somente stdin sem echo/memória servidor GEMINI_API_KEY; removida/processo encerrado antes dos gates. Nenhum segredo/.env/produção/billing/push/deploy/merge. Proxy/egress herdado/NODE_USE_ENV_PROXY=1 somente smoke Codex Remote, sem workaround no produto.

## Autorização atual

Pedido mais recente aprovou M4-T3 e autorizou exclusivamente M4-SMOKE a partir de cfd96c3. Trabalho concluído; parar antes de M5. Humanizer-br oficial, Superpowers indisponível/processo manual equivalente, auditor auxiliar read-only. Evidências M4_SMOKE_EVIDENCE.md/m4-smoke.json/m4-smoke-gates.json.

## Próxima ação

Aguardar revisão do fechamento M4 e autorização específica para M5-T1. M5-T1 todo, dependência M4-SMOKE done; não iniciar automaticamente nem repetir Gemini live.

## Contratos preservados

Gika → Model Adapter → Tool Router → Validation → Policy → commandBridge/sendCommand → contentCommand existente. Modelo nunca acessa persistência nem escolhe UID/IDs. RequestId software por intenção/UID, receipt atômico/replay com snapshot privado; nova intenção igual continua permitida. UI só confirma ack validado. Undo software por UID/operation/entity/revision1/createdAt original→activity.trash convencional/revision2/soft-delete30dias; sem Gemini/purge/force-delete. ADR012/013 preservadas, nenhuma decisão arquitetural nova no smoke M3.

Complete_task: selector strict textual sem ID/UID do modelo, consulta de um dia default hoje civil ou explícito até366dias, resolução exata conservadora de todos estados/kinds, partial/ambígua impede mutação. activity.setStatus/expectedRevision/receipt existente, snapshot original/retry/alreadyApplied com ack real; no-op não persiste receipt. Conflito preserva edição e exige novo pedido. Sem reopen/undo genérico/timeEntry.stop; ADR014.

Update_task: apenas title como patch; data/horário/status/reminders/recorrência intactos. Completed/canceled editáveis conforme fluxo convencional. Receipt mínimo conserva descriptor antigo+patch, replay atômico após nome mudar, ID software por intenção/UID. No-op sem command; conflito sem refresh, exige novo pedido. ADR015.

Reschedule_task: selector de um dia default hoje ou explícito <=366dias, cap50/partial, igualdade trim/case sem fuzzy. Destino parser existente amanhã/+2/weekday incluindo hoje/absoluta; que vem/próxima/dia10 sem mês/ano pede esclarecimento. Horário explicitamente pedido ou preservado, timezone/disambiguation reais fora do modelo. No-op sem command/revision/receipt. Preview em memória não restaura reload; botão determinístico/auth/ack real, sem novo Gemini. gikaReschedule exclusivo apenas patch temporal em activity.update, moveScheduleToDate/ActivityInput dentro da transação convencional; receipt mínimo recupera alvo depois de mudar dia. Conflito sem refresh. T2 title-only preservado; sem Undo novo.

## Limites e pendências

- Gates globais não integralmente verdes. M4-T3 completa67/15:11 casos históricos (dois tiveram deadline de creation antes de chegar à falha antiga), mais4 casos de deadline (rename lost/conflict, sync e manual). Todos classificados contra d233971 via APIs/UI isolados, originais e quatro sondas10200ms vs10000ms nas duas versões. Atual8/2 final (dois mesmos casos históricos calendar/navigation); todas51 Gika únicas observadas PASS. ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE, não regressão reschedule; causa infra mais específica não inferida. Check12/1 contraste demo3,59..4,17:1; audit13(9moderate/4high) e26 arquivos baseline byte-idênticos. Sem refactor/auditfix/timeouts originais alterados. m4-t3-gates/transport-baseline/baseline-files.json e M4_T3_EVIDENCE.md.

- Timer PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE comprovadofc30bf9/T3 (gap-2,234px), passou nos38 Gika desta execução; passagem não corrige a pendência. Offline/dock M1 foi regressão corrigida M2-S0, distinta do timer atual; não chamar essa regressão de baseline.
- NETWORK / ENV_PROXY_NOT_ENABLED histórico: limitação Codex Remote; chamada externa exigiu proxy/egress herdado e NODE_USE_ENV_PROXY=1 exclusivamente no processo de smoke. Nenhum workaround no produto/TLS desabilitado.
- Smokes live provam create_task e complete/update/reschedule timed+untimed; erros/ambiguidades extensos seguem evals determinísticos, não provas live adicionais. No M4 live, dueDate/dueTime/campos externos schedule foram assertados; timezone/disambiguation/instantes apoiam-se nas150 integrações. Harness futuro fortalecido sem repetir live, limitação explícita na evidência. Sem teste em aparelho físico/certificado de release.
- Conversa/card/undo não restaurados após reload; sem persistência nova de chat. Cancelar depois de dispatch não é rollback. Não apagar receipts; T1 sem vínculo não backfilled. Gika online/queuefalse, agenda convencional offline/outbox intacta.
- 05-capacidade-e-revisao.md ausente, Superpowers indisponível/processo manual equivalente. Warning chunks>500kB e MetadataLookupWarning403 emulador preexistentes/não impeditivos.

## Checkpoint

Entrada cfd96c3 limpa. M4-SMOKE/fechamento M4 em commit atômico de harness/plano/evidências/evals/estado/tarefas; SHA real no checkpoint documental posterior. Produção inalterada, M5 não iniciado. Worktree será confirmado vazio após o commit.

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

| 2026-10-01 | M4 parcial | M4-T2 | done: patch title-only via activity.update/receipt/revision existentes;262 unit/123 integração/10 E2E finais PASS,global62/13 causas comparadas02fe;sem live,parar antes de T3 | `ededc2090887c181f6f463d92cda934a9cd6d16a` |

| 2026-10-01 | M4 parcial | M4-T3 | done: reschedule temporal strict/preview/command convencional/revisão/receipt;295 unit/150 integração/7 focal PASS;global67/15 classificado contra d233971, comparação atual8/2;sem live,parar antes M4-SMOKE/M5 | `f774d9c9b1466683e418be8b59f83615eb9495e7` |
