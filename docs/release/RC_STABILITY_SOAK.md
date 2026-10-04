# RC Stability Soak — 04/10/2026

**Resultado atual: RC_STABILITY_GO.** Após isolar o custo acumulado do harness e dividir o percurso preservando cobertura e guardas, Glass 853px light/dark concluiu em três ciclos oficiais consecutivos de 60s, com captura e zero retries. Runtime permanece no SHA `1c3561b5a99e1e71e9555dcec7f1973065088ee2`. O NO-GO inicial e suas evidências estão preservados abaixo.

## Checkpoint e ambiente

- Repo: `kauankelvin7/Leve`; branch: `feat/gika-integration`.
- SHA testado: `1c3561b5a99e1e71e9555dcec7f1973065088ee2`. Local e origin iguais antes e após o soak; checkout inicialmente limpo, sincronizado por fast-forward.
- Security V2 (`a92b334`, `78283de`) e Liquid Glass (incluindo `1f37a58`, `a9d1a21`) confirmados como ancestrais do checkpoint.
- Node 24.19.0, Java 21, Chromium do Playwright instalado pelo comando oficial. Auth/Firestore Emulator, projeto `demo-leve`, dados sintéticos, sem Gemini real.
- Ponytail/Caveman não disponíveis no catálogo nem nos diretórios de skills inspecionados; investigação e verificação manuais.

## Soak inicial — ciclos e gates executados

| Comando/prova | Ciclos | Resultado |
| --- | ---: | --- |
| `npm run verify` | 2 | PASS em ambos: audit de produção 0 vulnerabilidades; lint/boundaries, typecheck, build; 546 unitários, 257 integração e 8 E2E críticos por ciclo |
| `npm run test:e2e:local` amplo | 1 | 141/141 PASS, 29,1 min |
| `npm run test:e2e:local -- --grep …` — 41 cenários selecionados | 2 adicionais | 41/41 PASS em cada, 8,0 e 7,9 min; seed novo por execução |
| Focal de cancelamentos explícitos, por `--grep` | 1 adicional | 6/6 PASS, 1,3 min |
| `npm run glass:selftest` / `npm run glass:check` | 1 válido cada | PASS; zero erros estáticos, blur máximo 24px |
| `GLASS_COMPLETE=1 GLASS_CAPTURE=0 npm run glass:e2e -- --grep 'authenticated 853 (light\|dark)$'` | 2 | Light e dark: timeout de 60s em ambas as rodadas |
| Mesmo focal Glass com `GLASS_CAPTURE=1` | 1 | Light e dark: timeout de 60s |
| Sondagem local da build: `.cache/rc-stability/pwa-soak.mjs` | 3 | PASS: instalação, shell/cache, reload offline, reconexão, atualização waiting/SKIP_WAITING, cleanup do cache antigo e ausência de console errors/rejections no cenário |

Total funcional: **1.092 execuções unitárias, 514 de integração e 245 E2E aprovadas**; estas contagens incluem repetições, não testes distintos. Glass: **6/6 execuções focais com timeout**. Nenhum timeout, retry ou assertion foi alterado.

Os 41 cenários tiveram três ciclos contando a ampla. Cobrem login/logout/troca de conta, isolamento, criação/edição/conclusão/reagendamento, recorrência, idempotência/replay, undo, batch, Gika read/write e organização, offline/outbox/reconexão, proatividade, voz simulada, planner, ações repetidas e duas abas. Cancelamento recebeu repetição focal adicional. A ampla cobriu também import/export, seis viewports, teclado, Axe e reflow a 200%. Console/pageerror foram verificados nos cenários que já os instrumentam; não se declara monitoramento global de todas as páginas.

## Falhas e investigação

1. **Ambiente:** primeira tentativa de `glass:selftest` falhou por Chromium ausente. Log original preservado em `.cache/rc-stability/glass-selftest.log`; instalação oficial resolveu, sem mudar dependências do repo.
2. **Seleção do comando:** a primeira tentativa focal Glass usou `^` no início do filtro e retornou `No tests found`. Corrigida somente a seleção; log preservado em `glass-1.log`. Não conta como ciclo executado.
3. **Glass reproduzível neste ambiente:** light/dark excederam o prazo nas três rodadas. Durações reportadas, incluindo encerramento: 63,4/62,7s; 62,5/62,2s; 63,5/63,4s. A primeira falha ocorreu durante a medição do chat ativo; outros percursos terminaram antes dessa etapa. Não classificar estas rodadas como PASS segmentado.

O trace mostra esgotamento do orçamento acumulado do percurso serial, sem uma única operação travada: na primeira falha light, chamadas de avaliação de elementos somaram aproximadamente 15,8s, avaliações de frame 12,2s, screenshots internos do medidor 7,0s e navegações 5,2s. O encerramento por timeout fecha a página; a exceção posterior na restauração do medidor (`contrast.mjs:236`) é secundária. A contribuição exata de ambiente, tracing e runtime para a diferença em relação ao histórico permanece não isolada.

Nas duas rodadas sem captura, respectivamente 25 e 26 inspeções concluíram com **zero violações Axe e zero erros do probe**. Isso não prova as inspeções interrompidas. O timeout historicamente intermitente do cronômetro não reapareceu nos três ciclos; nenhum defeito funcional nem falha nova intermitente foi demonstrado.

**Correções no soak inicial:** somente preparação do ambiente e correção do filtro CLI. Nenhuma mudança de runtime, harness, assertion, configuração ou dependência nessa etapa; nenhum commit artificial, branch de hardening ou integração. Screenshots gerados em documentação pelos testes existentes foram arquivados no cache e os arquivos originais restaurados. Apenas este relatório foi acrescentado.

## Evidências e riscos residuais

Logs, seleções exatas, diagnósticos, screenshots e traces separados por rodada: `.cache/rc-stability/` (local, ignorado pelo Git). Primeira falha Glass: `glass-2.log`, SHA-256 `92859df29b4f92377c339c1b12d6707926a0af09e401561eb0f968a2259a4fa7`; artefatos em `glass-2-artifacts/`. Reproduções preservadas em `glass-3-*` e `glass-capture-*`.

- Bloqueador inicial, resolvido na continuação abaixo: concluir a qualificação Glass de 853px com as guardas atuais e esclarecer o custo do percurso. Nenhuma alteração de produto foi justificada por este timeout de verificação.
- Build conserva warning de chunk >500kB. Integração emulada emitiu warnings de metadata lookup 403; os testes passaram.
- Chromium local não substitui aparelho/PWA instalado, Safari/iOS, leitor de tela, voz real, notificações reais ou smoke Gemini/Firebase hospedado. A sondagem PWA verifica o worker na build sem autenticação; o ciclo conjunto de update com outbox autenticada pendente não foi provado em navegador de produção.
- Permanecem os requisitos externos de proteção contra DDoS volumétrico/flood antes da função, rate limiting por IP no edge e App Check não verificado na API.

**Recomendação inicial (histórica): NO-GO para qualificação do runtime neste checkpoint.** Gates funcionais verdes não anulavam o focal Glass reproduzivelmente incompleto. Main, produção, Firebase/Vercel/DNS, deploy e novas milestones permaneceram fora da execução.

## Continuação focal — isolamento do custo e qualificação oficial

Instrumentação opcional em `scripts/glass/timing.mjs`, `probe.ts`, `contrast.mjs` e `authenticated.spec.ts` registra duração por inspeção/operação em NDJSON. Os registros usam rótulos técnicos estáticos, sem argumentos, payloads, tokens ou identificadores de usuários. Sem `GLASS_TIMINGS_FILE`, não escrevem arquivos.

**Uma única execução diagnóstica**, light/dark, com `GLASS_COMPLETE=1 GLASS_CAPTURE=0 GLASS_DIAGNOSTIC=1` e `--timeout=120000`, concluiu em **77,94s / 76,27s**. Ela **não conta como PASS de RC**. Por tema, realizou 15 inspeções, 90 alvos nativos e 270 screenshots internos do medidor.

| Custo acumulado no diagnóstico | Light | Dark |
| --- | ---: | ---: |
| Inspeções completas | 62,23s | 60,71s |
| Contraste nativo (parte das inspeções) | 48,06s | 47,62s |
| Axe (parte das inspeções) | 12,29s | 11,50s |
| Login | 5,83s | 5,53s |
| Navegações | 3,40s | 3,42s |

**Causa isolada:** orçamento de 60s aplicado a um percurso monolítico de medições seriais. Contraste nativo + Axe consumiam aproximadamente 60s antes de login, navegações e interações. Dentro do contraste, 990 avaliações de elementos custaram 26,31/26,43s; avaliações de página 6,66/6,52s e screenshots 10,10/9,99s. O trabalho inclui chamadas serializadas ao navegador, fingerprints DOM/CSS/geometria e medição de pixels; não foi observada operação travada nem defeito de runtime. O ambiente influencia as durações, mas o custo dominante demonstrado pertence ao harness de medição, sem evidência que justifique alterar produto.

**Correção exclusiva do harness:** duas fases seriais por tema — rotas e interações — compartilham a mesma página/contexto e mantêm a sequência original de navegação, formulário, welcome, chat e fechamento/reabertura. Nenhum resultado é reutilizado para pular medição. Comparação AST com o arquivo original confirmou argumentos idênticos em 54 chamadas de assertions, inspeções, aparência, mocks e listeners. Permanecem tags Axe, limiares, guardas e algoritmo nativo; configuração oficial permanece timeout **60.000ms**, expect **10.000ms**, **zero retries**, um worker. `HARNESS_LOCK.json` foi atualizado somente para refletir os arquivos do harness.

A primeira tentativa após a divisão falhou rapidamente: Axe exigiu contexto explícito (`Please use browser.newContext()`). Preservada em `.cache/rc-glass/cycle-1.log` e `cycle-1-artifacts/`: duas fases falharam e duas não executaram. Corrigida a criação para `browser.newContext()` + `context.newPage()`, sem alterar assertions, retries ou timeout. Essa tentativa não integra os três ciclos aprovados.

**Gate oficial:** três invocações consecutivas com seed/server novos, `GLASS_COMPLETE=1 GLASS_CAPTURE=1`, sem `GLASS_DIAGNOSTIC` e sem override de timeout: `npm run glass:e2e -- --grep 'authenticated 853 (light|dark)$'`.

| Ciclo oficial | Light rotas | Light interações | Dark rotas | Dark interações | Resultado |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 (`cycle-2.log`) | 39,26s | 41,20s | 39,62s | 34,51s | 4/4 PASS |
| 2 (`cycle-3.log`) | 37,36s | 35,65s | 41,91s | 36,97s | 4/4 PASS |
| 3 (`cycle-4.log`) | 30,82s | 36,25s | 38,04s | 34,33s | 4/4 PASS |

Maior fase: **41,91s**, margem de **18,09s**. Cada ciclo concluiu 15 inspeções por tema, capturas viewport/fullPage, zero erros do probe, zero overflow e zero violações Axe. Todos os alvos de contraste incompleto retornados pelo Axe receberam medição nativa PASS: contagens light/dark **90/90, 90/90, 76/90**. A variação final decorre de o Axe não retornar 14 alvos incompletos no calendário light; a rota renderizada e inspecionada foi preservada. Não representa retirada de cobertura.

Verificações proporcionais: `npm run typecheck`, `npm run lint`, `npm run glass:selftest`, `GLASS_COMPLETE=1 npm run glass:check` e `git diff --check` PASS. Os selftests mantêm validação de máscaras de glifos, cores iguais, SVG, ellipsis, opacidade, textarea/placeholder, forced colors, arredondamento/fontes, restauração e rejeição de texto mutável. A bateria completa não foi repetida porque não houve mudança de runtime. Evidências locais em `.cache/rc-glass/`: `diagnostic.log`, `diagnostic.ndjson`, snapshots por ciclo, `equivalence.log` e `official-summary.json`; primeiras falhas permanecem preservadas também em `.cache/rc-stability/`.

**Recomendação atual: GO para o runtime neste SHA com o harness corrigido localmente.** Os riscos externos/dispositivos listados acima continuam. Não se afirma melhoria de performance do produto; resolveu-se o orçamento da qualificação. HEAD e origin continuam iguais ao checkpoint; alterações de harness e relatório estão no worktree para revisão, sem commit/push. Nenhuma alteração de runtime, dependências, main, produção ou deploy.
