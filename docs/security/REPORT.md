# Relatório — security dependency hardening

Branch temporária chore/security-hardening criada a partir de a922594 limpo, sem merge para feat/main. M5-T1 aprovado, M5-T2 não iniciado.

## Audit antes/depois

| Escopo | Antes | Depois |
|---|---|---|
| Produção --omit=dev |13:4high/9moderate/0critical|0total/0high/0critical/0moderate|
| Completo incluindo dev |28:11high/17moderate|14:6high/8moderate, todos dev-only preexistentes|

`npm audit --omit=dev --audit-level=high` exit0/found0. JSONs sanitizados audit-before/dicebear/after, audit-all-before/after e árvores before/after arquivados. Nenhuma exceção de CI/filtro novo: omitdev é o comando de aceite solicitado; audit completo restante explícito em DEVELOPMENT_REMAINING.md/development-advisories.json. Não é declaração de audit completo verde.

## Versões/compatibilidade

| Pacote | Antes → depois |
|---|---|
| @dicebear/core, @dicebear/avataaars |9.4.2 →9.4.3, patch exato coordenado|
| @grpc/grpc-js |1.9.16 (SDK)/1.14.4 (Gax/tooling) →1.14.5 dedup|
| uuid nos três consumidores vulneráveis |9.0.1 →11.1.1 CJS/v4|
| Firebase/Admin |12.19.0/13.6.0 preservados|
| @firebase/firestore/@google-cloud/firestore |4.17.2/7.11.6 preservados|
| GoogleGax/Storage/gaxios/retry/teeny |4.6.1/7.22.0/6.7.1/7.0.2/9.0.0 preservados|

Overrides version-specific de Firestore4.17.2/Gax4.6.1/gaxios6.7.1/teeny9. Exceções ao range upstream explicitadas: SDK~grpc1.9 ultrapassado dentro do major1; uuid9→11 major apenas três callers auditados v4() sem buffer, CJS/exports preservados. Não forçar pai major/não downgrade/não auditfixforce. Tree válido, clean npm ci ignore-scripts executado; auxiliares mesmos números apenas relocação/dedup. Licenças MIT/Apache2/Avataaars design livre intactas, Node24. Provas específicas e limitações em INVENTORY.md/GOOGLE_EVIDENCE.md. TLS/Google real não testados; nenhum segredo/live.

## Advisories

Eliminados em produção: GHSA-gcr2-9v8m-gq45 (SVG rotate), GHSA-m9gg-hp2v-232j (gRPC auth), GHSA-f596-whhp-79r4 (gRPC leak low associado) e GHSA-w5hq-g745-h8pq (uuid buffer), com todas entradas agregadas/herdadas correspondentes. Nenhum advisory de produção permanece.

Os14 de desenvolvimento são tooling CLI/linters/proxy/parsers, mesmas versões/advisories na entrada (JSON e cadeias corretas filtradas pela versão afetada). Risco real/motivo técnico de adiamento/fixAvailable individual em DEVELOPMENT_REMAINING.md; não minimizar como impossíveis, não ampliar esta tarefa para upgrade de firebase-tools/parsers sem análise específica.

## Gates/checkpoint

DiceBear: lint/build/doisTS/325unit/2avatarE2E PASS; seis SVGs padrão SHA256 idênticos, injeção rotate RED9.4.2→GREEN9.4.3. Commit atômico separado73e750c.

Firebase/Google final: lint/build/doisTS/334unit/166integração PASS, com Auth/Rules/membership/commands/receipts/idempotência/create/complete/update/reschedule/Undo/M5policy e9 contratos transitivos. Check shell12/1 contraste histórico3,66..4,17:1. E2E finais53 PASS/0 FAIL:47 mutações/shell/avatar +6 leitura/fallback, incluindo51 Gika únicas. Nenhuma nova falha de teste; Undo intermitente passou sem mudança de deadline/produto. Produto/policy/tools/writers/Rules/UI/outbox/CI/harness152 arquivos byte-idênticos à entrada, sem mudanças de deadlines/baselines.

Commit Firebase/Google atômico separado e checkpoint documental registram SHAs reais após gates; worktree limpo confirmado depois dos commits. Sem M5-T2/live/push/deploy/merge/billing/segredos. Parar para revisão antes de integrar branch temporária de volta em feat/gika-integration.
