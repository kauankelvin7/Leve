# M5-CLOSURE-R2 — E2E stability & root-cause

## Entrada e escopo

Entrada verificada antes de qualquer alteração: `6849f1fe3094e2296ea41f6c2277fad9d7524c5c`, branch `feat/gika-integration`, fetch executado, HEAD local = origin e worktree limpo. R1_PASS persistido; M6 tarefas todo. Somente R2: medir novamente a regressão ampla e os sete bloqueadores históricos, corrigir apenas causa demonstrada e registrar o resultado. Não executar closure final/M6/Gemini live/PR/main merge/deploy/shell/Character Foundation.

## Decisão

**R2_PASS**. Primeira suíte completa **76 PASS / 0 FAIL**, seguida pelos sete originais isolados **7 PASS / 0 FAIL**. Gates estáticos completos aprovados; suíte final **76 PASS / 0 FAIL** e nova rodada isolada **7 PASS / 0 FAIL**. Nenhuma alteração necessária em produto, testes ou harness: não surgiu falha reproduzida que autorizasse uma correção. Este resultado é específico de R2, não declara M5_READY_FOR_NEXT_PHASE nem reexecuta o closure final.

## Método e preservação

As oito specs originais foram executadas juntas, um worker conforme playwright.local.config.ts: gika, gika-readonly, gika-create, gika-complete, gika-update, gika-reschedule/confirmation, gika-recurrence e gika-batch. Emuladores Auth/Firestore demo-leve, API e Vite novos antes de cada suíte completa e antes de cada um dos sete casos isolados. Nenhum servidor/emulador herdado foi reutilizado; portas verificadas antes do startup, prontidão verificada e somente os grupos de processos criados pelo runner encerrados ao final. Seed sintético original/globalSetup mantido.

Ambiente padrão: sem LOG_LEVEL imposto, sem alterar resolução DNS/proxy/TLS/deadlines/configs. Proxy herdado somente como configuração de ambiente. GEMINI_API_KEY removida de todos os runners; signer local efêmero aleatório em memória, nunca escrito ou exibido. Nenhuma credencial real, .env ou acesso de produção. Browser /entrar verificado antes dos E2E. npm run test:integration inicia seu próprio lifecycle Auth/Firestore.

Primeira rodada registrada integralmente **antes** de iniciar a fase B. Não houve rerun oculto, retry configurado, teste desabilitado ou aumento de deadline. Plano bounded: duas suítes completas e duas rodadas dos sete originais isolados, 166 execuções E2E para 76 cenários únicos. Nenhuma repetição adicional até verde. Durações de todos os casos, comandos dos gates, hashes dos logs originais e resumos por estágio em [m5-closure-r2-gates.json](evidence/m5-closure-r2-gates.json). Logs publicados usam somente campos sanitizados; logs locais não são versionados, sem headers/tokens/payloads/UID/HMAC na evidência.

## Primeira execução e gates

| Gate / rodada | Resultado da primeira tentativa planejada |
|---|---|
| Audit produção high + JSON | PASS/exit0; 0 critical / 0 high / 0 moderate / 0 low |
| Lint | PASS/exit0 |
| Ambos typechecks (npm run typecheck) | PASS/exit0, cliente + servidor |
| Build | PASS/exit0; warning histórico de chunk >500kB |
| Unit completo | PASS, 480 testes / 50 arquivos |
| Integração completa (npm run test:integration) | PASS, 243 testes / 8 arquivos, emuladores novos |
| Suíte ampla inicial A | 76 PASS / 0 FAIL, exit0 |
| Sete históricos isolados B | 7 PASS / 0 FAIL, exit0 em todos |
| Suíte ampla final | 76 PASS / 0 FAIL, exit0 |
| Sete históricos isolados finais | 7 PASS / 0 FAIL, exit0 em todos |

Primeira suíte: 12.2m; suíte final: 12.1m. Falhas iniciais em R2: **nenhuma**. Lista de casos falhos, duração, etapa e último estado: vazia nas quatro fases. Não declarar a primeira suíte histórica do closure verde: seus 56PASS/20FAIL e a comparação13PASS/7FAIL continuam preservados em M5_CLOSURE_EVIDENCE.md. R1 também conserva suas primeiras tentativas unit/Auth e limitações.

## Sete bloqueadores históricos — reprodução original limpa

| Caso original | Focal B | Focal final | Maior HTTP servidor B/final | Último estado semanticamente verificado |
|---|---|---|---|---|
| Confirmation/precommit — reschedule:54 | PASS / 6.0s | PASS / 5.4s | 251/186 ms | Falha pré-commit não confirma; retry selado produz ack real sem Gemini |
| Update desktop — update:19 | PASS / 10.0s | PASS / 9.3s | 220/238 ms | Patch só title; entidade exata; double submit único; sucesso depois do ack |
| Update mobile — update:19 | PASS / 7.5s | PASS / 7.0s | 151/147 ms | Mesmos invariantes, dark/mobile e Axe |
| Update lost ack — update:37 | PASS / 6.1s | PASS / 6.4s | 191/222 ms | applied → alreadyApplied, mesma operação/revisão, sem novo modelo |
| Update conflict — update:55 | PASS / 7.9s | PASS / 8.3s | 251/233 ms | 409 preserva edição posterior, sem refresh/overwrite/retry enganoso |
| Update logout — update:66 | PASS / 11.8s | PASS / 11.3s | 215/230 ms | Nenhum update/card da sessão anterior após logout |
| Composer offline — gika:55 | PASS / 6.9s | PASS / 6.5s | 193/218 ms | Painel/draft mantidos, aviso de conexão, envio desabilitado, Enter não envia |


Cada caso da tabela passou nas duas suítes amplas e nas duas execuções isoladas. Classificação atual de todos os sete: **NOT_REPRODUCED_IN_R2**. Não houve falha atual em fixture/setup, auth/bootstrap, conventional command, Gika request, confirmation, dispatch, transaction, receipt, ack, UI reconciliation, connectivity/offline ou harness/selector. Os estados de sucesso são verificados pelas asserções originais, não inferidos de texto do modelo ou HTTP200 isolado.

## Medição por estágio e causa

Primeira tentativa depois de correção: não aplicável, pois não houve correção. Nenhuma instrumentação temporária de produto foi necessária. O logger existente fornece timestamps de http.request.started/completed, command.dispatch.started/completed e revisão esperada. Correlação é feita apenas em memória; saída publicada omite identidades, operation IDs, headers, bodies e conteúdo de tarefas. Medidas de HTTP são internas ao servidor, não confundidas com duração total do teste ou latência end-to-end. Dispatch completed sucede o retorno real do command layer/transação; já-aplicado é recuperado pelo receipt existente, conforme as asserções de lost ack/retry.

Suíte inicial: 282 requests observados, maior HTTP interno 732 ms e maior command await 728.0 ms; suíte final: 283 requests, máximos 832/828.0 ms. Nenhum HTTP iniciado permaneceu sem conclusão nesses registros. Maiores intervalos antes de dispatch: 44.0/28.0 ms; de ack do command layer até conclusão HTTP: 34.0/5.0 ms (inicial/final). A tabela registra o maior HTTP do fluxo inteiro por focal, não o confunde com tempo da mutação. Não houve logging novo de transaction/receipt; o retorno do command await e replay são demonstrados pelos eventos existentes e asserções originais.

Não chamar teste com duração total >10s de latência: ele inclui login/setup, espera de tutorial, interações, gates deliberados e asserções. Não houve expiração de asserção nesta etapa. Os logs históricos não têm os mesmos timestamps internos por estágio; a causa física dos atrasos antigos permanece não demonstrada. PASS atual **não prova** que Admin13.10 resolveu esses atrasos, nem identifica DNS/proxy/JVM/transação como culpados. Nenhum workaround foi aplicado.

## Offline e hipóteses não convertidas em correção

O original composer/offline passou em ambas as suítes e em ambos os focais fresh: agenda/painel continuam no fluxo autenticado, rascunho permanece, conexão necessária é informada, envio fica desabilitado e Enter não cria mensagens. A suíte também passou no cenário de resposta pendente offline: saída tardia é descartada, draft preservado. Sem modelo local, fila/autoenvio de prompts, resposta simulada offline ou command executado offline.

A tela histórica “Finalize sua agenda” **não reapareceu** nos cenários atuais. A auditoria read-only identificou dois caminhos a medir se voltar a ocorrer: membership snapshot ausente tratado como inativo em AuthProvider; helper antigo clicando Pular guia sem aguardar profile.completeTutorial → refresh. São hipóteses estáticas, não causas reproduzidas em R2. Não mudar AuthProvider/Protected/Login/cache/fixture para corrigir problema não observado, nem enfraquecer autenticação. Network unavailable continua distinto de unauthenticated, inactive e unconfigured.

A dívida histórica de seletores Auth permanece separada: persistent.spec.ts não integra o gate Gika solicitado nesta etapa e não foi editado/executado de novo. Não alterar UI para “Criar conta”/“Pular tutorial” antigos; R1 conserva a reprodução e a prova suplementar. Não afirmar que toda a suíte Auth histórica ficou verde.

## Invariantes e regressões

Os mesmos testes preservam auth/UID/logout, expectedRevision sem refresh, tampering, expiry, confirmação/repeated confirm, double submit, receipts/retry/lost ack/concurrency e sucesso somente após ack. Create/Undo/complete/update/reschedule mantêm fluxos convencionais; confirmar/cancelar/escolher escopo não chama Gemini. Recorrência occurrence/future continua separada, all não suportado; batch cap5/occurrence apenas, future/all proibidos, leitura parcial sem execução, stale inicial sem subconjunto e partial commit/recovery explícitos.

Comparação objetiva de **248 arquivos** de produto/domain/server/tests/scripts/configs/manifest/lock: zero diferenças aos hashes de entrada, digest 29e343da1afb0766e747405bd1e8983717a1953dcc9dfd6870a5098695d467ea. Nenhum timeout, asserção, fixture, selector ou configuração de retry mudou. A evidência registra somente documentação, sem implementação test/harness ou funcional.

Sem mudança de dependências, provider, policy, writers, collections, Rules, outbox, receipts ou persistência de conversa. Screenshots históricos gerados pelos E2E restaurados aos bytes de entrada; nenhum ajuste visual. Contraste histórico fora da Gika não foi corrigido/reavaliado por npm run check, que não é gate solicitado de R2. Sem certificação de produção, aparelho físico ou serviço Gemini live. Centralidade qualificada de policy/batch no closure anterior permanece limite documental, sem refatoração estética.

## Encerramento

Somente esta evidência, JSON sanitizado, GIKA_STATE.md e GIKA_TASKS.yaml no checkpoint documental. Sem commit funcional/test-harness porque nenhum código foi alterado; nenhuma ADR necessária. R2 concluída, aguardar revisão. Closure final não reexecutado e M6 todo/não iniciado. Push somente feat/gika-integration; verificar HEAD local = origin e worktree limpo após push.
