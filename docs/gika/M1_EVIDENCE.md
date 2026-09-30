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
