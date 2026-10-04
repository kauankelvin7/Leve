# Gika — Agent Engineering Pack

Este pacote foi feito para ser colocado na raiz do repositório do **Leve** antes de pedir ao Codex (ou outro agente de programação) para implementar a Gika.

## Como usar

1. Copie todo o conteúdo deste pacote para a raiz do repositório do Leve.
2. Abra o repositório no Codex.
3. Envie somente este comando inicial:

> Leia `AGENTS.md` e `GIKA_START_HERE.md`. Inicie pelo M0 exatamente como definido em `.agent/GIKA_EXECPLAN.md`. Não implemente nenhuma feature antes de concluir o M0, atualizar `.agent/GIKA_STATE.md`, `.agent/GIKA_TASKS.yaml` e registrar as decisões necessárias. Use subagentes apenas conforme o protocolo definido. Continue de milestone em milestone até encontrar um gate que exija decisão humana ou um bloqueio real.

4. Depois disso, o repositório passa a carregar seu próprio estado. Em sessões futuras, basta pedir:

> Continue a implementação da Gika a partir do estado persistido no repositório. Leia `AGENTS.md`, `.agent/GIKA_STATE.md`, `.agent/GIKA_TASKS.yaml`, `.agent/GIKA_EXECPLAN.md` e `.agent/GIKA_DECISIONS.md` antes de agir. Valide o SHA atual e prossiga apenas da próxima tarefa elegível.

## Princípio central

**O repositório é a memória do projeto. O chat não é.**

Nenhuma decisão importante, progresso, bloqueio ou critério de aceitação pode existir apenas no contexto do agente.

## Resultado esperado

A Gika será integrada ao Leve como uma camada de linguagem natural sobre as regras de negócio já existentes:

`Usuário → Gika → tool call → policy → command layer → dados`

A IA interpreta e propõe. O software valida e executa.

## Ordem de entrega

- M0 — auditoria e mapa do repositório
- M1 — shell visual sem IA real
- M2 — agente read-only
- M3 — criação de tarefa
- M4 — edição/conclusão/reagendamento
- M5 — confirmação, recorrência, idempotência e undo
- M6 — organização inteligente por proposta
- M7 — voz
- M8 — proatividade controlada
- M9 — hardening, observabilidade, acessibilidade e release

Nunca pular milestones apenas porque “parece fácil”.
