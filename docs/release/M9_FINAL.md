# M9 — gate final aprovado

Decisão: **M9_DONE_RC_READY / GIKA_V1_FACIAL_APPROVED**.

Entrada: `2fc1663503a609db286dde6971f719bb1b13102f`, feat/gika-integration, fetch/local=origin/worktree limpo confirmados. Aprovação humana facial em1a7287d; reconciliação emcb91205; correção de teste em337789b. M9_FROZEN_BASE_SHA: `b0e7bae753ec93374a3ebe3ec2b1a5ac07298046`. Branch Liquid Glass criada exatamente desse checkpoint, antes de qualquer alteração Glass.

## Gates executados fresh

| Gate | Resultado |
|---|---|
| npm audit --omit=dev --audit-level=moderate + JSON | PASS,0critical/0high/0moderate |
| lint + AST boundaries | PASS,47fontes guardadas |
| Web/server typechecks + build | PASS |
| Unit completos | 545/545 PASS,55arquivos |
| Integração Auth/Rules/commands/receipts/revisions/confirmation/recurrence/batch/organization | 252/252 PASS,8arquivos |
| Gika interface/readonly/voz/organization/Character/launcher | 43/43 PASS |
| Gika proatividade, processo isolado | 7/7 PASS |
| Gika mutações create/Undo/complete/update/reschedule/confirmation/recurrence/batch | Inicial55/56; reschedule+Character pós-correção17/17 PASS |
| Planner/design/Axe/teclado/offline/matriz6viewports | 13/13 PASS |
| Jornadas convencionais, cinco processos/emuladores novos | 20/20 PASS (avatar2,persistent8,refinements1,seasonal7,session2) |
| Shell production preview | 17/17 PASS |
| PWA production preview/offline/isolation | SWativo,cache16entradas,entrada recarregada offline,playground não renderizado |

106cenários Gika únicos verificados:7proatividade+43interface+56mutações.106 inclui o launcher focal existente, além dos105 históricos; nenhum teste adicionado para aumentar quantidade. Não declarar a primeira rodada de mutações integralmente verde.

## Primeira falha e causa

Mobile reschedule falhou aos16,2s no preview, esperando `rest` em reduced motion e observando `clarify`. Nenhum command havia sido confirmado. Código e teste eram idênticos à entrada; `a67261c` já preservava expressão estática equivalente, conforme o contrato aprovado. Teste obsoleto corrigido em337789b: mantém clarify→thinking→success, exige ausência de canvas em reduced, fallback visual success→idle e ACK real. Todas as asserções de efeito/revision/idempotência/policy continuam; seletores, fixtures, timeouts e retries inalterados. Primeira pós-correção17/17,lint/typechecks PASS. Artefatos originais preservados localmente; somente classificação sanitizada versionada.

## Invariantes e limites

Revisão somente leitura: UID/autorização atuais, membership/Rules privadas, expectedRevision, receipts canônicos/replay, selos purpose-separated/expiração, recurrence occurrence/future/all unsupported, batchcap5/partial itemizado, contexto organization mínimo e offline draft-only preservados. Modelo não escolhe identidades/persistência; bridge continua chamando command layer. Nenhuma credencial real, chave Gemini, VITE privada ou dado pessoal usado/versionado.

Gika facial humana aprovada; success depende de ACK e usa sorriso idle/master. AssetRive/controller/contratos intactos; welcome único, header compacto, fallback/reduced/cleanup/Axe passaram. FULL_BODY_CHARACTER_RIG_DEFERRED e RIG_READY_MASTER_ART_SOURCE_BLOCKED_IS_NOT_RELEASE_BLOCKER; nenhuma assinatura/export pago exigido.

Build mantém warning de chunks>500KB; não houve limiar alterado ou refactor cosmético. Emuladores emitiram warning de metadata403 sem falha de teste. AppCheck continua adiado, limiter do provider permanece instance-local, batch não promete atomicidade global. Axe/Chromium não certificam leitor de tela manual, Safari, aparelho fraco ou push em dispositivo físico. Nenhum Gemini live, deploy, main merge ou serviço pago.

Próximo passo já autorizado: Liquid Glass em branch isolada, depois regressão absoluta e RC/UAT consolidado. Este documento não declara FINAL_RC_READY_FOR_MAIN_MERGE antecipadamente. Logs brutos/trace locais não são publicação de evidência sanitizada.
