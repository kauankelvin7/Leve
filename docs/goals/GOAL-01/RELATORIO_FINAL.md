# GOAL #01 — relatório de implementação

## Resultado

A implementação desta branch corrige a divergência do opt-in offline, protege
pendências contra limpeza silenciosa, endurece a outbox e fecha falhas
operacionais confirmadas em Gika, tick assinado e notificações. Os testes locais
foram executados em emuladores. A execução original não alterou manualmente produção, credenciais ou infraestrutura. A integração posterior na `main` exige conferência separada do estado de deployment.

O escopo do GOAL #01 foi complementado com a correção dos dois achados P2 levantados na revisão independente: a corrida entre a remoção de pendências e o flush em curso foi eliminada e coberta por testes; o resíduo de sessão legada no IndexedDB sem opt-in explícito é purgado na migração inicial de privacidade. Todos os testes unitários (895) e os 12 testes E2E locais focais no Chromium foram executados com sucesso total.

## Evidência

- Baseline e diagnóstico: [BASELINE.md](BASELINE.md), [DIAGNOSTICO.md](DIAGNOSTICO.md).
- Mudanças e justificativas: [IMPLEMENTACAO.md](IMPLEMENTACAO.md).
- Gates e regressões: [TESTES.md](TESTES.md).
- Parecer, achados corrigidos e limites de revisão: [REVISAO.md](REVISAO.md).
- Situação dos PRs e branches: [REVISAO_REPOSITORIO.md](REVISAO_REPOSITORIO.md).
- Baseline: 831 unit tests; final: 895 unit tests, 338 integrações, 8 E2E críticos e 12 E2E específicos; docs/lint/typecheck/build e audit de produção passaram.

## Limitações externas — ação necessária antes de produção

Nenhuma configuração externa foi alterada. Antes de qualquer implantação, o operador responsável deve verificar e registrar:

1. **Borda:** as páginas oficiais consultadas em 14/10/2026 indicam até três regras customizadas e três bloqueios de IP por projeto Hobby. A limitação WAF por taxa tem uma regra Hobby por projeto, janela fixa de 10 s a 10 min e 1.000.000 de requisições permitidas incluídas; a tabela publica US$ 0,50 por milhão de requisições permitidas. Confirme plano, região, franquia e consumo no painel antes de ativar. Os limites propostos são pontos de partida, não configuração existente. A quota Firestore por UID não absorve flood antes da função. Detalhes e fontes em [EDGE-PROTECTION.md](../../security/EDGE-PROTECTION.md).
2. **Scheduler e segredo:** manter `SCHEDULER_HMAC_SECRET` apenas no cofre configurado da plataforma; confirmar frequência menor que a janela de replay, timestamp em milissegundos/segundos e envio de uma assinatura única por execução. Não reutilizar manualmente requisição já aceita.
3. **Firebase produção:** conferir Rules, acesso Admin SDK restrito à service identity necessária, negação de clientes a `usageBuckets`, `notificationTokens`, `notificationTokenOwners`, `commandReceipts` e `maintenance`; validar backup/monitoramento de falhas de transação.
4. **Observabilidade:** alertar para 401/409 de replay, 429 de quota, 503 de storage/estado inválido e falhas de limpeza local sem incluir token, conteúdo, payload ou assinatura nos logs.
5. **Integração real:** após revisão/aprovação do PR e antes de release, executar smoke test controlado com usuário sintético não produtivo, tick assinado único, registro/revogação de token de teste e migração de conta nova/legada. Não usar token FCM ou conteúdo real em log/fixture.

## Revisão e publicação

A revisão independente identificou os dois achados P2 descritos em [REVISAO.md](REVISAO.md). Ambos foram corrigidos e testados nesta branch (`goal/01-indexeddb-followup`), eliminando a corrida funcional e garantindo a purga da sessão legada. O follow-up `1d7c8d1` foi publicado na branch do PR [#49](https://github.com/kauankelvin7/Leve/pull/49), cujos workflows CI, CodeQL, Planner E2E e Seasonal E2E passaram. O PR #49 foi integrado à `main` por squash no commit `1b51202` em 14/10/2026. A publicação automática e os controles externos de produção devem ser verificados separadamente; merge não equivale a homologação de release.
