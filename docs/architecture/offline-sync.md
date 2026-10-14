# Offline e sincronização

O suporte offline combina cache do Firestore, cache de shell do Service Worker, rascunhos locais e outbox. A persistência privada é opt-in por UID e aparelho: a ausência da chave `leve.offlineEnabled.<uid>` equivale a desligado. Preferências antigas sem escopo de conta não concedem consentimento novo.

## Leituras e shell

Com o modo offline ativo quando o Firestore é inicializado, o cliente configura cache persistente com suporte a múltiplas abas em [firebase.ts](../../apps/web/src/platform/firebase.ts). Queries leem snapshots Firestore e identificam conteúdo vindo do cache. A extensão e a duração dos dados disponíveis dependem das áreas consultadas e do cache local. A interface informa que sessão e dados já carregados ficam neste aparelho e recomenda ativar apenas em aparelho confiável.

Em instalações antigas, uma migração limpa somente o cache persistente do Firestore antes de novas consultas privadas. A migração não apaga rascunhos nem comandos locais. Se a limpeza do cache falhar (por exemplo, outra aba ainda o utiliza), a preferência permanece desligada, a falha fica visível e o cliente tenta novamente. Preferências são por conta; o dado remoto não é apagado pela desativação.

O [Service Worker](../../apps/web/public/sw.js) não intercepta `/api/`. Ele tenta carregar navegações pela rede e usa a cópia `/` como fallback; também pode servir recursos estáticos same-origin que já estejam no cache. Isso é diferente do cache privado de documentos do Firestore.

## Outbox convencional

Quando o modo offline está ativo, `sendCommand` pode guardar no IndexedDB comandos elegíveis após uma falha de rede. Comandos de conta e chamadas que definem `queueOnNetworkError: false` não entram nessa fila. O registro é associado ao UID e `operationId`.

Na reconexão, `flushOutbox` processa comandos sob liderança por UID, respeita dependências e remove entradas após resposta aceita. Web Locks é a primeira opção; sem ela, um lease atômico no IndexedDB usa renovação e fencing para impedir que um titular expirado confirme trabalho. Para entradas antigas que ultrapassam 72 horas, consulta o recibo antes de reenviar; sem recibo, interrompe para revisão. A tela de recuperação mostra apenas campos de conteúdo permitidos e exige confirmação antes de remover uma operação que não pode ser reenviada. Isso não autoriza novos caminhos de persistência nem garante que todo tipo de mutação seja enfileirável.

Ao sair ou trocar de conta, o cliente pede confirmação quando existem comandos ou rascunhos; a limpeza local é isolada por UID e revalida uma impressão dos dados dentro da transação antes de removê-los. Sessões de atividade legadas também entram na contagem. Revogação online limpa a sessão e o cache acessível; um aparelho desconectado pode manter cópias locais até voltar à rede ou até o usuário apagá-las.

Implementação: [API e flush](../../apps/web/src/platform/api.ts), [outbox](../../apps/web/src/platform/outbox.ts), [stores IndexedDB](../../apps/web/src/platform/localData.ts) e [regra de reconciliação](../../apps/web/src/platform/outboxPolicy.ts).

## Gika

Os bridges de escrita Gika passam `queueOnNetworkError: false`. A assistente precisa de conexão para solicitar interpretação e enviar uma operação nova; ela não entra na outbox convencional nem executa ações automaticamente quando a conexão volta. O rascunho de conversa tem seu ciclo próprio no cliente. Consulte [arquitetura Gika](gika.md).
