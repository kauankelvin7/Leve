# M5-T4 — Batch operations seguras

## Entrada e auditoria

Branch feat/gika-integration. Fetch executado antes de mudanças; local e origin em 1b09f5fb0d07388f8bf5d2ef8c5bf9eba0e089c4, worktree limpo, T3 done/T4 todo. AGENTS, estado/tasks/ExecPlan/decisões, evidências T2/T3, arquitetura, segurança e evals lidos integralmente. Plano de execução persistido em M5_T4_EXECPLAN.md antes da implementação. Superpowers indisponível; processo equivalente manual e revisões independentes conforme AGENTS. Humanizer-br local aplicado à copy.

A UI convencional usa activity.setStatus e activity.update em contentCommand, com expectedRevision, controle de conta/serviço/quota, transação e receipt por UID/operationId. Não existe batch genérico com atomicidade entre entidades. updateFuture divide série e recria IDs; não é seguro compor splits de séries sobre descritores irmãos. Consultas existentes são bounded e sinalizam partial. ADR020 registra a composição conservadora escolhida, sem novo writer, collection, outbox ou engine.

## Escopo implementado

- batch_complete e batch_reschedule: até 5 tarefas pendentes de um dia civil explicitamente solicitado, dentro de 366 dias do contexto. Título/exclusão exatos, trim/case; sem fuzzy, filtros inventados ou busca ilimitada. Exemplos: `Conclui as tarefas de hoje`; `Move as tarefas de hoje para amanhã exceto "Academia"`.
- Modelo propõe somente intenção strict. Servidor valida contra o pedido original, resolve integralmente os alvos autenticados, ordena IDs e cria operationIds filhos associados a UID/requestId/índice. Modelo não determina UID, IDs, revisões, receipts ou cardinalidade final. Calls iguais repetidas colapsam; tools mistas, desconhecidas ou campos extras são rejeitados.
- Zero matches, partial/saturação, mais de 5 alvos ou no-op em parte do conjunto não geram confirmação executável. Não truncar nem excluir no-ops/recorrentes silenciosamente. Seleção de tarefas não inclui eventos.
- Datas/horário usam parser civil, Temporal e domínio existentes. Mudança só de data preserva horário ou ausência, timezone e campos não solicitados. Não inventar horário; ambiguidades temporais exigem esclarecimento.
- Lote recorrente exige occurrence explícito no pedido; ausência de escopo esclarece. future/all recusados no lote, explicando que a rotina precisa de pedido individual. Suporte individual occurrence/future do M5-T3 permanece intacto. Não há escolha automática nem expansão de séries em batch.

## Confirmação, execução e recuperação

Signer existente M5-T2, propósito específico batch_confirmation: sela UID/requestId/hash do pedido/ação/lista ordenada integral/IDs/revisões/patches/scopes/cardinalidade/prazo 15 minutos. Alterar qualquer componente invalida o efeito. Índice fora da cardinalidade selada retorna rejeição explícita antes de escrever. Limite 16 KiB apenas para token batch; tokens individuais continuam 8 KiB. Fixture máxima de 5 itens Unicode/recorrência/UID128: token 8.401 bytes, resposta 14.335 bytes. Recovery recebe somente pedido original, sem ampliar parser Gika12KiB; commands usa limite existente.

UI lista todos os itens e before/after/escopo. Confirmar/cancelar/retomar são determinísticos, sem Gemini. Cancel antes do dispatch é terminal e não escreve. Depois do dispatch, fechar não promete rollback; mostra confirmação desconhecida e permite reconciliar os mesmos receipts ao reabrir. Reload não restaura conversa nem autoexecuta.

Cada item passa pelo mesmo command layer e transação convencional. Guard na transação lê plano/receipts e todos os alvos ainda pendentes, incluindo snapshots de recorrência. Se qualquer alvo ficou stale antes do primeiro commit, nada é aplicado. Corrida posterior pode produzir partial; não há atomicidade global nem rollback. Pare no primeiro conflito/falha/ack desconhecido, sem renovar revisão ou seleção. Orçamento conservador por item: até 24 leituras documentais, complete5 writes, reschedule até8 incluindo3 reminder jobs; até5 transações sequenciais. Quotas/controles/referências convencionais preservados.

Receipt existente armazena plano original integral e índice. Recovery lê no máximo5 receipts conhecidos, valida ownership/hash/ack/IDs/revisões e antecede provider. Replay de item comprometido retorna resultado original; não refaz efeito nem sobrescreve edição posterior. Selo expirado/rotação não autoriza irmãos pendentes. Mesmo pedido com payload divergente não vira nova intenção. Auth revalidada após esperas e em cada transação; logout/troca interrompe próximos envios. Unknown/5xx pode ter sido pós-commit e nunca é anunciado como ausência comprovada de escrita.

Resultado estruturado distingue requested/applied/alreadyApplied/conflicts/failed/pending/unknown, com itemização. Sucesso final só após todos os acks reais correspondentes. UI usa estados awaiting_confirmation/confirming/confirmed/cancelled/conflict/partial/failed, cardinalidade no botão, foco/teclado/aria e estilos existentes.

## Gates e primeiras tentativas

Lint, ambos typechecks, build e 480 unitários (50 arquivos) PASS. Audit produção omitdev/audit-levelhigh PASS/exit0, 0 critical/high/moderate. Signer17unit e integração focal31 PASS após correção de cardinalidade. Batch E2E13/13 PASS/exit0 (3,3min), incluindo lightdesktop/darkmobile360/390, cap5/Axe/foco/scroll/composer, tampering, stale, lostack e close póscommit/reopen. Integração completa final: 243 PASS/8 arquivos/exit0, incluindo Auth/Rules/commands/receipts/idempotência/create/complete/update/reschedule/Undo/policy/confirmation/recurrence/batch. Registro estruturado em evidence/m5-t4-gates.json. Nenhuma chamada Gemini live foi executada. Interpretação do modelo é fixture; Auth, Firestore, commands, receipts e acks são reais em emuladores com dados sintéticos.

Primeiras tentativas preservadas:

1. Unit completos: 452 PASS/1 FAIL na expectativa antiga da allowlist de tools. Teste atualizado explicitamente para incluir apenas as duas novas tools strict; não é baseline nem teste desabilitado.
2. Integração focal: 21 PASS/1 FAIL por fixture com status pending proibido pelo schema, que retornava422 antes do receipt. Fixture passou a usar patch temporal válido divergente para testar409; schema do produto não foi relaxado.
3. Teste direto de signer: 16 PASS/1 FAIL para índice4 em plano de2 itens. Escrita já era bloqueada, mas erro genérico; guard de cardinalidade agora rejeita explicitamente422. Novo caso de integração conserva tarefas/receipts intactos.
4. Primeira suíte ampla Gika: 64 PASS/11 FAIL, incluindo todos12 casos batch presentes nessa rodada PASS. As11 falhas antigas ocorreram em recorrência occurrence desktop/mobile e future lost ack; reschedule realack desktop/mobile, lost ack e precommit retry; update realack desktop/mobile, lost ack e conflito. Essa rodada não é declarada verde.
5. Ambiente sinalizou reinicialização durante comparação. Diff/SHA/logs sobreviveram e foram inspecionados sem reimplementar. Originais12/12 na entrada já tinham terminado; sondas tinham6 passagens observadas sem resultado final. Tentativa incompleta preservada; comparação concluída depois, sem aumentar deadlines.

Classificação: ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE, comprovada contra entrada1b09f5f. Originais12/12 PASS em cada cópia (incluem os11 casos falhos e conflito reschedule adicional); sondas7/7 PASS em cada cópia, byte-idênticas e temporárias. Holds10200ms reproduzem asserções configuradas10s e validam depois receipt/revisão/ack/replay/conflict; hold20200ms reproduz timeout20s da criação convencional antes de Gika. Dez traces aguardavam transporte de mutation ainda incompleto por10,1–10,4s; o conflito update aguardava edição convencional dentro da fixture respond. Status-1 indica request incompleto, não HTTP upstream. Criações convencionais anteriores HTTP200 levaram10,2–16,35s. Não foi observada rejeição HTTP de domínio nos requests ainda pendentes. Sondas provam o mecanismo nas duas versões, sem atribuir causa física à latência natural. A primeira rodada64/11 permanece não verde. Todas76 Gika únicas tiveram passagem observada (64 primeira rodada +11 originais recuperados +novo13ºbatch). Comparação sanitizada em evidence/m5-t4-transport-baseline.json. Check do shell na entrada e atual: 12 PASS/1 FAIL por color-contrast histórico. Não houve fix de contraste, timer, harness, CI ou deadline.

## Evidências e limites

Evals M5-E77..E109 em EVALS.md. Referências de escopo em evidence/m5-t4-reference-files.json: dependências, Rules, outbox, harness, componentes/bridges/testes anteriores permanecem byte-idênticos; prefixo do CSS anterior preservado. Apenas regras novas da lista de batch.

Screenshots sintéticos: evidence/m5-t4-batch-desktop-light.png, m5-t4-batch-mobile-dark.png e m5-t4-batch-max5-mobile360-dark.png. Lista completa cap5 é alcançável pelo scroll independente da conversa; composer permanece fixo, Axe/teclado/safe areas verificados pelos testes. Capturas históricas geradas pelos gates não fazem parte desta mudança.

Logs/traces/probes temporários não são versionados. Evidência sanitizada não contém tokens, headers, corpos privados ou credenciais. Nenhuma GEMINI_API_KEY, .env, dependência, coleção, writer, engine, persistência de conversa, undo genérico, batchfuture/all, M6, PR, deploy ou merge na main foi introduzido.

## Checkpoint

Implementação/testes/ADR020/evals/evidências/STATE/TASKS done compõem o commit funcional atômico. Checkpoint documental seguinte registra seu SHA real e a parada; backup autorizado somente desta branch após os commits, com comparação local/origin no encerramento. Parar para revisão antes de M6.
