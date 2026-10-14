# Revisão de PRs e branches — 14/10/2026

Esta revisão consultou o GitHub em 14/10/2026 e comparou as branches com `main`
em `c7a3de4`. Os estados abaixo são uma fotografia daquela data; antes de
integrar qualquer PR, confira o HEAD e os checks atuais no GitHub.

## Pull requests abertos

| PR | Mudança | Checks observados | Decisão |
|---|---|---|---|
| [#49](https://github.com/kauankelvin7/Leve/pull/49) | GOAL #01 | CI, CodeQL, Planner E2E, Seasonal E2E e Vercel aprovados | Manter aberto até revisão independente pós-correção. |
| [#48](https://github.com/kauankelvin7/Leve/pull/48) | `actions/setup-node` 7.0.0 → 7.1.0 | CI, CodeQL, Planner E2E, Seasonal E2E e Vercel aprovados | Candidato a merge após revisão e autorização para o efeito em produção. |
| [#47](https://github.com/kauankelvin7/Leve/pull/47) | `actions/upload-artifact` 7.0.1 → 7.0.2 | CI, CodeQL e Vercel aprovados | Candidato a merge após revisão e autorização para o efeito em produção. |
| [#46](https://github.com/kauankelvin7/Leve/pull/46) | CodeQL `analyze` 4.38.2 → 4.38.3 | CI e Vercel aprovados; CodeQL falhou | Não integrar até entender e corrigir a falha de CodeQL. |
| [#45](https://github.com/kauankelvin7/Leve/pull/45) | CodeQL `init` 4.38.2 → 4.38.3 | CI e Vercel aprovados; CodeQL falhou | Não integrar até entender e corrigir a falha de CodeQL. |
| [#44](https://github.com/kauankelvin7/Leve/pull/44) | `@firebase/rules-unit-testing` 5.0.2 → 6.0.0 | CodeQL aprovado; `npm ci` falhou no CI e Vercel falhou | Corrigir a instalação e repetir os checks antes de reavaliar. |
| [#43](https://github.com/kauankelvin7/Leve/pull/43) | Express 5.2.1 → 5.3.0 | CI, CodeQL e Vercel aprovados | Candidato a merge após revisão e autorização para o efeito em produção. |
| [#42](https://github.com/kauankelvin7/Leve/pull/42) | Zod 4.6.2 → 4.6.5 | CI, CodeQL e Vercel aprovados | Candidato a merge após revisão e autorização para o efeito em produção. |
| [#41](https://github.com/kauankelvin7/Leve/pull/41) | `@dicebear/core` 9.4.3 → 10.7.0 | CodeQL aprovado; `npm ci` falhou no CI e Vercel falhou | Corrigir a instalação e repetir os checks antes de reavaliar. |
| [#40](https://github.com/kauankelvin7/Leve/pull/40) | `eslint-plugin-react-hooks` 6.1.1 → 7.1.1 | CI, CodeQL e Vercel aprovados | Candidato a merge após revisão e autorização para o efeito em produção. |

Não houve merge. A configuração do projeto pode iniciar deployment de produção
quando uma mudança chega a `main`; por isso, checks verdes por si só não
autorizam essa etapa. O PR #49 também não tem aprovação independente depois das
correções. Nenhuma configuração de produção foi alterada nesta revisão.

## Branches remotas

| Branch | Estado observado | Decisão |
|---|---|---|
| `main` | Base consultada em `c7a3de4` | Preservar. |
| `goal/01-confiabilidade-privacidade` | HEAD do PR #49 | Preservar até encerrar a revisão e decidir o merge. |
| Nove branches `dependabot/*` | Cada uma corresponde aos PRs #40–#48 | Preservar enquanto os PRs estiverem abertos. |
| `design/gika-character-foundation` | Seis commits à frente de `main`, com documentos de personagem ainda ausentes | Preservar; contém trabalho exclusivo. |
| `docs/technical-documentation-v2` | Dez commits à frente, com material documental ainda ausente | Preservar; contém trabalho exclusivo. |
| `feat/responsive-shell-v2` | Nove commits à frente, com CSS e E2E responsivos ainda ausentes | Preservar; contém trabalho exclusivo. |
| `video/product-film` | PR #34 foi integrado, mas o HEAD `60171f6` contém `509d546` (V3) e `60171f6` (revert). O conteúdo de `video/` coincide com `main`; a história diverge. | Não removida. A revisão automática bloqueou a exclusão por haver commits fora da história de `main`; não foi usada outra via para apagar a branch. |

Também há um checkout local de `main` com alterações do usuário sem commit,
incluindo documentação, workflow, configuração de runtime e arquivos de vídeo.
Esse trabalho não foi modificado nem incluído no PR #49.

## Próximos passos

1. Revisar o HEAD atual do PR #49 por outro mantenedor e tratar qualquer achado.
2. Investigar as falhas de CI/CodeQL nos PRs #41, #44, #45 e #46.
3. Revisar os PRs #40, #42, #43, #47 e #48; confirmar autorização para o
   deployment que pode acompanhar o merge em `main`.
4. Decidir com o responsável pelo repositório se a história `V3` seguida de
   revert em `video/product-film` deve ser preservada ou pode ser descartada.
   Até essa decisão, mantenha a branch.
5. Antes de qualquer release do GOAL #01, executar os testes externos listados
   em [`RELATORIO_FINAL.md`](RELATORIO_FINAL.md). Esses passos não foram feitos
   nesta revisão.
