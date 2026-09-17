# ADR 002 — Renderer do calendário avançado

**Status:** aceito  
**Data:** 16/09/2026  
**Decisão confirmada:** 17/09/2026

## Contexto

O Leve evoluiu a rota `/calendario` de uma visão mensal para três visualizações: Mês, Semana e Dia. Semana e Dia usam grade horária, faixa de dia inteiro, tarefas separadas, eventos sobrepostos, criação por intervalo, drag e resize.

O domínio de atividades, recorrência, conflitos, persistência e offline continua pertencendo ao Leve. O renderer recebe apenas um `CalendarEventViewModel` e devolve intenções de interação; ele não acessa Firestore, autenticação nem comandos diretamente.

## Restrições obrigatórias

A solução escolhida precisa:

- funcionar com React + TypeScript + Vite;
- permanecer compatível com custo zero;
- suportar Mês/Semana/Dia, drag, resize e all-day sem recurso premium;
- consumir os tokens de light/dark e paletas do Leve;
- manter uso adequado em mobile;
- não gravar diretamente no Firestore;
- não receber credenciais ou tokens Firebase;
- não decidir recorrência, revisão ou conflitos;
- manter alternativa integral sem drag para acessibilidade;
- ser substituível sem migração de dados.

## Arquitetura de isolamento

```text
Firestore / domínio Leve
          ↓
useCalendarRange()
          ↓
CalendarEventViewModel
          ↓
CalendarTimeGrid
          ↓
intenção de criar / mover / redimensionar
          ↓
comandos do Leve
```

A fonte de verdade continua sendo o domínio persistido.

## Alternativas avaliadas

### Schedule-X

Foi o candidato inicial por oferecer uma API moderna e extensível. A adoção definitiva exigiria adicionar uma dependência relevante apenas para uma parte da interface e adaptar seu modelo de eventos às regras próprias de recorrência, revisão, offline e conflitos do Leve.

### React Big Calendar

Permaneceu como alternativa caso um renderer pronto fosse indispensável, com o mesmo custo de adaptação e de dependência externa.

### Time grid próprio

Foi implementado sobre a camada neutra já existente. A solução cobre somente o que o produto precisa e não adiciona dependência de calendário ao bundle nem uma segunda fonte de verdade.

## Decisão

Adotar **time grid próprio** para Semana e Dia e preservar a visão Mês do Leve.

Motivos:

1. a camada `calendarModel` + `useCalendarRange` já isolava consulta e ViewModel;
2. overlap, segmentação por dia, snap de 15 minutos e cálculos de move/resize puderam ser implementados como funções puras e testadas;
3. não foi necessária dependência externa nem funcionalidade paga;
4. o renderer continua incapaz de persistir por conta própria;
5. recorrência continua explicitamente decidida pela pessoa antes de `activity.updateFuture`;
6. conflito usa `expectedRevision` e não aplica last-write-wins silencioso;
7. offline continua usando a outbox existente;
8. mobile não depende de drag: detalhe e formulário convencional permanecem disponíveis.

## Validação da decisão

A branch de implementação foi validada com:

- auditoria de dependências de produção;
- lint;
- typecheck;
- testes unitários;
- build de produção;
- testes de integração com Auth + Firestore Emulator;
- E2E autenticado em emuladores cobrindo Mês/Semana/Dia, seis viewports, Axe, claro/escuro, movimento reduzido, teclado, criação por intervalo, move, resize, recorrência, conflito de revisão e offline/outbox.

Os testes usam apenas dados fictícios e emuladores.

## Limitações conhecidas

- gestos precisos de criação, move e resize são destinados a mouse/caneta; no touch, o caminho convencional de abrir/criar/editar continua sendo o fallback seguro;
- tarefas sem duração permanecem fora da grade horária e não recebem duração artificial;
- eventos que atravessam dias não oferecem handles em segmentos intermediários;
- o renderer não tenta resolver sozinho horários civis inválidos ou ambíguos: validação de schedule e fuso continua no domínio.

## Consequências

### Positivas

- zero dependência nova de calendário;
- controle completo de acessibilidade e layout responsivo;
- menor acoplamento entre UI e domínio;
- substituição futura possível atrás do mesmo ViewModel.

### Custos

- o Leve passa a manter o código visual da grade horária;
- regressões do Planner precisam de suíte E2E própria;
- novos recursos avançados de calendário exigem implementação explícita, em vez de ativar plugins de terceiros.

## Estratégia de substituição

Se o produto futuramente precisar de recursos que tornem o renderer próprio desproporcional, um novo renderer pode substituir `CalendarTimeGrid` desde que continue consumindo `CalendarEventViewModel` e emitindo intenções para a camada de comandos. Nenhuma migração de Firestore deve ser necessária apenas para trocar a biblioteca visual.
