# Leve — ponto exato de retomada

## Cronômetro global e acesso rápido — 15/09/2026

O cronômetro persistente agora acompanha a navegação em uma barra flutuante com atividade, tempo, estado e ações de pausar, retomar, encerrar e abrir. O Meu dia ganhou atalho direto para a seção de tempo de cada atividade. A consulta global busca apenas registros abertos, sem depender do limite da listagem histórica. O painel completo recebeu âncora própria e controles com ícones. O layout reserva espaço para a barra em desktop e celular, respeita modo sólido, movimento reduzido e alvos de toque. Evidências locais: `docs/evidence/timer-floating-desktop.png`, `docs/evidence/timer-floating-mobile.png` e `docs/evidence/timer-detail-mobile.png`.

Validações desta entrega: build aprovado, testes de integração com Auth/Firestore Emulator aprovados e E2E focal do cronômetro aprovado em desktop e 390 px, com Axe WCAG A/AA e sem overflow horizontal. A suíte unitária revelou um fixture antigo incompleto do service worker; o mock de `clients.matchAll` foi corrigido.

## Ajuda e avisos responsivos — 15/09/2026

Ajuda movida para uma seção das Preferências. Removido o botão flutuante e suas coordenadas fixas no mobile. Guia e banner usam portal no body, dimensões limitadas pela viewport e safe areas. Guia tem cabeçalho/ações separados da leitura com rolagem; a etapa de notificações aponta para as configurações existentes, sem duplicar o formulário dentro do guia. Banner móvel separa texto, fechar e abrir. Revisão do diff sem erros de whitespace; testes e build não executados conforme orientação do usuário. Validação visual no aparelho permanece pendente.

## Android: tema e avisos — 15/09/2026

Corrigido o reset para verde enquanto o perfil carrega e removido o fundo opaco do body que cobria o gradiente. Adicionada opção de lembrete no horário da atividade, renovação do registro de notificações e aviso local para verificar a exibição pelo Android. O worker encaminha mensagens recebidas para o banner do app aberto. Cache atualizado para v3. Não executados testes/build por orientação do usuário. Entrega real pelo scheduler/FCM e cor da moldura instalada ainda precisam de confirmação no aparelho; manifesto instalado permanece com cor inicial padrão e sua atualização depende do navegador.

## Interface e sessões passivas — 14/09/2026

Implementação local concluída, ainda sem commit: ícones e textos da interface foram revisados; Meu dia, calendário, notas, compras, configurações e lixeira receberam hierarquia, estados vazios e ajustes móveis. O calendário mantém 42 dias, compartilha a data escolhida com Meu dia, abre os itens em uma folha móvel, preserva as cores das atividades e diferencia atrasos. Notas têm edição inline, barra fixa, prévia de duas linhas, busca com realce e separação das fixadas. Compras têm inclusão visível, edição inline, progresso e itens concluídos recolhidos.

O detalhe de atividade agora registra apenas o tempo em que a página fica visível. Sessões menores que 30 segundos são descartadas. Cada aba usa uma identificação própria; o envio usa `sessionId` estável para impedir duplicidade. Um checkpoint local permite recuperar sessões interrompidas por até quatro horas em qualquer página da agenda, limitado à conta correta. Registros manuais e sessões aparecem separados no histórico. Concluir ou cancelar a atividade encerra a sessão aberta.

O preparo E2E ganhou limpeza opcional dos dados fictícios para impedir que repetições de teste atinjam os limites da conta. O uso local comum continua preservando os dados. Últimas provas antes do acabamento final: build aprovado, 31 testes unitários aprovados e cenário focal de refinamentos aprovado. A bateria final será executada depois de todas as alterações desta seção.

## Correção de produção — 14/09/2026

Em andamento: corrigir o carregamento de `/hoje` observado em produção. O listener compartilhado agora espera 25 segundos pelo primeiro snapshot do Firestore, com teste cobrindo o limite. A CSP passa a permitir `https://leve-db.firebaseapp.com` em `connect-src`. O typecheck ganhou uma configuração separada para `server`, `api` e `workers`, sem tipos do Vite.

A skill pública `humanizer-br` foi instalada em `C:/Users/kelvi/.codex/skills/humanizer-br`. O `AGENTS.md` exige seu uso em todo texto exibido ao usuário e registra as convenções para rótulos, dicas, estados vazios e mensagens. A skill estará disponível automaticamente para novos turnos do Codex.

Provas locais concluídas: `npm run typecheck` sem erros, `npm run build` concluído e `npm test` com 25/25 testes. O teste focal do timeout passou com 2/2 casos. Falta commit, push, acompanhar o build Vercel e validar `/hoje` autenticado em produção. Se o erro persistir, registrar o código exato do `FirebaseError` sem expor conteúdo privado.

## Loading, gradiente móvel e funções essenciais — 14/09/2026

- Criado LoadingState.tsx para carregamento inicial, rotas, Meu dia e detalhes, com marca, indicador e esqueleto estrutural acessível.
- Animações usam opacidade e transformação máxima de 4 px; prefers-reduced-motion desativa efeitos.
- Gradiente global movido para html; body e root cobrem 100svh, preenchendo a safe area superior no celular.
- Ambiente local reparado: cache Vite obsoleto removido e Vite, API, Auth Emulator e Firestore Emulator reiniciados.
- Criação de atividades corrigida: schedules voltaram a enviar timeZone e disambiguation exigidos pelo domínio.
- Contraste de textos secundários e atividades concluídas reforçado; seletores E2E tornados inequívocos.
- Aprovados: typecheck, build, 25/25 testes unitários, fluxo focal de refinamentos, persistência de atividade, reflow/acessibilidade, tutorial, compras e lixeira.

---

## System Prompt v2 — 14/09/2026, implementado e 100% validado com emuladores

Bloco de refinamentos globais do System Prompt v2 implementado e totalmente validado com emuladores ativos (`npm run dev:local`). Todos os 25 testes unitários passam; build, typecheck e E2E Playwright (`refinements.spec.ts`) aprovados.

**Implementado:**

- **Cores de atividades no Meu dia (tela inicial)** — `DayNavigation.tsx` recebeu a prop `dotsOf?: (date: string) => string[]`, renderizando os marcadores coloridos (`.calendar-colors`) tanto na navegação semanal quanto mensal de `Today.tsx` sem novas consultas de rede.
- **Performance / cache ao vivo** — `useLiveQueries.ts`: cache em memória por uid, `useSyncExternalStore`, timeout de 10 s, pageSize de 50, retry, `loadMore` e `clearQueryCache` no logout. `useUserCollection` migrado para usar o mesmo cache. O `LoadError` (`components/ui/LoadError.tsx`) exibe mensagem + botão Tentar novamente.
- **Notificações in-app** — `NotificationBanner.tsx`: escuta `onMessage` do FCM via import dinâmico, mostra banner fixo por 15 s com link de destino validado, integrado ao `Shell` no `App.tsx`.
- **Calendário — cores por atividade** — `activityColors.ts` no domain; `ActivityColorPicker.tsx`; calendário exibe fundo do dia com a cor da primeira atividade e marcadores coloridos para as demais (`.calendar-colors`); painel de detalhes mostra nome da cor.
- **Lixeira** — layout horizontal fixo (`min-width: 0`, `grid-template-columns: minmax(0, 1fr)` + `flex-wrap: nowrap`, sem overflow a 320 px), "Excluir tudo" com `ConfirmDialog`, operação paginada em `server/commands/trash.ts` com cutoff fixo e remoção em lotes de 20.
- **Correção de regras do Firestore** — `useUserSubcollections` corrigido de `limit(200)` para `limit(50)` em estrita conformidade com a função `bounded()` de `firestore.rules`.
- **Shopping — unidade condicional e acessibilidade** — seleção de unidade padrão (`g`, `kg`, `ml`, `L`, `un`, `outra`); campo "Qual unidade?" aparece apenas quando `outra` é selecionado; select de unidade com `aria-label="Unidade"` e `id="item-unit"`.
- **Animações** — `@keyframes leve-enter` + `.main-wrapper > main`, `.activity-composer`, `.confirm-dialog`, `.tutorial-card`, `.notification-banner`; transições `220ms ease-out` em botões/inputs; `prefers-reduced-motion` desativa tudo.
- **Tutorial interativo** — `Tutorial.tsx`: 5 passos, destaque `.tutorial-highlight` por `MutationObserver`, navegação entre rotas, inclusão de `NotificationSettings` no passo de lembretes, salva `tutorialCompletedAt` no perfil, botão "Ajuda / Tutorial" sempre acessível; não reaparece após conclusão.

**Testes e Provas:**
- `tests/unit/liveQueries.test.ts` — 2 testes: preservação de erro após novo snapshot + retry; timeout de carregamento + limpeza de conta (25/25 testes unitários passando).
- `tests/e2e-local/refinements.spec.ts` — 100% aprovado com emuladores reais (`1 passed, 34.0s`): cobre tutorial completo, cor de atividade persistida, marcadores no calendário, unidade condicional no shopping, lixeira móvel sem overflow a 320 px, "Excluir tudo" com confirmação, Axe (zero violações WCAG 2.0 AA) e zero erros de console.
- Evidências geradas: `docs/evidence/v2-calendar-390.png` e `docs/evidence/v2-trash-320.png`.

**Pendências:**
- Chunk `activityColors` do Vite inclui `@js-temporal/polyfill` (161 kB bruto / 46 kB gzip) por co-importação com Calendar. Otimizável via `manualChunks`, sem regressão funcional.
- Provas externas de hardware continuam pendentes: push com app fechado, instalação PWA em aparelho físico, leitor de tela externo, cotas e aceite.

**Próximo passo recomendado:** avaliar os itens restantes de homologação e produção: E08 (duas abas concorrentes, offline avançado), E10 (acessibilidade manual detalhada, carga) e E11 (homologação e deploy autorizado quando solicitado).

---

## Frontend glass — 14/09/2026, revisão concluída

Pedido atual: acabamento geral inspirado em interfaces de iPhone, incluindo preferências, com commit, push e publicação autorizados. A pausa abaixo é histórica e foi substituída por este pedido.

Implementado: camada compartilhada de vidro fosco com bordas luminosas e sombras discretas; refinamento da navegação desktop/dock móvel, avatar, botões, campos, calendário, notas, compras, busca e lixeira. Preferências têm atalhos de seção, grupos responsivos e exclusão permanente recolhida, sem remover confirmação ou reautenticação. Paletas continuam persistentes e independentes das cores de notas/categorias. Modo sólido, fallback sem blur e preferências de acessibilidade permanecem respeitados. Direção e decisões em `DESIGN.md`.

Provas: build/typecheck aprovado, 23/23 testes unitários e diff-check limpo. Os sete testes funcionais E2E passaram juntos; o teste visual passou na repetição focal final, cobrindo quatro paletas, sete páginas em 1440px/390px, Axe, ausência de overflow e persistência do modo sólido. As primeiras rodadas revelaram timeout isolado de cadastro, título fixo duplicado nos testes e contraste insuficiente do contador do calendário; repetição, isolamento por sufixo e contraste corrigidos. Não declarar uma única rodada 8/8: a aprovação final foi 7 funcionais + 1 visual focal. Evidências `docs/evidence/glass-*.png` e conteúdo persistente atualizado.

Publicação concluída no projeto Vercel Hobby existente: deployment `dpl_qXB7i69xuRqbirgEANtpHxfGndwt`, URL `https://leve-agenda-vercel-c17mf3uqw-kauans-projects-6a261bab.vercel.app`, estado READY. A URL canônica `https://leve-agenda.vercel.app` respondeu 200 em `/api/health` e `/entrar`; o CSS público `index-D2NqzjOD.css` contém a camada glass e o layout novo de preferências. Sem mudança de plano, segredo ou infraestrutura. O build remoto emitiu avisos de lockfile/dependências (15 vulnerabilidades moderadas) e TS2688 na etapa de empacotamento das funções, mas completou; o typecheck do build principal e o health público passaram. Revisar esses avisos em manutenção técnica separada, sem atualização forçada nesta revisão visual.

Pendências externas anteriores continuam: push com app fechado e instalação/atualização PWA em aparelho suportado, leitor de tela, observação representativa de cotas e aceite da usuária. Essas provas não fazem parte da aprovação visual automatizada.

## Histórico: PAUSA SOLICITADA — 13/09/2026, refinamento do frontend

Usuário pediu interromper imediatamente, anotar e fazer commit; continuar em outra sessão. Nenhum deploy desta revisão visual foi realizado. A produção mantém a versão anterior; o frontend editado está no ambiente local, http://localhost:5174.

Concluído nesta rodada: skills Open Design instaladas (detalhes em `DESIGN.md`); referência visual inspecionada; menu com seleção/hover seguindo a paleta; cinco destinos móveis alinhados; calendário mensal com filtro e detalhes; criação por data; acabamento compartilhado de notas, compras, formulários e cabeçalhos. Build com typecheck passou antes das últimas mudanças de contraste/testes.

Verificações: o novo teste `design.spec.ts` passou para quatro paletas e sete páginas em 1440px/390px, incluindo Axe e ausência de overflow. Na suíte completa, 6 de 8 passaram. Dois testes antigos falharam porque usavam a data UTC em vez da data civil America/Sao_Paulo; o aplicativo estava no dia 13 e os testes criavam no dia 14. Corrigida a data nos testes e ajustada a busca da atividade para a agenda do calendário, que agora também exibe prévias. A repetição desses dois testes foi INTERROMPIDA pelo pedido de pausa; não há aprovação final dessa repetição.

Retomada: revisar o diff do checkpoint; repetir `npm run test:e2e:local` (com `LEVE_LOCAL_URL=http://localhost:5174` se o ambiente já estiver ativo); confirmar o seletor da atividade no novo calendário; executar build/unit/diff-check finais. Depois, revisar visualmente desktop e celular com dados fictícios, concluir o refinamento das páginas e registrar evidências. Não declarar a revisão frontend finalizada nem publicada. A instalação feita foi das skills do Open Design, não do aplicativo desktop/daemon.

O commit solicitado preserva o estado acumulado do projeto (backend/produção anteriores e frontend atual), que ainda estava sem commit. Segredos e arquivos ignorados não devem ser adicionados.

## Frontend — refinamento visual de 13/09/2026

O usuário pediu foco no design e autorizou instalação do Open Design. As skills `frontend-design` e `impeccable-design-polish` foram instaladas e aplicadas; `design-review` foi instalado como entrada de catálogo, sem instalar o gstack. A referência https://leve-agenda-gih.kauankelvin20.chatgpt.site/ foi inspecionada nas quatro páginas principais. A direção está em `DESIGN.md`.

Seleção/hover do menu agora derivam da paleta escolhida, incluindo perfil e navegação móvel. Corrigidas as cinco entradas em quatro colunas no celular. Calendário ganhou grade mensal de 42 dias, filtro, seleção e detalhes; criação abre Meu dia com a data escolhida. Notas fixadas vêm primeiro e compras mostram progresso real. Cabeçalhos, cartões, botões, formulários e minicalendário receberam acabamento compartilhado. Esta revisão visual está no ambiente local; a produção anterior permanece publicada.

## Produção Vercel e Firebase Admin — 12/09/2026

O deploy autorizado foi concluído no projeto Vercel Hobby `kauans-projects-6a261bab/leve-agenda-vercel`. A produção está em `https://leve-agenda.vercel.app`; o deployment promovido é `https://leve-agenda-vercel-i5u0jiyyz-kauans-projects-6a261bab.vercel.app` e o rollback preservado é `https://leve-agenda-vercel-6s9nxvkrj-kauans-projects-6a261bab.vercel.app`. `GET /api/health` respondeu HTTP 200 com versão `0.1.0` e o runtime registrou `firebase.admin.initialized` com `adminMode: service-account`.

As variáveis públicas Firebase, `VITE_APP_VERSION` e as três credenciais Admin foram configuradas como segredos de Preview e Production. Uma verificação administrativa real leu Auth e persistiu/removeu uma sonda no Firestore, sem criar usuário. Os domínios autorizados do Firebase incluem `leve-agenda.vercel.app`. A CSP de produção foi corrigida para permitir os scripts Google estritamente em `https://apis.google.com` e `https://accounts.google.com`; `/entrar` foi recarregada sem erro de console. O aviso de `beforeinstallprompt` é o fluxo esperado: o evento é retido e `prompt()` só é chamado após o clique explícito em **Instalar Leve**.

O domínio `leve.com` continua preparado na Vercel e na zona Cloudflare, mas o usuário decidiu não depender do registrador Alibaba/HiChina nesta release. A hospedagem canônica e suficiente permanece `https://leve-agenda.vercel.app`; troca de nameservers, propagação de `leve.com` e autorização desses hosts no Firebase ficam adiadas e não bloqueiam E09–E11.

Em 13/09/2026, o Worker gratuito `leve-scheduler` foi publicado e, após receber `LEVE_API_ORIGIN=https://leve-agenda.vercel.app` e o segredo HMAC compartilhado com a Vercel Production, ficou na versão ativa `5e0cebc5` com Cron Trigger por minuto. O tick assinado foi observado em produção com HTTP 200 às `2026-09-13T23:50Z`. Os índices versionados de `firestore.indexes.json`, incluindo os índices `COLLECTION_GROUP` de `purgeAfter` para `activities`, `categories`, `notes`, `shoppingLists` e `items`, foram publicados no projeto `leve-db`.

Na mesma retomada, `npm run build` passou com typecheck e `npm test` passou com 23/23 testes. Produção respondeu HTTP 200 em `/api/health`, `/entrar` carregou sem mensagens de console e o ambiente local voltou a ficar ativo em `http://localhost:5174` com API, Auth Emulator e Firestore Emulator.

Uma chave Web Push VAPID foi gerada no Firebase e gravada como `VITE_FIREBASE_VAPID_KEY` na Vercel Production; o bundle publicado a contém. As rotas aninhadas `/api/internal/tick`, `/api/account/export` e `/api/commands/:operationId` receberam entrypoints Vercel próprios: o health responde 200 e chamadas sem credencial a essas rotas respondem 401, não 404. O fallback do login Google também foi ampliado para usar redirect quando o navegador reporta `auth/internal-error`; após novo deploy, `/entrar` foi recarregada sem a mensagem antiga, sem violação de CSP e sem erros ou avisos no console.

Continuam pendentes somente as provas que exigem interação externa específica: push com app fechado em aparelho suportado, instalação/atualização PWA em aparelho, ensaio com leitor de tela, observação representativa das cotas Firebase/Cloudflare, homologação e aceite. Não revogar a chave Admin usada pela Vercel enquanto essas variáveis dependerem dela.

## Continuação E06–E10 — navegador, concorrência, recuperação e cadeia de lembretes

A restrição anterior de não executar Playwright/Auth Emulator foi revogada pelo pedido de concluir as verificações locais. O ambiente local permaneceu limitado ao projeto fictício `demo-leve`, sem publicação, billing ou credenciais administrativas reais.

As jornadas reais agora cobrem cadastro e recuperação, persistência de atividades/notas/compras, lixeira global, duas abas, fila offline com reconexão, encerramento de sessão entre abas, conflito simultâneo de nota com preservação das duas versões, teclado, reflow equivalente a zoom de 200%, Axe nas rotas principais e exportação seguida de importação pela interface. A suíte passou com 7/7 testes. O destaque do Meu dia foi corrigido para escolher deterministicamente a nota fixada atualizada mais recentemente; Buscar e Preferências voltaram a ser alcançáveis no layout móvel.

Na E09, uma prova integrada confirma que entrega incerta termina em `unknown` sem reenvio, enquanto rejeição FCM confirmada incrementa tentativas e agenda backoff. O Worker Cron assina um tick aceito pela mesma validação HMAC da API. O service worker passou a ler o envelope `data` do FCM e possui teste do título, corpo, tag e destino. A integração focal de capacidade executou vinte contas simultâneas, com isolamento e todas as gravações concluídas em 3,806 s no Emulator; isso não substitui medição de cotas ou carga de produção.

O painel Vercel confirmou o plano Hobby. No ciclo de 14/08 a 13/09/2026, mostrou 306,2 MB/100 GB de Fast Data Transfer, 290,7 MB/10 GB de Fast Origin Transfer, 4,4 mil/1 milhão de Function Invocations e 15m22s/4h de Fluid Active CPU. Esses números fecham a leitura inicial da Vercel, mas a expansão continua condicionada a períodos representativos e às cotas Firebase/Cloudflare.

Provas finais desta continuação: `npm run build` com typecheck aprovado; `npm test` 23/23; integração completa 18/18; E2E local 7/7. O teste focal de vinte contas concluiu em 3,806 s. O seed fictício foi restaurado e o healthcheck local respondeu HTTP 200 com versão e timestamp. O sistema permanece ativo em `http://localhost:5174` para acompanhamento.

Pendências exclusivamente externas após essa consolidação: confirmar billing/planos e cotas nos painéis; configurar VAPID, FCM, Worker e índice no ambiente autorizado; provar instalação, atualização e push com o aplicativo fechado em aparelhos suportados; ensaiar leitor de tela; executar rollback de um preview real; homologar com a usuária e obter aceite. E11 não autoriza publicação por si só.

## Continuação E06/E07/E09 — integração, digest e leases concorrentes

A suíte integrada pendente foi executada com Auth/Firestore Emulator fictícios e desligamento automático. Ela revelou que o checkpoint preparado manualmente no teste calculava o digest sobre uma ordem de chaves diferente daquela produzida pelo schema. A identidade de arquivos de importação agora usa serialização canônica, sem depender da ordem das propriedades, e ainda aceita o digest legado de checkpoints já iniciados.

Em E09, a recuperação de leases vencidos deixou de usar um batch cego: cada job é relido e recuperado por transação, impedindo que um tick atrasado apague o lease novo de outro tick. Todas as finalizações confirmam `leaseId` e estado `processing` na transação e limpam o lease terminal. A invalidação de token FCM também relê token e metadado do aparelho, só invalidando a credencial que efetivamente falhou e preservando um registro concorrente mais novo.

Provas executadas nesta continuação: `npm run typecheck`, `npm test` (21/21) e `npm run test:integration` (16/16), aprovadas. O runner encerrou Auth, Firestore, hub e logging. Playwright permanece desativado conforme a restrição registrada. O próximo passo local é revisar a cobertura de entrega incerta/retry do tick sem afirmar push pronto; E08/E10/E11 continuam dependentes das provas reais de navegador, aparelho, capacidade, rollback, deploy autorizado e aceite.

## Continuação E06/E07 — capacidade de importação e janela recorrente

A importação agora mantém uma única operação ativa por conta e no máximo duas globalmente, usando a mesma transação que cria o checkpoint e reserva os estoques. A conclusão libera a vaga uma única vez; a exclusão concorrente marca a conta como `deleting`, incrementa `dataVersion` e libera a vaga antes do expurgo. A exportação também rejeita o resultado se a conta deixar de estar ativa durante a leitura. Foram acrescentadas regressões integradas para retomada com todas as entidades e vínculos remapeados, concorrência, limites de bulk e exclusão durante importação preparada.

Em E07/E09, a materialização passou a respeitar de fato a janela civil de 45 dias. Criação e separação de séries, além do tick incremental, usam um único helper para criar jobs de lembrete por ocorrência; o cálculo inclui reservas de atividades e mantém IDs determinísticos. Isso remove os jobs ausentes e evita transações grandes causadas pela criação antecipada de até 180 ocorrências com três lembretes cada. O tick agora filtra tokens ativos antes do limite de três aparelhos e invalida token, metadado e contador na mesma transação. O identificador local de notificações passou a ser isolado por uid, com migração da chave antiga e revogação de melhor esforço antes do logout, reduzindo vazamento entre contas no mesmo navegador.

Provas executadas nesta continuação: `npm run typecheck`, `npm test` (20/20) e `npm run build`, aprovadas; `git diff --check` também passou. Os novos cenários integrados compilam, mas **não foram executados**, porque a restrição registrada de não iniciar Auth Emulator/Playwright ainda não foi explicitamente revogada. O próximo passo local é executar `npm run test:integration` com Auth/Firestore Emulator fictícios e desligamento automático. Depois, corrigir qualquer regressão observada e avançar para recuperação concorrente de leases/tokens em E09. E08/E10/E11 continuam dependentes das provas de navegador, aparelho, capacidade, rollback, deploy e aceite já listadas abaixo.

## Bloqueio de verificacao apos cadastro

Usuario relatou falha em sendOobCode real usando continueUrl em localhost. Status/corpo da resposta nao foram fornecidos; causa real ainda nao confirmada. Cadastro/reenvio agora usam fallback sem continueUrl exclusivamente para unauthorized-continue-uri/invalid-continue-uri; verificacao continua obrigatoria pelo handler Firebase. UI deixou de afirmar que o email foi enviado sem evidencia. 19 testes unitarios e typecheck passaram; nenhum token pessoal foi reutilizado. Falta usuario confirmar resultado do reenvio ou fornecer apenas code/message da resposta, sem credenciais. Demais pendencias E06–E11 seguem abaixo.

## E06 — importacao concorrente corrigida

Lotes e cursor agora sao atomicos em transacao; cada lote revalida conta/membership e incrementa dataVersion para invalidar exportacoes concorrentes. Corrigida rejeicao dos metadados exportados pelos schemas estritos de atividade, categoria, nota, lista e item. Teste integrado com duas chamadas simultaneas e 401 atividades passou, com 401 entidades e reserva zerada; suite total 11/11. Runner encerrou os emuladores.

Ainda falta em E06: prova de interrupcao/retomada e arquivo completo com todas as entidades, exclusao concorrente e limites globais de bulk. E07–E11 permanecem pendentes conforme auditoria abaixo. Nao declarar todas as etapas concluidas.

## Passo 1 — linha de base integrada executada

O usuario autorizou novamente Auth/Firestore Emulator com dados ficticios, exigindo desligamento ao terminar; Playwright continua desativado. `npm run test:integration` passou: 10 testes em 1 arquivo, aproximadamente 16 segundos. O runner encerrou Auth, Firestore, hub e logging ao final. Foi necessario encerrar um Firestore Emulator antigo do proprio projeto demo-leve que ocupava 8080. Nenhuma publicacao executada.

A suite atual cobre a base de identidade/conteudo; nao prova importacao concorrente, recorrencia, leases nem push. Proximo passo: acrescentar regressao integrada de E06 antes de corrigir checkpoint atomico/reenvio de importacao. Depois E07/E09, E08, E10 e E11, mantendo pendencias de aparelho e homologacao explicitas. O sistema ainda nao esta liberado para cliente.

## Auditoria de migracao e preparacao para cliente

Hooks e plugin_hooks globais habilitados por autorizacao explicita do usuario. A execucao dos hooks do context-mode ainda precisa ser confirmada em uma sessao recarregada.

Corrigida a migracao de tokens: cada registro passa por transacao com releitura, preserva token ja existente no destino e remove o campo legado atomicamente. Eliminado o lote que poderia conter 800 gravacoes. Scripts de migracao agora entram no typecheck. Execucao de dados exige `npm run migrate:notification-tokens -- --apply` e ambiente autorizado; nao executada nesta rodada.

Build/typecheck aprovados. A auditoria geral NAO esta concluida e o sistema NAO esta liberado para cliente. Proximas prioridades locais: concorrencia/checkpoint da importacao (E06); jobs ausentes em ocorrencias recorrentes e reservas de capacidade (E07/E09); recuperacao concorrente de leases e entrega incerta (E09); tokens ativos filtrados depois de limit(5), contagem de aparelhos invalidos e troca de conta (E09); revisao de CSP para Google Auth (E10). Esses pontos precisam de correcao/prova antes de classificar as pendencias como apenas externas.

Continuam pendentes E08 (duas abas, sessao, offline e atualizacao), E10 (acessibilidade, capacidade, recuperacao e rollback) e E11 (homologacao, ambiente/deploy autorizado e aceite). Nao executar Playwright/Auth Emulator sem revisao da restricao do usuario.

## Atualizacao de refinamento — 12/09/2026

`REFINAMENTO.md` foi incorporado ao fluxo em `docs/REFINAMENTO-APLICABILIDADE.md`. Auth, sanitizacao por schema, regras sem escrita direta, rate limit de comandos, singleton Admin, persistencia multitab, indices existentes e atualizacao segura de PWA ja estavam coerentes com a base. O healthcheck agora inclui versao e timestamp, e `.env.example` voltou a conter apenas placeholders. A proposta de migrar Express para Next/Vercel API Routes nao sera aplicada: conflita com a stack aprovada e nao resolve um defeito observado. DOMPurify, indices especulativos e limite de login no Express tambem nao se aplicam ao modelo atual.

**Fluxo ajustado:** E10 incorpora o ensaio de custo dos listeners agregados de itens e da exportacao paginada; E11 concentra preview, variaveis, rollback e deploy autorizado. E08/E09 continuam dependendo de navegador/aparelho reais. Esta rodada preserva a orientacao de nao executar Playwright nem Auth Emulator.

**E09 reforcada:** metadados de aparelho e token FCM agora usam colecoes distintas; o token bruto fica apenas em `notificationTokens`, inacessivel pelas regras, e sua revogacao/invalidez atualiza o estado do aparelho. A exclusao de conta inclui as duas colecoes. Ainda faltam configuracao real de VAPID/FCM/Worker e prova em aparelho fechado.

Uma migracao manual e idempotente (`npm run migrate:notification-tokens`) foi preparada para registros antigos que ainda tenham token junto dos metadados. Nao foi executada, pois exige um ambiente autorizado e pode nao haver nenhum registro legado.

O contrato HMAC do tick agora possui teste puro: segredo, timestamp e tamanho da assinatura sao validados antes de o endpoint aceitar o Worker. Isso fecha a prova local da assinatura, nao a prova do Cron/FCM em infraestrutura.

## Gates de validação — atualização local

Foram reforçados os gates locais sem Playwright/Auth Emulator: a importação valida todos os vínculos antes de gravar, reserva limites na transação e libera a reserva ao concluir; a outbox consulta o recibo da própria conta antes de reenviar operação com mais de 72 horas; o endpoint de recibo não expõe conteúdo, apenas confirmação da operação. A validação de qualidade ganhou contraste AA para texto/ações das quatro paletas e verificação de foco visível.

Provas desta rodada: `npm test` passou com 16 testes em 5 arquivos; `npm run build` e TypeScript passaram antes da prova final; `git diff --check` passou. O runbook em `docs/runbooks/validacao-local.md` registra comandos, evidências locais e limites.

**Gates atuais:** G0 parcial (documentação/custo local; confirmação de contas externas pendente). G1 parcial (núcleo implementado, ainda sem ensaio integrado desta rodada). G2 parcial (invariantes de importação, conflito e outbox cobertas localmente; faltam duas abas, sessão expirada e rede real). G3 pendente de Worker/FCM/aparelho. G4 parcial (build, contraste, logs e runbook; faltam teclado/leitor de tela/zoom reais, carga/cotas, restauração e rollback). G5 pendente de roteiro com a usuária e aceite.

**Etapas que faltam até finalizar:** E06 precisa de ensaio de arquivo real interrompido/retomado; E07 de prova integrada de exceções e materialização; E08 de ensaio em navegador de duas abas, atualização e troca de conta; E09 de Worker, VAPID, FCM e aparelho fechado; E10 de acessibilidade manual, capacidade, recuperação e rollback; E11 de homologação, matriz de aparelhos, deploy autorizado e aceite. Após cada nova rodada, atualizar este bloco antes de declarar avanço.

## Continuação — paletas e integridade de edição

Preferências agora oferecem Verde suave, Roxo suave, Azul suave e Vermelho suave. `colorTheme` é opcional para compatibilidade com perfis antigos, salvo por `profile.update`, incluído na exportação e aplicado ao fundo, ações e foco. Categorias e cores de notas preservam seus significados.

Corrigido avanço automático de revisão de nota ao receber snapshot remoto: o editor preserva a revisão de origem, inclusive ao recuperar rascunho, para que o servidor detecte conflitos. A outbox interrompe o envio quando o uid muda e não associa falha de rede da conta anterior à conta atual.

Ainda existem lacunas locais além da homologação: importação precisa validação completa de entidades/referências, reserva transacional de limites e lotes atômicos com checkpoint; edição de notas precisa testes específicos de interrupção/conflito; outbox precisa reconciliação e testes de troca de conta; lembretes recorrentes e recuperação de leases exigem revisão transacional. A declaração anterior de que restavam somente provas externas não deve ser usada para encerrar essas etapas.

## Atualização mais recente — auditoria honesta e fechamento local sem Playwright/Auth Emulator

Por orientação do usuário, esta continuação não repetiu Playwright nem Auth Emulator. A auditoria corrigiu lacunas que estavam indevidamente agrupadas como “E04–E10 concluídas”: notas agora têm rascunho por conta, autosave local em 300 ms com espera máxima de 1 s, autosave remoto em 1,2 s e resolução de conflito com versão remota ou cópia; o Meu dia mostra listas e itens de compras pendentes; a outbox IndexedDB possui migração de schema, chave por conta, dependências e líder entre abas; exportação lê páginas de 50; importação limita 5 MB e persiste cursor por lote; exclusões de conta interrompidas são retomadas pelo tick; leases de lembrete vencidos voltam à fila e entrega incerta não é reenviada cegamente. Agenda e calendário passaram a carregar por rota, reduzindo o chunk inicial de aproximadamente 325,86 para 275,74 kB gzip.

Provas executadas nesta continuação: `npm run typecheck`, `npm test` (12/12), `npm run build`, validação JSON de manifesto/índices e `git diff --check`, todas aprovadas. Os casos puros cobrem mês sem dia 31, ano bissexto, retomada de janela recorrente, preservação de fuso, resumo de compras e dependências da outbox.

**Estado por etapa:** E00–E03 permanecem concluídas localmente. E04 e E05 têm funcionalidade local implementada, mas o autosave/conflito e o novo resumo não foram ensaiados em navegador por restrição desta rodada. E06 tem paginação/checkpoints/retomada implementados, ainda sem ensaio destrutivo de interrupção. E07 tem motor, corte de futuras e casos puros; falta prova integrada de exceções persistentes. E08 tem PWA/outbox/cache e coordenação multiaba implementados; faltam ensaios reais de duas abas, troca de conta e atualização. E09 tem cliente, fila, HMAC, lease e Worker preparados; push em aparelho fechado continua externo e pendente. E10 está parcial: build, testes, logs e medição de bundle foram executados, mas contraste/teclado a 200%, carga, cotas e recuperação operacional não. E11 continua pendente por depender de homologação, autorização de deploy, matriz de aparelhos e rollback real.

**Ponto exato para retomar:** sem Playwright/Auth Emulator, não há outra prova local de jornada que possa honestamente fechar os gates restantes. O próximo passo é E10/E11 em ambiente autorizado: publicar somente com autorização, configurar `VITE_FIREBASE_VAPID_KEY` e `SCHEDULER_HMAC_SECRET`, aplicar o novo índice de lease, provar duas abas/contas, recuperação interrompida, instalação/offline/push em aparelho suportado, acessibilidade manual, carga/cotas e rollback. Não declarar esses itens aprovados antes da execução real.

## Atualização mais recente — lixeira global de itens

Foi implementada a leitura dos itens das listas de compras na lixeira global e a restauração com `listId` da lista pai. `Lixeira` também foi adicionada à navegação principal com ícone próprio. Typecheck e build passaram. O próximo passo imediato é repetir a prova E2E focal e a suíte de integração em um terminal limpo: o runner Playwright travou nesta sessão e a primeira integração encontrou o Firestore Emulator desligado; os emuladores foram reiniciados, mas a repetição ficou pendente por estado de continuação do PowerShell. Não declarar esta prova como aprovada ainda.

## Pausa solicitada em 11/09/2026, 22h45 — Meu dia e fuso

O trabalho estava no refinamento da tela real `/hoje` para aproximá-la da estrutura do protótipo e dos requisitos RF-07/RF-11: semana selecionável, mini calendário lateral, atividades filtradas pelo dia, cores de categoria, abertura de criação por `Nova atividade`, nota fixada e atalho para compras. O componente novo `apps/web/src/features/activities/DayNavigation.tsx` calcula dias civis com `Temporal` e atualiza a data atual no fuso do perfil. `Today.tsx` já foi alterado para usá-lo; a validação visual e E2E dessa nova composição ainda precisa terminar.

Por pedido recente, o fuso deixou de ser campo de cadastro e de preferências. A API define `America/Sao_Paulo` na ativação e preserva esse valor nas edições de perfil; o contrato aceita a ausência do campo enviada pelo cliente. A conta já existente não foi migrada porque possui fuso válido. A persistência do Auth/Firestore Emulator foi adicionada em `.cache/firebase-data` para que contas locais não desapareçam ao reiniciar `npm run dev`; testes E2E usam modo efêmero e continuam isolados.

O primeiro E2E após a alteração falhou somente porque o backend aberto ainda era a versão anterior e respondia `422` pela ausência do fuso. Os processos locais antigos foram encerrados e `npm run dev` foi reiniciado às 22h43 com o backend novo; Auth e Firestore já reportaram prontos em `localhost:9099` e `localhost:8080`, API em `8788` e Vite em `5174`. Falta executar `LEVE_LOCAL_URL=http://localhost:5174 npm run test:e2e:local`, corrigir qualquer falha real resultante e então executar `npm run build`.

O login informado pelo usuário aponta ao Auth Emulator. A conta existe no emulador atual, mas a resposta HTTP da tentativa não foi fornecida; portanto a causa específica da falha de senha ainda não foi afirmada. A UI passou a diferenciar credenciais incorretas de conta inexistente no modo local. Não registrar senhas, tokens ou e-mails pessoais em documentação, logs ou testes.

## Correção de autenticação e ambiente local em 11/09/2026, 21h

O cadastro por convite foi removido do produto, dos contratos, comandos, seeds e testes. Cadastro por e-mail confirmado e Google convergem para `account.activate`, que cria membership, perfil e categorias padrão de forma transacional e idempotente. `/registrar` exibe “Criar conta com Google”; a configuração pública do Firebase é carregada por `.env.local` fora dos emuladores e não mostra mais o aviso de conexão ausente após reiniciar o Vite.

O Caveman global estava ativo em `localhost:8787`, colidindo com a API local e causando “Serviço indisponível”. A API do Leve passou para `localhost:8788`; o Vite aponta para essa porta. `dev:local` também detecta o OpenJDK instalado, isola a configuração do Firebase CLI em `.cache/` e evita o `tsx` que falhava neste Windows.

O fluxo de autenticação não consulta mais `/api/session` antes de o Firebase informar `emailVerified`; assim, a tela de confirmação não mistura indisponibilidade da API com verificação de e-mail. A inicialização do Auth inclui `browserPopupRedirectResolver`, necessário para o login Google. Falhas de Auth são traduzidas para mensagens de produto, enquanto a API registra somente no backend logs JSON correlacionados de HTTP, validação de token, Firestore e comandos, com causa/stack técnicas e redação de tokens, e-mails, chaves e credenciais. Respostas da API continuam genéricas e não vazam detalhes internos.

Verificações desta correção: typecheck/build aprovados, Vitest 5/5, integração 10/10 e Playwright local 2/2. O login Google chegou corretamente ao carregamento do SDK do provedor; a conclusão interativa não pôde ser ensaiada no sandbox porque `apis.google.com` foi bloqueado pela rede do ambiente, não por erro do aplicativo.

O Auth Emulator não envia e-mails reais. Para impedir que o cadastro local fique preso esperando uma mensagem inexistente, a tela identifica o modo emulado, explica essa diferença e oferece `Confirmar neste ambiente`; a ação consome apenas o `VERIFY_EMAIL` do usuário atual no projeto fictício `demo-leve`. Em produção, o botão local não existe e o fluxo continua usando o link enviado pelo Firebase. O cenário focal de cadastro, confirmação, ativação, recuperação e novo login passou pela interface após o ajuste.

O agente global continua usando o proxy Caveman, mas o `shrink-hook` defeituoso foi removido porque reescrevia comandos PowerShell sem o operador de chamada. A compressão nativa do proxy permanece ativa. O modelo padrão global foi atualizado de GPT-5.2 para GPT-5.5.

## Autenticação finalizada em 11/09/2026

A autenticação foi concluída antes desta pausa. `/entrar`, `/registrar` e `/recuperar` são rotas próprias. A interface diferencia entrada e criação de conta, pede nome e confirmação de senha, permite mostrar/ocultar cada senha, mantém o nome durante a verificação do e-mail e apresenta mensagens específicas para credencial inválida, conta existente, provedor desabilitado, domínio não autorizado, pop-up bloqueado, excesso de tentativas e falha de rede. Não existe código de convite: após e-mail confirmado ou autenticação Google, `account.activate` cria membership, perfil e categorias padrão de forma idempotente. O Google força seleção explícita da conta, usa popup e recorre a redirect quando o popup é bloqueado. A sessão usa persistência local do Firebase e continua após fechar/reabrir o navegador até logout ou revogação. A API renova o ID token e repete uma única vez requisições recusadas com `401`, cobrindo a troca de claims após verificação sem criar loop de repetição.

O cadastro completo passou no Auth/Firestore Emulator pela própria interface: senhas divergentes foram bloqueadas antes da criação; a conta foi criada; o código OOB de verificação foi consumido; o nome foi preservado; a agenda foi ativada sem convite; a recuperação gerou um código `PASSWORD_RESET`; logout, novo login e reload mantiveram o comportamento esperado. A jornada persistente anterior também passou novamente. Resultado local: Playwright 2/2.

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
| `server/dev.ts` | Servidor da API em `localhost:8787` |
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
# Progresso em 14/09/2026 — tempo e planejamento

- Concluído no código: estimativa opcional por atividade e soma de capacidade planejada no Meu dia.
- Em andamento: registros persistentes de tempo via `POST /api/commands`, com início, parada, entrada manual, revisão e bloqueio de dois cronômetros simultâneos.
- Concluído no código: tela de detalhe com cronômetro e histórico de sessões.
- Concluído no código: revisão semanal com realizado versus estimado, comparação com a semana anterior, conclusão e tempo por categoria.
- Concluído no código: atalho global de captura rápida que abre o compositor do Meu dia.
- Concluído no código: títulos das atividades agora abrem diretamente o detalhe e o controle de tempo.
- Concluído no código: exportação e importação incluem estimativas e registros de tempo; registros importados em andamento são encerrados para não ressuscitar cronômetros antigos.
- Concluído no código: regra de leitura privada para `timeEntries`; o cliente continua sem escrita direta no domínio.
- Concluído no código: alinhamento do avatar, nome e subtítulo no cartão de Preferências da barra lateral, inclusive quando o nome é longo.
- Ajuste adicional concluído: em desktops de pouca altura, a barra reduz espaçamentos e itens, mantém o perfil dentro do painel e oferece rolagem interna como proteção.
- Validação concluída: `npm run typecheck`, `npm run build`, `npm test` (25/25) e `npm run test:integration` (21/21).
- Validação E2E concluída: 9/9 fluxos passaram; os dois cenários que detectaram o nome acessível duplicado foram repetidos após a correção e passaram.
- Concluído no código: filtros de estado e categoria no Meu dia, preservados no navegador e aplicados sobre os dados já carregados.
# Atualização visual — 14/09/2026

- Segunda passada visual concluída em desktop e mobile. A fonte serifada foi removida da interface e títulos, números, cartões e diálogos agora usam a mesma família arredondada da marca `leve.`.
- A navegação principal ganhou `Revisão` com ícone próprio. O item agora aparece no dock móvel e na sidebar desktop. Busca e perfil continuam no bloco inferior do desktop.
- Compras teve o cabeçalho do formulário refeito, com ícone, contexto, título empilhado e ação alinhada aos campos. O formulário vira uma coluna no mobile sem perder a ordem de leitura.
- Sidebar, cabeçalhos, botões, campos, painéis, estados vazios, calendário, notas, busca, preferências, lixeira e rodapé receberam nova escala, espaçamento, foco, contraste e estados de interação.
- A inspeção visual cobriu `/hoje`, `/calendario`, `/notas`, `/compras`, `/revisao`, `/buscar`, `/configuracoes` e `/lixeira` em viewport móvel e desktop. O navegador local foi devolvido ao tamanho padrão.
- Compras recebeu resumo operacional, criação de listas mais clara, cartões com progresso, distinção entre listas atuais e modelos, detalhe com inclusão rápida, pendentes, concluídos recolhidos e recuperação de itens removidos.
- Revisão recebeu período semanal, destaque de tempo registrado, progresso circular de conclusão, comparação com a semana anterior, métricas explicadas e distribuição proporcional por categoria.
- O acabamento “Vidro & Papel” foi uniformizado em Meu dia, calendário, notas, busca, preferências e lixeira, incluindo estados vazios, hierarquia, foco, superfícies e comportamento responsivo.
- Ícones do sistema substituem glifos soltos nas ações de voltar e fechar notificação.
- A validação automatizada e manual desta rodada ficou deliberadamente para depois, a pedido do usuário. Não houve commit nem push desta etapa.
