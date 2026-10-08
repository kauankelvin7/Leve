# Desenvolvimento local

Requisitos declarados: Node.js 24.x e npm 11.19.1; Java 21 para emuladores Firebase. No diretório do repositório:

```sh
corepack enable
npm ci --include=dev
npm run dev
```

`npm run dev` inicia Firebase Auth e Firestore Emulator, a API local e Vite. Acesse `http://localhost:5174/entrar`. Em outro terminal, `npm run seed:local` carrega dados fictícios. O seed imprime credenciais de teste; elas pertencem aos emuladores.

O projeto local usa `demo-leve`, Auth Emulator em `localhost:9099` e Firestore Emulator em `localhost:8080`. Para encerrar, pare o processo do comando `npm run dev`. A opção `LEVE_EPHEMERAL=true` desativa persistência local do emulador no script de desenvolvimento.

Veja [nomes de configuração](../reference/configuration.md), [scripts](../reference/scripts.md) e [arquitetura de containers](../architecture/containers.md). Não use dados pessoais ou credenciais reais no ambiente local.
