# Persistência de dados

## Firestore

O documento `users/{uid}` contém perfil e metadados da conta. Dados de domínio são organizados sob essa raiz:

| Caminho | Conteúdo |
|---|---|
| `users/{uid}/activities/{id}` | Tarefas, compromissos e ocorrências materializadas |
| `users/{uid}/series/{id}` | Modelos e estado de recorrência |
| `users/{uid}/categories/{id}` | Categorias pessoais |
| `users/{uid}/notes/{id}` | Notas |
| `users/{uid}/shoppingLists/{id}/items/{itemId}` | Listas e itens de compras |
| `users/{uid}/timeEntries/{id}` | Registros de tempo |
| `users/{uid}/internal/*` | Metadados internos da conta, como contagens e timer ativo |

A árvore é corroborada por [hooks de leitura](../../apps/web/src/features/content/useUserCollection.ts), [Rules](../../firestore.rules) e [comandos](../../server/commands/content.ts). Campos e schemas pertencem a [packages/domain/src/content.ts](../../packages/domain/src/content.ts); consulte-o para não tratar esta tabela como schema completo.

## Dados de serviço

Existem também documentos fora da raiz do usuário para associação e operação: `memberships/{uid}`, `commandReceipts/{uid}_{operationId}`, `serviceControls/global`, buckets de uso, jobs de lembrete, registros de token/dispositivo e recibos de manutenção. Eles são usados por handlers do servidor; não são uma API de leitura irrestrita para o cliente.

Os caminhos e os campos podem variar por comando. Veja [Firebase Rules](../../firestore.rules), [commands/content.ts](../../server/commands/content.ts), [identity.ts](../../server/commands/identity.ts) e [reminders.ts](../../server/reminders.ts).

## Propriedade e consistência

Os comandos derivam a raiz `users/{uid}` da identidade verificada, validam os dados e mantêm metadados de revisão. Referências como categoria e itens de lista são verificadas no escopo da mesma conta pelo comando responsável. A documentação não substitui schemas nem regras de cada operação.

O browser também guarda dados locais opt-in em IndexedDB para sessão, rascunhos e comandos pendentes. Veja [offline e sincronização](offline-sync.md); esses dados locais não são a autoridade remota.
