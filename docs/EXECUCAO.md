# Execução E00/E01 — 11/09/2026

> Registro histórico da fundação. Depois desta verificação, o usuário solicitou o sistema completo e o desenvolvimento de E02/E03 começou. Foi pausado a pedido dele, antes de integrar/testar essas adições. Estado atual e ponto exato: `../CONTINUAR.md`.

## Escopo e auditoria

O plano histórico de execução determinava começar por E00/E01, entregar base verificável e planejar E02, sem implementar tudo de uma vez. Este é o limite registrado nesta documentação histórica.

| Encontrado inicialmente | Resultado da auditoria |
|---|---|
| Relatórios e prompts históricos | Consultados na fundação; não fazem parte do fluxo operacional atual |
| `05-capacidade-e-revisao.md` | Restrições de custo, capacidade e gates preservados |
| `.qodo/` | Configuração preexistente, não alterada |
| Documentos separados 01–04 | Ausentes; conteúdo correspondente no consolidado |
| `referencia-prototipo/`, `design-tokens.json` | Ausentes; tokens reconstruídos, protótipo não inventado |
| Aplicativo / dependências / testes | Ausentes; fundação criada nesta execução |
| AGENTS.md no projeto | Nenhum encontrado |
| Git | Raiz resolvida fora do projeto, em `C:/Users/Kauan`; nenhuma alteração Git feita |

As alegações de auditoria do protótipo no relatório são históricas. Não foi possível conferir os hashes ou comparar capturas com os quatro arquivos ausentes.

## Etapas e estado real

| Etapa | Entrega | Estado |
|---|---|---|
| E00 | Descoberta, ADRs, cotas, prova gratuita | Auditoria/decisão/cotas documentadas; feedback real, planos das contas e integração pendentes |
| E01 | React/TS, tokens, shell, rotas e demo | Base local implementada e verificada; comparação com original e homologação pendentes |
| E02 | Identidade, convite, perfil, API e autorização | Próxima etapa, plano abaixo |
| E03 | Agenda e categorias persistentes | Não iniciada |
| E04 | Notas, editor e rascunhos | Não iniciada |
| E05 | Compras, modelos e ciclos | Não iniciada |
| E06 | Lixeira, exportação/importação e exclusão | Não iniciada |
| E07 | Recorrência | Não iniciada |
| E08 | Offline/PWA e conflitos | Não iniciada |
| E09 | Push, tick e reconciliação | Não iniciada |
| E10 | Busca, acessibilidade completa, carga e operação | Não iniciada |
| E11 | Homologação e release | Não iniciada |

## Contratos implementados

- `/demo/*`: fixtures exclusivamente em memória, sem serviço de dados. São exemplos, não contratos de entidade persistente. Saída/reload descarta estado; compras também reiniciam ao desmontar sua tela.
- Rotas de conta: estado de acesso indisponível em `/entrar`; nenhum login simulado ou usuário fixo real.
- `dia`: string civil ISO válida; entrada impossível usa hoje no fuso do navegador. `categoria`: allowlist dos quatro exemplos; desconhecida equivale a todas. Histórico conserva query string.
- `DemoActivity`: ID, título, data civil, hora opcional, categoria e booleano demonstrativo. Não substitui Task/Event, revisions, ownership ou schemas da futura API.
- Formulário: título após trim, máximo 120, data selecionada, horário opcional; validação nativa, foco inicial, Escape e retorno ao acionador. Texto renderizado por React, sem HTML arbitrário.
- Calendário: segunda-feira, navegação por setas/Home/End e alternativa em lista. Horários vazios ordenados após os preenchidos.
- Fontes/tokens: uma fonte JSON aplicada ao CSS; arquivos de fonte locais; preferência sólida em memória; reduz movimento/transparência do sistema respeitados.

## Verificação executada

Ambiente: Windows, Node 24.0.2, npm 11.19.1; dependências exatas em `package-lock.json`. React 19.3.0, Router 7.18.3, Vite 8.3.0, TypeScript 7.0.2, Vitest 5.0.0, Playwright 1.63.0. Chromium de teste 153.0.8010.12. `npm install` reportou zero vulnerabilidades na resolução; isso não equivale a auditoria completa de segurança.

| Comando / avaliação | Resultado observado |
|---|---|
| `npm run check` | Passou: typecheck + build + 3 testes unitários + 12 testes Playwright |
| Datas | Fuso na virada do dia, data inválida, ano bissexto, virada de ano e semana iniciando segunda |
| Navegador | Quatro destinos, refresh direto, histórico, parâmetros inválidos, isolamento da demo, texto tratado como texto, estado sem armazenamento persistente |
| Teclado | Foco inicial, Escape/retorno, setas do calendário |
| Responsividade | Meu dia sem overflow horizontal em 320, 360, 390, 768, 1024 e 1440 px |
| Axe | Sem violações nas tags avaliadas em cinco telas e no diálogo; não certifica WCAG completa |
| Revisão React | Hooks com limpeza de eventos/timer, atualizações funcionais, IDs estáveis, lazy da demo, componentes fora do render, ausência de HTML arbitrário |
| Bundle | JS inicial ~84,23 kB gzip; demo ~4,90 kB gzip; CSS ~3,01 kB gzip; fontes à parte |
| Navegador de revisão | Interface abriu no Vite; nenhum erro listado pelo agent-browser após navegação correta |

Primeira execução: 11/12 testes E2E passaram; o teste de navegação atingiu 30 segundos com o fallback de carregamento ainda visível. O reteste completo passou sem aumentar timeout ou habilitar retries. Não foi estabelecida causa definitiva para a demora inicial; monitorar em próximas execuções. A revisão acrescentou tratamento de falha de render/chunk e instrumentação de falhas de rede no teste. Não afirmar que isso comprova a causa do timeout.

O primeiro comando de Vite recebeu a porta como argumento posicional por interpretação do npm no PowerShell, produzindo 404. Reiniciar com `npm run dev` resolveu a execução local. Isso não explica qualquer 404 antigo de hospedagem.

## Rastreabilidade honesta

| Requisito / teste original | Evidência desta etapa | Limite |
|---|---|---|
| RF-28 / T-01 | Demo separada e rotas de conta sem fixtures | Criação de conta vazia ainda depende de E02 |
| RNF-11 / T-34 | TypeScript estrito, módulos, scripts e lockfile | Migrações, logs, backend e alertas ainda ausentes |
| RNF-03/04 / T-20/T-31 | Foco, teclado, modo sólido, Axe, seis larguras e fontes locais | Leitor de tela, zoom real 200%, teclado virtual, matriz de aparelhos e paleta personalizada pendentes |
| RF-07 / T-07/T-08 | Datas e seleção demonstrativas | Consultas, eventos, atrasados e recorrência não implementados |
| T-30 | Navegação e refresh contra preview local | Vercel, CSP real, 404 de assets/API, manifest e worker não homologados |
| RNF-16 / T-44 | Cotas oficiais reconferidas, nenhum recurso provisionado | Billing das contas, CPU e push real não verificados |

Nenhum T-01–T-45 completo é declarado aprovado por esta demo: os testes E01 verificam apenas os recortes indicados. T-02/03, T-05/06, T-09–19, T-21–29, T-32/33 e T-35–45 permanecem sem execução de seus fluxos reais; T-04 tem apenas validação local de título. G0–G5 não estão aprovados.

## Plano concreto de E02

1. Adicionar Firebase Auth/Firestore Emulator e API HTTP local. Usar IDs com prefixo `demo-` somente no emulador, sem credenciais de produção. Definir versões, portas e scripts reproduzíveis; verificar Java exigido pelo emulador escolhido.
2. Implementar Google/e-mail, verificação de e-mail, recuperação e sessão. Nome/fuso vêm do perfil real, não dos exemplos. Autenticação não concede membership automaticamente.
3. Criar schemas compartilhados em `packages/domain`: perfil, convite, membership, envelope de comando e erros. UID vem do token verificado; campos desconhecidos e alterações de accountState pelo cliente são rejeitados.
4. Implementar aceitação transacional de convite: hash do segredo, validade, e-mail opcional, uso único, último slot concorrente e retry idempotente. `serviceControls/global` inicia com uma vaga e admissões controladas.
5. Criar `POST /api/commands` e `GET /api/session`: verificar ID token/projeto/expiração, membership/accountState, tamanho, referências e limites. Recibo/hash e perfil são gravados atomicamente; reutilização divergente retorna 409.
6. Regras default deny com leitura explícita apenas das coleções necessárias; escrita direta e leitura de coleções internas negadas. Testar Rules e Admin SDK separadamente, pois o segundo ignora Rules.
7. Executar T-01–03 e T-36–38: A/B, anônimo, suspenso, deleting, convite vencido/repetido, e-mail divergente e concorrência da última vaga. Conta nova vazia; sair elimina estado da conta anterior.
8. Ensaiar a prova de staging de `runbooks/prova-gratuita.md` quando projetos/autorizações estiverem disponíveis. Revisar CSP/domínios e configuração de preview. Não conectar preview a dados pessoais ou produção.

Critério de saída: autenticação e perfil reais, autorização negativa comprovada, convites idempotentes, comandos com recibo e frontend incapaz de escrever diretamente no domínio. Só então conectar a agenda da E03.

## Pendências materiais

Protótipo original; sessão com Gih para confirmar aparelho/cores/compras; projetos de staging e evidência de planos gratuitos; autorização de publicação específica; testes reais de aparelho e serviços. A base local é utilizável para revisão, mas nenhuma dessas dependências foi inventada ou considerada satisfeita.
