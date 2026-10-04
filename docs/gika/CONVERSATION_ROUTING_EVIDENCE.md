# Gika — roteamento conversacional

Base: `main@e129f65df6a02b76b9a51ed3f1caed6ae03dd69c`. Alteração autorizada diretamente em main. Validação em 2026-10-04 com dados sintéticos e emuladores; sem Gemini live ou alteração do Firebase de produção.

## Causa e correção

O adapter descartava texto livre do provider. Sem chamadas, o dispatcher sempre consultava a intenção de criação e devolvia uma pergunta sobre a tarefa/data, inclusive para saudações. O prompt não oferecia uma saída conversacional.

O Gemini recebe três categorias explícitas. `respond_conversation` é uma saída estrita de texto, sem ferramenta de persistência. O servidor valida chamadas e atribui `conversation`, `agenda_query` ou `agenda_action`; o modelo não fornece essa autoridade. Conversa não aceita reads ou descriptors. Misturar conversa com outra chamada é rejeitado. Ausência de chamada recebe esclarecimento neutro, não criação.

Criação exige verbo explícito no pedido atual. Título/data isolados pedem esclarecimento. Perguntas gerais sobre organização não entram no planner de agenda. Consultas continuam nas ferramentas read-only; ações continuam nos validadores, policy, confirmation, commands e receipts existentes. Nenhum writer, Rule, coleção ou dependência foi criado. `serviceControls`, quotas e reautorização permanecem; conversa também revalida autoridade após a espera pelo provider.

O cliente envia somente os últimos três pares de conversa geral, no máximo 1.000 caracteres por turno, dentro do limite JSON preexistente de 12 KiB. Não inclui automaticamente títulos/resultados/receipts da agenda. O contexto fica em memória, é descartado ao sair/trocar conta e não autoriza ações anteriores. Continuação de mutação exige pedido atual completo.

A interface omite a indicação técnica de timezone e a microcopy permanente de áudio. Datas/fuso e reconhecimento de voz permanecem funcionais. Uma declaração de propriedade de `GikaFault` substitui o parameter property incompatível com strip-only do Node 24, preservando a classe e seus diagnósticos.

## Gates e primeiras falhas

| Gate | Resultado |
|---|---|
| Audit produção, nível moderate | PASS; zero vulnerabilidades |
| Lint e AST boundaries | PASS; 51 fontes verificadas |
| Web/server typechecks | PASS |
| Build | PASS; aviso de chunk grande separado, sem aumento de limite |
| Unit completo | 598/598 PASS, 59 arquivos |
| Unit focal após ajuste final de prompt | 58/58 PASS |
| Integração Gika, cinco arquivos | 245/245 PASS em emuladores fresh |
| E2E inicial readonly/create/reschedule/voice | 37 PASS / 1 FAIL; primeira rodada preservada |
| E2E focal logout, cancelamento, troca de conta e composer | 4 PASS / 1 FAIL; falha de seletor descrita abaixo |
| Jornada conversacional corrigida | 1/1 PASS; 14,3 s, processo/emuladores fresh |
| Axe da jornada conversacional | Zero violações |

A primeira integração teve 243 PASS / 1 FAIL: a expectativa antiga de perguntar a data para título isolado contrariava a nova regra de intenção explícita. A asserção passou a exigir esclarecimento neutro, preservando verificações de ausência de mutação. Rodada seguinte: 244/244 PASS; com mais um cenário de ação sem título: 245/245 PASS.

A primeira falha E2E veio da fixture nova: respondia com consulta também ao terceiro pedido de conversa, criando dois landmarks de resultado com nome idêntico. A fixture foi corrigida para refletir o contrato, sem alterar Axe ou assertions. A extensão de logout revelou um segundo erro no teste: procurava heading `Entrar`, enquanto a tela usa `Entre na sua agenda`. O seletor foi corrigido, sem alterar produto ou timeout. A jornada completa passou depois disso. Os 37 casos preexistentes passaram na primeira rodada; os focais de cancelamento/logout/troca UID e composer passaram na rodada posterior. Não se declara a primeira suíte integralmente verde.

Regressões cobrem Oi/Obrigado/Quem é você/conversa geral, consulta de hoje, criação explícita sem título, criação indevida proposta pelo modelo, texto ambíguo, mistura de tools, história adulterada, histórico sem dados de agenda e limpeza após logout. Integrações também cobrem Auth, quotas, controles de serviço, confirmação, policy, revisions, receipts, recorrência e batch. E2E preservam criação, Undo, lost ACK, confirmação, stale/tamper e voz.

## Limitações

- Respostas Gemini foram verificadas pelo adapter real com transporte controlado; não houve chamada live ou smoke autenticado de produção.
- Acesso à configuração/deploy Vercel retorna 403 no escopo disponível. Push em main não prova que o deployment ficou pronto. Variáveis e configuração do deployment não foram certificadas nesta execução.
- `ServiceControlsMissing` continua fail-closed quando `serviceControls/global` está ausente; não é contornado pela conversa.
- Dois resultados repetidos do mesmo período podem ter landmarks com nomes iguais, comportamento anterior da interface. Essa dívida de acessibilidade fica registrada; não foi introduzida nem corrigida neste escopo.
- Follow-ups gerais têm contexto limitado; mutações não reutilizam alvos ou patches do histórico.
