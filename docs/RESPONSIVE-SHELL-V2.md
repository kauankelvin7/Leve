# Responsive Shell v2

## Objetivo

Ajustar o shell do Leve para aproveitar telas grandes sem perder densidade em notebook, tablet e mobile. Esta camada é somente de apresentação: não altera domínio, comandos, Firestore, autenticação, calendário ou persistência.

## Breakpoints

| Faixa | Navegação | Intenção |
| --- | --- | --- |
| < 740 px | navegação inferior existente | mobile |
| 740–959 px | rail de 84 px | tablet / janela estreita |
| 960–1199 px | sidebar compacta | notebook |
| 1200–1599 px | sidebar regular | desktop |
| >= 1600 px | sidebar ampla + workspace expandido | monitor grande |
| >= 2240 px | shell centralizado em até 2240 px | ultrawide |

O shell usa largura máxima de 2240 px. Em 1920 px ele ocupa praticamente todo o viewport; em ultrawide, preserva margens para evitar linhas de leitura excessivas.

## Contrato para a Gika

A camada expõe duas custom properties sem implementar comportamento do agente:

- `--shell-agent-width`: largura visual sugerida para o painel da Gika;
- `--shell-floating-edge`: alinhamento de superfícies flutuantes com o shell.

A integração da Gika deve consumir estes tokens quando entrar nesta branch, sem duplicar breakpoints.

Direção recomendada:

- >= 1720 px: Gika pode usar sidecar persistente, se houver espaço real;
- 1100–1719 px: painel lateral sobreposto;
- < 1100 px: sheet/fullscreen conforme a composição existente da Gika.

Esses modos não são implementados nesta branch porque o código da Gika permanece isolado em `feat/gika-integration`.

## Segurança de escopo

Não foram alterados:

- `POST /api/commands`;
- Auth/Firestore;
- outbox;
- recorrência;
- planner;
- timer;
- dados ou schemas.

A mudança fica isolada em CSS do shell, import e testes E2E de geometria/reflow.

## Validação esperada

Matriz principal:

- 390x844;
- 853x1280;
- 1024x768;
- 1366x768;
- 1920x1080;
- 2560x1440.

Critérios:

- zero overflow horizontal;
- sidebar compacta em 853 px;
- conteúdo principal não esmagado;
- shell aproveita 1920 px;
- shell centraliza e limita 2560 px;
- rotas principais preservam reflow.

A integração final com a Gika deve repetir esta matriz mais os testes próprios do painel do agente.
