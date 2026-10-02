# Gika — estado persistente

## Estado atual

- Status global: `M9_BLOCKED_CHARACTER_ASSET_REQUIRED`.
- Branch: `feat/gika-integration`; base responsiva aprovada `c840492d2f587f2222f9697fa5aecb5aac325ca6`, consolidada por fast-forward e publicada após verificar ancestralidade/worktree limpo/local=origin.
- M0–M5 done; `M5_READY_FOR_NEXT_PHASE` preservado. M6-T1 done (`e39cd6a`), M6-T2 done (`85e3ec9`), M6-T3 done; M6 concluído, gates finais aprovados. M7-T1 e M7-T2 done; M7 concluído, gates finais aprovados. M8-T1 e M8-T2 done; M8 concluído com gates finais aprovados. M9 blocked pelo asset real; T1/T2 done, T3 blocked visualmente, T4 regressão técnica aprovada e aceite RC blocked pelo mesmo requisito.
- Retomada Character sobre `e28da58`: referência aprovada versionada intacta e visual lock concluído. Rive CLI oficial `1.3.0` instalado fora do projeto; compilação/renderização RML local comprovadas. A ausência histórica da ferramenta não é mais o impedimento atual. `CHARACTER_ASSET_REQUIRED` permanece (master/rig da Gika não produzidos); `RIVE_ZERO_COST_PRODUCT_BLOCKER` registra exportação/publicação sem splash dependente de plano pago, com aceitação do splash Free ainda não autorizada.

## Hardening — resumo histórico

- DiceBear core/avataaars9.4.2→9.4.3, commit separado73e750c;325 unit/2 avatarE2E/lint/build/doisTS PASS, SVGs padrão idênticos/rotateinjection corrigido.
- Firebase12.19/Admin13.6/Firestore4.17.2/7.11.6/Gax4.6.1 preservados. Overrides limitados grpc1.14.5 e uuid11.1.1 nos consumidores auditados; clean install/tree válido,334 unit/166 integração/lint/build/doisTS PASS.53 E2E finais PASS (47+6), incluindo todas51 Gika e2avatar; nenhum FAIL novo.
- Produção audit omitdev13(4high/9moderate)→0; audit-levelhigh exit0. Audit completo28→14(6high/8moderate), todos14 dev-only preexistentes/mesmas versões/advisories, relatório explícito docs/security/DEVELOPMENT_REMAINING.md. CI não alterado; não declarar audit completo verde.
- Check shell12/1 contraste histórico3,66..4,17:1, sem fixes/deadlines alterados.152 arquivos produto/harness/CI byte-idênticos à entrada. Sem policy/tools/Rules/writer/UI/outbox/modelo alterados; sem Gemini live/segredo/.env/billing.

## Autorização atual

M8 aprovado; M9 sequencial autorizado sobre2e73b3ab4fbd72b04fc328dce60be7b928b32c77, local/origin/fetch limpos/exatos. Ponytail/full/Caveman/full/humanizer local. Character somente conforme asset real e fallback; nenhum TTS/live/serviço pago/PR/main/deploy/TQA/nova fase.

## Próxima ação

Retomar M9-T3 a partir de `docs/gika/character/GIKA_VISUAL_LOCK.md` e referência original. Resolver a decisão de runtime R$0/splash Free sem assinatura ou bypass; pergunta de aceitação enviada, nenhuma resposta presumida. A ferramenta local permite autoria, mas ainda faltam master fiel/fallbacks/rig reais; prova com exemplo oficial não é asset da Gika. Depois integrar e verificar estados/runtime/lazy/cleanup/reduced motion e gates finais de T3/T4. Os gates técnicos históricos permanecem registrados, sem alegar nova execução. Não substituir por CSS/SVG improvisado nem declarar Character/RC concluídos por fallback; nenhum novo milestone.

## M8 — conclusão

Entrada44b8928 local/origin/fetch limpa/exata; T1 commit571b6bfe9b3d685ca8295de14b66d0e24b99f14f. Regra local4–5 pending hoje sobre leitura existente completa, sem IA/IO/write; fingerprint/8dismissals em memória/currentToday/UID. UI panel/daily-brief nativa; opt-in somente draft, manualsend/M6/preview/confirmation/commands/receipts existentes. Offline hint sem fila/lazy/reconnectexec, rascunho/UID preservados. Cancel-lazy novo defeito reproduzido1FAIL e corrigido com invalidation/sequence; primeira pósfix1PASS. Gates finais audit0/lint/doisTS/build/533unit/7focal/37regressão/17shell/Axe PASS; primeira focal6PASS/primeira regressão37PASS preservadas. Integração server redundante não repetida (camada intocada), E2E real emuladores/fixtures sem live/credencial. UI desktoplight/mobiledark/200% revisada; sem CSS/dependência/query/persistência/Character/TTS novo. M8_EVIDENCE detalha limites e tentativas; parar para revisão, M9 todo.

## M5-CLOSURE-FINAL — fechamento atual

Entrada f5b969d1c134afe51496ee90773a401719c53ac7 local/origin/fetch limpa/exata. Primeiras execuções atuais: auditprodução0critical/high/moderate/lint/doisTS/build/480unit/243integração PASS; única suíte Gika76/76 PASS, nenhuma repetição/fixture/deadline/asserção/retry alterado. Admin13.10 confirmado/forge ausente. Revisão read-only Auth/commands/receipts/confirmation/recurrence/batch/offline sem defeito concreto atual; policy individual e gate batch estreito ADR020 qualificados, partial itemizado explícito.248fontes/config/manifest/lock idênticos; screenshots gerados restaurados. Só evidência/JSON/STATE/TASKS, commit documental e backup feat; verificar HEAD local=origin/worktree limpo ao encerrar. Primeiro closure M5_BLOCKED e R1/R2 anteriores preservados: R1 corrigiu segurança, R2 não reproduziu sete históricos, causa física não atribuída. Decisão atual M5_READY_FOR_NEXT_PHASE, m5_closure done; parar para revisão, M6 todo/não iniciado.

## M5-CLOSURE-R2 — estabilidade medida

Entrada6849f1fe3094e2296ea41f6c2277fad9d7524c5c local/origin limpa/exata após fetch. Primeira ampla76PASS/0FAIL preservada antes dos sete focais7PASS/0FAIL; depois gates padrão0audit/lint/doisTS/build/480unit/243integração PASS, ampla final76PASS/0FAIL e sete fresh finais7PASS/0FAIL. Sem rerun oculto/deadline/fixture/selector/assertion/retry alterado; cada focal com API/dev/emuladores demo novos, sem GEMINI_API_KEY. Backend HTTP máximo732ms inicial/832ms final, não duração do teste nem causa dos atrasos antigos. NOT_REPRODUCED_IN_R2 para os sete históricos; hipóteses membership-cache/tutorial-refresh não convertidas em fix, nenhum Auth enfraquecido.248arquivos fonte/config/manifest/lock byte-idênticos, screenshots gerados restaurados aos bytes de entrada. Somente evidência/JSON/STATE/TASKS no checkpoint documental, nenhuma ADR/feature/test-harness funcional. R2_PASS específico; closure final não reexecutado e histórico blocked preservado, aguardar revisão antes da etapa seguinte/M6. Push somente feat, confirmar HEAD local=origin e worktree limpo no encerramento.

## M5-CLOSURE-R1 — segurança direcionada concluída

Entrada local/origin/fetch5ca793e17f23f671833bdf7cebd793cc96107af3 limpa na feat. Upstream13.10 usa crypto.createPrivateKey no lugar de forge, exports públicos usados preservados/engines>=18/Node24; cert aceita RSA sintética e rejeita inválida nas duas versões sem segredo escrito/logado. Mudança funcional somente package.json/package-lock.json, pinAdmin13.6→13.10, GoogleAuth10.9.1/gaxios7.3.1 necessários; Firebaseclient12.19/Firestore7.11.6+4.17.2/Storage7.22/gax4.6.1/grpc1.14.5/uuid11.1.1/overrides preservados. Sem overrideforge/crypto manual/auditfix/upgrades14/produção/arquitetura.

Duas instalações limpas PASS (lock final preserva metadados libc que npm removeu de bindings não relacionados). Produçãoaudit high/JSON PASS0critical/high/moderate, forge ausente em TODA árvore. Lint/doisTS/build/243integração npmrunintegration PASS; unit inicial479/1 reproduzida na entrada por LOG_LEVELerror do runner, ambiente padrão480PASS sem mudar teste. E2E Gika56PASS na primeira execução por seis grupos serializados/fresh demo:12createUndo/6complete/6update/12rescheduleconfirmation/7recurrence/13batch. Authoriginal1FAIL strict selector Criarconta antes cadastro, reproduzido entrada13.6; suplemento /tmp comexacttrue/Pularguia e mesmos deadlines/asserções/fluxo PASS em13.6 e13.10. Primeira cópia13.10 symlinkdeps teve28font403 confirmadas Vitefsallow e falhou consolefinal; repetição cópiafísica igualbaseline PASS sem mudar Vite/produto. Não declarar bateria original Auth/Gika integralmente verde.282arquivos produto/harness byte-idênticos à entrada, nenhum segredo real/Gemini live/.env/PR/main/deploy/shell/Character Foundation/R2/M6. R1_PASS segurança direcionada; closure global blocked e histórico de falhas preservado, sem anunciar READY. Commit funcional isolado seguido de checkpoint documental/backup feat e verificação local/origin/worktree no encerramento.

## Checkpoint funcional R1

Commit funcional isolado verificado: `12c36521eeea7aa39fa1a7ccc7381c70a1b8dbe2`, parent5ca793e17f23f671833bdf7cebd793cc96107af3, somente package.json/package-lock.json. Todos os gates R1 e limitações estão na evidência específica. Checkpoint documental seguinte registra esse SHA sem alterar produto; audit final0/0/0. Backup remoto autorizado somente feat, igualdade HEAD local/origin e worktree limpo serão verificados no encerramento. Parar antes de R2/M6; closure global continua blocked.

## M5-CLOSURE — gate executado, bloqueado

Entrada local/origin/fetch `8a892504753d7624f50cf54f534ce7c38fde195a`, feat limpa, M5 done/M6 todo. Auditoria cruzada e duas revisões somente leitura: nenhum novo defeito de mutação demonstrado;284arquivos não documentais byte-idênticos, nenhum writer/collection/Rules/outbox/receipt engine/chat novo. Policy central de individuais/recorrência e gate batch estreito separado ADR020; não certificar classificador global único. Signer/purpose/snapshot/auth/revision/receipts/cap5/partial/recovery/ack preservados.

Lint/doisTS/build/480unit/243integração PASS. Primeira Gika76=56PASS/20FAIL, não verde. Comparação somente20 originais em cópia exata8a89250=13PASS/7FAIL; sete reproduzidas (confirmation precommit, cinco update, composer offline), nenhuma deadline/fixture relaxada.69únicas tiveram PASS observado, não76. Falhas restantes preexistentes à entrada mas não dispensadas; offline mostrou retorno à finalização de conta, causa raiz não fechada. Audit inicial/final FAIL0critical/2high/0moderate: firebase-admin13.6.0→node-forge1.4.0/GHSA-86w9-cpqp-85rv, registry atual com árvore intacta, sem upgrade/auditfix. Decisão M5_BLOCKED por segurança e gate E2E não aprovado, evidência docs/gika/M5_CLOSURE_EVIDENCE.md. Token fictício de emulador apareceu em inspeção parcial de log; coleta corrigida, nenhum segredo real/Gemini/header versionado. Screenshots históricos restaurados. Somente evidência/STATE/TASKS no commit documental; push feat e igualdade local/origin/worktree no encerramento. Sem M6/live/PR/main/deploy/shell/Character Foundation/dependência.

## M5-T4 — conclusão

Entrada1b09f5fb0d07388f8bf5d2ef8c5bf9eba0e089c4 local/origin limpa/exata/fetch verificada; T3 aprovado. M5_T4_EXECPLAN/EVIDENCE e ADR020: somente batch_complete/batch_reschedule, cap5 pending/um dia civil explícito, matching/exclusão exatos, nenhuma leitura parcial/truncamento/no-op silencioso. Plano integral server-owned selado UID/request/childops/IDs/revs/patch/scopes/count/15min; índice fora da lista rejeita422. Modelo não escolhe identidades/cardinalidade. occurrence explícito permitido no lote, semscope clarify; future/all lote recusados, T3 individual occurrence/future intacto. Mesmo activity.setStatus/update e receipts, guard transacional de todos pendentes antes de cada efeito; stale inicial0writes, corrida posterior partial explícito, sem promessa de atomicidade global/rollback. Recovery até5 receipts antes provider, mesmos envelopes/acks originais, nenhum refresh de revisão/seleção/validade. Botões confirm/cancel/retomar sem Gemini; auth fresca e sucesso só ack real. Close póscommit mostra desconhecido honesto e retoma receipts; reload não restaura nem autoexecuta. Sem writer/collection/engine/outbox novos.

Auditprodução0 critical/high/moderate; lint/doisTS/build/480unit PASS;243integração completas PASS;31batchintegração/13E2Ebatch finais PASS, teclado/Axe/lightdesktop/darkmobile360/390/cap5/scroll/composer. Amplo64PASS/11FAIL não verde;76Gika únicas observadas PASS. Classificação temporal comprovada contra1b09f5f:12originais e7sondas byte-idênticas PASS em cada cópia, delays10200/20200 reproduzem deadlines existentes antes de ack/receipt/replay/conflict corretos, sem inferir causa física. Check12/1 color-contrast histórico reproduzido na entrada; nenhum deadline/CI/timer/contraste alterado. Primeiras tentativas unit452/1 allowlist, integração21/1 fixture inválida e signer16/1 cardinalidade documentadas/corrigidas sem relaxar schema ou desabilitar testes; ambiente sinalizou restart durante comparação com6sondas observadas, diff preservado e rodada completa posterior registrada.29 referências byte-idênticas/CSS anterior intacto, screenshots históricos restaurados.

Evidências sanitizadas docs/gika/evidence/m5-t4-{gates,transport-baseline,reference-files}.json e screenshots sintéticos. Nenhuma credencial real/.env/Gemini live/dependência/PR/deploy/main/branch visual/M6. Commit funcional atômico e checkpoint documental registram SHA antes do backup autorizado somente feat; verificação local/origin/worktree no encerramento. Parar para revisão.

## M5-T3 — conclusão

Entrada local/origin fc0b669 limpa/exata verificada antes de código. Auditoria M5_T3_EXECPLAN/EVIDENCE e ADR019: domínio real occurrence/future; all e complete future não suportados. Resolução exata/civil/bounded, scope ausente clarify, choice software-bound distinta de confirmation, snapshot de série/alvo/futuras e revisão selados. Choice→preview herda prazo15min original, nenhum retry renova. Mesmo command activity.update/setStatus/updateFuture, mesmos helpers/receipt atômico, guard transacional conservador/sentinel50+1/budget450/controles/quotas/refs, sem writer/engine/coleção nova. UI terminal/foco/Axe/mobile/temas, nenhuma chamada Gemini nos botões, sucesso apenas ack real. Reload não restaura/autoexecuta; future divide série convencional e recria IDs, nunca all/batch genérico.

Auditprodução0critical/high/moderate; lint/doisTS/build/396unit PASS;212integração completas PASS;40integração/7E2E recorrência finais PASS. Amplo56PASS/7FAIL não verde: todos63 únicos tiveram passagem observada, originais8/8 e sondas5/5 em cada cópia fc0b669/atual. ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE comprovado, sem inferir causa física ou alterar deadlines; logout antigo falhou na criação convencional antes de Gika. Check12/1 contraste header.eyebrow reproduzido na entrada; IPv4 só no processo. Tentativas de desenvolvimento/sandbox/fixture429 explícitas na evidência, corrigidas antes dos gates finais.25 referências de dependências/Rules/harness/CSS/API/bridge e testes antigos byte-idênticas. Sondas/raw traces somente /tmp, nenhum segredo real/.env/Gemini live/PR/deploy/main/visual/dependência/M5-T4.

Evidências sanitizadas docs/gika/evidence/m5-t3-*.json e M5_T3_EVIDENCE.md; gates/estado/tasks juntos no commit funcional, checkpoint documental registra SHA real antes do backup autorizado desta mesma branch. Parar para revisão antes de M5-T4.

## M5-T2 — conclusão e retomada após queda

Entrada/retomada9c2c6fb474aa902820b815daa73108b0c38e5b7e na feat/gika-integration; diff preservado e revisado, sem reimplementar. M5_T2_EXECPLAN/EVIDENCE e ADR018: contrato strict policy confirm/action/summary derivados no servidor e selo UID/op/textHash/alvo/revisão/patch/validade15min. Guard na mesma transação activity.update/receipt; recovery somente receipt privado comprometido, sem Gemini/resolução nova. Cancel local terminal sem command/receipt/revision; UI estados/foco/teclado/ack real, conflito sem refresh, lost ack/retry/concurrency idempotentes.

Lint/doisTS/build/343unit/172integração/auditprodução0 PASS;12 focal reschedule/confirmation PASS. Amplo54PASS/2 timeouts de rename: originais2PASS e sondas10200ms vs deadline10000ms2PASS em cada versão9c2c6fb/atual, replay e conflito corretos. Todas56 Gika únicas observadas PASS; não declarar ampla integralmente verde. Check12PASS/1 contraste histórico4,38 vs4,5; tentativa unit no sandbox340/3 e EPERM repetida fora da restrição343PASS sem mudar testes.6 cenários temporais antes/depois idênticos,18 arquivos referência de escopo idênticos. Evidências sanitizadas em docs/gika/evidence/m5-t2-*.json; sondas removidas, screenshots históricos restaurados.

Produção necessita SCHEDULER_HMAC_SECRET existente compartilhado/server-only, ausência falha apenas confirmação. Preview local não comprometido pode invalidar após restart/rotação; sem renovação automática. Receipt exato comprometido conserva replay, legacy sem contrato não cria novo card. Conversa/card não restauram reload. Nenhum segredo real/.env/Gemini live/billing/deploy/push/merge/dependência/batch/series/Undo genérico/M5-T3.

## Verificação pós-integração — 2026-10-01

- Pré-condições: feat exata a922594; hardening exata8300c2b; merge-base/ancestral a922594; nenhuma alteração local nem commit posterior em feat. `git checkout feat/gika-integration` e `git merge --ff-only chore/security-hardening` executados; HEAD8300c2b confirmado imediatamente após fast-forward, sem squash/rebase/merge commit.
- `npm audit --omit=dev --audit-level=high`: PASS/exit0, found 0 vulnerabilities; produção 0 critical/0 high/0 moderate. Dependências não modificadas novamente; audit completo dev-only histórico permanece divulgado no relatório do hardening.
- `npm run lint`, `npm run typecheck` (cliente/servidor), `npm run build`: PASS/exit0. `npm test`:334 PASS/42 arquivos.
- Auth/Firestore locais disponíveis antes dos testes. `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 FIRESTORE_EMULATOR_HOST=localhost:8080 npm run test:integration:inside`:166 PASS/6 arquivos/exit0, incluindo Rules/Auth/commands/receipts/idempotência/create/complete/update/reschedule/Undo/policy M5-T1. Apenas contas e dados fictícios.
- `NODE_OPTIONS=--dns-result-order=ipv4first npm run check`: exit1 exclusivamente contraste histórico no shell (3,59..4,17:1 vs4,5:1);12 E2E PASS/1 FAIL, build/dois TS/334 unit PASS. Resolução IPv4 apenas no processo remoto, sem mudança de produto/harness.
- `LEVE_LOCAL_URL=http://localhost:5174 npm run test:e2e:local -- tests/e2e-local/gika.spec.ts tests/e2e-local/gika-create.spec.ts tests/e2e-local/gika-complete.spec.ts tests/e2e-local/gika-update.spec.ts tests/e2e-local/gika-reschedule.spec.ts tests/e2e-local/gika-readonly.spec.ts tests/e2e-local/avatar-security.spec.ts`:52 PASS/1 timeout em13,2min. Repetição original isolada de gika-update `--grep 'later conventional edit conflicts'`:1 PASS/exit0 (7,3s de teste). Todas53 únicas observadas PASS, não declarar primeira suíte verde.
- Evidência sanitizada do timeout: criação HTTP200 em10038,079ms; edição convencional HTTP200 em9804,088ms; respond fixture HTTP200 em9978,162ms; comando Gika HTTP409 em17,752ms. Asserção começou monotonic602744,872 e terminou612755,722;409 iniciou612680,311. Transporte consumiu quase todo deadline10000ms, sem aviso renderizado dentro da espera; conflito real preservado. Código/harness byte-idênticos ao hardening aprovado8300c2b e teste idêntico à entradaa922594; classe de intermitência temporal já comprovada contra02fe03e em M4_T2_EVIDENCE.md. Repetição sem ajustes PASS; nenhuma regressão funcional nova demonstrada, sem atribuir causa de rede mais específica nem alterar deadlines.
- Logs locais sanitizados em /tmp/leve-post-hardening-{audit,lint,typecheck,build,unit,integration,check,e2e,conflict-retry}.log; medidas acima preservadas neste registro. Browser de /entrar verificou tela interativa sem erros. Screenshots gerados pelos gates restaurados/removidos, sem alterações visuais versionadas.
- Processo local sem GEMINI_API_KEY; nenhuma chamada Gemini live, credencial persistida/logada, deploy/push/main merge ou tarefa M5-T2. Apenas este arquivo e GIKA_TASKS.yaml mudam no checkpoint documental posterior ao fast-forward.

## Contratos preservados

Gika → Model Adapter → Tool Router → Validation → Policy → commandBridge/sendCommand → contentCommand existente. Modelo nunca acessa persistência nem escolhe UID/IDs. RequestId software por intenção/UID, receipt atômico/replay com snapshot privado; nova intenção igual continua permitida. UI só confirma ack validado. Undo software por UID/operation/entity/revision1/createdAt original→activity.trash convencional/revision2/soft-delete30dias; sem Gemini/purge/force-delete. ADR012/013 preservadas, nenhuma decisão arquitetural nova no smoke M3.

Complete_task: selector strict textual sem ID/UID do modelo, consulta de um dia default hoje civil ou explícito até366dias, resolução exata conservadora de todos estados/kinds, partial/ambígua impede mutação. activity.setStatus/expectedRevision/receipt existente, snapshot original/retry/alreadyApplied com ack real; no-op não persiste receipt. Conflito preserva edição e exige novo pedido. Sem reopen/undo genérico/timeEntry.stop; ADR014.

Update_task: apenas title como patch; data/horário/status/reminders/recorrência intactos. Completed/canceled editáveis conforme fluxo convencional. Receipt mínimo conserva descriptor antigo+patch, replay atômico após nome mudar, ID software por intenção/UID. No-op sem command; conflito sem refresh, exige novo pedido. ADR015.

Reschedule_task: selector de um dia default hoje ou explícito <=366dias, cap50/partial, igualdade trim/case sem fuzzy. Destino parser existente amanhã/+2/weekday incluindo hoje/absoluta; que vem/próxima/dia10 sem mês/ano pede esclarecimento. Horário explicitamente pedido ou preservado, timezone/disambiguation reais fora do modelo. No-op sem command/revision/receipt. Preview em memória não restaura reload; botão determinístico/auth/ack real, sem novo Gemini. gikaReschedule exclusivo apenas patch temporal em activity.update, moveScheduleToDate/ActivityInput dentro da transação convencional; receipt mínimo recupera alvo depois de mudar dia. Conflito sem refresh. T2 title-only preservado; sem Undo novo.

## Limites e pendências

- Hardening integrado em feat/gika-integration por fast-forward8300c2b: 13 vulnerabilidades de produção antigas corrigidas.14 restantes do audit completo são exclusivamente toolingdev preexistente, relatório antes/depois/advisories/cadeias/risco/motivo de adiamento explícitos. Ranges SDK~grpc1.9 e consumidoresuuid^9 foram ultrapassados conscientemente sob overrides exatos: testes comprovam APIs usadas/transportes emulados, não certificação de TLS/serviço Google live nem compatibilidade universal com usos futuros. Reavaliar overrides quando upstream corrigir ranges.

- M5-T1 amplo50/1: Undo lost ack aguardou transporte além do deadline10000ms existente. Original PASS na entrada156fe77 e atual; sonda10200ms após commit em ambas reproduz expiração e depois replay applied/alreadyApplied sem segundo efeito. ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE, sem causa infra adicional inferida. Novos módulos não são invocados nesse caso simulado, UI/command/harness idênticos à entrada. Check final shell12/1 contraste3,66..4,17:1 e audit13 baseline; sem fix/timeouts alterados. Startup Auth recusado e preview IPv6 vs harnessIPv4 registrados como tentativas ambientais, repetidos após prontidão/resolução somente processo; sonda temporária TS6133 removida antes do check final.
- M5-T1 só classifica: policies específicas continuam barreiras, decisões não são grants nem ack. Recorrência sem escopo esclarece; alto impacto/multi/bulk/destrutivo nega execução. Auditoria encontrou limitações históricas dos handlers de série (cap500/truncamento/receipt/auth), documentadas sem habilitar ou corrigir esse escopo. Preview reschedule em memória não é PendingAction server-side T2.

- Gates globais não integralmente verdes. M4-T3 completa67/15:11 casos históricos (dois tiveram deadline de creation antes de chegar à falha antiga), mais4 casos de deadline (rename lost/conflict, sync e manual). Todos classificados contra d233971 via APIs/UI isolados, originais e quatro sondas10200ms vs10000ms nas duas versões. Atual8/2 final (dois mesmos casos históricos calendar/navigation); todas51 Gika únicas observadas PASS. ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE, não regressão reschedule; causa infra mais específica não inferida. Check12/1 contraste demo3,59..4,17:1; audit13(9moderate/4high) e26 arquivos baseline byte-idênticos. Sem refactor/auditfix/timeouts originais alterados. m4-t3-gates/transport-baseline/baseline-files.json e M4_T3_EVIDENCE.md.

- Timer PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE comprovadofc30bf9/T3 (gap-2,234px), passou nos38 Gika desta execução; passagem não corrige a pendência. Offline/dock M1 foi regressão corrigida M2-S0, distinta do timer atual; não chamar essa regressão de baseline.
- NETWORK / ENV_PROXY_NOT_ENABLED histórico: limitação Codex Remote; chamada externa exigiu proxy/egress herdado e NODE_USE_ENV_PROXY=1 exclusivamente no processo de smoke. Nenhum workaround no produto/TLS desabilitado.
- Smokes live provam create_task e complete/update/reschedule timed+untimed; erros/ambiguidades extensos seguem evals determinísticos, não provas live adicionais. No M4 live, dueDate/dueTime/campos externos schedule foram assertados; timezone/disambiguation/instantes apoiam-se nas150 integrações. Harness futuro fortalecido sem repetir live, limitação explícita na evidência. Sem teste em aparelho físico/certificado de release.
- Conversa/card/undo não restaurados após reload; sem persistência nova de chat. Cancelar depois de dispatch não é rollback. Não apagar receipts; T1 sem vínculo não backfilled. Gika online/queuefalse, agenda convencional offline/outbox intacta.
- 05-capacidade-e-revisao.md ausente, Superpowers indisponível/processo manual equivalente. Warning chunks>500kB e MetadataLookupWarning403 emulador preexistentes/não impeditivos.

## Checkpoint M5-T2

Commit atômico M5-T2: `9e130c52a2cd211881576f08ff93d9d932d43564` na feat/gika-integration, entrada9c2c6fb. Implementação/testes/ADR018/evals/evidências e STATE/TASKS done juntos; worktree limpo confirmado após commit. Checkpoint documental seguinte registra este SHA sem mudança funcional. Parar para revisão; M5-T3 todo/não iniciado.

## Checkpoint hardening (histórico)

Entrada feat/a922594 e hardening/8300c2b limpas/exatas; ancestralidade confirmada. Fast-forward aprovado executado; feat HEAD `8300c2b48408ba12664573ee92c1402b5aafd82f` confirmado antes do registro documental. Commits DiceBear73e750c e Googlee8c07be preservados sem squash. Checkpoint posterior contém somente GIKA_STATE.md/GIKA_TASKS.yaml com integração/gates; SHA final e worktree limpo devem ser confirmados após esse commit. M5-T2 todo, parar para revisão; main/visual/chore intactas.

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

| 2026-10-01 | Security isolado | DiceBear | done: core/avataaars9.4.3,325unit/2avatarE2E/gates PASS,auditprod13→12 | `73e750c866b620bb6a44147ecebf2b42d5e51b18` |
| 2026-10-01 | Security isolado | Firebase/Google | done: grpc1.14.5/uuid11.1.1 scoped/clean install/tree,334unit/166integração/53E2E/gates PASS,auditprod0;14dev preexistentes explícitos;parar antes de integrar/T2 | `e8c07be3218cb583fffb5af38e7a8beb10c95851` |

| 2026-10-01 | M5 parcial | M5-T2 | done: contrato/preview selado e recovery receipt-only;343unit/172integração/12focal PASS,56Gika únicos observados PASS,amplo54/2 comparado9c;check12/1/auditprod0;parar antes de T3 | `9e130c52a2cd211881576f08ff93d9d932d43564` |

## Checkpoint M5-T3

Commit funcional atômico verificado: `8fe12469d9b5d3751109d79d5beafe4449f07aa6` na feat/gika-integration, parent fc0b669. Worktree limpo confirmado após commit. Este checkpoint documental registra o SHA real sem alteração de produto/gates; backup autorizado somente desta branch e igualdade local/remoto devem ser conferidos após push. M5-T3 done; status M5_T3_DONE_STOP_BEFORE_M5_T4; M5-T4 todo/não iniciado, aguardar revisão.

## Checkpoint M5-T4

Commit funcional atômico verificado: `dd2a6e88f9c25e87241187886d6264f4c13375fe` na feat/gika-integration, parent1b09f5fb0d07388f8bf5d2ef8c5bf9eba0e089c4. Implementação/testes/evals/ADR020/evidências e STATE/TASKS done juntos; worktree limpo confirmado após commit. Este checkpoint documental registra o SHA real, sem mudança de produto ou gates. Backup remoto autorizado somente desta branch depois deste checkpoint; igualdade HEAD local/origin e worktree limpo devem ser conferidos após o push e reportados no encerramento. M5-T4 done/M5 done; M6-T1/T2/T3 todo/não iniciados. Parar para revisão, sem PR/main/deploy/Gemini live.

## M6 — autorização e retomada atual

Integração responsiva aprovada consolidada por fast-forward696e0e5→c840492, publicada e local/origin iguais/worktree limpo. Pedido atual autorizou T1→T2→T3 sequenciais, sem aprovação intermediária. Tarefas concluídas; M7/Character/TQA fora de escopo.

Registro histórico M6-T1 concluído: contexto diário mínimo/cap5/slots sem identidade, schema strict, releitura/revisões após upstream e sugestão estruturada sem comando. Lint/doisTS/build/501unit PASS. Provas HTTP fixture e minimização em gika-organization.test.ts; UI usa card existente. Próxima ação autorizada: M6-T2 sem pausa entre tarefas. Gates completos de UI/emuladores ao consolidar fluxo executável; nenhum live.

Registro histórico M6-T2 concluído sobre e39cd6a: mesma confirmação batch selando proposta/preservados/diff, writer/receipts convencionais, executor sequencial e resultados parciais existentes. Horário sugerido é alteração explícita no preview; remoção de horário não suportada pelo patch atual. Editar novo pedido cancela prévia antiga. Lint/doisTS/build/502unit/250integração/8E2E organização + Axe mobile-dark PASS; primeira focal6/1 por seletor novo documentada. Próxima tarefa autorizada M6-T3.


## M6 — conclusão

T3 reutiliza get_week/civil week do perfil, mesmo schema/validator/planner/batch cap5 e confirmation selada; até7dias, somente pendentes datadas de hoje em diante. Explicit occurrence mantém irmã/template; future/all na composição negados. Modelo recebe dados mínimos/slots, sem IDs/UID/revisões/notas. Releitura integral e auth precedem preview, guard revalida pendentes/preservados, writer/receipt/ack convencionais são únicos. Sugestão de horário é diff explícito; não remove horário. Offline bloqueia confirmar/retomar/envio entre itens, conserva cancel/draft/acks e não autoexecuta reconexão. Sem promessa transacional global/Undo universal/persistência nova.

Gates finais reais: auditprodução high/JSON0total (0critical/high/moderate), lint/doisTS/build PASS,508unit PASS,252integração PASS,86Gika PASS em13,6min,17shell/responsive PASS em46,7s; Axe mobile-dark/desktop-light da prévia e superfícies shell0. Integração final repetida após fortalecer fixture semanal com duas datas reais distintas/revisões+replay:252PASS, lint/doisTS PASS; sem alterar produto. Primeira ampla85/85 preservada; depois correção mínima de confirmação offline + dois unit/um E2E. Primeira falha T3 unit502/1 por malformed retornando503 corrigida para422; typecheck/seletor T2 históricos preservados em M6_EVIDENCE. Nenhuma deadline/retry/assertion relaxada ou falha omitida.

Base responsiva c840492 preservada, sem CSS/shell/Today/Auth/membership/Rules/commandLayer/outbox/dependências alterados. Guard arquitetural existente ampliado; nenhum novo writer/collection/signer/receipt engine/planner paralelo. Screenshots históricos gerados restaurados. Sem GEMINI_API_KEY/Gemini live/produção/billing/PR/main/deploy/M7/Character/TQA. Limitação: interpretação Gemini real do M6 não provada; provider fixtures + domínio/auth/persistência/receipts reais emulados. Evidência/evals/ADR021 e TASKS atualizados; parar após checkpoint/backup para revisão.


## Checkpoint M6

Commit funcional T3 `430b892917317e0b73563631f527dde01e73588d`, parent85e3ec95b6c1ce7925edfe28eecab29945fb1d2a, feat/gika-integration; worktree limpo confirmado após commit. T1/T2/T3 atômicos concluídos sobre c840492, todos os gates atuais aprovados. Este checkpoint documental registra o SHA real sem mudar produto/testes. Backup autorizado somente feat, verificar HEAD local=origin e worktree limpo após push. M7 todo; parar para revisão.


## M7-T1 — input de voz

SpeechRecognition/webkit nativas, pt-BR/final-only/uma captação por gesto. Somente onDraft; envio textual manual já existente é único caminho da Gika. Não captura blobs/getUserMedia/MediaRecorder, áudio não vai ao Gemini e não tem storage/log/histórico novo. Cancel/unmount/conta keyed/offline fecham captação e ignoram eventos atrasados; draft anterior preservado, texto reconhecido anexado sem truncar/autoenviar. UI acessível no composer, disponível/ouvindo/processando/denied/unsupported; header microphone=(self), câmera/geolocalização negadas. Reconhecimento pode ser remoto pelo navegador, sem promessa on-device/offline/produção/dispositivo real.

Lint/doisTS/build/522unit/252integração/5E2E focal/Axe/auditprodução0 PASS. Primeiro typecheck falhou por override de mock no fixture; corrigida tipagem sem mudar asserção/produto, primeira tentativa preservada em M7_EVIDENCE. GikaM1 teste atualiza apenas navegação de foco para botão agora disponível e label de voz; sem timeout/assertion de domínio relaxados. T2 autorizado automaticamente.

Checkpoint T1 funcional3724aef27b86c2c40ca43e3d7557bcf67f9a6e23 verificado com worktree limpo após commit; T2 iniciado sem autorização intermediária conforme pedido.

## M7 — conclusão

Entrada25eecb0 local/origin/fetch limpa, avanço sequencial T1→T2 autorizado. T1 funcional3724aef27b86c2c40ca43e3d7557bcf67f9a6e23; reconhecimento nativo pt-BR somente draft revisável, gesture/cancel/fallback/cleanup/UID/offline, microfone self sem origins terceiros. T2 evals/unit14novos/E2E7novos de fronteira, sem parser/router/writer/persistência adicional ou autoenvio. Native browser pode usar serviço remoto; sem alegação local/offline, áudio não enviado ao Gemini/logado/armazenado pelo Leve.

Gates finais0audit/lint/doisTS/build/522unit/252integração/37E2Eselecionados/17shellresponsive/Axe PASS. Primeiros TS2416fixture, ampla36/1selector, segunda36/1zoom e focal8/1zoom preservados em M7_EVIDENCE; corrigidos sem prazo/retry/assertion enfraquecido. Focalzoom1PASS antes da ampla final37PASS. Copy curta/status inicial sem redundância preservam privacidade visível e reflow200%; screenshots sintéticos inspecionados, históricos restaurados. Backend/domain/Auth/Rules/dependências byte-idênticos à entrada. T2 não repete integração T1 nem todas as mutações como versões faladas: nova fronteira apenas UI/texto. Hardware/permissão/serviço real/Safari/Firefox/Edge físicos/header remoto não comprovados; presença APIChrome151 e configuração self apenas. Sem Gemini live/deploy/PR/main/M8. Commits semânticos e checkpoint documental, push somente feat; conferir igualdade local/origin/clean no fechamento.

## Checkpoint M7

T1 funcional3724aef27b86c2c40ca43e3d7557bcf67f9a6e23; T2 funcional `9da054e79839e1970aaea0665bb0cdf92f8192ff`, gates aprovados e worktree limpo verificado após commit. Checkpoint documental seguinte registra conclusão sem alteração de produto/testes. Origin ainda25eecb0 após fetch antes do backup; push somente feat/gika-integration e igualdade HEAD local/remoto/clean verificados no encerramento. M7 done; parar para revisão, M8 todo.

## Checkpoint M8

T1: `571b6bfe9b3d685ca8295de14b66d0e24b99f14f`. T2 funcional: `4799b833daeb37a4c2af4b1f810c9976434c5d81`; worktree limpo após commit, critérios/gates documentados. Este checkpoint é somente documental; publicar feat/gika-integration e verificar HEAD local/origin/ls-remote iguais/worktree limpo no encerramento. M8 done, M9 todo; aguardar revisão.

## M9-T3 — acabamento técnico e bloqueio visual

Contraste de tarefas concluídas/controles avatar tablet/datas inteiras a200% corrigidos no CSS dono. Baselines de fixture frequência/tutorial/view inicial/calendário e serialização de cor documentados, sem alterar produto para seletores; navegação semântica evita saturação do dev browser. Design focal final1PASS, lint/doisTS/build/537unit PASS; inspeção60superfícies/20Axe0, GC/memória warm20+20 sem aumento DOM/listeners, chunks lazy preservados. docs/gika/M9_EVIDENCE.md preserva todas as primeiras falhas/comparações/métricas e limites. Sem editor/CLI authoring Rive/rig/avatar reais: CHARACTER_ASSET_REQUIRED; nenhum desenho improvisado/runtime/controller sem consumidor. T3 blocked, continuar T4 independente por autorização explícita; M9 não concluído visualmente.


## M9 — correção focal do guia

O cenário refinements atualizado reproduziu o target ausente no calendário Semana, também na entrada2e73b3a com fixtures atuais. Tutorial agora destaca o painel ativo Mês/Semana/Dia, sem alterar calendário/domínio. Regressão existente mantém destaque real, cor escolhida/reload/mobile/lixeira/Axe; focal5/5 e convencional final20/20 PASS. T3 continua blocked pelo asset real; T4 segue no checkpoint final dos gates, sem RC_READY.


## M9-T4 — regressão técnica verificada

Verify canônico primeira execução PASS: audit0/lint/AST/doisTS/build/537unit/252integração/8critical. Regresso Gika100/100 fresh, Planner/design13/13, convencional20/20 e shell17/17 PASS; primeiras falhas/baselines e ajustes semânticos/Date-only em M9_EVIDENCE. Nenhum timer/command/policy/Rules/modelo/persistência/dependência alterado para fixtures.98arquivos protegidos byte-idênticos à entrada; screenshots gerados restaurados/removidos. Funcional guia546ec5f; commit de test/harness separado, depois checkpoint documental do bloqueio visual.


## Checkpoint M9 — gates técnicos e bloqueio visual

T1 d63ce2e; T2 146bb4a; T3 técnico98c7497; harness a0cf7d4; guia546ec5f; fixtures f617340. Este checkpoint é documental: M9_BLOCKED_CHARACTER_ASSET_REQUIRED; T3/T4 blocked somente pelo asset/rig e aceite visual correspondente, com regressão independente PASS. Não declarar M9_DONE_RC_READY. Publicar somente feat/gika-integration e conferir HEAD local=origin/worktree limpo no encerramento. Nenhum novo milestone/closure/TQA/main/PR/deploy/live/TTS.

## Retomada Character — referência e Rive oficial

Entrada `e28da58ca6c619d774efb5687ec04aedd6e4c5d5`, local/origin/fetch iguais e worktree limpo antes de alterações. Pedido GIKA_RIVE_PRODUCTION_TO_RC + `46737.jpg` supersede a limitação histórica de autoria: CLI oficial1.3.0 executa após biblioteca Debian verificada/extract fora do projeto. Exemplo oficial em `/tmp` verificou/compilou/renderizou dois frames distintos; não foi integrado nem apresentado como Gika. Referência JPEG1280×960/223809bytes/hash preservados e visual lock com mecha anatômica esquerda (viewer direita), rosto/cabelo/roupa/motion/privacidade congelados. Fontes oficiais pricing/CLI confirmam splash Free e publicação limpa em Cadet+; unsigned local sem scripts não prova autorização de exportação comercial sem splash. Nenhuma conta, publicação Rive, assinatura, runtime React ou dependência do Leve adicionada. Detalhes e primeiras falhas em M9_EVIDENCE. M9/T3/T4 continuam blocked; decisão de splash pendente, asset/rig da Gika ausentes. Somente referência/documentação/estado nesta retomada; regressão técnica histórica não reexecutada por não haver mudança de produto.
