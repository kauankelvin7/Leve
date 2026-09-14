# Leve — Custo zero, capacidade e revisão de cobertura

**Versão 2.0 · referência de cotas consultada em 10 de setembro de 2026**

## 35. Restrição de custo e alcance

O sistema inicia com uma usuária, mas modelo, testes e autorização comportam várias contas desde o início. A restrição obrigatória é **R$ 0 de mensalidade de infraestrutura**, sem faturamento por consumo, trial com conversão automática ou domínio comprado. Tempo de desenvolvimento, conexão e equipamento do mantenedor não entram nessa definição.

O uso na Vercel Hobby deve permanecer pessoal e não comercial. Antes de cobrar, vender, operar para empresa ou sair das condições do plano, uma nova ADR e revisão de custos são obrigatórias.

| Responsabilidade | Serviço/plano | Condição | Ao atingir limite |
|---|---|---|---|
| Frontend e API | Vercel Hobby | Uso pessoal compatível com termos | Recurso pausa/nega; informar indisponibilidade |
| Autenticação | Firebase Authentication | Provedores gratuitos; sem telefone | Bloquear fluxo afetado |
| Banco | Firestore Standard Spark | Sem Cloud Billing | Negar até renovação da cota |
| Push | Firebase Cloud Messaging | API HTTP v1 | Agenda continua; registrar falha |
| Relógio | Cloudflare Workers Free + Cron | Worker mínimo na franquia | Próximo tick reconcilia itens válidos |
| Recuperação | Exportação JSON própria | Geração paginada | Adiar bulk se ameaçar reserva |

Proibidos nesta versão: Firebase Cloud Functions, Cloud Tasks, Scheduler, Storage, backup/PITR/TTL gerenciados, Vercel Pro, Workers Paid, filas e observabilidade pagas. Adicioná-los exige mudança explícita do requisito.

## 36. Capacidade planejada

Franquias são compartilhadas. Pessoas isoladamente não medem consumo: importação ou listener em loop pode gastar mais que várias contas normais.

| Serviço | Franquia consultada | Limite operacional |
|---|---|---|
| Firestore Spark | 50.000 leituras/dia | Investigar a 50%; fechar expansão a 70%; restringir bulk a 85% |
| Firestore Spark | 20.000 gravações e 20.000 exclusões/dia | Mesmos níveis, medidos separadamente |
| Firestore Spark | 1 GiB; 10 GiB de saída/mês | Não ampliar acima de 50%; agir a 70% |
| Vercel Hobby | 1 milhão de invocações/mês, 4 h CPU, 360 GB-h memória | Medir as três dimensões; margem normal de 50% |
| Workers Free | 100.000 requests/dia, 10 ms CPU/invocação | Um tick/minuto; somente assinatura e fetch |

Fontes: [Firestore](https://firebase.google.com/docs/firestore/quotas), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Workers](https://developers.cloudflare.com/workers/platform/pricing/). Rever no bootstrap, antes de produção e trimestralmente.

Hipótese conservadora não medida: três sessões, 600 leituras e 30 comandos por conta ativa/dia; quatro gravações médias por comando. Reservar 5.000 leituras e 3.000 gravações diárias para jobs, recorrência e variações.

`R = 600 × ativas + 5.000`; `W = 120 × ativas + 3.000`.

| Ativas/dia | Leituras | Gravações | Interpretação |
|---:|---:|---:|---|
| 1 | 5.600 | 3.120 | Piloto com reserva conservadora |
| 5 | 8.000 | 3.600 | Primeira expansão |
| 20 | 17.000 | 5.400 | Objetivo operacional |
| 50 | 35.000 | 9.000 | Estresse, sem autorização automática |

Com 20 ativas: cerca de 18.000 comandos/mês mais 43.200 ticks em 30 dias. Isso cabe nominalmente nas invocações, porém CPU, memória, saída, índices e leituras precisam de medição. Leituras de regras/transações, retries, recibos e jobs entram no orçamento. Bulk fica fora do padrão cotidiano.

**Prova local em 12/09/2026:** vinte contas fictícias autenticadas gravaram simultaneamente uma atividade isolada por uid no Auth/Firestore Emulator; todas concluíram e o lote levou 3,806 s. O ensaio comprova concorrência funcional e isolamento nesse cenário, mas não mede franquias, latência de rede, painéis nem comportamento sustentado por 14 dias.

### 36.1 Limites por conta

| Recurso | Limite inicial |
|---|---:|
| Atividades, ocorrências e lixeira | 5.000 |
| Notas | 500 |
| Séries ativas | 50 |
| Listas / itens por lista | 50 / 200 |
| Categorias / aparelhos | 50 / 3 |
| Lembretes por atividade | 3 |
| Comandos | 60/minuto e 1.000/dia contra abuso |
| Importação/exportação | Uma por conta; duas globais |

Avisar a 80% do estoque. Arquivar não reduz armazenamento. Esses máximos não podem ser multiplicados por 50 contas como capacidade garantida; limites globais prevalecem.

## 37. Admissão de contas

Cadastro direto por e-mail confirmado ou Google. Após autenticar, a API cria membership, perfil e categorias padrão numa transação idempotente; retry retorna a mesma membership. Não existe código ou coleção de convites no fluxo vigente.

Expansão: 1 → 5 → 20 → 50 cadastradas. Para avançar, observar 14 dias representativos com todas as franquias abaixo de 50% no normal, picos abaixo de 70%, sem defeito crítico, recuperação ensaiada e lembretes validados. Objetivo: até 20 ativas/dia. Cinquenta ativas é teste de estresse.

Novas ativações fecham por `serviceControls` quando o teto ou contenção for atingido. Duas ativações pela última vaga usam transação; uma vence. Suspensão bloqueia comandos e leituras após as regras verificarem membership. Não há painel administrativo para ler conteúdo privado.

## 38. Degradação

| Nível | Ação | Experiência |
|---|---|---|
| 50% sustentado | Investigar loops; não expandir | Normal |
| 70% | Fechar novas ativações; programar bulk | Aviso contextual |
| 85% | Pausar importação/exportação e rotinas dispensáveis | Agenda priorizada |
| 95% ou erro quota | Modo restrito e backoff | Rascunhos preservados; remoto marcado parcial |

Percentuais dependem de painéis/contadores e não formam corte perfeito. Erro 429/resource-exhausted usa backoff exponencial com jitter. Consulta negada nunca vira agenda vazia. Escrita indisponível aceita rascunho/outbox apenas no aparelho autorizado, com “Salvo neste aparelho”. Exportar rascunhos locais usa formato separado. Quando a cota retorna: sessão, comandos pendentes, período atual, jobs válidos, bulk.

## 39. Novos casos encontrados

| Caso | Decisão |
|---|---|
| Contas múltiplas | uid + membership; nada fixo para Gih |
| Última vaga concorrente | Transação; uma vencedora |
| Ativação repetida | Membership e perfil retornam idempotentemente sem duplicar dados |
| Abuso autenticado | Query limitada, rate limit, suspensão; sem proteção absoluta contra leitura própria |
| Cota acaba editando | Preservar rascunho; sem confirmação falsa |
| Cota acaba exportando | Invalidar sessão e repetir após recuperação |
| Recibo expirou | Consultar tombstone; não reaplicar criação automaticamente |
| Lixeira sem TTL pago | Limpeza diária paginada; prazo pode atrasar |
| Cron duplicado/parado | Reserva transacional; retomar sem avisos vencidos |
| FCM aceitou sem resposta | Estado unknown; duplicidade ainda possível |
| Termos mudam | Fechar expansão e revisar ADR |
| Uso vira comercial | Suspender admissões até hospedagem compatível |
| Provedor perde dados sem exportação | Recuperação pode ser impossível |

## 40. Auditoria de cobertura

| Área | Cobertura | Evidência ainda necessária |
|---|---|---|
| Identidade/privacidade | RF-01–03/26/31; UC-01/02/18/21 | Emulator e staging A/B |
| Agenda/recorrência | RF-04–10; UC-03–08 | Motor e carga implementados |
| Notas | RF-11–13/30; UC-09/10 | Editor e conflitos reais |
| Compras | RF-14–16; UC-11/12 | Cópia e limites reais |
| Lembretes | RF-17–19; UC-13/14/23 | Prova gratuita no aparelho |
| Sync/PWA | RF-20–22/29/30; UC-15/19 | Duas contas/abas e update real |
| Recuperação | RF-23–25; UC-16/17 | Export/import e perda simulada |
| Busca/acessibilidade | RF-27, RNF-03/04; UC-05/20 | Matriz manual/automática |
| Capacidade | RF-32, RNF-13/15/16; UC-22/23 | Carga, painéis e degradação |

Resultado documental: todos os requisitos obrigatórios têm caso, regra ou teste associado na versão 2.0. Isso prova cobertura da especificação, não software funcionando.

### 40.1 Gates adicionais

1. Evidência de nenhum faturamento/plano pago ativo.
2. T-01–T-45 executados nas camadas aplicáveis.
3. Ensaio de 20 ativas mantém uso normal abaixo de 50%; pico recupera sem fila crescente.
4. A/B nunca cruza leitura, comando, busca, exportação, importação ou deep link.
5. Falhas de rede, quota, cron e FCM não corrompem agenda nem viram sucesso.
6. Exportação/importação e exclusão são ensaiadas.
7. Gih conclui fluxos principais e recebe explicação simples sobre push e recuperação.

## 41. Limites honestos

- A arquitetura foi desenhada para uma usuária e expansão, mas implementação e testes devem comprovar.
- A meta é 50 cadastradas e 20 ativas/dia, condicionada a medição.
- Faturamento fica desativado; franquia esgotada pode causar indisponibilidade.
- Lembretes fechados têm arquitetura plausível, ainda dependente de prova real.
- Recuperação usa exportação pessoal; não há backup automático gratuito.
- Problemas conhecidos estão rastreados; novos defeitos podem surgir e entram nos gates.

## 42. Evidência operacional de 12/09/2026

- Vercel Hobby: produção promovida em `https://leve-agenda.vercel.app`; healthcheck HTTP 200, versão `0.1.0`.
- Firebase: Admin SDK autenticado por segredo de servidor; leitura de Auth e sonda Firestore persistida/removida com sucesso, sem criação de usuário.
- Auth: `leve-agenda.vercel.app` consta como domínio autorizado. `leve.com` permanece pendente até o DNS estar ativo.
- Segurança: CSP de produção permite os scripts Google somente nas origens necessárias; a tela de entrada foi recarregada sem erros de console.
- Reversibilidade: deployment anterior preservado para rollback na Vercel.
- Capacidade ainda não provada: consumo representativo das cotas Firebase/Cloudflare e entrega FCM em aparelho fechado. Vercel Hobby e Firebase Spark foram confirmados sem billing. O Worker Free, o cron por minuto, o HMAC compartilhado e a chave VAPID estão configurados; um tick assinado respondeu HTTP 200.
- Hospedagem canônica: `https://leve-agenda.vercel.app`. O DNS de `leve.com` foi preparado, porém a ativação no registrador Alibaba/HiChina foi explicitamente adiada e não bloqueia esta release.
- Painel Vercel Hobby conferido em 13/09/2026: 306,2 MB/100 GB de Fast Data Transfer, 290,7 MB/10 GB de Fast Origin Transfer, 4,4 mil/1 milhão de Function Invocations e 15m22s/4h de Fluid Active CPU no ciclo exibido. Permanecem necessárias observação representativa e leitura das cotas Firebase/Cloudflare antes de expandir contas.
- Rotas Vercel aninhadas verificadas: `/api/internal/tick`, `/api/account/export` e `/api/commands/:operationId` existem e rejeitam chamadas sem credencial com HTTP 401. `/entrar` foi recarregada após o fallback de `auth/internal-error` para redirect, sem a mensagem antiga nem erros de CSP/console.
