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
