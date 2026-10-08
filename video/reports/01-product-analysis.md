# Análise do produto Leve — Fase 1

Base auditada: `video/product-film`, commit `33707a4e72b863f1689113f51e95118a5568bebe` (HEAD fornecido pelo orquestrador). Esta análise é de leitura do produto e dos testes existentes; nenhum arquivo do produto foi alterado. O walkthrough Playwright foi executado em preview de produção local e com Firebase Emulator e seus resultados estão registrados abaixo.

## Mapa de rotas e acesso

`apps/web/src/app/App.tsx` é o registro de rotas. `/entrar`, `/registrar`, `/recuperar`, `/privacidade`, `/termos` e `/demo/*` são públicas. As rotas de produto ficam sob `Protected` e `Shell`: `/hoje`, `/calendario`, `/notas`, `/notas/:id`, `/compras`, `/compras/:id`, `/atividade/:id`, `/revisao`, `/buscar`, `/configuracoes` e `/lixeira`. `Protected` exige sessão Firebase, e-mail verificado, membership ativa e perfil com estado `active`; portanto, capturas autenticadas devem usar somente a conta seed fictícia do emulador.

| Tela | Rota / componente | Ação demonstrável e seletor acessível comprovado |
| --- | --- | --- |
| Meu dia | `/hoje`, `features/activities/Today.tsx` | Criar/consultar tarefas, selecionar data; `Nova atividade`, `Sua semana`, `Resumo do dia selecionado`. `tests/e2e-local/today-date-clarity.spec.ts` cobre a data civil e o estado selecionado. |
| Calendário | `/calendario`, `features/activities/Calendar.tsx` | Mês/Semana/Dia, seleção e edição de compromisso; `tests/e2e-local/calendar-planner.spec.ts` exercita o Planner. |
| Notas | `/notas`, `/notas/:id`, `features/notes/Notes.tsx`, `NoteDetail.tsx` | Editar e salvar nota, busca/vínculo; campos `Título`, `Texto`, ação `Salvar nota`, verificados em `tests/e2e-local/persistent.spec.ts`. |
| Compras | `/compras`, `/compras/:id`, `features/shopping/Shopping.tsx`, `ShoppingDetail.tsx` | Criar lista e adicionar/concluir item; `Nome da lista`, `Adicionar item`, cobertos em `persistent.spec.ts`. |
| Gika | lançada no `Shell` por `GikaLauncher`; painel `features/gika/GikaPanel.tsx` | Perguntar e receber proposta; seletor `Pergunte à Gika`, coberto em `gika.spec.ts` e `gika-notifications.spec.ts`. A execução do modelo upstream não está comprovada pelos E2E existentes. |
| Preferências | `/configuracoes`, `features/settings/Settings.tsx` | Aparência, acessibilidade, aparelho, notificações, exportação/importação e exclusão da conta. |
| Lixeira | `/lixeira`, `features/trash/Trash.tsx` | Restaurar ou expurgar conteúdo; cobertura de fluxo em `persistent.spec.ts` e `recurrence-options.spec.ts`. |
| Páginas legais/erro | `/privacidade`, `/termos`, rota não encontrada | Composição pública; `tests/e2e-local/public-pages.spec.ts` valida headings, Axe e snapshots desktop/mobile. |

`/demo/*` tem implementação isolada em `features/demo/Demo.tsx`; ela é uma demonstração local simplificada e não deve servir de evidência de persistência, autenticação, sincronização, Gika ou backend real. A rota genérica `*` mostra o estado 404.

## Ambiente local para captura

O fluxo apropriado é `npm run dev` (`scripts/dev-local.mjs`): prepara `demo-leve`, aponta Auth e Firestore para `localhost:9099`/`localhost:8080`, inicia a API e o Vite em `localhost:5174`, e persiste os dados dos emuladores em `.cache/firebase-data` por padrão. `LEVE_EPHEMERAL=true` desativa import/export persistente do estado de emulador. `npm run seed:local` (`scripts/seed-local.mjs`) cria/atualiza `leve.local@example.test` com senha exclusivamente local de teste e conta verificada; `LEVE_RESET_SEED=true` apaga e recria os documentos desta conta no emulador. A senha de seed não é credencial válida fora do ambiente local e não deve aparecer em capturas.

`playwright.local.config.ts` usa `http://localhost:5174`, inicializa `tests/e2e-local/setup.ts` (que chama o seed com reset) e configura `GEMINI_API_KEY=''`, segredo efêmero do scheduler e o servidor local. Para build de produção e teste do service worker, `npm run build` produz `dist` e preenche `PRECACHE_ASSETS`; depois `npm run preview` serve o build. A configuração local de desenvolvimento não instala o worker automaticamente, porque `main.tsx` registra `/sw.js` apenas em `import.meta.env.PROD`.

Validação executada pelo orquestrador: `corepack npm run build` passou. `corepack npm run glass:e2e -- public.spec.ts` passou 14/14; o teste de worker instalou/cacheou o shell e bundles, mudou o contexto para offline e recarregou `/entrar` com status 200 e formulário visível. Isso comprova fallback público após cache, não instalação inicial desconectada nem uma sessão privada.

`corepack npm run test:e2e:local -- persistent.spec.ts --grep 'duas abas sincronizam'` passou 1/1 no Firebase Emulator com conta fictícia. O teste autentica online, consulta Meu dia, salva/consulta nota e lista de compras, corta endpoints e recarrega mantendo os três dados visíveis; em seguida deixa `leve.offlineEnabled` ausente, cria tarefa sem rede, confirma mensagem da outbox, restaura conexão e verifica sincronização nas duas abas. É evidência para o caminho exercitado no navegador e no aparelho de teste; não prova retenção permanente contra limpeza/evicção do armazenamento, todos os formatos de dado, primeiro uso sem internet, nem push offline. Nenhum `.env`, Gemini real, segredo ou serviço de produção foi acessado.

## Gika: contrato, limites e uso em filme

- A UI chama `POST /api/gika/respond` por `features/gika/apiAdapter.ts::createApiAdapter`. O envelope público é `packages/domain/src/gika.ts::gikaRequestSchema`: `requestId` UUID, texto até 2.000 caracteres e até 12 turnos de conversa (cada um até 1.000 caracteres). `gikaResponseSchema` valida resposta discriminada e impõe que respostas de conversa não tragam leituras/efeitos.
- `server/app.ts` autentica o Firebase ID token antes de montar o router Gika. `server/gika/router.ts::createGikaRouter` revalida conta/membership pela camada `repository.authorize`, aplica quota, verifica o modelo e as propostas e, quando necessário, relê os dados antes de montar preview/descritor. Gika não grava diretamente no Firestore: os bridges do cliente convertem descritores em comandos existentes (`apiAdapter.ts`, `commandBridge.ts`, `completionBridge.ts`, `updateBridge.ts`, `rescheduleBridge.ts`, `batchBridge.ts`); mutações seguem a API autenticada `/api/commands`.
- O adapter padrão é `server/gika/gemini.ts::createGeminiAdapter`. Ele chama o Gemini `gemini-3.5-flash-lite` por HTTPS com `GEMINI_API_KEY` no cabeçalho, prazo limitado e validação do retorno. A chave é server-side. Não há prova de disponibilidade de chave/serviço upstream nesta auditoria; E2E usa respostas controladas/interceptadas ou mocks. Assim, não apresentar a fala capturada como resultado ao vivo. Uma cena de conversa só pode ser classificada `INTERCEPTADA` depois de contrato e fixture exata documentados pelo capturador.
- A implementação cobre consultas limitadas, criação simples de tarefa/lista vazia, conclusão, renomeação, reagendamento com prévia, propostas de organização e lotes restritos. A política de chamadas está definida em `server/gika/gemini.ts::geminiPayload`; validação de ação está no `server/gika/router.ts`, `semanticTurn.ts` e policies. Não prometer conversa geral, criar notas, gerenciar itens de compra, avisos contínuos, criação de séries ou execução automática de organização.
- Dados enviados ao provedor variam pelo fluxo: texto atual/histórico limitado vai como conteúdo do payload; o caminho de organização envia à interpretação as tarefas candidatas em `input.planning` (ver `geminiPayload`, ramo `input.planning`). Não afirmar que o conteúdo digitado “nunca sai do Leve” ou que a Gika é integralmente local.
- E2E `tests/e2e-local/gika-notifications.spec.ts` cria conta no emulador e injeta apenas a resposta Gemini, mantendo router, Auth/Firestore, comandos e jobs reais. É evidência útil de integração da UI com o contrato e comando, mas não mede qualidade, latência, disponibilidade ou taxa de acerto do Gemini real. `tests/integration/gika-semantic.test.ts` testa semantic turn com resposta simulada pelo teste. `tests/unit/gika-gemini.test.ts` cobre ausência de chave/retorno inválido por fixtures.

## Persistência, offline, service worker e outbox

O código atual difere da documentação de produto ainda versionada. `AGENTS.md`, `README.md` (“Desativado por padrão”) e o trecho histórico vigente em `CONTINUAR.md` descrevem offline opt-in; o comportamento atual de `apps/web/src/platform/outbox.ts::offlineEnabled` é habilitado por padrão e só desabilita com `localStorage['leve.offlineEnabled'] === 'false'`. `Settings.tsx::changeOffline` conserva um opt-out por aparelho. Tratar isso como divergência documental real, não como prova de que UX está coerente.

- Shell: `apps/web/public/sw.js` precacheia `/`, tema, manifest, ícones e — no build de produção — os bundles produzidos por `apps/web/vite.config.ts::offlinePrecachePlugin`. Fallback de navegação desconectada retorna a página raiz já cacheada. Assets same-origin são colocados em cache após fetch; `/api/**` não é interceptado pelo worker. Worker é registrado em `apps/web/src/main.tsx` somente na build de produção.
- Dados: `apps/web/src/platform/firebase.ts::createFirestore` ativa cache persistente Firestore/IndexedDB quando offlineEnabled; as telas assinam queries Firestore em `features/content/useLiveQueries.ts` e `useUserCollection.ts`. Isso só sustenta conteúdo que o aparelho já consultou e manteve em cache. Não equivale a baixar automaticamente todo o histórico da conta nem garante conteúdo nunca aberto. A API de comandos continua online; fallback de gravação usa outbox, não um servidor acessível offline.
- Sessão: `AuthProvider.tsx::refresh` só usa sessão de IndexedDB (`readCachedSession`) quando falha de rede e mesma UID, membership e conta ativa estão armazenadas. Logout chama `clearLocalData(uid)`, limpa cache de query e tenta terminar/limpar persistência Firestore, antes de sair.
- Escritas: `api.ts::sendCommand` guarda comandos queueable e não pertencentes a `account.*` após `NETWORK_ERROR`; `outbox.ts::queueCommand` usa IndexedDB com chave `${uid}:${operationId}`; `flushOutbox` reenvia em ordem, usa liderança entre abas e remove ack. Conflitos interrompem o flush e emitem status; operações antigas (>72h) pedem reconciliação por recibo (`outboxPolicy.ts`). `OutboxStatus.tsx` comunica contagem e sincronização. Nem todo tipo de comando pode ser guardado (remoção e conta/exclusão sem rede não são promessa segura).
- Apresentação: `OfflineStatus.tsx` mostra faixa “Modo offline”/“Conexão restaurada”; a mensagem diz que tarefas, notas e compras já sincronizadas continuam disponíveis. O fluxo E2E autenticado confirmou recarga offline com sessão/dados previamente consultados, gravação de uma atividade pendente e sincronização pós-reconexão. O teste de preview de produção confirmou a abertura do shell público após instalar o worker/cachear assets. Isso não garante primeiro uso desconectado, download de todo histórico, retenção após o navegador limpar o IndexedDB, nem que todas as operações sejam enfileiráveis.
- Evidência de teste: `tests/e2e-local/persistent.spec.ts::duas abas sincronizam, preservam alteração offline e encerram a mesma sessão`; `tests/e2e-local/calendar-planner.spec.ts::alteração offline bloqueia novos gestos até sair da outbox e sincronizar`; `tests/unit/pwa-worker.test.ts` valida manipulação push/click do worker, não navegação offline; `tests/unit/outbox-policy.test.ts` valida política de reconciliação. O E2E Planner hoje seta `leve.offlineEnabled=true` explicitamente, então não prova default na ausência de configuração.

## Privacidade, isolamento, exportação e exclusão

- Isolamento: `firestore.rules` restringe leituras ao próprio UID, membership ativa, conta ativa, e-mail verificado e listas com `limit <= 50`; nega escrita direta em todas as coleções. `server/access-control.ts::requireActiveVerifiedAccount` repete os gates para rotas Admin SDK. `tests/integration/security-rules.test.ts` cobre UID cruzado, query sem limite/limite acima de 50, escrita direta, e-mail não verificado e membership suspensa; `identity.test.ts::permite leitura própria limitada e impede leitura ou escrita cruzada` cobre emuladores/API.
- Exportação: Preferências chama `/api/account/export`. `server/account-data.ts::exportAccount` exporta perfil público do archive e pagina categorias, atividades, timeEntries, séries, notas, listas e itens; verifica `dataVersion` antes de responder para evitar export inconsistente. `persistent.spec.ts::exportação pessoal volta pela importação sem substituir os dados atuais` cobre fluxo de UI. A página Privacy apresenta controles correspondentes.
- Importação: `Settings.tsx::selectImport/importArchive` limita arquivo a 5 MB e mostra contagem; backend valida schema e referências e mapeia IDs à cópia do UID (`server/account-data.ts::importAccount`), com limites e retomada. Importação não sobrescreve dados existentes.
- Exclusão: UI exige confirmação explícita e reautenticação (senha ou popup Google) em `Settings.tsx::deleteOwnAccount`; backend exige login recente, valida UID, marca conta `deleting` e executa rotina retomável `completeAccountDeletion` que apaga dados/índices, membership e usuário Auth. `server/app.ts` retoma jobs no tick interno. `tests/integration/identity.test.ts` cobre exclusão do proprietário e remoção de dados; não afirmar tempo instantâneo para grandes contas.
- Limite de claims de privacidade: não há evidência nesta inspeção para “não vendemos dados”, “não há publicidade/analytics em toda a hospedagem” ou política de retenção dos provedores. A UI legal declara isso, mas declaração de interface sozinha não prova comportamento operacional. Também não alegar que Gemini não recebe texto/contexto (ver seção Gika).

## Notificações: contrato e limites

`server/reminder-jobs.ts::reminderJobsForActivity` gera job automático `at-time` para atividade datada com instante de aviso, mesmo quando usuário não escolhe antecedências; as antecedências são limitadas a três pelo schema de domínio. Tarefa sem hora/dia inteiro usa `activityReminderInstant` em `packages/domain/src/content.ts` e a regra atual de 09:00 no fuso da atividade (não cria horário visível no compromisso). `server/reminders.ts::processReminderTick` processa jobs e tokens registrados; scheduler fica em `workers/scheduler/src/index.js`. A integração valida jobs e regras, por exemplo `identity.test.ts::agenda aviso automático para atividades com horário sem exigir seleção manual` e `identity.test.ts::agenda dia inteiro às 9h...`.

O navegador precisa suporte, permissão concedida, VAPID pública configurada, token FCM ativo e serviço/scheduler; `NotificationSettings.tsx::enable` testa essas condições. `sw.js` tem identidade e ação visual da notificação, mas a entrega em aparelho real e apresentação definida pelo Android/Chrome não foram testadas nesta Fase 1. Classificar tela de exemplo local como `REAL + DETERMINÍSTICA` e push recebido como `PROIBIDA` até teste em dispositivo real, salvo se captura tratar claramente exemplo manual.

## Candidatas e cenas proibidas para o filme

| Candidata | Classe auditada | Base / condição |
| --- | --- | --- |
| Meu dia, resumo, tarefa real seed | `REAL + DETERMINÍSTICA` | UI/CRUD reais; seed fictício, data civil e hora controladas. Confirmar em walkthrough. |
| Calendário | `REAL + DETERMINÍSTICA` | UI e Planner reais, data/seed controladas; fluxo coberto pelo E2E local. |
| Nota editada/salva | `REAL + DETERMINÍSTICA` | Editor/persistência verdadeiros; conteúdo fictício e seed. |
| Compras | `REAL + DETERMINÍSTICA` | Lista/item verdadeiros; conteúdo fictício. |
| Gika respondendo/criando | `INTERCEPTADA` | Router, schema, bridges e comando podem ser reais, mas resposta Gemini é fixture nos E2E. Mostrar como interpretação determinística somente; não dizer “ao vivo”. Confirmar que a captura preserva essa interceptação. |
| Estado offline + sincronização | `REAL + DETERMINÍSTICA` | Preview de produção valida recarga do shell público depois do cache do SW; E2E autenticado no Emulator valida conteúdo previamente consultado, outbox sem preferência explicitamente definida e sincronização após reconectar. Capturar os dois fluxos separadamente e não prometer primeiro uso desconectado nem histórico completo. |
| Push no aparelho | `PROIBIDA` por ora | Requer prova de serviço e aparelho; exemplo manual não prova entrega agendada. |
| Exportação/privacidade/exclusão | capability verificável, não narrativa central | Implementações e testes existem; não expor telas/dados reais, não prometer não uso de conteúdo por terceiros, nem tempo de expurgo. |
| `/demo/*` | `PROIBIDA` como prova de produto | Mock simplificado, sem backend/autenticação persistente. |

Exclusões explícitas: qualquer conta/email não `@example.test` ou seed local fictício; qualquer segredo, token, cookie, URL com credencial, console ou DevTools; conteúdo de usuário; afirmar Gika como LLM ao vivo; afirmar sincronização offline de todo dado; afirmar push em aparelho; dizer que o Leve não coleta/compartilha/vende dados sem evidência operacional; prometer aviso contínuo, gestão completa de compras pela Gika ou capacidades de notas/recorrência que o contrato Gika não oferece.

## Gate 1

Arquitetura de UI, rotas, contratos de código e escopo dos testes estão documentados. Auth/seed local está entendido pelo código e fixtures. Gika está entendida no nível de contrato e sua dependência upstream está delimitada. Offline foi verificado em preview de produção (shell após cache), e2e autenticado (dados previamente consultados em cache, criação enfileirada sem preferência configurada, sincronização após reconexão) e build. A divergência documental opt-in versus implementação padrão continua real e deve ser registrada como dívida do produto, porém não impede a demonstração do estado atual. Ficam fora da claim: primeiro uso sem internet, todo histórico, durabilidade contra evicção e entrega de push em aparelho.

STATUS:
DONE — Gate 1 aprovado com escopo offline limitado às evidências documentadas.

ARTEFATOS:
- `video/reports/01-product-analysis.md`
- `video/reports/claims-ledger.md`

VALIDADO:
- Branch e HEAD auditados: `video/product-film` / `33707a4e72b863f1689113f51e95118a5568bebe`.
- Rotas conferidas em `apps/web/src/app/App.tsx`.
- Autorização, API, Gika, worker, offline/outbox e account-data conferidos nos arquivos citados e nos testes listados.
- Nenhum serviço/conta de produção/segredo acessado; nenhum código do Leve alterado.

PROBLEMAS:
- README, AGENTS e texto de continuidade ainda dizem opt-in, mas outbox/firebase/settings implementam offline ativo por padrão com opção para desligar.
- O fluxo autenticado sem rede foi testado em dev + Firebase Emulator; o fluxo de worker foi testado no preview de produção de forma separada, sem perfil privado. Não se deve combinar as duas provas como se fosse um único teste de sessão autenticada de produção.
- Gemini real e push real em aparelho não verificados; não podem ser alegados como capturados ao vivo.
- Claims “não vendemos dados” e “conteúdo não vai ao Gemini” sem evidência suficiente.

RECOMENDAÇÃO:
- Permitir cena offline limitada como `REAL + DETERMINÍSTICA`, mostrando dado previamente consultado, gravação em outbox e reconexão; manter Gika como `INTERCEPTADA` se entrar no filme e excluir push real/claims amplos de privacidade.
