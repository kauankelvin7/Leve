# Adicionar um comando de domínio

A escrita convencional segue `sendCommand` no cliente, `POST /api/commands` e os handlers em `server/commands/`. O contrato compartilhado fica em `packages/domain/`; as regras de escrita do cliente estão em [`firestore.rules`](../../firestore.rules). A [arquitetura de comandos](../architecture/command-model.md) descreve as fronteiras.

1. Identifique o handler dono do domínio e a forma de persistência existente antes de desenhar outro fluxo.
2. Defina schema, identidade, autorização e validações junto do handler apropriado.
3. Preserve `operationId`, revisão quando exigida e o comportamento de recibo do handler. Não presuma retenção universal ou atomicidade entre operações.
4. Mantenha escritas nas coleções de domínio na API; o cliente não grava diretamente nelas.
5. Cubra resultados aceitos, repetição, conflito e escopo de autorização com testes no nível adequado.
6. Atualize arquitetura ou ADR quando a mudança altera uma fronteira ou decisão duradoura.

Para mudanças em regras, consulte [alterar regras do Firestore](changing-firestore-rules.md). Revise [CONTRIBUTING](../../CONTRIBUTING.md) e [AGENTS](../../AGENTS.md) antes de abrir o pull request.
