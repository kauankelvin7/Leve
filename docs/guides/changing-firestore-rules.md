# Alterar regras do Firestore

As regras em [`firestore.rules`](../../firestore.rules) controlam as leituras diretas do cliente e negam as escritas de domínio feitas pelo navegador. A API usa a identidade Firebase e as próprias verificações do servidor; regras e servidor têm responsabilidades distintas ([autorização](../architecture/authentication-authorization.md)).

1. Identifique a coleção, seus leitores e o handler de escrita correspondente.
2. Preserve isolamento por UID e os contratos de associação que o código aplica; não generalize uma regra de uma coleção para outra.
3. Acrescente ou ajuste testes com Firebase Emulator, incluindo leitura permitida e negada entre usuários.
4. Rode `npm run test:integration` e registre o resultado. Esse script inicia Auth/Firestore Emulator e requer Java 21.
5. Revise se a alteração cria acesso direto a dados privados ou um caminho de escrita fora da API.

Use dados sintéticos nos emuladores. Não publique Rules nem altere um projeto Firebase real como parte de uma validação local.
