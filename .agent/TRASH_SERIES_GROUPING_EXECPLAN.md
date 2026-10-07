# Lixeira agrupada e exclusão com resposta imediata

## Objetivo
Agrupar ocorrências da mesma série e retirar visualmente itens/séries imediatamente
após confirmação, mantendo processamento explícito e rollback em falhas.

## Contexto atual
Entrada main3b79601; árvore limpa antes da etapa. Trash listava cada ocorrência.
Today aguardava ACK para fechar modal/retirar série. purgeContent usava recursiveDelete
mesmo em folhas. Fontes de verdade e instruções do ambiente lidas nesta sessão.

## Não objetivos
Não reativar séries ao restaurar ocorrência, nem mudar retenção, Rules, escopos,
recorrência ou paginação de comandos. Limite existente de trashSeries:500 ocorrências;
lista cliente limitada50 por Rules. Não declarar latência zero do servidor.

## Contratos
Mesmo POST /api/commands, operationId, expectedRevision e isolamento por uid.
Agrupamento por seriesId, nunca pelo título. Cada ocorrência continua restaurável.
Estado local oculta somente durante exclusão/snapshot pendente; erro volta à fonte
real. Excluir tudo mantém cutoff estável e retries idempotentes; novos itens após
cutoff não são ocultados. Sucesso somente após ACK. Outbox existente preservada.
Somente shoppingList possui subcoleção de domínio e mantém recursiveDelete;
folhas usam target.delete após preparação autorizada e antes do recibo final.

## Passos
1. Agrupar lixeira em details acessível com datas e ações individuais.
2. Ocultar imediatamente itens confirmados e repor sobreviventes em falha.
3. Aplicar mesmo feedback na agenda, incluindo marcadores do calendário.
4. Eliminar travessia recursiva em folhas do servidor.
5. Provar atraso, falha/rollback e ACK/persistência com emuladores e Playwright.

## Ownership
Root: Trash.tsx/CSS, Today.tsx, server/commands/content.ts, E2E de recorrência e
estado/documentação. Sem delegação nesta etapa; sem dependências novas.

## Gates
Lint/boundaries/typechecks/build, unit, integração em emuladores e Playwright focal.
Diff-check e revisão dos caminhos de falha, cutoff e tipos de documento.

## Rollback
Reverter somente commit desta etapa. Nenhuma migração ou schema novo; documentos
removidos permanentemente continuam sujeitos à confirmação existente.

## Evidências
Lint/boundaries e build/typechecks PASS após mudança final do Today.
831 unit PASS;327 integração PASS/10 arquivos com backend alterado.
Playwright recurrence-options PASS1/15.2s: confirmação, cancelamento/Escape,
Axe, retirada antes da resposta e retorno em503 em ambos os fluxos; exclusão
real200, agrupamento de três ocorrências em uma entrada e lixeira vazia ao reload.
CI e Planner E2E da entrada3b79601 success. Sem medição de latência de produção.

## Estado de retomada
Implementação e gates concluídos; commit/push desta etapa na main em seguida.
Próxima ação: conferir CI/Planner do novo HEAD. Limites preexistentes acima registrados;
restauração de série inteira não implementada nem prometida nesta entrega.
