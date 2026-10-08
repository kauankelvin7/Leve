# Autenticação e autorização

## Identidade de sessão

O cliente usa Firebase Authentication com persistência local do SDK. Rotas privadas passam por `Protected`, que exige usuário autenticado, e-mail verificado, resposta de sessão disponível, membership ativa e perfil com estado ativo. O browser pede `GET /api/session` com Firebase ID token Bearer; o servidor verifica o token incluindo revogação antes de responder.

Fontes: [AuthProvider](../../apps/web/src/features/identity/AuthProvider.tsx), [Protected](../../apps/web/src/app/App.tsx), [API session](../../server/app.ts) e [Firebase Admin](../../server/platform/firebase.ts).

## Leituras do browser

As [Firestore Rules](../../firestore.rules) aplicam `active(uid)` às leituras de `users/{uid}` e subcoleções permitidas. Essa condição exige token verificado, UID próprio, `memberships/{uid}.state == active` e perfil ativo. Listas precisam de limite e não podem exceder 50 documentos. Há caminhos explícitos de leitura para perfil, timer ativo, categorias, atividades, registros de tempo, notas e listas/itens de compras; o catch-all nega os demais acessos. As Rules não concedem escrita do cliente.

Há uma exceção de leitura para o documento `memberships/{uid}`: a regra autoriza `get` quando há usuário autenticado e `request.auth.uid == uid`. Essa regra não exige e-mail verificado nem estado ativo de membership/perfil. O cliente usa esse snapshot para observar a própria associação; não é autorização para ler dados de outro UID.

Não generalize essa lista para as coleções internas ou os dados usados somente pelo servidor.

## API e Admin SDK

Nem toda rota `/api` usa Firebase Bearer. Em [server/app.ts](../../server/app.ts), `GET /api/health` e `GET /api/version` são registrados antes do middleware Bearer. `POST /api/internal/tick` também é anterior a esse middleware e usa a verificação HMAC própria. O middleware verifica Firebase ID token nas rotas `/api` registradas depois dele, incluindo `/api/session`, `/api/commands` e `/api/gika/*`.

Como o Firebase Admin SDK ignora Rules, cada handler que lê ou altera dados privados precisa validar UID derivado do token, estado do perfil e membership conforme o contrato daquele handler. O UID da conta não deve vir de uma escolha livre do cliente para selecionar outra conta.

As mutações comuns de conteúdo verificam também membership ativa e perfil ativo dentro da transação em [contentCommand](../../server/commands/content.ts). A leitura Gika faz as próprias verificações em [firestoreReads.authorize](../../server/gika/reads.ts). Operações de ativação, sessão, exportação e manutenção têm fluxos específicos documentados no código.

## Regra prática

Ao acrescentar uma leitura Firestore, confira caminho, query, Rule correspondente e UID usado. Ao acrescentar uma operação Admin, inclua autorização no servidor: a Rule não será aplicada em nome do Admin SDK. Mudanças de Rules e isolamento precisam de teste com os emuladores, conforme [CONTRIBUTING](../../CONTRIBUTING.md).
