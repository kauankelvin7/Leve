# Revisão de PRs e branches — 14/10/2026

## Escopo e fonte

Consulta ao GitHub em 14/10/2026. `main` está em `c7a3de4d2c75e1be3b8f0439adeef6578805f14f`; o código do GOAL foi revisado no commit `34098ca1a8d619dba8b1ac57bca09127f9a11981`. A branch recebeu depois uma atualização documental. No HEAD documental `b5f92f998728f930369be7fd21f6955bfbcb0a50`, CI, CodeQL, Planner E2E, Seasonal E2E e Vercel passaram. O `docs:check` validou 175 arquivos Markdown, e `npm audit --omit=dev --audit-level=moderate` encontrou zero vulnerabilidades. Consulte o PR para confirmar o SHA e os checks do HEAD atual antes de integrar.

O PR #49 está aberto e mergeable. Não há aprovação de mantenedor: a única revisão registrada é automática e está em `COMMENTED`. Nenhum merge foi feito.

## Pull requests abertos

| PR | Mudança | Estado dos checks | Decisão |
|---|---|---|---|
| [#49](https://github.com/kauankelvin7/Leve/pull/49) | GOAL #01 | CI, CodeQL, Planner E2E, Seasonal E2E e Vercel passaram | Aguardar revisão independente pós-correção. |
| [#48](https://github.com/kauankelvin7/Leve/pull/48) | `actions/setup-node` 7.0.0 → 7.1.0 | CI, CodeQL, Planner E2E, Seasonal E2E e Vercel passaram | Revisar o diff; só integrar com autorização para o efeito em `main`. |
| [#47](https://github.com/kauankelvin7/Leve/pull/47) | `actions/upload-artifact` 7.0.1 → 7.0.2 | CI, CodeQL e Vercel passaram | Revisar o diff; só integrar com autorização para o efeito em `main`. |
| [#46](https://github.com/kauankelvin7/Leve/pull/46) | CodeQL `analyze` 4.38.2 → 4.38.3 | CI e Vercel passaram; CodeQL falhou | Não integrar sozinho: o workflow usa `init@4.38.2` e `analyze@4.38.3`. Atualizar ambas na mesma mudança. |
| [#45](https://github.com/kauankelvin7/Leve/pull/45) | CodeQL `init` 4.38.2 → 4.38.3 | CI e Vercel passaram; CodeQL falhou | Não integrar sozinho: o workflow usa `init@4.38.3` e `analyze@4.38.2`. Atualizar ambas na mesma mudança. |
| [#44](https://github.com/kauankelvin7/Leve/pull/44) | `@firebase/rules-unit-testing` 5.0.2 → 6.0.0 | CodeQL passou; CI e Vercel falharam | `npm ci` detecta peer incompatível: v6 exige `firebase@^13`, mas a aplicação usa 12.19.0. Resolver o alinhamento antes de reavaliar. |
| [#43](https://github.com/kauankelvin7/Leve/pull/43) | Express 5.2.1 → 5.3.0 | CI, CodeQL e Vercel passaram | Revisar o diff; só integrar com autorização para o efeito em `main`. |
| [#42](https://github.com/kauankelvin7/Leve/pull/42) | Zod 4.6.2 → 4.6.5 | CI, CodeQL e Vercel passaram | Revisar o diff; só integrar com autorização para o efeito em `main`. |
| [#41](https://github.com/kauankelvin7/Leve/pull/41) | `@dicebear/core` 9.4.3 → 10.7.0 | CodeQL passou; CI e Vercel falharam | `npm ci` detecta peer incompatível: `@dicebear/avataaars@9.4.3` exige `core@^9`. Fazer upgrade coordenado ou manter a versão compatível. |
| [#40](https://github.com/kauankelvin7/Leve/pull/40) | `eslint-plugin-react-hooks` 6.1.1 → 7.1.1 | CI, CodeQL e Vercel passaram | Revisar o diff; só integrar com autorização para o efeito em `main`. |

Os PRs #40, #42, #43, #47 e #48 são candidatos a revisão, não aprovações de merge. Os checks verdes atestam os workflows listados; não substituem inspeção do diff nem autorização operacional. A integração em `main` pode iniciar um deployment Vercel. Os PRs #41, #44, #45 e #46 não devem ser integrados no estado atual.

## Branches remotas

O inventário do GitHub contém 15 branches:

| Branch | Comparação com `main` / conteúdo exclusivo | Decisão |
|---|---|---|
| `main` | HEAD `c7a3de4` | Preservar. |
| `goal/01-confiabilidade-privacidade` | HEAD `34098ca`, PR #49 | Preservar até revisão independente e decisão do PR. |
| Nove `dependabot/*` | Cada branch corresponde a um PR aberto (#40–#48). | Preservar enquanto os PRs estiverem abertos. |
| `design/gika-character-foundation` | 6 commits à frente e 121 atrás; seis documentos de personagem exclusivos. | Preservar; revisar/rebasear antes de propor integração. |
| `docs/technical-documentation-v2` | 10 commits à frente e 70 atrás; alterações extensas em documentação e instruções do repositório. | Preservar; revisar a migração documental e rebasear antes de integrar. |
| `feat/responsive-shell-v2` | 9 commits à frente e 167 atrás; CSS responsivo, workflow e E2E exclusivos. | Preservar; revisar/rebasear antes de propor integração. |
| `video/product-film` | HEAD `60171f6`; 4 commits à frente e 4 atrás. A comparação contém artefatos e fontes exclusivas do filme, além de histórico divergente. | Preservar. O controle automático bloqueou uma tentativa de exclusão; não foi usado outro caminho para apagar a referência. |

Não foi identificada branch segura para remoção. As branches Dependabot têm PR aberto; as três branches de produto/documentação contêm trabalho não integrado; a branch de vídeo mantém commits e arquivos exclusivos.

## Estado dos checkouts locais

No ambiente desta revisão, o checkout `Leve` em `main` tem alterações locais do usuário sem commit. O checkout `Leve-goal01` está em `c7a3de4` com arquivos do GOAL como alterações locais, diferente da branch remota do PR. Ambos foram preservados e não usados para publicar mudanças. O estado remoto do GitHub foi a fonte desta revisão.

## Próximos passos

1. Solicitar revisão independente de outro mantenedor sobre o HEAD mais recente do PR #49; corrigir qualquer achado antes de decidir o merge.
2. Atualizar `init` e `analyze` do CodeQL em conjunto e repetir o workflow.
3. Resolver as incompatibilidades de peer dependency dos PRs #41 e #44, depois repetir `npm ci` e os gates completos.
4. Revisar os diffs dos candidatos #40, #42, #43, #47 e #48. Confirmar autorização para qualquer deployment associado antes de integrar em `main`.
5. Analisar as três branches de trabalho exclusivo contra a `main` atual e decidir se serão rebaseadas, transformadas em PR ou preservadas.
6. Antes de qualquer release do GOAL #01, executar as verificações externas e o smoke test não produtivo descritos em [RELATORIO_FINAL.md](RELATORIO_FINAL.md). Nenhuma configuração externa foi alterada nesta revisão.
