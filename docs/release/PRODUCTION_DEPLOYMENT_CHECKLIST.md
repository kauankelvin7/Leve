# Checklist de implantação em Vercel — Leve

Auditoria do código em `feat/gika-integration` no checkpoint Glass `e258348c335b584173da7392cac2839d8ad1072c`. Este documento não configura Vercel/Firebase, não altera segredos e não autoriza deploy. Nenhum valor secreto é registrado aqui.

## Variáveis Vercel

Configure os nomes e valores no painel da Vercel, nunca em commits, logs ou `VITE_*` quando forem segredos. Use escopos separados. Produção deve apontar somente para o projeto Firebase de produção; Preview deve apontar para um projeto Firebase isolado, com regras equivalentes e dados sintéticos. Para cada escopo, `FIREBASE_PROJECT_ID` e `VITE_FIREBASE_PROJECT_ID` têm de identificar o mesmo projeto.

| Variável | Classificação | Production | Preview | Efeito e requisito |
| --- | --- | --- | --- | --- |
| `FIREBASE_PROJECT_ID` | Required | Sim | Sim | Server Admin falha na inicialização sem ela. Deve corresponder a `VITE_FIREBASE_PROJECT_ID` no escopo. |
| `FIREBASE_CLIENT_EMAIL` | Required no Vercel sem ADC funcional | Sim | Sim | Parte da credencial de Firebase Admin; somente server-side. |
| `FIREBASE_PRIVATE_KEY` | Required no Vercel sem ADC funcional; secret | Sim | Sim | Par de `FIREBASE_CLIENT_EMAIL`; somente server-side. O código aceita Application Default Credentials como alternativa, mas Vercel não deve depender disso sem identidade GCP configurada e verificada. |
| `VITE_FIREBASE_API_KEY` | Required | Sim | Sim | Configuração pública do Firebase Web, embutida no bundle; não é segredo. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Required | Sim | Sim | Domínio Auth do mesmo projeto Web. Preview usa `leve-preview.firebaseapp.com`, permitido explicitamente em `frame-src` e `connect-src` da CSP versionada. |
| `VITE_FIREBASE_PROJECT_ID` | Required | Sim | Sim | Projeto Firebase Web; deve corresponder ao `FIREBASE_PROJECT_ID` do mesmo escopo. |
| `VITE_FIREBASE_APP_ID` | Required | Sim | Sim | Identificador público do app Web. |
| `GEMINI_API_KEY` | Optional para o restante do serviço; required se Gika com Gemini estiver habilitada | Sim, se Gika habilitada | Sim, se Gika habilitada | Server-only. Sem ela, Gika retorna `GIKA_NOT_CONFIGURED`; a agenda convencional continua disponível. Manter o uso dentro do Free Tier aprovado; não habilitar billing/fallback pago. Nunca usar `VITE_GEMINI_API_KEY`. |
| `SCHEDULER_HMAC_SECRET` | Required para confirmações Gika e scheduler | Sim | Sim para confirmações Gika; worker opcional | Server-only na Vercel. O mesmo segredo compartilhado precisa estar no worker do scheduler. Sem ele, confirmações e `/api/internal/tick` falham fechadas. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Optional para login/dados; required para push FCM | Sim, se push habilitado | Sim, se push habilitado | Configuração pública do Firebase Web. |
| `VITE_FIREBASE_VAPID_KEY` | Optional para login/dados; required para push FCM | Sim, se push habilitado | Sim, se push habilitado | Chave pública VAPID do projeto Firebase correspondente; não é segredo. |
| `CORS_ORIGINS` | Optional | Só se houver cliente cross-origin | Só se houver cliente cross-origin | Lista separada por vírgulas de origens exatas, sem caminhos. Vazio/ausente deixa o uso same-origin funcionar e não concede CORS a outras origens. Configure domínios próprios de cada escopo se houver clientes externos. |
| `GIKA_DAILY_LIMIT` | Optional | Só se uma quota diária for deliberadamente desejada | Só se deliberada | Inteiro positivo por UID/dia UTC. Vazio/ausente significa **sem teto diário**; não existe default 10. A proteção padrão é 3 chamadas de interpretação em janela móvel de 60 segundos por UID. Uma consulta normal da Gika consome uma chamada; recovery/confirmação/ações já analisadas não chamam o modelo e não consomem essa quota. |
| `LOG_LEVEL` | Optional | Não precisa definir | Não precisa definir | Default de produção é `info`; valores aceitos são `debug`, `info`, `warn`, `error`. Preferir `info` ou mais restrito em produção. |
| `PUBLIC_RELEASE` | Optional | Recomendado | Recomendado | Versão semântica exibida por `/api/version`; prevalece sobre `VITE_APP_VERSION`. Não contém segredo. |
| `VITE_APP_VERSION` | Optional/legada | Não precisa se `PUBLIC_RELEASE` existir | Não precisa se `PUBLIC_RELEASE` existir | Fallback de `/api/version`; configurar apenas se o fallback for usado. |

### Variáveis antigas, locais ou não usadas

- `ALLOWED_ORIGINS` é **obsoleta**: não é lida pelo runtime. O nome correto é `CORS_ORIGINS`. Remover `ALLOWED_ORIGINS` dos escopos Vercel se estiver cadastrado.
- `VITE_USE_EMULATORS` só é lida com `import.meta.env.DEV`. Vercel Production e Preview são builds de produção (`DEV=false`), portanto essa variável **não ativa emuladores** nesses ambientes. Deixe ausente ou `false` nesses escopos. O servidor também aborta se os hosts de emulador forem injetados em Vercel/produção.
- `VITE_FIREBASE_STORAGE_BUCKET` e `VITE_FIREBASE_MEASUREMENT_ID` são permitidas pelo guard do Vite, mas não são lidas pelo código de runtime auditado; não são necessárias.
- `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `LEVE_RESET_SEED`, `LEVE_EPHEMERAL`, `LEVE_LOCAL_URL`, `SCREENSHOTS_URL`, `GLASS_*`, `NO_PROXY`, `NODE_USE_ENV_PROXY`, `JAVA_HOME` e `ProgramFiles` são de desenvolvimento/testes/harness; não configurar na Vercel.
- Não cadastrar `VITE_GEMINI_API_KEY`, `VITE_FIREBASE_PRIVATE_KEY`, `VITE_SCHEDULER_HMAC_SECRET` nem qualquer outro segredo com prefixo `VITE_`. O guard do Vite rejeita variáveis `VITE_*` que pareçam credenciais sensíveis, e qualquer configuração `VITE_*` entra no cliente.

## Firebase, scheduler e dados

- **Firebase Admin:** `server/platform/firebase.ts` requer `FIREBASE_PROJECT_ID` e seleciona credencial de service account quando o par `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` existe; caso contrário tenta ADC. Para Vercel, validar o par server-only como credencial operativa antes de release, salvo se uma identidade ADC externa estiver explicitamente configurada e testada.
- **Firebase Web:** as quatro variáveis required acima determinam Auth/Firestore no browser. A configuração Web é pública; isolamento depende de Rules e autorização server-side, não de ocultar a API key.
- **Rules/índices:** após publicar este checkpoint e atualizar as refs remotas, `firestore.rules`, `firestore.indexes.json` e `firebase.json` são idênticos entre `origin/feat/gika-integration` e `origin/main`. **Deploy de Rules/índices de produção: NO.** No `leve-preview`, ambos foram aplicados explicitamente com `--project leve-preview`, sem alterar produção. Revalidar se novos commits alterarem esses arquivos.
- **Migration:** existe `npm run migrate:notification-tokens`, que só aplica com `--apply`, é paginada e idempotente; migra tokens legados de `notificationDevices` para `notificationTokens` e remove o token legado. Na verificação read-only autorizada de `leve-db`, foi listada a coleção `notificationDevices` com projeção apenas do campo `token` e paginação, sem registrar valores: resultado **ZERO**. **Migration: NO** nesse snapshot. Nenhuma migration foi executada; revalidar apenas se o estado dos dados mudar.
- **Scheduler/HMAC:** `workers/scheduler` exige `SCHEDULER_HMAC_SECRET` e `LEVE_API_ORIGIN`; sem qualquer um, não chama a API. Configurar o segredo idêntico no worker e na Vercel, e `LEVE_API_ORIGIN` como origem HTTPS canônica da API. O endpoint verifica HMAC e timestamp de até cinco minutos; a Vercel não agenda esse worker pelo `vercel.json`.
- **Notificações:** o usuário pode usar o app sem push. Push depende de `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_VAPID_KEY`, HTTPS/Service Worker e permissões do navegador. Não há necessidade de migration de Rules/indexes para este checkpoint.

## Vercel, headers e runtime

- **Alterações manuais Vercel: YES.** Cadastrar/verificar as variáveis por escopo e seus projetos Firebase; manter Root Directory na raiz; framework Vite, `npm ci --include=dev`, `npm run build` e output `dist` já estão declarados em `vercel.json`. Definir/confirmar Node.js **24.x**, compatível com `.nvmrc` 24.0.2 e `engines` `>=24 <25`. Não configurar Preview para usar o projeto de produção.
- **CORS/origins:** deployment SPA + API é same-origin por padrão. Não inventar `ALLOWED_ORIGINS`. Para chamadas cross-origin, cada origem exata deve estar em `CORS_ORIGINS`; CORS não substitui autenticação Firebase.
- **Headers:** `vercel.json` define `nosniff`, HSTS (`max-age=31536000`), `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, Permissions-Policy e CSP (`frame-ancestors 'none'`). O backend também define `nosniff` e `no-store`; Vercel declara o mesmo `nosniff`, sem conflito funcional. A CSP autoriza os domínios Auth exatos `leve-db.firebaseapp.com` e `leve-preview.firebaseapp.com` em `frame-src`/`connect-src`; `accounts.google.com` já era permitido. Nenhum wildcard Firebase foi adicionado a `frame-src`. Não houve deploy do app ou alteração de headers de produção.
- HSTS é entregue pelo edge Vercel, não pelo Express local. O header vale para a origem HTTPS de cada deployment por um ano; não inclui subdomínios nem `preload`, então não afeta `localhost` nem força HTTPS local. Preview recebe HSTS somente no hostname exato de Preview.
- **PWA:** Service Worker é registrado apenas quando `import.meta.env.PROD` é verdadeiro; `/` e `/sw.js` têm cache no-store/no-cache para permitir updates. Sem variável Vercel adicional. Confirmar `/sw.js`, manifest e fluxo de update em smoke pós-deploy.

## Smoke pós-deploy e rollback

Antes de considerar release pronta, verificar sem publicar segredos: build e deployment associados ao SHA aprovado; Node 24.x; `/api/health` e `/api/version`; login/logout e sessão com conta sintética; isolamento por conta; comando create/edit/complete e export sem cruzar usuários; Gika read e resposta `GIKA_NOT_CONFIGURED` quando a chave estiver deliberadamente ausente (sem chamada upstream); CORS same-origin e rejeição de origem não autorizada; headers/CSP/HSTS; reminder tick com assinatura válida e inválida em ambiente controlado; notificações desativadas/habilitadas conforme capacidades; manifest/Service Worker e update; console/rejections; Preview sempre contra Firebase isolado. Não executar smoke que escreva em contas/dados reais sem processo autorizado.

Se qualquer smoke crítico falhar, interromper tráfego para o release e usar o mecanismo de rollback da Vercel para o deployment anterior conhecido como bom; manter o release atual acessível somente para investigação autorizada. Não reverter Rules/indexes pois este checkpoint não exige deploy deles. Rotacionar credencial apenas se houver evidência de exposição, preservando HMAC consistente no worker e API durante a rotação.

## Bloqueios e riscos residuais

- O painel Vercel não foi inspecionado; presença, valores, escopos e validade das variáveis precisam ser verificados por pessoa autorizada sem copiá-las para este repositório.
- Preview usa o projeto isolado `leve-preview`; a CSP foi ajustada por origem exata. Auth e variáveis Vercel ainda precisam ser concluídos antes do smoke hospedado.
- Tokens legados em `leve-db`: **ZERO** na leitura autorizada; não foi necessário executar migration.
- App Check não é verificado pela API. DDoS volumétrico, flood antes da função e rate limiting por IP dependem de controles do provedor/edge; Express não resolve esses riscos.
- Gika depende de quota/termos e disponibilidade do provedor Gemini; manter Free Tier e monitorar consumo/custos no provedor, sem incluir segredo em logs.
- HSTS/CSP só foram auditados no código/config versionado; ainda requer verificação de headers no deployment real após release autorizada.

### Resultado do preflight — 2026-10-04

- Firebase CLI 15.30.0 autenticada: `leve-preview` (Leve Preview) e `leve-db` foram identificados como projetos distintos. `leve-preview` permanece com `billingEnabled=false`; não foi vinculado billing.
- Web App Preview criado: **Leve Preview Web**, app ID `1:944230005668:web:efd2da46ed30cb1a925f31`, sender ID público `944230005668`, auth domain `leve-preview.firebaseapp.com`.
- Firestore Preview criado: `(default)`, Native/Standard, `southamerica-east1`, mesma região da produção. As Rules e os 10 índices do repo foram aplicados exclusivamente nesse projeto. Rules remotas idênticas ao arquivo local (SHA-256 `6951e7663938f90a57172b9ca92b731410e3ca7b87065d266aaa89ee5fbffa7b`). Verificação REST final: 10/10 índices equivalentes ao repo, todos **READY**.
- Firebase Auth ainda não foi inicializado: a configuração retorna `CONFIGURATION_NOT_FOUND`. O inicializador público de Identity Platform retornou `BILLING_NOT_ENABLED`; nenhuma operação de billing foi tentada. A API Identity Toolkit já estava habilitada. **Ação manual:** abrir Authentication no projeto `leve-preview`, clicar Get started no Firebase Auth padrão/Spark, habilitar Email/Password e Google; no Google selecionar o e-mail de suporte autorizado. Não fazer upgrade para Identity Platform pago. Depois adicionar o hostname exato do Preview Vercel aos Authorized domains, sem wildcard e sem usar o projeto de produção.
- Vercel CLI, link `.vercel` e credenciais Vercel continuam ausentes. Não foi possível ler/alterar variáveis Preview, confirmar o escopo de `GEMINI_API_KEY` nem executar smoke hospedado. O usuário informou que a chave Gemini já foi cadastrada na Vercel; sua presença por escopo continua **NOT_VERIFIED**, sem leitura/exibição de valor.
- HMAC Preview não foi criado/configurado porque não há destino Vercel autenticado. Ele precisa ser novo, aleatório e exclusivo de Preview; nunca copiar o HMAC de produção. É necessário na API mesmo sem worker para confirmações Gika. Se o scheduler Preview for usado, compartilhar somente entre API Preview e seu próprio worker, mantendo o worker atual intacto.
- Produção recebeu apenas leituras de metadados e a verificação projetada de tokens legados: **ZERO**. Nenhum dado real foi alterado, nenhum token foi registrado, nenhuma migration foi executada.
- CSP local/config versionada agora inclui `leve-preview.firebaseapp.com` por origem exata. Não houve deploy de app, alteração de produção, merge em `main` ou nova milestone.

### Preenchimento manual na Vercel — somente Preview

As seis variáveis públicas abaixo foram obtidas do Web App e estão também no artefato local ignorado `.cache/preflight/leve-preview-public.env` (sem segredos). Pode obter novamente a configuração pública por `firebase apps:sdkconfig WEB 1:944230005668:web:efd2da46ed30cb1a925f31 --project leve-preview`.

| Nome | Valor/origem para Preview |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `leve-preview` |
| `VITE_FIREBASE_PROJECT_ID` | `leve-preview` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `leve-preview.firebaseapp.com` |
| `VITE_FIREBASE_APP_ID` | `1:944230005668:web:efd2da46ed30cb1a925f31` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `944230005668` |
| `VITE_FIREBASE_API_KEY` | Configuração pública retornada pelo comando SDK acima/artefato local; não usar a chave Web de produção. |
| `FIREBASE_CLIENT_EMAIL` | Service account **do `leve-preview`**, via Firebase Settings → Service accounts; não reutilizar identidade administrativa de produção. |
| `FIREBASE_PRIVATE_KEY` | Chave privada dessa service account, inserida diretamente no Secret de Preview; não enviar pelo chat/commit/log. Nenhuma chave administrativa foi criada sem destino configurável. |
| `SCHEDULER_HMAC_SECRET` | Gerar no ambiente do operador com CSPRNG, pelo menos 32 bytes, e preencher diretamente como Secret Preview. Não reutilizar o valor Production. |
| `GEMINI_API_KEY` | Confirmar que a chave já cadastrada está no escopo Preview, server-only. Não alterar Production. |
| `VITE_FIREBASE_VAPID_KEY` | Somente se push for habilitado: gerar/obter a chave **pública** Web Push de `leve-preview` em Cloud Messaging. Não reutilizar VAPID de produção. Sem ela, push indisponível; login/dados continuam operacionais. |

Deixar `VITE_USE_EMULATORS` ausente/false e não cadastrar hosts de emulador na Vercel. `CORS_ORIGINS` não é necessário para SPA/API same-origin. `GIKA_DAILY_LIMIT` continua opcional e ausente por padrão.

### Validação final deste ajuste

- `npm audit --omit=dev --audit-level=moderate`: PASS, zero vulnerabilidades.
- `npm run lint`: PASS; `npm run build`: PASS, incluindo typecheck web/server. Permanece apenas o aviso já conhecido de chunks acima de 500 kB.
- Vitest focal: `deployment-csp`, `client-env`, `gika-character` e `gika-voice`, **25/25 PASS**. O novo teste protege as origens exatas de Auth, preserva produção e rejeita ampliação de `frame-src`/JS eval.
- Auth/Rules com emuladores `demo-leve`: `security-rules` + `identity`, **27/27 PASS**. Nenhuma conta de produção ou usuário real foi criado para testar configuração.
- CSP no Chromium: frames e `connect-src` de `leve-preview.firebaseapp.com` e `leve-db.firebaseapp.com` permitidos; frame de outro domínio Firebase bloqueado. Todas as requisições foram interceptadas/sintéticas; essa prova não contatou produção e não substitui login hospedado.
- Smoke hospedado Preview **BLOCKED** por Firebase Auth ainda não inicializado e falta de acesso Vercel. Nenhum resultado de login/Gemini/push hospedado é declarado PASS.

## Matriz exata de gates e decisões

| Item | Decisão neste checkpoint |
| --- | --- |
| Firebase Rules deploy | Produção **NO**; Preview **YES/APPLIED** — conteúdo equivalente ao repo. |
| Firebase Indexes deploy | Produção **NO**; Preview **YES/APPLIED** — 10/10 índices equivalentes ao repo, todos **READY**. |
| `firebase.json` deploy/config diff | **NO** — idêntico ao `main` remoto. |
| Migration de tokens | **NO** — resultado read-only **ZERO** em `leve-db`; não executada. |
| Manual Vercel | **YES** — confirmar Node 24.x e cadastrar/verificar variáveis Production/Preview conforme acima. |
| Deploy de app Firebase/Vercel | **NO**. Aplicação de Rules/índices autorizada exclusivamente em Firebase Preview. |
