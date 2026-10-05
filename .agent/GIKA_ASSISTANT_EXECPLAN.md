# Gika assistant experience

## Continuação autorizada: compras sem depender de Preview

Entrada `5fe6d07ab41487638288e318165fe17930cfdf17`, mesma branch isolada. O usuário
mostrou um pedido válido de criar lista chamado Jantar recebendo uma pergunta genérica.
Compras existe no domínio/command layer, mas não no contrato de ferramentas da Gika.
Teste de bridge reproduziu a ausência: `createShoppingList` rejeitado pelo schema.

Entregar criação de uma lista normal por pedido explícito e consulta bounded das listas
ativas, com resultados reais após ACK. Reutilizar `shoppingList.create`, requestId estável,
revisão zero, receipt transacional e namespace UID; nenhuma escrita do modelo. Não ampliar
para itens/modelos/ciclos/exclusão em silêncio. Esses pedidos devem receber explicação
contextual da capacidade, sem criar tarefa ou conteúdo geral no lugar. Contexto projeta
somente nomes/counts recentes de listas, sem IDs/metadados de autoridade.

Ownership: confirmation_contract possui server/domain e novos testes de policy/integração;
root possui frontend, bridge/contexto, novos testes UI/bridge, evals e documentos;
diagnostic_review revisa somente leitura. Emuladores/testes orquestrados pelo root.

Gates: regressão antes/depois; policy/tool schemas adversariais; isolamento/replay/quotas/
stock/serviceControls em emuladores; bridge auth/ACK/tamper; UI desktop/mobile/Axe; audit,
lint, ambos typechecks, build, unit/integration e regressões críticas Gika. Nenhum retry,
timeout ou assertion enfraquecido. Rollback pelo commit focal; sem migration/configuração
externa. O usuário validará Gemini real depois: esta continuação publica somente a branch
isolada, não integra main nem declara avaliação real PASS por fixtures.

## Objective
Complete the assistant experience requested by the owner: semantic agenda interpretation,
contextual PT-BR conversation, usable chat/voice, and existing command security.
Work branch: `feat/gika-assistant-experience`; base: `f949b63ad3bc349ed6c95e12587051e43073699c`.

## Current context
The released path classifies and often interprets with two model calls. Lexical parsers then
reject valid semantic proposals. Classification omits history; the client excludes agenda
turns from history. Voice lacks recognition phase deadlines and interim feedback.

## Non-goals
No general chatbot, model change, dependency update, Firebase/service configuration, billing,
new direct model writes, broad layout redesign, or change to confirmation grants.

## Contracts
The model proposes intent and fields; the server owns identity, bounded reads, exact target
resolution, revisions, policy, command envelopes, receipts and HMAC. Current explicit intent
wins over history. History is untrusted contextual data, never a confirmation or identity.
No success before ACK. Keep original request text in hashes. Keep recurrence/batch guards.

## Steps
1. Map architecture and demonstrate behavioral/contract gaps.
2. Implement a bounded semantic turn and contextual history; improve chat/voice feedback.
3. Run behavioral/adversarial regressions, all requested gates, review actual diff.
4. Publish and integrate main only after all gates pass; inspect deployment if accessible.

## Ownership
Root: domain/frontend conversation context, limits, documentation and integration gates.
confirmation_contract: server/gika except quota, new semantic unit tests.
diagnostic_review: GikaPanel, GikaComposer, useVoiceInput, gika.css and voice/UI tests.

## Gates
Production dependency audit; lint; typecheck; build; full unit and emulator integration;
Gika E2E including policy, confirmations, quota, account isolation, recurrence and batch;
voice/mobile/accessibility regressions. Live model evaluation must be reported separately
from deterministic fixtures; mocked paraphrases are not proof of provider accuracy.

## Rollback
Revert the isolated assistant commit(s). No schema migration or external resource mutation.

## Evidence / resume state
Architecture and implementation reviewed. Candidate is awaiting complete E2E and live
Preview evaluation; main integration is explicitly authorized only after all gates pass.
Completed checkpoints: production audit 0 vulnerabilities, lint/boundaries, both TypeScript
projects, build, 745 unit and 306 emulator integration tests (candidate CI), plus eight critical
browser journeys. Final unit includes two legacy grounding regressions and focused query
clarification. Focused UI/context/submit run: 11 PASS.

Preserved first failures in ignored `.cache/gika-assistant`: UI Stop inherited a submit
interaction; stable disabled Send and separate Stop fixed it. Local classifier fixtures were
incorrectly charged as provider calls; explicit test-only local cost distinguishes them,
while provider cost defaults to charged. Diagnostics exact tests needed the new closed phase.
Two valid 8-second planning phases reproduced an operation timeout at 15 seconds; 25 seconds
fits inside the client 30-second deadline. Legacy token-set grounding accepted a substituted
negated name and an inflated amount; a contiguous literal span preserves order and numbers
for that compatibility path (production uses semantic proposals).

No timeout/retry/assertion changes in E2E. No external service, billing, model or secret change.
Live model results must remain separate from fixture evidence. Candidate publication is for
Preview evaluation only; do not declare readiness or integrate main before remaining gates.
Final review also reproduced a query clarification overwritten by a generic period question;
semantic routing now preserves the focused question. Before: 1 FAIL; after: 51 routing PASS.

Complete browser run: 110 PASS / 6 FAIL in 27.6m. Four failures were stale harness contracts
(real suggestion, minimal agenda context, stable disabled Send in two cases). Two exposed a
real presentation regression: writing verified context reclassified the old confirmation
preview as pending. Verified outcomes now take precedence; confirmed shows ACK then idle,
cancelled/undone are terminal and uncertainty is not success. All six affected cases PASS
in a focused rerun (1.9m), with the original timing, write/ACK/HMAC and Axe guards intact.
Generated historical screenshots were copied to ignored task evidence and restored.

Preview of identical backend `5fe3d5e8faef1e103a1c50beffb539e53afadc98` is successful at
`https://leve-agenda-vercel-cf6mshyzg-kauans-projects-6a261bab.vercel.app`, but returns Vercel
SSO 302. An external access request is pending; no credential is available to change protection.
42 held-out real-provider cases and synthetic read/create/reschedule-HMAC/rename/complete
follow-ups are ready to execute there. No live semantic result is claimed yet.

## Final candidate checkpoint
Runtime tested: `afd313259b62b23e97925671d7fda2b7063b86a7`. CI run `37285083676`
PASS: audit 0, lint/boundaries, both TypeScript projects, build, 745 unit, 306 integration,
eight critical E2E. Complete final local Gika E2E: **116 PASS / 0 FAIL in 25.2m**. Glass
check/selftest PASS, max blur 24px. No timing/retry/security assertions weakened.

No runtime edits during that final cycle. Seven generated historical screenshot files copied
to ignored task evidence then restored. Main remains `f949b63ad3bc349ed6c95e12587051e43073699c`;
no production data/service mutation. Public production bundle read-only check: `leve-db`
present, `leve-preview` absent.

Current Preview (exact tested runtime) is successful:
`https://leve-agenda-vercel-g2l08ku5t-kauans-projects-6a261bab.vercel.app`.
It and the requested identical-backend `5fe3d5e` Preview still redirect `/entrar` to Vercel
SSO (302); API requests are intercepted by Vercel 401. This is the only outstanding access
blocker. No Vercel credential is available. Do not invent live PASS or integrate main yet.
After access: run the 42 held-out cases plus five hosted action/context checks in
`scripts/evals`, review results, fix only demonstrated bugs, then integrate/push main and
verify the exact production deployment. Documentation-only evidence commits do not change
this tested runtime.

## Checkpoint local de compras — 2026-10-05

Runtime estável durante o ciclo completo: SHA256
`cc7de6dac63b445e289a8c129fac5470b45ba336dc804d23fce1701e3021317f`.
Audit produção: zero vulnerabilidades; lint, typecheck web/server, build e Glass
check/selftest PASS. **802 unit, 320 integration e 123 Gika E2E PASS**, zero falhas
no ciclo E2E completo (33.8min), sem aumentar timeout/retry ou enfraquecer guardas.
Inclui sete novos shopping E2E, desktop/mobile-dark/200%/Axe, criação/reload,
isolamento, recuperação de ACK, cancelamento ao navegar, voz e HMAC existentes.

Primeiras falhas foram preservadas: contrato de compras ausente (bridge1FAIL e
schema2FAIL); fixture do bridge corrigida; fullunit797PASS/2FAIL por allowlists
exatas antigas, atualizadas mantendo consulta sem escrita. Resultado final802PASS.
Artefatos visuais atuais permanecem no cache local; imagens históricas M1 restauradas.

Não executado: Gemini real, microfone físico ou smoke hospedado deste checkpoint.
O usuário assumiu essa validação posterior; o dataset opt-in agora tem61casos.
Lógica local entregue em `feat/gika-assistant-experience`; sem merge main, deploy,
alteração de Firebase, configuração externa ou produção.
