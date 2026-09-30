# Gika — Estado persistente

> Este arquivo é atualizado pelo **orquestrador**. Outros subagentes podem sugerir alterações, mas não devem concorrer escrevendo nele.

## Estado atual

- Status global: `IN_PROGRESS`
- Milestone atual: `M0`
- Tarefa atual: `M0-T3`
- Último SHA verificado: `ab35fc545d746af350d646a3ef012b1f79ebc3c3` (HEAD anterior ao commit deste checkpoint)
- Último commit da Gika verificado: `f6b21b6695f4953e28daace00edb05b2dd4bfde1`; checkpoint de M0-T1 identificado no git log pelo ID da tarefa.
- Worktree limpo no último checkpoint: `sim, antes da extração`
- Último gate executado: lint/build (inclui typecheck) e 93 unit PASS; diff --check e revisão documental por tarefa.

## Próxima ação

1. Ler o repositório sem modificar código de produção.
2. Descobrir stack, scripts, modelos de dados, autenticação, regras de negócio, recorrência, offline/outbox e estrutura visual.
3. Atualizar a documentação com fatos verificados.
4. Só então decidir a arquitetura concreta de integração.

## Bloqueios

Checkout ausente na sessão anterior: resolvido pelo clone HTTPS em `/workspace/Leve`.
Branch de trabalho: `feat/gika-integration`.
Investigar disponibilidade de humanizer-br e dos gates locais antes de M1.

## Riscos ativos

- Não assumir que a arquitetura lembrada em conversas corresponde ao estado atual do repositório.
- Não assumir nomes de schemas, rotas, coleções ou comandos sem verificar no código.
- Não adicionar SDK de IA antes de concluir M0.

## Checkpoint de retomada

Ao retomar:

1. `git status`
2. `git rev-parse HEAD`
3. comparar SHA com este arquivo;
4. ler tarefas `in_progress` ou `blocked`;
5. verificar decisões recentes;
6. continuar somente da próxima tarefa elegível.

## Histórico resumido

| Data | Milestone | Tarefa | Resultado | Commit |
|---|---|---|---|---|
| — | — | — | Projeto ainda não iniciado | — |

| 2026-09-30 | M0 | M0-T1 | done: docs/gika/ARCHITECTURE.md: stack, scripts, entradas, base SHA e status; M0_EVIDENCE.md: lint/build/typecheck e 93 unit PASS. | HEAD verificado f6b21b6695f4953e28daace00edb05b2dd4bfde1; commit identificado por M0-T1 |

| 2026-09-30 | M0 | M0-T2 | done: ARCHITECTURE.md: schemas reais Activity/Category/series e rastreio create/update/setStatus/reschedule/trash; evidências M0-T2. | HEAD verificado ab35fc545d746af350d646a3ef012b1f79ebc3c3; commit identificado por M0-T2 |
