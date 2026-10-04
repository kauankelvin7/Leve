# Gika — prioridade da mensagem atual

Base: `main@a6d8c433920ca7fa719eecf0910873aac1045fbb`. Validação em 2026-10-04 com fixtures, Auth/Firestore emulados e dados sintéticos. Sem Gemini live ou mudanças Firebase/Vercel de produção.

## Causa reproduzida

A frase observada `O que você gostaria de fazer? Pode conversar comigo ou fazer um pedido sobre sua agenda.` existe no retorno de `resolveCreationIntent` quando não encontra o prefixo lexical legado. Mesmo com classificação AGENDA_ACTION e proposta create_task correta, `então agende para amanhã ir à academia às 7 horas da noite` era rejeitada pelo prefixo restrito de criação. O parser também não suportava a expressão de período `7 horas da noite`.

O teste mantém a reprodução do fallback legado e verifica a correção na fronteira semântica. Não há uma classe OUT_OF_SCOPE persistida pelo servidor: classificação é local a cada request; o cliente envia somente role/text. O classificador via Gemini recebia o histórico, que podia enviesar a nova decisão. Não foi observado o resultado interno do provider em produção; essa possibilidade é distinguida da causa lexical reproduzida.

## Correção

A classificação considera somente a mensagem atual. O histórico limitado continua disponível para a conversa/esclarecimento, mas não decide a classe de um novo pedido explícito. O prompt distingue intenção de ação de completude dos parâmetros: uma solicitação explícita com capacidade/campos pendentes continua AGENDA_ACTION, sem inventar o efeito.

Para criação/reagendamento simples completos, a classificação inclui uma proposta `currentAction` estrita: operação e fragmentos literais de source/request/title/date/time da mensagem atual. Somente AGENDA_ACTION certa pode conter essa proposta. `normalizeCurrentAction`, no módulo existente de criação, valida:

- sourceText igual ao pedido atual, sem reutilização de turno anterior;
- fragmentos existentes, únicos e sem sobreposição;
- nenhum conteúdo significativo descartado entre os fragmentos;
- ausência de negação/incerteza, operação conflitante, destructive intent, lote ou recorrência escondida no pedido;
- data civil e horário calculados pelo software; `7 horas da noite` vira 19:00, períodos ambíguos pedem esclarecimento.

O software reconstrói uma representação canônica e usa os validators existentes para produzir a proposta. Não há lista de sinônimos de `agende`, novo writer ou policy engine. As regressões também usam `Inclua na agenda` e `Pode colocar na agenda`. Operações incompatíveis e campos não representados não podem sumir durante a normalização.

Uma ação completa grounded não passa por uma segunda interpretação com o histórico. IDs, UID, revisions e operationId continuam software-owned. O pedido original permanece o binding de request/confirmation/receipt; o texto canônico nunca troca sua identidade. Criação conserva assessCreation e bridge/ACK; reagendamento conserva preview/confirmation, target resolution, expectedRevision e command layer.

## Matriz de follow-ups

| Histórico | Pedido atual | Resultado |
|---|---|---|
| Python fora de escopo | então agende para amanhã ir à academia às 7 horas da noite | ACTION; tarefa literal, amanhã, 19:00 |
| SOCIAL / GIKA_META / OUT_OF_SCOPE / ORGANIZATION_CONVERSATION | mesmo pedido completo | ACTION; sem autoridade do histórico |
| Sem histórico | agende para amanhã ir à academia às 7 horas da noite | ACTION; mesma proposta |
| Oi | Adicione academia amanhã às 19h | ACTION; criação existente |
| Meu dia está cheio | Então mova academia para 20h | ACTION; confirmação existente, preview não escreve |
| Me ensine Python | Então reserve amanhã das 19h às 20h para estudar Python | ACTION; esclarecer contrato de intervalo, sem inventar duração |
| Qual a capital da França? | Então me lembre amanhã de pesquisar isso | ACTION; esclarecer referência/capacidade, sem inventar reminder |
| Pedido de ação anterior | Então isso | Incerto; zero proposta/dispatch |

Tarefa simples não possui contrato de reserva com início/fim nem lembrete automático nesses comandos. Os dois exemplos correspondentes classificam a intenção atual corretamente, mas não fingem essas capacidades. Histórico não autoriza alvo, patch ou consentimento de uma mutação incompleta.

## Gates

| Gate | Resultado |
|---|---|
| Audit produção, moderate | Zero vulnerabilidades |
| Lint e AST boundaries | PASS; 51 fontes |
| Web/server typechecks, build | PASS; warning histórico de chunk grande separado |
| Unit completo | 646/646 PASS, 60 arquivos |
| Integration completa | 294/294 PASS, oito arquivos |
| E2E focal Gika | 11/11 PASS, fresh/serial |
| Axe das jornadas conversacionais existentes | Zero violações |

Integração do cenário exato: OUT_OF_SCOPE não escreve; segundo turno produz descriptor literal; command real cria uma tarefa às19h na conta atual; retry retorna alreadyApplied; receipt recovery conserva o efeito; outra conta não é afetada. Reagendamento após conversa de organização mantém confirmação e não escreve no preview. E2E novo usa interpretação controlada derivada do normalizador real, Auth/commands/Firestore reais emulados, ACK e reload; não se apresenta como chamada live do modelo.

Primeiras falhas preservadas:

1. Typecheck inicial encontrou import ausente de resolveRescheduleIntent ao reutilizar o parser existente. Import corrigido, sem alteração do parser/contrato.
2. Primeira integração: 292 PASS / 1 FAIL. O caso de informação incompleta esperava a copy genérica anterior. A classificação de ação pede os campos da agenda; atualizada somente a expectativa de copy, mantendo ausência de descriptor, atividades e receipts. Rodada seguinte: 294/294 PASS (inclui mais um cenário focal de reagendamento).

Unitários e E2E passaram na primeira execução com as regressões adicionadas. Nenhuma deadline/retry/assertion de domínio ou segurança foi relaxada. Hotfixes de timezone/microcopy de áudio, voz, serviceControls, quotas, Auth, Rules, recurrence/batch e receipts permanecem.

## Limitações

Não houve smoke autenticado de produção nem Gemini live. A cobertura determinística não certifica toda interpretação do provider. Acesso Vercel de produção não foi verificado nesta execução; o acesso anterior retornava403. Intervalos e lembretes permanecem fora do contrato de tarefa simples. Nenhum deploy manual foi feito.
