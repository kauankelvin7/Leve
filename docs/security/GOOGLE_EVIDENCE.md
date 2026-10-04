# Firebase/Google dependency hardening

Entrada a922594; DiceBear73e750c isolado concluído. Firebase12.19.0/Admin13.6.0/Firestore4.17.2 e7.11.6/Gax4.6.1/Storage7.22/gaxios6.7.1/retry7.0.2/teeny9 permanecem iguais. npm audit não executa fix; sugestão downgradeFirebase9.14/Admin14.5 major rejeitada após metadata; pais compatíveis não corrigem ranges.

## Mudanças limitadas

- grpc root1.9.16→1.14.5 e cópias1.14.4→1.14.5 dedup. Override exato em Firestore4.17.2 eGax4.6.1. Gax^1.10.9 compatível; SDK~1.9 explicitamente excedido, mesmo major grpc mas NÃO coberto pelo range original. APIs usadas cliente/credentials/streams/protobuf são comprovadas pelos166 testes SDK/Admin/Rules/commands emulados; não certificação de TLS/serviço Google live.
- uuid9.0.1→11.1.1 somente consumidoresGax4.6.1/gaxios6.7.1/teeny9. Não existe backport9 corrigido,11 mantém CommonJS/v4. Inspeção das três bibliotecas: só v4() sem buffer; patches v3/v5/v6 não usados pelo produto, mas regressão prova RangeError sem escrita parcial. Não overrideglobal nem uuid12+ESMonly, não trocar parents/API/domínio. Licenças Apache2/MIT e engines Node24 compatíveis.
- Dependências auxiliares do grpc/proto-loader0.8.1 foram deduplicadas/relocalizadas com MESMAS versões. Ordered-map4.4.2 já estava instalado, agora compartilhado em produção. Tooling grpc também deduplicado para1.14.5 em ranges ^1.13.0 compatíveis; CLI/tool versions intactas.

Primeiro npm install manteve shadow grpc1.14.4 do Gax: npm ls ELSPROBLEMS/audit1high, NÃO aceito. npm update direcionado não retirou shadow (npm11.9). Removida apenas entrada stale do lockfile para npm regenerar metadata/integrity reais, sem manual inventar versão/tarball; mesma estratégia para três cópias dev antigas em ranges compatíveis. npm install package-lock-only/ci ignore-scripts sem force executados; instalação final limpa/treeexit0/dedup íntegra. Metadados libc opcionais dev preservados, sem upgrades amplos.

## Auditorias/limites

Produção audit omitdev13(4high/9moderate)→0. audit omitdev audit-levelhigh exit0. Eliminados GHSA-gcr2-9v8m-gq45 (commit anterior), GHSA-m9gg-hp2v-232j(high), GHSA-f596-whhp-79r4(low embutido na entradagrpc) e GHSA-w5hq-g745-h8pq(moderate), além das entradas pais herdadas. Nenhum restante em produção. Audit completo28→14, high11→6/moderate17→8. Restantes dev-only preexistentes/mesmas versões/advisories comprovados contra locka922594, registrados em DEVELOPMENT_REMAINING.md/JSON/audit-all-before/after, sem CI silencioso/ignorando falhas. Escopo de CLI/parsers/proxy/padrões exige análise/testes próprios antes de upgrade adicional.

## Gates e revisão

Lint/build/dois TS/334 unit42 arquivos PASS. Nove novos contratos/regressões transitivos: requirev4 de três consumidores, GaxmakeUUID/SDKgrpcclient, v3/v5/v6 bounds, multipart REAL gaxios e teeny sobre HTTP local (fixtures públicas), sem servidor/payload privado externo.166 integrações6 arquivos PASS, Auth/Rules/membership/commands/receipts/concurrency/lost ack/Gika create/complete/update/reschedule/Undo/M5policy. Check build/doisTS/334 unit PASS e shell12/1 contraste preexistente, sem correção/masking/deadline changes. E2E finais53/53 PASS em duas execuções sequenciais:47 mutações/shell/avatar +6 leitura/fallback, cobrindo todas51 Gika atuais e2avatar. Undo intermitente e timer passaram sem modificar/corrigir baselines. Nenhuma nova falha de teste; não foi necessário comparar caso novo ao checkpoint. gRPC shadow inválido foi iteração de instalação explicitamente corrigida, não teste mascarado.

Todos os152 arquivos produto/harness/CI selecionados byte-idênticos a a922594; modificados apenas manifest/lock, testes específicos e documentação/estado. Source policy/tools/bridges/writers/Rules/UI/outbox inalterados. Testes somente demo-leve/emuladores/fixtures; server env sem GEMINI_API_KEY. Nenhuma live/key/.env/billing/merge/push/deploy. Subauditoria read-only forneceu alcance/metadados iniciais; revisão final manual do orquestrador, sem alegar revisão auxiliar final que não terminou.

## Manutenção

Reavaliar/remover overrides quando SDK/parents publicarem ranges fixos. Engine/provider/Gika não depende da versão UUID transitiva para idempotência: IDs software/receipts continuam contratos do domínio. SDKNodegrpc cross-range e UUID major têm risco residual de usos futuros não cobertos; escopo limitado/fixação exata/gates existentes reduzem risco observado. Rollback por revert commit e npm ci, sem alterar receipts/dados. Parar para revisão antes de integrar branch em feat; M5-T2 não iniciado.

## Checkpoint final

DiceBear: `73e750c866b620bb6a44147ecebf2b42d5e51b18`. Firebase/Google: `e8c07be3218cb583fffb5af38e7a8beb10c95851`. Branch chore/security-hardening e worktree limpo confirmados após commits atômicos. Checkpoint documental posterior somente registra SHAs/estado e normaliza fim de linha das árvores, sem mudança funcional. feat/gika-integration permanece a922594, não houve merge. Parar para revisão; M5-T2 não iniciado.
