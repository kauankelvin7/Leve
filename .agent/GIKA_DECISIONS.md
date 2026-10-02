# Gika — Decision Log

Registre decisões que alterem arquitetura, contratos, segurança, UX ou estratégia de rollout.

Formato:

## ADR-GIKA-XXX — Título

- Data:
- Status: proposed | accepted | superseded | rejected
- Contexto:
- Decisão:
- Alternativas consideradas:
- Consequências:
- Arquivos/contratos afetados:

---

## ADR-GIKA-001 — IA não acessa persistência diretamente

- Data: bootstrap
- Status: accepted
- Contexto: A Gika precisa consultar e modificar a agenda sem permitir que o LLM determine livremente operações de banco.
- Decisão: O modelo só pode solicitar ferramentas tipadas. Ferramentas passam por policy/validation e chamam a camada de comandos/regra de negócio existente.
- Alternativas consideradas: acesso direto ao Firestore; geração de queries pelo modelo.
- Consequências: maior previsibilidade, segurança, testabilidade e facilidade de troca de provedor.

## ADR-GIKA-002 — Repositório como memória persistente

- Data: bootstrap
- Status: accepted
- Contexto: sessões de agentes podem terminar, trocar de modelo ou perder contexto.
- Decisão: progresso, decisões, bloqueios, tarefas e evidências devem ser persistidos e versionados no repositório.
- Consequências: retomada determinística e menor dependência do histórico de conversa.

## ADR-GIKA-003 — Paralelismo conservador

- Data: bootstrap
- Status: accepted
- Contexto: múltiplos agentes alterando estado compartilhado elevam risco de conflitos e regressões.
- Decisão: subagentes são preferidos para leitura, auditoria, revisão, segurança, testes e ownership disjunto. Implementações dependentes são serializadas pelo orquestrador.
- Consequências: menos conflitos e integração mais previsível.

## ADR-GIKA-004 — Preservar a fundação e as instruções do Leve

- Data: 2026-09-30
- Status: accepted
- Contexto: checkout contém AGENTS.md e CONTINUAR.md anteriores ao pacote; HEAD real f6b21b6 é posterior ao HEAD mencionado em CONTINUAR.
- Decisão: manter integralmente AGENTS.md original e anexar instruções Gika; pedido atual autoriza branch/commits Gika, sem iniciar Fase 7 sazonal/deploy. Memória Gika em .agent; CONTINUAR aponta para ela.
- Alternativas consideradas: sobrescrever AGENTS e perder regras de custo/domínio; reiniciar plano sazonal.
- Consequências: regras compatíveis coexistem; instrução mais recente do usuário continua prioritária; ausência de humanizer-br precisa ser resolvida antes de criar textos de UI.
- Arquivos afetados: AGENTS.md, CONTINUAR.md, .agent/*.

## ADR-GIKA-005 — Integração por Activity e comandos existentes

- Data: 2026-09-30
- Status: accepted
- Contexto: React/Vite, Express e schemas Zod; comando idempotente com revisão e outbox já presentes. 'Rotina' não é entidade separada.
- Decisão: Gika UI em Shell autenticado, mock no M1; provedor/allowlist/leituras somente no servidor em M2; bridge de mutações simples por sendCommand/activity.create/update/setStatus. Policy cresce desde a primeira ferramenta. Alto impacto só após confirmação server-side no M5.
- Alternativas consideradas: SDK cliente com segredo; acesso do modelo ao Firestore; CRUD paralelo; tool genérica de comando.
- Consequências: preserva auth, revisão e offline; tool output requer validação runtime; queued não é applied; handler de série precisa revisão antes de exposição.
- Arquivos/contratos: ARCHITECTURE.md, SECURITY_AND_POLICY.md; caminhos novos planejados gika.ts, features/gika, server/gika.

## ADR-GIKA-006 — Contexto limitado e rollout sem custo obrigatório

- Data: 2026-09-30
- Status: accepted
- Contexto: lists <=50, partial/cached existentes, custo obrigatório R$ 0 e nenhum provedor escolhido.
- Decisão: dia/semana (<=7 dias), dados mínimos, sem descrição/notas/compras por padrão, chat inicialmente em memória por uid. Provider M2 depende de escolha humana compatível com gratuidade e credencial servidor; M1 mock não depende disso.
- Alternativas consideradas: enviar todo histórico, esconder partial, assumir provedor pago, armazenar chat automaticamente.
- Consequências: consultas parciais não geram afirmações de completude nem lote; logout cancela contexto; indisponibilidade da IA não desmonta agenda.
- Arquivos/contratos: ARCHITECTURE.md, execplan, gika tool result.

## ADR-GIKA-007 — Respeitar limites de recorrência e batch

- Data: 2026-09-30
- Status: accepted
- Contexto: updateFuture divide série e recria IDs; batch transacional genérico não existe; microphone bloqueado no deploy atual.
- Decisão: occurrence/future reais; sem edição de série inteira fictícia; batch M6 exige contrato atomicamente executável ou semântica explícita de progresso parcial aprovada antes de habilitar. Voz M7 exige revisar Permissions-Policy.
- Alternativas consideradas: Promise.all chamado de transação, scope inventado, captura de áudio sem fallback.
- Consequências: invalidar proposals após split/conflito; novos contratos precisam emuladores e E2E; nenhuma mudança antecipada de backend em M0.
- Arquivos/contratos: server/commands/content.ts (existente), vercel.json (existente), gates futuros M5/M6/M7.

## ADR-GIKA-008 — humanizer-br local oficial

- Data: 2026-09-30
- Status: accepted
- Contexto: skill externa ausente bloqueava textos M1; usuário forneceu conteúdo integral e autorizou implementação local explícita.
- Decisão: versionar exatamente o conteúdo fornecido em .agent/skills/humanizer-br/SKILL.md, ler integralmente e usá-lo como fonte oficial para todo texto de interface Gika. A autorização manual supriu apenas a ausência externa; não é exceção às regras de domínio/segurança/qualidade do Leve.
- Alternativas consideradas: permanecer bloqueado; substituir a skill silenciosamente (rejeitado).
- Consequências: M1-T1 desbloqueada; checklist local de linguagem/acessibilidade aplicado por revisão manual. Não se simula instalação global de plugin. skill-creator não está disponível no harness; criação literal autorizada pelo usuário, sem gerar conteúdo alternativo.
- Arquivos afetados: .agent/skills/humanizer-br/SKILL.md, GIKA_STATE.md, GIKA_TASKS.yaml, GIKA_EXECPLAN.md e docs/gika.

## ADR-GIKA-009 — Gemini gratuito em M2

- Data: 2026-09-30
- Status: accepted — instrução explícita do usuário
- Decisão: Gemini Developer API com gemini-3.5-flash-lite explícito, thinking_level medium; só Free Tier, sem habilitar/vincular billing, cartão ou fallback pago. Segredo exclusivamente servidor GEMINI_API_KEY. Implementação e testes locais não dependem de segredo; somente smoke real será bloqueado pela ausência.
- Consequências: adapter intercambiável, M2 somente leitura; tratar missing env, 429/quota, 503, timeout, resposta inválida e malformed function call sem interromper a agenda. Disponibilidade/cota reais só podem ser comprovadas no smoke.

## ADR-GIKA-010 — Refinement de M1 antes de M2

- Data: 2026-09-30
- Status: accepted — instrução explícita do usuário
- Decisão: adicionar M1-T4 ao fechamento de M1: viewport de conversa, símbolo próprio discreto, composer expansível no rodapé, chips e estados estruturados exclusivamente mock. Preservar tokens/fontes Leve, sem copiar identidade externa.
- Consequências: M2-T1 depende de M1-T4 aprovado; voz é apenas indicação visual, confirmações/undo nesta etapa nunca acessam domínio ou persistência. Repetir gates e revisão desktop/mobile antes de declarar M1 concluído.

- Refinamento final de ADR-010: usuário pediu polimento de aviso, empty state, composer/microfone/envio, densidade e título mobile; permanece M1-T4, sem avançar lógica IA nesta tarefa.

## ADR-GIKA-011 — interpretação isolada e resposta ancorada em leituras

- Data: 2026-09-30; accepted.
- Uma requisição Gemini por pergunta, sem retry/fallback; três tools de leitura, no máximo três chamadas, dez segundos e resposta limitada. O provider recebe somente pergunta e contexto civil mínimo; nunca uid, credencial Firebase, tarefas, descrições ou resultados Firestore.
- O router valida/politiza chamadas antes de consultar. Resultados tipados são apresentados deterministicamente, sem segundo roundtrip nem afirmações livres geradas pelo modelo. Sem chamada válida, pedir esclarecimento; nenhuma narrativa de sucesso de mutação é exibida.
- Interface ModelAdapter não importa persistência ou comandos. DI de transport nos testes não requer chave Gemini fictícia. REST generateContent usa thinkingConfig.thinkingLevel MEDIUM (equivalente ao thinking_level medium solicitado).
- Documentação oficial consultada: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite (estável, function calling/thinking); https://ai.google.dev/gemini-api/docs/pricing (Standard Free Tier input/output gratuitos); https://ai.google.dev/api/generate-content (REST). Sem billing, grounding, caching, batch ou serviço pago. Smoke real permanece pendente da credencial de projeto sem billing; código não pode comprovar o estado financeiro de uma credencial ausente.

## ADR-GIKA-012 — reutilizar identidade e receipts atômicos do Leve

- Data: 2026-10-01; accepted, escopo exclusivo M3-T2 autorizado.
- Auditoria: a transação de contentCommand já deduplica por UID/operationId, compara hash canônico e persiste atividade/receipt/contadores atomicamente. Outbox já conserva envelopes; não criar nova infraestrutura. T1 preservava só um envelope aleatório em memória; isso não cobria concorrência/novas instâncias após perda da resposta.
- Decisão: UUID requestId criado pela UI também é operationId/entityId, no namespace privado do usuário autenticado. Retry conserva UUID; nova intenção gera UUID, inclusive texto igual. Modelo não recebe/escolhe IDs. Sem Map/lock local como garantia. Function calls estritamente iguais dentro da mesma interpretação são colapsadas após validação; misturas/ações distintas continuam negadas.
- Metadado opcional strict no envelope gika.requestTextHash (SHA256 do texto validado) vincula o pedido ao ID, sem guardar o texto/chat. Hash de conteúdo NÃO deduplica novas intenções. Só activity.create simples, revision0, entityId=operationId; Gika online não usa clientCreatedAt/dependsOn/outbox. Omitir timestamp opcional permite reconstrução canônica entre instâncias; expiração de envelopes convencionais não muda. Antes de qualquer persistência, retry pode reavaliar contexto civil atual; após commit, snapshot original prevalece.
- Receipt existente recebe gika:{requestTextHash,task} na mesma transação, derivado de ActivityInput validado com defaults simples. Mínimo necessário para recuperar título/data/fuso originalmente aceitos após perda da resposta, mudança de dia/fuso ou ausência de memória cliente. Sem coleção/índice/TTL novo, armazenamento de chat ou execução/dados extras de undo. Payload Gika deve ser canônico antes de persistir, inclusive trim/defaults, para garantir reconstrução do mesmo hash; teste RED e correção na revisão. Receipts T1 não têm vínculo ao requestId e não são backfilled; garantia T2 cobre as operações emitidas pelo novo bridge. Snapshot segue privacidade/exclusão de conta dos receipts existentes; hash é dado privado, não credencial ou autorização.
- Executor de leitura consulta receipt autenticado antes do provider, valida UID/hash/resultado/snapshot e reautoriza; recuperação mantém auth/ownership e permite somente replay concluído em serviceControls restricted/constrained, como a transação existente. Novos pedidos exigem serviço normal antes do modelo; teste de integração RED503→GREEN comprova esse limite; descriptor recuperado ainda não é sucesso. Bridge envia novamente o mesmo activity.create, e a transação revalida auth/membership e retorna receipt original/alreadyApplied. Diferença de payload/texto rejeitada; race de interpretação divergente recupera uma vez o snapshot comprometido. Nenhum modelo ou router grava no Firestore.
- Alternativas rejeitadas: dedup por título/data, Map como garantia, segunda coleção/outbox, aceitar qualquer conteúdo com mesmo ID, reexecutar interpretação de intenção concluída, confiar em narrativa/descriptor como sucesso. Contratos UI/mock preservados, apenas envelope/receipt internos estendidos de modo opcional e compatível.
- Consequências: uma leitura adicional de receipt por requisição Gika e autorização de disponibilidade adicional para novos pedidos; quota/falhas mantêm fallback e agenda disponível. Receipts atualmente não expiram; remoção de conta remove receipts. Não apagar receipt para liberar retries; downgrade para T1 não é seguro para operações Gika em trânsito. M3-T3 permanece todo, sem undo completo ou mutações posteriores.

## ADR-GIKA-013 — undo determinístico de criação sobre activity.trash

- Data: 2026-10-01; accepted, exclusivamente M3-T3 autorizado.
- Auditoria: remoção convencional é activity.trash/revisão/soft-delete30dias; restore/purge são separados. Não há undo universal. A mesma transação já mantém receipts UID/operationId/hash, contadores e dataVersion.
- Decisão: botão de criação confirmada carrega contexto software (UID original, operation/entity real, revisão1). SHA256 de namespace+UID+operation original produz UUIDv8 estável de undo, nunca conteúdo/modelo. Enviar activity.trash pelo sendCommand existente, online/queuefalse. Metadado opcional strict gikaUndo restringe comando/target/revisão/payload vazio; backend compara envelope canônico, UID do token e receipt Gika original na mesma transação antes de aplicar o trash existente. Nenhuma coleção/endpoint/writer novo ou tool mutável extra. Metadado UID é assertion do contexto software, não seleção de ownership: divergência do token é403.
- Revisão1 é precondition histórica, nunca renovada para vencer conflito. Edição/conclusão/restauração posteriores conflitam sem perda de trabalho. Já removida sem receipt de undo dá erro claro; same-undo receipt replay devolve ack histórico/alreadyApplied sem tocar novamente, mesmo após restauração convencional. Origem ausente/convencional ou outro UID é negada. Auth revalidada pelo middleware/transação inclusive replay e no cliente após token/ack.
- Modelo não recebe/escolhe IDs/contexto/undo e não é chamado pelo botão. Apenas ack estrito revision2/entity/operation autoriza sucesso UI. Guard local evita double tap; garantia definitiva é a transação existente entre processos. Timeout/cancelamento/lost ack conserva identidade; retry reconcilia. Nenhuma success otimista/outbox nova.
- Alternativas rejeitadas: procura por título/data, UUID novo por retry, Map definitivo, force delete/revisão atual, segunda infraestrutura, chamada ao modelo, persistir conversa só para reload. Cards/contexto não sobrevivem reload; transporte com envelope preservado pode reconciliar no servidor. Receipts T1 não vinculados continuam sem backfill.
- Consequências: uma leitura transacional adicional de receipt original por undo; sem TTL novo. Lixeira/restore/purge convencional preservados. Remover receipts compromete reconciliação; downgrade não deve reemitir undo com nova identidade. Rollback por revert do commit, sem apagar receipts. M3 permanece parcial até M3-SMOKE após revisão; nenhum live nesta tarefa.
- Contratos: gikaUndo.ts, commandEnvelopeSchema, contentCommand, creationUndoBridge, contexto em memória e botão Gika.

Revisão T3: vincular também entity.createdAt ao serverTime do receipt original para impedir ABA (purge convencional seguido de criação independente sob mesmo ID/revisão1). Teste real de comandos cobre este caso; undo não executa purge.

## ADR-GIKA-014 — resolução bounded e receipt de conclusão simples

- Data: 2026-10-01; accepted, exclusivamente M4-T1 autorizado.
- Contexto: tool planejada complete_task{activityId} permitiria ID escolhido pelo modelo. Activity não tem índice normalizedTitle; reads.read já projeta título/estado/revisão e limita consultas. activity.setStatus/expectedRevision/receipt UID+operation transacional já existe; repetir completed convencionalmente incrementaria revision/completedAt.
- Decisão: tool strict recebe apenas title/date (null=hoje civil). Intenção original e data são validadas deterministicamente; consulta única de dia explícito/default hoje (distância<=366), cap/partial existentes, igualdade title.trim().toLocaleLowerCase(pt-BR), sem fuzzy/remover acentos. Candidatos de todos estados/kinds contam antes da seleção; mais de um/partial impede mutação. Só task não recorrente pending pode virar descriptor; completed é observação honesta, canceled/event/series não são mutáveis neste bloco.
- Bridge usa apenas sendCommand/activity.setStatus{status:completed}, expectedRevision resolvida e operationId=requestId software. Metadado optional strict gikaCompletion{requestTextHash}, nunca UID/ID vindo do modelo. No contentCommand já existente, guard de task/pending/nonseries/revisão mantém payload canônico; snapshot mínimo id/title/dueDate/timeZone/revisão anterior no MESMO receipt do commit. Sem coleção/writer/index/outbox novo. recoverMutation faz uma única leitura privada do receipt para criação/conclusão antes do provider; repete auth e reconstrói envelope original para ack alreadyApplied. Revisão original não renovada no retry local; um envelope pendente em memória conserva target/precondition, sem ser garantia de dedup. Concorrência com envelope divergente reconcilia receipt uma vez, inclusive caminho pending.
- Autorização antes/depois do modelo e leitura, guard UID/signal depois do token e ack, membership/profile transacionais inclusive replay. Conflito Gika sem current privado, copy específica e novo pedido explícito; nenhuma retry automática de REVISION_CONFLICT. Nova intenção após resultado recebe UUID novo. No-op/ambiguous/notfound são observações de leitura sem receipt/escrita; se um transporte repetir antes de qualquer commit pode reavaliar contexto/conjunto atual, como M3 antes de commit. Garantia definitiva at-most-once de efeitos de mutação é receipt, não cache de resposta nem congelamento persistente de observações.
- Alternativas rejeitadas: modelo escolher ID/query/history; primeiro homônimo; filtro pending antes da ambiguidade; busca fuzzy/ilimitada; novo writer, receipt collection ou lock/Map definitivo; renovar revision para vencer conflito; sucesso livre/otimista; adicionar undo/reopen. Persistir decisões sem mutação exigiria ampliar contrato/retention de comandos, não necessário para at-most-one mudança efetiva desta tarefa.
- Consequências/limites: tarefas sem data/atrasadas fora do dia escolhido não são buscadas; usuário deve informar título/dia, homônimos idênticos podem exigir agenda convencional. Conversa e pending não restauram após reload; após commit receipt reconcilia entre instâncias, antes do primeiro commit nova instância pode resolver contexto corrente. Sem timeEntry.stop: segue Today, diferente de ActivityDetail que encerra timer; reabrir convencional apenas documentado. UI structured completedTask só depois de ack; nenhuma nova experiência undo.
- Contratos: gikaCompletion.ts, identity/gika schemas, completePolicy/router/reads, guard contentCommand, completionBridge/apiAdapter/conversation/UI. Modelo fixo/free tier/arquitetura e demais comandos preservados.

## ADR-GIKA-015 — patch de título no activity.update existente

- Data: 2026-10-01; accepted, exclusivamente M4-T2 autorizado.
- Auditoria: o editor convencional manda ActivityInput completo a activity.update/contentCommand; read layer Gika omite descrição/categoria/cor/reminders. Reconstituir uma ActivityInput pelo modelo/defaults perderia campos; devolver snapshot privado completo ampliaria exposição desnecessariamente.
- Decisão: metadado opcional strict gikaUpdate no envelope existente, exclusivo activity.update/revision>0, payload strict `{title}`. O MESMO contentCommand projeta os campos ActivityInput atuais e aplica somente título dentro de cada tentativa da transação; mantém validação/referências/categoria/reminderJobs/metadata/receipt/revisão convencionais. Variável hidratada é local ao callback, sem reutilizar snapshot entre tentativas. Demais callers seguem ActivityInput completo inalterado. Sem segundo writer/endpoint/coleção/outbox/Rule.
- Resolução: selector textual `{title,date,patch:{title}}`, sem IDs/revisão/queries do modelo; um dia civil e matching exato do T1. Todos estados/kinds participam da ambiguidade; tarefa simples completed/canceled também pode ser renomeada, conforme editor convencional. Eventos/séries/partial/múltiplos não mutam. Novo título literal entre aspas pode conter palavras de data; sem aspas informação temporal/pedidos compostos pedem esclarecimento, nunca reagendam. No-op igualdade exata depois de trim; case diferente é alteração intencional.
- Receipt existente recebe apenas descriptor original/patch + hash requestText; recuperação privada por UID conserva nome antigo/entidade/revisão após commit e perda da resposta. Mesmo requestId deriva operationId, sem dedup por conteúdo; payload divergente conflita. Replay transacional antes de hidratar mantém sucesso original, não incrementa revisão novamente.
- Consequências: UI recebe updatedTask estruturado só após ack real. GIKA_UPDATE_CONFLICT exige novo pedido sem refrescar revisão. Falha em categoria arquivada conserva semântica convencional, sem contorno. Dados temporais/status/recorrência permanecem fora da tool; nenhuma nova forma de undo. Observações não persistem receipt e conversa/pending não restauram após reload, conforme ADR014.

## ADR-GIKA-016 — patch temporal com preview simples

- Data: 2026-10-01; accepted.
- Contexto: editor convencional usa ActivityInput completo/activity.update; task tem dueTime opcional. Policy M0 exige preview de reschedule. M5 pending actions/batch/recorrência continuam fora do escopo.
- Decisão: tool strict title/date/patch{dueDate,dueTime opcional}; resolver autenticado bounded de T1/T2 e parser civil já adotado. Destino weekday inclui hoje; que vem/próxima/dia sem mês/ano pede esclarecimento. Modelo nunca escolhe identidade/revisão/fuso/disambiguation. Scope apenas task simples com data, sem série/evento. Horário omitido preserva; remover horário por linguagem natural não exposto neste bloco.
- Mesma transação activity.update hidrata patch temporal via moveScheduleToDate/ActivityInput/scheduleInstants existentes; guarda gikaReschedule exclusiva e receipt original+patch/horário/fuso mínimos atomizados junto à entidade. Não há nova persistência ou dedup. Preserva fuso/disambiguation reais da tarefa (conforme helper de domínio), diferentemente da reconstrução do editor Today que usa perfil/reject. Reminder/jobs e campos não pedidos mantêm semântica convencional.
- Preview em memória mostra datas/horários/fuso; botão confirma descriptor software original/UID/requestId/revisão pela API convencional. Sem chamada ao modelo para confirmar. Auth/owner/precondition/receipt revalidados no commit/ack; conflito não renova revision. Em OPERATION_MISMATCH, só reconciliação de receipt já comprometido pelo respond antes do provider, uma vez. Não é confirmação de operação de alto impacto nem autorização genérica/flagLLM.
- Consequências: no-op sem command/receipt; retry estável/lost ack/concurrency mesma garantia transacional de M3. Conversa/preview não restauram após reload. Cancelar antes de dispatch não escreve; cancelar depois não garante rollback. Sem Undo novo ou escopo recurrence/future. ADR012/014/015 preservadas; M4-SMOKE após revisão, nenhum live nesta tarefa.

## ADR-GIKA-017 — classificação pura sem autorização concorrente

- Data:2026-10-01; accepted, exclusivamente M5-T1 autorizado.
- Contexto: quatro mutações simples já usam schemas/intenção/resolução/policy específicos e command layer autenticado/transacional. Consolidar decisões antes de alto impacto sem antecipar PendingAction, série ou batch.
- Decisão: classifier puro de facts strict anônimos, registro fechado, decision discriminada/enums allow/clarify/confirm/deny. Facts do servidor depois de validação/intenção/read/reauth; unknown/inconsistente/partial/bulk/destructive negados, recurrence semscope esclarece, title simples auto e reschedule confirm pelo preview específico existente. Não aceitar decision/confirmed do modelo/cliente, não transmitir grant no wire, não substituir command validation/ownership/revisão/receipts.
- Replay: facts históricos somente de receipt existente validado/reautenticado, nunca assumir estado atual como autorização para nova ação. Recuperação pós-read precede gate da resolução nova em corrida; descriptor histórico ainda exige command ack idempotente. Sem alterar receipts/writers/retention.
- Observação: backendLog existente apenas action registrada/unknown, decision/reason enum e bucket latency, sem dados privados/provedor/analytics externo. Engine sem dependência de logger/model/persistência, assessment adapter separado.
- Alternativas rejeitadas: decisão textual do LLM; defaultallow; segundo serviço de autorização/coleção; renovar revision no replay; tratar confirm como execução/flag genérica; habilitar alto impacto pelo classificador.
- Consequências: policies específicas/validators permanecem barreiras independentes e copy/contratos UI intactos; é classificação, não executor de M5-T2+. Registro futuro exige regra explícita/gates/autorização da etapa, não herda allow. Undo determinístico de create previamente aprovado conserva sua própria policy/receipt fora das tools de linguagem natural.
- Contratos: actionPolicy/policyAssessment/router/createPolicy, unit/integration/evals. Sem alteração de domínio/Rules/outbox/provider/financeiro.

## ADR-GIKA-018 — confirmação estruturada selada, recovery somente por receipt

- Data: 2026-10-01; accepted, exclusivamente M5-T2.
- Contexto: o preview M4 já era determinístico na UI, mas requestTextHash não vinculava o alvo/patch antes do primeiro commit. O recovery via respond poderia invocar o provider se faltasse receipt. O plano histórico sugeria PendingAction persistida; o pedido atual exige preview/cancel sem escrita e não autoriza persistência de conversa.
- Decisão: contrato strict server-derived policy confirm/risk/reason, action fechada somente reschedule_task, descriptor original e summary before/after/changedFields. HMAC cobre UID/requestId/textHash/contrato/validade de15min; chave derivada do SCHEDULER_HMAC_SECRET existente com namespace separado leve:gika-confirmation:v1. Modelo não escolhe grant, identidade ou confirmação. Labels/textos não são payload de execução.
- contentCommand permanece único writer e verifica o selo dentro da transação, depois de auth e receipt exato e antes de nova mutação. Confronta alvo/revisão/patch e dados originais; não renova revisão. O próprio receipt convencional guarda contrato/token original e hash integral, tornando retry/lost ack/concurrency seguros entre instâncias. Nenhuma coleção/fila/dedup por Map nova.
- Recovery autenticado /gika/recover-confirmation só devolve contrato de receipt já comprometido e reautoriza a conta; nunca chama Gemini, resolve alvo ou emite novo selo. Replay exato comprometido precede validade/rotação de chave: conserva sucesso original sem segundo efeito. Receipt legado exato continua replay; ausência de contrato legado não cria card executável nem autoriza nova mutação sem selo.
- Produção sem chave compartilhada falha fechada somente em confirmação; não há chave fixa ou fallback pago. Emuladores demo com Auth+Firestore e fora de produção/VERCEL admitem chave aleatória somente em memória. Preview não comprometido pode invalidar após restart/instância local distinta ou rotação: novo pedido explícito, sem renovação automática. Receipts comprometidos continuam autoridade. Operação prévia sem commit não é persistida.
- Consequências: estados awaiting_confirmation/confirming/confirmed/cancelled/conflict/failed, cancel terminal sem command/receipt/Gemini, UI sucesso apenas depois de ack validado/auth fresca. Reload não restaura conversa/card nem executa automaticamente. Selagem garante integridade do efeito aprovado; não pretende comprovar gesto físico contra cliente autenticado malicioso, que já possui API convencional autorizada.
- Alternativas rejeitadas: flag confirmed do modelo/cliente; persistência de preview/conversa fora do escopo; usar resumo textual como command; consultar respond no botão; chave fixa/teste em produção; refresh de revision; infraestrutura paralela de idempotência. Batch/séries/Undo genérico/M5-T3+ continuam desabilitados.

## ADR-GIKA-019 — escopo de recorrência e contexto selado no writer convencional

- Data: 2026-10-01; accepted, exclusivamente M5-T3 na entrada fc0b669.
- Fato auditado: o Leve distingue occurrence e future (esta e as próximas). activity.updateFuture divide a série, remove futuras materializadas e recria uma nova série/IDs com o template escolhido. Não existe edição all incluindo passado nem conclusão futura; series.revision não muda em split/materialização. Não mapear 'todas/a série inteira' para future.
- Decisão: proposal strict complete/update/reschedule descreve um alvo resolvido pela read layer. recurrenceScope optional do modelo é verificado contra o pedido original fora de títulos entre aspas; omissão não escolhe escopo. Inspeção real e policy confirm/clarify/deny são determinísticas. 'all' é representação da intenção não suportada, nunca efeito executável. Complete somente occurrence; update/reschedule podem occurrence/future quando o contexto seguro permitir.
- Choice é distinta de confirmation: selo de escolha cobre proposta/op/UID/textHash/contexto/opções e propósito recurrence_choice. Endpoint choose-recurrence reautoriza, confere escopo disponível e snapshot original, sem Gemini ou nova resolução por título. Emite efeito específico occurrence/future com identidade de nova série atribuída pelo software. Selo recurrence_confirmation cobre esse efeito, alvo, patch, revisão, série/contexto e validade15min, reutilizando signer/chave/namespace do M5-T2. Uma choice não serve como confirmação; 'sim' não executa. Nenhum preview/card é persistido.
- Revision da série sozinha é insuficiente. Contexto selado inclui hashes canônicos do documento da série e alvo; future inclui conjunto completo de IDs/digests das futuras materializadas. A mesma transação do writer existente revalida esse contexto sem refresh. Materialização, edição de irmã/template, remoção ou lacuna após preview conflitam. Hashes não são enviados ao Gemini ou logs; não incluem documentos privados completos no card/token.
- Future permanece conservador: cap50 com sentinel51, pelo menos duas ocorrências, todas pending/revision1 e iguais ao template convencional, sem deleted/gaps/keys duplicadas. Helpers recurrenceDatesThrough/moveScheduleToDate existentes validam o conjunto; não há engine novo. O patch-only hidrata ActivityInput atual dentro da transação de updateFuture, reutilizando exatamente o split convencional e os writers/reminder jobs existentes. Completar futuras, all, conjuntos saturados/alterados/incompletos ou expansão além do limite requer agenda convencional; nunca fallback para escopo maior/menor.
- Guards somente no ramo Gika acrescentam auth antes de replay, selo, contexto, controles normal/quotas, referência de categoria, estoque incluindo reservas e orçamento conservador<=450 writes; count.series aumenta para a nova série real. Writers convencionais, worker/materializer, Rules/outbox e recorrência manual não foram refatorados. Diferenças históricas fora do ramo Gika permanecem documentadas, não declarar backend universalmente endurecido.
- Receipts convencionais armazenam efeito/confirm original mínimos e ack atômico; retry/lost ack/concurrency não reaplicam e não renovam selo. Future ack é entityId da nova série/revision1, conforme comando real; occurrence usa ID original/revision+1. Resultado structured identifica esse entityId real, escopo e contagem de materializadas afetadas (não total infinito). Recuperação receipt-only reautoriza; bridge recusa ampliar/trocar escopo, operação ou alvo. Nova intenção recebe novo requestId.
- UI pergunta 'Só esta'/'Esta e as próximas' conforme opções disponíveis, torna escolha terminal após seleção/cancelamento e exige confirmação explícita com diff/projeção do efeito. Sucesso apenas após ack real. Conversa/card não restauram reload nem executam automaticamente. Nenhum undo recorrente novo, batch/M5-T4, delete, writer, coleção ou Gemini live.
- Limitação temporal preservada: dias civis/fuso e DST usam helpers existentes; expressões ambíguas que vem/dia sem mês/ano continuam esclarecimento. Horário explícito isolado como 'para20h' adapta à data civil do seletor existente (hoje ou data informada), sem inventar data/horário nem engine paralelo.

Complemento ADR019: ao consumir uma escolha, a confirmação herda issuedAt/expiresAt do selo original (15 minutos totais); retries da escolha não renovam o prazo. Propostas com escopo explícito têm 15 minutos desde emissão. Receipt já aplicado continua recuperável, sem reassinar o efeito.

## ADR-GIKA-020 — Batch bounded por composição itemizada

Decisão em docs/gika/ADR_020_BATCH_COMPOSITION.md: complete/reschedule até5pending de um dia explícito, matching/exclusões exatos e subset integral; occurrence explícito permitido, future/all recusados no lote sem alterar T3individual. Novo propósito no signer M5-T2 e guard no writer convencional vinculam UID/parent/childIDs/targets/revs/patches/scopes/count/expiry. Todos pendentes revalidados transacionalmente antes de cada novo efeito; stale inicial0writes, corrida posteriorpartialhonesta. Recibos existentes conservam plano+índice para recovery5knownIDs antes provider, replay original e irmãos pendentes sujeitos ao prazo original. Sem atomicidade global/rollback, writer/coleção/engine/outbox novos. Limite16KiB do tokenbatch medido, parser requests/legacy inalterados. UI confirma só acknowledgements reais, distingue unknown/partial e botões não chamam Gemini. M6/live fora de escopo.

## ADR-GIKA-021 — proposta mínima sobre a composição existente

- Data:2026-10-02; accepted, M6 autorizado sequencialmente.
- Decisão: uma leitura bounded precede uma única chamada ao mesmo ModelAdapter. Modelo recebe título/status/data/horário/indicador recorrente e slot temporário, nunca IDs reais/UID/revisões/descriptions/notas. Retorna sugestão strict por slot; software resolve alvo e revalida snapshot após upstream. Dados separados das instruções, allowlist exclusiva da proposta.
- Executor: reutilizar BatchPlan/signer/guard/bridge/receipts/activity.update; execução itemizada cap5, partial explícito, sem transação global fictícia. Extensão bounded para semana no mesmo contrato, sem planner/executor paralelo. Slots não são autoridade de persistência.
- Limites: somente reagendamento por data, preserva horários/ausência; rotinas requerem occurrence explícito, future/all de lote permanecem proibidos. Sem novo writer/collection/outbox/Rule/Undo, sem persistência de proposta/conversa.

Complemento T2/T3 da ADR021: o patch convencional aceita horário explícito. A proposta pode sugeri-lo, inclusive para tarefa sem horário, desde que apareça no diff e no mesmo selo; não pode remover horário existente. Semana reutiliza get_week/fuso/weekStartsOn e o mesmo batch cap5, com conjunto integral e sem mudar a regra dos batches antigos. Preservados também são revalidados no guard transacional existente. Offline impede novo envio da organização, sem fila/autoexecução ao reconectar; recibos já aplicados e resultado parcial permanecem honestos. Não surgiu novo executor, signer ou persistência.


## ADR-GIKA-022 — voz como entrada nativa do composer

M7 usa SpeechRecognition/webkitSpeechRecognition por gesto explícito, sem dependência ou transcritor remoto próprio. Reconhecimento pode ocorrer em serviço do navegador; não prometer local/on-device nem offline. Permissão só no start do usuário, microphone=(self) no header, camera/geolocation negados. Final vira texto visível/editável, anexado ao draft; somente envio manual textual existente alcança Gika. Abort/cleanup/late-event guards e isolamento por session.uid existentes, nenhuma persistência/log de áudio/transcrição nova. Unsupported/denied/erro deixam texto funcional; produção/hardware não validados por fixtures CI.

## ADR-GIKA-023 — App Check depende de validação operacional

M9 não ativa AppCheck sem sitekey/domínios/provider web/PWA/Firestore/APIAdmin e teste de usuários legítimos/offline/emuladores. Ativar enforcement parcial ou fallback bypass não oferece proteção correta; reCAPTCHAEnterprise/CloudBilling não autorizado. Proteções Auth/Rules/commands/quotas/signer permanecem. Ausência não classificada como vulnerabilidade por si só. Reavaliar cadastro gratuito/operacional com UAT, sem serviço pago automático.

## ADR-GIKA-024 — Rive Free no desenvolvimento, Cadet somente na exportação final

- Status: accepted; autorização explícita posterior ao checkpoint78f03ea.
- Decisão do usuário: Rive Free durante criação, rig, animação e validação. Splash tolerado nesse período, nunca como solução final. Após asset e rig integralmente aprovados, Cadet autorizado para exportar `.riv` final sem splash. Não trocar tecnologia por custo.
- Consequências: RIVE_ZERO_COST_PRODUCT_BLOCKER deixa de bloquear desenvolvimento. Nenhuma assinatura/billing/trial antecipada; aprovação integral é precondição da ação paga, não presumida por build/headless/controller. Exceção específica de licença autoral/export final, sem alterar custo da infraestrutura/Gemini Free Tier ou demais contratos. Não ocultar/remover splash nem tratar unsigned local como bypass.
- Escopo preservado: M9 existente, sem runtime/controller sobre master reprovado, novo milestone, writer, Rules, policy ou persistência. Gate visual continua obrigatório; VECTOR_ASSET_HUMAN_REFINEMENT_REQUIRED não é resolvido pela licença.


## ADR-GIKA-025 — busto híbrido fiel, não vetorização integral obrigatória

- Status: accepted; pedido explícito do usuário após os dois auto-traces reprovados.
- Rive suporta oficialmente ImageAsset PNG + meshes + skinning/bones. Ensaio autoral compilado/renderizado em assets/gika/rive/hybrid-bust-spike comprova esse caminho com pixels da própria referência; não é nova personagem nem imagem plana declarada rig.
- Fonte editável pode ser híbrida. Priorizar busto/microgestos nas superfícies atuais; vetores apenas onde necessários. Gestos amplos usam poses adicionais aprovadas, não rig corporal universal. Preservar rosto/cachos/mecha anatômica esquerda e visual lock.
- Os dois traces continuam FAIL; não demonstraram necessidade de SVG integral/refinamento humano definitivo. Lacunas atuais são específicas: face limpa sob olhos/sobrancelhas/boca, registro de pálpebras/expressões, underlap cabelo/queixo e matte. Reconstrução artística localizada precisa de fidelidade revisada, sem assumir que todo trabalho dependa de autoria humana externa.
- Rest/idle do ensaio são fiéis, blink diagnóstico FAIL por backing ausente. Não integrar player/controller nem declarar Character/RC concluídos antes do gate visual idle+blink. ADR024, pipeline UI técnico/ack, privacidade, domínio e persistência intactos.
