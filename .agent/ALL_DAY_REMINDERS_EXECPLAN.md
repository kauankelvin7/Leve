# Avisos para atividades sem horário

## Objetivo
Tarefas com data e compromissos de dia inteiro recebem aviso às 00:00 no
fuso da atividade, sem precisar adicionar hora ao compromisso. O formulário
permite escolher outro horário nas opções, sem pedir ativação do padrão. A Gika descreve a capacidade real.

## Contexto atual
Jobs existentes exigem dueAt/startsAt e descartam atividades sem hora.
Comandos, receipts, revisões, leases e permissão de notificações permanecem donos
da persistência e entrega. Não há escrita direta do navegador no domínio.

## Não objetivos
Avisos contínuos, anexos Drive, aniversários e novas frequências de recorrência.

## Contratos
dayReminderTime é HH:mm opcional no ActivityInput; ausência significa 00:00.
Instantes da atividade continuam nulos quando sem hora. Resolver apenas o instante
do lembrete com Temporal e o fuso IANA. Antecipações usam esse instante base.
Um aviso no primeiro dia por ocorrência; atividade sem data não cria jobs.

## Passos
1. Domínio e jobs; validar datas, fuso, 00:00, DST e antecipações.
2. Formulário, transporte de campos e instruções/policy da Gika.
3. Backfill versionado, integração, Playwright e revisão do diff.

## Ownership
Executor principal; nenhuma edição concorrente.

## Gates
Unitários, integração com emuladores, lint, build e E2E do formulário/Gika.

## Rollback
Reverter o commit específico; registros novos são retrocompatíveis.

## Evidências e retomada
Concluído: domínio/jobs, formulário, import/leitura/calendário, Gemini/policy,
backfill V2 e seletor compartilhado ColorPicker nas atividades e notas.

- 830 unitários em 70 arquivos PASS; após revisão, 85 unitários focais PASS.
- 324 integração em 10 arquivos PASS; backfill ampliado e dia inteiro: 2 focais PASS.
- Playwright: 4 PASS, upstream Gemini controlado e Auth/Firestore reais emulados.
  Aviso 00:00, seleção/check/Escape/foco, Axe sem violações, nota preservada após
  reload, mobile390 e desktop1280 com texto200%.
- Lint, boundaries, dois typechecks e build PASS; chunks grandes preexistentes.
- Screenshot sintética /tmp/leve-activity-color-modal.png e
  /tmp/leve-note-color-modal.png inspecionadas; não versionadas.
- Primeira tentativa Playwright falhou por getByLabel exact num select cujo label
  inclui opções; usar papel combobox resolveu, sem alterar produto ou timeout.

Revisão: sem novos writers/dependências/Rules, same IDs/revisões/idempotência,
sem alteração dos horários da agenda nem do opt-in de notificações no aparelho.
Sem avisos passados; tarefas de hoje criadas depois de 00:00 não disparam retroativo.
Gika live sem chave não avaliada. Nenhum push real em aparelho declarado validado.
Próxima prova: recebimento em dispositivo com scheduler/FCM/permissão ativos.

## Ajuste descoberto no gate crítico
O checkpoint de entrada já tinha CI falhando no logout (run37592718928).
Reproduzido: navegação antecipada competia com o reload de limpeza offline;
depois de aguardar reload, surgiu diagnostic.report de listener encerrado.
Logout agora encerra live queries antes de terminate/limpeza do Firestore;
callbacks tardios são ignorados, sem relatório nem republicação de dados.
Unitário cobre callback após encerramento; teste de logout aguarda load e mantém
a exigência original de zero comandos e conversa vazia. Gate crítico reexecutado:
8/8 PASS; lint/build/dois TS e 830 unitários PASS após a correção.
Transporte do campo de aviso no calendário: 9 unitários focais PASS.
Os 4 novos E2E também entram no CI para regressão contínua.

## Follow-up — foco de notas após remontagem
CI37596362807: auditoria/lint/tipos/build/unitários/integração/críticos8/focais4
PASS, Planner e Seasonal PASS; suíte visual 12/13 com falha ao editar nota.
O timer de foco podia executar antes de a nova instância do form estar no DOM.
Notas agora solicita foco com ref e o aplica em useLayoutEffect após formVersion;
restaurar draft/selecionar preset não rouba foco sem solicitação explícita.
Mantidas as asserções e snapshots originais; gate focal do modal ganha exigência
de foco no título ao editar a nota recuperada.

Playwright Chromium153 bundled: mobile-refinement3 + all-day-colors1 = 4 PASS,
sem atualizar snapshots ou tolerâncias. Antes de instalar esse browser, o Chromium
do sistema divergiu do snapshot de compras; não foi usado para aprovar esse gate.
Lint/boundaries/dois TS/build e 830 unitários PASS após a correção.
Follow-up pronto para integração; CI externo final acompanha o próximo commit.
