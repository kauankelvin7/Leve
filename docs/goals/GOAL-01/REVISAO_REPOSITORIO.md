# Revisão de PRs e branches — 14/10/2026

## GOAL #01

O PR [#49](https://github.com/kauankelvin7/Leve/pull/49) foi integrado por squash na `main` (commit `1b51202`). O follow-up `1d7c8d1` resolveu os dois achados da revisão independente: corrida de descarte versus sincronização e retenção de sessão legada sem opt-in. Os quatro workflows do HEAD do PR passaram. Ver `IMPLEMENTACAO.md`, `REVISAO.md` e `TESTES.md`.

## Dependências e CI

| PR | Mudança | Situação em 14/10/2026 |
|---|---|---|
| #40 | eslint-plugin-react-hooks 7.1.1 | Integrado |
| #42 | zod 4.6.5 | Integrado |
| #43 | express 5.3.0 | Integrado |
| #47 | actions/upload-artifact 7.0.2 | Integrado |
| #48 | actions/setup-node 7.1.0 | Integrado |
| [#50](https://github.com/kauankelvin7/Leve/pull/50) | CodeQL init + analyze 4.38.3, versão idêntica | PR de atualização coordenada; conferir gates antes do merge |
| #45 e #46 | CodeQL 4.38.3, ações atualizadas separadamente | Substituídos pelo PR #50; não mesclar isoladamente |
| #41 | @dicebear/core 10.7.0 | Encerrado: avataaars 9.4.3 exige core ^9; o CI falhou em npm ci |
| #44 | @firebase/rules-unit-testing 6.0.0 | Encerrado: exige firebase ^13, projeto usa 12.19.0; o CI falhou em npm ci |

Os upgrades major bloqueados exigem atualização coordenada das dependências e validação específica, nunca `--force` ou `--legacy-peer-deps`. A integração dos PRs menores requer verificação dos workflows da `main` resultante; aprovação individual anterior não valida automaticamente o conjunto.

## Branches antigas

- `design/gika-character-foundation`: seis documentos exclusivos do personagem Gika, base antiga; preservar até decisão de produto.
- `docs/technical-documentation-v2`: oito arquivos exclusivos de inventário/arquivo documental; reavaliar em comparação com a documentação recuperada pelo PR #36.
- `feat/responsive-shell-v2`: CSS responsivo, E2E e workflow exclusivos; verificar compatibilidade com UI atual antes de transplantar.
- `video/product-film`: nenhum arquivo novo versus `main` na comparação direta, mas histórico divergente após integração do filme V2; confirmar necessidade antes de excluir.

Nenhuma dessas branches deve ser mesclada integralmente na `main` sem análise de regressões. O número de branches não justifica exclusão de conteúdo único.

## Antes de produção

O merge e a aprovação de CI não substituem as verificações de WAF, scheduler/HMAC, Rules/IAM Firebase, observabilidade, deploy e smoke test descritas em `RELATORIO_FINAL.md`. Nenhuma dessas verificações externas é certificada por este documento.
