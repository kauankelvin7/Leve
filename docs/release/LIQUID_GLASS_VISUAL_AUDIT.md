# Liquid Glass — auditoria visual e técnica, 04/10/2026

**Status: corrigido e validado localmente.** Branch `feat/gika-integration`, HEAD e origin `1c3561b5a99e1e71e9555dcec7f1973065088ee2`. O SHA identifica a base; as correções abaixo permanecem no worktree, sem commit/push. Alterações anteriores do soak foram preservadas. Nenhuma nova milestone, mudança de main ou deploy.

## Diagnóstico e correção

Glass está integrado: ancestralidade Liquid Glass confirmada, `main.tsx` importa o primitivo e o navegador calcula blur real. Não foi encontrada neutralização acidental pelo shell no modo padrão. A aparência quase sólida vinha dos tokens: 92% de opacidade no material comum e 97% no strong; fundos uniformes também tornam o blur menos visível. Sidebar desktop e Gika fullscreen mobile são sólidas deliberadamente, assim como os modos de acessibilidade.

Mudança de produto exclusivamente em `apps/web/src/styles/glass.css`:

- Material comum: 92% → 82%; strong: 97% → 88%, somente na melhoria `@supports`.
- Bloco de leitura do estado vazio do sheet do calendário recebe fundo sólido. O teste detectou contraste de 4,449:1 no link após a mudança de transparência; a correção elevou-o a 4,881:1. Falha original preservada em `.cache/glass-visual/supplement.log` e seus artefatos.
- Blur permanece 16/22/12px, cap de 24px; borda, sombra, saturação, layout, Character e lógica Gika intactos. Sem novos filtros ou blur aninhado.

Glass permanece restrito à Gika desktop, navegação móvel, dialogs de confirmação/recorrência, sheet móvel, dock e card elevado de autenticação. Calendário/grades, listas principais, formulários extensos, sidebar desktop, Gika fullscreen mobile, cards de ações e composer continuam sólidos. Nenhuma expansão para toolbars/segmented controls sem necessidade demonstrada.

Capturas before/after foram revisadas em 390/853/1366px, light/dark. Alphas computados: navegação móvel 0,922 → 0,820; Gika desktop 0,969 → 0,878. Overrides sólidos continuam com alpha 1 e filtro `none`.

## Validação e falhas preservadas

| Prova | Resultado |
| --- | --- |
| `npm run lint`, `npm run typecheck`, `npm run build` | PASS; warning de chunk >500kB preservado |
| `npm run glass:selftest`, `GLASS_COMPLETE=1 npm run glass:check` | PASS, zero erros estáticos; guardas nativas preservadas |
| `glass-material.spec.ts` | 20/20 PASS: mobile/desktop/853, light/dark, Gika welcome/chat, calendário sólido, preferências, fallback, texto 200% |
| Suplemento final | 4/4 PASS: sheet móvel e prova forced-colors, light/dark |
| Harness existente, cenários fora dos modos de acessibilidade | 22/22 PASS: seis públicos, quatro fases 853, seis timer/confirmation e seis recurrence |
| Acessibilidade oficial após correção do harness | 10/10 fases PASS; 55 inspeções, zero erros, overflow ou violações Axe |

A rodada oficial original terminou **24 PASS / 3 FAIL**, não é registrada como invocação verde: solid esgotou 60s restaurando a preferência, com navegação fixa interceptando o clique; forced-colors esgotou o orçamento serial de medições; high-contrast também excedeu o prazo monolítico. Log e traces preservados. SHA-256 de `official.log`: `e30f5a03e299875282abff3971547d4ec7ec3711d6eed489c95f9eec97aa2966`.

Correção exclusivamente do harness: acessibilidade em duas fases seriais na mesma página/contexto, mantendo ordem e todas as 11 rotas por modo; scroll central explícito antes do clique normal de preferência, sem force click ou alteração do checkbox por DOM. Assertions, tags Axe, limiares e configuração 60.000ms/expect 10.000ms/retries 0 permanecem. Hash do arquivo atualizado mecanicamente em `HARNESS_LOCK.json`. A reexecução focal concluiu as dez fases e a restauração de preferências.

A tentativa inicial do teste novo também preserva os erros de preparação (seleção de teste, propriedade WebKit não exposta pelo Chromium e calendário diário em vez de mensal). Corrigidos no teste; nenhum gate existente foi relaxado. Em forced-colors, o medidor geral continua retornando `UNMEASURED/FORCED_TEXT_CONTROL` para o textarea nativo. A prova independente exige compositing suportado, cores opacas do sistema, correspondência nos pixels reais do controle e contraste ≥4,5:1 para placeholder e valor. Resultados: cerca de 14:1 e 21:1, respectivamente; não converte o resultado desconhecido do medidor em PASS.

Evidência sanitizada e artefatos sintéticos locais: `.cache/glass-visual/`, incluindo `validation-summary.json`, relatórios Playwright separados, timings e capturas. A comparação before/after e os dialogs foram revisados visualmente. Validação em Chromium/emuladores; fallback sem suporte exercitado retirando apenas a melhoria `@supports`, sem alegar teste em engine antigo. Declarações standard/WebKit pareadas verificadas estaticamente; aparelho real/Safari não foram executados. Produção, Firebase/Vercel/DNS, dependências e lógica de domínio não foram alterados.
