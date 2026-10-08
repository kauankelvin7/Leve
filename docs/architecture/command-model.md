# Modelo de comandos

## Envelope

Os tipos compartilhados estão em [packages/domain/src/identity.ts](../../packages/domain/src/identity.ts). O envelope contém:

- `command`: nome da ação suportada;
- `operationId`: UUID da tentativa lógica;
- `entityId`: entidade afetada ou identidade definida pelo comando;
- `expectedRevision`: revisão esperada quando a operação altera uma entidade existente;
- `payload`: dados validados pelo schema do domínio;
- campos opcionais para dependências e contratos específicos da Gika.

Criações convencionais começam com revisão esperada `0`; atualizações de entidade comparam a revisão atual. O schema permite ausência de `expectedRevision` em envelopes genéricos, por isso a exigência depende do tipo de comando e de seu handler. Operações especializadas, como atualização de séries e manutenção, têm regras próprias.

## Caminho de escrita

`sendCommand` envia JSON a `/api/commands`. O servidor verifica Firebase ID token, valida schema e despacha a [camada de comandos](../../server/commands/). O cliente Firestore não tem permissão de gravação nas coleções de domínio segundo [firestore.rules](../../firestore.rules).

As operações de conteúdo em `contentCommand` usam transação Firestore: leem estado da conta, recibo e entidade, validam revisão/referências e então gravam o item e recibo. Há handlers especializados para operações como séries e exclusão permanente; cada fluxo deve ser lido no código antes de afirmar que usa o mesmo conjunto de campos ou lifecycle.

## Revisão e conflito

Quando o handler exige revisão, o valor recebido precisa corresponder à entidade lida na transação. A diferença retorna `REVISION_CONFLICT`, sem aplicar a atualização com base numa versão antiga. A revisão é incrementada no commit de atualizações de entidade. O cliente preserva rascunhos nos conflitos de edição convencionais.

## Idempotência por recibo

Para as operações que gravam recibo, a chave é composta pelo UID autenticado e `operationId` em `commandReceipts`. O servidor guarda hash canônico do envelope e a resposta. Repetir a mesma operação com o mesmo conteúdo pode devolver `alreadyApplied`; reutilizar o mesmo ID com conteúdo diferente é conflito (`OPERATION_MISMATCH`). Isso previne duplicação da operação coberta pelo recibo, não promete execução “exactly once” para efeitos externos como push.

O código não define neste fluxo um TTL geral de recibos. Ciclo de vida, recuperação e exceções variam por tipo de operação. Não presumir expiração ou retenção universal.

## Fontes

- [Schema de envelope e resultado](../../packages/domain/src/identity.ts)
- [Dispatcher HTTP](../../server/app.ts)
- [Comandos de conteúdo e recibos](../../server/commands/content.ts)
- [Hash de comando](../../server/commands/identity.ts)
- [Contrato de outbox](offline-sync.md)
