# Security dependency hardening

## Entrada e escopo

`a922594699cd95e2bc6602bccc215f4a23e75f41`, feat/gika-integration/worktree limpo verificados. Branch autorizada `chore/security-hardening` criada desse SHA. M5-T1 aprovado, M5-T2 todo/não iniciado. Somente dependências e provas pertinentes; sem modificar policy/tools/writers/domínio/Rules/UI/CI, merge/push/deploy/live/credenciais. Superpowers indisponível, processo manual equivalente; auditor auxiliar read-only.

## Inventário

`npm audit --omit=dev --json`:13 entradas (4high/9moderate), três advisories principais e um low gRPC adicional. Registro sanitizado audit-before.json/dependency-tree-before.txt. Inspecionar cada cadeia/versão/range/reachability sem considerar transitivas automaticamente exploráveis ou inofensivas. Rejeitar sugestão de downgrade Firebase9.14 e upgrade Admin14 amplo sem análise.

## Execução

1. DiceBear core/avataaars9.4.2→9.4.3 patch coordenado, licenças/geração/determinismo/perfil/build/typechecks/unit/E2E de perfil; commit atômico separado com estado/evidências.
2. Firebase/Admin/Google: verificar releases pai compatíveis e ranges. Escolher menor correção comprovada; overrides apenas com inspeção de API/exports/ranges/árvore e testes, nunca major incompatível para zerar contador. Provar instalação limpa/lockfile reproduzível. Manter dev tooling fora do alvo exceto dedup inevitável documentado.
3. Lint/build/dois TS/unit completo/integr166 com Auth/Rules/commands/receipts/Gika/Undo/M5policy; E2E Gika aplicável e auth/perfil/PWA/outbox pertinente. Escritores de emulador sequenciais. Check/audit readonly; falhas novas comparar a922594 antes de classificar. Sem alterar deadlines/contraste/timer/harness para esconder falhas.
4. Audit final omitdev/auditlevelhigh deve exit0, ideal0total; restantes advisory/cadeia/alcance/motivo explícitos. Relatório antes/depois/versões/licenças/risco/gates/checkpoint. Branch temporária aguardará revisão antes de integrar em feat; sem merge.

## Rollback

Revert apenas commits exclusivos em ordem inversa e npm ci, sem tocar receipts/dados/arquitetura. Upgrade de dependência não autoriza próxima etapa da Gika. Parar após relatório/checkpoint limpo.

## Escolha após inventário, antes de instalar Firebase/transitivos

Firebase12.19/Admin13.6/Firestore4.17.2 e7.11.6/Gax4.6.1/retry7/teeny9/gaxios6 preservados. Override exato apenas Firestore4.17.2→grpc1.14.5 eGax4.6.1→grpc1.14.5/uuid11.1.1; gaxios6.7.1/teeny9→uuid11.1.1. Sem override global deuuid/SDK/Admin ou versõesmajor dos parents. Firestore ~grpc1.9 é faixa superada conscientemente (mesmo majorgrpc, interface client usada preservada a comprovar em integration); uuid9→11 excede major declarado, mas apenas v4() sem args/buffer nos três consumidores, CJS preserved. Contratos v4, multipart gaxios/teeny, gaxUUID e SDKNode/Admin emuladores serão comprovados antes de aceite. Se falharem, não forçar versão só para zerar audit. Sem upgrade13.10/14.5 que não resolve sozinho ou amplia APIs.
