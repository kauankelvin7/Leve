# Revisão de PRs e branches — 14/10/2026

## Escopo e fonte

Consulta ao GitHub em 14/10/2026. `main` está em `c7a3de4d2c75e1be3b8f0439adeef6578805f14f`; o código do GOAL foi revisado no commit `34098ca1a8d619dba8b1ac57bca09127f9a11981` e os documentos no HEAD `544fd6df9407620803f5d43c8660e7c17b03d015`. CI, CodeQL, Planner E2E, Seasonal E2E e Vercel passaram no HEAD 544; `docs:check` validou 175 arquivos Markdown e o audit de produção encontrou zero vulnerabilidades.

O PR #49 está aberto e mergeable, mas a revisão independente encontrou dois P2: a remoção de uma pendência pode concorrer com um flush já iniciado, e a migração mantém um row legado de sessão sem opt-in novo. Não há aprovação de mantenedor; a única revisão registrada é automática (`COMMENTED`). Nenhum merge foi feito.

## Pull requests abertos

| PR | Mudança | Estado dos checks | Decisão |
|---|---|---|---|
| [#49](https://github.com/kauankelvin7/Leve/pull/49) | GOAL #01 | CI, CodeQL, Planner E2E, Seasonal E2E e Vercel passaram no HEAD 544 | Não integrar: corrigir corrida de cancelamento e cobrir em teste; resolver retenção legada de sessão; obter aprovação de mantenedor. |
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
| `goal/01-confiabilidade-privacidade` | HEAD documental `544fd6d`, PR #49; código em `34098ca` | Preservar até corrigir os achados independentes e concluir a revisão formal do PR. |
| Nove `dependabot/*` | Cada branch corresponde a um PR aberto (#40–#48). | Preservar enquanto os PRs estiverem abertos. |
| `design/gika-character-foundation` | 6 commits à frente e 121 atrás; seis documentos de personagem exclusivos. | Preservar; revisar/rebasear antes de propor integração. |
| `docs/technical-documentation-v2` | 10 commits à frente e 70 atrás; alterações extensas em documentação e instruções do repositório. | Preservar; revisar a migração documental e rebasear antes de integrar. |
| `feat/responsive-shell-v2` | 9 commits à frente e 167 atrás; CSS responsivo, workflow e E2E exclusivos. | Preservar; revisar/rebasear antes de propor integração. |
| `video/product-film` | HEAD `60171f6`; 4 commits à frente e 4 atrás. A comparação contém artefatos e fontes exclusivas do filme, além de histórico divergente. | Preservar. O controle automático bloqueou uma tentativa de exclusão; não foi usado outro caminho para apagar a referência. |

Não foi identificada branch segura para remoção. As branches Dependabot têm PR aberto; as três branches de produto/documentação contêm trabalho não integrado; a branch de vídeo mantém commits e arquivos exclusivos.

## Estado dos checkouts locais

No ambiente desta revisão, o checkout `Leve` em `main` tem alterações locais do usuário sem commit. O checkout `Leve-goal01` está em `c7a3de4` com arquivos do GOAL como alterações locais, diferente da branch remota do PR. Ambos foram preservados e não usados para publicar mudanças. O estado remoto do GitHub foi a fonte desta revisão.

## Próximos passos

1. Corrigir a concorrência entre flush e remoção confirmada da outbox; adicionar regressão determinística de duas abas.
2. Decidir e implementar a limpeza do cache de sessão legado na migração sem remover drafts ou comandos pendentes; registrar o comportamento no teste e na UI.
3. Publicar as correções no PR #49, repetir os gates afetados e conferir os checks do novo HEAD.
4. Obter aprovação formal de outro mantenedor antes de qualquer decisão de merge.
5. Atualizar `init` e `analyze` do CodeQL em conjunto e repetir o workflow; resolver as incompatibilidades de peer dependency em #41 e #44.
6. Revisar os diffs dos candidatos #40, #42, #43, #47 e #48 e as branches com trabalho exclusivo, sem integrar sem revisão e autorização para o deployment associado.
7. Antes de qualquer release do GOAL #01, cumprir as verificações externas e o smoke test não produtivo em [RELATORIO_FINAL.md](RELATORIO_FINAL.md). Nenhuma configuração externa foi alterada nesta revisão.
