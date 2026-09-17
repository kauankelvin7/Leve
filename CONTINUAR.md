# Leve — ponto exato de retomada

**Atualizado em:** 17/09/2026  
**Branch atual:** `main`  
**HEAD funcional sazonal/calendário:** `c34c38a3c7c5a4e554bb6bea61870607ee3ee05c`  
**Estado:** experiência sazonal e marcadores de datas especiais integrados e validados; Fase 7 ainda não iniciada

> Este arquivo registra somente o ponto atual necessário para retomar. O histórico anterior continua preservado no Git, nos ADRs e em `docs/EXECUCAO.md`.

## Estado consolidado

A experiência sazonal base foi integrada pelo PR #2:

```text
cc0f6d4efe38e36239df2f2f28bb4f3bef7133f9
feat(seasonal): add optional seasonal experiences
```

A extensão de marcadores de datas especiais foi integrada pelo PR #3:

```text
c34c38a3c7c5a4e554bb6bea61870607ee3ee05c
feat(calendar): mark seasonal anchor dates
```

O pós-merge do PR #3 foi confirmado na própria `main`:

```text
CI / verify          PASS
Seasonal E2E         PASS
Planner E2E          PASS
```

A Fase 7 de auditoria final **não foi iniciada** e permanece fora de execução até nova autorização do usuário.

## Experiência sazonal disponível

Eventos suportados:

- Natal;
- Ano-Novo;
- Páscoa;
- Festa Junina;
- Halloween.

A experiência usa SVGs e CSS próprios, intro local de aproximadamente 3 segundos uma vez por período/aparelho, ambientação sutil, favicon sazonal e preferência persistida `seasonalDetailsEnabled`.

`prefers-reduced-motion` e `profile.reduceMotion` prevalecem sobre animações. Quando `seasonalDetailsEnabled` está desligado, decoração, intro, favicon e marcadores do calendário são removidos.

Não foram adicionados Motion, Lottie, canvas permanente, assets remotos, analytics ou API externa de feriados.

## Marcadores de datas especiais no Calendário

Datas âncora V1:

- 01/01 — Ano-Novo — spark geométrico;
- domingo de Páscoa — Páscoa — ovo abstrato;
- 24/06 — Festa Junina — bandeirolas;
- 31/10 — Halloween — lua crescente;
- 25/12 — Natal — estrela editorial;
- 31/12 — Ano-Novo — spark geométrico.

Comportamento integrado:

- os marcadores são pequenos, estáticos e usam os SVGs sazonais existentes;
- aparecem ao navegar até a data âncora mesmo quando a data atual está em outro período;
- visão Mês mostra o símbolo somente na célula pertencente ao mês exibido;
- Semana e Dia mostram o símbolo no cabeçalho da data;
- compromissos, tarefas e suas cores não são alterados;
- o marcador usa tokens do tema atual e `pointer-events: none`;
- o SVG é decorativo (`aria-hidden`), mas o nome do evento faz parte do nome acessível do botão da data;
- o opt-out sazonal remove também os marcadores.

Arquivos centrais:

```text
apps/web/src/platform/seasonal/seasonalCalendarMarkers.ts
apps/web/src/components/seasonal/SeasonalCalendarMarker.tsx
apps/web/src/components/seasonal/SeasonalGlyph.tsx
apps/web/src/components/seasonal/SeasonalExperience.tsx
apps/web/src/components/seasonal/seasonal-experience.css
apps/web/src/features/activities/Calendar.tsx
apps/web/src/features/activities/calendar/CalendarTimeGrid.tsx
docs/SEASONAL-ART-DIRECTION.md
```

## Validação da extensão

A branch passou antes do merge por:

```text
Production dependency audit       PASS
lint                              PASS
typecheck                         PASS
unitários                         PASS
build                             PASS
Auth/Firestore Emulator           PASS
```

No PR #3, o primeiro Seasonal E2E revelou uma falha séria de acessibilidade já existente no link lateral do perfil. O teste não foi enfraquecido: `apps/web/src/app/App.tsx` recebeu `aria-label="Perfil e preferências"` no link correspondente e o gate foi repetido.

O HEAD final do PR passou:

```text
CI                                PASS
Seasonal E2E                      PASS
Planner E2E                       PASS
```

Depois do squash merge, os três gates foram repetidos em `c34c38a3c7c5a4e554bb6bea61870607ee3ee05c` e passaram novamente.

O Seasonal E2E agora comprova, entre outros pontos:

- Natal especificamente em 25/12 na visão Mês;
- nome acessível da data incluindo `Natal`;
- marcador preservado na visão Dia;
- opt-out removendo os marcadores;
- light/dark/system;
- reduced motion;
- Axe sem regressão crítica;
- ausência de overflow nas larguras oficiais.

O Planner E2E pós-merge também passou, confirmando ausência de regressão detectada no calendário interativo.

## Segurança e limites preservados

- nenhuma escrita direta nova no Firestore;
- nenhuma alteração em `firestore.rules`;
- nenhuma coleção nova;
- nenhuma dependência nova;
- nenhuma mudança no domínio de atividades, recorrência ou outbox;
- nenhuma API externa ou localização remota;
- nenhuma mudança de billing ou infraestrutura;
- Páscoa reutiliza o computus local já existente.

## Próximo passo quando autorizado

A etapa planejada seguinte continua sendo a **Fase 7 — auditoria final do plano**, mas ela está deliberadamente parada. Não iniciar auditoria final, novo bloco funcional ou expansão de feriados sem novo pedido explícito do usuário.
