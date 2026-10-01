# Gika Character — Integration Plan

## Objetivo

Entregar a personagem da Gika sem interferir no fechamento funcional do M5 e sem criar dívida estrutural.

## Sequência oficial proposta

```text
M5-T4
→ M5 closure/smoke
→ shell responsivo estabilizado
→ C1 Character Foundation
→ M6
```

## Regra de paralelismo

Enquanto M5 estiver em andamento, esta branch pode conter apenas:
- documentação;
- referências visuais;
- especificações;
- assets isolados que não sejam consumidos pelo app.

Não alterar runtime do produto até o fechamento de M5.

## C1-T1 — Character Bible

Entregáveis:
- identidade visual;
- personalidade;
- tom de voz;
- silhueta;
- proporções;
- expressões;
- poses;
- regras de comportamento;
- anti-padrões.

Gate:
- revisão visual humana;
- consistência entre avatar, busto e corpo inteiro;
- aprovação da identidade-base.

## C1-T2 — Asset mestre + Rive rig

Entregáveis:
- vetor mestre;
- turnaround;
- artboards;
- rig;
- state machine;
- fallback SVG;
- animações iniciais:
  - idle;
  - blink;
  - hello;
  - thinking;
  - clarify;
  - confirm;
  - success;
  - celebrate;
  - attention;
  - error;
  - offline/resting.

Gate:
- rosto e silhueta permanecem reconhecíveis;
- transições sem pop;
- mobile legível;
- reduced motion planejado;
- tamanho do asset medido.

Observação: a autoria final do arquivo `.riv` exige ferramenta compatível com Rive. Não declarar rig concluído apenas com mocks ou imagens.

## C1-T3 — Character State Engine

Implementar após M5.

Entregáveis:
- tipos de estado;
- eventos;
- reducer/controller;
- provider/hook React;
- fallback;
- testes unitários;
- isolamento do domínio.

Critério:
- nenhum evento carrega conteúdo privado;
- modelo não escolhe animação;
- character engine não importa command/server/persistence.

## C1-T4 — Product Integration

Ordem:
1. launcher;
2. painel vazio;
3. request/thinking;
4. clarify;
5. confirmation;
6. success/conflict/error;
7. onboarding/empty states;
8. milestones selecionados.

Cada ponto entra com teste e revisão visual.

## Spike técnico Rive

Antes da integração completa:
1. instalar runtime somente na branch dedicada;
2. renderizar asset dummy/local;
3. medir bundle;
4. confirmar lazy loading;
5. confirmar cleanup;
6. confirmar reduced motion;
7. verificar mobile;
8. testar falha de carregamento;
9. remover spike caso critérios não sejam cumpridos.

O spike não deve tocar command layer.

## Integração com shell responsivo

A branch de personagem não deve incorporar o trabalho visual responsivo “no escuro”.

Depois de ambos estarem estáveis:
- usar uma branch de integração;
- trazer primeiro o shell responsivo;
- resolver tokens/layout;
- depois trazer Character Foundation;
- executar regressão visual completa.

## Merge strategy sugerida

Durante o desenvolvimento paralelo:
- `feat/gika-integration`: domínio e milestones funcionais;
- `design/gika-character-foundation`: personagem;
- `feat/responsive-shell-v2`: shell visual.

Após checkpoints:
1. criar branch de integração a partir da linha funcional aprovada;
2. trazer apenas commits relevantes do shell;
3. gates;
4. trazer commits de Character Foundation;
5. gates;
6. prosseguir M6.

Não fazer merge cego de branches com ancestrais antigos.

## Gates mínimos da integração de personagem

- lint;
- typechecks;
- build;
- unit;
- E2E da Gika;
- Axe;
- light/dark;
- 390×844;
- 768/853 tablet;
- 1366×768;
- 1920×1080;
- 200% zoom;
- reduced motion;
- offline/fallback;
- abrir/fechar painel repetidamente;
- medir bundle e abertura.

## Critérios de parada

Parar imediatamente se:
- Character code toca server/commands;
- altera Rules;
- altera receipts/revisions;
- força alteração no contrato do modelo;
- adiciona persistência;
- cria dependência obrigatória no bootstrap;
- quebra shell sem fallback;
- M5 ainda estiver sendo alterado nos mesmos arquivos.

## M6

M6 deve consumir Character State Engine já pronto.

Exemplo:

```text
Gika propõe plano
→ UI mostra proposta
→ character = thinking/presenting

usuário confirma
→ existing safe execution
→ ack
→ character = success
```

A personagem nunca substitui preview, confirmation ou resultado estruturado.
