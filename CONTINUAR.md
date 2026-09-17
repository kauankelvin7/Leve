# Leve — ponto exato de retomada

**Atualizado em:** 17/09/2026  
**Branch atual:** `feat/seasonal-calendar-markers`  
**Base:** `main` em `cc0f6d4efe38e36239df2f2f28bb4f3bef7133f9`  
**Estado:** extensão sazonal do calendário implementada; em validação antes de PR/merge

> Este arquivo registra somente o ponto atual necessário para retomar. O histórico anterior continua preservado no Git, nos ADRs e em `docs/EXECUCAO.md`.

## Estado consolidado anterior

A experiência sazonal base já foi integrada na `main` pelo PR #2 no commit:

```text
cc0f6d4efe38e36239df2f2f28bb4f3bef7133f9
feat(seasonal): add optional seasonal experiences
```

O pós-merge desse commit foi confirmado com sucesso em:

```text
CI / verify          PASS
Seasonal E2E         PASS
Planner E2E          PASS
```

A Fase 7 de auditoria final **não foi iniciada**.

## Extensão atual — marcadores de datas especiais

O usuário aprovou uma melhoria visual no Calendário: em vez de existir apenas um detalhe sazonal genérico no dia atual, as datas especiais devem carregar um pequeno símbolo próprio na data exata.

A decisão foi registrada em `docs/SEASONAL-ART-DIRECTION.md`.

### Datas âncora V1

- 01/01 — Ano-Novo — spark geométrico;
- domingo de Páscoa — Páscoa — ovo abstrato;
- 24/06 — Festa Junina — bandeirolas;
- 31/10 — Halloween — lua crescente;
- 25/12 — Natal — estrela editorial;
- 31/12 — Ano-Novo — spark geométrico.

### Comportamento aprovado

- os marcadores são estáticos e pequenos;
- usam os SVGs sazonais já existentes;
- não mudam cores de compromissos;
- não cobrem número, título ou atividade;
- usam os tokens do tema atual, sem paleta fixa por feriado;
- aparecem ao navegar até a data âncora mesmo que o dia atual esteja em outro mês;
- na visão Mês, células adjacentes não recebem marcador;
- Semana e Dia exibem o símbolo no cabeçalho da data;
- `seasonalDetailsEnabled = false` remove também esses marcadores;
- o SVG é decorativo (`aria-hidden`), mas o nome do evento entra no nome acessível da data.

## Implementação na branch

Arquivos novos:

```text
apps/web/src/platform/seasonal/seasonalCalendarMarkers.ts
apps/web/src/components/seasonal/SeasonalCalendarMarker.tsx
```

Arquivos alterados:

```text
apps/web/src/features/activities/Calendar.tsx
apps/web/src/features/activities/calendar/CalendarTimeGrid.tsx
apps/web/src/components/seasonal/seasonal-experience.css
tests/unit/seasonal-experience.test.ts
tests/e2e-local/seasonal-experience.spec.ts
docs/SEASONAL-ART-DIRECTION.md
CONTINUAR.md
```

A resolução das datas é local e determinística. A Páscoa reutiliza o computus já existente. Não há API externa, dependência nova, coleção nova, alteração em Firestore Rules ou mudança de persistência.

## Testes adicionados

Unitários cobrem as datas âncora de 2026 e confirmam que dias apenas pertencentes ao período, como 24/12, não recebem marcador de Natal.

O E2E sazonal passou a provar:

- Natal aparece especificamente em 25/12 na visão Mês;
- o nome acessível da data inclui `Natal`;
- a visão Dia mantém o marcador depois de selecionar 25/12;
- opt-out sazonal remove os marcadores do calendário;
- Axe e ausência de overflow continuam obrigatórios.

## Gate atual

HEAD funcional antes das atualizações documentais:

```text
a61cde7c896f99f6990ec397089c682bc6287d34
```

No CI desse HEAD já passaram:

```text
npm ci                              PASS
Production dependency audit        PASS
npm run lint                        PASS
npm run typecheck                   PASS
npm test                            PASS
npm run build                       PASS
```

A integração Auth/Firestore ainda estava em execução quando este checkpoint foi escrito. As atualizações documentais seguintes geram um novo HEAD e o resultado final deve ser confirmado novamente antes do PR.

## Próximos passos permitidos nesta extensão

1. confirmar o CI completo do HEAD final da branch;
2. comparar `main...feat/seasonal-calendar-markers` e revisar escopo;
3. abrir PR para `main`;
4. exigir CI + Seasonal E2E + Planner E2E verdes no PR;
5. fazer squash merge apenas do SHA testado;
6. repetir os gates pós-merge na `main`;
7. atualizar este checkpoint com o SHA final.

## Fora de escopo agora

- não iniciar a Fase 7;
- não redesenhar a experiência sazonal base;
- não adicionar Motion/Lottie/canvas;
- não alterar Rules, domínio de atividades, recorrência, outbox ou billing;
- não adicionar outros feriados sem nova decisão de produto.
