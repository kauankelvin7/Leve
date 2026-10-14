# GOAL #01 — relatório final

## Resultado

A implementação desta branch fecha a divergência do opt-in offline, protege pendências contra limpeza silenciosa, endurece reconciliação/concorrência da outbox e corrige controles operacionais comprovados de Gika, tick assinado e notificações. O estado foi verificado apenas localmente em emuladores; nada foi implantado ou alterado em produção.

## Evidência

- Baseline e diagnóstico: [BASELINE.md](BASELINE.md), [DIAGNOSTICO.md](DIAGNOSTICO.md).
- Mudanças e justificativas: [IMPLEMENTACAO.md](IMPLEMENTACAO.md).
- Gates e regressões: [TESTES.md](TESTES.md).
- Parecer, achados corrigidos e limites de revisão: [REVISAO.md](REVISAO.md).
- Baseline: 831 unit tests; final: 891 unit tests, 338 integrações, 8 E2E críticos e 12 E2E específicos; docs/lint/typecheck/build e audit de produção passaram.

## Limitações externas — ação necessária antes de produção

Nenhuma configuração externa foi alterada. Antes de qualquer implantação, o operador responsável deve verificar e registrar:

1. **Vercel/Cloudflare ou borda equivalente:** limite por IP e proteção contra flood antes da função Express. Validar contagem distribuída, resposta 429, janela, limites por rota e exceções do scheduler. Quota Firestore por UID protege abuso autenticado, não flood distribuído na borda.
2. **Scheduler e segredo:** manter `SCHEDULER_HMAC_SECRET` apenas no cofre configurado da plataforma; confirmar frequência menor que a janela de replay, timestamp em milissegundos/segundos e envio de uma assinatura única por execução. Não reutilizar manualmente requisição já aceita.
3. **Firebase produção:** conferir Rules, acesso Admin SDK restrito à service identity necessária, negação de clientes a `usageBuckets`, `notificationTokens`, `notificationTokenOwners`, `commandReceipts` e `maintenance`; validar backup/monitoramento de falhas de transação.
4. **Observabilidade:** alertar para 401/409 de replay, 429 de quota, 503 de storage/estado inválido e falhas de limpeza local sem incluir token, conteúdo, payload ou assinatura nos logs.
5. **Integração real:** após revisão/aprovação do PR e antes de release, executar smoke test controlado com usuário sintético não produtivo, tick assinado único, registro/revogação de token de teste e migração de conta nova/legada. Não usar token FCM ou conteúdo real em log/fixture.

## Revisão e publicação

A revisão read-only inicial identificou achados que foram corrigidos. A revisão final documenta que não há bloqueadores P0/P1 conhecidos nos testes locais. Como o usuário instruiu não delegar outros agentes, não houve segunda assinatura independente pós-correção; isso está detalhado em `REVISAO.md`.

Branch dedicada: [`goal/01-confiabilidade-privacidade`](https://github.com/kauankelvin7/Leve/tree/goal/01-confiabilidade-privacidade). Pull Request aberto para `main`: [#49](https://github.com/kauankelvin7/Leve/pull/49), HEAD `3989d4483d341d61d7250eda85abc07dedc15b30`. Permanece aberto, sem merge automático. Não houve implantação.
