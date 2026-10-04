# Fluxos de runtime

## Abrir uma área protegida

1. O Firebase Auth mantém o estado da sessão no browser. `AuthProvider` obtém o usuário autenticado e aguarda e-mail verificado.
2. O browser chama `GET /api/session` com ID token Bearer.
3. A API verifica o token, consulta perfil, membership e controles de serviço e devolve o `SessionResult`.
4. `Protected` só monta o shell quando há usuário verificado, membership ativa e perfil ativo. Se a requisição falhar offline e o modo offline estiver ativo, o cliente pode usar a sessão local do mesmo UID.

Implementação: [AuthProvider](../../apps/web/src/features/identity/AuthProvider.tsx), [rotas protegidas](../../apps/web/src/app/App.tsx) e [session route](../../server/app.ts).

## Ler dados

1. A tela obtém o usuário do contexto de Auth.
2. Hooks como `useUserCollection` criam queries Firestore em `users/{uid}/...`, com `limit(50)`.
3. O SDK entrega snapshots conforme conexão/cache; [Rules](../../firestore.rules) validam token verificado, UID próprio, membership ativa, conta ativa e limites de lista.

As leituras da Gika são diferentes: o servidor usa Admin SDK e seu repositório em [server/gika/reads.ts](../../server/gika/reads.ts) autoriza a identidade e limita cada consulta. Como Admin SDK ignora Rules, a autorização do repositório é parte obrigatória desse fluxo.

## Alterar dados

1. A UI cria um envelope com operação, entidade, revisão esperada e payload validável.
2. `platform/api.ts` envia o envelope a `POST /api/commands` com o ID token.
3. [server/app.ts](../../server/app.ts) verifica o token, valida o envelope e encaminha ao comando correspondente.
4. O comando verifica associação e estado da conta e aplica a alteração em transação. Para operações de conteúdo, revisão/recibo e gravação do item são verificadas juntas; detalhes e exceções estão em [modelo de comandos](command-model.md).
5. A API devolve o recibo do comando. A UI só mostra confirmação de sucesso com o resultado retornado.

## Rotina agendada

O cron configurado em [wrangler.toml](../../workers/scheduler/wrangler.toml) chama o Worker. Ele assina método, caminho e timestamp e faz `POST /api/internal/tick`. A API valida HMAC e janela de tempo, então executa processamento de lembretes, materialização recorrente, purge expirado e retomada de exclusões de conta. A execução depende do provedor agendado e de sua configuração; este fluxo não implica entrega garantida ou disponibilidade de produção.

Código: [Worker](../../workers/scheduler/src/index.js), [validação/rotinas](../../server/reminders.ts), [rota interna](../../server/app.ts).
