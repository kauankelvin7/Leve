# M1 — evidências e checkpoints

## M1-S0 — skill oficial

Conteúdo humanizer-br fornecido pelo usuário preservado em .agent/skills/humanizer-br/SKILL.md e lido integralmente. ADR-008, estado/tarefas atualizados, bloqueio removido. Fonte de verdade local; regras originais AGENTS.md sem alteração. Validação documental/git diff --check; testes de código não necessários para este commit documental.

## Ownership e gates

Execução serial: features/gika, integração mínima App.tsx, testes unit/E2E Gika, estado e evidências. M1 sem SDK/provedor, consultas reais ou comandos de agenda. Gate por tarefa: lint, build incluindo typechecks, unit, E2E autenticado focal; no fechamento, screenshots/revisão visual, acessibilidade/isolamento/offline e regressão de navegação. SHA do último commit de tarefa será registrado no checkpoint posterior, sem SHA auto-referente.

## M1-T1 — launcher e painel

GikaLauncher no Shell autenticado, chave por uid, painel lazy e ErrorBoundary local; falha de chunk/render não desmonta Outlet. Dialog nativo com ciclo Tab explícito, Escape, foco restaurado e aviso de simulação. ResizeObserver/MuationObserver com cleanup reserva espaço conforme timer/nav reais (incluindo barra de erro). Nenhuma chamada de Gika à API/banco/provedor.

- npm run lint: PASS. ESLint existente ignora TS/TSX; isso não substitui typecheck/revisão React.
- npm run build: PASS, incluindo typecheck cliente/servidor; aviso baseline >500 kB. Novo painel lazy ~1,77 kB (gzip 0,89 kB).
- npm test: 93 testes / 25 arquivos PASS.
- LEVE_LOCAL_URL=http://localhost:5174 npm run test:e2e:local -- tests/e2e-local/gika.spec.ts: 2 PASS (15,4 s), autenticação/rascunho/navegação/foco/Escape/360x800 + Axe sem violações no painel.
- agent-browser: /entrar carrega, snapshot com campos/login, sem overlay/página vazia nem erros reportados; ambiente emulador local verificado.
- Falhas corrigidas antes do gate: helper de teste não ativava conta fictícia recém-semeada; corrigido para usar fluxo existente. Tab de dialog nativo ia à barra do navegador; ciclo explícito de controles corrigido e protegido por E2E. Nenhuma falha mascarada.
- Revisão manual react-best-practices: imports diretos, lazy, cleanup de observers/listeners, isolamento por uid e sem persistência de conversa. Textos revisados com humanizer-br local.

## M1-T2 — composer e estados

Composer com label visível, 2000 caracteres, sugestões que preenchem rascunho, Enter/Shift+Enter e guarda de composição IME. Histórico limitado a 40 mensagens em memória; mantém texto/conversa ao fechar, App key uid e Protected desmontam no logout/troca de conta. AbortController evita resposta atrasada após fechar/desmontar/offline. Pending request estável impede duplicar pergunta em retry. VisualViewport ajusta altura/top do painel mobile e composer fixo dentro do diálogo; aria-live anuncia somente status/última resposta.

- npm run lint, npm run build (dois typechecks), npm test 93/25: PASS.
- Suite focal 4 cenários: 3 PASS após corrigir locators para textbox (botão e campo têm mesmo nome acessível), 1 falha por dois links Notas. Seletor foi restringido à navigation Principal e o cenário composer/offline foi repetido: 1 PASS (8 s). Todos os quatro cenários cobertos sem falha pendente.
- Axe painel/mobile e teclado/rascunho seguem protegidos nos cenários que passaram. T2 usa adapter indisponível deliberadamente para provar fallback; mock de sucesso será ligado somente M1-T3.
- Textos revisados segundo checklist da skill local. Não há raw error/payload privado em log. Nenhuma escrita ou consulta nova em API/Firebase.

## M1-T3 — mock e isolamento

Mock determinístico de cinco intenções, contratos Zod estritos, delay cancelável e falha injetável em testes. Cancelamento descarta até adapters que ignoram AbortSignal. Retry mantém requestId; texto editado durante resposta é preservado. Não importa rede, Firebase ou comandos.

Gates executados: lint e build/typechecks PASS; 101 unitários/26 arquivos PASS; suite Gika local completa 12 PASS em 2 min, incluindo 33 combinações paleta/appearance + Axe, viewports oficiais, 200%, solid/reduced motion, timer real, erro lazy, offline, IME e troca de conta. Screenshots em evidence/. Revisão visual detectou reflow comprimido; espaçamento mobile corrigido antes do último E2E aprovado. Race de carregamento lazy e atualização de viewport dos testes corrigidas com expectativas de estado, sem desabilitar cenários. Bundle baseline >500 kB permanece; painel lazy ~7,88 kB (gzip 3,03 kB).

O usuário solicitou refinement adicional: M1 permanece aberto até M1-T4 e seus gates.

## M1-T4 — refinement e polimento final

Viewport de conversa com scroll independente e foco de teclado; símbolo SVG próprio compartilhado entre launcher, header, empty state e mensagens. Empty state central com ajuda curta e quatro chips com ícones. Composer de uma linha, expansível até 132 px (64 px em viewport compacta), envio interno, indicação de voz indisponível sem captura de áudio; mantém Enter/Shift+Enter/IME, draft, offline, retry e limite de entrada. Rodapé usa flex-shrink:0; textos aumentados podem deslocar os ícones para a próxima linha. Header menor no mobile, aviso de demonstração discreto, close sem borda, glass sutil e modo sólido/reduced transparency sem blur. Tokens Leve/Nunito/DM Sans preservados.

Componentes de mensagem, loading, erro, resultado de ferramenta, confirmação e undo preparados. A intenção mock “Organizar meu dia” apresenta exclusivamente exemplos explícitos. Confirmar/cancelar/desfazer altera só estado React e mantém foco na ação seguinte. Não há provider, SDK, chamadas IA/voz/API Gika, consultas ou comandos de domínio no recurso. Contrato preview aceita apenas literal organize-demo, rejeita objetos de comando. Textos revisados pela skill oficial local.

### Gates executados

- npm run lint: PASS; limitação existente de ESLint para TS/TSX permanece compensada por ambos os typechecks e revisão manual React.
- npm run build: PASS; painel lazy 12,27 kB (gzip ~4,2 kB), bundle principal baseline >500 kB permanece.
- npm test: 102 testes / 26 arquivos PASS.
- FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_PROJECT_ID=demo-leve npm run test:integration:inside: 28 testes / 3 arquivos PASS, reutilizando emuladores ativos (sem produção).
- npm run test:e2e: suite shell 13 PASS em 33 s. O config padrão expirou porque preview host localhost não atende URL 127.0.0.1 neste executor. Repetido com config temporário preservando todos os cenários e alterando só host para 127.0.0.1 e outputDir isolado; nenhum arquivo de configuração original foi alterado.
- LEVE_LOCAL_URL=http://localhost:5174 npm run test:e2e:local -- tests/e2e-local/gika.spec.ts --output=/tmp/leve-gika-polish-final: 13 PASS em 2,2 min no código final. Inclui 11 paletas × light/dark/system + Axe, viewports 1440/1366/1024/430/390/360 e 360x400, reflow 200%, chips inicialmente visíveis, composer compacto/expansível após reabrir, scroll independente, cards mock/foco e ausência de requests de comandos/IA.
- Regressão ampliada em uma execução serial (Planner core/visual + Gika + sazonal): 32 executados, 27 PASS/5 FAIL. Planner visual 5 PASS; Planner core 3 PASS/4 FAIL; Gika 12 PASS/1 FAIL; sazonal 7 PASS. Falha Gika era comparação antes do layout de resize estabilizar; teste sincronizado com dois animation frames e suite inteira repetida: 13 PASS. Não foram desabilitados ou excluídos cenários. Falhas do Planner investigadas abaixo.
- agent-browser verificou dev server atual: /entrar renderiza login e navegação, sem overlay/erros reportados; snapshot e screenshot em /tmp.

### Correções verificadas durante o refinement

Elementos ocultos absolutos contribuíam para scrollHeight do dialog porque sua referência era o painel. Viewport/field/rodapé agora têm posicionamento local e labels/live-region ocultos ancorados em top/left 0. E2E confirma scrollHeight === clientHeight do dialog e composer imóvel enquanto a conversa rola, incluindo mobile e teclado. Escopo CSS do textarea foi fortalecido para impedir ring de formulário genérico dentro do composer; foco continua indicado pelo campo inteiro. Auto-resize roda novamente após o dialog abrir e limpa o animation frame no cleanup.

Primeira execução em paralelo do shell e Gika disputou test-results e causou ENOENT de trace: diretórios de saída isolados corrigiram o harness. Um teste de scroll inicialmente não gerava conteúdo suficiente no desktop; passou a enviar conversa longa real pelo mock. Todos os erros Gika foram corrigidos antes do gate final, sem afrouxar contratos ou remover testes.

### Revisão visual e de código

Capturas finais revisadas: evidence/m1-desktop-light.png, m1-desktop-dark.png, m1-mobile-dark.png, m1-mobile-reflow.png, m1-conversation-mobile.png, m1-conversation-desktop.png e m1-timer-mobile.png. Mobile/200% mantém composer utilizável e primeira quick action visível. Cards de exemplo usam texto simples escapado, sem HTML do adapter. Revisão react-best-practices: imports diretos, lazy isolado, componentes fora do render, estado local mínimo, cleanup de listeners/RAF, IDs estáveis e nenhuma persistência/contexto cruzado entre contas.

### Pendências de regressão do Planner

A execução ampliada não está integralmente verde. Os arquivos do Planner/Today/estilos e sua suite core são idênticos à base f6b21b6; não foram alterados para contornar o gate. Prova adicional executada numa cópia por git archive da base anterior, servida em localhost:5175 sem Gika (sem worktree, branch, push ou dependências novas). Resultados da comparação registrados no fechamento deste checkpoint.

- Contraste: falha original reproduzida em f6b21b6 sem Gika, executando sequência “compromisso de dia inteiro|planner cria|alteração offline”: 2 PASS/1 FAIL em 33,5 s, mesmo seletor calendar-time-chip.completed, contraste 4,28:1 versus mínimo 4,5:1. Sem item concluído anterior, o cenário passou na base (2 cenários focais PASS em 22,5 s). Problema de contraste preexistente, não corrigido fora do escopo Gika.
- Recorrência: dois cenários tentam selectOption em Frequência sem expandir Mais opções. Prova em evidence/m1-baseline-recurrence.json: na base sem launcher Gika, campo presente e invisível antes do disclosure; visível depois. Hoje/Planner/helper originais idênticos à base. Nenhuma mudança em regras de recorrência ou desabilitação de testes.
- Offline: falhou na sequência ampliada por ausência do feedback esperado. Não reproduzido nas duas execuções focais na base (PASS), nem na repetição focal do código atual: 1 PASS em 11,2 s. Registrar intermitência da suite/gesto com estado compartilhado; causa não foi demonstrada e não se declara correção. Outbox/domínio não foram alterados.

O gate focal M1/Gika está aprovado. A regressão global ampliada conserva três falhas reproduzíveis/explicadas da base e uma intermitência; não é declarada integralmente verde, nem prova de release. M1 visual concluído com essas limitações registradas, conforme protocolo de classificação de baseline e registro de regressões do AGENTS/ExecPlan. M2 permanece todo e não foi iniciado nesta tarefa de polimento.
