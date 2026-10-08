# Investigar comportamento offline

Separe os mecanismos antes de diagnosticar: o cache Firestore armazena snapshots de documentos; o Service Worker trata shell e recursos same-origin; rascunhos locais e outbox convencional têm regras próprias. Consulte [offline e sincronização](../architecture/offline-sync.md).

1. Confirme se a opção offline está ativa no cliente e se a leitura veio do cache.
2. Para uma página, verifique se há shell/asset previamente armazenado. O Service Worker não intercepta `/api/`.
3. Para uma mutação convencional, confira a elegibilidade em `apps/web/src/platform/outboxPolicy.ts`, o registro associado a UID/`operationId` e a resposta/reconciliação do servidor.
4. Para a Gika, confirme a conexão: operações novas usam `queueOnNetworkError: false` e não entram na outbox convencional.
5. Reproduza com dados fictícios, registre apenas estados técnicos redigidos e não copie payloads privados para evidências.

O modo offline não garante que qualquer consulta ou comando esteja disponível. Não crie fila paralela nem execução automática ao reconectar.
