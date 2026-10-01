# Gika — Security & Policy

## Threat model mínimo

### Prompt injection em dados
Uma tarefa pode conter texto como “ignore instruções anteriores”.
Conteúdo de tarefa é dado, não instrução.

Mitigação:
- separar mensagens por papel/canal;
- nunca concatenar dados do banco como pseudo-system prompt;
- allowlist de tools;
- policy determinística.

### Tool abuse
O modelo pode tentar chamar ferramenta indevida.

Mitigação:
- ferramenta inexistente = impossível;
- autorização no servidor/camada segura;
- policy independente do LLM;
- validação de payload.

### ID spoofing
O modelo não pode escolher arbitrariamente IDs pertencentes a outro usuário.

Mitigação:
- resolver IDs dentro do escopo autenticado;
- validar ownership antes de mutar.

### Replay/retry
Rede ou modelo pode repetir chamada.

Mitigação:
- idempotency key;
- deduplicação;
- atomicidade quando aplicável.

### Data overexposure
Enviar contexto excessivo ao provedor.

Mitigação:
- contexto mínimo;
- buscar apenas período/tarefas necessários;
- evitar logs completos de prompts quando não forem necessários.

### Secret exposure
Nenhum segredo deve estar no bundle cliente ou em logs.

## Policy Matrix inicial

| Categoria | Default |
|---|---|
| Consultas | allow |
| Criar item simples | allow |
| Concluir item único | allow |
| Editar item único | allow/confirm por impacto |
| Reagendar item único | allow/confirm por impacto |
| Ação em lote | confirm |
| Exclusão | confirm |
| Alteração de recorrência | confirm + scope |
| Conta/segurança | deny/fluxo dedicado |

## Confirmação

Confirmação deve estar ligada a um `PendingAction` específico.
“Sim” não pode executar uma ação antiga/ambígua.

## Auditoria

Registrar eventos técnicos mínimos:
- request started/succeeded/failed;
- tool requested;
- policy outcome;
- command succeeded/failed;
- confirmation accepted/cancelled;
- undo requested;
- latency;
- model/provider;
- erro classificado.

Evitar conteúdo pessoal desnecessário nos logs.

## Matriz concreta após M0

Esta matriz é contrato planejado, não motor já implementado. Autorização Firebase/membership e schemas do domínio permanecem obrigatórios para qualquer allow.

| Tool/ação | Milestone de habilitação | Política determinística |
|---|---|---|
| get_today/get_day/get_week | M2 | allow, somente conta ativa, intervalo <=7 dias, resultados mínimos e partial explícito |
| create_task simples | M3 | allow após validação; operationId/entityId estáveis; sem recorrência/lembrete |
| complete_task única | M4 | allow quando ID desambiguado, revisão fresca, não recorrente na primeira etapa |
| update_task título único | M4 | allow se item não recorrente e revisão fresca; preservar outros campos |
| reschedule_task única | M4 | confirm com preview de data/horário; sem recorrência até M5 |
| alteração recorrente | M5 | confirm + occurrence/future explícito; revisar proteções divergentes dos handlers |
| exclusão para lixeira | M5 | confirm; undo não ignora revisão |
| lote/proposta | M5/M6 | confirm + preview, limites e revisões por item; partial/cached bloqueiam execução ampla |
| purge, conta, segurança | não exposto | deny / fluxo dedicado existente |
| tool desconhecida, IDs fora da conta, payload inválido, confirmação expirada | todas | deny |

Policy mínima entra em M2 e cresce com cada tool; M5-T1 consolida alto impacto e confirmação server-side. Nunca adiar allowlist/schema/auth até M5 ou M9. M3/M4 não expõem ferramentas de alto impacto via LLM. Uma resposta que diga 'confirmei' não executa pending action. Propostas e receipts privados exigirão teste de isolamento com emuladores quando forem implementados.

Riscos baseline: updateFuture/trashSeries não replicam controles/rate limits do contentCommand genérico; useUserCollection suprime indicador partial; Admin SDK não é limitado por Rules. M0 registra esses fatos, sem alegar correção. Detalhes em ARCHITECTURE.md. Capacidade operacional do documento ausente 05-capacidade-e-revisao.md não foi inferida; os limites hardcoded atuais estão documentados.

## M2 implementado — limites explícitos

Somente consultas autenticadas. ModelAdapter não recebe uid/token/Firestore/resultados; pergunta e contexto civil mínimo são enviados ao provider. Narrativa livre é descartada. allowlist de três tools strict e policy inteira validadas antes de consultas de agenda; authorize profile/membership é repetido após espera upstream. Executor só lê conta derivada do token, sem paths/uid vindos do modelo/cliente, com projeção e cap50/partial. Séries não são materializadas.

Gika não chama commands/sendCommand/outbox e não escreve domínio, receipts, rate buckets ou histórico. Limites em memória não são distribuídos e podem reiniciar em cold start; não alegar quota global garantida. Garantia R$0 requer projeto Gemini Free Tier sem Cloud Billing; nenhum setup financeiro/serviço pago/retry/fallback existe. Requisição upstream timeout/429/503/invalid/malformed/missing env vira AppError público sem payload/cause privada. Parser de body Gika sanitiza erros JSON antes de chegar ao logger convencional. Servidor atende outras rotas independentemente da chave.

## M3-T1 — única mutação habilitada

O parágrafo anterior registra o escopo histórico M2. Agora somente create_task simples entra na allowlist junto às três leituras. Uma criação não pode ser misturada com outra chamada. Nome/args strict e intenção explícita/título/data/horário são validados antes do descriptor; desconhecidos, uid/owner/path/IDs/recorrência/lembretes são rejeitados. Data/título não podem ser inventados pelo modelo. ModelAdapter não recebe persistência nem resultado privado.

Descriptor não é criação concluída: somente commandBridge envia activity.create pelo sendCommand existente. Auth corrente após espera do modelo e guard opcional expectedUid após espera de token impedem envio para conta trocada/desconectada. Middleware /commands verifica token; transação existente revalida membership/profile/controles. Nenhuma nova escrita ou bypass de policy. Receipt validado (applied/alreadyApplied, entity/operation iguais, revisão1) é necessário para createdTask e confirmação na UI. Falhas preservam rascunho sem sucesso falso e sem enfileirar Gika. Cancelamento após envio tem resultado potencialmente incerto, sem alegar rollback. Base mínima de IDs pendentes já exigida pelo domínio está documentada no M3_T1_EXECPLAN; T2/T3 permanecem não autorizados. Não há complete/update/reschedule/delete/batch/series/undo/voz/proatividade.

## M3-T2 — proteção de replay

IDs criados pelo sistema/UI e nunca enviados ao Gemini. Request UUID torna-se operation/entity dentro do namespace UID autenticado; duas contas podem usar mesmo UUID sem consultar receipt/tarefa uma da outra. Envelope gika é strict e limitado a activity.create simples/revision0/entity=operation, sem outras ações/campos. SHA256 de texto vincula ID ao pedido, não é dedup por conteúdo nem prova de autorização. Hash/snapshot privados não são logados nem enviados ao modelo.

Garantia definitiva: transação contentCommand existente cria tarefa e receipt juntos, com conflito de hash e replay alreadyApplied. Verificação não atômica no cliente ou leitura prévia no router são só recuperação, nunca garantia de escrita. Modelo/router não persistem; bridge permanece único sendCommand. Snapshot validado do receipt é histórico; somente ack autenticado do command layer permite sucesso estruturado. Troca/logout no cliente continua guardada antes de dispatch/token/ack, membership/profile revalidados na transação inclusive no replay.

Recuperação já concluída preserva email/profile/membership/ownership mesmo com serviceControls restricted/constrained; só retorna descriptor histórico, sem escrita/provider. Novos pedidos continuam exigindo serviço normal antes do modelo. Reinterpretação de operação concluída é evitada via receipt autenticado e hash do pedido. Diferença de texto/payload com mesmo ID rejeita explicitamente; mesmo texto com ID novo é nova intenção válida. Calls repetidas iguais são normalizadas após strict; distintas/mistas são negadas. Sem segunda fila, nova coleção, Map definitivo, undo ou mutações posteriores. Detalhes de retenção/rollback em ADR-GIKA-012.

## M3-T3 — policy exclusiva do botão Desfazer

Única remoção permitida: reverter a criação confirmada específica pelo botão estruturado. Não há delete/undo tool nem interpretação Gemini. Contexto software UID original/IDs reais/rev1, canônico/strict; UID enviado é assertion e deve igualar token. No command layer, receipt de origem deve ser criação Gika validada da mesma conta/alvo/revisão1. Somente activity.trash existente, sem purge/batch/série, revisão não atualizada silenciosamente. Auth/membership/profile repetidos na transação inclusive replay. Edição posterior dá conflito sem detalhes privados; já removida dá estado explícito; receipt próprio cobre replay/concurrency/lost ack sem segunda escrita. UI somente confirma após ack validado, descarta resultado ao trocar conta/cancelar, usa deadline/queuefalse. Conversa não persiste no reload. ID software deterministicamente ligado à operação original, sem títulos/datas, nenhum ID/contexto do modelo.

Revisão T3: vincular também entity.createdAt ao serverTime do receipt original para impedir ABA (purge convencional seguido de criação independente sob mesmo ID/revisão1). Teste real de comandos cobre este caso; undo não executa purge.

## M4-T1 — policy de conclusão específica

Allowlist agora inclui complete_task strict somente title/date; desconhecidos/IDs/UID/status e calls diferentes/mistas rejeitados. Calls repetidas estritamente iguais colapsam depois de schema. validateCompletion ancora título/data na solicitação explícita; criação errada para Terminei/Marca/Marque é bloqueada. Um dia bounded/UTC separado do civil do perfil, sem queries livres do modelo. Busca autenticada em reads.read existente; partial/ambígua/nenhuma não escreve. Candidatos completed/canceled/event/série não são removidos silenciosamente para escolher pending.

Descriptor software não significa conclusão. Único command convencional setStatus/completed, revision esperada, uid derivado do token, guards client/token/ack e membership/profile no commit/replay. gikaCompletion strict/canonical protege task pending/nonseries; snapshot mínimo no receipt atômico existente permite recuperar resultado e replay sem segundo efeito. Outro UID tem namespace separado; reutilizar ID com hash/payload diferente conflita; request hash não é autorização. Resultado structured após ack; conflito preserva edição posterior e não expõe current na falha Gika. Observações de leitura não têm receipt: antes de qualquer commit uma repetição pode reavaliar estado, sem congelar observações no banco. At-most-once de mutação é a transação/receipt, nunca memória. Sem reabrir/undo genérico e sem levar snapshots/candidatos/token/UID ao provider.
