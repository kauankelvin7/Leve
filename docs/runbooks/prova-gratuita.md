# Prova gratuita — E00 / B-003 e B-005

Consulta documental: 11/09/2026. Nenhuma conta foi criada, conectada, alterada ou publicada nesta execução. Nenhuma prova abaixo está marcada como aprovada.

## Cotas reconferidas

| Serviço | Referência oficial | Condições consultadas |
|---|---|---|
| Firestore | [Usage and limits](https://firebase.google.com/docs/firestore/quotas) | 1 GiB, 50 mil leituras/dia, 20 mil gravações/dia, 20 mil exclusões/dia, 10 GiB de saída/mês. Uma base gratuita por projeto; TTL/PITR/backups exigem billing. |
| Vercel Hobby | [Hobby Plan](https://vercel.com/docs/plans/hobby) | Uso pessoal não comercial; 1 milhão de invocações/mês, 4 h de CPU, 360 GB-h de memória. Exceder cotas pode suspender recursos. |
| Workers Free | [Limits](https://developers.cloudflare.com/workers/platform/limits/) | 100 mil requests/dia, 10 ms CPU por request e por Cron Trigger; cinco Cron Triggers por conta. |

Não confundir preço publicado com configuração de uma conta concreta. A capacidade de 20 ativas/dia permanece uma hipótese, dependente de medição. Aplicar os limiares 50/70/85/95% e a expansão gradual definidos em `05-capacidade-e-revisao.md`.

## Pré-requisitos ainda pendentes

- Projetos de staging identificados pelo mantenedor, planos gratuitos confirmados e prova redigida de ausência de billing/trial pago. Não colocar credenciais na documentação.
- Autorização concreta para publicar o ambiente de ensaio; conta e aparelho autorizados para teste de push.
- Protótipo original e validação de dispositivo/preferências da usuária.

## Ensaio a executar após disponibilizar os serviços

1. Registrar planos, região, data e configurações sem segredos; não vincular cobrança. Se qualquer etapa exigir upgrade, parar essa prova e registrar o bloqueio.
2. Implementar uma API de staging autenticada com dados inventados: gravar e ler um registro de prova via Admin SDK no Firestore Spark. Negar chamadas sem token e de outra conta; remover o registro após o teste. Registrar status, latência e consumo.
3. Configurar Worker Free mínimo com `scheduled`, HMAC-SHA256 e fetch para origem fixa. Assinar método/caminho/timestamp/minuto/hash do corpo, rejeitar desvio acima de 120 segundos e assinatura inválida antes de ler Firestore. Segredo só em serviço.
4. Observar ticks de um minuto e limites de CPU. Repetir tick para testar reserva idempotente e provocar timeout/assinatura inválida. Não usar cron diário da Vercel como substituição. Desligar agendamento de staging após ensaio.
5. Na E09, completar FCM em aparelho autorizado com app fechado, registrar aceitação do provedor separadamente de recebimento. Mock ou token criado não comprova entrega.
6. Registrar resultado, duração, versão de runtime/SDK, identificador da execução, evidências redigidas e pendências. Reconfirmar planos antes de produção e trimestralmente.

## Modelo de evidência

| Verificação | Estado atual | Evidência necessária |
|---|---|---|
| Planos das contas e billing desligado | Não executada | Painéis redigidos de Vercel/Firebase/Cloudflare |
| API Vercel → Firestore Spark | Não executada | Registro de request, read/write e cotas |
| Cron Free → endpoint HMAC | Não executada | Ticks, assinatura, rejeição e CPU |
| FCM → aparelho fechado | Não executada | Plataforma, permissão, horário observado |
| Expansão para 5/20 contas | Não autorizada pela medição | 14 dias representativos e margens previstas |

Não acionar o gate de produção enquanto essas evidências e os testes de segurança correspondentes estiverem pendentes.
