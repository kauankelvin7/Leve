# Ambiente de desenvolvimento

O ambiente local usa Node.js 24.x, npm 11.19.1 e Java 21 para Firebase Emulator. O comando `npm run dev` configura `demo-leve`, Auth Emulator, Firestore Emulator, API e Vite. Veja [desenvolvimento local](../guides/local-development.md).

As variáveis e seus consumidores estão em [configuração](configuration.md); os scripts estão em [scripts npm](scripts.md). O arquivo [`.env.example`](../../.env.example) contém nomes e valores vazios, não credenciais. Não use dados reais ou segredos em desenvolvimento e não trate variáveis `VITE_` como segredo.
