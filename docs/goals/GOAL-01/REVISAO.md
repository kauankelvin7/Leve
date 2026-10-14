# GOAL #01 — revisão independente e regressões

## Procedimento

Uma revisão read-only anterior, realizada sem editar a implementação, comparou a branch com a base e encontrou quatro lacunas concretas: reassociação concorrente do mesmo token FCM; `account.import`/registro de notificação sem exigência de e-mail verificado; conteúdo de comando expirado sem caminho acessível de recuperação; sessão de atividade legada ausente da contagem de limpeza. As correções foram implementadas e ganharam testes.

Após o pedido de não delegar agentes, a revisão final foi feita pelo agente principal em uma passada separada sobre o diff completo. As áreas verificadas foram: privacidade/migração, isolamento UID e troca de conta, transações/leases/recibos, regras de notificação, autorização sensível, quota Gika, HMAC/replay, logs e compatibilidade de dados. O revisor read-only inicial encerrou antes de emitir uma segunda aprovação pós-correção; esta limitação fica registrada e não é descrita como uma nova aprovação por pares.

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

## Parecer

Não encontrei bloqueador P0/P1 comprovado restante no diff final. Todos os novos gates locais e focais relevantes passaram. A proteção por IP/WAF, controle volumétrico antes do Express, credenciais/secrets, IAM e disponibilidade de Firestore/Gemini reais dependem de ambiente externo e permanecem fora desta revisão local; estão listados no relatório final. A revisão pós-correção de outra pessoa não foi realizada por causa da instrução explícita de não delegar.
