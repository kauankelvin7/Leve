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

Commit atômico M3-T2 verificado: `56800b2f933e6d6ee0043856698bd6473eb13e37`; worktree limpo depois do commit. Este checkpoint posterior só documenta o SHA real. M3-T3 permanece não iniciado.

## Gika — M3-T3 em 01/10/2026

Undo seguro da criação concluído a partir de fc30bf9 na feat/gika-integration. Botão determinístico → activity.trash/soft-delete30dias/receipts transacionais existentes, UID/ID/revisão1/createdAt original e replay seguros; sem Gemini ou purge no undo. ADR013, M3_T3_EXECPLAN/EVIDENCE e .agent/GIKA_STATE.md. Gates focais194 unit/76 integração/6 E2E/lint/dois TS/build PASS; amplo50/13:12 falhas anteriores + intermitência dock/timer preexistente demonstrada nas duas versões,check12/1,audit13 baseline. M3 permanece parcial até M3-SMOKE após revisão; não executar live nem iniciar M4 nesta sessão. SHA real no checkpoint documental posterior.

Commit atômico M3-T3 verificado: `55b760ffa80a84070872e82a42a3d8f132f4141a`, worktree limpo após commit. Checkpoint posterior é documental; próxima ação revisão T3, sem iniciar smoke/M4 automaticamente.


## Gika — M3-SMOKE e fechamento M3 em 01/10/2026

T3 aprovado e smoke exclusivamente autorizado a partir de abbd1e2 limpo na feat/gika-integration. Gemini real HTTP200/create_task → validation/policy → command layer/receipt/persistência → UI, uma tarefa sintética, ack perdido/retry alreadyApplied sem duplicata nem segundo Gemini. Undo opcional real remove só alvo pela lixeira. M3_SMOKE_EXECPLAN/EVIDENCE e .agent/GIKA_STATE.md são fontes atuais; M3 done.194 unit/76 integração/32 E2E Gika/lint/build/dois TS PASS;check12/1 contraste e audit13 baseline explícitos. Credencial somente memória e processo encerrado, sem segredo versionado. Proxy Codex Remote ambiente-only; produção/arquitetura/modelo intactos. Parar antes de M4-T1, exige autorização nova. SHA real no checkpoint documental posterior.

Commit atômico M3-SMOKE/fechamento M3 verificado: `723d444295fafb08e7706b92a283bf3d1f2b0d0b`, worktree limpo confirmado. Este checkpoint posterior somente registra SHA/estado; M4-T1 não iniciado.


## Gika — M4-T1 em 01/10/2026

Pedido posterior autorizou exclusivamente complete_task a partir de56b9308 na feat/gika-integration. T1 done: tool strict title/date, resolução autenticada limitada a um dia civil, ambiguidade/no-op honestos, activity.setStatus/revisão/receipt transacional existentes, retry/lost ack seguro e UI structured somente após ack real. ADR014, M4_T1_EXECPLAN/EVIDENCE e .agent/GIKA_STATE.md são fontes atuais. Lint/build/dois TS/218 unit/98 integração/38 E2E Gika PASS;local58 PASS/11 FAIL baseline,check12/1,audit13 baseline.23 arquivos de baselines idênticos à entrada; timer/reflow passaram sem remover pendências. Sem Gemini live/segredo/billing/push/deploy/merge. M4 parcial, T2/T3 todo: parar para revisão antes de M4-T2, não iniciar automaticamente. SHA real no checkpoint documental posterior.

Commit atômico M4-T1 verificado: `c0de781413f00a00eeb3e498215f1f55db625ba7`, worktree limpo depois do commit. Este registro documental posterior não altera código. M4-T2 não iniciado; aguardar revisão/autorização explícita.


## Gika — M4-T2 em 01/10/2026

Pedido posterior autorizou exclusivamente update_task a partir de02fe03e na feat/gika-integration. T2 done: apenas título como patch strict; selector textual/civil/exato bounded autenticado, activity.update/contentCommand convencional hidrata ActivityInput atual dentro da transação, campos não solicitados intactos, revision/receipts/retry/lost ack/ownership e UI structured após ack real. ADR015, M4_T2_EXECPLAN/EVIDENCE e .agent/GIKA_STATE.md são fontes atuais.262 unit/123 integração/10 E2E finais/lint/build/dois TS PASS;75 amplos62/13 causas comparadas02fe (11 históricas+2 intermitências deadline demonstradas);check12/1 contraste e audit13 baseline.26 arquivos de referência idênticos, sem timer/contraste fixes. Sondas temporárias removidas. Sem live/segredo/billing/push/deploy/merge. M4 parcial; T3 todo/não iniciado, aguardar revisão/autorização. SHA real no checkpoint documental posterior.

Commit atômico M4-T2 verificado: `ededc2090887c181f6f463d92cda934a9cd6d16a`, worktree limpo depois do commit. Este checkpoint documental posterior registra o SHA real sem mudança funcional. M4-T3 não iniciado; aguardar revisão/autorização.


## Gika — checkpoint M4-T3

Na branch feat/gika-integration, reagendamento simples concluído a partir de d233971. Fonte atual `.agent/GIKA_STATE.md`, tarefas/ExecPlan e `docs/gika/M4_T3_EVIDENCE.md`. Patch temporal/preview→activity.update convencional/revisão/receipt/ack reais; sem recorrência/batch/Undo genérico.295 unit/150 integração/7 focal PASS; ampla67/15 e check12/1/audit13 baseline classificados, sem mascarar gates. M4 parcial: parar para revisão antes do M4-SMOKE real, não iniciar M5/Gemini live automaticamente. Checkpoint SHA real no estado/documentação após commit atômico.

Commit atômico M4-T3: `f774d9c9b1466683e418be8b59f83615eb9495e7`; worktree limpo após commit. Checkpoint documental seguinte somente registra este SHA, sem mudança funcional.

## Gika — M4-SMOKE e fechamento M4

A partir de cfd96c3 limpo na feat/gika-integration, T3 aprovado e smoke exclusivamente autorizado. Quatro chamadas Gemini reais HTTP200 complete/update/reschedule timed+untimed→validation/resolution/policy→commands/receipt/persistência emulada→ack/UI; retries sem extra efeitos/upstream, preview sem escrita até confirmar, horários preservados e UID vizinho intacto. M4_SMOKE_EXECPLAN/EVIDENCE e .agent/GIKA_STATE.md fontes atuais; M4 done.295 unit/150 integração/25 E2E/lint/build/dois TS PASS;check12/1 contraste e audit13 baseline explícitos,26 arquivos idênticos. Credencial somente memória e processo encerrado; proxy/egress apenas Codex Remote, sem produção alterada. M5 não iniciado; parar antes de M5-T1 até autorização nova. SHA real no checkpoint documental posterior.

Commit atômico M4-SMOKE/fechamento M4: `2443993295e45d7dc215ac0a1ab250437cee6c44`, branch feat/gika-integration e worktree limpo confirmados após commit. Checkpoint documental posterior apenas registra SHA real, sem repetir live/gates funcionais. M4 done, parar antes de M5.

## Gika — M5-T1

Entrada156fe77 limpa na feat/gika-integration. Classificador determinístico puro/strict/typed allow|clarify|confirm|deny, facts do servidor e registro fechado de quatro mutações atuais, gate antes de descriptor; auth/schema/ownership/revision/receipt/command layer/ack independentes. Preview reschedule preservado, replay histórico reautorizado precede resolução nova. ADR017, M5_T1_EXECPLAN/EVIDENCE e .agent/GIKA_STATE.md fontes atuais.323 unit/166 integração/6 E2E finais/lint/build/dois TS PASS;amplo50/1 deadlineUndo comparado original+sondas10200ms nas duas versões156/atual, todas51 únicas observadas PASS; check12/1 contraste e audit13 baseline,26 arquivos idênticos. Nenhum workaround/harness timeout/UI/writer/Rules/outbox/modelo/live/segredo/billing/push/deploy/merge. M5 in_progress/T1 done/T2+ todo; parar para revisão antes de M5-T2. SHA real no checkpoint documental posterior.

Commit atômico M5-T1: `4561cf59db395ac4c10c58118890283a3e45ec1e`; branch feat/gika-integration/worktree limpo confirmados após commit. Checkpoint documental posterior somente registra este SHA, sem alteração funcional. M5-T2 permanece todo, aguardar revisão/autorização; nenhum live automático.

## Security dependency hardening isolado

M5-T1 aprovado; entrada a922594 limpa e branch temporária chore/security-hardening criada. DiceBear9.4.3 em commit separado73e750c, seis avatares padrão idênticos e injeção SVG corrigida. Firebase12.19/Admin13.6/parents preservados; overrides limitados grpc1.14.5 e uuid11.1.1, árvore válida/clean npmci/contratos CJS/v4/multipart/SDK emulados comprovados. Produção audit13(4high/9moderate)→0, auditlevelhigh exit0; completo28→14 dev-only preexistentes/mesmas versões, não ocultados/CI intacto.334 unit/166 integração/53 E2E finais/lint/build/doisTS PASS;check12/1 contraste histórico.152 arquivos produto/harness/CI idênticos à entrada. Fontes docs/security/REPORT.md/INVENTORY.md/GOOGLE_EVIDENCE.md/DEVELOPMENT_REMAINING.md/gates.json e .agent/GIKA_STATE.md. Sem policy/tools/UI/writer/Rules/outbox/arquitetura/segredo/live/billing/push/deploy/merge alterados. feat/gika-integration permanece a922594; parar para revisão antes de integrar chore/security-hardening. M5-T2 não iniciado. SHA real no checkpoint documental posterior.

Commits atômicos hardening: DiceBear `73e750c866b620bb6a44147ecebf2b42d5e51b18`, Firebase/Google `e8c07be3218cb583fffb5af38e7a8beb10c95851`. chore/security-hardening/worktree limpo confirmados após ambos. Checkpoint documental posterior registra SHAs sem mudança funcional; feat ainda a922594. Aguardar revisão antes de integrar, M5-T2 todo.

## Frontend — composição e navegação em 06/10/2026

O pedido posterior autoriza a revisão criativa de todas as telas e o envio para
`main` após revisão e testes. Base `1ebe813cfe92e1c19ef338a57d579b82ec1aee8c`;
branch `refine/mobile-layout-and-navigation`.

Menu Mais corrigido na causa raiz: regras de navegação limitadas à sidebar,
linhas completas e fechamento por Escape, toque fora e navegação. Cabeçalho móvel
compacto e nomes na barra inferior. Compras e Notas mostram conteúdo salvo antes
do formulário. Revisão, Busca, Preferências, Lixeira, Privacidade, Termos e estados
de recurso indisponível receberam ajustes de composição. O hook documental
vincula o estado a UID e caminho, e o foco aguarda títulos carregados.

Fontes desta entrega: `DESIGN.md` e
`docs/frontend/MOBILE_REFINEMENT_REPORT.md`, com arquitetura, revisão independente,
snapshots e limites. Lint/typecheck/build, 802 unitários, 320 de integração e 17
E2E do shell PASS. Execução ampla local: 181 PASS/1 expectativa antiga de retrato;
ajuste mantém o alvo de toque >= 44 px e valida o rótulo; repetição focal 2/2 PASS.
Todos os 182 cenários locais únicos foram observados PASS ao final. CI passa a
proteger navegação responsiva, páginas públicas e launcher. A integração na main
está autorizada pelo usuário e condicionada aos checks do PR.

PR #19: referências visuais alinhadas ao Chromium 153 do Playwright/CI, depois de
reproduzir e inspecionar a divergência com o Chromium 151 do sistema. Comparação
final sem atualização de snapshots: 7/7 PASS. Tolerâncias preservadas; artefatos
de falha no CI por sete dias. Usar o navegador do lockfile para capturas canônicas;
comando reproduzível no relatório desta entrega.

## Frontend — abertura da agenda em 06/10/2026

Pedido posterior: aprimorar a tela “Preparando sua agenda…”. Base da `main`
`3e9cd3d299b5b90f73d0ee797cf21c218c898f21`; branch
`refine/agenda-loading-screen`. A autorização de envio à `main` permanece no
fluxo vigente, após revisão e checks.

Concluído: abertura com marca compacta, ilustração própria em SVG de agenda e
papéis, texto em destaque e indicador indeterminado. `AgendaLoadingScreen` e seu
CSS Module são selecionados somente pela variante `screen` de `LoadingState`.
A mensagem neutraliza localmente o cartão herdado da regra global de status.
O carregamento continua ligado à sessão, sem atraso mínimo ou progresso fictício.

Provas: lint/limites de arquitetura, typechecks/build PASS; Playwright final
8/8 PASS sem atualizar snapshots. Foram verificadas 11 paletas × claro/escuro ×
três larguras (66 composições), Axe, texto a 200%, movimento reduzido, cores
forçadas e retorno após a sessão. Revisão independente sem impedimentos.
Capturas Chromium 153 do lockfile e gate incluído no CI. Fontes: `DESIGN.md` e
`docs/frontend/AGENDA_LOADING_REPORT.md`. Próximo passo: checks do PR e integração
da mudança validada à `main`.
