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
