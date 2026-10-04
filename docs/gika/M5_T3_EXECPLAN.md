# M5-T3 — recorrência com escopo explícito

## Entrada e autorização

feat/gika-integration, local e origin fc0b66972164e3cee73c6c9a65969ea2e61d3994, worktree limpo e fetch verificados antes de editar. Pedido atual autoriza exclusivamente M5-T3, gates, commits/checkpoint e backup remoto da mesma branch. M5-T4 não iniciado; sem Gemini live, deploy, main/visual ou dependências.

## Auditoria factual antes do código

Activity tem seriesId/occurrenceKey e revision; séries materializam 45 dias pelos helpers convencionais de content.ts e worker de reminders. IDs são derivados de UID/série/data. UI Today/Planner oferece occurrence e future, não toda a série histórica. activity.setStatus conclui só a ocorrência. activity.update preserva vínculo/revisões da ocorrência. activity.updateFuture divide a série na ocorrência escolhida, remove as futuras materializadas e cria uma nova série/IDs; não existe command de conclusão futura nem edição all. Undo Gika continua restrito à criação simples original.

O plano original 'series' deve representar capacidade real: occurrence e future (esta e as próximas), com all expressamente sem suporte. Não traduzir toda a série para future. Future é alteração da regra/template pelo writer convencional, não batch/M5-T4. Seu comportamento recria futuras pending e aplica o ActivityInput escolhido; membros editados/concluídos/cancelados devem impedir esse fluxo Gika para não apagar trabalho posterior.

Lacunas auditadas: updateFuture protege revision da ocorrência mas não state/template/materialização da série nem revisões das irmãs; consulta com limite silencioso; não replica todos controles/quotas/referências do genérico. Série revision não aumenta em split/materialização. Gika exige snapshot/digest canônico do contexto e conferência na mesma transação existente, limite com sentinel e orçamento de writes; nenhum segundo writer/engine. Campos privados nunca vão ao modelo ou card.

## Sequência de implementação

1. Contratos strict de escopo, candidato e escolha software-bound distintos de confirmação; validação da linguagem original + proposal + alvo real. Não recorrentes conservam M4. Completar future/all é unsupported sem mutar.
2. Inspeção read layer autenticada/bounded de série/ocorrência/futuras, hashes privados mínimos; policy determinística clarify/confirm/deny. Ausência de escopo não concede grant.
3. Escolha UI assinada pelo mesmo signer M5-T2, rota autenticada sem modelo, escopo/patch/revisions/snapshot no efeito da confirmação. Nenhuma renovação silenciosa ao escolher/confirmar.
4. Guard mínimo na transação convencional occurrence/future; hidratação patch-only do ActivityInput atual, receipts existentes/replay antes de expiração, controles e preconditions. Sem nova coleção/conversa/persistência.
5. UI card/chips, terminal após escolha/cancelamento, confirmação só após ack real; auth/logout/conta, foco/teclado/mobile/temas. Reload não restaura card nem executa.
6. Testes unit/integration/evals e E2E focal, regressões M4 e M5-T2, suite Gika. Auditoria paralela/ownership disjunto conforme AGENTS; somente root edita estado/documentação global.
7. Gates finais audit omitdev0 critical/high/moderate; lint/doisTS/build/unit/integration/E2E. Registrar primeiras falhas e comparar novidades contra fc0b669, sem alterar deadlines/CI/baselines.
8. Evidências, STATE/TASKS/EVALS e ADR apenas decisão nova; commit funcional atômico, checkpoint documental, push feat e SHA remoto/clean. Parar antes de M5-T4.

## Critérios e riscos

Sem escrita em preview/clarify/cancel/ambiguidade/partial/scope inválido. Exata entidade autenticada; template/irmãs intactas em occurrence. Future reutiliza semântica split convencional e nunca all, não aceita conjuntos saturados/alterados/inseguros. Seal liga escopo/alvo/patch/revisão/contexto e UID/operação/texto/validade; choice não é confirmation. Retry/lost ack/concurrency usam receipts atômicos existentes; nenhuma inferência do Gemini seleciona IDs/UID/op/revision. Sem novo undo/recurrence creation/delete/batch.

Baselines herdados: contraste do shell e deadline intermitente do transporte/harness, production audit0 e toolingdev14 divulgado. Qualquer falha nova exige prova comparativa, não classificação automática.

## Progresso

- Preflight e leitura/auditoria: concluídos antes de código.
- Contratos/implementação: concluídos, revisados; occurrence/future e prazo original preservados.
- Gates/evidências: concluídos conforme M5_T3_EVIDENCE.md (396unit/212integração/40focal/7E2E, broad56/7 + originais8/8 e sondas5/5 em ambas; check12/1 contraste comprovado; auditprodução0). Commit funcional/checkpoint documental e backup da mesma branch seguem, sem iniciar M5-T4.
