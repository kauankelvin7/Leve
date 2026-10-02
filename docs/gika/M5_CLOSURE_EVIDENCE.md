# M5-CLOSURE — Security & Regression Gate

## Entrada e escopo

Entrada verificada por fetch: `8a892504753d7624f50cf54f534ce7c38fde195a`, local = origin/feat/gika-integration, branch `feat/gika-integration`, worktree limpo. M5/T1–T4 done e aprovados; M6 todo. Esta etapa é um gate documental de encerramento, sem implementar funcionalidade, alterar dependências ou iniciar M6. Não houve Gemini live, dados reais, PR, main merge, deploy, integração de shell/Character Foundation ou segredo persistido.

## Decisão

**M5_BLOCKED**. O audit atual de produção reporta **0 critical / 2 high / 0 moderate**, exit 1. Isso não atende ao requisito obrigatório 0/0/0. O gate E2E também permanece reprovado: primeira suíte56PASS/20FAIL e comparação exata de entrada13PASS/7FAIL, sem aumento de deadlines. Não declarar regressão integralmente aprovada. Não houve upgrade ou audit fix, conforme escopo autorizado. A conclusão funcional histórica de M5 permanece done; este gate de segurança impede declarar READY para a próxima fase.

## Dependências — evidência atual

`npm audit --omit=dev --audit-level=high` e `npm audit --omit=dev --json` foram executados, ambos exit 1. Um advisory propaga-se em dois pacotes: `firebase-admin@13.6.0` (direto) → `node-forge@1.4.0` (transitivo). Advisory **GHSA-86w9-cpqp-85rv**, high, “node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements”; range vulnerável de node-forge informado pelo registry: `*`. Audit propõe firebase-admin13.10.0 fora do pin atual. Não se inferiu que essa sugestão seja uma correção compatível, nem se aplicou override/upgrade.

O SDK instalado usa forge em `lib/app/credential-internal.js` para `pki.privateKeyFromPem`. Verificação JWT observada usa `jsonwebtoken.verify`; não foi demonstrada invocação da verificação RSA vulnerável nos fluxos expostos do Leve. Isso **não certifica ausência de risco ou inalcançabilidade** e não satisfaz o audit obrigatório. Manifest/lock/árvore instalada permanecem iguais à entrada; o 0/0/0 nas evidências anteriores é histórico, não o resultado deste gate. Classificação: advisory atualmente reportado pelo registry, sem mudança de dependências nesta etapa; não falha funcional do adapter ou dos comandos.

## Gates atuais

| Gate | Primeira execução |
|---|---|
| Produção audit / JSON | FAIL, exit1, 0 critical / 2 high / 0 moderate |
| `npm run lint` | PASS, exit0 |
| `npm run typecheck` | PASS, cliente e servidor, exit0 |
| `npm run build` | PASS, exit0; warning histórico de chunk >500kB |
| `npm test` | PASS, 480 testes / 50 arquivos |
| `npm run test:integration:inside` | PASS, 243 testes / 8 arquivos, Auth/Firestore emulators |
| E2E Gika completos + focais create/Undo/complete/update/reschedule/confirmation/recurrence/batch/read-only/shell | FAIL, exit1: **56 PASS / 20 FAIL**, 76 casos / 8 specs / 25,0min; primeira execução preservada |
| Comparação focal no checkpoint exato de entrada | FAIL, exit1: **13 PASS / 7 FAIL**, somente os20 casos inicialmente falhos / 8,8min, deadlines originais |
| Audit final depois dos E2E | FAIL, exit1; mesmas2high / 0critical / 0moderate |
| `git diff --check` | PASS; diff exclusivamente documental |

Emuladores demo-leve e contas fictícias, GEMINI_API_KEY removida do ambiente dos runners. Proxy/egress herdado somente na configuração do ambiente. Signer local usa chave aleatória apenas em memória. Logs/traces brutos ficam em /tmp e não são versionados. Uma inspeção parcial de log exibiu um header de token fictício de emulador na saída de ferramenta; nenhum segredo real/Gemini foi usado ou exposto. A coleta foi corrigida para extrair apenas asserções, status e tempos. Nenhum header/token/payload é incluído nesta evidência ou no commit. Verificação de navegador /entrar passou antes da suíte, sem erros reportados.

## Auditoria cruzada e matriz de invariantes

| Caso | Proteção e prova de regressão existente |
|---|---|
| Logout / troca UID / outro UID | Guards antes/depois de awaits e token, namespace UID, membership/profile transacionais; integration gika-policy:105, gika-batch:165/170; E2E create:73, complete:56, update:66, reschedule:73 |
| Stale revision | Revisão original, sem refresh; guard de todo conjunto pendente antes de cada commit; integration gika-batch:125/130, gika-reschedule:63; E2E complete:47/update:55/reschedule:35 |
| Tampering de alvo/patch/cardinalidade/scope | Schemas strict + HMAC + igualdade canônica do comando; integration gika-batch:47/153/158/184, gika-recurrence:209, gika-reschedule:106/112 |
| Repeated confirmation / double click | Mesmos operationIds software, hash e receipts transacionais; integration gika-batch:139/147; E2E batch:19/create:83 |
| Lost response / retry / concurrency | Receipt aplicado é autoridade histórica; recovery mantém efeito original, sem novo provider/alvo/revisão; integration gika:233/gika-batch:139/147; E2E create:106/batch:39 |
| Expired confirmation | Validade15min, purpose strict; novo efeito recusado, receipt já comprometido pode replay exato sem renovar; integration gika-reschedule:124, unit gika-batch-signer:17 |
| Malformed model / unsupported tool | Allowlist e schema strict antes de resolução/descriptor; integration gika-policy:85, unit gikaBatchRouter:19 |
| Partial read / saturação | Nenhum plano executável, sem truncamento; unit gikaBatchRouter:36; integration gika-batch:123 |
| Recurrence ambiguity | Clarify software-bound separada de confirmação, nunca assumir occurrence/future; integration gika-recurrence:68/120 |
| Occurrence / future / all | Occurrence não altera irmãs/template; future individual usa split convencional; all não suportado; integration gika-recurrence:159/167 |
| Batch cap exceeded / scopes | 1–5 itens, somente complete/reschedule e occurrence explícito quando recorrente; future/all lote negados; unit gikaBatchRouter:36; E2E batch:80 |
| Partial commit / recovery | Guard inicial stale=zero efeitos; corrida posterior partial explícito e interrupção, receipt impede refazer item aplicado; integration gika-batch:125/130/147 |
| Preview / cancel / reload | Zero writes, botão/choice/cancel sem Gemini, reload não autoexecuta; E2E batch:33, recurrence:67/73; unit recurrence-bridge:52/66/72 |
| Sucesso / ack / texto renderizado | Resultado estruturado só após ack validado por entidade/op/revisão; narrativa não executa, ack desconhecido não confirma; unit batch-bridge:27/56/64; E2E create:27/64, complete:18/update:19 |

Os testes acima integram as suítes unit/integration completas e a seleção E2E desta etapa. Auditorias paralelas somente leitura de backend e UI/bridges não demonstraram defeito concreto que justifique mudança de produto. Nenhuma asserção/deadline foi relaxada.

## Checagem objetiva de arquitetura

Comparação SHA256/bytes contra a entrada de **247 arquivos** na primeira inspeção e **284 arquivos versionados não documentais** no encerramento de server, packages, apps/web/src, scripts, tests, Rules/indexes, manifest/lock e configurações de testes: **zero divergências** antes da documentação. Digest inicial: `94a4935ac5f12d7d87c7f24eba694b4b329dfa6c2b7b026fa1a7e81d62bf7311`; digest final ampliado: `d76257561d0661444d77b34bb6ccf0b468f169a67fc0573ba266d949fd978ba1`. Inventários locais /tmp/leve-m5-closure-architecture{,-final}.json. Nenhuma mudança não documental ou arquivo de produto novo no status final; sete screenshots históricos regenerados pelos E2E foram restaurados byte-a-byte do HEAD. Busca de writes e imports nos modelos/router/bridges não identificou escrita Firestore. Calls set/delete em policy/read projection são Map e update em signer é crypto HMAC, não persistência.

| Autoridade | Resultado factual |
|---|---|
| Writer / command layer | `server/commands/content.ts` existente; create/setStatus/update/trash e ramo updateFuture convencional; nenhum novo writer |
| Collections / Rules / outbox | Mesmas activities/series/commandReceipts e infraestrutura convencional; nenhuma nova coleção/Rule/outbox |
| Receipts | Mesmo commandHash/envelope/UID e receipt na mesma transação do efeito; recovery somente leitura privada; nenhuma segunda implementação de armazenamento/deduplicação |
| Model identities / persistência | Model proposals não escolhem UID/entity/revision/request/childops; resolução autenticada/software-owned; model/router/bridge sem writes; reads/guards transacionais podem referenciar Firestore para leitura |
| Signer / purpose | Mesmo signer HMAC; version1 reschedule, version2 choice vs recurrence_confirmation, version3 batch_confirmation; schemas/purpose não intercambiáveis, prazo vinculado; choice não equivale a grant |
| Conversa | Memória por conta; sem coleção, localStorage de conversa ou restauração/autoexecução no reload |
| Policy — limite de centralidade | **Não existe um classificador global único para todas as ações.** `classifyGikaAction`/assessPolicy cobre as quatro individuais e fatos de recorrência; `classifyBatchAction` é gate específico estreito aprovado no ADR020. Schema/intent/auth/revision continuam guardrails independentes. O registry individual nega bulk/unknown; router encaminha batch somente para seu gate confirm1–5/complete-read/scope válido. Não surgiu novo engine nesta etapa, mas o requisito literal de fonte global única não pode ser declarado plenamente satisfeito. Nenhuma divergência executável insegura foi demonstrada; não refatorar por estética durante closure. |

## Limites conhecidos

Batch é itemizado, sem atomicidade global/rollback; partial real precisa ser exibido, não “tudo pronto”. Depois de commit, cancel/close não é rollback. Future individual continua bounded/snapshot/pristine e usa geração convencional; batch future/all proibidos. Preview pendente tem validade15min, pode invalidar com restart/rotação, não renova automaticamente; receipt aplicado sustenta replay exato autenticado. Conversa/cards não sobrevivem reload. Baselines históricos de contraste/latência/timer não foram corrigidos ou ocultados. Sem prova em aparelho físico nem certificação de release; evals determinísticos não são smoke Gemini live.

## Primeira execução, comparação e classificação

Primeira execução completa76casos, oito specs: gika-batch, gika-create, gika-complete, gika-update, gika-reschedule (inclui M5-T2), gika-recurrence, gika-readonly e gika. **56PASS/20FAIL, não verde.** Batch13/13 e complete6/6 passaram nessa rodada. Integrações243/243 cobrem os contratos e transações; isso não substitui o resultado E2E.

Comparação: `git archive 8a892504753d7624f50cf54f534ce7c38fde195a` em /tmp/leve-m5-closure-entry, mesmos node_modules e configs originais, dev/API novos, emuladores locais serializados, somente20 originais falhos selecionados por títulos completos. Não houve reset/checkout/rebase/clean nem execução concorrente de writers. **13PASS/7FAIL**, sem mudar deadlines ou fixtures. A comparação de284arquivos prova que produto/harness/dependências atuais são os mesmos da entrada; não foi necessário executar os mesmos20 novamente no worktree apenas documental.

| Grupo inicialmente falho | Primeira suíte | Entrada exata, repetição focal | Classificação |
|---|---:|---:|---|
| Undo desktop/mobile, lost ack, close/reopen (create:132/163/198) | 0PASS/4FAIL | 4PASS/0FAIL | Espera pelo card de criação, antes de Undo; intermitência observada em código de entrada, sem nova regressão de Undo demonstrada |
| Occurrence desktop/mobile e future lost ack (recurrence:49/73) | 0PASS/3FAIL | 3PASS/0FAIL | Deadlines de ack/poll; inspeção/choice200; sem prova de expansão indevida |
| Reschedule preview desktop/mobile, cancel, lost ack; confirmation precommit/tampering/logout (reschedule:21/29/32/54/61/73) | 0PASS/7FAIL | 6PASS/1FAIL | Pré-commit M5-T2:54 reproduziu espera10s por resultado após retry; outros seis passaram na entrada |
| Update desktop/mobile, lost ack, revision conflict, logout (update:19/37/55/66) | 0PASS/5FAIL | 0PASS/5FAIL | Cinco falhas reproduzidas na entrada; ack/poll10s ou criação convencional encerrada pelo deadline API20s |
| Composer offline (gika:55) | 0PASS/1FAIL | 0PASS/1FAIL | Falha reproduzida na entrada; composer desaparece, tela convencional “Finalize sua agenda” com falha de conexão. Não classificar como simples timeout de mutação nem como baseline de contraste |

Medidas sanitizadas da primeira rodada: criação antes de Undo desktop HTTP200/9814,25ms, asserção10009ms ainda sem card; demais Undo requests inacabados na captura (`status:-1` significa sem resposta observada, **não** HTTP upstream). Criações convencionais anteriores aos previews de recorrência12571/12482/13319ms; anteriores aos previews reschedule14346..15802ms. Casos update/preparation chegam a20003..20583ms e ApiError de transporte. Na entrada, update desktop criações14603/14865ms e mobile16373/17718ms antes de poll10s do ack; lost ack/conflito/logout falham na criação convencional20022/20050/20300ms. O caso precommit confirmado na entrada também fica sem resultado dentro de10s após retry. Não atribuir DNS/proxy/TLS/JVM como causa física; isso não foi demonstrado.

As sete falhas persistentes são **preexistentes em relação ao checkpoint de entrada**, por reprodução original na cópia exata e igualdade de produto/harness. Não são dispensadas: o gate de regressão está reprovado e a causa raiz física/comportamental do offline permanece pendente. Nenhum defeito novo de policy, selo, receipt, revision ou escopo de mutação foi demonstrado para justificar correção de produto nesta etapa. Não houve ajuste estético, alteração de Auth/offline, workaround de rede ou correção especulativa.

Resultado agregado honesto:69dos76cenários tiveram passagem observada entre primeira rodada e comparação; sete não passaram nesta etapa. Não declarar76PASS, primeira suíte verde ou ausência absoluta de defeitos. Preservar como limites os resultados históricos de contraste/timer sem consertá-los; o teste focal do timer passou nesta rodada. Não se executou npm run check adicional, pois build/unit foram executados e o pedido exige a suíte Gika completa, não repetir a suíte histórica de /demo; o contraste fora da Gika não foi reavaliado/certificado nesta etapa.

Resultados iniciais e comparação locais: /tmp/leve-m5-closure-all-initial.log, /tmp/leve-m5-closure-entry-retry.log; resumos sanitizados /tmp/leve-m5-closure-{first,entry}-failures-sanitized.json, seleção exata /tmp/leve-m5-closure-failed-selection.json. Traces brutos nunca versionados. Esta tabela preserva no repositório os grupos e resultados efetivamente observados, sem headers, IDs privados ou payloads.

## Encerramento

**M5_BLOCKED**, gate de auditoria executado e documentado, sem feature/correção de produto. Bloqueadores: audit produção2high e regressão E2E sem aprovação (sete falhas originais reproduzidas na entrada). Centralidade de policy é qualificada na tabela de arquitetura; não certificar engine global único. M5/T1–T4 históricos permanecem done/aprovados; gate documental blocked e M6 todo/não iniciado.

Somente M5_CLOSURE_EVIDENCE.md, GIKA_STATE.md e GIKA_TASKS.yaml integram o checkpoint documental. Sem nova ADR, task funcional, writer, coleção, Rule, outbox, policy/receipt implementation ou persistência de conversa. Commit/push autorizados somente feat/gika-integration; igualdade HEAD local/origin e worktree limpo devem ser verificadas após push, com SHA real reportado ao usuário. Parar para revisão; qualquer investigação/correção ou hardening posterior requer escopo separado, sem iniciar M6.
