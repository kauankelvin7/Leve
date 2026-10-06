# Front-end V3 — relatório desta etapa

**Branch:** `refactor/frontend-design-system-v3`

**Base:** `origin/main` em `457e4283b80b82d1d208817a1b384b16df9fa4e1`
**Registro:** entrega iniciada a partir dessa base; acompanhe commits e integração no histórico Git associado.

## O que mudou

- Shell mobile agora mostra quatro destinos prioritários mais Gika; Revisão e Lixeira ficam no menu nativo `Mais`, acessível por teclado e com alvos de toque de 44 px. O cabeçalho deixou de repetir “Meu espaço” nas páginas raiz.
- `PageHeader` compartilha o padrão entre Meu dia, Calendário e Preferências sem alterar rotas ou lógica. CSS Modules isolam o menu secundário, os estados de erro e o layout das páginas legais.
- Aliases de tokens semânticos cobrem superfícies, texto, ação, foco, status, espaçamento, raio, sombra e movimento. Os valores de tema continuam sendo fornecidos pelo CSS/runtime existente para não mudar aparência de paletas por acidente.
- Compras separa lista (`Shopping.tsx`) e detalhe (`ShoppingDetail.tsx`); `ShoppingItemsSection` apresenta os grupos e encaminha ações ao owner. Meu dia separa `ActivityComposer`, `ActivityAgenda`, `TodayActivityRow` e `TodayOverview`; recebem estado e callbacks explícitos sem consultar o Firebase ou construir comandos. `Today.tsx` reduziu de 772 para 418 linhas.
- Continuação: `TodayAside` agora apresenta calendário mensal, nota fixada e resumo de compras por meio de props e callbacks. `Today.tsx` permanece responsável pelas consultas e regras de calendário e está com 400 linhas. O teste visual captura o aside completo.
- CSS do aside: estilos únicos de layout responsivo, painel mensal, resumo/ações e composição do resumo de compras migraram das folhas globais para `TodayAside.module.css`. As classes globais de `.note`, `.panel` e `.agenda-aside` permanecem porque Notes e Demo também dependem delas, além dos temas e presets de notas. Playwright registra estilos computados e snapshots em quatro combinações de viewport e tema.
- Compras: estilos exclusivos de `ShoppingItemsSection` passaram para `ShoppingItemsSection.module.css`, preservando as classes compartilhadas com Demo, listagem de Compras e Lixeira. Playwright cobre vazio, erro 503, offline com outbox, pendente, concluído, removido, Demo e detalhe desktop/mobile escuro.
- O fluxo offline revelou que o formulário permanecia preenchido após confirmar o salvamento local e permitia reenviar o mesmo item. `ShoppingDetail` agora limpa o formulário quando a outbox confirma a fila; o teste aguarda a sincronização e valida uma única cópia.
- Estados 400, 401, 403, 404, 500, 502 e 503 usam a composição responsiva comum. O 404 foi capturado e conferido em desktop e celular.
- Privacidade recebeu largura de leitura e navegação legal compartilhadas. `/termos` foi adicionado com as mesmas convenções visuais; as duas páginas se ligam entre si e ao acesso.
- Quatro regras CSS sem uso após estas mudanças foram removidas. Playwright mantém nove capturas das telas centrais e adiciona capturas de 404 desktop/celular, Privacidade e Termos.

## Verificação

Baseline anterior às mudanças: lint, typecheck, build, 802 testes unitários, 320 testes de integração com emuladores e teste visual responsivo passaram. Nesta etapa visual, as mudanças não alteraram contratos de dados ou comandos.

Gates finais executados nesta branch:

- `npm run lint` — passou; fronteiras arquiteturais verificadas.
- `npm run typecheck` — passou.
- `npm run build` — passou. Continua o aviso preexistente de chunk principal (~1,09 MB) e Three.js (~522 kB); não foi feita divisão de bundle sem medição de uso.
- `npm test` — 802 testes em 70 arquivos passaram.
- Playwright com Chromium do sistema — `frontend-v3-visual.spec.ts` passou após a extração do aside e compara snapshots sem atualização. A captura de acompanhamento revisada fica em `test-results/visual-walkthrough/today-aside-desktop-light.png`; o diretório de percurso é ignorado pelo Git.
- Validação desta etapa: lint, typecheck, build, 802 testes unitários e os três testes Playwright focais (design/Axe, percursos visuais e páginas públicas/erros) passaram sem atualizar snapshots. O cenário visual restaura paleta verde/modo claro antes de começar, para não depender dos testes que rodaram antes. O build mantém o aviso preexistente de bundle principal grande.
- Axe roda nos destinos do teste público, além de checagem de overflow; o teste existente segue verificando navegação em diferentes viewports e texto a 200%.

## Capturas revisadas

- [`frontend-v3-visual.spec.ts-snapshots`](../../tests/e2e-local/frontend-v3-visual.spec.ts-snapshots): Today claro desktop/escuro mobile, Calendário desktop/mobile, Notas, Compras, Preferências e Gika desktop/mobile.
- [`public-pages.spec.ts-snapshots`](../../tests/e2e-local/public-pages.spec.ts-snapshots): 404 desktop/mobile, Privacidade e Termos.

## Limites e próxima etapa arquitetural

A auditoria contou 4.272 linhas nas folhas globais principais após remover regras comprovadamente sem uso. O número de declarações repetidas e `!important` não é prova suficiente para apagar estilos: camadas em cascata, valores hardcoded, tokens sobrepostos e overrides precisam de comparação de estilo computado antes de consolidação. Não foi feita migração global para CSS Modules ou cascade layers.

Today ainda coordena estado, consultas e persistência do planner; Compras mantém editor e mutações no detalhe. Gika não teve comportamento ou estilos internos alterados.

## Continuação — formulário de itens em Compras

- Layout exclusivo de inclusão/edição do item está em `ShoppingItemComposer.module.css`. As capturas Playwright validam o formulário vazio no desktop e a edição com unidade personalizada em desktop/mobile; os snapshots mantiveram a aparência anterior.
- As classes compartilhadas `content-form`, `optional-fields-content` e `shopping-composer-heading` continuam globais. A migração preservou seus espaçamentos e valores responsivos medidos pelas comparações visuais.
- Cancelar edição agora restaura a unidade padrão. O cenário Playwright cobre editar com unidade `outra`, cancelar e adicionar um novo item.
- A espera por dados carregados estabilizou os snapshots do aside de Meu dia; o teste de refinamentos foi ajustado para abrir `Mais páginas` antes de acessar a Lixeira no mobile.
- Validação após esta continuação: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` (802 testes), `frontend-v3-visual.spec.ts` e `refinements.spec.ts` passaram. As capturas ficam em `test-results/visual-walkthrough/` (ignorado); os snapshots canônicos permanecem versionados.
- Layout exclusivo do formulário de criação/edição de listas agora está em `ShoppingListComposer.module.css`. O foco de “Nova lista” usa uma referência React estável em vez de consultar o nome da classe CSS.
- A comparação visual inicialmente encontrou 2 px a mais abaixo do título. A inspeção de especificidade mostrou que a regra global `> div:first-child` preservava 18 px; o módulo mantém o valor renderizado. O Playwright voltou a passar sem atualizar snapshots, inclusive cinco capturas específicas do formulário.
- O percurso agora verifica opções de tipo somente durante criação, foco automático, criação, cancelamento sem alteração e edição/salvamento sem duplicar listas. As capturas desktop/mobile ficam em `test-results/visual-walkthrough/` (ignorado).
- Validação desta continuação: `LEVE_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e:local -- frontend-v3-visual.spec.ts` — passou sem atualização de snapshots.
- Os seletores sem consumidores citados acima foram removidos. Nesta continuação, estilos exclusivos de Notas passaram para `Notes.module.css`; estilos dos filtros, dias em foco/hover e folha móvel do Calendário passaram para `Calendar.module.css`. Classes e superfícies compartilhadas (`.note`, presets, `.calendar-day`, `.calendar-agenda` de base, grade mensal e navegação por dia) permaneceram nas folhas globais.
- A comparação visual encontrou uma diferença de 3 px na altura total da página de Notas após a extração, sem alteração de alinhamento ou conteúdo; a captura foi revisada e registrada. Os filtros móveis do Calendário e a folha aberta foram conferidos em viewport real. Quatro referências afetadas (Calendário mobile, Notas desktop e Preferências desktop/mobile escuro) foram regravadas depois da revisão e passaram em nova execução estrita sem atualização.
- Removidas de `app.css` as seis declarações de espaçamento repetidas que já existem em `design-tokens.json`; não houve consolidação de paletas ou valores de cores.
- A suíte unitária encontrou uma asserção de foco presa ao arquivo global anterior. Ela agora confere o anel localizado em `Settings.module.css`; os 802 testes passaram.

## Verificação final desta continuação (2026-10-06)

- `npm run lint` — passou; fronteiras arquiteturais: 55 fontes TypeScript.
- `npm run typecheck` e `npm run build` — passaram. Permanece o aviso de chunks já existente: entrada ~1,09 MB e Three.js ~522 kB.
- `npm test` — 802 testes em 70 arquivos passaram.
- `frontend-v3-visual.spec.ts` — passou no modo de comparação estrita, sem atualizar snapshots.
- `calendar-planner-visual.spec.ts` e `refinements.spec.ts` — 7 testes passaram, incluindo seis larguras, os três modos do planner, Axe, teclado, movimento reduzido e Navegação/Notas/Lixeira.
- Integração com emuladores não foi repetida: nesta continuação só mudaram CSS, classes de apresentação e o teste estático de propriedade do foco.
- As capturas de acompanhamento revisadas ficam no diretório ignorado `test-results/visual-walkthrough/`; as referências visuais são versionadas com os testes.

O snapshot visual usa Chromium 151 já instalado porque o download do navegador empacotado pelo Playwright foi bloqueado neste ambiente. `LEVE_CHROMIUM_EXECUTABLE=/usr/bin/chromium` configura a execução local sem mudar o padrão de outras máquinas.

## Fechamento — Busca, Demo e detalhe de atividade (2026-10-06)

- Estilos de resultados da Busca, cartões da Demo e detalhe/histórico de tempo da atividade foram movidos para `Search.module.css`, `Demo.module.css` e `ActivityDetail.module.css`. Regras compartilhadas como `.search-field`, `.timer-*`, `.panel` e categorias das notas seguem globais.
- O layout manual de tempo agora vence a regra genérica de formulário que forçava `display: grid`; Playwright verifica `.manual-time` em flex e as entradas do histórico em grid.
- O cenário visual reseta a conta local antes do snapshot estrito, estabilizando conteúdo entre testes, e confere os estilos calculados de Busca e Demo em desktop/mobile e claro/escuro.
- A revisão não encontrou uma fronteira segura para consolidar todas as folhas globais ou substituir o registry/runtime de cores. Os módulos preservam a separação entre estilo exclusivo da feature e classes consumidas por mais de uma feature.
- Atualização de segurança: `package-lock.json` agora resolve `proxy-addr` 2.0.8, compatível com as faixas declaradas pelos dependentes. `npm audit --omit=dev --audit-level=moderate` encontrou zero vulnerabilidades de produção.

## Preparação para revisão e envio à `main`

- `npm run lint`, `npm run typecheck`, `npm run build` e `npm test` passaram; os unitários totalizam 802 testes em 70 arquivos. O build ainda emite os avisos de tamanho de bundle já observados (entrada ~1,09 MB; Three.js ~522 kB).
- Integração passou com 320 testes em 10 arquivos ao reutilizar os emuladores ativos. `npm run verify` não completou como comando agregado porque sua tentativa de iniciar emuladores duplicados encontrou as portas Auth/Firestore já ocupadas.
- `npm run test:e2e:critical` passou com 8 testes; `npm run test:e2e` passou com 17. A suíte Playwright local completa passou com 179/179 em 28,6 minutos, incluindo páginas públicas/erros, fluxos persistentes, refinamentos, sazonalidade e timer.
- A rodada completa também validou os dois ajustes nos próprios testes: o teste de tema agora não espera um aviso quando a opção desejada já está selecionada e inicia o percurso em um tema oposto para provar a mudança; a checagem de Notas usa o contêiner do título sem depender da estrutura interna do cabeçalho.
- `npm run verify` não concluiu como agregado porque o comando tentou iniciar Auth/Firestore Emulator nas portas já ocupadas. Seus gates foram executados separadamente: auditoria, lint, typecheck/build, unitários, integração contra emuladores ativos e E2E crítico passaram.
