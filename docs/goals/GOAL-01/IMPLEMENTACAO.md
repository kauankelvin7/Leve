# GOAL #01 — implementação

## Política offline e privacidade local

- A preferência agora é `leve.offlineEnabled.<uid>` e exige valor explícito `true`. A chave global antiga não habilita persistência em contas novas nem troca de conta.
- Antes de consultas privadas, o cliente limpa uma vez o cache persistente Firestore legado, ainda que a instalação não tenha a preferência antiga. O marcador só muda após sucesso; falhas persistem como aviso e podem ser tentadas novamente.
- Rascunhos, outbox e sessão de usuário ficam em stores separadas e não são apagados pela migração do cache Firestore. Com offline desligado, novos drafts ficam em `sessionStorage`; drafts legados continuam legíveis para recuperação.
- Preferências descrevem armazenamento local e contam pendências, rascunhos e sessões legadas. Desativar offline com pendências é bloqueado; logout e remoção local mostram conteúdo e consequência antes de descartar. Exclusão de conta também exige confirmação local.
- A limpeza usa UID, compara a impressão das linhas dentro da transação IndexedDB e remove chaves temporárias só se o valor ainda for o mesmo. Uma nova alteração concorrente aborta a remoção. Logout/troca de UID limpam cache de sessão e Firestore; 401/403 e membership revogada impedem reaproveitar sessão em cache.

## Outbox e sincronização

- Transações IndexedDB só resolvem após `oncomplete`; abort/erro são propagados, `onversionchange` fecha a conexão e `onblocked` não é tratado como sucesso.
- Banco local versão 5 adiciona leases por UID. A aquisição é transacional, renovação preserva dono/token, expiração permite sucessor, e fencing impede o antigo líder de confirmar ou remover depois da perda. Web Locks continua sendo usado quando disponível.
- `operationId` idêntico só aceita payload canonicamente idêntico e mantém idade/conteúdo originais; reuso divergente é rejeitado. Migração v4 remove store antiga sem ressuscitar comandos já enviados.
- Flush valida UID após espera por token, guarda de liderança antes e depois da chamada, formato/escopo/revisão do recibo e só então remove a linha. Conteúdo antigo consulta recibo; ausência exige revisão.
- A corrida de descarte identificada na revisão independente foi eliminada: `removeCommand` adquire liderança da outbox antes de remover, impedindo remoção desordenada durante o envio com feedback explicativo para o usuário; internamente, o loop de `flushOutbox` revalida no IndexedDB se o comando ainda está na fila antes de emitir a chamada de rede, descartando itens já removidos por outra aba e executando a remoção pós-envio via `deleteOutboxEntry` sob a guarda do líder ativo.
- A tela de recuperação lista apenas campos de conteúdo allowlisted e converte o documento de nota em texto simples. Não mostra UUIDs, credenciais, assinaturas ou campos arbitrários; remoção individual requer leitura, checkbox e confirmação.
- O resíduo de sessão legada sem consentimento é limpo por `clearLegacySessionCache()` durante a migração inicial de privacidade e em limpezas de persistência, sem afetar rascunhos ou outbox.

## Segurança operacional

- Recuperação de recibos Gika usa bucket Firestore por UID compartilhado entre instâncias, com 12 chamadas/10 s, 60/min e 600/dia. Estado inválido/falha do Firestore fecha em modo seguro; as rotas de recuperação não chamam o modelo.
- O tick mantém validação HMAC/timestamp e reserva, antes dos jobs, o digest da assinatura em `maintenance/internalTickReplay`. Replays recebem conflito; a transação falha fechada; o registro é limitado a 128 claims ativos e não guarda o segredo.
- Registro de notificação exige e-mail verificado, conta ativa, modo normal e as mesmas cotas de mutação por UID. Revogação continua permitida para permitir desligar um dispositivo. Um documento interno chaveado por hash serializa propriedade de token; reassociação revoga o token/dispositivo anterior na mesma transação e a exclusão de conta só remove owner que ainda pertence à conta.
- Importação de conta exige conta ativa e e-mail verificado antes de interpretar arquivo ou escrever.
- Não foram adicionados logs de conteúdo/token. Não houve alteração em Firebase/Vercel/Cloudflare, regras externas, segredos ou produção.

## Arquivos e contratos

Não foram alterados schemas públicos de comandos, payloads remotos de domínio ou contratos de `operationId`, `expectedRevision` e recibos. Os documentos `usageBuckets/{uid}_gika_recovery`, `maintenance/internalTickReplay` e `notificationTokenOwners/{sha256(token)}` são estado operacional server-only. A implementação não muda a arquitetura Firebase/Firestore nem habilita persistência privada por padrão.
