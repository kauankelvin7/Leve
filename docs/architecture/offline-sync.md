# Offline e sincronização

O suporte offline combina cache do Firestore, cache de shell do Service Worker, rascunhos locais e outbox. A opção de uso offline é controlada no cliente; não é ativada por padrão.

## Leituras e shell

Com o modo offline ativo quando o Firestore é inicializado, o cliente configura cache persistente com suporte a múltiplas abas em [firebase.ts](../../apps/web/src/platform/firebase.ts). Queries leem snapshots Firestore e identificam conteúdo vindo do cache. A extensão e a duração dos dados disponíveis dependem das áreas consultadas e do cache local.

O [Service Worker](../../apps/web/public/sw.js) não intercepta `/api/`. Ele tenta carregar navegações pela rede e usa a cópia `/` como fallback; também pode servir recursos estáticos same-origin que já estejam no cache. Isso é diferente do cache privado de documentos do Firestore.

## Outbox convencional

Quando o modo offline está ativo, `sendCommand` pode guardar no IndexedDB comandos elegíveis após uma falha de rede. Comandos de conta e chamadas que definem `queueOnNetworkError: false` não entram nessa fila. O registro é associado ao UID e `operationId`.

Na reconexão, `flushOutbox` processa comandos sob liderança por UID, respeita dependências e remove entradas após resposta aceita. Para entradas antigas que ultrapassam 72 horas, consulta o recibo antes de reenviar; sem recibo, interrompe para revisão. Isso não autoriza novos caminhos de persistência nem garante que todo tipo de mutação seja enfileirável.

Implementação: [API e flush](../../apps/web/src/platform/api.ts), [outbox](../../apps/web/src/platform/outbox.ts), [stores IndexedDB](../../apps/web/src/platform/localData.ts) e [regra de reconciliação](../../apps/web/src/platform/outboxPolicy.ts).

## Gika

Os bridges de escrita Gika passam `queueOnNetworkError: false`. A assistente precisa de conexão para solicitar interpretação e enviar uma operação nova; ela não entra na outbox convencional nem executa ações automaticamente quando a conexão volta. O rascunho de conversa tem seu ciclo próprio no cliente. Consulte [arquitetura Gika](gika.md).
