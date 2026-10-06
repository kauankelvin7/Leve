# Auditoria Front-end V3

## Escopo e baseline

- Branch de trabalho: `refactor/frontend-design-system-v3`.
- SHA inicial: `457e4283b80b82d1d208817a1b384b16df9fa4e1` (`origin/main`).
- Checkout limpo antes do trabalho; acesso Git de leitura confirmado.
- Referências lidas: `AGENTS.md`, `DESIGN.md`, `CONTINUAR.md`, plano técnico de UI/UX, `docs/AGENT-SETUP.md`, `README.md`, `design-tokens.json`, `packages/domain/src/themes.ts` e os manifests/lockfiles.
- `05-capacidade-e-revisao.md`, citado por `AGENTS.md`, não existe neste checkout.

Baseline executado antes de alterações de produto:

| Comando | Resultado |
| --- | --- |
| `npm run lint` | PASS; limites arquiteturais: 55 fontes TypeScript |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; aviso existente de chunk de entrada com ~1.08 MB e módulo Three.js com ~522 kB |
| `npm test` | PASS; 802 testes em 70 arquivos |
| `npm run test:integration` | PASS; 320 testes em 10 arquivos com Auth/Firestore Emulator |
| `npm run test:e2e:local -- design.spec.ts` | PASS; Chromium 151 do sistema, paletas, calendário, Axe e viewports |

Os comandos de emulador usam `FIREBASE_EMULATORS_PATH=/tmp/leve-firebase-emulators` porque o caminho padrão em `/home/agent/.cache` não existe neste ambiente. Para o Playwright, `LEVE_CHROMIUM_EXECUTABLE=/usr/bin/chromium` seleciona o Chromium fornecido pela máquina. O suporte opcional ao executável customizado foi adicionado a `playwright.local.config.ts`; sem a variável, permanece a resolução de navegador padrão do Playwright.

## Estado atual

O frontend preserva React, TypeScript, Vite e o domínio existente. O shell concentra autenticação e rotas em `App.tsx`; as páginas ficam em features e a linguagem visual se distribui por cinco folhas globais importadas em sequência, além do CSS próprio da Gika.

Medições reprodutíveis no baseline:

- `apps/web/src/styles`: 4.247 linhas nas cinco folhas globais principais; `refinements.css` tem 2.023 linhas e `app.css`, 1.589.
- 249 usos de `!important`, 46 blocos `@media` e 379 ocorrências de cores literais/funções de cor nessas folhas.
- A ordem global é `app.css`, `glass.css`, `refinements.css`, `editorial.css`, `theme-runtime.css`, em `apps/web/src/main.tsx`.
- `Today.tsx` tem 772 linhas e reúne estado, consultas e apresentação. `Shopping.tsx` mantém listagem e detalhe no mesmo módulo.
- O shell lista seis destinos de navegação mais Gika; no mobile a regra reserva sete colunas, esconde os rótulos e mantém todos os destinos juntos.
- `design-tokens.json`, variáveis base de `app.css`, temas de `packages/domain/src/themes.ts` e as declarações de tema em `theme-runtime.css` têm responsabilidades parcialmente sobrepostas. A equivalência campo a campo ainda precisa ser provada antes de remover valores.
- `tests/e2e-local/design.spec.ts` cobre paletas, calendário, Axe e dimensões responsivas. Foram adicionados snapshots canônicos com `toHaveScreenshot` para as páginas centrais e páginas públicas.

## Achados e severidade

| Severidade | Achado | Arquivos afetados | Direção |
| --- | --- | --- | --- |
| Alta | Folhas globais extensas e carregadas em sequência fazem o resultado depender de overrides posteriores e especificidade. | `app.css`, `refinements.css`, `glass.css`, `editorial.css`, `theme-runtime.css`, `main.tsx` | Consolidar por domínio visual com prova de estilo computado e screenshots; manter fallbacks de acessibilidade. Não introduzir layers sobre a cascata atual sem migração medida. |
| Alta | A navegação mobile comprime sete destinos em uma barra sem rótulos persistentes. | `App.tsx`, `refinements.css`, `editorial.css` | Priorizar quatro páginas e Gika; mover Revisão/Lixeira a um acesso secundário sem remover rotas. Cobrir teclado e tamanhos pequenos. |
| Média | Cabeçalhos de página repetem estrutura e convenções de classes com ações/elementos auxiliares específicos. | `Today.tsx`, `Calendar.tsx`, `Notes.tsx`, `Shopping.tsx`, `Settings.tsx`, `Trash.tsx`, `Review.tsx` | Criar uma primitiva opcional com slots para contexto e ações; migrar páginas aos poucos preservando markup acessível e seletores existentes. |
| Média | Tokens de cor, borda, raio e sombra estão espalhados entre JSON, CSS estático e runtime de temas. | `design-tokens.json`, `app.css`, `theme-runtime.css`, `themes.ts` | Definir a fonte por categoria e validar os valores efetivos de todas as paletas antes de eliminar duplicação. |
| Média | `Today.tsx` tem muitas responsabilidades; lista e detalhe de compras compartilham módulo. | `Today.tsx`, `Shopping.tsx` | Extrair composição de apresentação apenas onde existir fronteira estável, sem mover mutações, queries ou domínio. |
| Média | Há cobertura de acessibilidade/layout, mas nenhuma comparação visual canônica versionada. | `tests/e2e-local/design.spec.ts`, configuração Playwright | Adicionar um conjunto curto de snapshots autenticados e determinísticos; usar estados fictícios/emuladores e atualizar snapshots somente após revisão visual. |
| Baixa | O build passa com aviso de chunk grande, incluindo o bundle de Three.js. | Vite chunks e imports da Gika/3D | Medir importação e execução antes de otimizar; não dividir bundles apenas para silenciar o aviso. |

## Contratos que não podem mudar

Auth/Firestore, Rules e isolamento por conta; comandos, `expectedRevision`, idempotência e receipts; HMAC/confirmações; cache/outbox/offline; recorrência e calendário; timer; notas/compras; Gika/Rive; PWA; importação/exportação; preferências de tema; navegação por teclado, reduced motion/transparency, forced/high contrast, safe area e zoom de texto a 200%. Testes de integração com emuladores são obrigatórios quando uma mudança alcançar esses limites.

## Plano incremental

1. **Auditoria:** registrar evidências, contratos e uma ordem de migração segura.
2. **Foundation:** estabelecer nomes semânticos e validar origem/uso dos tokens; migrar uma categoria por vez sem reescrever a cascata inteira.
3. **Shell:** extrair a primitiva de cabeçalho onde os slots correspondam e reduzir a navegação primária mobile preservando Revisão/Lixeira.
4. **Features:** decompor Today e Shopping em componentes de apresentação com propriedade explícita de estado e acessibilidade.
5. **Visual regression:** snapshots pequenos para as páginas/temas/viewport pedidos, junto dos testes Axe e overflow existentes.
6. **Cleanup:** remover regras somente após confirmar ausência de uso e comparar estilos computados/snapshots.
7. **Páginas públicas e estados de erro (etapa final, pedido do usuário em 2026-10-05):** revisar 404 e demais erros, Privacidade, Termos e páginas públicas correlatas. O screenshot enviado mostra a 404 com layout quase sem composição e desalinhado com o shell. Fazer esta etapa somente depois das outras fases da refatoração V3 e registrar screenshots/validação próprios.

Cada etapa funcional deve rodar lint, typecheck, build, unitários e os testes Playwright focais. Integração com emuladores entra quando a alteração alcançar dados, autenticação, comandos, Rules ou offline. Não adicionar bibliotecas sem necessidade comprovada.

## Implementação visual V3 nesta branch

- Tokens: aliases semânticos foram adicionados sobre os valores já usados em runtime (surface, field, texto, ação, foco, status, spacing, radius, shadow e motion). `app.css` e `theme-runtime.css` continuam responsáveis pelos valores efetivos por paleta/modo; o JSON e o registry não foram removidos pois equivalência integral ainda não foi demonstrada.
- CSS por domínio: CSS Modules agora contêm os menus secundários do shell, os estados de erro e o layout externo de informações legais. Removidas três regras de workspace e uma regra de cartão de erro que ficaram comprovadamente sem correspondência após a mudança de markup.
- Cabeçalhos: `PageHeader` compartilha eyebrow/título/descrição/ações e mantém os seletores existentes; migrados Meu dia, Calendário e Preferências. Outras páginas têm estruturas com slots e hierarquias diferentes e não foram forçadas na mesma abstração.
- Fronteiras de feature: a lista e o detalhe de Compras são módulos de rota separados (`Shopping.tsx` e `ShoppingDetail.tsx`). `ShoppingItemsSection` apresenta itens ativos/concluídos/removidos e encaminha ações ao owner. Em Meu dia, `TodayComposer`, `ActivityAgenda`, `TodayActivityRow` e `TodayOverview` separam o formulário, a agenda/filters, as linhas e o resumo dos handlers de persistência. `Today.tsx` passou de 772 para 418 linhas; estado, consultas e mutações permanecem na página.
- Shell: navegação primária mobile tem quatro páginas mais Gika; Revisão e Lixeira ficam no disclosure `Mais` acessível por teclado e links de toque de 44 px. O rótulo repetido “Meu espaço” foi retirado das páginas raiz. Privacidade e Termos estão no rodapé autenticado.
- Erros e conteúdo público (etapa final): 404 e demais estados usam uma composição compartilhada responsiva em CSS Module. Privacidade tem max-width e rodapé legal alinhados, e `/termos` foi criado com a mesma linguagem visual e rota pública.
- Regressão visual: nove capturas autenticadas para Today, Calendar, Notes, Shopping, Settings e Gika, e quatro capturas públicas (404 desktop/mobile, Privacidade e Termos). Axe e overflow são verificados no teste público; o teste existente mantém a checagem de texto em zoom de 200%.
- Limite arquitetural deliberado: não foi adicionada cascade layer, não houve consolidação geral das cinco folhas globais e Today/Shopping não foram decompostos nesta passada. As páginas existentes misturam markup, estado e mutações; migrá-las em bloco aumentaria risco funcional sem uma fronteira de apresentação provada. Fazer inventário e extração com casos visuais/funcionais próprios antes de remover CSS global.
- Gika: comportamento, contratos e estilos internos não foram alterados; permanece coberta visualmente em desktop/mobile. A paleta visual segue o tema do Leve.

O download do Chromium empacotado pelo Playwright foi bloqueado pela política de rede; as verificações usam o Chromium 151 instalado na máquina por meio de `LEVE_CHROMIUM_EXECUTABLE=/usr/bin/chromium`.

## Estado de implementação e retomada

- Fase A e gates baseline completos.
- Foundation semântica parcial, primitiva compartilhada aplicada às três páginas com estrutura equivalente; navegação simplificada e verificada.
- Páginas públicas/erro concluídas por último conforme pedido e cobertas por screenshots e Axe.
- Execução visual final em 2026-10-05: `design.spec.ts`, `frontend-v3-visual.spec.ts` e `public-pages.spec.ts` passaram (3 testes); 404/Privacidade/Termos e screenshots estão conferidos.
- Na etapa seguinte de decomposição, lint/typecheck/build e 802 testes passaram; Playwright comparou Today e abriu/capturou o formulário, criou lista, abriu detalhe e adicionou/capturou item. As capturas de acompanhamento ficam ignoradas em `test-results/visual-walkthrough/`; os snapshots canônicos seguem versionados.
- Continuação em 2026-10-05: o aside de Meu dia foi extraído para `TodayAside.tsx` com propriedades de apresentação e callbacks; Today mantém consultas e lógica de calendário e passou a 400 linhas. Inventário CSS identificou o layout mensal e seus controles como exclusivos; `.agenda-aside`, `.panel` e `.note` continuam compartilhados com Demo, Notas, temas e presets dinâmicos.
- Nesta etapa, layout responsivo do aside, painel mensal, resumo/ações e composição do cartão de compras migraram para `TodayAside.module.css`; removidas as regras equivalentes de `editorial.css` e `refinements.css`. A coleta Playwright salva estilos computados do aside para desktop/mobile e tema claro/escuro em `test-results/visual-walkthrough/` (diretório ignorado); snapshots versionados cobrem as quatro combinações. Os valores observados incluem aside em duas colunas no breakpoint intermediário, uma coluna em 390px, resumo horizontal em desktop e vertical no celular. A aparência dinâmica dos cartões de notas foi mantida nas folhas compartilhadas.
- Continuação em Compras: estilos exclusivos de `ShoppingItemsSection` migraram para `ShoppingItemsSection.module.css`: superfície da seção, linha/conteúdo do item, vazio, pendentes e detalhes concluídos/removidos. Permanecem globais `.shopping`, `.shopping-item`, `.shopping-progress`, `.panel` e `.trash-list`, compartilhados com Demo, listagem de Compras e Lixeira.
- O percurso Playwright captura vazio, falha 503, uso offline com outbox, itens pendentes, concluídos e removidos, desktop/mobile escuro e Demo. A fila offline expôs um caso de duplicação possível: o formulário continuava preenchido depois de o comando ser salvo localmente. `ShoppingDetail` agora limpa o formulário na confirmação da outbox; o cenário valida que apenas uma cópia aparece após sincronizar.
- Continuação no formulário de item: os estilos exclusivos de layout do formulário de inclusão/edição passaram para `ShoppingItemComposer.module.css`. `content-form`, `optional-fields-content` e `.shopping-composer-heading` seguem globais porque são compartilhados com outras composições. O CSS Module conserva os valores computados da cascata existente; screenshots do formulário vazio e da edição com unidade personalizada passaram sem alteração visual em desktop/mobile.
- A verificação da unidade personalizada encontrou que cancelar uma edição mantinha a unidade selecionada no próximo formulário. `ShoppingDetail` agora volta para `un`; o percurso visual confirma o cancelamento e adiciona o próximo item com sucesso.
- O snapshot do aside espera a conclusão do carregamento de atividades antes da captura, evitando registrar o estado transitório. Os snapshots agora representam os dados carregados. O teste existente de refinamentos acessa Lixeira abrindo `Mais páginas` no mobile, em linha com a navegação atual.
- Layout exclusivo do formulário de listas foi migrado para `ShoppingListComposer.module.css`. Uma referência `useRef` substitui a busca DOM baseada em classe ao iniciar lista nova. Playwright preservou snapshots de página e componentes após corrigir a diferença de 2 px causada pela especificidade de uma regra antiga `:first-child` que efetivamente aplicava 18 px ao título.
- O fluxo visual agora cobre opções de tipo, foco, criação, cancelamento de edição, salvamento do título e retorno ao mesmo detalhe sem duplicar lista. `frontend-v3-visual.spec.ts` passou sem atualização de snapshots em 2026-10-05.
- Continuação em 2026-10-06: a migração de estilos exclusivos por página de Revisão, Lixeira, Preferências, Notas e partes de Calendário foi concluída. Notas preserva globais os cartões e presets compartilhados; Calendário mantém globais a grade/dias e a agenda de base, enquanto filtros, interações de hover e folha móvel pertencem a `Calendar.module.css`.
- A reconciliação de tokens removeu somente seis declarações `--space-*` duplicadas de `app.css`. `design-tokens.json`, já injetado por `main.tsx`, segue como fonte para esses valores; cores, paletas, registro de temas e a ponte de primeiro paint não foram alterados.
- A auditoria identificou que a asserção unitária do anel de foco ainda procurava a regra removida de `app.css`. `tests/unit/design-quality.test.ts` agora verifica o foco geral em `app.css` e o anel das opções de tema em `Settings.module.css`.
- Verificação final em 2026-10-06: lint, typecheck, build e 802 testes unitários passaram. `frontend-v3-visual.spec.ts` passou sem atualização de snapshots na execução estrita após revisão; `calendar-planner-visual.spec.ts` e `refinements.spec.ts` passaram (7 testes), incluindo Axe, teclado, movimento reduzido, overflow e seis viewports. Os snapshots atualizados ficam em `tests/e2e-local/frontend-v3-visual.spec.ts-snapshots/`.
- O build ainda reporta os chunks grandes preexistentes (entrada ~1,09 MB e Three.js ~522 kB). Integração com emuladores não foi repetida nesta continuação visual: não houve alteração em autenticação, dados, comandos, Rules ou sincronização offline.

Nesta entrega não restam migrações pendentes da lista de rotas acordada. A consolidação geral das cinco folhas globais permanece fora desta fase: regras compartilhadas, temas e presets ainda dependem de avaliação por contexto, então cada remoção exige prova de uso e regressão própria.

## Fechamento arquitetural — 2026-10-06

- Busca, Demo e o painel de detalhe da atividade também foram extraídos para `Search.module.css`, `Demo.module.css` e `ActivityDetail.module.css`. Foram removidas das folhas globais as regras exclusivas desses layouts; `.search-field`, `.timer-*`, `.panel`, estilos de notas e classes de categoria continuam globais por terem consumidores compartilhados.
- A revisão de estilo computado encontrou que `.content-form form { display: grid }` sobrepunha o layout flex pretendido de `.manual-time`. O módulo agora expressa a especificidade da composição de atividade diretamente e o teste de sessão confirma o layout flex, histórico em grid e composição responsiva.
- O teste visual do V3 agora restaura os dados locais antes da captura, evitando variação de altura provocada por eventos criados em execuções anteriores. Ele verifica também estilos computados de Busca e Demo (desktop/mobile, claro/escuro), além dos snapshots centrais.
- `proxy-addr` foi atualizado somente no lockfile de 2.0.7 para 2.0.8 após `npm audit` apontar vulnerabilidade crítica na versão anterior. `npm audit --omit=dev --audit-level=moderate` passou depois da atualização, sem vulnerabilidades de produção.
- `npm run verify` não concluiu como agregado: primeiro parou no alerta de segurança corrigido acima; na nova execução, o comando de `emulators:exec` encontrou Auth/Firestore já ativos nas portas padrão. A integração executada diretamente contra os emuladores existentes passou com 320 testes em 10 arquivos.
- A rodada Playwright local completa passou com 179/179 casos em 28,6 minutos. A primeira rodada tinha revelado duas esperas frágeis: o perfil já estava no modo escuro, então o teste aguardava um aviso de uma mudança que não ocorreu; e a asserção de Notas dependia de um seletor estrutural anterior à extração do cabeçalho. Os testes agora lidam com o estado já selecionado e medem o contêiner do título acessível; os 8 casos focais passaram antes da rodada completa.
- Revisão final dos módulos manteve o owner de consultas, estado e persistência nas páginas de rota; componentes extraídos recebem props e callbacks. Não foi criada uma abstração adicional para regras que continuam compartilhadas, nem foram alterados contratos de dados.
