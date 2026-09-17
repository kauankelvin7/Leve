# Leve - instrucoes para agentes

## Fontes de verdade

Antes de qualquer implementacao, alteracao de arquivo, execucao de fluxo externo ou decisao de escopo, leia os Markdown relevantes nesta ordem:

1. `CONTINUAR.md`
2. `docs/PLANO-EXPERIENCIA-CALENDARIO-NOTAS-SAZONAL.md`
3. `docs/AGENT-SETUP.md`, quando a tarefa envolver Codex, plugins ou skills
4. `README.md`
5. `05-capacidade-e-revisao.md`

Se houver divergencia, a ordem de prioridade e: pedido mais recente do usuario, `CONTINUAR.md`, plano tecnico vigente, requisitos de produto/arquitetura e documentacao historica. Nao use `docs/EXECUCAO.md` como status atual principal; ele registra a fundacao E00/E01.

## Estado atual

- O Leve e um sistema persistente, autenticado, PWA e verificavel; `/demo` e apenas referencia historica.
- Mutacoes de dominio passam pela API de comandos com revisoes, idempotencia e conflitos explicitos.
- O modo offline e opt-in e usa cache privado + outbox; nao criar caminhos paralelos de persistencia.
- Notas possuem presets extensveis com identidades light/dark.
- O calendario possui Mês/Semana/Dia sobre `calendarModel` + `useCalendarRange`, com time grid proprio, tarefas e all-day separados, overlap, linha de horario atual, criacao por intervalo, move e resize com snap de 15 minutos.
- Mutacoes do Planner continuam em `POST /api/commands`, usam `expectedRevision`, respeitam a outbox e perguntam o escopo antes de alterar recorrencia futura.
- O renderer de calendario foi decidido em `docs/adr/002-calendar-renderer.md`; nao adicionar biblioteca de calendario sem nova necessidade e revisao da ADR.
- Existe um gate E2E focal do Planner com Auth/Firestore Emulator, Axe, viewports, recorrencia, conflito e offline.
- O motor sazonal puro ja resolve Natal, Ano-Novo, Pascoa, Festa Junina e Halloween, mas a experiencia visual e a preferencia de perfil ainda nao devem ser consideradas prontas.
- O proximo bloco planejado de produto e a experiencia sazonal opcional; antes de implementa-la, revisar schema/defaults/export/import e manter `prefers-reduced-motion` como regra superior.

## Regras de produto e arquitetura

- Preserve a stack atual: React, TypeScript, Vite, Firebase Auth/Firestore e API Express.
- Mutacoes de dominio passam por `POST /api/commands` com Firebase ID token; nao crie escrita direta do cliente nas colecoes de dominio.
- Dados sao privados por `uid`, membership e regras explicitas.
- Consultas Firestore de lista do cliente devem permanecer limitadas ao maximo aceito pelas Rules (`<= 50`).
- Use `operationId`, `entityId` estavel e `expectedRevision` quando houver concorrencia.
- Nao aceite last-write-wins silencioso; conflitos devem preservar conteudo digitado e intencao do usuario.
- Separe data civil, horario local, fuso IANA e instante UTC.
- Nao substitua backend real por `localStorage` e declare funcionalidade pronta.
- Nao registre conteudo de documentos, tokens, credenciais, URLs de SDK com dados sensiveis ou payloads privados em diagnosticos/logs.
- Bibliotecas de UI podem ser renderers, nunca fonte de verdade de dominio, autenticacao, recorrencia, revisao ou persistencia.

## Custo, contas e producao

- Custo obrigatorio: R$ 0 de infraestrutura enquanto o produto permanecer neste estagio.
- Nao ative billing, trials pagos, dominios comprados, planos Pro/Paid ou recursos pagos sem pedido explicito.
- Use emuladores e dados ficticios para testes locais.
- Nao crie usuarios reais apenas para inferir configuracao.
- Nao publique preview/producao, conecte credenciais administrativas ou altere audiencia sem autorizacao concreta do usuario.
- Push so pode ser declarado pronto com worker, servidor, permissao e prova em aparelho suportado.

## Design e UX

- Preserve a identidade atual do Leve: Nunito e DM Sans, papel/vidro como suporte, tons suaves, boa hierarquia e baixa distracao.
- Nao reintroduza Instrument Serif: ela foi removida do produto.
- Evite frases motivacionais, gamificacao, onboarding longo, paineis enormes, gradientes animados e decoracao sem funcao.
- Experiencias sazonais devem ser sutis, opcionais e nunca bloquear interacao.
- Garanta foco, teclado, safe area, leitura a 200%, responsividade mobile, modo solido e `prefers-reduced-motion`.
- Cor informativa sempre precisa de nome/estado equivalente.
- Drag, swipe ou gestos nunca podem ser o unico caminho para uma acao importante.

## Validacao

- Rode a menor prova suficiente para o risco da alteracao e aumente a cobertura quando o risco tocar dados, autenticacao, Rules, PWA ou concorrencia.
- Preferir, conforme o escopo: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:integration`, `npm run test:e2e:local` e `npm run check`.
- Mudancas de Firestore Rules, autenticacao, comandos, importacao/exportacao ou isolamento por conta exigem teste de integracao com emuladores antes de serem consideradas prontas.
- No ambiente Codex/Windows, falhas `spawn EPERM` podem ser sandbox, nao falha do codigo; se um comando essencial falhar por sandbox, solicite permissao adequada.
- Nao declare testes, URLs, evidencias, push, deploys ou servicos reais como aprovados sem execucao verdadeira.
- Atualize documentacao, evidencias e pendencias quando uma etapa for realmente concluida.

## Skills e plugins

- Skills instaladas globalmente devem ser usadas automaticamente quando o pedido do usuario casar com a descricao da skill.
- O plugin oficial `Superpowers` do Codex e o fluxo preferido para tarefas de engenharia quando estiver instalado. Leia `docs/AGENT-SETUP.md` para setup e privacidade.
- As regras especificas deste repositorio prevalecem sobre workflows genericos do Superpowers. Em especial, nao crie worktree, branch, commit, merge ou PR automaticamente se o usuario nao tiver autorizado essa acao.
- Para novas funcionalidades: use brainstorming/planejamento antes de implementacao, TDD quando adequado e verificacao antes de declarar conclusao.
- Para bugs: use depuracao sistematica e investigue causa raiz antes de aplicar workaround.
- Para alteracoes relevantes: revise conformidade com a especificacao e qualidade do codigo antes de encerrar.
- Se o Superpowers nao estiver disponivel no harness atual, nao finja que executou uma skill; siga o processo equivalente manualmente e registre a limitacao quando material.
- Se o usuario pedir para "grill", "grillar", "me questione", "stress-test", "critique meu plano" ou equivalente, use a skill `grilling` antes de propor implementacao.
- Se o usuario pedir para criar ou ajustar uma skill, use `skill-creator`.
- Se o usuario pedir para instalar skills/plugins, use o mecanismo oficial do harness; nao copie codigo externo para o repositorio apenas para simular uma instalacao global.
- Use a skill `humanizer-br` em todo texto exibido ao usuario: copias, rotulos, dicas, estados vazios, mensagens de erro e demais textos da interface. Leia o `SKILL.md` completo antes de criar ou revisar esses textos. Escreva de forma conversacional, acolhedora e direta. Nao exponha jargao tecnico, nao use rotulos em caixa alta e preserve fatos, codigo, comandos, caminhos, dados e requisitos tecnicos.
- Se o usuario pedir para criar imagens raster, use `imagegen`; para documentos, PDFs, apresentacoes, sites ou planilhas, use a skill correspondente quando aplicavel.
- Ao usar uma skill, leia o `SKILL.md` completo antes de agir e siga suas instrucoes.

## Trabalho no repositorio

- Preserve alteracoes existentes do usuario; nao reverta arquivos sem pedido explicito.
- Prefira mudancas pequenas, reversiveis e com causa raiz clara.
- Nao faca reset, checkout destrutivo, rebase forcado ou force-push.
- Branches, worktrees e PRs so entram quando melhorarem de fato o fluxo e estiverem autorizados.
- Use `rg` para buscar texto/arquivos quando disponivel.
- Corrija a causa raiz no modulo dono do comportamento, evitando atalhos que aumentem a complexidade.
- Dependencias novas exigem revisao de licenca, manutencao, bundle, privacidade e necessidade real antes de entrar no `package.json`.

## Preferencia de resposta

- Antes de responder ao conteudo principal de qualquer pedido, informe o agente/modelo mais apropriado e o nivel de inteligencia/raciocinio recomendado para a tarefa.
- Use o formato: `Agente recomendado: <modelo/agente>; forca: <baixo|medio|alto|maximo>.`
- Ajuste a recomendacao a cada requisicao. Tarefas simples podem usar um agente rapido com forca baixa; implementacoes moderadas pedem forca media; arquitetura, seguranca, dados e depuracao complexa pedem forca alta; investigacoes amplas ou decisoes criticas podem pedir o melhor agente disponivel com forca maxima.
- Essa recomendacao deve aparecer antes de iniciar a tarefa, inclusive antes de planos, comandos ou explicacoes longas.
