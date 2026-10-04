# ADR-GIKA-020 — Composição bounded de comandos, sem atomicidade global

## Contexto

M5-T4 foi autorizado sobre1b09f5f após aprovação T3. O domínio tem transação por comando e recibo atômico privado por UID/operação, mas nenhum batch transacional genérico. updateFuture é um split específico da série que recria IDs; compor splits invalidaria descritores irmãos. Consultas podem ser parciais/saturadas; modelo não determina IDs/revisões/ownership ou cardinalidade real.

## Decisão

Registrar apenas batch_complete e batch_reschedule, no máximo5 tarefas pendentes de um dia civil explicitamente pedido, dentro de366dias do contexto. Títulos/exclusões exatos (trim/case, sem fuzzy); sem categoria/prioridade/duração, create/rename/delete em lote ou histórico ilimitado. Seleção vazia, parcial/saturada, acima do limite ou contendo no-op impede prévia executável; não truncar nem remover no-ops silenciosamente. Eventos não pertencem ao seletor explícito 'tarefas'; tarefas recorrentes não são omitidas. Recorrência exige occurrence explícito no pedido. future/all recusados no lote; suporte individual occurrence/future permanece intacto.

Plano integral ordenado pelo ID real, UUIDs filhos derivados software de namespace+UID+requestId+índice, nunca conteúdo. Novo propósito batch_confirmation no signer existente protege UID/request/hash original/lista/revisões/patches/scopes/cardinalidade/15min. Token só batch limitado16KiB: fixture máxima5snapshots/UID128/títulosUnicode120 mede8401bytes de token/14335bytes de resposta. Não aumentar parser Gika12KiB: recovery envia somente request original; envelopes passam APIcommands existente10MiB. Legacytokens8KiB inalterados.

UI executa sequencialmente activity.setStatus/activity.update existentes, online-only/queuefalse. Guard no mesmo writer lê todos os targets ainda pendentes e seus receipts/séries antes de cada novo efeito. Qualquer stale antes do primeiro comando impede primeiro commit; corrida entre commits pode produzir partial explícito. Nunca refresh revision/seleção/fallback amplo. Não há rollback ou promessa all-or-nothing. Parar no primeiro conflito/falha/ack desconhecido; discriminar resultado aplicado, já aplicado, conflito, falha comprovada, pendente e desconhecido.

Cada receipt aplicado na coleção existente conserva plano integral selado+índice. Recovery consulta até5IDs filhos conhecidos antes do provider e devolve apenas snapshot/acks históricos validados por hash de envelope/UID/entidade/revisão. UI ainda exige ack real em replay. Nenhuma chamada Gemini em confirmar/cancelar/retomar. Receipt já aplicado é replayável depois de expiração/rotação, sem autorizar irmãos pendentes com selo expirado. Auth fresca ao resolver, transportar, confirmar, retornar e dentro de cada transação; mudança de conta interrompe próximos comandos. Reload não restaura conversa/lote nem autoexecuta.

## Orçamento e consequências

Por comando novo: até24leituras documentais conservadoras (8base+2N+R no guard,N<=5,R<=N,+1categoria). Complete5writes; reschedule até8 com3reminderjobs. Até5transações sequenciais; quotas60/min1000/dia/controles continuam por item. Leituras iniciais usam read layer existente cap50 e inspeção recorrente cap51 por item; não consultar dados sem bound. Nenhum writer, collection, fila, engine ou dependência nova. Partial transport failure não prova ausência de commit. A UX mostra contagem/itemização e retoma os mesmos envelopes; conflitos/autoridade/expiração não renovam autorização.

M6/organização, batch future/all, rename/delete/create, genericUndo, seleção livre e persistência de conversa continuam fora de escopo. Interpretação Gemini nesta etapa é fixture; nenhum live autorizado.
