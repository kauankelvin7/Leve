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
