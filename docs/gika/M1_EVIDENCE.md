# M1 — evidências e checkpoints

## M1-S0 — skill oficial

Conteúdo humanizer-br fornecido pelo usuário preservado em .agent/skills/humanizer-br/SKILL.md e lido integralmente. ADR-008, estado/tarefas atualizados, bloqueio removido. Fonte de verdade local; regras originais AGENTS.md sem alteração. Validação documental/git diff --check; testes de código não necessários para este commit documental.

## Ownership e gates

Execução serial: features/gika, integração mínima App.tsx, testes unit/E2E Gika, estado e evidências. M1 sem SDK/provedor, consultas reais ou comandos de agenda. Gate por tarefa: lint, build incluindo typechecks, unit, E2E autenticado focal; no fechamento, screenshots/revisão visual, acessibilidade/isolamento/offline e regressão de navegação. SHA do último commit de tarefa será registrado no checkpoint posterior, sem SHA auto-referente.
