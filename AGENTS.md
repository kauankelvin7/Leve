# Leve - instrucoes para agentes

## Fontes de verdade

Antes de qualquer implementacao, alteracao de arquivo, execucao de fluxo externo ou decisao de escopo, leia os Markdown da raiz que existirem, nesta ordem:

1. `CONTINUAR.md`
2. `README.md`
3. `05-capacidade-e-revisao.md`

Se houver divergencia, a ordem de prioridade e: pedido mais recente do usuario, `CONTINUAR.md`, requisitos de produto/arquitetura, documentacao historica. Nao use `docs/EXECUCAO.md` como status atual principal; ele registra a fundacao E00/E01.

## Estado atual

- O objetivo nao e uma demo: o Leve deve virar um sistema completo, persistente e verificavel.
- A demo em `/demo` e somente referencia historica.
- A autenticacao esta concluida e validada com emuladores.
- O proximo bloco de trabalho e edicao persistente de atividades, listas e itens com conflitos visiveis.
- Depois seguem ciclo/modelo de compras, lixeira de itens, exportacao/importacao/exclusao de conta, recorrencia, outbox/PWA e push.

## Regras de produto e arquitetura

- Preserve a stack atual: React, TypeScript, Vite, Firebase Auth/Firestore e API Express.
- Mutacoes de dominio passam por `POST /api/commands` com Firebase ID token; nao crie escrita direta do cliente nas colecoes de dominio.
- Dados sao privados por `uid`, membership e regras explicitas.
- Use `operationId`, `entityId` estavel e `expectedRevision` quando houver concorrencia.
- Nao aceite last-write-wins silencioso; conflitos devem preservar conteudo digitado.
- Separe data civil, horario local, fuso IANA e instante UTC.
- Nao substitua backend real por `localStorage` e declare funcionalidade pronta.

## Custo, contas e producao

- Custo obrigatorio: R$ 0 de infraestrutura.
- Nao ative billing, trials pagos, dominios comprados, planos Pro/Paid ou recursos pagos.
- Use emuladores e dados ficticios para testes locais.
- Nao crie usuarios reais apenas para inferir configuracao.
- Nao publique preview/producao, conecte credenciais administrativas ou altere audiencia sem autorizacao concreta do usuario.
- Push so pode ser declarado pronto com worker, servidor, permissao e prova em aparelho suportado.

## Design

- Preserve a identidade Vidro & Papel: DM Sans na interface, Instrument Serif em marca/titulos, tons pasteis, texto escuro e vidro fosco apenas como suporte.
- Evite frases motivacionais, gamificacao, onboarding longo, paineis enormes, gradientes animados e decoracao sem funcao.
- Garanta foco, teclado, safe area, leitura a 200%, responsividade mobile e modo solido.
- Cor informativa sempre precisa de nome/estado equivalente.

## Validacao

- Rode a menor prova suficiente para o risco da alteracao.
- Preferir, conforme o escopo: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:integration`, `npm run test:e2e:local` e `npm run check`.
- No ambiente Codex/Windows, falhas `spawn EPERM` podem ser sandbox, nao falha do codigo; se um comando essencial falhar por sandbox, solicite permissao adequada.
- Nao declare testes, URLs, evidencias, push ou servicos reais como aprovados sem execucao verdadeira.
- Atualize documentacao, evidencias e pendencias quando uma etapa for realmente concluida.

## Skills

- Skills instaladas globalmente devem ser usadas automaticamente quando o pedido do usuario casar com a descricao da skill.
- Se o usuario pedir para "grill", "grillar", "me questione", "stress-test", "critique meu plano" ou equivalente, use a skill `grilling` antes de propor implementacao.
- Se o usuario pedir para criar ou ajustar uma skill, use `skill-creator`.
- Se o usuario pedir para instalar skills, use `skill-installer`.
- Use a skill `humanizer-br` em todo texto exibido ao usuario: copias, rotulos, dicas, estados vazios, mensagens de erro e demais textos da interface. Leia o `SKILL.md` completo antes de criar ou revisar esses textos. Escreva de forma conversacional, acolhedora e direta. Nao exponha jargao tecnico, nao use rotulos em caixa alta e preserve fatos, codigo, comandos, caminhos, dados e requisitos tecnicos.
- Se o usuario pedir para criar imagens raster, use `imagegen`; para documentos, PDFs, apresentacoes, sites ou planilhas, use a skill correspondente quando aplicavel.
- Ao usar uma skill, leia o `SKILL.md` completo antes de agir e siga suas instrucoes.

## Trabalho no repositorio

- Preserve alteracoes existentes do usuario; nao reverta arquivos sem pedido explicito.
- Use `apply_patch` para edicoes manuais.
- Nao faca `git commit`, branch, reset ou checkout destrutivo sem pedido explicito.
- Use `rg` para buscar texto/arquivos quando disponivel.
- Corrija a causa raiz no modulo dono do comportamento, evitando atalhos que aumentem a complexidade.

## Preferencia de resposta

- Antes de responder ao conteudo principal de qualquer pedido, informe o agente/modelo mais apropriado e o nivel de inteligencia/raciocinio recomendado para a tarefa.
- Use o formato: `Agente recomendado: <modelo/agente>; forca: <baixo|medio|alto|maximo>.`
- Ajuste a recomendacao a cada requisicao. Tarefas simples podem usar GPT-5.5 com forca baixa; implementacoes moderadas podem usar GPT-5.5 com forca media; arquitetura, seguranca, dados e depuracao complexa pedem forca alta; decisoes criticas, investigacoes amplas ou comparacoes entre caminhos podem pedir Astra ou o melhor agente disponivel com forca maxima.
- Essa recomendacao deve aparecer antes de iniciar a tarefa, inclusive antes de planos, comandos ou explicacoes longas.
