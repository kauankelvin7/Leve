# ADR 002 — Renderer do calendário avançado

**Status:** proposto / decisão pendente de spike  
**Data:** 16/09/2026

## Contexto

O Leve vai evoluir a rota `/calendario` de uma visão mensal para três visualizações: Mês, Semana e Dia. Semana e Dia terão grade horária, faixa de dia inteiro, eventos sobrepostos, criação por intervalo, drag e resize.

O domínio de atividades, recorrência, conflitos, persistência e offline continuará pertencendo ao Leve. Uma biblioteca externa, se adotada, será somente renderer de interface.

## Restrições obrigatórias

A solução escolhida deve:

- funcionar com React + TypeScript + Vite;
- ter licença compatível com custo zero do projeto;
- não exigir funcionalidade premium para Mês/Semana/Dia, drag, resize ou all-day;
- aceitar customização completa para os tokens de light/dark e paletas do Leve;
- manter uso aceitável em mobile;
- permitir lazy loading da parte avançada;
- não gravar diretamente no Firestore;
- não receber credenciais, tokens Firebase ou dados fora do intervalo necessário;
- não decidir recorrência, revisão ou conflitos;
- permitir alternativa integral sem drag para acessibilidade;
- ser substituível sem migração de dados.

## Arquitetura de isolamento

```text
Firestore / domínio Leve
          ↓
useCalendarRange()
          ↓
CalendarEventViewModel
          ↓
renderer de calendário
          ↓
eventos de interação
          ↓
comandos do Leve
```

O renderer nunca será fonte de verdade.

## Candidatos

### Schedule-X

Candidato inicial para o spike por oferecer integração moderna com frameworks e arquitetura extensível.

### React Big Calendar

Alternativa caso o primeiro candidato não atenda responsividade, acessibilidade, bundle ou funcionalidades gratuitas.

### Time grid próprio

Fallback caso bibliotecas introduzam dependência excessiva, limitações de licença ou dificuldade de adaptação ao design system.

## Spike obrigatório

Antes de instalar uma solução de forma definitiva, criar prova descartável que verifique:

1. renderização de Mês, Semana e Dia;
2. faixa de dia inteiro;
3. eventos sobrepostos;
4. drag;
5. resize;
6. uso por teclado;
7. comportamento mobile;
8. customização light/dark e temas;
9. `prefers-reduced-motion`;
10. tamanho adicional de bundle;
11. necessidade de plugins extras;
12. licença de todos os pacotes utilizados.

## Gate de segurança

Nenhum spike poderá:

- usar dados reais de outra conta;
- remover o isolamento `users/{uid}`;
- afrouxar `firestore.rules`;
- elevar os limites de listagem acima de 50 sem nova análise;
- introduzir escrita direta no Firestore;
- registrar conteúdo privado em telemetria ou logs.

O spike deve usar dados fictícios/local emulator sempre que interação de escrita for necessária.

## Estado atual

Nenhuma biblioteca de calendário avançado foi instalada por esta decisão.

A preparação interna já deve existir antes do spike:

- query de calendário por intervalo isolada;
- ViewModel neutro;
- cálculo testado dos limites de Mês/Semana/Dia;
- limite de query compatível com as regras do Firestore.

## Decisão final

Pendente. Após o spike, este ADR deverá mudar para **aceito** ou **rejeitado**, registrando:

- renderer escolhido;
- versão fixada;
- licença;
- impacto de bundle;
- limitações conhecidas;
- estratégia de substituição.
