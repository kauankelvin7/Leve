# Leve — ponto exato de retomada

**Atualizado em:** 17/09/2026  
**Branch atual:** `main`  
**HEAD funcional sazonal/calendário:** `f7894a5da7845bb03e658b7fb4ffd45289e17963`  
**Estado:** experiência sazonal, marcadores de datas especiais e refinamento visual em aparelho real integrados e validados; Fase 7 ainda não iniciada

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

Após revisão visual em aparelho real, os marcadores foram refinados pelo PR #4:

```text
f7894a5da7845bb03e658b7fb4ffd45289e17963
refine(calendar): simplify seasonal date markers
```

O pós-merge do PR #4 foi confirmado na própria `main`:

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

Tratamento visual final, definido após a captura em aparelho real:

- o marcador é **somente o SVG**, sem fundo, borda, sombra, cápsula ou aparência de botão;
- fica no canto superior direito com respiro em relação ao número;
- usa aproximadamente 12–16 px, com ajuste óptico por glifo e viewport;
- a cor deriva dos tokens do tema, combinando acento e texto;
- o número da data especial recebe apenas um realce sutil de cor/peso;
- `hoje`, seleção, foco e atividades continuam visualmente dominantes;
- os marcadores são estáticos e mantêm `pointer-events: none`;
- compromissos, tarefas e suas cores não são alterados;
- o SVG continua decorativo (`aria-hidden`), enquanto o nome do evento permanece no nome acessível do botão da data;
- o opt-out sazonal remove também os marcadores.

O refinamento não alterou resolver de datas, domínio, persistência, componentes de atividade nem os SVGs sazonais existentes.

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

## Validação do refinamento

O PR #4 alterou somente:

```text
.github/workflows/planner-e2e.yml
apps/web/src/components/seasonal/seasonal-experience.css
tests/e2e-local/seasonal-experience.spec.ts
```

Na auditoria final, a branch estava 3 commits à frente e 0 atrás da `main`.

Antes do merge, o HEAD exato `a45b5c5386fd1c205da63fb2249c7b3ffbcdc722` passou:

```text
CI completo                       PASS
Seasonal E2E                      PASS
Planner E2E                       PASS
```

Depois do squash merge, os três gates foram repetidos em `f7894a5da7845bb03e658b7fb4ffd45289e17963` e passaram novamente.

O Seasonal E2E passou a proteger explicitamente o tratamento editorial do marcador: fundo transparente, borda zero, sombra ausente, `pointer-events: none` e orçamento de tamanho pequeno, além das verificações anteriores de datas, opt-out, acessibilidade e reflow.

O workflow do Planner agora observa também os poucos arquivos sazonais que podem alterar diretamente a composição do Calendário, evitando que futuros refinamentos visuais escapem do gate de regressão do Planner.

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


## Gika — checkpoint em 30/09/2026

Pedido atual autoriza integração Gika e branch feat/gika-integration; não executa Fase 7 sazonal. Base real f6b21b6695f4953e28daace00edb05b2dd4bfde1.

- M0 e M1 visual/mock/refinement concluídos; polimento final M1-T4 validado. M2-T1 é a próxima tarefa, sem implementação IA nesta sessão por escopo do pedido mais recente.
- Último SHA de tarefa: ea10ae9d69b2124e0ffc340bc0bfab9128454bbb (M1-T4); este checkpoint posterior registra o SHA real sem referência circular.
- Provas: lint/build/typechecks, 102 unitários, 28 integração, 13 E2E Gika + Axe, 13 shell e 7 sazonal PASS. Regressões conhecidas do Planner e intermitência offline estão detalhadas em docs/gika/M1_EVIDENCE.md; suite global não declarada integralmente verde.
- Fonte oficial para textos: .agent/skills/humanizer-br/SKILL.md. UI apenas mock em memória; confirmação/undo exclusivamente demonstrativos, voz indisponível.
- M2: Gemini Developer API gemini-3.5-flash-lite, thinking_level medium, Free Tier/R$ 0, sem billing/fallback pago. Implementar sem segredo; GEMINI_API_KEY servidor ausente bloqueia somente smoke real futuro.
- Ler .agent/GIKA_STATE.md, GIKA_TASKS.yaml, GIKA_EXECPLAN.md e GIKA_DECISIONS.md; verificar git status/SHA antes de agir. Sem push/deploy/merge ou credenciais de produção.

## Gika — M3-T2 em 01/10/2026

M3-T2 concluído na feat/gika-integration a partir de a9aff2f: identidade por requestId/UID, command receipts atômicos existentes, recuperação de resposta perdida e proteção contra duplicação sem dedup por conteúdo. Fontes atuais .agent/GIKA_STATE.md e docs/gika/M3_T2_EVIDENCE.md; ADR-GIKA-012. Lint/typechecks/build/184 unit/64 integração e27 E2E Gika PASS;13 criação+read repetidos após última alteração/reinícioAPI PASS.58 locais46 PASS/12 FAIL baseline,check shell12/1 e audit13 vulnerabilidades baseline comparados à base. M3 parcial; M3-T3 todo e não iniciado, aguardar revisão/autorização. Sem segredo/billing/deploy; SHA real no checkpoint documental posterior.
