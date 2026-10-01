# M2 — evidências read-only

## Preflight M2-S0

Classificação definitiva em [M2_PREFLIGHT.md](M2_PREFLIGHT.md). Contraste completed e harness recorrência são baseline. Offline era regressão do dock Gika; corrigida no commit 7a3c343 com sequência Planner original 2 PASS e nova proteção desktop. Nenhuma regra/domínio Planner alterada.

## M2-T1 — adapter de modelo

PRE HEAD 7a3c343, worktree limpo; ownership server/gika, env examples, testes unit e docs. Provider-independent ModelAdapter; Gemini Developer generateContent explícito gemini-3.5-flash-lite; thinkingLevel MEDIUM; uma request, até três calls, 10s, 64 KiB, 1024 tokens, sem retry/fallback. Segredo somente process.env.GEMINI_API_KEY no header HTTP, nunca URL/log/cause/frontend. env.example contém somente GEMINI_API_KEY=; .env.example preserva config anterior e adiciona a variável vazia.

Gates executados 2026-09-30: npm run lint PASS; npm run build (dois typechecks) PASS; npm test 116 PASS/27 arquivos. Primeiro teste de privacidade falhou por matcher exigir propriedade cause ausente; corrigido para verificar ausência real, suite integral repetida PASS. Sem testes desabilitados ou chave fictícia; transport injetado usa Response fixtures offline.

Casos: missing env sem HTTP; 429/quota; 503/403; JSON/envelope inválido; malformed function call; truncamento; limites de bytes/calls; deadline de transport que ignora abort; falha sanitizada sem causa upstream; resposta válida; narrativa livre descartada. Interface não importa Firebase/commands.

Documentação oficial consultada em 2026-09-30: [modelo estável](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [Standard Free Tier gratuito](https://ai.google.dev/gemini-api/docs/pricing), [REST e MEDIUM](https://ai.google.dev/api/generate-content). Nenhum recurso financeiro foi configurado. Smoke real não executado: GEMINI_API_KEY ausente. A configuração financeira de um projeto real ainda deverá ser comprovada como sem billing antes do smoke; não é inferível de uma credencial ausente.

## M2-T2 — tools autenticadas e UI

PRE HEAD a1334eb, worktree limpo. get_today/day/week passam por allowlist Zod strict, policy civil <=7 dias/366dias de distância, autorização Admin email/profile/membership e controls normal, deadline15s e limites por conta desde ativação. Nenhum import/callback de command layer; M2 para na camada de consultas existente. Queries reproduzem useCalendarRange (inclusive/exclusive/overlap), cap50 por grupo, dedup, soft-delete, projeção mínima validada, até50 itens finais. Séries ativas com horizonte não materializado e documentos inválidos/saturação tornam partial=true; nunca materializa séries.

Contrato de UI preservado: GikaAdapter(request,signal), requestId/text, response.text/simulated, cancelamento/retry/draft. Union real exige reads tipadas; nenhuma preview/confirmation/undo real é aceita. Mock continua injetável; produção usa exclusivamente API autenticada, sem requests background nem outbox. Chips real são consultas. Resultados escapados em GikaToolResult e empty/partial honestos. Revisor React: hooks/cleanup/limites/lazy UI, imports diretos, serialização mínima e consultas paralelas independentes; humanizer-br em toda copy.

Gates finais: lint/build/dois typechecks PASS; 126 unit/28 arquivos PASS; 41 integração/4 arquivos em Auth/Firestore emulados PASS (inclui 13 Gika). Gika M1 regressão14 PASS; quatro cenários UI API reais/fixtures PASS (28,3s): missing env real + agenda convencional/draft, resultado read-only escapado/sem commands, mobile dark com partial/scroll/Axe e quota/saída mutável rejeitada. Axe e temas/viewports/reflow da suíte M1 PASS; screenshot mobile dark /tmp/leve-m2-mobile-readonly.png revisado. Bundle dist não contém GEMINI_API_KEY/model/endpoint; nenhum segredo utilizado. Metadados SDK 403 são warning do emulador, testes PASS.

Falhas encontradas e corrigidas: primeira tentativa E2E usou127.0.0.1 enquanto Vite atende localhost (18 casos nem abriram app); tentativa em localhost teve17 PASS/1FAIL porque novo helper usava button para link Nova atividade; selector corrigido e quatro casos repetidos PASS. Node24 strip-only rejeitou parameter property de GikaFault; convertida a propriedade explícita e servidor nativo iniciado PASS. Parser Gemini admite id opcional/args vazio omitido pela API, normaliza apenas name/args. Body parser isolado Gika sanitiza JSON inválido sem conteúdo privado em logs (integração13). Nenhum teste removido/desabilitado; não atribuir essas falhas de implementação/harness ao baseline Planner.

Limitação financeira explícita: limites em memória são por instância, não quota distribuída. O requisito R$0 depende de credencial de projeto Free Tier sem billing; nenhum billing/grounding/caching/retry/provider pago foi configurado. Somente smoke Gemini real permanece pendente por ausência de GEMINI_API_KEY.

## M2-T3 — evals, revisão e checkpoint (2026-09-30/2026-10-01 UTC)

PRE HEAD ac2728916b3f7157f938514a2065d5d48ff4fa36, worktree limpo. Evals rastreados em EVALS.md: E01/E02/E60/E70/E71/E73/E74. Account/membership é reautorizado após a espera upstream antes de leituras; troca de contexto civil exige nova tentativa, sem usar contexto antigo. Teste de revogação concorrente prova403 sem dados. Novo teste de API adapter prova abort/UID/logout mesmo com transporte que ignora cancelamento; nenhum comando/outbox. Smoke guard é executado em Node24 nativo, detecta incompatibilidade strip-only que transform do Vitest não detectava.

Gates finais executados: npm run lint PASS; npm run build e ambos typechecks PASS; npm test134 PASS/30arquivos; integração em Auth/Firestore42 PASS/4arquivos (14 Gika +28existentes). E2E final8 PASS/1,2min: sequência original dia inteiro/Planner offline2 PASS, Gika API6 PASS (missing env real, tool result escape/sem mutação, mobile dark/Axe/partial/scroll,429/saída mutável, cancelamento/logout/segunda conta e quatro classes de falha com agenda disponível). Regres­são mock14 PASS no T2; sem nova mudança no shell após esse gate. Agent-browser após reiniciar servidor nativo: acesso/login snapshot, errors vazio e health200. Screenshot mobile dark read-only revisado e versionado em evidence/m2-mobile-readonly-dark.png. Depois de expandir script para E01/E02, lint e teste native smoke1 PASS novamente.

Revisão de escopo: git diff da base para server/commands, outbox e firestore.rules vazio; módulos Gika sem chamadas de escrita/persistência ou commands. Map.set/delete são apenas memória, não Firestore. Bundle dist auditado sem GEMINI_API_KEY, endpoint/model Gemini. Sem nova dependência/SDK/serviço pago; privacy de provider/error/body/cancelamento revisada. Nenhum teste desabilitado, nenhuma chave Gemini fictícia, nenhum billing/Cloud Billing/cartão/push/deploy/merge.

## M2-SMOKE — único bloqueio de M2

npm run gika:smoke executado: exit2, BLOCKED: GEMINI_API_KEY ausente; nenhum request enviado. Isto não é PASS nem teste skipped. Script pronto usa adapter real com modelo exato/medium, valida E01/get_today e E02/get_day/depois de amanhã civil, sem dados de agenda/Firestore. Quando credencial servidor de projeto Free Tier sem billing estiver disponível, executar o comando, registrar resultado e checkpoint; falha quota/indisponibilidade permanece falha graciosa e não permite fallback pago. Sem segredo não há evidência de disponibilidade/cota/interpretação reais.

M2-T1/T2/T3 concluídas, milestone M2 permanece in_progress somente por este smoke. Nenhuma mutação M3 foi iniciada. Próxima tarefa M2-SMOKE blocked; M3-T1 depende dele e de nova continuidade de escopo, preservando o pedido estritamente read-only atual.
