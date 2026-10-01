# M5-T2 — Confirmation Contract + Preview

## Entrada e recuperação

Entrada/retomada confirmadas na feat/gika-integration, HEAD9c2c6fb474aa902820b815daa73108b0c38e5b7e. A queda environment_offline preservou todas as alterações não commitadas: contrato domain, signer, guard command, router/recovery, bridge/card e testes. Nenhuma reimplementação foi necessária. Inspeção inicial /workspace não era a raiz Git; repositório efetivo /workspace/Leve conferido antes de qualquer edição. E2E interrompido tinha apenas dois PASS e nunca foi declarado concluído.

## Revisão e resultado técnico

Diff exclusivo da confirmação de reschedule_task: policy/model/tools/Rules/dependências e regras temporais não alterados. Contrato strict server-derived ligado por HMAC a UID/requestId/textHash/descriptor/revisão/patch e validade15min. Summary é derivado do descriptor, não narrativa. Guard dentro da transação convencional após auth/receipt exato, antes de mutação. Mesmo command layer/receipts, sem writer/coleção/outbox/dedup paralelo. Recovery receipt-only reautoriza conta e nunca chama Gemini; cancelamento é local, terminal, sem escrita/receipt/revisão.

UI: before/after/horário e timezone; estados awaiting_confirmation/confirming/confirmed/cancelled/conflict/failed. Double submit protegido, loading desabilitado, foco/status/teclado e mobile/dark/Axe. Sucesso somente ack real; conflito não renova revision; falha transitória repete a operação original. Modelo fixture apenas; criação/conclusão/rename atuais preservados, nenhuma tool nova.

Auditor auxiliar somente leitura aprovou revisão estática final sem bloqueadores concretos. Revisão React/humanizer aplicada: execução no evento, cancelamento/abort e refs transitórias, labels/status explícitos, sem novo modal/IDs duplicados, texto curto e consequência clara. Escopo fechado ao M5-T2.

## Gates recuperados e retomados

- Logs preservados pré-queda: lint/dois typechecks/build PASS;343 unitários/43 arquivos PASS;172 integrações/6 arquivos PASS (53,32s), incluindo Auth/Rules/commands/receipts/create/complete/update/reschedule/Undo/policy. Focal reschedule33 PASS. Nenhuma alteração funcional após esses gates nesta retomada.
- Comparação executada novamente contra9c2c6fb: seis cenários de data/horário com e sem hora; applyReschedulePatch e envelope legacy idênticos. Artefato evidence/m5-t2-temporal-regression.json.
- npm audit --omit=dev --audit-level=high repetido após reconexão: exit0/found0;produção0critical/0high/0moderate. Audit completo dev-only histórico não alterado, docs/security/DEVELOPMENT_REMAINING.md continua válido; nenhum audit fix ou dependência alterada.
- Check preservado terminou12 shell PASS/1 FAIL exclusivamente color-contrast histórico em header > .eyebrow,4,38:1 vs4,5:1; build/typechecks/343unit PASS. Destinos demo/teste/tokens de contraste não alterados por T2; sem correção de contraste/timer/deadlines.
- Preparação inicial da retomada não executou testes: health probe127.0.0.1 não correspondia ao Vite localhost; runner efêmero corrigiu hostname apenas no ambiente. Servidor /entrar verificado via agent-browser: tela interativa, sem erros/overlay, screenshot local. Sem workaround de produto.

## Cobertura dos invariantes

- confirm gera preview estruturado; allow/clarify/deny/unknown/narrativa não concedem execução.
- Preview/cancel/reload sem command/receipt; resumo adulterado/unknown/action desconhecida recusados.
- UID/operation/textHash/entity/revision/patch/validade/signature vinculados; outro UID não recupera nem usa contrato.
- Duas confirmações concorrentes resultam applied+alreadyApplied, revisão única/receipt único. Retry sequencial/function call repetida/lost ack mantêm identidade; envelope divergente conflita e recovery só reconcilia receipt original.
- Expiração/rotação bloqueiam preview não comprometido; receipt exato comprometido mantém replay sem segunda mutação. Legacy receipt exato não autoriza nova operação sem selo.
- Conflito preserva edição; auth logout/troca de conta antes de dispatch/ack bloqueiam sucesso. Falha precommit não confirma, falha pós-commit recupera sem efeito adicional.
- Horário atual ou ausência preservados, explicit time/no-op/recorrência/partial continuam gates originais. Nenhum acesso direto model/router/bridge à persistência; command conventional continua único writer.
- EvalsM5-E22..E41 e regressões executáveis em gika-confirmation unit, gika-api-adapter/architecture unit, gika-reschedule integração/E2E e todas suites Gika existentes.

## Limites

ADR018: produção necessita chave compartilhada existente SCHEDULER_HMAC_SECRET; ausência falha apenas confirmação. Chave local demo/emulador aleatória somente memória; previews sem commit invalidam em restart/instância com outra chave, exigindo novo pedido explícito. Receipts originais comprometidos são autoridade e continuam replay. Selo garante integridade do efeito, não prova gesto físico de humano contra cliente autenticado adversarial. Token opaco não é segredo do provider, mas não é registrado em evidências/logs.

Conversa/card não persistem, reload não restaura/autoexecuta. Receipts antigos sem contrato não geram card novo executável. Nenhum Gemini live, segredo real, .env novo, billing, push/deploy/merge, batch/series/delete/Undo genérico/M5-T3 iniciado.

## Restrições do harness na retomada

A repetição opcional de npm test dentro do novo sandbox restrito terminou340PASS/3FAIL e2 erros: dois multipart probes HTTP local com listen EPERM e teste de subprocesso do guard sem stderr. Esses dois arquivos de teste e scripts/gika-smoke.mjs são byte-idênticos à entrada9c2c6fb. Sem modificar fonte/testes/deadlines, a execução autorizada fora da restrição de rede, com GEMINI_API_KEY removida, terminou343PASS/43arquivos/exit0. Não houve Gemini live: guard testa ausência de variável e encerra antes da rede. Lint/build (incluindo ambos TS) também foram repetidos e passaram. Não declarar a tentativa restrita verde nem classificá-la como baseline de produto: foi restrição de execução, demonstrada pelo EPERM e repetição original PASS.

Artefato evidence/m5-t2-scope-regression.json confirma arquivos de referência de dependências/Rules/provider/policies/parser/command-identity/API/outbox/tests convencionais byte-idênticos à entrada. Nenhum timer/contraste/upgrade paralelo.

## Resultado final dos E2E e comparação com entrada

Suíte Gika inteira:54PASS/2FAIL/14,4min/exit1. Todos12 reschedule/confirmation passaram (7 regressões M4+5 novos T2), com teclado/foco, Axe desktoplight/mobiledark, cancel0writes/receipt, falha precommit/retry original, tamper422, narrative sem grant e logout. Duas falhas restantes foram os originais rename lost ack e conflict: deadline10000ms, sem sucesso/conflito renderizado a tempo. Traces sanitizados em evidence/m5-t2-transport-observations.json preservam apenas paths de API/status/duração/monotonic, nenhum header/body/token/conteúdo privado.

Lost ack: criaçãoHTTP2008854,18ms; fixture respond2004,568ms; comando realHTTP2009754,676ms e abort da resposta ao cliente9888,761ms. Asserção636305,368→646320,595; transporte começou636348,578, consumindo praticamente o deadline. Conflict: criaçãoHTTP2009810,058ms; respond fixture e edição convencional ainda pendentes no término da asserção670694,956→680708,172; Gika sequer recebeu o descriptor nesse intervalo. Não atribuir uma causa específica de infraestrutura sem prova.

Comparação executada em cópia isolada integral do checkout9c2c6fb e na versão atual, em sequência/sem writers concorrentes: os dois testes originais PASS em ambas (entrada6,4s/10,5s; atual5,3s/10,2s). Sondas temporárias iguais injetaram10200ms de atraso e reproduziram expiração do deadline original10000ms em ambas; depois validaram applied→alreadyApplied sem segundo efeito e revisão/conflito preservando a edição posterior. Entrada4PASS/exit0/59,8s;atual4PASS/exit0/57,6s. Isso demonstra a classe ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE já existente contra a entrada, não uma correção/relaxamento do harness. A sonda é atraso controlado, não afirmação sobre a causa física da latência natural. Teste original/bridge update/API e políticas existentes preservados; novos executores reschedule não participam desses dois casos.

Todas56 situações Gika únicas tiveram passagem observada; a primeira suíte ampla permanece54/2, não verde. Sondas removidas antes do commit; deadlines/tests originais não alterados. Screenshots M1 gerados pelo gate restaurados; auth screenshots efêmeros não versionados. Logs locais /tmp/leve-m5t2-{resume-e2e,entry-repeat,current-repeat}.log; resumo persistente sanitizado nos artefatos.

## Entrega

M5-T2 done, M5 permanece parcial; M5-T3/T4 todo. Estado/tasks/evals/ADR018/arquitetura/segurança atualizados no commit atômico da implementação. Checkpoint SHA real e worktree limpo verificados após commit. Parar para revisão, sem live ou próximas etapas.
