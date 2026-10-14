# GOAL #01 — ExecPlan

## Objetivo

Tornar o cache offline um opt-in explícito por conta e aparelho, preservar conteúdo local existente, corrigir condições comprovadas de perda/isolamento na outbox e fechar controles verificáveis da Gika, tick assinado e notificações.

## Contexto atual

Base `main` em `c7a3de4`. O branch `goal/01-confiabilidade-privacidade` usa worktree isolada; a árvore original tem mudanças locais do usuário e não será alterada. Baseline reproduzível e diagnóstico estão em `BASELINE.md` e `DIAGNOSTICO.md`.

## Não objetivos

- Não alterar produção, secrets, Vercel, Cloudflare, Firebase de produção ou serviços pagos.
- Não substituir Firebase/Firestore, formato de comandos, schemas ou arquitetura.
- Não fazer refatoração visual ampla nem mudanças de comportamento da Gika fora de segurança operacional comprovada.

## Contratos

- UID continua derivado do Firebase ID token verificado.
- Mutação segue `POST /api/commands`, `operationId`, `expectedRevision`, recibo idempotente e validação de revisão.
- Dado local continua escopado por UID; rascunhos/outbox legados não são apagados sem escolha explícita.
- A outbox só remove operação com confirmação compatível, e nunca gera novo ID/revisão sem ação do usuário.
- Serviços externos não são ativados ou reconfigurados neste GOAL.

## Passos

1. Registrar o estado real da base, os documentos de segurança, módulos de persistência e gates iniciais.
2. Implementar opt-in por UID/aparelho, migração de cache privado legado, limpeza confirmada e proteção de sessão/revogação.
3. Endurecer commit IndexedDB, liderança entre abas, duplicatas, ACKs/recibos, envelhecimento, isolamento por UID e acesso à recuperação de conteúdo.
4. Endurecer quota persistente de recuperação Gika, replay HMAC do tick e isolamento/reassociação de tokens de notificação.
5. Atualizar documentação do produto/arquitetura e produzir os seis relatórios requeridos.
6. Rodar npm ci, docs, lint, typecheck, build, unit, integração, E2E críticos e focal, audit de produção; registrar limitações de ambiente.
7. Revisar o diff completo de forma independente, corrigir bloqueadores e repetir gates afetados.
8. Criar commit, publicar o branch dedicado e abrir PR para `main` sem merge.

## Ownership

- Integração, implementação e documentação: agente principal desta sessão (GPT-6 Luna, conforme instrução do usuário).
- A revisão read-only inicial, feita antes da instrução para não delegar, encontrou achados que foram corrigidos.
- O agente principal fez uma passada final sobre o diff; isso não substitui a revisão independente pós-correção, que continua pendente. O escopo e os limites estão em `REVISAO.md`.

## Gates

Executar conforme disponíveis: `corepack npm ci`, `npm run docs:check`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:integration`, `npm run test:e2e:critical`, E2Es específicos de privacidade/outbox/Planner e `npm audit --omit=dev --audit-level=moderate`. Nenhum gate será marcado aprovado sem execução real.

## Rollback

Reverter commits atômicos do branch ou fechar o PR. Não fazer reset/force-push nem tocar o worktree original. A migração mantém rows da outbox e rascunhos; remover a preferência pode ser revertido em novo release sem schema remoto.

## Evidências

Registrar resultados e SHAs em `TESTES.md`, parecer em `REVISAO.md`, diff/justificativas em `IMPLEMENTACAO.md` e limites externos em `RELATORIO_FINAL.md`.

## Estado de retomada

Branch criada em `c7a3de4`. O baseline, a implementação e os gates locais foram concluídos. `corepack npm ci`, docs, lint, typecheck, build, 891 unitários, 338 integrações, 8 E2E críticos, 12 E2E GOAL-01 e audit de produção passaram. JDK Temurin 21.0.12.1 foi baixado para `/tmp/leve-goal01-jdk21`. O CDN não entregou o Chromium Playwright v1243; os E2Es foram executados com o Chromium Headless Shell 131 disponível no ambiente. No HEAD de implementação consultado em 14/10, CI, CodeQL, Planner E2E, Seasonal E2E e Vercel estavam aprovados. Os commits documentais posteriores iniciaram nova rodada de checks; confirme o HEAD atual no PR #49. Ainda falta revisão independente pós-correção. Não houve merge nem implantação.
