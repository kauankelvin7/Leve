# Gika — estado persistente

## Estado atual

- Status global: `SECURITY_HARDENING_DONE_PENDING_INTEGRATION_REVIEW`.
- Branch de trabalho: `chore/security-hardening`, criada da entrada limpa `a922594699cd95e2bc6602bccc215f4a23e75f41`. Branch feat/gika-integration permanece nesse checkpoint, sem merge/push/deploy.
- M0/M1/M2/M3/M4 done; M5-T1 revisado/aprovado/done, M5 in_progress; M5-T2/T3/T4 e posteriores todo/não iniciados.
- DiceBear core/avataaars9.4.2→9.4.3, commit separado73e750c;325 unit/2 avatarE2E/lint/build/doisTS PASS, SVGs padrão idênticos/rotateinjection corrigido.
- Firebase12.19/Admin13.6/Firestore4.17.2/7.11.6/Gax4.6.1 preservados. Overrides limitados grpc1.14.5 e uuid11.1.1 nos consumidores auditados; clean install/tree válido,334 unit/166 integração/lint/build/doisTS PASS.53 E2E finais PASS (47+6), incluindo todas51 Gika e2avatar; nenhum FAIL novo.
- Produção audit omitdev13(4high/9moderate)→0; audit-levelhigh exit0. Audit completo28→14(6high/8moderate), todos14 dev-only preexistentes/mesmas versões/advisories, relatório explícito docs/security/DEVELOPMENT_REMAINING.md. CI não alterado; não declarar audit completo verde.
- Check shell12/1 contraste histórico3,66..4,17:1, sem fixes/deadlines alterados.152 arquivos produto/harness/CI byte-idênticos à entrada. Sem policy/tools/Rules/writer/UI/outbox/modelo alterados; sem Gemini live/segredo/.env/billing.

## Autorização atual

M5-T1 aprovado. Pedido posterior autoriza exclusivamente security dependency hardening na branch temporária chore/security-hardening a partir de a922594. Sem merge para feat/main, Gemini live, M5-T2 ou refactor de arquitetura/UI. Relatórios/inventário/risco/gates em docs/security/REPORT.md e GOOGLE_EVIDENCE.md.

## Próxima ação

Parar para revisão do hardening concluído antes de integrar chore/security-hardening em feat/gika-integration. Relatório docs/security/REPORT.md e gates.json; sem merge autorizado nesta tarefa. M5-T2 permanece todo, não iniciar automaticamente.

## Contratos preservados

Gika → Model Adapter → Tool Router → Validation → Policy → commandBridge/sendCommand → contentCommand existente. Modelo nunca acessa persistência nem escolhe UID/IDs. RequestId software por intenção/UID, receipt atômico/replay com snapshot privado; nova intenção igual continua permitida. UI só confirma ack validado. Undo software por UID/operation/entity/revision1/createdAt original→activity.trash convencional/revision2/soft-delete30dias; sem Gemini/purge/force-delete. ADR012/013 preservadas, nenhuma decisão arquitetural nova no smoke M3.

Complete_task: selector strict textual sem ID/UID do modelo, consulta de um dia default hoje civil ou explícito até366dias, resolução exata conservadora de todos estados/kinds, partial/ambígua impede mutação. activity.setStatus/expectedRevision/receipt existente, snapshot original/retry/alreadyApplied com ack real; no-op não persiste receipt. Conflito preserva edição e exige novo pedido. Sem reopen/undo genérico/timeEntry.stop; ADR014.

Update_task: apenas title como patch; data/horário/status/reminders/recorrência intactos. Completed/canceled editáveis conforme fluxo convencional. Receipt mínimo conserva descriptor antigo+patch, replay atômico após nome mudar, ID software por intenção/UID. No-op sem command; conflito sem refresh, exige novo pedido. ADR015.

Reschedule_task: selector de um dia default hoje ou explícito <=366dias, cap50/partial, igualdade trim/case sem fuzzy. Destino parser existente amanhã/+2/weekday incluindo hoje/absoluta; que vem/próxima/dia10 sem mês/ano pede esclarecimento. Horário explicitamente pedido ou preservado, timezone/disambiguation reais fora do modelo. No-op sem command/revision/receipt. Preview em memória não restaura reload; botão determinístico/auth/ack real, sem novo Gemini. gikaReschedule exclusivo apenas patch temporal em activity.update, moveScheduleToDate/ActivityInput dentro da transação convencional; receipt mínimo recupera alvo depois de mudar dia. Conflito sem refresh. T2 title-only preservado; sem Undo novo.

## Limites e pendências

- Hardening é isolado: 13 vulnerabilidades de produção antigas corrigidas nesta branch; feat/a922594 ainda não recebeu integração.14 restantes do audit completo são exclusivamente toolingdev preexistente, relatório antes/depois/advisories/cadeias/risco/motivo de adiamento explícitos. Ranges SDK~grpc1.9 e consumidoresuuid^9 foram ultrapassados conscientemente sob overrides exatos: testes comprovam APIs usadas/transportes emulados, não certificação de TLS/serviço Google live nem compatibilidade universal com usos futuros. Reavaliar overrides quando upstream corrigir ranges.

- M5-T1 amplo50/1: Undo lost ack aguardou transporte além do deadline10000ms existente. Original PASS na entrada156fe77 e atual; sonda10200ms após commit em ambas reproduz expiração e depois replay applied/alreadyApplied sem segundo efeito. ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE, sem causa infra adicional inferida. Novos módulos não são invocados nesse caso simulado, UI/command/harness idênticos à entrada. Check final shell12/1 contraste3,66..4,17:1 e audit13 baseline; sem fix/timeouts alterados. Startup Auth recusado e preview IPv6 vs harnessIPv4 registrados como tentativas ambientais, repetidos após prontidão/resolução somente processo; sonda temporária TS6133 removida antes do check final.
- M5-T1 só classifica: policies específicas continuam barreiras, decisões não são grants nem ack. Recorrência sem escopo esclarece; alto impacto/multi/bulk/destrutivo nega execução. Auditoria encontrou limitações históricas dos handlers de série (cap500/truncamento/receipt/auth), documentadas sem habilitar ou corrigir esse escopo. Preview reschedule em memória não é PendingAction server-side T2.

- Gates globais não integralmente verdes. M4-T3 completa67/15:11 casos históricos (dois tiveram deadline de creation antes de chegar à falha antiga), mais4 casos de deadline (rename lost/conflict, sync e manual). Todos classificados contra d233971 via APIs/UI isolados, originais e quatro sondas10200ms vs10000ms nas duas versões. Atual8/2 final (dois mesmos casos históricos calendar/navigation); todas51 Gika únicas observadas PASS. ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE, não regressão reschedule; causa infra mais específica não inferida. Check12/1 contraste demo3,59..4,17:1; audit13(9moderate/4high) e26 arquivos baseline byte-idênticos. Sem refactor/auditfix/timeouts originais alterados. m4-t3-gates/transport-baseline/baseline-files.json e M4_T3_EVIDENCE.md.

- Timer PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE comprovadofc30bf9/T3 (gap-2,234px), passou nos38 Gika desta execução; passagem não corrige a pendência. Offline/dock M1 foi regressão corrigida M2-S0, distinta do timer atual; não chamar essa regressão de baseline.
- NETWORK / ENV_PROXY_NOT_ENABLED histórico: limitação Codex Remote; chamada externa exigiu proxy/egress herdado e NODE_USE_ENV_PROXY=1 exclusivamente no processo de smoke. Nenhum workaround no produto/TLS desabilitado.
- Smokes live provam create_task e complete/update/reschedule timed+untimed; erros/ambiguidades extensos seguem evals determinísticos, não provas live adicionais. No M4 live, dueDate/dueTime/campos externos schedule foram assertados; timezone/disambiguation/instantes apoiam-se nas150 integrações. Harness futuro fortalecido sem repetir live, limitação explícita na evidência. Sem teste em aparelho físico/certificado de release.
- Conversa/card/undo não restaurados após reload; sem persistência nova de chat. Cancelar depois de dispatch não é rollback. Não apagar receipts; T1 sem vínculo não backfilled. Gika online/queuefalse, agenda convencional offline/outbox intacta.
- 05-capacidade-e-revisao.md ausente, Superpowers indisponível/processo manual equivalente. Warning chunks>500kB e MetadataLookupWarning403 emulador preexistentes/não impeditivos.

## Checkpoint

Entrada a922594 limpa na feat/gika-integration; chore/security-hardening criada desse SHA e isolada. DiceBear commit atômico `73e750c`. Firebase/Google/testes/evidências/estado/tarefas no segundo commit atômico desta tarefa; SHA real será registrado no checkpoint documental posterior, sem referência circular. Confirmar worktree limpo depois do commit. feat permanece a922594, sem merge. M5-T2 todo; parar para revisão antes de integrar branch temporária.

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

| 2026-10-01 | M5 parcial | M5-T1 | done: classifier strict puro/facts software/gates/replay/preview preservado;323 unit/166 integração/6 focal PASS,50/1 amplo classificado156;check12/1/audit13 baseline;sem live,parar antes T2 | `4561cf59db395ac4c10c58118890283a3e45ec1e` |
