# M4-T2 — atualização simples do título

## Entrada e escopo

PRE `02fe03e0ddf09d8f589c11a6cccc1c9c2df5bad5`, branch feat/gika-integration, worktree limpo verificado antes de editar. AGENTS/estado/grafo/ExecPlan/decisões/fontes relevantes e evidências finais M3/M4-T1 relidos. M4_T2_EXECPLAN.md persistido antes do código. Skill humanizer-br local oficial aplicada; Superpowers indisponível, processo manual equivalente. Auditor auxiliar apenas leitura, implementação serial; testes escritores de emuladores sequenciais. Exclusivamente update_task título, sem Gemini live/segredo/billing/produção/push/deploy/merge/T3.

## Auditoria e diferença do plano

Today.startEdit/save manda ActivityInput completo a sendCommand/activity.update/contentCommand com expectedRevision/receipt. Editor permite title/descriptionPlain/categoryId/colorHex/estimatedMinutes/schedule/reminderSpecs; status/recorrência separados. Expõe-se somente title. Date/time/timeZone/disambiguation/reminders continuam intactos; separar M4-T3 é viável. Conventional rename aceita pending/completed/canceled, então não herdar pending-only da conclusão. Categoria arquivada conserva validação convencional e pode impedir edição.

ReadItem omite campos privados: reconstruir fullInput com defaults apagaria dados. ADR015 registra adaptação mínima no MESMO writer: gikaUpdate optional strict limitado a activity.update/revision>0, payload patch `{title}` strict. Projeta ActivityInput atual preservando presença dos opcionais e aplica patch dentro de CADA tentativa transacional, variável hidratada local ao callback. Mesmo ramo update/validation/referências/reminderJobs/metadata/receipt; callers convencionais completos continuam iguais. Sem writer/endpoint/coleção/Rule/outbox paralelos ou campos inventados.

## Resolução, segurança e resultado

Tool strict `{title,date:null|civilDate,patch:{title}}`, título antigo textual e patch literal novo. Modelo não escolhe IDs/UID/revisão/operação/queries/receipt. Policy compara alvo/data/novo título ao pedido original. Matching trim/minúsculas pt-BR preserva espaços internos/acentos; sem fuzzy/substrings. Uma consulta de dia civil: hoje ou explícito, distância até366 dias, cap50/partial existente. Todos estados/kinds participam da ambiguidade antes de selecionar. Multiple/none/partial/evento/série não mutam. No-op igualdade exata após trim, sem command/revision; case diferente é edição intencional.

Quotes preservam palavras de data/“para” no título literal. Dia do alvo pode ser indicado após título antigo; RHS temporal/pedido composto fora de aspas pede esclarecimento, nunca reagenda. Guarda conservadora cobre também ações destrutivas/reagendamento e não bloqueia títulos explicitamente entre aspas.

RequestId software por intenção/UID → operationId; receipt existente transacional inclui descriptor original+patch/hash mínimo, sem descrição/cor/reminder privado. Replay retorna entidade/revisão original antes de novo provider/hidratação, mesmo depois do título antigo desaparecer. Mesmo ID/payload divergente conflita; nova intenção gera novo ID. Memória local só preserva envelope pendente, não garante dedup. Observações sem mutação não persistem receipt, conversa/card/pending não restauram após reload, conforme ADR014. Retry com envelope preservado recupera receipt.

Auth após upstream/leitura/token/ack e membership/ownership dentro da transação incluindo replay. Revisão obtida na resolução é precondition, sem refresh para sobrepor edição posterior. GIKA_UPDATE_CONFLICT copy: “Essa tarefa mudou enquanto você estava editando. Faça o pedido novamente.” Draft preservado, retry automático não oferecido; novo pedido explícito tem nova identidade. Structured updatedTask/card com título novo somente depois de ack real validado de operation/entity/revision+1. Narrativa/descriptor isolado não é sucesso. Nenhum Undo novo.

## Testes e evals

M4-E11..E20 em EVALS.md. Unit strict/schema/selector civil/quotes/patch/no-op/unsupported/preservação/envelope software; adapter com ack retido/falha/retry/conta/mismatch/resultado forjado; command-auth exercita sendCommand real após espera token com Auth/transporte fixture. Architecture guards impedem entrada de persistência no model/router/policy/bridge.

Integração usa Auth/Firestore/command/receipt reais emulados e interpretação fixture. Prova campos privados/temporais/ausência opcional, estados convencionais, homônimos/partial/none/série/evento, dia explícito, auth/membership/contas isoladas, original revision, concurrency/replay/lost ack/falha pre/postcommit/payload divergente/functionCall repetida/unknown/temporal/narrativa/composto/categoria arquivada. Não expõe conteúdo privado em diagnóstico.

E2E gika-update.spec.ts usa interpretação descriptor fixture, command/Auth/Firestore reais emulados. Desktop light/mobile dark/Axe, patch-only ID/revisão exatos, ack retido pós-commit e nenhum card antes de liberar, double submit um dispatch, tarefas vizinhas intactas/reload, lost ack applied→alreadyApplied/revisão2/model uma vez, no-op/ambígua/none/partial sem command, edição convencional concorrente preservada/conflito sem refresh, logout durante espera sem dispatch/card antigo. Não comprova interpretação Gemini live; smoke M4 futuro depende de T3 revisado/autorizado.

## Gates / estado de execução

Lint/dois TS/build/unit PASS;262 unit/38 arquivos finais. Check final build/dois TS/262 unit PASS, shell12 PASS/1 FAIL contraste demo baseline2,48..3,14:1 (primeira execução13 PASS; passagem intermitente não corrige). Integração inicial119 PASS, final123 PASS/4 arquivos depois de quatro regressões adicionais e correção da fixture de evento. Suíte local completa75:62 PASS/13 FAIL,43 Gika PASS/uma falha por transporte acima do deadline preexistente;10 E2E finais PASS (seis update, originais criação/undo+manual e duas sondas controladas). Audit13(9 moderate/4 high) baseline, nenhuma dependência/lock modificados, sem audit fix.

## Baselines e revisão

evidence/m4-t2-baseline-files.json:26 arquivos byte-identical a02fe03e, incluindo dependências, estilos/timer, API/outbox/Rules e harness convencional. Planner contraste4,28:1 e frequência oculta já reproduzidos na execução ampla; mesma causa/evidência anterior, não regressão do rename. As outras dez falhas históricas de harness mantêm as classificações do M4-T1: frequência oculta, tutorial já concluído, labels antigos e seletores duplicados. A passagem eventual dos mesmos testes não remove pendências. Timer PREEXISTING_UI_TRANSFORM_MEASUREMENT_RACE e contraste demo continuam pendências mesmo quando passam. M1 offline foi regressão corrigida M2-S0, não confundir com timer. Não houve correções de baseline ou testes desabilitados.

Revisão auxiliar leu contrato/transaction/receipt/auth/patch e encontrou guarda incompleta de pedidos compostos; ampliada conservadoramente fora de aspas e coberta com regressão. RED inicial módulo ausente e parser de “amanhã” com borda ASCII; corrigido com borda Unicode, GREEN. Nenhuma falha nova foi aceita como baseline sem prova contra entrada. Na integração ampliada, fixture de evento sem allDay obrigatório foi classificada corretamente partial (nenhuma mutação); corrigida para evento válido allDay:false, sem mudança de produto. A primeira sonda manual isolada não ativava o perfil de teste recém-semeado; setup da sonda passou a usar enter existente, sem alterar o harness original/produto.

## Intermitências de deadline comparadas à entrada

A suíte ampla teve duas ocorrências adicionais: criação/undo não recebeu card antes de10s e tempo manual ficou sem histórico antes de10s. Trace sanitizado da primeira: command HTTP200/duração10143,776ms; na segunda requests finais ficaram sem ack até teardown da asserção. Não registrar conteúdo/header/token. Classificação: ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE, não regressão do patch de título.

Comparação executável em git archive02fe03e isolado e versão atual, mesmo ambiente emulado, escritores sequenciais. Testes originais inalterados de criação/undo e manual PASS nas duas versões. Sondas temporárias seguram ack de criação por10200ms após commit real, ou transporte manual por10200ms antes do commit real: nas duas versões, asserção original de10000ms expira e em seguida card/undo ou histórico/reload funcionam depois do ack/commit. A falha de navegação Meu dia duplicado também se reproduziu no02fe. Artefato m4-t2-ack-baseline.json conserva só medidas/resultados. Sondas removidas do checkout e não versionadas; nenhum deadline/teste/produto/baseline foi “corrigido”. Não se atribui o atraso espontâneo a provider/modelo; upstream nessa prova é fixture.

Gate global segue não verde.13 falhas iniciais =11 causas históricas idênticas +2 intermitências de transporte/harness demonstradas contra entrada.26 caminhos de referência byte-identical, incluindo timer convencional, comando timeEntry e teste original criação/undo. Suíte final focal10 PASS em servidor reiniciado com código final: originais criação/undo/manual, seis update e duas sondas; todos44 cenários Gika únicos têm passagem observada (43 no amplo + criação/undo na repetição), sem esconder a falha inicial.

## Saída

M4-T2 done, M4 in_progress, M4-T3 todo. Fontes de estado/grafo/evals atualizadas; ADR015 necessária ao contrato patch. Revisão spec/security/command/receipt/strict/React/humanizer e auditoria auxiliar somente leitura concluídas. Capturas desktop light/mobile dark revisadas; somente dados sintéticos. Artefatos históricos gerados pelos gates restaurados à entrada e sondas temporárias removidas. Nenhuma dependência/Rule/outbox/modelo/billing/segredo/live alterados.

Commit atômico M4-T2 `ededc2090887c181f6f463d92cda934a9cd6d16a`, branch feat/gika-integration e worktree limpo confirmados depois do commit. Checkpoint documental posterior somente registra esse SHA real. Parar para revisão antes de M4-T3, sem Gemini live.
