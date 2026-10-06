# Refinamento visual — 06/10/2026

## Objetivo

Executar as etapas do relatório estético: Meu dia, navegação, componentes e Gika.
Revisar as demais telas, testar e integrar à main conforme autorização vigente.

## Contexto atual

Entrada: `main@e3909468f4f4c398ce2dca20f7d0d66d1cfc772e` (PR #20 integrado).
Branch: `refine/visual-hierarchy-components`. React/TypeScript/Vite, identidade
Nunito/DM Sans e onze paletas. O relatório encontrou excesso de altura antes das
tarefas, navegação desalinhada, perfil com destaque de seleção, CSS concorrente
nos controles e pouca distinção entre leitura e confirmação no chat.

## Não objetivos

Esta entrega não altera domínio, persistência, Auth, Rules, contratos de IA,
personagem/rig, recorrência, outbox, dependências ou avaliação de provider real.
Pendências operacionais históricas da Gika continuam registradas separadamente.

## Contratos

- Comandos reais, revisões, idempotência, confirmações, ACK e desfazer existentes.
- Datas civis/fuso e consultas bounded existentes.
- Foco, teclado, alvos de toque, safe areas, texto ampliado, modo sólido,
  movimento reduzido e cores forçadas.
- CSS global define controles e tokens; CSS Modules possuem layout dos componentes.
- Sugestões da Gika preenchem o rascunho; somente envio explícito inicia um pedido.

## Passos e ownership

1. Meu dia: `Today*`, `ActivityAgenda`, `DailyBrief` e seus módulos CSS. Tarefas
   antes do áudio, semana compacta, mês em coluna de apoio e recolhido no celular.
2. Navegação: `App`, `AppShell.module.css`, `SecondaryNavigation`. Alinhamento
   comum, perfil tonal, atalhos discretos e estado do menu Mais. Pedido posterior
   acrescentou sidebar com altura natural, limite de rolagem em janela baixa e
   footer com marca discreta, divisória e links agrupados. Validar saída e rodapé
   acima da barra inferior, inclusive com texto a 200%.
3. Controles: estilos compartilhados e runtime de tema. Remover regras duplicadas
   e cores fixas de contraste; preservar 44 px e foco.
4. Gika: apresentação em `GikaPanel`, `GikaComposer`, `GikaMessage`, classes de
   confirmação e `gika.css`. Hierarquia de leitura/execução e reflow.
5. Revisão e gates. Executor único após limite de uso dos auditores paralelos.
   Regressões encontraram quebra das datas a 200% e foco escapando do painel
   móvel do calendário. Corrigir com grade de largura mínima/rolagem interna e
   dialog nativo, reutilizando o conteúdo e os handlers convencionais.
6. Documentação, commit, PR, checks do HEAD candidato e merge autorizado.

## Gates

Lint/boundaries, TypeScript/build, unitários, integração Auth/Firestore sequencial
com browser. Playwright novo de composição e contraste, snapshots canônicos,
regressões de comandos Gika, Planner e sazonal. Referências atualizadas somente
depois de inspecionar diferenças intencionais; preservar tolerâncias.

## Rollback

Reverter o commit desta entrega em nova branch/PR. Nenhuma migração ou alteração
de dados exige rollback. Não usar reset destrutivo ou force push.

## Evidências e retomada

Implementação das quatro áreas e revisão das proporções concluídas. Lint/boundaries,
build, 802 unitários e 320 integrações PASS. O gate visual novo passou5/5; os oito
fluxos críticos de comandos também passaram. Os novos gates reproduziram falhas de contraste
da legenda da sidebar e de cores forçadas no chat; corrigidas no módulo dono.
O footer ficou encoberto pela navegação inferior com texto a 200%; corrigida a
reserva inferior usando rem. A captura aguarda conteúdo carregado antes de rolar.
Resultados, capturas revisadas e limites consolidados em
`docs/frontend/VISUAL_POLISH_REPORT.md`. Comparação final34/34 PASS sem atualizar
referências, incluindo Planner13/sazonais7; compilado17 PASS. Checkpoint atômico:
`refine(ui): improve agenda hierarchy, sidebar and footer`. Publicação autorizada
após checks do HEAD no PR; consultar o PR e deployment do SHA integrado.

Regressão ampla: 85/88 na primeira execução; falhas de reflow/contraste acima
reproduzidas e corrigidas. Reflow e 20 cenários de material passaram na repetição;
comparação final inclui um quinto cenário de foco, Escape, backdrop, resize e
adição de atividade no painel do calendário. Nenhum limite foi relaxado.
