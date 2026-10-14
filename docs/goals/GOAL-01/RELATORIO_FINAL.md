# GOAL #01 — relatório de implementação

## Resultado

A implementação desta branch corrige a divergência do opt-in offline, protege
pendências contra limpeza silenciosa, endurece a outbox e fecha falhas
operacionais confirmadas em Gika, tick assinado e notificações. Os testes locais
foram executados em emuladores. Nada foi implantado ou alterado em produção.

O GOAL ainda não está concluído. A revisão independente read-only confirmou dois achados P2: uma operação removida pode ser enviada por um flush em curso, e a migração inicial deixa um cache legado de sessão no aparelho sem opt-in novo. Corrigir a corrida, incluir regressão determinística e resolver a retenção da sessão antes de recomendar merge. O PR está aberto e `mergeable=true`, mas não tem aprovação de mantenedor e não deve ser integrado neste estado.

## Evidência

- Baseline e diagnóstico: [BASELINE.md](BASELINE.md), [DIAGNOSTICO.md](DIAGNOSTICO.md).
- Mudanças e justificativas: [IMPLEMENTACAO.md](IMPLEMENTACAO.md).
- Gates e regressões: [TESTES.md](TESTES.md).
- Parecer, achados corrigidos e limites de revisão: [REVISAO.md](REVISAO.md).
- Situação dos PRs e branches: [REVISAO_REPOSITORIO.md](REVISAO_REPOSITORIO.md).
- Baseline: 831 unit tests; final: 891 unit tests, 338 integrações, 8 E2E críticos e 12 E2E específicos; docs/lint/typecheck/build e audit de produção passaram.

## Limitações externas — ação necessária antes de produção

Nenhuma configuração externa foi alterada. Antes de qualquer implantação, o operador responsável deve verificar e registrar:

1. **Borda:** as páginas oficiais consultadas em 14/10/2026 indicam até três regras customizadas e três bloqueios de IP por projeto Hobby. A limitação WAF por taxa tem uma regra Hobby por projeto, janela fixa de 10 s a 10 min e 1.000.000 de requisições permitidas incluídas; a tabela publica US$ 0,50 por milhão de requisições permitidas. Confirme plano, região, franquia e consumo no painel antes de ativar. Os limites propostos são pontos de partida, não configuração existente. A quota Firestore por UID não absorve flood antes da função. Detalhes e fontes em [EDGE-PROTECTION.md](../../security/EDGE-PROTECTION.md).
2. **Scheduler e segredo:** manter `SCHEDULER_HMAC_SECRET` apenas no cofre configurado da plataforma; confirmar frequência menor que a janela de replay, timestamp em milissegundos/segundos e envio de uma assinatura única por execução. Não reutilizar manualmente requisição já aceita.
3. **Firebase produção:** conferir Rules, acesso Admin SDK restrito à service identity necessária, negação de clientes a `usageBuckets`, `notificationTokens`, `notificationTokenOwners`, `commandReceipts` e `maintenance`; validar backup/monitoramento de falhas de transação.
4. **Observabilidade:** alertar para 401/409 de replay, 429 de quota, 503 de storage/estado inválido e falhas de limpeza local sem incluir token, conteúdo, payload ou assinatura nos logs.
5. **Integração real:** após revisão/aprovação do PR e antes de release, executar smoke test controlado com usuário sintético não produtivo, tick assinado único, registro/revogação de token de teste e migração de conta nova/legada. Não usar token FCM ou conteúdo real em log/fixture.

## Revisão e publicação

A revisão independente posterior foi concluída no código `34098ca` e na documentação do HEAD `544fd6d`. Não confirmou P0/P1; identificou dois P2 descritos em [REVISAO.md](REVISAO.md). O primeiro é bloqueador funcional para o merge: uma remoção confirmada pode concorrer com o envio. O segundo é retenção local de cache de sessão legado durante a migração. O GitHub ainda não registra aprovação de mantenedor; a única revisão é automática (`COMMENTED`).

Branch dedicada: [`goal/01-confiabilidade-privacidade`](https://github.com/kauankelvin7/Leve/tree/goal/01-confiabilidade-privacidade). O PR [#49](https://github.com/kauankelvin7/Leve/pull/49) está aberto para `main` e informa `mergeable=true`. No HEAD documental `544fd6df9407620803f5d43c8660e7c17b03d015`, CI, CodeQL, Planner E2E, Seasonal E2E e Vercel passaram; `docs:check` cobriu 175 arquivos Markdown e o audit de produção encontrou zero vulnerabilidades. Os achados independentes ainda precisam de correção e regressão; depois desta atualização, confira os checks do novo HEAD. Não houve merge nem implantação.
