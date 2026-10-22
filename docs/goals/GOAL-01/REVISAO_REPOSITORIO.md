# Revisão de PRs e branches — 14/10/2026

## GOAL #01

O PR [#49](https://github.com/kauankelvin7/Leve/pull/49) foi integrado por squash na `main` (commit `1b51202`). O follow-up `1d7c8d1` resolveu os dois achados da revisão independente: corrida de descarte versus sincronização e retenção de sessão legada sem opt-in. Os quatro workflows do HEAD do PR passaram. Ver `IMPLEMENTACAO.md`, `REVISAO.md` e `TESTES.md`.

## Dependências e CI

| PR | Mudança | Situação em 14/10/2026 |
|---|---|---|
| #40 | eslint-plugin-react-hooks 7.1.1 | Integrado |
| #42 | zod 4.6.5 | Integrado |
| #43 | express 5.3.0 | Integrado |
| #47 | actions/upload-artifact 7.0.2 | Integrado |
| #48 | actions/setup-node 7.1.0 | Integrado |
| [#50](https://github.com/kauankelvin7/Leve/pull/50) | CodeQL init + analyze 4.38.3, versão idêntica | Integrado, CI e CodeQL aprovados |
| #45 e #46 | CodeQL 4.38.3, ações atualizadas separadamente | Encerrados, substituídos pelo PR #50 |
| #41 | @dicebear/core 10.7.0 | Encerrado: avataaars 9.4.3 exige core ^9; o CI falhou em npm ci |
| #44 | @firebase/rules-unit-testing 6.0.0 | Encerrado: exige firebase ^13, projeto usa 12.19.0; o CI falhou em npm ci |

Os upgrades major bloqueados exigem atualização coordenada das dependências e validação específica, nunca `--force` ou `--legacy-peer-deps`. A integração dos PRs menores requer verificação dos workflows da `main` resultante; aprovação individual anterior não valida automaticamente o conjunto.

## Branches antigas

- `design/gika-character-foundation`: seis documentos exclusivos do personagem Gika, base antiga; preservar até decisão de produto.
- `docs/technical-documentation-v2`: oito arquivos exclusivos de inventário/arquivo documental; reavaliar em comparação com a documentação recuperada pelo PR #36.
- `feat/responsive-shell-v2`: CSS responsivo, E2E e workflow exclusivos; verificar compatibilidade com UI atual antes de transplantar.
- `video/product-film`: nenhum arquivo novo versus `main` na comparação direta, mas histórico divergente após integração do filme V2; confirmar necessidade antes de excluir.

Nenhuma dessas branches deve ser mesclada integralmente na `main` sem análise de regressões. O número de branches não justifica exclusão de conteúdo único.

## Antes de produção

O merge e a aprovação de CI não substituem as verificações de WAF, scheduler/HMAC, Rules/IAM Firebase, observabilidade, deploy e smoke test descritas em `RELATORIO_FINAL.md`. Nenhuma dessas verificações externas é certificada por este documento.

## Follow-up: migração coordenada do Firebase 13 — 21/10/2026

O PR [#44](https://github.com/kauankelvin7/Leve/pull/44) documenta o primeiro lado do conflito: `@firebase/rules-unit-testing@6.0.0` declara peer `firebase ^13.0.0`, enquanto o projeto ainda usava Firebase 12.19.0; `npm ci` rejeitou a atualização isolada. O PR [#52](https://github.com/kauankelvin7/Leve/pull/52) fez a atualização inversa isoladamente: Firebase 13 com `rules-unit-testing@5.0.2`, que declara peer `firebase ^12.0.0`; também falhou em `npm ci`.

A migração coordenada de Firebase 13.0.0 e `@firebase/rules-unit-testing` 6.0.0 resolve o conflito de peer, mas revelou oito falhas de integração em `identity.test.ts` e `security-rules.test.ts`. A falha reproduzível era `Service firestore is not available`, chamada por `RulesTestContextImpl.firestore()` em `@firebase/rules-unit-testing@6.0.0` (`dist/esm/index.esm.js`), que usa a API compat `getApp().firestore()`. No lockfile da tentativa, Firestore modular (`@firebase/firestore@4.18.0`) resolvia `@firebase/app@0.16.2`, enquanto `@firebase/app-compat@0.5.19` trazia `@firebase/app@0.16.3` aninhado. Cada cópia mantinha seu próprio registro de providers: o compat procurava o serviço `firestore` no provider da cópia 0.16.3, mas o SDK modular registrava-o na cópia 0.16.2. A exceção ocorre localmente em `getImmediate()` antes de qualquer requisição ao emulador ou avaliação das Rules; portanto não é uma diferença de política das Rules nem de resposta do Firestore Emulator.

A correção validada fixa `@firebase/app` em 0.16.3 pelo campo `overrides`, unificando o núcleo usado por Firebase modular, compat e Admin. Firebase 13, Rules Unit Testing 6 e `@firebase/app@0.16.3` exigem Node 24.12 ou superior; `.nvmrc` e `engines.node` foram elevados de acordo. O override global de `@grpc/grpc-js@1.14.5` mantém a correção de segurança também para Firestore 4.18.0, que já não corresponde ao override antigo limitado a Firestore 4.17.2.

Validação isolada no emulador local após `npm ci`: `npm run test:integration` passou 338/338 em 11 arquivos; `npm test` passou 895/895; `npm run build` passou typecheck e build; `npm run lint`, `npm run docs:check` e `npm audit --omit=dev --audit-level=moderate` passaram, com zero vulnerabilidades de produção; `npm run test:e2e:critical` passou 8/8 jornadas críticas contra os emuladores. `npm ls @firebase/app --all` mostrou todas as dependências resolvidas em 0.16.3. Os testes e as Firestore Rules não foram alterados. A CI do PR atualizado ainda precisa passar; não fazer merge antes de a suíte de integração remota aprovar.
