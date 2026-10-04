# Contribuir com o Leve

Este guia é para quem vai alterar o aplicativo, sua infraestrutura local ou a documentação. Mudanças devem preservar os dados da pessoa usuária e seguir os contratos existentes.

## Preparar o ambiente

Use Node.js 24.x, npm 11.19.1 e Java 21 quando precisar dos emuladores Firebase. Instale dependências e o navegador usado pelo Playwright:

```sh
corepack enable
npm ci --include=dev
npx playwright install chromium
```

Inicie o ambiente local e carregue dados sintéticos:

```sh
npm run dev
npm run seed:local
```

Acesse `http://localhost:5174/entrar`. O modo local usa o projeto `demo-leve` e emuladores Auth/Firestore. Não use contas, dados ou credenciais reais em testes locais.

## Fazer uma mudança

1. Leia [AGENTS.md](AGENTS.md), o [mapa da documentação](docs/README.md) e a decisão ou evidência da área afetada.
2. Abra uma branch de trabalho (`feat/`, `fix/` ou `docs/`) e mantenha a alteração focada.
3. Reproduza o comportamento afetado e identifique o módulo que é dono do contrato antes de editar.
4. Atualize a documentação junto com mudanças de comportamento ou arquitetura.
5. Rode verificações proporcionais à mudança e registre comandos e resultados no pull request.

Use mensagens de commit curtas com escopo, por exemplo `docs: clarify local setup` ou `fix: preserve activity revision`. Crie um pull request para revisão; descreva o comportamento alterado, decisões relevantes, verificações executadas e limitações conhecidas. Não publique deploy nem altere `main` sem autorização do mantenedor.

## Comandos de verificação

| Comando | O que verifica |
|---|---|
| `npm run lint` | ESLint e limites entre módulos |
| `npm run typecheck` | TypeScript do cliente e servidor |
| `npm run build` | Typecheck e build web |
| `npm test` | Testes unitários |
| `npm run test:integration` | Contratos com Auth e Firestore Emulator |
| `npm run test:e2e:local` | Jornadas no ambiente local |
| `npm run verify` | Auditoria de dependências, lint, build, unitários, integração e E2E crítico |

Mudanças em autenticação, Rules, comandos, revisão, recibos, recorrência, importação/exportação ou sincronização offline exigem atenção especial aos testes de integração. Uma suíte parcial não deve ser descrita como integralmente aprovada. Não altere timeouts, retries ou asserções apenas para obter uma execução verde.

## Contratos que precisam ser preservados

- Cada conta só acessa dados associados ao seu UID e a uma associação ativa. Regras e servidor aplicam a autorização.
- Alterações de domínio passam pela API de comandos existente. O cliente não grava diretamente nas coleções de domínio.
- Comandos usam `operationId`; entidades concorrentes usam `expectedRevision`. Recibos permitem reconhecer reaplicações sem duplicar o efeito.
- Conflitos devem preservar a intenção e o conteúdo da pessoa usuária. Não aplicar “última gravação vence” em silêncio.
- O modo offline é opcional. Não crie outro cache, writer, outbox ou execução automática ao reconectar.
- A Gika propõe; o servidor valida a política e a confirmação. Consulte [especificação](docs/gika/PRODUCT_SPEC.md), [arquitetura](docs/gika/ARCHITECTURE.md) e [segurança e política](docs/gika/SECURITY_AND_POLICY.md) antes de alterar essa integração.

## Segurança, privacidade e documentação

Nunca versione segredos, `.env` real, tokens, cookies, credenciais de Firebase Admin ou dados pessoais. Não coloque texto de agenda, prompts, conteúdo de notas, transcrições ou recibos em logs, screenshots ou evidências. Use somente dados sintéticos e emuladores nos testes locais.

Mudanças em arquitetura devem atualizar a documentação correspondente e, quando alterarem uma decisão duradoura, um ADR. Evidências precisam indicar o escopo e os comandos realmente executados. Consulte [política de segurança](SECURITY.md) para relato responsável de vulnerabilidades.
