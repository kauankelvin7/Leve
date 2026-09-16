# Leve — Plano Técnico de Evolução UI/UX

**Versão:** 1.0  
**Data:** 16/09/2026  
**Status:** especificação pronta para execução por etapas  
**Escopo:** notas temáticas no modo escuro, calendário Mês/Semana/Dia com planner horário e experiências sazonais opcionais

---

## 1. Objetivo

Este documento define a execução completa das próximas evoluções de UI/UX do Leve sem misturar responsabilidades, perder decisões já tomadas ou introduzir soluções locais difíceis de manter.

As três frentes são:

1. Notas com identidade de cor preservada no modo escuro;
2. Calendário com visualizações Mês, Semana e Dia, incluindo planner horário;
3. Experiências sazonais sutis e opcionais.

A ordem oficial de execução será:

```text
BASELINE
   ↓
NOTAS TEMÁTICAS
   ↓
SPIKE DO CALENDÁRIO
   ↓
REFATORAR CALENDÁRIO ATUAL
   ↓
SEMANA + DIA (leitura)
   ↓
DRAG + RESIZE + CRIAÇÃO
   ↓
RECORRÊNCIA + CONFLITO + OFFLINE
   ↓
EXPERIÊNCIAS SAZONAIS
   ↓
AUDITORIA FINAL
```

---

# 2. Regras arquiteturais

- React + TypeScript + Vite continuam como base.
- Nenhuma funcionalidade nova pode gravar diretamente no Firestore.
- Toda mutação continua passando por `POST /api/commands`.
- `operationId`, `entityId` e `expectedRevision` permanecem obrigatórios.
- O planner nunca pode ignorar conflitos de revisão.
- PWA, cache privado, outbox e modo offline devem continuar funcionando.
- Toda nova UI precisa funcionar em light, dark e system.
- Toda nova UI precisa funcionar com todas as paletas.
- Nenhum componente deve depender de IDs específicos de tema.
- Bibliotecas externas serão usadas apenas como renderer, nunca como fonte de verdade.

---

# 3. Decisões de produto fechadas

| ID | Decisão |
|---|---|
| D-01 | No dark mode, notas terão base grafite com tonalidade forte da cor do preset. |
| D-02 | O editor da nota usará a mesma identidade visual do card. |
| D-03 | Permanecem cinco presets semânticos inicialmente. |
| D-04 | Novos presets devem ser adicionáveis sem alterar componentes. |
| D-05 | Datas especiais podem ocupar períodos. |
| D-06 | A intro sazonal maior ocorre uma vez por período/aparelho. |
| D-07 | Depois da intro, ficam apenas detalhes sutis. |
| D-08 | Haverá opção para desligar experiências sazonais. |
| D-09 | `prefers-reduced-motion` sempre prevalece. |
| D-10 | Ambientação sazonal será mais forte em Login, Meu dia e Calendário. |
| D-11 | O Calendário terá `Mês`, `Semana` e `Dia`. |
| D-12 | Semana no desktop terá sete colunas. |
| D-13 | Semana no mobile será horizontal, sem esmagar sete colunas. |
| D-14 | Dia será a experiência principal em telas pequenas. |
| D-15 | Eventos de dia inteiro ficam numa faixa no topo. |
| D-16 | Eventos podem ser arrastados para mudar horário. |
| D-17 | Eventos podem ser redimensionados para mudar duração. |
| D-18 | Snap de horário: 15 minutos. |
| D-19 | Criar por gesto abre formulário preenchido com data/início/fim. |
| D-20 | Alteração recorrente pergunta `Somente esta ocorrência` ou `Esta e as próximas`. |
| D-21 | Planner mostra atividades; notas e compras só aparecem como contexto no detalhe. |
| D-22 | Primeira visualização: Semana desktop, Dia mobile. |
| D-23 | Última visualização escolhida será lembrada por aparelho. |

---

# 4. Frente A — Notas temáticas no dark mode

## 4.1 Objetivo

Preservar a identidade visual das notas sem deixar os cards saturados.

Exemplo:

```text
Saúde
Light → verde claro
Dark  → grafite esverdeado

Pessoal
Light → rosa suave
Dark  → grafite ameixa

Estudos
Light → azul/lilás suave
Dark  → grafite azulado
```

## 4.2 Registry central

Criar uma fonte de verdade como:

`packages/domain/src/notePresets.ts`

Estrutura esperada:

```ts
export const noteColorPresets = {
  butter: {
    label: 'Geral',
    light: { surface: '...', border: '...', accent: '...' },
    dark:  { surface: '...', border: '...', accent: '...' }
  },
  studies: {
    label: 'Estudos',
    light: { ... },
    dark: { ... }
  },
  personal: {
    label: 'Pessoal',
    light: { ... },
    dark: { ... }
  },
  health: {
    label: 'Saúde',
    light: { ... },
    dark: { ... }
  },
  home: {
    label: 'Casa',
    light: { ... },
    dark: { ... }
  }
} as const;

export type NoteColorPreset = keyof typeof noteColorPresets;
```

## 4.3 Tokens por nota

Cada preset deve alimentar:

- `--note-surface`
- `--note-surface-hover`
- `--note-border`
- `--note-accent`
- `--note-text`
- `--note-muted`
- `--note-editor-surface`

Componentes não usam hex diretamente.

## 4.4 Editor

- O editor usa o mesmo preset do card.
- A troca de preset atualiza o preview imediatamente.
- Cancelar edição restaura o visual anterior.
- Trocar light/dark não perde o preset.

## 4.5 Extensibilidade

Adicionar um sexto preset no futuro deve exigir apenas:

1. registry;
2. schema;
3. opção no seletor.

Não deve exigir alterar o card, o editor ou regras específicas de dark mode.

## 4.6 Critérios de aceite

- cinco presets visualmente distinguíveis em light;
- cinco presets distinguíveis em dark;
- base grafite preservada no dark;
- contraste adequado;
- editor e card coerentes;
- dados antigos continuam válidos;
- testes Playwright claro/escuro;
- validação em mobile e desktop.

---

# 5. Frente B — Calendário Mês/Semana/Dia

## 5.1 Objetivo

Transformar `/calendario` em uma ferramenta real de planejamento temporal sem criar um produto separado chamado “Planner”.

O usuário verá:

```text
Calendário

[Mês] [Semana] [Dia]
```

## 5.2 Mês

Preserva e refina a visão atual:

- 42 células;
- cores;
- seleção;
- agenda do dia;
- filtro por categoria;
- adicionar atividade;
- tarefas e eventos.

## 5.3 Semana

### Desktop

- sete colunas;
- eixo horário vertical;
- faixa `Dia todo`;
- hora atual;
- eventos proporcionais à duração;
- overlap de eventos;
- drag;
- resize.

### Mobile

- continua semanticamente Semana;
- mostra aproximadamente 2–3 dias por viewport;
- navegação horizontal;
- cabeçalho sincronizado;
- nunca comprimir sete colunas.

## 5.4 Dia

- uma coluna;
- faixa `Dia todo`;
- eixo horário;
- melhor experiência mobile;
- drag;
- resize;
- criação por intervalo.

## 5.5 Persistência de visualização

Usar algo como:

```text
leve.calendar.view
```

Fallback:

```text
desktop → week
mobile  → day
```

Depois de o usuário escolher, não trocar automaticamente por breakpoint.

---

# 6. Camada de consulta do calendário

Extrair a consulta atual para:

```ts
useCalendarRange({
  startDate,
  endDate,
  categoryId
})
```

Responsabilidades:

- montar queries;
- desduplicar;
- remover deletados;
- detectar respostas parciais;
- expor loading/error/retry;
- trabalhar com Mês/Semana/Dia.

Nunca buscar um ano inteiro para alimentar a UI.

---

# 7. CalendarEventViewModel

Criar um adaptador neutro entre domínio e renderer:

```ts
type CalendarEventViewModel = {
  id: string;
  revision: number;
  title: string;
  categoryId: string | null;
  color: string;
  start: Temporal.ZonedDateTime | null;
  end: Temporal.ZonedDateTime | null;
  allDay: boolean;
  recurring: boolean;
  seriesId: string | null;
  occurrenceKey: string | null;
  status: 'pending' | 'completed' | 'canceled';
};
```

A biblioteca nunca recebe o documento Firestore diretamente.

---

# 8. Regras de exibição

## Evento com horário

Ocupa a grade conforme duração.

## Dia inteiro

Fica na faixa:

```text
Dia todo
[ Viagem ]
```

Nunca recebe hora artificial.

## Tarefa

Como tarefa pode não ter duração, ela não recebe bloco falso de uma hora.

V1:

- continua aparecendo normalmente em Mês;
- em Semana/Dia aparece numa faixa compacta `Tarefas`;
- `dueTime`, se existir, aparece como metadado;
- sem resize;
- arrastar tarefa para grade fica fora da primeira versão.

---

# 9. Biblioteca do calendário

## Candidata principal

Schedule-X.

Mas antes de adotar, fazer spike obrigatório para verificar:

- Mês/Semana/Dia;
- React;
- dark/light;
- mobile;
- drag;
- resize;
- all-day;
- acessibilidade;
- bundle;
- licença;
- necessidade de plugins pagos.

Se qualquer requisito central depender de recurso pago, avaliar:

1. React Big Calendar;
2. time-grid próprio.

A biblioteca será somente renderer.

---

# 10. Drag-and-drop

Fluxo:

```text
arrastar
  ↓
preview local
  ↓
calcular schedule
  ↓
validar
  ↓
POST /api/commands
  ↓
confirmar ou reverter
```

Usar:

```text
activity.update
```

com `operationId`, `entityId` e `expectedRevision`.

Em conflito:

- reverter posição;
- não esconder conflito;
- preservar intenção;
- oferecer ação clara.

---

# 11. Resize

Regras:

- snap de 15 minutos;
- duração mínima visual de 15 min;
- término sempre após início;
- suportar atravessar meia-noite;
- domínio continua sendo autoridade.

---

# 12. Recorrência

Ao mover/redimensionar ocorrência recorrente:

```text
Alterar este compromisso

( ) Somente esta ocorrência
( ) Esta e as próximas

[Cancelar] [Continuar]
```

Mapeamento:

```text
Somente esta ocorrência → edição individual existente
Esta e as próximas      → activity.updateFuture
```

Não adicionar `Toda a série` na V1 sem necessidade real.

---

# 13. Criação direta no planner

Desktop:

1. pointer down;
2. arrasta intervalo;
3. preview;
4. solta;
5. abre formulário.

Exemplo:

```text
Data: 21/09/2026
Início: 14:00
Fim: 15:30
```

Nada é salvo antes da confirmação.

Mobile:

- não depender de drag preciso;
- usar toque longo ou ação contextual;
- botão convencional `Nova atividade` sempre permanece.

---

# 14. Sobreposição

Quando dois eventos colidem:

- renderizar lado a lado;
- manter títulos legíveis;
- não depender só de cor;
- toque abre detalhe;
- estados concluído/cancelado devem ter representação adicional.

---

# 15. Linha de horário atual

- apenas no dia atual;
- discreta;
- sem animação contínua;
- atualizada de forma eficiente;
- baseada no fuso do perfil.

---

# 16. Timezone e DST

Usar Temporal e o fuso do perfil.

Testar:

- horário inexistente;
- horário ambíguo;
- evento atravessando meia-noite;
- aparelho em fuso diferente do perfil;
- DST em fusos aplicáveis.

---

# 17. Offline

O planner não cria exceções.

Se offline estiver habilitado:

```text
drag/resize
  ↓
comando
  ↓
outbox
  ↓
sincronização
```

Mostrar estado pendente quando necessário.

---

# 18. Acessibilidade do planner

Obrigatório:

- Mês/Semana/Dia por teclado;
- foco visível;
- drag não é único método;
- alternativa de edição completa;
- modal de recorrência acessível;
- touch targets adequados;
- reflow 200%;
- `prefers-reduced-motion`;
- significado nunca somente por cor.

---

# 19. Frente C — Experiências sazonais

## 19.1 Objetivo

Adicionar personalidade sem atrapalhar produtividade.

Princípio:

> a pessoa percebe a data especial; a decoração não disputa atenção com a tarefa.

## 19.2 Registry

Criar:

`apps/web/src/platform/seasonal/seasonalEvents.ts`

Estrutura:

```ts
type SeasonalEvent = {
  id: string;
  label: string;
  resolvePeriod(year: number, timeZone: string): {
    start: string;
    end: string;
    periodId: string;
  } | null;
  surfaces: ('login' | 'today' | 'calendar' | 'global')[];
  decoration: string;
  intro?: string;
};
```

## 19.3 Eventos V1

- Natal;
- Ano-Novo;
- Páscoa;
- Festa Junina;
- Halloween.

Sugestão inicial:

```text
Natal        20/12–25/12
Ano-Novo     31/12–01/01
Páscoa       sexta anterior–domingo
Festa Junina 12/06–30/06
Halloween    29/10–31/10
```

Períodos ficam no registry.

---

# 20. Preferência sazonal

Adicionar ao perfil:

```ts
seasonalDetailsEnabled: boolean
```

Padrão recomendado:

```text
true
```

Deve participar de:

- schema;
- defaults;
- `profile.update`;
- exportação/importação;
- testes.

---

# 21. Primeira abertura

Guardar localmente:

```text
leve.seasonal.seen.<eventId>.<periodId>
```

Exemplo:

```text
leve.seasonal.seen.christmas.2026
```

Não enviar esse estado para Firestore.

---

# 22. Dois níveis de experiência

## Intro

Uma vez por período/aparelho.

Duração:

```text
2–4s
```

Nunca bloquear interação.

## Ambientação

Durante todo o período:

- detalhe no logo;
- pequena decoração no Meu dia;
- marca discreta no calendário;
- fundo sutil.

---

# 23. Superfícies

## Login

Permitido:

- pequeno detalhe de marca;
- intro inicial.

Proibido:

- cobrir inputs;
- mover formulário;
- comprometer leitura.

## Meu dia

Principal superfície sazonal autenticada.

## Calendário

- marcador nas datas;
- pequeno detalhe no cabeçalho;
- jamais cobrir eventos.

## Outras páginas

Apenas detalhe global mínimo.

---

# 24. Reduced motion

Hierarquia:

```text
seasonalDetailsEnabled = false
→ nada

seasonalDetailsEnabled = true
+ prefers-reduced-motion = reduce
→ decoração estática

seasonalDetailsEnabled = true
+ movimento permitido
→ intro + decoração
```

---

# 25. Biblioteca de animação

Avaliar Motion.

Não instalar automaticamente.

Gate:

- bundle;
- necessidade real;
- comparação com CSS/SVG puro.

Se CSS/SVG resolver de forma limpa, não adicionar dependência.

Lottie fica fora da V1.

---

# 26. Estrutura de arquivos sugerida

```text
packages/domain/src/
  notePresets.ts

apps/web/src/features/notes/
  NoteCard.tsx
  NoteEditor.tsx

apps/web/src/features/activities/calendar/
  CalendarView.tsx
  MonthCalendar.tsx
  WeekCalendar.tsx
  DayCalendar.tsx
  CalendarViewSwitcher.tsx
  CalendarEventAdapter.ts
  RecurrenceScopeDialog.tsx
  useCalendarRange.ts

apps/web/src/platform/seasonal/
  seasonalEvents.ts
  seasonalResolver.ts
  seasonalStorage.ts

apps/web/src/components/seasonal/
  SeasonalExperience.tsx
  SeasonalDecoration.tsx
```

Os nomes podem mudar; a separação de responsabilidades não.

---

# 27. Testes

## Unitários

### Notas

- cinco presets;
- light/dark completos;
- IDs estáveis;
- nenhum dark igual ao light.

### Calendário

- Activity → ViewModel;
- eventos cruzando data;
- all-day;
- tarefas;
- snap 15 min;
- resize;
- timezone;
- recorrência.

### Sazonal

- período ativo/inativo;
- virada de ano;
- Páscoa;
- `periodId`;
- preferência off;
- primeiro acesso;
- reduced motion.

## Integração

- mover atividade;
- resize;
- conflito de revisão;
- `updateFuture`;
- outbox;
- reconexão;
- duas abas editando a mesma atividade.

## Playwright

Viewports:

```text
1440x900
1366x768
1024x768
430x932
390x844
360x800
```

Cobrir:

- notas light/dark;
- Mês;
- Semana;
- Dia;
- drag;
- resize;
- recorrência;
- sazonal;
- reduced motion;
- mobile/desktop.

---

# 28. Evidências

Salvar screenshots focais:

```text
docs/evidence/notes-presets-light.png
docs/evidence/notes-presets-dark.png
docs/evidence/calendar-month-desktop.png
docs/evidence/calendar-week-desktop.png
docs/evidence/calendar-week-mobile.png
docs/evidence/calendar-day-mobile.png
docs/evidence/calendar-overlap.png
docs/evidence/seasonal-christmas-today.png
docs/evidence/seasonal-reduced-motion.png
```

---

# 29. Performance

Antes/depois:

- medir bundle;
- lazy-load de Semana/Dia se biblioteca for pesada;
- não carregar planner em Login;
- não carregar assets sazonais desnecessários;
- nenhum listener sem cleanup;
- nenhuma animação infinita desnecessária.

---

# 30. PWA

Após dependências/assets:

- revisar service worker;
- impedir mistura de CSS velho/novo;
- testar PWA instalada;
- testar update;
- testar offline.

Experiências sazonais não dependem de assets remotos.

---

# 31. Segurança e privacidade

Não adicionar:

- analytics;
- localização;
- API externa de feriados;
- Storage pago;
- dados pessoais novos.

A experiência sazonal é configuração de interface.

---

# 32. Fases de execução

## Fase 0 — Baseline

- lint;
- typecheck;
- build;
- testes;
- screenshots atuais;
- registrar bundle.

## Fase 1 — Notas

- registry;
- schema;
- tokens;
- card;
- editor;
- remover neutralização dark;
- testes;
- Playwright.

## Fase 2 — Spike de calendário

- Schedule-X;
- tema;
- mobile;
- drag;
- resize;
- all-day;
- bundle;
- licença;
- decisão registrada.

## Fase 3 — Arquitetura

- `CalendarView`;
- preferência local;
- `useCalendarRange`;
- ViewModel;
- extrair Month;
- manter zero regressão.

## Fase 4 — Semana/Dia leitura

- Semana;
- Dia;
- all-day;
- tarefas;
- overlap;
- linha atual;
- mobile horizontal;
- acessibilidade.

## Fase 5 — Interação

- criação por intervalo;
- drag;
- resize;
- optimistic rollback;
- conflito;
- recorrência;
- offline;
- duas abas.

## Fase 6 — Sazonal

- registry;
- resolver períodos;
- preferência;
- storage `seen`;
- reduced motion;
- Login;
- Meu dia;
- Calendário;
- Páscoa;
- assets.

## Fase 7 — Auditoria final

- lint;
- typecheck;
- build;
- unit;
- integration;
- E2E;
- Axe;
- zoom;
- PWA;
- service worker;
- mobile real;
- todos os temas.

---

# 33. Gates

Nenhuma fase avança apenas porque “parece funcionar”.

Cada fase precisa:

```text
implementação
+ teste automatizado
+ validação visual
+ documentação
+ ausência de regressão conhecida
```

---

# 34. Política de commits

Exemplo:

```text
feat(notes): add extensible note color presets
test(notes): cover dark note palettes

refactor(calendar): extract range query and view model
feat(calendar): add week and day views
feat(calendar): add time-grid interactions
test(calendar): cover drag resize and recurrence

feat(seasonal): add optional seasonal experiences
test(seasonal): cover periods and reduced motion
```

Nunca misturar as três frentes num mesmo commit.

---

# 35. ADR

Criar após o spike:

`docs/adr/ADR-calendar-renderer.md`

Registrar:

- contexto;
- Schedule-X;
- React Big Calendar;
- opção própria;
- licença;
- bundle;
- mobile;
- acessibilidade;
- decisão;
- consequências;
- estratégia de substituição.

---

# 36. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Planner pesado | lazy-load + spike |
| Biblioteca dominar domínio | adapter/ViewModel |
| Drag perder alteração | expectedRevision + rollback |
| Recorrência errada | diálogo obrigatório |
| Mobile apertado | semana horizontal |
| Notas saturadas | grafite tonalizado |
| Sazonal irritante | preferência + intro única |
| SW velho | revisão/versionamento |
| Timezone errado | Temporal |
| Tarefas falsas | não inventar duração |

---

# 37. Não fazer

Não:

- criar `/planner`;
- gravar direto no Firestore;
- deixar Schedule-X ser fonte de verdade;
- criar hardcodes por tema;
- espalhar presets por componentes;
- usar API externa de feriados na V1;
- usar animação remota;
- ignorar reduced motion;
- transformar tarefa em evento falso;
- esconder conflitos;
- depender apenas de drag;
- implementar tudo ao mesmo tempo.

---

# 38. Definition of Done

Só considerar concluído quando:

- [ ] cinco presets funcionam em light/dark;
- [ ] editor e card compartilham preset;
- [ ] arquitetura aceita novos presets;
- [ ] Mês/Semana/Dia existem;
- [ ] mobile/desktop adequados;
- [ ] all-day no topo;
- [ ] tarefas sem duração artificial;
- [ ] drag funcionando;
- [ ] resize funcionando;
- [ ] criação por intervalo funcionando;
- [ ] recorrência pergunta escopo;
- [ ] conflitos visíveis;
- [ ] offline preservado;
- [ ] sazonal desligável;
- [ ] intro uma vez por período/aparelho;
- [ ] reduced motion respeitado;
- [ ] cinco experiências sazonais registradas;
- [ ] nenhuma decoração bloqueia conteúdo;
- [ ] light/dark/system passam;
- [ ] todas as paletas passam;
- [ ] lint passa;
- [ ] typecheck passa;
- [ ] build passa;
- [ ] unit passa;
- [ ] integration relevante passa;
- [ ] Playwright passa;
- [ ] Axe sem regressão crítica;
- [ ] PWA sem asset stale;
- [ ] documentação final atualizada.

---

# 39. Retomada de trabalho

Ao final de cada sessão, atualizar `CONTINUAR.md`:

```text
Etapa atual:
Último item concluído:
Arquivos alterados:
Testes executados:
Resultado:
Pendência imediata:
Risco conhecido:
Próximo comando/ação:
```

Nunca depender só do histórico do chat.

---

# 40. Resultado esperado

Ao final, o Leve continua sendo o mesmo produto, só mais maduro:

**Notas:** identidade visual preservada em qualquer aparência.  
**Calendário:** passa de consulta mensal para ferramenta real de organização do tempo.  
**Datas especiais:** adicionam personalidade sem virar distração.

A evolução deve parecer natural, como se essas capacidades sempre tivessem pertencido ao Leve.
