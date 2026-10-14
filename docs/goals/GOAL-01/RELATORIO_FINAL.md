# GOAL #01 — relatório de implementação

## Resultado

A implementação desta branch corrige a divergência do opt-in offline, protege
pendências contra limpeza silenciosa, endurece a outbox e fecha falhas
operacionais confirmadas em Gika, tick assinado e notificações. Os testes locais
foram executados em emuladores. Nada foi implantado ou alterado em produção.

O GOAL ainda não está concluído: o PR precisa de revisão de outro mantenedor e
de uma decisão de merge compatível com o controle de produção deste repositório.

## Evidência

- Baseline e diagnóstico: [BASELINE.md](BASELINE.md), [DIAGNOSTICO.md](DIAGNOSTICO.md).
- Mudanças e justificativas: [IMPLEMENTACAO.md](IMPLEMENTACAO.md).
- Gates e regressões: [TESTES.md](TESTES.md).
- Parecer, achados corrigidos e limites de revisão: [REVISAO.md](REVISAO.md).
- Situação dos PRs e branches: [REVISAO_REPOSITORIO.md](REVISAO_REPOSITORIO.md).
- Baseline: 831 unit tests; final: 891 unit tests, 338 integrações, 8 E2E críticos e 12 E2E específicos; docs/lint/typecheck/build e audit de produção passaram.

## Limitações externas — ação necessária antes de produção

Nenhuma configuração externa foi alterada. Antes de qualquer implantação, o operador responsável deve verificar e registrar:

1. **Borda:** a Vercel oferece regras WAF e bloqueios de IP no plano Hobby; rate limiting tem franquia e pode gerar cobrança após o limite. Verifique plano e uso antes de ativar. Teste regras restritas em Preview, começando em modo de registro, e confira resposta 429, janela, limites por rota e exceções do scheduler. A quota Firestore por UID não absorve flood antes da função. Detalhes e fontes em [`EDGE-PROTECTION.md`](../../security/EDGE-PROTECTION.md).
2. **Scheduler e segredo:** manter `SCHEDULER_HMAC_SECRET` apenas no cofre configurado da plataforma; confirmar frequência menor que a janela de replay, timestamp em milissegundos/segundos e envio de uma assinatura única por execução. Não reutilizar manualmente requisição já aceita.
3. **Firebase produção:** conferir Rules, acesso Admin SDK restrito à service identity necessária, negação de clientes a `usageBuckets`, `notificationTokens`, `notificationTokenOwners`, `commandReceipts` e `maintenance`; validar backup/monitoramento de falhas de transação.
4. **Observabilidade:** alertar para 401/409 de replay, 429 de quota, 503 de storage/estado inválido e falhas de limpeza local sem incluir token, conteúdo, payload ou assinatura nos logs.
5. **Integração real:** após revisão/aprovação do PR e antes de release, executar smoke test controlado com usuário sintético não produtivo, tick assinado único, registro/revogação de token de teste e migração de conta nova/legada. Não usar token FCM ou conteúdo real em log/fixture.

## Revisão e publicação

Uma revisão read-only inicial identificou achados que foram corrigidos. O agente
principal releu o diff depois das correções, mas essa leitura não substitui a
revisão independente exigida. Como o usuário pediu execução sem delegar agentes,
essa aprovação por outro mantenedor continua pendente.

Branch dedicada: [`goal/01-confiabilidade-privacidade`](https://github.com/kauankelvin7/Leve/tree/goal/01-confiabilidade-privacidade). O PR [#49](https://github.com/kauankelvin7/Leve/pull/49) está aberto para `main`. Os checks do HEAD de implementação consultado em 14/10 estavam aprovados; os commits documentais posteriores iniciaram nova rodada. Confirme o status do HEAD atual e conclua a revisão independente antes de decidir o merge. Não houve merge nem implantação.
