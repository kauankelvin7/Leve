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
