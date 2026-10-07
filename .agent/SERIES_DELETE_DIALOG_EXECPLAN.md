# Confirmação de exclusão de séries

## Objetivo e contexto
Pedido explícito para substituir aviso JavaScript. Entrada65ecd9c, main limpa.
Reusar ConfirmDialog, informar título, alcance histórico e lixeira30dias.

## Contratos e não objetivos
Mesmo activity.trashSeries/revisão/outbox/writer. Confirmar exige clique;
cancelamento/Escape não enviam comandos. Estado busy bloqueia fechamento e
novos envios; erro visível preserva confirmação. Não implementar novos escopos
ou paginação/restore de séries nesta entrega de apresentação.

## Passos e ownership
Root: integrar dialog/state, fechamento nativo/restauração de foco; provas de
teclado/cancelamento/ACK real/sem JSdialog/Axe, revisão/documentação/main.

## Gates
Lint/boundaries/typechecks/build; Playwright existente ampliado para confirmar
exclusão real e zero comandos ao cancelar. Verificação visual focal anterior.

## Rollback
Reverter commit próprio de apresentação, sem mudanças de dados/Rules.

## Evidência/retomada
Em execução. Primeira prova apontou retorno de foco quebrado no ConfirmDialog
em StrictMode: cleanup precisa fechar o dialog antes de focar o acionador.
CI37605843990 da entrada falhou por geometria antes de carregar fontes:
screenshot já estável mostrou card724 <navbar760, medida anterior779. Added
await document.fonts.ready antes das medidas; snapshots/limites preservados.
Testes só Auth/Firestore demo-leve e dados fictícios; sem prova push/Gemini live.


## Gates finais
Concluído e revisado. npm run lint/build PASS: boundaries, ambos os TS e build.
Playwright recurrence-options + visual-polish focal PASS2: cancelamento e Escape
não enviam comandos, foco volta ao acionador, sem JSdialog, Axe, exclusão real
ACK200 e fechamento/remoção. Meu dia passou em ambos os modos, quatro larguras,
com snapshots originais. Nenhuma tolerância relaxada. Primeira prova de exclusão
foi interrompida pois consultava dia atual, não o dia criado; corrigida navegação
para data da série antes do teste. Gates repetidos após correções de foco/fontes.
Diff-check PASS. CI desta entrega segue o novo commit; não declarado como PASS.
