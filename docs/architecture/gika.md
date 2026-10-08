# Gika — integração na arquitetura do Leve

Este documento resume a fronteira de runtime. A [arquitetura especializada da Gika](../gika/ARCHITECTURE.md), [política](../gika/SECURITY_AND_POLICY.md), [especificação](../gika/PRODUCT_SPEC.md) e [evidências](../gika/) detalham contratos e milestones. A visão geral do sistema permanece nesta pasta.

## Pedido e leitura

1. O painel envia texto e `requestId` pelo adaptador web a `POST /api/gika/respond`, usando o token Firebase da sessão.
2. O middleware `/api` verifica o token. O router autoriza e deriva do perfil contexto civil, fuso e início de semana.
3. No caminho `ReadRepository.read()`, o repositório Gika lê no servidor atividades e séries do UID autenticado com queries limitadas a 50; snapshots podem ser marcados parciais. A inspeção de escopo de recorrência é um caminho separado: consulta ocorrências futuras com `limit(51)` e aceita no máximo 50; o 51º registro funciona como sentinela de saturação e impede tratar o conjunto como completo.
4. `server/gika/gemini.ts` implementa o adaptador para Gemini. Ele envia o texto e contexto necessário para interpretar o pedido. Nos fluxos de organização, envia uma projeção limitada de tarefas; não envia IDs de entidade ao modelo para ele escolher.
5. O router valida as chamadas do modelo, resolve entidades e aplica policy no software. Resposta livre do modelo não é tratada como comprovante de uma escrita.

Fontes: [adaptador web](../../apps/web/src/features/gika/apiAdapter.ts), [router](../../server/gika/router.ts), [repositório e leitura](../../server/gika/reads.ts), [adapter do modelo](../../server/gika/gemini.ts) e [model boundary](../../server/gika/model.ts).

## Escrita e confirmação

Quando uma intenção permitida resulta em mutação, o bridge da interface monta envelope de comando validado e chama o `POST /api/commands` existente. O servidor revalida conta, schema, entidade, revisão e recibo antes de gravar. O sucesso de UI depende do acknowledgement recebido.

O mecanismo de confirmação depende da ação: reagendamento usa preview assinado; recorrência pode exigir escolha de escopo e confirmação; lote apresenta plano bounded antes de executar item a item. Pedidos simples seguem suas políticas específicas, não um modal universal. Veja [confirmation bridges](../../apps/web/src/features/gika/confirmationBridge.ts), [command bridges](../../apps/web/src/features/gika/commandBridge.ts) e [Gika security/policy](../gika/SECURITY_AND_POLICY.md).

## Limites

- O modelo não recebe credenciais, UID, IDs escolhidos pelo cliente ou acesso Firestore.
- O servidor Gika usa Admin SDK para leituras próprias; por isso, autorização e limites estão no repositório/policy, não nas Firestore Rules.
- Mutação Gika não é enfileirada offline. Bridges chamam comandos com `queueOnNetworkError: false`.
- A Gika usa a API de comandos comum; não há um writer ou coleção de domínio paralelos para a assistente.
