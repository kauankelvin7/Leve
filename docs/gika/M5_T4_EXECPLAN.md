# M5-T4 — Batch operations seguras

Entrada: feat/gika-integration, local/origin 1b09f5fb0d07388f8bf5d2ef8c5bf9eba0e089c4, limpo; T3 done/T4 todo. Autorização exclusiva T4; M6, Gemini live, dependências, deploy/PR/main fora do escopo.

## Auditoria e decisão de escopo

Não há comando batch genérico: contentCommand abre uma transação por envelope. Recibos por UID/operação atomizam cada alteração, revisão e consumo de quota (60/min,1000/dia). Reagendamento pode criar até3 jobs. updateFuture divide série e substitui IDs; não compor splits no mesmo lote. O limite Firestore500 não é uma promessa de atomicidade da composição. Read layer limita50 e sinaliza partial; categoria/prioridade/duração não constam da projeção e não são filtros autorizados.

Implementar o subconjunto complete e reschedule, no máximo5 alvos, selecionados por um dia civil explícito e estado pending, opcional título/exclusão exatos comprovados no pedido original. Sem all tasks/histórico ilimitado, batch rename/create/delete, truncamento, leitura parcial ou eventos. Datas usam parser civil e domínio já existentes. Recorrência: occurrence explicitamente pedido pode usar guard e writer convencionais; ausência de escopo exige esclarecimento antes de preview executável. future e all são recusados no lote, preservando suporte individual occurrence/future do T3. Não excluir recorrentes silenciosamente da seleção.

## Contratos e execução

Tool strict de intenção não contém identidades. Policy registrada especificamente para batch; não liberar bulk genérico. Servidor resolve conjunto integral, ordena IDs e gera UUIDs filhos estáveis associados ao UID/requestId. Prévia lista todos os itens/before-after/escopos; selo reutiliza signer M5-T2, propósito próprio, vinculando UID/request/text hash/ação/targets/revisões/patches/scopes/cardinalidade/expiração15min.

Composição sequencial online-only pelos comandos activity.setStatus/activity.update existentes, sem novo writer, collection ou outbox. Cada envelope é verificado contra o plano selado no command layer; revisões nunca são renovadas. Guard transacional conservador verifica os itens ainda pendentes do plano antes de cada novo efeito; conflito inicial impede primeiro commit, corrida posterior pode produzir resultado parcial explícito. Não prometer rollback/all-or-nothing global. Pare no primeiro conflito/falha/ack desconhecido. Recibos comprometidos preservam plano integral e índice, permitindo recovery bounded antes do provider e retries determinísticos sem reconstruir seleção. Replay já aplicado funciona via receipt; assinatura expirada não autoriza irmãos pendentes. Agregado distingue applied/alreadyApplied/conflict/failed/pending/unknown por item e só mostra sucesso após ack real. Cancel não escreve nem promete desfazer efeitos anteriores. Reload não restaura/autoexecuta cards.

## Ownership e sequência

1. Auditoria integral e plano persistido (root); audits independentes read-only concluídos.
2. Domain/server/model/writer + integração (agent security audit): contratos novos, policy/resolução, selo/guard/receipts, router, adapter model declaration; sem UI.
3. UI/bridge + unit de bridge (root): card com5 itens, confirmação/cancel/retry determinísticos, auth/foco/aria/mobile/light-dark; sem persistência direta.
4. Testes E2E focais (agent audit complete), após contratos compartilhados estáveis; nenhum emulador simultâneo.
5. Root revisa integração/segurança, executa gates serializados, classifica primeira tentativa contra entrada quando necessário.
6. Evidência/evals/estado/tarefas/ADR só decisão real; commit funcional, checkpoint documental, push somente feat/gika-integration, SHAs/worktree clean; parar antes M6.

## Gates e recuperação

Audit produção0 critical/high/moderate; lint; ambos TS; build; unit completos; integração Auth/Rules/commands/receipts; batch focal; regressão M4/M5-T2/T3; suíte Gika aplicável; check baseline contraste explícito. Preservar primeiras tentativas; não aumentar deadlines nem presumir falha nova como baseline. Sem credencial/provider live. Logs/traces somente temporários, evidência sanitizada sem tokens/dados privados.

Retomada: ler este plano/estado, validar git e diff antes de prosseguir. Falhas não autorizam ampliar arquitetura. Rollback somente revisão dos commits T4, nunca apagar dados reais ou reset/clean destrutivo. Progresso atual: implementação e revisão concluídas; auditprodução0/lint/doisTS/build/480unit/243integração/31focal/13E2Ebatch PASS. Amplo64/11 preservado/classificado contra entrada1b09f5f (12originais+7sondas PASS em cada cópia),76Gika únicas observadas PASS; check12/1 contraste histórico comprovado. M5_T4_EVIDENCE e m5-t4-gates/transport-baseline/reference-files.json registram detalhes. Commit funcional/checkpoint documental e push somente feat; parar para revisão antes M6.
