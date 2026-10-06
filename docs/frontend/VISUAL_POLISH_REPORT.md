# Refinamento de hierarquia, navegação e Gika

Data: 06/10/2026. Entrada: `main@e3909468f4f4c398ce2dca20f7d0d66d1cfc772e`.
Branch: `refine/visual-hierarchy-components`.

## Pedido e etapas

Executar todas as etapas do relatório estético e integrar na main após revisão
e testes, conforme autorização vigente. ExecPlan:
`.agent/VISUAL_POLISH_EXECPLAN.md`.

| Etapa | Resultado |
| --- | --- |
| Meu dia | Tarefas antes do áudio, cabeçalho/data/semana compactos, filtros e transcrição expansíveis, mês em coluna de apoio no desktop e recolhido no celular. |
| Navegação | Ícones, retrato e rótulos alinhados; sidebar compacta com altura natural e perfil próximo dos atalhos; Mais com estado aberto/atual; footer com divisória e links agrupados. |
| Componentes | Controles com definição compartilhada, raio consistente, alvos das tarefas >=44 px, painéis planos e contraste derivado da paleta. |
| Gika | Acolhimento central, sugestões alinhadas, envio explícito, leitura por divisórias, confirmação por classe semântica, títulos de erro/offline e reflow com rolagem. |
| Revisão | Gate novo de composição/contraste, snapshots e regressões existentes; resultados finais abaixo. |

Nas mesmas fixtures fictícias, a primeira atividade passou de mais de 1.200 px
para aproximadamente 600 px do topo, antes do resumo em áudio.
No celular de 390 px o cartão e suas ações ficam acima da barra inferior.
Em 320×720, o título continua visível e o restante pode exigir rolagem.

Após a revisão do usuário, a sidebar em 1366×900 passou de aproximadamente
840 para 513 px de altura, com largura de 205 px. A altura acompanha seus itens;
em janelas baixas, a própria navegação rola e mantém o perfil alcançável.
O footer organiza marca e descrição, privacidade, termos e saída. No celular,
a descrição fica acima dos links; a reserva inferior acompanha texto a 200%.
As datas da semana permanecem inteiras com texto ampliado; a grade rola dentro
do painel quando precisa de mais espaço, sem transbordar a página.

## Arquitetura

`Today.module.css`, `DailyBrief.module.css` e `TodayAside.module.css` possuem a
composição dessas áreas. `AppShell.module.css` possui navegação, proporções do
shell autenticado e footer. `app.css`
define controles comuns; estilos antigos duplicados foram removidos das camadas
glass/refinements/editorial. O runtime e o CSS do tema usam o mesmo derivado de
tinta escura. Consultas, contagens, data selecionada e handlers reais são reutilizados.

`CalendarDaySheet` reutiliza o conteúdo do dia selecionado. No desktop, é uma
seção; no celular, usa `dialog.showModal()` para controlar foco, tornar o fundo
inativo e devolver o foco ao fechar. Escape, clique fora, redimensionamento e
adição convencional de atividade são cobertos pelo teste novo.
O CI executa o gate novo junto às regressões responsivas; Planner E2E também
acompanha alterações isoladas no componente e CSS do painel do calendário.

Seletores da sidebar foram limitados a seus destinos diretos, para não formatar
links de resultados da Gika como itens de navegação. O destaque de confirmação
usa `gika-confirm-action`, independente da posição do botão. Não há novo writer,
schema, regra de acesso, executor de IA ou dependência. Rig/assets da personagem,
voz, confirmação, cancelar, parar, ACK, recorrência, batch e desfazer preservados.

## Revisão e falhas encontradas

As primeiras execuções do gate novo foram preservadas em cache ignorado. Axe
reproduziu legenda da sidebar com contraste insuficiente no claro. Cores forçadas
mostraram borda do envio sobrescrita e texto original do tema escuro sobre Canvas.
Foram corrigidas regras no módulo da navegação/chat e retirada a regra global
redundante de campos escuros que sobrescrevia o textarea do composer.

O harness novo também recebeu duas correções: aguardar o dialog após carregar o
módulo lazy antes de medir e usar o nome acessível do combobox em vez de comparar
o texto bruto do label que inclui suas opções. Não houve redução de limite de
contraste, tolerância de pixels, revisões, prazo de produto ou política de segurança.

No refinamento adicional, texto a 200% aumentou a barra inferior e encobriu o
footer. A reserva em rem corrigiu o espaço de rolagem. A captura do footer agora
aguarda a tarefa real antes de rolar, evitando registrar o fallback transitório.

A regressão ampla passou inicialmente 85/88. Encontrou datas de dois dígitos
quebrando a 200% e o painel do calendário deixando a navegação de fundo acessível.
As datas receberam largura mínima e rolagem limitada ao painel; o calendário
passou a usar um dialog nativo no celular. A repetição passou nos testes de
reflow e nos 20 cenários de material/contraste. Um corte de poucos pixels na
primeira tarefa em 320 px foi corrigido compactando o espaço entre semana e tarefas.

## Gates

- Lint/limites de arquitetura: PASS.
- TypeScript cliente/servidor e build: PASS, repetidos após os ajustes finais.
- Unitários: 802/802 PASS em 70 arquivos.
- Auditoria de dependências de produção: zero vulnerabilidades.
- Integração Auth/Firestore: 320/320 PASS em 10 arquivos.
- Fluxos críticos Gika: 8/8 PASS com confirmação e ACK reais nos emuladores.
- Gate novo: 5/5 PASS, incluindo regressão do foco do calendário.
- 11 paletas × claro/escuro: Axe sem violações no Meu dia e acolhimento da Gika.
- 320/390/1024/1366 px em claro/escuro: tarefa antes do áudio, título visível,
  ações >=44 px, ausência de transbordamento e estado inicial do mês.
- Filtros, seleção de dia, transcrição, rascunho do formulário, erro, offline,
  texto a 200%, cores forçadas, modo sólido e contraste maior: PASS no gate novo.
- Sidebar em janela baixa, links legais e logout por teclado: PASS.

- Comparação final sem atualizar referências: 34/34 PASS em 8 minutos.
  Inclui os cinco cenários novos, abertura, navegação responsiva, Gika launcher,
  páginas públicas/erros, capturas canônicas, 13 testes do Planner e sete sazonais.
- Reflow e 20 cenários de material/contraste: PASS após as correções encontradas
  na execução ampla. Os outros 85 cenários daquela execução também passaram;
  não declarar a execução inicial como 88/88.
- Versão compilada: 17/17 PASS em autenticação e demonstração.
- Verificação estática de vidro e testes nativos de contraste: PASS.

As referências novas usam Chromium 153 do Playwright 1.63/lockfile e
`--disable-lcd-text`, sem modificar estilos ou tolerâncias. Data fixa em
06/10/2026 e conta emulada isolada; nenhum dado da captura privada do usuário
foi transformado em fixture ou artefato.

## Capturas revisadas

| Área | Referências |
| --- | --- |
| Meu dia | [Desktop](../../tests/e2e-local/visual-polish.spec.ts-snapshots/today-purple-dark-1366-linux.png) · [Celular](../../tests/e2e-local/visual-polish.spec.ts-snapshots/today-purple-dark-390-linux.png) |
| Sidebar e footer | [Desktop](../../tests/e2e-local/visual-polish.spec.ts-snapshots/shell-footer-purple-dark-desktop-linux.png) · [Celular](../../tests/e2e-local/visual-polish.spec.ts-snapshots/shell-footer-purple-dark-mobile-linux.png) |
| Gika | [Celular](../../tests/e2e-local/visual-polish.spec.ts-snapshots/gika-purple-dark-mobile-linux.png) |
| Calendário do dia | [Dialog no celular](../../tests/e2e-local/visual-polish.spec.ts-snapshots/calendar-day-dialog-purple-dark-mobile-linux.png) |

As referências canônicas também cobrem Notas, Compras/formulários, Revisão,
Preferências, Lixeira e demonstração. As suítes responsivas cobrem Busca,
Privacidade, Termos, páginas inexistentes e os demais estados de erro.

## Reproduzir

Com dependências do lockfile e Chromium instalado pelo Playwright:

```sh
npm run lint
npm run build
npm test
npm run test:integration
npm run test:e2e:critical
npm run glass:check
npm run glass:selftest
npm run test:e2e
npm run test:e2e:local -- visual-polish.spec.ts mobile-refinement.spec.ts public-pages.spec.ts gika-launcher.spec.ts agenda-loading.spec.ts frontend-v3-visual.spec.ts calendar-planner.spec.ts calendar-planner-visual.spec.ts seasonal-experience.spec.ts
npm run test:e2e:local -- design.spec.ts glass-material.spec.ts
```

Executar suites locais em sequência: compartilham portas e fixtures dos
emuladores. Na nuvem desta sessão, Chromium vive em
`/tmp/leve-playwright-browsers`; os comandos de browser usaram
`PLAYWRIGHT_BROWSERS_PATH` apontando para esse diretório e
`LEVE_CHROMIUM_EXECUTABLE=` para usar a versão do lockfile. Integração reutilizou
Auth/Firestore já ativos no projeto `demo-leve`, com `test:integration:inside`.

## Limites e publicação

Os testes de browser usam Chromium e dados fictícios. Leitor de tela externo e
aparelho físico não foram repetidos. Esta entrega verifica apresentação e fluxos
existentes; não substitui avaliação do provider real. O aviso conhecido de chunk
grande permanece no build.

Checkpoint atômico: `refine(ui): improve agenda hierarchy, sidebar and footer`.
O PR da branch desta entrega registra revisão, checks do HEAD e integração.
A autorização cobre a main após CI, Planner e Seasonal; conferir o deployment
automático do SHA integrado. Rollback por revert do commit de squash em novo PR,
sem migração de dados. As etapas visuais e a validação local estão concluídas.
