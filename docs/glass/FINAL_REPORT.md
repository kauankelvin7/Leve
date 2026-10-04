# Liquid Glass — checkpoint interrompido pelo usuário

Status no checkpoint original: `STOPPED_BY_USER_WITH_GLASS_VERIFICATION_PENDING`. Atualização em 04/10/2026 registra correção de contraste e conclusão dos casos Glass, ainda antes da integração e da regressão final/RC-UAT.

O texto abaixo registra o checkpoint histórico dcf8c9c; resultados atuais e ponto exato de retomada estão no final.

M9 congelado: `b0e7bae753ec93374a3ebe3ec2b1a5ac07298046`.
Harness inicial: `fea3abcdea84b805ab5aab58d43a7eaa812134b5`.
Branch de trabalho: `feat/liquid-glass-system`; não integrada na linha consolidada.

## Trabalho preservado

Inventário29superfícies; manifesto8superfícies com hashes; sem dependências novas. Primeiro lote implementado experimentalmente: bottom nav móvel e auth entry; desktop ink permanece opaco. Primitivo16/22/12px, teto24px, filtros standard/WebKit pareados, fallback sólido e preferências de efeitos. Listas, formulários, calendário interno e cards de domínio continuam sólidos. Overlays/dock/Gika ainda aguardam aplicação/validação final.

Correções reais separadas: launcher não cobre Excluir após reload de lista curta nem Sair em agenda longa (2/2 focal); calendário a200% usa eixo e badge proporcionais à fonte (focal PASS). Nenhum Auth/command/policy/receipt/recurrence/batch/Character alterado.

## Resultados e primeiras falhas

Histórico integral sanitizado em DECISIONS.md. Última ampla fresh serial:29PASS/3FAIL/23não executados,18.4min.26casos público+autenticados nas seis dimensões/light/dark passaram; os três failures foram200%, forced colors e medição de timer. Não declarar essa primeira ampla verde.

Após causas demonstradas:200% PASS37.9s; timer/confirmation390light PASS após timestamp fixo exclusivamente na fixture de navegador. Selftests nativos/static PASS, incluindo cores iguais FAIL, alpha/fonts/ellipsis/textarea, guards e rejeição de conteúdo alterado, restauração de animações running/paused. Lint/AST47, ambos typechecks e build PASS; warning histórico de chunks grandes permanece.

Última focal:1PASS/1FAIL,1.6min. Forced colors FAIL41.6s: Hoje/count badge retorna FORCED_WRAPPER_STYLE_CHANGED, logo contraste não foi certificado; Compras mantém três violações Axe color-contrast em small do overview. Há indício de divergência entre CSSOM e pintura forçada, mas isso NÃO foi aceito como dispensa. Classificação: HARNESS_BUG para wrapper/medição; contraste de Compras pendente de classificação conclusiva. Três tentativas localizadas preservadas; nenhuma quarta tentativa especulativa, threshold/retry/deadline reduzido ou ampliado.

## Bloqueio e limites

Não é possível declarar acessibilidade/Glass aprovado com contraste não certificado. Remover blur das duas superfícies implementadas não resolve estes alvos sólidos, logo não constitui solução factual. Não classificar como EXTERNAL_BLOCKER: a investigação é do harness/CSS local.

Capturas before existem; review visual after, performance final, lotes restantes, glass:verify, integração de branches, regressão absoluta e RC/UAT permanecem PENDING. Logs/traces locais não são publicados: podem conter autenticação sintética. Nenhuma aprovação visual final fabricada.

Main inalterada. Sem deploy, PR, Gemini live, serviço pago ou integração prematura.

## Interrupção solicitada pelo usuário — checkpoint atual

Implementação preservada em `c8620e2af48fa3c6f4ef997923991fe63644b9cb`, branch `feat/liquid-glass-system`. Suíte `GLASS_CAPTURE=1 TMPDIR=/workspace/leve-glass-tmp npm run glass:verify` interrompida por SIGINT após pedido explícito, exit130. Resultado observado:16PASS/2FAIL/1interrompido/36não executados,7.3min. Falhas reais desta rodada: authenticated853light55.5s e853dark (duração no log original), welcome/chat retornam `UNMEASURED_CONTRAST`, razão `NO_VISIBLE_TEXT_RECTS`; zero violações Axe nesses snapshots. Causa ainda NÃO diagnosticada; desconhecido não é PASS.1024light foi interrompido em auth/bootstrap, não classificado como regressão.

Log local preservado `.cache/final-run/resume-glass-full-first.log`, SHA256 `685a7c30b20ad6b29b5193f4687e8b0d181a4e8fb847dcae29188a1e8442e854`; JSON/capturas/traces em `.cache/glass/after`. Logs e traces brutos não versionados/publicados por poderem conter autenticação sintética. Não houve repetição desta ampla nem aumento de timeout/retry/assertion.

Forced colors focal anterior1/1PASS39.6s; selftests/lintAST47/ambosTS/build/strictstatic e focais nav/Calendar/sheet/timer/recurrence passaram. Isso não substitui a ampla incompleta. Commits funcionais desta retomada:3be88f8 (forced colors),0e77d9c (nav/reflow),c8620e2 (quatro overlays/capture).

Pendências exatas: diagnosticar contraste não medido no painel Gika853; imagem estática da nav atualmente reutiliza GikaPortrait e antecipa rest/offline inline no bootstrap (entry1210129→1277239bytes, medição bruta; otimização ainda NÃO aplicada); concluir Glass ampla/capturas/QA/performance; somente depois integrar e executar regressão final/RC-UAT. Nenhum asset/controller/contrato/backend alterado.

Nenhuma integração em feat/gika-integration, nenhum main/deploy/live/Cadet. M9 congelado b0e7bae preservado. Estado: `STOPPED_BY_USER_WITH_GLASS_VERIFICATION_PENDING`. Parar aqui; não continuar investigação automaticamente.

## Retomada autorizada após checkpoint `1ec7edc`

**Causa:** o diálogo da Gika é `:modal` na top layer e fica no DOM dentro da sidebar `overflow:auto`. O browser pinta o diálogo fora da sidebar; o harness o recortava pelo ancestral rolável. O medidor agora interrompe a cadeia de clipping fora do modal/popover top-layer e continua verificando o próprio diálogo. O self-test cobre exatamente essa estrutura.

**Contraste e QA visual:** em 853px light/dark, os snapshots welcome (12 alvos) e chat (10 alvos) tiveram todos os contrastes medidos, sem violações Axe. Piores razões: 5.48:1 light e 6.19:1 dark, acima do requisito normal de 4.5:1. Focais após a correção passaram; imagens viewport/full-page de light/dark revisadas.

**Glass e limitações de duração:** `glass:selftest` e `glass:check` passaram. A execução capturada percorreu 55 casos: 48 passaram e 7 autenticados expiraram no timeout existente de 60s. Repetidos individualmente, os sete passaram sem captura em 57.2–59.4s. Os resultados após a correção passaram em 853px light/dark; após otimizar o bundle, light/dark passaram de novo (dark capturado, light focal sem captura). Assim, 55/55 casos tiveram PASS em runs concluídos, enquanto a invocação capturada integral reteve o exit1 e timeouts históricos; nenhum prazo, retry ou asserção foi relaxado.

**Performance do primeiro bundle:** separar `GikaPortrait` do módulo que contém todos os estados manteve rest inline no launcher e passou offline/listening/thinking/clarify/error ao painel lazy. Build antes/depois: 1,277.23→1,242.84 kB bruto; 415.47→390.21 kB gzip. O chunk lazy da Gika recebeu o PNG offline, aumentando de 55.15/14.82 kB para 90.15/40.72 kB bruto/comprimido. Lint, typecheck, build, 545 unitários, 2 E2E do launcher e focais Gika passaram. Nenhum asset/controller/contrato/servidor alterado.

Estado deste relatório: Glass implementado e validado com as execuções segmentadas acima; integração em `feat/gika-integration`, regressão absoluta após integração e RC/UAT ainda pendentes. `main` e produção não foram alteradas.
