# M5-T3 — recorrência com escolha explícita

## Entrada e auditoria

Branch feat/gika-integration, HEAD local e origin fc0b66972164e3cee73c6c9a65969ea2e61d3994, worktree limpo e fetch confirmados antes de qualquer alteração. AGENTS/STATE/TASKS/ExecPlan/decisões/M3/M4/M5-T2/arquitetura/segurança/evals e humanizer local relidos. Auditoria prévia e diferenças do plano estão em M5_T3_EXECPLAN.md. Superpowers indisponível: processo manual equivalente, auditorias com ownership disjunto e revisão final somente leitura conforme AGENTS.

O domínio real distingue occurrence e future (esta e as próximas), não all. activity.setStatus atua na ocorrência. activity.update altera a ocorrência preservando vínculo. activity.updateFuture divide a série e recria futuras sob nova série/IDs, pelo writer e helpers convencionais. Não existe conclusão futura/all nem edição all incluindo passado. A UI convencional já pergunta occurrence/future. Undo Gika de create não foi ampliado. Nenhum novo writer, engine, coleção, outbox, Rules, dependência ou persistência de conversa.

## Resultado técnico

Contrato strict de proposta, escolha, efeito confirmado e resultado real. Modelo só pode propor scope occurrence/future/all quando a linguagem original explicitamente o sustenta; IDs/UID/revisão/operation/receipt não pertencem aos argumentos da tool. Servidor resolve alvo exato, civil, autenticado e bounded; ausência de scope recorrente gera clarify, nunca assume ocorrência/série. Escopo all é unsupported, nunca convertido em future. Tarefa simples conserva M4. complete recorrente só occurrence; update title-only e reschedule temporal patch-only conservam regras anteriores.

Choice e confirmation possuem propósitos distintos no signer M5-T2. choose-recurrence reautoriza e verifica proposta/scope/snapshot sem Gemini ou resolução nova por título. Confirmation sela UID/request/textHash/operação/scope/alvo/revisão/patch/contexto e identidade software de série futura. Escolha herda a validade original: 15 minutos totais, nenhum retry renova issuedAt/expiresAt. Texto renderizado ou resposta “sim” não autoriza.

Revision da série histórica não muda em split/materialização: digests canônicos de série/alvo/conjunto futuro são conferidos na mesma transação existente. Occurrence preserva template/irmãs/IDs. Future só admite conjunto completo íntegro pending/revision1/template-equivalent, sem lacunas/purged/duplicados, cap50 com sentinel51 e orçamento450 writes; contexto alterado exige novo pedido, sem refresh ou fallback amplo. Controles/quotas/referências/reservedstock no ramo Gika, sem refatorar handlers manuais/worker. Receipt atômico privado original sustenta retry/lost ack/concurrency e recovery antes de Gemini; auth atual é necessária inclusive no replay.

UI mantém shell M1: botões Só esta / Esta e as próximas, escolha terminal, preview before/after/scope e efeito futuro explícito, cancel terminal, loading/disabled/ref de double click, foco/status/teclado/Axe/light/dark/mobile. Ack validado é a única fonte de sucesso. Future ack aponta a série real criada/revision1; occurrence aponta entidade original/revision+1. Sem restauração/autoexec após reload e sem chamada Gemini depois da escolha/cancel/confirm/recovery.

## Gates executados

- Audit produção final: 0 critical / 0 high / 0 moderate, audit-level=high exit0. Tooling dev-only histórico continua explícito em docs/security/DEVELOPMENT_REMAINING.md; dependências e lock byte-idênticos à entrada.
- Lint PASS; ambos typechecks PASS; build PASS (warning chunks>500kB histórico).
- 396 unitários / 46 arquivos PASS após ajuste de expiração. Integrações completas: 212 / 7 arquivos PASS (75,53s), Auth/Rules/commands/receipts/create/complete/update/reschedule/Undo/policy e recorrência incluídos.
- Focal anterior: 40 integrações PASS + 7 E2E recorrência PASS. Repetição final após ajuste de expiração: 40/40 integrações PASS e 7/7 E2E PASS (1,2min/exit0).
- Amplo Gika: primeira rodada 56 PASS / 7 FAIL / 18,1min, não verde. Todos sete novos recurrence PASS. Todos63 cenários únicos tiveram passagem observada após comparação dos originais, sem aumentar deadlines.
- Check original: build/unit passaram, preview inacessível no IPv4 do harness impediu início do navegador. Repetição com NODE_OPTIONS=--dns-result-order=ipv4first exclusivamente no processo: build/396unit PASS, shell12 PASS/1 FAIL color-contrast em header > .eyebrow. Cópia isolada fc0b669 reproduziu a falha de contraste (ratios variam por tema/transição); testes/tokens/CSS convencionais não alterados.

## Primeiras tentativas e classificação

Não ocultar falhas de desenvolvimento: matcher inicial confundiu “todas” dentro de “todas as próximas”; corrigido por cláusula específica e cobertura. TypeScript inicial encontrou guards ausentes em fixtures/union e, no teste novo de expiração, narrowing do discriminant; corrigidos antes de gates finais. Integração focal inicial38/39: fixture excedia limiter3 requests/min na mesma conta; separação de contas de teste, sem desabilitar limiter/deadlines/Rules, repetição40/40 PASS. Runner efêmero inicialmente teve SyntaxError antes dos testes; correção somente /tmp.

Unit em sandbox restrito393/3 e2 erros: probes multipart listen EPERM e guard de subprocesso sem stderr. Execução autorizada com sockets locais e sem credencial terminou396/396; testes originais sem alterações, nenhum smoke live (guard encerra antes de rede quando variável ausente). Audit adicional no sandbox também falhou EPERM no proxy; repetição autorizada consultou registry e confirmou produção0. São limitações de execução, não regressões de produto.

Sete falhas amplas: reschedule lost ack; confirmação falha precommit/retry; rename desktop/mobile realack; rename lost ack; rename conflict; rename logout (timeout na criação convencional antes de Gika). Observações sanitizadas registram apenas path API/status/duração/timings, sem header/body/token/conteúdo. Transações comuns demoraram mais que o deadline10s; criação convencional em logout atingiu timeout20s. Originais executados em sequência nas cópias isoladas fc0b669 e atual: 8/8 PASS em ambas (1,6min cada), incluindo todos7 casos e conflito reschedule adicional. Cinco sondas temporárias byte-idênticas (hash persistido) passaram em ambas: 5/5 entrada e 5/5 atual, 1,7min cada/exit0. Holds10200ms reproduziram o deadline original10s de rename ack/lost ack/precommit retry/conflito; hold20200ms reproduziu o timeout20s da criação convencional antes de Gika. Depois validaram revision2/receipt original/replay applied→alreadyApplied e edição posterior preservada; criação permaneceu revision1 e zeroGika. Classificação ENV_TRANSIENT_TRANSPORT_LATENCY_EXCEEDS_PREEXISTING_HARNESS_DEADLINE, comprovada contra fc0b669. O atraso controlado prova a classe; não identifica causa física da latência natural. Nenhum deadline/CI/contraste/timer alterado. A primeira rodada permanece56/7, não reclassificada como verde.

## Cobertura e limites

Evals M5-E42..E76 executáveis em gika-recurrence-policy/command/bridge unit, gika-recurrence integração/E2E e regressões M4/M5-T2. Adulteração scope/entity/UID/patch/op/revision/proposito, série alterada/removida/split/materialização, ocorrência ausente/edited/completed/canceled/deleted/purged, partial/saturated, auth/logout/conta e prepostcommit testados. Concorrência applied/alreadyApplied, replay sem segunda mutação, ausência de persistência direta e nenhum Gemini nos botões.

Selagem garante integridade do efeito, não gesto físico contra cliente autenticado adversarial que já possui API convencional. Produção precisa da chave compartilhada existente SCHEDULER_HMAC_SECRET; emulador demo usa chave efêmera somente memória. Preview sem commit pode invalidar em restart/rotação; receipt original comprometido permite replay exato sem novo selo. Séries grandes/alteradas ou operação não suportada usam agenda convencional; nenhuma ampliação silenciosa. Future usa semântica real de split, não all nem batch genérico. Novas ocorrências futuras seguem worker convencional, não expansão Gika. Campos privados do template ficam no domínio/guard, não no modelo/card/log.

Sem Gemini live, segredo persistido, billing, PR/deploy/main/visual ou M5-T4. Proxy/egress é somente configuração herdada do Codex Remote. Revisão estática final independente aprovou cadeia/guard/UI e o prazo herdado; screenshots desktoplight/mobiledark e startup agent-browser inspecionados, sem overlay/erros. Capturas históricas geradas por gates restauradas byte a byte; traces/raw logs locais não entram no commit.

## Checkpoint

M5-T3 done, M5 permanece in_progress; M5-T4 todo/não iniciado. Gates/evidências/ADR019/STATE/TASKS juntos no commit funcional atômico. Checkpoint documental posterior registra seu SHA real e será publicado para backup somente na mesma branch. Comparação remota antes do commit confirmou origin ainda fc0b669; confirmar HEAD local/remoto e worktree limpo após push. Parar para revisão, sem PR/main/deploy/Gemini live.
