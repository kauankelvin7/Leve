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

## T3 e regressões concretas

Semana reutiliza readRange/get_week e weekStartsOn/fuso reais do perfil. Somente pendentes datadas de hoje em diante são propostas; horizonte da semana civil não ultrapassa7dias. Mesmo contrato valida slots, snapshot integral, datas/DST/horários, recorrência/cap e selagem. Organização diária lê apenas hoje e pode distribuir até today+6; semana lê o intervalo civil existente. Partial/limit/empty/scope_required/unsupported_scope/stale são estados estruturados sem autorização. No-op é sugestão somente leitura. Completar, criar, renomear e reagendar individualmente preservam seus contratos; títulos com “Organizar semana” não desviam essas intenções.

Primeiro unit T3:502PASS/1FAIL. Tool diferente em proposta acionava parse não tratado e retornava503 em vez de422. Causa corrigida com safeParse/fault tipado, regressão passa sem afrouxar schema. Rodada corrigida503unit/251integração PASS; após provas de occurrence, chamada repetida e guard arquitetural:506unit/252integração PASS. Prompt corrigido para permitir mudança de data **ou** horário, coerente com schema/patch.

Primeira suíte Gika completa:85/85PASS em13,4min (76 preexistentes +9 organização). Depois dela, revisão encontrou confirmação de organização ainda habilitada offline. Correção mínima: card usa conectividade já existente, aborta envio pendente, mantém Cancelar disponível; bridge verifica offline antes de cada command/resend, deixa não enviados pendentes e preserva acks anteriores. Reconectar não executa. Dois unitários cobrem offline antes/entre itens e um E2E cobre card pendente/reconexão/cancel. Lint/doisTS/build/508unit/252integração PASS após a correção. Execução completa final com esse caso:86/86PASS em13,6min, sem falha/retry adicional.

## Segurança, arquitetura e limites

Produção audit high e JSON:0critical/0high/0moderate/0total. Admin13.10.0/dependências/lock/Rules/Auth/membership/outbox/writer convencionais não mudaram. Único caminho de mutação continua sendCommand→activity.update→transação/receipt existente. Guard batch existente incorpora preservados; nenhuma nova collection, Rule, engine, signer, command layer ou persistência de conversa. Guard arquitetural unit existente ampliado para os dois arquivos novos de domínio/policy.

Preview/cancel0writes, UID/revisões/efeito selados, cap5, occurrence explícito, future/all negados na composição; replay/lostack/concorrência recuperam receipts originais. Sem refresh de revisão, truncamento, atomicidade global ou Undo universal. Remover horário não é suportado pelo patch; sugerir um horário é permitido somente no diff confirmado. Eventos/concluídas/passado/tarefas sem data não são reorganizados, séries não são materializadas para o modelo. Proposta/card não sobrevivem reload nem autoexecutam.

Token medido com5 tarefas recorrentes e títulos Unicode no limite:13084bytes, abaixo do cap16384; chave aleatória só em memória, nenhum token/credencial registrado. E2E usa previews assinados controlados para observar UI/execução; integração usa ModelAdapter fixture e leitura/Auth/Firestore/commands/receipts reais emulados. Nenhuma GEMINI_API_KEY nem interpretação Gemini live nesta execução; limitação explícita, sem smoke cerimonial.

Baseline responsiva c840492 preservada, sem alteração CSS/shell/Today. Prévia mobile-dark e semana desktop-light inspecionadas visualmente; Axe nas duas superfícies sem violações. Screenshots/logs de desenvolvimento apenas /tmp; 7 imagens históricas geradas pelos gates restauradas byte a byte ao HEAD antes do commit. Nenhuma deadline/retry/assertion de segurança reduzida, nenhum teste ignorado.


## Gates finais e checkpoint

| Gate | Resultado |
|---|---|
| npm audit --omit=dev --audit-level=high + JSON | PASS;0total/critical/high/moderate |
| npm run lint | PASS |
| npm run typecheck (cliente e servidor) | PASS |
| npm run build | PASS; aviso histórico chunk>500KB preservado |
| npm test | 508/508PASS |
| npm run test:integration | 252/252PASS,8arquivos/emuladores demo novos |
| Gika completa: oito specs M1–M5 + organization | 86/86PASS,13,6min;76 antigas +10 novas |
| npm run test:e2e -- tests/e2e/shell.spec.ts | 17/17PASS,46,7s; matriz320..2560px/light-dark/Axe |
| Axe prévia organização mobile-dark/desktop-light | 0 violações; inspeção visual real |

A primeira ampla85/85 precede a correção offline e permanece registrada; a final86/86 passa após correção concreta, não repetição para obter verde. Revisão da prova semanal encontrou fixture com origem na mesma data: teste existente fortalecido com criação/edição convencionais em hoje e amanhã, confirmação/replay preservando cada data/revisão/campos privados. Lint/doisTS/integração completa252PASS novamente, sem adicionar teste/deadline ou alterar produto. Aviso MetadataLookup403 genérico dos emuladores preexistente, sem falha dos gates.

Não mudaram dependências/lock, Rules, Auth/membership, command layer/outbox nem CSS/shell/Today. Todos76 E2E antigos byte-idênticos, guard de fronteira existente ampliado trivialmente. Nenhum npm verify/harness novo necessário. Logs de gates em /tmp/leve-m6-final3-*, /tmp/leve-m6-final-corrected-*, /tmp/leve-m6-week-proof-*, /tmp/leve-m6-shell.log; apenas resultados sanitizados neste documento, sem tokens/traces/payload privado versionados.

T1 commit e39cd6a632bf018b09d7666e0a0b77ba6f9968a1; T2 commit85e3ec95b6c1ce7925edfe28eecab29945fb1d2a. T3 funcional e checkpoint final são registrados no STATE após commit, com backup somente feat/gika-integration e verificação local=origin/worktree limpo. M6-T1/T2/T3 done; parar para revisão antes de M7, sem milestone/closure adicional.
