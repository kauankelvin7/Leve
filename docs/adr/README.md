# Decisões de arquitetura

Este diretório reúne ADRs gerais do Leve. Decisões específicas da Gika permanecem nos seus caminhos especializados; o índice central é [índice da documentação](../README.md).

## ADRs gerais

- [ADR 001 — Fundação](001-fundacao.md): registro histórico da fundação; leia as premissas no contexto original.
- [ADR 002 — Renderer do calendário](002-calendar-renderer.md): decisão do renderer de calendário.

## Decisões especializadas

- [ADR 020 — Composição em lote da Gika](../gika/ADR_020_BATCH_COMPOSITION.md)
- [Log cumulativo de decisões Gika](../../.agent/GIKA_DECISIONS.md): inclui as decisões numeradas e complementos posteriores. O número da decisão deve ser conferido nesse arquivo; ele não é um conjunto de ADRs em arquivos individuais.

## Modelo para novo ADR

Use um identificador ainda não usado e mantenha a decisão curta:

```md
# ADR NNN — Título descritivo

## Status
Proposto | Aceito | Substituído | Rejeitado

## Context
Problema, restrições e fatos relevantes.

## Decision
Decisão adotada e escopo.

## Alternatives
Alternativas consideradas e motivo para não adotá-las.

## Consequences
Efeitos, custos, riscos e trabalho decorrente.
```

Atualize este índice e o mapa de fontes ao criar ou substituir uma decisão. Preserve ADRs aceitos/substituídos para histórico.
