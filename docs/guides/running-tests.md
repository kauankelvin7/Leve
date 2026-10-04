# Executar testes e verificações

Instale dependências conforme [desenvolvimento local](local-development.md). Os scripts disponíveis estão em [`package.json`](../../package.json); os escopos diferem:

```sh
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:e2e:local
```

`npm test` executa Vitest unitário. `test:integration` inicia Auth e Firestore Emulator e requer Java 21. `test:e2e:local` executa Playwright no ambiente local. `npm run build` inclui typecheck e build web. `npm run verify` reúne audit de produção, lint, build, unitários, integração e E2E crítico.

Rode os comandos pertinentes ao risco da mudança. Uma suíte parcial não representa aprovação das demais; registre exatamente o comando e o resultado. Não reduza assertions, timeouts ou retries para obter sucesso. Veja [CONTRIBUTING](../../CONTRIBUTING.md#comandos-de-verificação).
