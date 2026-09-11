# Leve — ponto exato de retomada

## Autenticação finalizada em 11/09/2026

A autenticação foi concluída antes desta pausa. `/entrar`, `/registrar` e `/recuperar` são rotas próprias. A interface diferencia entrada e criação de conta, pede nome, confirmação de senha e convite, permite mostrar/ocultar cada senha, mantém nome/convite durante a verificação do e-mail e apresenta mensagens específicas para credencial inválida, conta existente, provedor desabilitado, domínio não autorizado, pop-up bloqueado, excesso de tentativas e falha de rede. O login Google força seleção explícita da conta. A sessão agora usa a persistência local do Firebase e continua após fechar/reabrir o navegador até logout ou revogação. A API renova o ID token e repete uma única vez requisições recusadas com `401`, cobrindo a troca de claims após verificação sem criar loop de repetição.

O cadastro completo passou no Auth/Firestore Emulator pela própria interface: senhas divergentes foram bloqueadas antes da criação; a conta foi criada; o código OOB de verificação foi consumido; nome e convite foram preservados; a agenda foi ativada; a recuperação gerou um código `PASSWORD_RESET`; logout, novo login e reload mantiveram o comportamento esperado. A jornada persistente anterior também passou novamente. Resultado local: Playwright 2/2.

Uma consulta sanitizada e somente leitura pela sessão autenticada do Firebase CLI confirmou no projeto real `leve-db`: E-mail/Senha habilitado, senha obrigatória, Google habilitado e domínios autorizados `localhost`, `leve-db.firebaseapp.com` e `leve-db.web.app`. Nenhum usuário real foi criado. Quando existir uma URL própria de preview/produção, seu domínio exato ainda deverá ser incluído na lista antes do teste Google/e-mail nesse endereço.

Verificação final: TypeScript e build passaram; Vitest 3/3; integração Auth/Firestore 8/8; regressão Playwright 13/13; fluxo local de autenticação e persistência 2/2. A repetição final do fluxo local também reprova `console.error` do navegador e passou limpa enquanto os serviços estavam ativos. O seed agora aguarda Auth e Firestore ficarem disponíveis antes de preparar os dados. Evidências: `docs/evidence/auth-desktop-interativo.png`, `auth-registro-desktop.png` e `auth-mobile-estatico.png`. Bundle principal: aproximadamente 251,97 kB gzip; Three.js permanece em chunk dinâmico de aproximadamente 129,57 kB gzip, carregado somente no desktop elegível. Os serviços locais foram encerrados após os testes.

**Ponto exato para retomar:** autenticação concluída. Continuar pelo bloco de edição persistente de atividades, listas e itens com conflitos visíveis; depois ciclo/modelo de compras e lixeira de itens. Na sequência, exportação/importação/exclusão de conta, recorrência, outbox/PWA e push.

## Pausa solicitada em 11/09/2026 — etapa finalizada

Esta etapa foi encerrada com a tela de entrar/registro redesenhada e validada. A marca `leve.` ganhou destaque editorial; o painel recebeu acabamento em vidro; e o shader inspirado no código fornecido pelo usuário foi adaptado para `three@0.186.0`, empacotado localmente e carregado por importação dinâmica. O efeito acompanha o mouse somente em desktop com ponteiro preciso. Mobile, touch, preferência por movimento reduzido e falha de WebGL usam o fundo estático. A API obsoleta `THREE.Clock` foi removida e substituída por `performance.now()`, sem avisos do Three.js.

O usuário confirmou que o Firebase Authentication já foi criado no projeto `leve-db`; essa confirmação está registrada abaixo junto do Firestore já ativo. A validação real dos provedores e domínios autorizados fica para quando houver uma URL de preview, sem criar usuários reais apenas para testar configuração.

O próximo bloco funcional também foi iniciado: notas agora podem ser editadas de forma persistente usando `expectedRevision`; conflitos preservam o conteúdo digitado para reconciliação. A jornada local com Auth/Firestore Emulator confirmou criação, reload, edição e leitura do texto atualizado.

Verificação final desta pausa: `npm run build` passou; Vitest passou 3/3; Playwright passou 13/13, incluindo desktop interativo, mobile estático, responsividade de 320 a 1440 px e acessibilidade automatizada. As capturas estão em `docs/evidence/auth-desktop-interativo.png` e `docs/evidence/auth-mobile-estatico.png`. O Three.js ficou em um chunk dinâmico carregado somente na entrada desktop elegível; o bundle principal ficou em aproximadamente 250,75 kB gzip e o chunk do Three.js em aproximadamente 129,57 kB gzip. Os serviços locais foram encerrados.

**Ponto exato para retomar:** continuar o bloco de edição persistente implementando edição de atividades, listas e itens com conflitos visíveis; depois concluir ciclo/modelo de compras e lixeira de itens. Na sequência, executar exportação/importação/exclusão de conta. Recorrência, outbox/PWA e push permanecem pendentes e precisam de validações próprias.

## Infraestrutura confirmada pelo usuário em 11/09/2026

O usuário confirmou que o Firebase Authentication já foi criado no projeto `leve-db`, além do Firestore anteriormente ativado. O produto implementa login por e-mail/senha e Google, recuperação, verificação de e-mail, sessão, convite/membership e logout; esses fluxos passaram no Auth Emulator. Ainda falta um ensaio controlado dos provedores habilitados no ambiente real e das origens autorizadas depois que houver URL de preview. Não criar usuário real apenas para inferir configuração.

## Progresso visual em 11/09/2026, 16h30

A entrada/registro foi redesenhada com marca `leve.` em escala editorial, frase de apoio, painel de vidro e fundo em camadas. O shader de feedback fornecido pelo usuário foi adaptado para Three.js 0.186.0 empacotado localmente e carregado por import dinâmico; não depende do CDN antigo. O rastro responde ao ponteiro somente em desktop com mouse. Mobile, ponteiro touch, `prefers-reduced-motion` e falha de WebGL usam fundo estático. A limpeza encerra RAF, listeners, texturas, render targets, material e renderer sob desmontagem/StrictMode.

A primeira verificação encontrou `sample` como palavra reservada no GLSL atual; a variável foi renomeada e a repetição passou sem erros de console. Playwright: 13/13, com marca acima de 100 px no desktop, canvas visível somente no desktop, sem overflow mobile e capturas em `docs/evidence/auth-desktop-interativo.png` e `auth-mobile-estatico.png`.

O próximo bloco foi iniciado com edição persistente de notas por `expectedRevision`; em conflito, o texto do formulário permanece visível e a API devolve a mensagem de reconciliação.

A edição de notas foi validada no Chromium contra o Auth/Firestore Emulator: criar, recarregar, editar e confirmar o novo texto passou dentro da jornada persistente completa.

## Progresso contínuo em 11/09/2026, 16h

RF-05/RF-10/RF-23 avançaram e foram validados no Chromium contra Auth/Firestore Emulator. O formulário de `/hoje` cria tarefa ou compromisso com início/fim, descrição e categoria ativa; atividades podem ser enviadas à lixeira. `/configuracoes` agora salva nome, fuso, primeiro dia da semana e redução de transparência, além de criar e arquivar categorias. `/lixeira` agrega atividades, notas, listas e categorias removidas, mostra o prazo e restaura itens elegíveis.

O teste `tests/e2e-local/persistent.spec.ts` foi tornado repetível sem apagar dados: usa nomes únicos e não depende de um emulador vazio. A jornada passou incluindo persistência de atividade/calendário/nota/compras, perfil, categoria, compromisso, exclusão, restauração, reload e Axe. As três primeiras repetições desta ampliação encontraram somente ambiguidades/posicionamento de seletores do próprio teste; cada causa foi corrigida e a execução completa final passou.

Regressão do marco concluída: `npm run build` passou (bundle principal ~248,83 kB gzip), Vitest 3/3 e Playwright 12/12. Os serviços locais foram encerrados depois da verificação.

**Próximo bloco:** edição de atividades/notas/listas/itens com conflitos visíveis, ciclo/modelo de compras e lixeira de itens; depois exportação/importação/exclusão de conta. Recorrência, outbox/PWA e push continuam pendentes e exigem provas separadas.

## Atualização da retomada em 11/09/2026, 15h

O projeto Firebase real `leve-db` foi identificado e vinculado em `.firebaserc`. O Firestore `(default)` está ativo em `southamerica-east1`, modo Native, edição Standard com free tier e PITR desativado. O app Web existente foi configurado em `.env.local` (ignorado pelo Git; contém somente configuração pública do SDK). As Security Rules e o arquivo de índices foram publicados com sucesso no projeto. Não houve ativação de faturamento, deploy da aplicação ou criação de credencial administrativa.

E03–E05 avançaram: calendário mensal consulta tarefas e compromissos por intervalo; notas simples podem ser criadas, lidas após reload e enviadas à lixeira; compras permitem criar lista, abrir URL própria, adicionar item e alternar marcação. O Chromium validou o fluxo completo com emuladores, reload, Axe e ausência de erros. Evidência: `docs/evidence/e03-e05-conteudo-persistente.png`.

Verificações atuais: typecheck/build passaram; Vitest 3/3; integração Firebase 8/8; regressão Playwright 12/12; fluxo persistente ampliado 1/1. Bundle principal: ~247,79 kB gzip.

**Próximo ponto exato:** completar edição e lixeira/restauração pela UI, categorias e compromissos, editor limitado com conflitos, ciclos de compras, export/import/exclusão de conta, recorrência, outbox/PWA e scheduler/FCM. Verificar e habilitar explicitamente os provedores Firebase Auth antes de qualquer preview real; preparar credencial da API somente no ambiente de hospedagem, nunca no repositório.

## Atualização da retomada em 11/09/2026, 14h

A retomada avançou pelos itens 2–6 do plano abaixo. O backend E02/E03 compila; foram corrigidos e-mail verificado na atualização de perfil, comparação canônica determinística, e-mail de convite sem diferença de caixa/espaços, `normalizedName` das categorias iniciais e limite de notas medido em bytes UTF-8.

Foi criada uma suíte real com Auth e Firestore Emulator. `npm run test:integration` passou com 8 testes: health/token inválido, e-mail não verificado, conta suspensa, convite + retry idempotente, concorrência pela última vaga, isolamento A/B pelas Rules, conflitos/idempotência de conteúdo, lixeira vencida e referência arquivada. As Rules agora permitem somente leitura autenticada e limitada das coleções de atividades, notas, listas e itens; escrita do cliente segue negada.

O frontend real agora monta `AuthProvider`, usa `Login`, protege todas as rotas privadas e tem um shell autenticado. `/hoje` lista atividades do Firestore, cria tarefas pela API e alterna conclusão com revisão otimista. O fluxo foi validado no Chromium contra os emuladores: login, convite/admissão, criação, reload, conclusão, Axe e ausência de erro/overlay. Evidência: `docs/evidence/e02-e03-atividade-persistente.png`.

Execução local: `npm run dev:local` sobe Auth/Firestore Emulator, API e Vite; em outro terminal, `npm run seed:local` prepara uma conta e convite exclusivamente fictícios. Nesta máquina a porta 5173 estava ocupada e o Vite escolheu 5174; o teste local usa 5174 no momento.

Verificações ao final desta retomada: typecheck/build passaram, Vitest 3/3, integração 8/8, regressão Playwright 12/12 e fluxo persistente Playwright 1/1. O bundle principal passou a ~246,23 kB gzip por incluir Firebase e deve ser dividido antes da homologação.

**Próximo ponto exato:** continuar E03 com consultas de calendário por intervalo e índices, edição/exclusão/restauração de atividades e categorias reais; depois substituir as telas vazias de notas e compras pelas funcionalidades persistentes. Adicionar testes de conflito de revisão, referência arquivada, prazo de restauração e limites de estoque. Não tratar as telas vazias atuais como funcionalidades entregues.

**Registro histórico da pausa solicitada em 11/09/2026.** A retomada descrita acima ocorreu depois dessa pausa.

## 1. Objetivo vigente e mudança de escopo

O usuário inicialmente pediu para ler os Markdown da raiz e executar o projeto com cuidado. O `PROMPT-CODEX.md` orientava entregar primeiro E00/E01, com demo isolada. Foi construída e testada essa fundação.

Depois o usuário corrigiu explicitamente: **“nao quero uma demonstração, o sistema tem que ser completo”**. Essa instrução prevalece sobre a limitação inicial a E00/E01. O objetivo da continuação é o sistema completo descrito no relatório, com autenticação, persistência, autorização, agenda, notas, compras, recuperação, recorrência, offline/PWA e push verificáveis. A demo existente é apenas uma etapa histórica e não a entrega desejada.

Por fim, solicitou: **“vamos parar por aqui, anote exatamente aonde parou para prosseguir depois”**. A implementação foi interrompida sem iniciar novas funcionalidades ou testes após esse pedido.

## 2. Contas e autorização já informadas

- O usuário possui contas em Firebase, Vercel e Cloudflare.
- **Ainda não existem projetos Leve nesses serviços.** Não perguntar novamente se os projetos já existem.
- O usuário permitiu configurar os projetos ou deixar a configuração preparada para ele: “se quiser configurar ou diexar para mim fique a vontade”.
- Nenhum projeto foi criado e nenhum deploy foi realizado nesta sessão. Não houve ativação de cobrança.
- Firebase CLI global está instalado e `firebase login:list` confirmou uma conta autenticada. O e-mail não precisa ser copiado para documentação. Na retomada, usar essa conexão para verificar/criar apenas o projeto autorizado, respeitando os planos gratuitos.
- O conector Vercel respondeu `{ "teams": [] }` a `list_teams`. Isso não demonstra ausência da conta pessoal; acesso/provisionamento ainda precisa ser resolvido.
- Cloudflare ainda não teve autenticação/conexão verificada.
- Permanecem obrigatórios: R$ 0, sem billing/trial/upgrade, sem recursos pagos, sem dados reais em testes. Configurar projetos não equivale a homologação ou autorização irrestrita para publicar conteúdo pessoal.

## 3. Ambiente e repositório

- Pasta: `C:/Users/Kauan/Desktop/Leve`; shell PowerShell.
- Node `24.0.2`; npm `11.19.1`; Java `23.0.2` disponível.
- Git resolve para `C:/Users/Kauan`, **fora da pasta do projeto**. Não executar `git add .` a partir desse ancestral. Nenhum commit, branch, reset ou inicialização Git foi feito. `git status --short -- .` reporta o diretório como não rastreado.
- Os três Markdown originais e `.qodo/` foram preservados.
- Não há `AGENTS.md` dentro do projeto.
- Documentos separados 01–04 não foram fornecidos; as seções correspondentes estão no relatório consolidado.
- `referencia-prototipo/` não foi fornecida. Os tokens foram reconstruídos da seção 9; fidelidade visual ao original não foi comprovada.

## 4. O que está implementado e já foi verificado

Fundação React/TS/Vite em `apps/web`, npm workspace, lockfile, fontes locais, tokens semânticos, CSS responsivo Vidro & Papel, navegação por URLs e demo isolada.

- `apps/web/src/app/App.tsx`: **ainda é o roteamento antigo da E01**. `/entrar` usa `Unavailable`; rotas privadas redirecionam para essa tela. `/demo/*` usa o módulo demonstrativo.
- `apps/web/src/main.tsx`: aplica `design-tokens.json`, carrega fontes, `BrowserRouter`, `ErrorBoundary` e `App`. **Ainda não monta `AuthProvider`.**
- `apps/web/src/features/demo/Demo.tsx`: tarefas em memória, calendário/dia, leitura de notas de exemplo, compras temporárias e preferência de transparência. Não é o sistema persistente solicitado.
- `apps/web/src/app/ErrorBoundary.tsx`: fallback para falha de render/chunk.
- `tests/unit/dates.test.ts` e `tests/e2e/shell.spec.ts`: testes da E01.
- `vercel.json`: configuração preparada para build na raiz → `dist`, rewrites limitados às rotas e headers/CSP. Não foi testada na Vercel. CSP só permite conexões da própria origem e precisa de revisão para Firebase.

**Última verificação completa executada, ANTES das adições E02/E03:**

```text
npm run check
TypeScript: passou
Build Vite: passou
Vitest: 3 testes passaram
Playwright: 12 testes passaram
```

Chromium de teste: `153.0.8010.12`. E2E verificou rotas/refresh/histórico, demo isolada, formulário e Escape/foco, texto HTML renderizado como texto, calendário por teclado, modo sólido, seis larguras 320–1440 e Axe em cinco telas/diálogo. Isso não valida autenticação, Firestore, offline, backend, push ou conformidade completa.

JS inicial E01: ~84,23 kB gzip; demo ~4,90 kB; CSS ~3,01 kB. `dist/` ainda corresponde ao build E01, não às adições de backend.

Uma execução E2E anterior teve 11/12 passando e timeout no carregamento inicial de um teste. O reteste completo passou sem aumentar timeout/retries; a causa definitiva da demora não foi comprovada.

Revisão visual: a página desktop foi inspecionada via agent-browser. A captura inicial ficou temporariamente em `test-results/`, diretório limpo pelos testes. **Não há PNGs em `docs/evidence/`: as tentativas falharam porque a pasta ainda não existia.** A pasta agora contém somente README. Capturas precisam ser refeitas; não citar imagens inexistentes.

Licenças das fontes foram copiadas para `apps/web/public/licenses/` depois do último build. Ainda precisam entrar no próximo build.

## 5. Código mais recente: escrito, mas NÃO validado nem integrado

O trabalho foi interrompido **logo depois de adicionar `server/commands/content.ts`, conectá-lo ao dispatcher em `server/app.ts` e ampliar o `include` de `tsconfig.json`**. Não foi executado `typecheck`, build ou teste após essas adições.

### Identidade e infraestrutura

| Arquivo | Conteúdo iniciado |
|---|---|
| `packages/domain/src/identity.ts` | Zod: IDs, fuso, perfil, envelope de comando, convite; tipos de sessão/resposta |
| `server/platform/firebase.ts` | Admin Auth/Firestore; exige `FIREBASE_PROJECT_ID`; guardas para emuladores apenas locais com projeto `demo-` |
| `server/errors.ts` | Erros públicos de aplicação |
| `server/commands/identity.ts` | Hash canônico, aceitação transacional de convite, membership/perfil/categorias iniciais, atualização de perfil, receipts/revisão/rate limit |
| `server/app.ts` | Express 5, health/session/commands, verificação de ID token, limite de corpo, dispatcher e tratamento de erros |
| `server/dev.ts` | Servidor da API em `127.0.0.1:8787` |
| `api/[...path].ts` | Export da aplicação Express para Vercel; compatibilidade concreta ainda não testada |
| `firebase.json` | Auth `9099`, Firestore `8080`, UI desativada; nenhum deploy |
| `firestore.rules` | Default deny; leitura de perfil, membership e categorias sob condições; escrita do cliente negada |
| `firestore.indexes.json` | Ainda vazio |

### Frontend real iniciado

| Arquivo | Conteúdo iniciado |
|---|---|
| `apps/web/src/platform/firebase.ts` | SDK cliente; configuração pública; sessão do navegador; conexão local opcional a emuladores |
| `apps/web/src/platform/api.ts` | Bearer ID token, fetch com timeout, erros e envio de comandos |
| `apps/web/src/features/identity/AuthProvider.tsx` | Estado de Auth/sessão, guarda contra resposta de conta anterior, observação de membership e logout |
| `apps/web/src/features/identity/Login.tsx` | E-mail/senha, Google, recuperação, verificação de e-mail e formulário de convite |
| `apps/web/vite.config.ts` | `envDir` passou para raiz; proxy `/api` → `8787` |

**Esses componentes ainda não estão ligados a `App`/`main`.** Classes CSS adicionais do login não foram implementadas. Não há AppShell autenticado ou tela real de perfil/agenda. O SDK não foi ensaiado, inclusive com HMR/StrictMode.

### Domínio/conteúdo iniciado

- `packages/domain/src/content.ts`: schemas para Task/Event, datas civis e conversão com Temporal, categorias, documento de nota limitado, listas/itens de compras e metadados.
- `server/commands/content.ts`: handlers iniciais para criar/atualizar/concluir/cancelar/enviar à lixeira/restaurar atividades; criar/atualizar/arquivar categorias; salvar/remover/restaurar notas; listas e itens de compras. Usa transação, receipt/hash, revisão, membership, contadores e referências por uid. Inclui criação de intenções `reminderJobs` em alterações de atividades elegíveis.
- Esse é código em desenvolvimento, **não funcionalidade entregue**. Sem testes negativos, Rules correspondentes para essas coleções, queries/índices, UI real ou processador de jobs.

## 6. Instalações concluídas e pendências de dependências

Dependências de produção adicionadas: `firebase@12.19.0`, `firebase-admin@14.4.0`, `zod@4.6.2`, `express@5.2.1`, `@js-temporal/polyfill@0.5.1`.

Desenvolvimento: `firebase-tools@15.30.0`, `@firebase/rules-unit-testing@5.0.2`, `tsx@4.23.13`, `supertest@7.2.2`, `@types/supertest@7.2.1`, `@types/express@5.0.6`, `concurrently@10.0.5`.

- `package.json` e `package-lock.json` foram atualizados; instalação terminou.
- Ainda **não foram adicionados scripts** de API, emuladores, seed, integração ou desenvolvimento conjunto.
- `npm audit --omit=dev --json` retornou **2 alertas moderados**, transitivos `gaxios`/`uuid` (advisory GHSA-w5hq-g745-h8pq). A instalação total reportou **10 moderados** incluindo desenvolvimento. Não foi aplicado `npm audit fix`.
- npm alertou scripts de instalação sem aprovação para `@firebase/util`, `protobufjs`, `re2` e `esbuild`. Revisar necessidade/segurança e resolver de forma controlada antes dos emuladores/testes. Não executar aprovação irrestrita.
- Emuladores Firebase ainda **não foram baixados/iniciados** nesta sessão. Não há seed de `serviceControls` ou convites.
- `.env.example` contém placeholders da fundação, mas ainda precisa documentar emuladores e variáveis locais. Nenhum `.env.local` com credenciais foi criado.

## 7. Próximos passos exatos, em ordem

1. Ler este checkpoint e a especificação original. Preservar alterações existentes. Não voltar a oferecer uma demo como objetivo final.
2. Executar `npm run typecheck` e corrigir o código E02/E03 escrito, sem presumir que compila. Rever inicialização do SDK cliente em HMR, tipos de snapshots/Express e schemas.
3. Auditar os riscos já visíveis: verificação de e-mail também em atualização de perfil; política de rate limit/admissão; igualdade canônica; todas as leituras antes das escritas em transações; defaults de categoria precisam de `normalizedName`; conflitos, referências arquivadas e prazo de restauração. Validar tamanho UTF-8 das notas, não apenas quantidade de caracteres serializados. Não considerar controles implementados seguros antes dos testes.
4. Preparar scripts locais para Auth/Firestore Emulator + API + Vite, com project ID `demo-leve` exclusivo do emulador, sem tocar contas reais. Criar seed controlado de `serviceControls/global` e convite de teste. Configurar variáveis de forma reproduzível e sem segredos versionados.
5. Criar testes de integração reais com emuladores para identidade, Rules e comandos: anônimo/A/B, token inválido, email não verificado, suspenso/deleting, convite expirado/reutilizado, última vaga concorrente, retry/idempotência e conflito de revisão. Riscos T-01–03/T-36–38 primeiro.
6. Ligar `AuthProvider` e `Login` ao aplicativo, construir shell autenticado com perfil real e conta nova vazia. Separar fixtures do fluxo real. Atualizar os testes E01 que hoje esperam a tela `Unavailable`.
7. Completar E03 verticalmente: atividades Task/Event, queries por intervalo, índices/Rules explícitos, categorias, estados de gravação/erro e persistência conferida por reload/segunda sessão. Não usar os arrays da demo como banco.
8. Seguir E04–E11: editor limitado e conflitos; compras/ciclos; lixeira/export/import/exclusão; recorrência; outbox/IndexedDB/PWA; scheduler HMAC/FCM; acessibilidade/carga/recuperação; homologação. Implementação deve continuar por etapas verificáveis, mas escopo final é completo.
9. Configurar projetos gratuitos usando as contas autorizadas, quando a base estiver pronta para conectar. Firebase CLI já autenticado; Vercel/Cloudflare podem exigir conexão. Sem billing, sem produção presumida, sem fingir prova de push. Registrar exatamente qualquer dependência externa restante.
10. Atualizar README, ADRs, cobertura e evidências à medida que as etapas forem verificadas. `docs/EXECUCAO.md` hoje é relatório histórico E01, não status da solução completa.

## 8. Execução/ferramentas e cuidados ao retomar

- Vite/Vitest/Chromium tiveram `spawn EPERM` na sandbox Windows; os comandos aprovados fora dela funcionaram. Não confundir bloqueio da ferramenta com falha do código.
- `npm run dev -- --port 5173 --strictPort` e `npm run test:e2e -- --grep ...` foram interpretados incorretamente pelo wrapper PowerShell/npm. `npm run dev` e `npm run check` sem argumentos extras funcionaram. Para flags específicas, usar o binário JS/`.cmd` adequadamente e confirmar o comando executado.
- O servidor Vite da sessão foi encerrado ao receber o pedido de pausa. API e emuladores não estavam em execução. Instalações e consulta de auditoria terminaram.
- Pode restar a sessão de navegador de revisão `leve-e01`, sem dados reais; não é um serviço do aplicativo. Os arquivos de evidência do navegador não foram produzidos no caminho final.
- Nenhum agente paralelo foi usado. Não houve provisionamento externo, push, exportação de dados reais ou publicação.

## Pedido sugerido para retomar

> Leia `CONTINUAR.md` e retome do item 7. Quero o Leve completo e persistente, não apenas a demonstração. Revise o backend/identidade já iniciado, valide com emuladores e prossiga pelas etapas. Já possuo as contas dos três serviços, mas os projetos Leve ainda precisam ser criados. Preserve o custo zero e não declare funcionalidades prontas sem evidência.
