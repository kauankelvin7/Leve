# Avisos automáticos pela manhã

## Objetivo
Adotar 9h locais para data sem hora, após aprovação da recomendação pelo usuário.
Manter automática e sem seletor por atividade; comunicar pela manhã na UI/Gika.

## Contexto
Entrada46a18a8: padrão00, BackfillV3 e rejeição de jobs antigos personalizados.
Google oferece padrões de agenda; 9h é decisão de UX do Leve, não garantia do Google.

## Contratos
Data com hora preservada; sem data nenhum job; dia inteiro primeiro dia. Fuso
IANA, DST, instantes nulos e antecedências preservados. Migração V4 mantém IDs,
revisão, histórico de entrega e jobs finais. Sender verifica todos os jobs sem
hora, reagendando divergentes futuros, inclusive após janela antiga expirar;
se novo horário passou, obsoleta. Sem notificações retroativas ou reenvio.

## Não objetivos
Resumo diário agregado, hora configurável, quiet hours para eventos com hora,
novas ferramentas Gika, infraestrutura, recebimento push real neste ambiente.

## Passos
1. Domínio09, prompt e copy pela manhã.
2. MigraçãoV4 e reparo no sender sob lease existente.
3. Provas de fuso/DST/migração/sent/partiais, integração, Playwright e gates.
4. Documentação, revisão, commit e integração main já autorizada.

## Ownership
Root; sem concorrência de agentes.

## Gates
Lint/boundaries/typechecks/build/unitários, integração Auth/Firestore demo-leve,
Playwright focal de dia inteiro/Gika/cores. Sem credenciais de produção.

## Rollback
Reverter este commit; nova migração seria necessária para realinhar horários
novamente. Nunca resetar jobs entregues ou apagar histórico de tokens.

## Evidências e retomada
Concluído, revisado; pronto para integração autorizada na main.
- Entrada46a18a8: CI e Planner E2E externos success confirmados.
- npm run lint/build/test PASS: boundaries, dois TS, produção, 831 unitários.
- npm run test:integration PASS: 327 casos/10 arquivos, Auth/Firestore demo-leve.
  Provas incluem midnight→9 sem campo legado, V3 completo→V4, idempotência,
  sent não reaberto, tokens preservados e reagendamento sob lease apesar da
  janela antiga expirada. Sem alteração de Rules/índices/dependências/custos.
- Primeira integração: teste de entrega/retry injetava job em tarefa sem data.
  Nova validação o invalidou corretamente; fixture corrigida para atividade
  com horário, sem afrouxar provas de entrega incerta, retry ou isolamento.
  Reexecução completa acima PASS. Typecheck exigiu narrow explícito no horário
  retornado como unknown pelo builder; corrigido antes dos gates finais.
- Playwright local all-day-colors.spec.ts + gika-notifications.spec.ts PASS4:
  ACK real, job 12:00Z=09:00 São Paulo, copy pela manhã, tarefas sem hora,
  esclarecimento/condições, cores/notas/modal/foco/Axe. Upstream Gemini controlado.
- Fuso/DST em São Paulo e New York, instantes nulos, legado ignorado e tarefas
  com hora preservadas cobertos nos unitários; antecipações na integração.
- git diff --check PASS. Gemini live e push em aparelho real NOT_RUN.
CI do novo commit acompanha publicação; não declarar deploy/recebimento reais.
