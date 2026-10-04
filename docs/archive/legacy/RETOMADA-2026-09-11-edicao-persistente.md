# Retomada 2026-09-11 - edicao persistente

## Atualizacao posterior - lixeira global de itens

- `/lixeira` agora consulta os itens das listas de compras carregadas, exibe itens excluídos e restaura cada item enviando o `listId` da lista pai.
- A navegação principal passou a expor `Lixeira` com ícone próprio.
- `tests/e2e-local/persistent.spec.ts` recebeu um cenário focal para excluir, localizar e restaurar item de compras.
- Typecheck e build passaram após a alteração. O Playwright focal ficou inconclusivo nesta máquina porque o runner travou sem produzir resultado; a jornada ampla já falhava antes, na criação de atividade, fora deste slice.
- A primeira tentativa de integração foi bloqueada porque o Firestore Emulator estava desligado; os emuladores foram reiniciados, mas a repetição ficou pendente quando o terminal compartilhado entrou em estado de continuação do PowerShell.

## Avanco

- `/hoje` permite editar atividades existentes via `activity.update` com `expectedRevision`.
- A edicao de atividades preserva o formulario quando a API devolve erro/conflito.
- `/compras` permite editar listas e enviar listas a lixeira.
- `/compras/:id` permite editar itens, enviar itens a lixeira e restaurar itens da propria lista.
- A UI usa comandos existentes da API; nao houve escrita direta do cliente nas colecoes de dominio.
- O Firebase Web SDK foi configurado somente em `.env.local`, removendo o bloqueio visual de login neste ambiente sem versionar valores locais.
- Modelos de compras podem criar um ciclo mensal com itens copiados e desmarcados. O servidor rejeita novo ciclo para o mesmo modelo/mes e reenvios da mesma operacao permanecem idempotentes.

## Prova adicionada

- `tests/integration/identity.test.ts` cobre `shoppingList.update`, `shoppingItem.update`, conflito de revisao e restauracao de item.
- `tests/integration/identity.test.ts` cobre a criacao de ciclo a partir de modelo, copia de itens, idempotencia e duplicacao do mesmo mes.
- `tests/e2e/shell.spec.ts` foi ajustado para nao exigir formulario de login habilitado sem Firebase real/emulado configurado.

## Verificacoes executadas

- `npm run typecheck`: passou.
- `npm test`: passou, 3/3.
- `npm run build`: passou.
- `npx playwright install chromium`: passou.
- `npm run test:integration`: passou, 10/10, apos instalar OpenJDK 21 para o Firebase Emulator.
- `npm run test:e2e`: passou, 13/13.

## Proximo ponto

Repetir a prova E2E focal e a integração em terminal limpo; depois seguir para exportacao/importacao/exclusao de conta. Recorrencia, outbox/PWA e push permanecem pendentes e exigem provas proprias.
