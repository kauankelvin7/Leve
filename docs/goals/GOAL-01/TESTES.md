# GOAL #01 — testes e gates

## Ambiente

- Base testada: `c7a3de4d2c75e1be3b8f0439adeef6578805f14f`; branch `goal/01-confiabilidade-privacidade`.
- Instalação limpa: `corepack npm ci` — PASS, 1.085 pacotes instalados. O npm informou que três scripts de instalação não haviam sido aprovados para execução; os comandos de lint/build/typecheck/test abaixo passaram mesmo assim.
- JDK 21.0.12.1 (Temurin) baixado para `/tmp/leve-goal01-jdk21` para os emuladores Firebase. Testes E2E usaram o Chromium Headless Shell 131 já presente no cache do ambiente.

## Gates finais executados

| Gate | Resultado observado |
|---|---|
| `npm run docs:check` | PASS — 175 arquivos Markdown |
| `npm run lint` | PASS — ESLint e limites arquiteturais, 55 fontes TypeScript |
| `npm run typecheck` | PASS — cliente e servidor |
| `npm run build` | PASS — 364 módulos; aviso já conhecido de bundle acima de 500 kB |
| `npm test` | PASS — 76 arquivos, 895 testes |
| `npm run test:integration` | PASS — emuladores Auth/Firestore, 11 arquivos, 338 testes |
| `npm run test:e2e:critical` | PASS — 8 testes Gika críticos |
| E2E GOAL-01 `goal01-outbox.spec.ts goal01-privacy.spec.ts` | PASS — 12 testes; liderança concorrente/fallback, fencing, upgrade IndexedDB, abort de transação, recuperação de conteúdo, migração, opt-out, logout/login, persistência Firestore e limpeza UID-scoped |
| `npm audit --omit=dev --audit-level=moderate` | PASS — zero vulnerabilidades no conjunto de dependências de produção |
| `git diff --check` | PASS na revisão final |

Comando E2E efetivo:

```sh
LEVE_CHROMIUM_EXECUTABLE=/workspace/scratch/92ac25cdba41/leve-document-qa/browser-cache/chrome-headless-shell/linux-131.0.6778.204/chrome-headless-shell-linux64/chrome-headless-shell \
JAVA_HOME=/tmp/leve-goal01-jdk21 \
PATH=/tmp/leve-goal01-jdk21/bin:$PATH \
npm run test:e2e:critical
```

Para os focais, substituir o último argumento por:

```sh
npm run test:e2e:local -- goal01-outbox.spec.ts goal01-privacy.spec.ts
```

### Verificação remota do código

No HEAD de código `34098ca1a8d619dba8b1ac57bca09127f9a11981`, os workflows CI, CodeQL, Planner E2E e Seasonal E2E, além do check Vercel, terminaram com sucesso. A atualização documental desta revisão cria um novo HEAD; confira no PR #49 os resultados associados ao commit mais recente antes de integrar.

## Resolução dos achados da revisão independente

Após a auditoria independente, foram implementadas as correções e testes de regressão determinísticos para os dois achados P2:
1. **Corrida de remoção vs. flush:** coberta em `goal01-outbox-api.test.ts` (descarte antes do envio é ignorado no loop) e em `goal01-local-transaction.test.ts` (fechamento de conexões em versionchange/erros síncronos).
2. **Purga de sessão legada:** coberta em `goal01-offline-privacy.test.ts` (remoção automática de rows em `session-cache` de contas sem opt-in explícito na migração).
Adicionalmente, os 12 testes E2E focais do GOAL-01 foram executados e aprovados integralmente no Chromium com emuladores locais.

## Regressões importantes

- Offline desligado sem preferência; preferência global legada não habilita conta nova; drafts persistidos e outbox legada continuam recuperáveis.
- Desativação com pendência não apaga dados; logout cancelado mantém sessão e trabalho; remoção confirmada limpa só UID selecionado e respeita sessões de atividade de outro UID.
- Alteração adicionada após o snapshot de confirmação faz a transação de limpeza abortar sem excluir linhas.
- Dois líderes fallback disputam a mesma lease; somente um adquire, sucessor após expiração recebe token de fencing e titular antigo não consegue confirmar.
- Repetir `operationId` com payload igual conserva horário/conteúdo; payload divergente falha atomicamente; abort IndexedDB não informa sucesso.
- Receipt inválido, ausente ou incompatível não remove a pendência; comando expirado mostra conteúdo allowlisted e exige confirmação de remoção.
- Recuperação Gika distribuída, replay simultâneo do tick, falha fechada, endpoint HTTP sem executar jobs no replay, exigência de e-mail verificado e reassociação concorrente de token foram incluídos na suite de integração/unitária executada.

## Tentativas que não passaram antes de encontrar o runner disponível

- O primeiro E2E sem variável de browser falhou antes dos testes porque Playwright não encontrou o Chromium `v1243`. `npx playwright install chromium` também falhou: CDN retornou arquivo ZIP vazio/truncado. Usar o Headless Shell 131 do cache já instalado resolveu o runner e as suites focais/criticais passaram.
- Integração sem `JAVA_HOME` 21 parou no pré-requisito Java (host tinha Java 17); repetida com Temurin 21 e passou integralmente.

Não foi executado `npm audit` incluindo dependências de desenvolvimento, nem teste com serviços/contas de produção. Isso não faz parte do gate solicitado `--omit=dev`.
