# Liquid Glass — checkpoint bloqueado

Status: `BLOCKED_FORCED_COLORS_VERIFICATION`. Não é aprovação de Glass nem RC.

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
