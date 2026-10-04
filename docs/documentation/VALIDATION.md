# Revisões e validação documental

Este registro preserva os resultados dos checkpoints de documentação. Os resultados abaixo não representam um parecer final de D4.

| Etapa | Revisão | Resolução registrada |
|---|---|---|
| D1 | REJECT inicial: o inventário inferiu ausência de `LICENSE` e screenshots após busca limitada a Markdown; deixou de identificar `LICENSE` MIT e nove PNGs versionados, e descreveu `docs/evidence/README.md` sem conferir todos os artefatos. | Corrigidos após auditoria da árvore Git e registro explícito das cinco imagens em `docs/evidence/` e quatro em `docs/screenshots/`. D1 PASS após commit `37a731bef` (correção factual do inventário). |
| D3 | REJECT inicial: regra de leitura própria `memberships/{uid}`, rotas públicas e HMAC do tick, fronteira do Worker e limites de consulta da recorrência Gika estavam generalizados incorretamente. | Corrigidos contra Rules e arquivos de runtime; D3 PASS após commit `210f178a` e a atualização subsequente de autorização/agendamento em D3. |
| D4 | REJECT Astra FINAL completo: único P2 — o quickstart de `README.md` lista Node.js/npm, mas omite Java 21, necessário porque `npm run dev` inicia o emulador Firestore. | Acrescentado Java 21 aos pré-requisitos do quickstart nesta correção. Revisão Astra FINAL curta pendente; não inferir PASS antes do parecer. |
| D4 local | Validação documental após a correção P2. | `npm run docs:check` verifica links locais, âncoras em Markdown e referências `npm run` fora de registros históricos, inclusive em código inline. Fixtures temporárias confirmaram falha para destino ausente e âncora inexistente em caminho arquivado, e para script inválido em documentação vigente. `git diff --check` sem erros. |

## Limites do checker

O checker usa Node.js padrão e não instala dependências. Ele não interpreta toda a gramática Markdown: links de referência, destinos externos, âncoras de arquivos não Markdown e HTML complexo não são verificados. Links locais e âncoras em Markdown continuam verificados nos registros históricos. Relatórios antigos preservam comandos executados à época mesmo quando o script já não existe no `package.json`; por isso a validação de scripts não os reinterpreta como instruções atuais. Revise esses registros no contexto do seu commit e data.

## Arquivamento D4

Após o snapshot D1, três registros foram movidos para `docs/archive/legacy/`: `docs/EXECUCAO.md`, `docs/RETOMADA-2026-09-11-edicao-persistente.md` e `docs/REFINAMENTO-APLICABILIDADE.md`. Stubs nos caminhos anteriores apontam às cópias canônicas; o inventário D1 permanece como snapshot da base e não foi recontado.
