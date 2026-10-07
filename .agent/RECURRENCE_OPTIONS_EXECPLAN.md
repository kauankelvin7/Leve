# Repetição e avisos ampliados

## Objetivo
Seletor modal com não repetir, diário, semanal, mensal, anual e personalizar.
Personalizar permite intervalo em dias/semanas/meses/anos e fim por data/quantidade.
Avisos antecipados em mais intervalos e quantidade/unidade personalizada.

## Contexto atual
Na entrada, RecurrenceRule admitia daily/weekly/monthly; writers e scheduler materializam
ocorrências dentro do horizonte de 45 dias. ReminderSpecs max3, minutesBefore
0..43200. Padrão automático à meia-noite para atividades com data sem hora. Pedido adicional
fixa esse horário no sistema, removendo configuração/menção espontânea da UI.

## Não objetivos
Dias alternados dentro da semana, anexos, aniversário como novo tipo, recorrência
pela Gika, notificações contínuas ou mudanças de infraestrutura.

## Contratos
Adicionar yearly sem alterar campos antigos. monthlyPolicy governa também
29/02 anual: último dia ou pular ano. Calcular cada ocorrência a partir da data
original, sem drift; preservar offset/horizonte, revisão, writer e jobs existentes.
dayReminderTime legado é aceito mas ignorado no cálculo; backfill V3 realinha
jobs futuros pendentes, scheduler rejeita jobs legados divergentes.
ReminderSpecs permanece max3; formulário permite até30dias de antecedência.
Modal compartilhado de opções conserva foco/Escape/inert sem cores artificiais.

## Passos
1. Prova unitária anual, bissexto, intervalos e retomada; implementar domínio.
2. Renderer modal compartilhado, opções de repetição e avisos.
3. Integração real, Playwright, revisão e documentação; commit/main autorizados.

## Ownership
Executor root; sem edições concorrentes.

## Gates
Unitários, lint/typechecks/build, integração em demo-leve, Playwright móvel e Axe.

## Rollback
Reverter commit próprio. Séries anuais existentes precisam ser pausadas antes de
rollback para versão que não reconhece yearly; não reverter Rules/dados silenciosamente.

## Evidências
- Pesquisa oficial Google concluída; fontes e diferenças no relatório de produto.
- Prova anual RED antes da implementação, depois PASS: clamp/pulo bissexto,
  intervalo, offset, horizonte, término e limite civil 9999.
- `npm run lint && npm run build && npm test`: PASS; boundaries, ambos os TS,
  build e 831 unitários/70 arquivos. Warning de bundle >500kB já existente.
- `npm run test:integration`: PASS, 326 casos/10 arquivos em demo-leve.
- Após ampliar prova contra envio de job legado divergente:
  `firebase emulators:exec --project demo-leve --only auth,firestore
  "npm run test:integration:inside -- tests/integration/identity.test.ts"`:
  PASS, 27 casos, incluindo migração, realinhamento e zero envios obsoletos.
- `playwright test --config playwright.local.config.ts recurrence-options.spec.ts
  all-day-colors.spec.ts gika-notifications.spec.ts calendar-planner.spec.ts`:
  PASS, 12 casos. Auth/Firestore reais emulados; upstream Gemini controlado.
  Anual/custom/count, três antecipações, ausência de controle 00:00, ACK200,
  foco/Escape, cores/notas/reload, Axe, móvel, revisão/escopos/offline/gestos.
- Primeira execução interrompida após falha no seletor getByLabel exact do
  select Termina; DOM mostrou combobox com nome correto. Corrigido para papel
  acessível; execução completa acima passou. Não relaxar asserções/snapshots.
- Revisão corrigiu ausência de data final: FormData null não deve virar "null".
  Novo E2E prova payload until=null e ACK real para série anual/personalizada.
- `npm run test:e2e:critical`: PASS, 8 casos (idempotência, logout, ACK perdido,
  transporte adulterado, organização, escopo recorrente).
- Modal revisto visualmente no Chromium bundled153 em 390×844; sem overflow.
  Evidência local `/tmp/leve-recurrence-options.png`, só dados fictícios.
- `git diff --check`: PASS. Sem novas dependências, índice, Rules ou custos.
- Nenhum teste Gemini live ou recebimento push real declarado.

## Estado de retomada
Entrada4ab5d2e, CI37597837836 aprovado. Etapa concluída, revisada e pronta para
integração autorizada na main. CI desta entrega acompanha o commit publicado.
