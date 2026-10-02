# M6 — evidência de execução

Entrada c840492d2f587f2222f9697fa5aecb5aac325ca6, consolidada por fast-forward aprovado de696e0e5, local/origin iguais e worktree limpo. Ponytail/full e Caveman/full instalados aplicados; humanizer local lido.

## T1

Contexto somente tarefas pendentes do dia, máximo5 sem truncar, title/status/date/time/indicador recorrente e slots temporários. IDs/revisões/UID/descrições/notas não vão ao provider. Uma chamada apenas; dados separados do system. Resposta strict cobre cada slot uma vez, software resolve entidade real, compara releitura inteira/revisões, valida agenda/DST/horizonte e scope. Sugestão sem execução. Horários conservados neste primeiro contrato; não inventa horário/duração. Semana ainda não habilitada em T1.

Primeiras execuções: lint/doisTS/build/495unit PASS. Após provas HTTP adicionais: lint/doisTS/build/501unit PASS. Nenhuma falha omitida, deadline/retry/asserção alterado. Build conserva aviso de chunk grande preexistente. Gate E2E e integração completos serão executados sobre fluxo M6 final; não declarar Gemini live.

Limites deliberados: até5tarefas pendentes datadas; concluídas/eventos não são reorganizados, horários conservados; sem expansão de rotina, future/all em composição não suportados. Sem novo writer/coleção/outbox/Rules/dependência/Undo.

## T2

Reutiliza BatchPlan, propósito/signer batch, bridge sequencial, guard transacional integral, receipts e activity.update. Proposal validada fica no mesmo selo com preservados; editar novo pedido torna prévia anterior terminal. Guard também revalida preservados, sem renovar revisão. Preview/cancel sem escrita; sucesso apenas ack; resultado itemizado partial/conflict/unknown e recovery originais. Sem undo novo.

Domínio suporta dueTime explicitamente via patch convencional: T2 permite sugestão de horário visível/selada, inclusive tarefa sem horário; não remove horário existente porque patch atual não suporta null. Não é horário inferido em command/default. Datas do dia podem ser distribuídas em horizonte software today..today+6.

Gates: lint/doisTS/build/502unit/250integração PASS; novas integrações cobrem preview0writes, preserve/concurrency/replay/recovery/auth/partial/stale. Primeiro novo typecheck após expansão de horário falhou por spread de union no fixture; corrigida tipagem concreta, sem alteração de asserção. Primeiro E2E7casos:6PASS/1FAIL17s, após ack o nome acessível mudou de Prévia do lote para Lote concluído; teste buscava nome antigo. Correção semântica do seletor, nenhuma deadline aumentada. Próxima rodada8/8PASS (novo caso protege invalidação ao digitar), Axe mobile-dark0, offline/draft/reconnect/logout/tamper/stale/cancel/ack real PASS. Logs sanitizados em /tmp/leve-m6-t2-*; não persistir tokens/traces.
