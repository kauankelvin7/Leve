# Leve — ponto exato de retomada

**Atualizado em:** 17/09/2026  
**Estado:** Calendário Mês/Semana/Dia integrado e validado na `main`  
**PR concluído:** `#1` — `feat(calendar): complete safe month week day planner`  
**Merge:** `e1ffd083f09717c7dcd26fafccecda6660e13249`

> Este arquivo registra somente o estado atual necessário para retomar o trabalho. O histórico detalhado anterior continua preservado no Git, em `docs/EXECUCAO.md`, nos ADRs e nos demais documentos versionados.

## Etapa atual

A integração do Calendário avançado foi concluída. O PR foi revisado, validado, squash-merged na `main` e os gates da própria `main` passaram novamente após o merge.

Não há pendência conhecida de implementação ou teste automatizado bloqueando esta entrega.

## Último item concluído

Calendário avançado com renderer próprio e sem nova dependência de calendário:

- `Mês`, `Semana` e `Dia` na rota `/calendario`;
- Semana com sete dias no desktop e rolagem horizontal no mobile;
- Dia com uma coluna horária;
- faixa `Dia todo`;
- faixa separada de `Tarefas`, sem inventar duração;
- eventos sobrepostos distribuídos em lanes;
- linha do horário atual pelo fuso do perfil;
- criação por intervalo com formulário existente pré-preenchido e sem autosave;
- mover compromisso com snap de 15 minutos;
- redimensionar duração com mínimo de 15 minutos;
- recorrência com escolha explícita entre `Somente esta ocorrência` e `Esta e as próximas`;
- conflitos mantêm `expectedRevision` e não usam last-write-wins silencioso;
- offline continua usando a outbox existente;
- enquanto houver mutação local pendente, novos gestos do Planner ficam bloqueados para evitar confirmação falsa;
- drag/resize não são o único caminho: detalhe e formulário convencional permanecem disponíveis.

O renderer não acessa Firestore, Auth ou persistência diretamente. A decisão está registrada em `docs/adr/002-calendar-renderer.md`.

## Arquivos centrais desta entrega

```text
apps/web/src/features/activities/Calendar.tsx
apps/web/src/features/activities/Today.tsx
apps/web/src/features/activities/calendar/CalendarTimeGrid.tsx
apps/web/src/features/activities/calendar/calendar-time-grid.css
apps/web/src/features/activities/calendar/calendarCommandModel.ts
apps/web/src/features/activities/calendar/calendarDraftModel.ts
apps/web/src/features/activities/calendar/calendarMutationModel.ts
apps/web/src/features/activities/calendar/RecurrenceScopeDialog.tsx
tests/e2e-local/calendar-planner.spec.ts
tests/e2e-local/calendar-planner-visual.spec.ts
.github/workflows/planner-e2e.yml
docs/adr/002-calendar-renderer.md
```

A entrega também inclui pequenos ajustes de acessibilidade no shell e correção do tutorial para respeitar `tutorialCompletedAt` e não reaparecer indevidamente.

## Validação concluída

Antes do merge, o HEAD exato do PR passou:

```text
Production dependency security audit  PASS
npm run lint                         PASS
npm run typecheck                    PASS
npm test                             PASS
npm run build                        PASS
Auth + Firestore integration         PASS
Planner E2E                          PASS (11/11)
```

Após o squash merge `e1ffd083f09717c7dcd26fafccecda6660e13249`, a própria `main` repetiu e aprovou:

```text
CI                                  PASS
Planner E2E                         PASS
```

O E2E focal usa somente Auth/Firestore Emulator e dados fictícios. Ele cobre:

- Mês/Semana/Dia;
- viewports 1440x900, 1366x768, 1024x768, 430x932, 390x844 e 360x800;
- ausência de overflow global;
- Axe WCAG automatizado em desktop e mobile;
- teclado e foco;
- claro/escuro;
- `prefers-reduced-motion`;
- criação por intervalo;
- move;
- resize;
- recorrência e cancelamento;
- `activity.updateFuture`;
- conflito de revisão;
- offline/outbox;
- persistência da visualização escolhida.

O workflow `Planner E2E` é agora um gate focal permanente em PRs e pushes da `main` quando arquivos relevantes do calendário, comandos, tema ou testes mudam.

## Resultado da revisão de segurança

- nenhuma alteração em `firestore.rules` nesta entrega;
- nenhuma escrita direta nova no Firestore;
- nenhuma dependência de calendário adicionada;
- nenhuma credencial, token ou dado real incluído;
- queries continuam usando a camada limitada pelas Rules;
- mutações continuam em `POST /api/commands`;
- recorrência futura continua usando `activity.updateFuture`;
- conflitos continuam exigindo revisão esperada;
- testes de escrita usam projeto fictício/emuladores;
- nenhuma alteração de billing, domínio, Vercel, Firebase real ou infraestrutura paga entrou neste merge.

## Limitações intencionais

- touch não depende de drag preciso; criação/edição convencional continua sendo o caminho seguro no celular;
- tarefas sem duração não entram como blocos artificiais na grade;
- segmentos intermediários de eventos multi-dia não expõem handles de resize/move;
- push com app fechado, instalação/atualização PWA em aparelho físico e leitor de tela externo continuam sendo validações de hardware/ambiente, não provas deste Planner.

## Próximo bloco de produto

Experiências sazonais opcionais, conforme `docs/PLANO-EXPERIENCIA-CALENDARIO-NOTAS-SAZONAL.md`.

A base pura de datas já existe, mas **a experiência visual e a preferência de perfil ainda não estão prontas**. Antes de implementar:

- revisar schema/defaults de perfil;
- `profile.update`;
- exportação/importação;
- preferência para desligar completamente;
- `prefers-reduced-motion` como regra superior;
- intro local uma vez por período/aparelho;
- nenhuma API externa de feriados;
- nenhum asset remoto necessário para funcionar.

## Riscos conhecidos fora desta entrega

- dependências ainda possuem vulnerabilidades moderadas conhecidas; não usar `npm audit fix --force`;
- bundle continua merecendo manutenção separada antes de adicionar dependência visual pesada;
- validações externas de push/PWA/hardware permanecem independentes deste merge;
- hospedagem/domínio ficam adiados conforme decisão do usuário.

## Próxima ação ao retomar

Considerar o Calendário avançado concluído e integrado. Não refazer o Planner nem instalar Schedule-X sem uma nova necessidade concreta e revisão da ADR. O próximo desenvolvimento planejado é a fase sazonal opcional, iniciando pelo contrato de preferência e pelos testes de segurança/compatibilidade antes de qualquer decoração visual.
