# Agendamento e notificações por interpretação semântica

## Objetivo
Gemini interpreta o pedido completo, incluindo notificação automática e resposta
de esclarecimento. O caso feira não pode virar academia nem exigir reenviar um
pedido que já contém título, data e hora.

## Contexto atual
Entrada main e3caf7f. O atalho notificationCapability intercepta o pedido antes
do provider. validateSemanticCreation exige verbo de criação até em continuação.
Job at-time já existe no writer convencional para atividades com horário.

## Não objetivos
Avisos contínuos, novas ferramentas de lembrete, nova persistência, cobrança ou
alterações das confirmações de reagendamento/rotina/lote.

## Contratos
respond_turn interpreta finalidade/certain/explicitAction/proposals. O servidor
confere título/data/hora no texto atual; contexto pode indicar que uma resposta
completa atende a um esclarecimento, nunca fornecer campos ausentes ou confirmar
preview. Auth/quota/receipt/command/ACK continuam obrigatórios.

## Passos
1. Reproduzir casos diretos, continuação e restrições com regressões.
2. Remover interceptação; informar capacidades ao Gemini em todos os caminhos.
3. Validar resposta completa de esclarecimento e condições de notificação.
4. Provar criação e job automático em emuladores e navegador; revisar negativos.
5. Atualizar evidência e estado.

## Ownership
Executor principal: server/gika, testes Gika, docs/.agent. Sem subagentes mutáveis.

## Gates
Unitários Gika, integração autenticada/comandos/reminderJobs, Playwright para
criação/retry/contexto/negação; lint/typecheck/build e revisão de diff.

## Rollback
Reverter apenas o commit desta entrega. Preservar o job automático existente.

## Evidências
826 unitários PASS; lint/boundaries/typechecks/build PASS. Integração ampla
323/323 PASS; focal final adapter/Auth/Firestore/command 9/9 PASS. Playwright
crítico 8/8 PASS (assinaturas, lote, recorrência, ACK perdido, logout e duplicação).
Gate novo de notificações 2/2 PASS; reexecução final inclui desfazer e configuração
padrão do webServer. Falhas iniciais preservadas em docs/gika/NOTIFICATION_REASONING.md.
Gemini live indisponível: GEMINI_API_KEY ausente, nenhum request live.

## Estado de retomada
Implementação autorizada pelo pedido de 07/10/2026. Main recebida limpa e3caf7f.
Etapas 1–5 concluídas após gates finais. Checkpoint:
fix(gika): interpret scheduling and notification intent together.
Próximo: avaliação Gemini live dos casos NR01–NR12; entrega push em aparelho real.
