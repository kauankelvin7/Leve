# GOAL #01 — revisão do diff e regressões

## Procedimento

A revisão inicial do código identificou quatro lacunas: reassociação concorrente do mesmo token FCM; `account.import` e registro de notificação sem exigência de e-mail verificado; conteúdo inacessível após expiração de comando; e sessão de atividade legada ausente da contagem de limpeza. As correções e os testes de regressão correspondentes estão nesta branch.

A revisão interna pós-correção percorreu persistência e migração, isolamento por UID, troca de conta, transações, leases, recibos, notificações, autorização, quota Gika, HMAC/replay, logs e compatibilidade. Ela não substitui a aprovação independente de outro mantenedor, que ainda está pendente.

## Achados e fechamento

| Achado | Evidência da revisão | Correção e regressão | Estado |
|---|---|---|---|
| Contas A/B podiam registrar simultaneamente o mesmo token FCM e ambas ficarem ativas. | Transação antiga lia tokens anteriores fora da transação de escrita; concorrência reproduzida na revisão inicial. | Lock documental `notificationTokenOwners/{hash}` dentro da transação; integração com registro paralelo de duas contas comprova um único token/dispositivo ativo e contagens coerentes. | Resolvido e testado |
| Importação e cadastro de push aceitavam token com e-mail não verificado; registro ignorava modo restrito/cotas comuns. | Dispatch permitia esses caminhos e controle era desigual em relação às outras mutações. | `requireActiveVerifiedAccount`, modo normal e buckets compartilhados no registro; integração cobre 403/503 e revogação permitida em conta não verificada/restrita. | Resolvido e testado |
| Comando com mais de 72h sem receipt ficava bloqueado, sem recuperação legível do conteúdo. | O fluxo parava no conflito e oferecia apenas nova tentativa. | UI lista campos permitidos, texto de nota, sem metadados de transporte; remoção individual confirmada; teste E2E cobre cópia, cancelamento e remoção. | Resolvido e testado |
| Limpeza não contava sessão antiga em `localStorage`. | `sessionLifecycle.ts` mantém registros UID-scoped sob `leve.activitySession.*`. | Inclusão na contagem, impressão e limpeza condicionada a UID/valor; E2E limpa a sessão própria e mantém sessão válida de outra conta. | Resolvido e testado |
| Firestore local cache podia ser iniciado por ausência de chave e chave global legada. | Divergência reproduzida entre código, README e arquitetura. | Opt-in `leve.offlineEnabled.<uid>`, migração pré-query, aviso e retry; E2E prova preferência desligada e conteúdo local preservado. | Resolvido e testado |
| Lease fallback e transação podiam declarar sucesso antes do commit e liderança antiga continuar após expiração. | Fallback anterior dependia de localStorage e transação resolves em request success. | Lease IDB com fencing e promises ligadas ao fim da transação; E2E determinístico nas duas abas e abort real. | Resolvido e testado |

## Compatibilidade e dados

- Não foi alterado envelope público, schema de entidade, identidade do usuário ou algoritmo de revisão. O upgrade do IndexedDB é aditivo para lease; store legada `outbox` é removida após a migração v4 existente, com teste para não ressuscitar entradas enviadas.
- A preferência mudou de global/implicitamente ativa para chave explícita por UID. A chave global é mantida como sinal de legado para UI e não é convertida em consentimento. Nenhum draft/outbox é eliminado pela migração.
- Novos estados server-only: `usageBuckets/{uid}_gika_recovery`, `maintenance/internalTickReplay` e `notificationTokenOwners/{sha256(token)}`. Rules testadas continuam negando leitura/gravação do cliente nas coleções internas.
- `clearFirestorePersistence` pode falhar enquanto outra aba/instância usa o cache. A falha não marca a migração concluída nem descarta outbox/drafts; UI orienta fechar outras abas e tentar novamente.

## Resultado da revisão interna

Na revisão interna do diff publicado no HEAD de código `34098ca`, não foi encontrado bloqueador P0/P1 comprovado restante. Os gates desse HEAD passaram. Isso não encerra a revisão exigida: outro mantenedor
precisa conferir o HEAD final do PR. WAF, controle volumétrico na borda, secrets,
IAM e disponibilidade de Firestore/Gemini reais dependem de ambiente externo e
continuam fora desta validação.
