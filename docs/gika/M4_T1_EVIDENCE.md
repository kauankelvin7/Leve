# M4-T1 — conclusão de tarefa simples

## Entrada e escopo

PRE `56b9308f8311fbd3e7e97a08530a366ede2b06c7`, branch `feat/gika-integration`, worktree limpo antes de editar. AGENTS/fontes Gika/CONTINUAR/plano vigente/evidências finais M3 relidos. Plano `M4_T1_EXECPLAN.md` gravado antes do código; auditor auxiliar somente leitura e implementação serial. Skill local oficial humanizer-br aplicada à copy; Superpowers indisponível, processo manual equivalente. Exclusivamente M4-T1, sem Gemini live, segredo, billing, push/deploy/merge ou M4-T2/T3.

## Auditoria e implementação

Today.changeStatus e ActivityDetail.status usam `sendCommand → activity.setStatus → contentCommand`, revisão esperada e receipt UID/operationId transacional. Reutilizado exatamente esse writer. Today não encerra timer; ActivityDetail encerra. Gika segue Today, sem timeEntry.stop. Reabrir convencional é status pending; não exposto pela Gika, sem undo genérico. Conventional setStatus completed repetido alteraria revision/completedAt: nova intenção já concluída é observação, sem command.

Diferença do plano inicial: `complete_task{activityId}` substituído por schema strict `{title,date}` (date null significa hoje civil); modelo jamais escolhe ID, UID, revisão, query ou identidade. Servidor valida verbo/título/data contra pedido original, usa read layer autenticada existente e deriva descriptor com ID e revisão reais. Dia único default hoje ou explicitamente mencionado, distância máxima366 dias, cap/partial existentes. Não busca sem-data/atrasadas/histórico irrestrito. Matching title.trim().toLocaleLowerCase(pt-BR), preservando espaços internos/acentos; sem fuzzy/substrings. Todos estados/kinds entram na ambiguidade antes de selecionar. Multiple/partial/none não mutam; canceled/event/série não suportados. Homônimos sem outra distinção resolvível exigem agenda convencional.

`completionEnvelope/completionBridge` só envia status completed pelo API existente, operationId=requestId software, expectedRevision original, queueOnNetworkError=false. Guard opcional strict gikaCompletion no command existente revalida task simples/pending/revisão/ownership e grava snapshot mínimo no mesmo receipt atômico (ID/título/data/fuso/revisão original). Nenhuma nova coleção, infraestrutura de dedup, outbox, Rule ou writer. ADR014 registra a decisão necessária.

`recoverMutation` unifica a leitura privada do receipt de criação/conclusão antes do provider, valida UID/hash/snapshot/ack e reautoriza. Mesmo texto/op recupera original e ainda exige command ack real; payload diferente conflita. Retry local conserva descriptor/revisão, concorrência divergente recupera receipt uma vez. Receipt, não memória, garante efeito no máximo uma vez entre processos. Nova intenção recebe UUID novo e pode observar já concluída. Observações sem mutação não são persistidas; repetição antes do primeiro commit pode reavaliar contexto, como M3. Conversa/pending não restauram após reload; após commit receipt permite reconciliação de envelope preservado.

Auth/profile/membership revalidados após upstream e leitura, token/UID antes de dispatch e depois de ack, e transação inclusive replay. Revisão mudada conflita sem refresh silencioso e preserva edição; UI mantém draft e pede novo pedido explícito. Sucesso estruturado completedTask só após ack estrito com operation/entity/revision+1 reais. Already-completed não afirma nova conclusão. Modelo/narrativa/descriptor isolado nunca confirma sucesso.

## Provas e evals

M4-E01..E10 em EVALS.md. Unidade schema strict, parser civil, IDs software, matching/case/trim/espaços internos, resolução. Integração com Auth/Firestore/commands/receipts reais emulados: única, data explícita, ambígua com completed+pending, nenhuma, completed, canceled/event/série/partial, auth/revogação após provider/read/antes do command, outro UID, revision alterada, payload/tool desconhecido/misto/forjado, chamada repetida, concorrência/retry/lost response e falha injetada antes/depois da transação. Guards arquiteturais proíbem persistência no model/router/policy/bridge. Command-auth exercita logout/troca durante token usando implementação real da plataforma, com Auth/transporte simulados.

E2E `gika-complete.spec.ts`: interpretação/descriptor fixture (não prova Gemini ou resolver live), comandos/Auth/Firestore/receipts reais emulados. Desktop light/mobile dark/Axe, ack retido depois do commit sem success prematuro, double submit, entity exata, lost ack/retry applied→alreadyApplied/revision2/model uma vez, observações sem command, edição convencional posterior preservada/conflict sem retry automático, logout durante espera sem dispatch. Resolução real é provada separadamente na integração. Screenshots sintéticos sem tokens/segredos.

## Gates finais

- Lint PASS; build/dois TS PASS; 218 unit/37 arquivos PASS;98 integração/4 arquivos PASS.
- `npm run check`: build/dois TS/218 unit PASS; shell12 PASS/1 FAIL contraste demo baseline. Medições desta execução2,86..3,30:1 para exigência4,5. Nenhum código de demo/estilo/harness alterado.
- Audit omit=dev:13 vulnerabilidades(9 moderate/4 high) baseline; package/lock idênticos. Sem audit fix/force.
- Suíte local completa:69 testes,58 PASS/11 FAIL baseline,18,6min. Todos38 E2E Gika PASS (6 conclusão,12 criação/undo,6 leitura/fallback,14 mock/shell), incluindo timer. Reflow200% também PASS; essas passagens não corrigem as pendências históricas. Resultado sanitizado em evidence/m4-t1-gates.json.

## Falhas durante implementação e baselines

RED inicial módulos novos ausentes; RED espaços internos revelou normalização indevida, corrigida no parser completion mantendo semântica do título; RED variante “Por favor, terminei Academia hoje” revelou risco de create_task errada, corrigida na guarda original de criação sem proibir verbo na literal tasktitle de pedido explícito de criação. Regressões GREEN e integração impedem escrita. Toolallowlist unit ajustada de4 para5 pela capacidade nova, sem desabilitar teste.

Primeira integração: Auth Emulator9099 ausente após processo anterior encerrado; CONNECTION_REFUSED/configuração ambiente, não regressão do produto. Reexecutada com emuladores reais. Uma iteração de teste novo agrupava quatro chamadas sob mesma conta e atingia limite existente3/min (429); fixture isolada por conta, sem relaxar quota/produto. Gates finais98PASS.

`evidence/m4-t1-baseline-files.json` compara23 arquivos com56b9308, todos byte-identical: dependências/lock, shell e harness históricos, estilos, demo, timer/launcher, API/outbox/Rules. Baselines anteriores preservados:12 Planner/harness, timer PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE (prova executável fc30bf9/T3 em M3_T3_EVIDENCE; passagem eventual não corrige), contraste demo, audit13. M1 offline foi regressão corrigida M2-S0, não confundida com timer. Nenhuma correção não relacionada.

## Limites e saída

Gemini interpretação real complete_task não executada; smoke M4 futuro somente após revisão T1/T2/T3. Sem conclusão de eventos/recorrência/batch/reopen/delete/undo genérico. Não condiciona agenda convencional ao provider. Confirmações/retries validados deterministicamente, sem certificado de release ou aparelho físico.

M4-T1 done, M4 permanece in_progress. M4-T2/T3 todo; parar para revisão antes de T2. Revisão da especificação, auth/receipt/revision/strict/escopo/humanizer/React e auditoria auxiliar read-only concluída sem bloqueio adicional. Artefatos históricos gerados pelos gates restaurados à entrada; screenshots novos revisados. Diff/segredos/dependências/grafo consistentes. Commit atômico desta tarefa; SHA real registrado no checkpoint documental posterior.

## Classificação final contra o checkpoint de entrada

11 falhas reproduzidas, todas subset dos12 baselines anteriores: Planner completed4,28:1; dois harness de frequência escondida; design espera Pular já concluído; signup Criar conta não exact; calendário assume Mês em vez de Semana; dois casos com Meu dia não específico; Notas/navigation duplicado; backup label antigo; tutorial label antigo. Mesmas causas da comparação executável isolada anterior, com23 arquivos ainda idênticos a56b9308. Nenhuma nova falha de produto não resolvida. Reflow e timer passaram desta vez; baseline conhecido não removido por passagem intermitente. Agenda convencional offline, sync entre abas, lixeira, conclusão/cronômetro/reload e sete testes sazonais PASS. Suíte global continua não verde; não desabilitar ou mascarar falhas.

Capturas: evidence/m4-complete-desktop-light.png e m4-complete-mobile-dark.png; conta/tarefas exclusivamente fictícias. Nenhuma chave/token/.env/header upstream em evidências versionadas.

Checkpoint atômico M4-T1: `c0de781413f00a00eeb3e498215f1f55db625ba7`, branch feat/gika-integration e worktree limpo confirmados depois do commit. Checkpoint documental posterior somente registra este SHA real. Parar antes de M4-T2, sem live.
