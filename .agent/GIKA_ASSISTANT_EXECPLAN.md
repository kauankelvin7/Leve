# Gika assistant experience

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
projects, build, 742 unit and 306 emulator integration tests. Final unit rerun includes two
new legacy grounding regressions. Focused UI/context/submit run: 11 PASS.

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
