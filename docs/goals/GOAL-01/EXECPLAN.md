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
- Foi feita uma revisão read-only independente no início do trabalho, antes da instrução de não delegar; após essa instrução nenhum subagente foi iniciado ou reativado.
- A revisão final é uma passada read-only separada sobre o diff completo, regressões e evidência dos gates; seu escopo e limites ficam em `REVISAO.md`.

## Gates

Executar conforme disponíveis: `corepack npm ci`, `npm run docs:check`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:integration`, `npm run test:e2e:critical`, E2Es específicos de privacidade/outbox/Planner e `npm audit --omit=dev --audit-level=moderate`. Nenhum gate será marcado aprovado sem execução real.

## Rollback

Reverter commits atômicos do branch ou fechar o PR. Não fazer reset/force-push nem tocar o worktree original. A migração mantém rows da outbox e rascunhos; remover a preferência pode ser revertido em novo release sem schema remoto.

## Evidências

Registrar resultados e SHAs em `TESTES.md`, parecer em `REVISAO.md`, diff/justificativas em `IMPLEMENTACAO.md` e limites externos em `RELATORIO_FINAL.md`.

## Estado de retomada

Branch criada em `c7a3de4`. Reconhecimento, baseline, implementação, revisão do diff e gates locais foram executados. `corepack npm ci`, docs, lint, typecheck, build, 891 unitários, 338 integrações, 8 E2E críticos, 12 E2E GOAL-01 e audit de produção passaram. JDK Temurin 21.0.12.1 foi baixado para `/tmp/leve-goal01-jdk21`; Playwright não conseguiu baixar o Chromium v1243 (arquivo ZIP retornado vazio), então os E2Es foram executados com o Chromium Headless Shell 131 já disponível no cache do ambiente. A revisão final foi feita pelo agente principal, sem assinatura independente pós-correção devido à instrução do usuário para não delegar. PR [#49](https://github.com/kauankelvin7/Leve/pull/49) está aberto contra `main`, sem merge; não houve implantação.
