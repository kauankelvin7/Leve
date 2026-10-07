# Estado do repositório — fase 0

**Data:** 2026-10-07 (America/Sao_Paulo)
**Escopo:** filme de produto Leve, branch isolada; relatório de estado anterior à implementação do vídeo.

## Handoff — ORQUESTRADOR / Fase 0

**STATUS:** DONE
**ARTEFATOS:**
- `video/reports/00-repository-state.md`
- `video/.gitignore`

**VALIDADO:**
- Inspeção inicial sem `git status --short` local ou changes staged; branch inicial `main` no SHA `a7ced99d2cbadf93c82538096c227c8e598d669c`.
- `git fetch origin main` encontrou avanço remoto `33707a4e72b863f1689113f51e95118a5568bebe` (`chore(security): harden repository controls`, 2026-10-07 15:07 -03:00; sete arquivos de segurança/governança). Nenhuma alteração local concorrente.
- Criada `video/product-film` diretamente em `origin/main`; `HEAD` confirmado no SHA acima. `git status` limpo antes deste relatório.
- `AGENTS.md`, `README.md`, `DESIGN.md`, `CONTINUAR.md` e `package.json` lidos. Regras relevantes: preservar código/dados; não usar reset/force-push; mudanças de produto precisam permanecer no contrato do app; manter branch/commit atômicos; testes não podem ser alegados sem execução. O usuário autorizou branch e a entrega de vídeo, não publicação/deploy.
- Runtime: Node `v24.19.0`; npm global `11.9.0`, enquanto `package.json` fixa `npm@11.19.1`. `corepack npm --version` entrega o pin `11.19.1` e foi usado no build/testes. Playwright `1.63.0`; Chromium for Testing `153.0.8010.12`, instalado em `/home/agent/.cache/ms-playwright/chromium-1243`; FFmpeg/FFprobe `7.1.5` (`/usr/bin/ffmpeg`, `/usr/bin/ffprobe`).
- Disco: filesystem de 32 GiB, 28 GiB livres; checkout 1004 MiB. Headroom adequado a capturas/render moderados; monitorar antes do render final.
- Monorepo npm tem somente workspace `apps/web`. `video/` não consta como workspace; usar manifesto/lockfile isolados e não tocar `package.json` ou `package-lock.json` da raiz.
- Scripts confirmados em `package.json`: `dev` inicia emuladores/API/Vite (`scripts/dev-local.mjs`), `seed:local`, `build`, `preview`, `test` (Vitest), `test:integration` (Auth/Firestore Emulator) e `test:e2e:local` (Playwright Chromium local). `scripts/screenshots.ts` existe e será avaliado na Fase 1.
- `.gitignore` já ignora `node_modules`, `dist`, `.env*`, resultados Playwright/logs e Firebase exports; não ignorava os dois diretórios grandes requeridos pelo filme. `video/.gitignore` cobre somente capturas e renders gerados, evitando binários acidentais sem ampliar a alteração fora de `video/`.
- `AGENTS.md` proíbe credenciais/dados reais e exige evidência; o documento anexado reforça `@example.com`, ambiente local/emuladores, sem `.env`, tokens ou produção. O host tem binários Playwright e FFmpeg, mas versões/configuração de produção não são evidência do comportamento do produto.

## Riscos operacionais conhecidos

1. O npm global difere da versão declarada, mas o caminho suportado por Corepack foi confirmado: `corepack npm --version` = `11.19.1`; build e testes foram rodados por esse caminho. Não atualizar manifesto/lockfile raiz.
2. `README.md` afirma que o uso offline está desativado por padrão, enquanto o código atual `apps/web/src/platform/outbox.ts` habilita por padrão salvo opt-out explícito. Tratar README como fonte histórica/inconsistente e confirmar comportamento em implementação/testes antes de qualquer claim; o backend/app não será alterado para produzir o filme.
3. O README também aponta produção como referência, mas nenhuma captura deste trabalho pode usar produção. Usar exclusivamente app local, emuladores e contas/dados fictícios.
4. A árvore remota atual inclui hardening de segurança recente; os relatórios subsequentes baseiam-se no conteúdo de `33707a4`, não no antigo checkout `a7ced99`.
5. A skill de onboarding foi lida por se tratar do ambiente Codex. Não exige alteração da configuração ambiental: browser, runtime e FFmpeg já estão instalados. Não foi salvo draft de setup; publicação ambiental não faz parte do pedido.

**PROBLEMAS:** documentação offline divergente do runtime. O pin de npm foi resolvido usando Corepack; a divergência documental permanece registrada para o produto.
**RECOMENDAÇÃO:** Fase 1 concluída; usar apenas claims rastreados em código/testes e manter os limites de escopo offline/Gika registrados.

## Validação executada durante Fase 1

- `corepack npm run build`: passou; typecheck cliente/servidor e build Vite de produção concluídos. O aviso de chunk grande não bloqueia o build.
- `corepack npm run glass:e2e -- public.spec.ts`: 14/14 passaram. Inclui isolamento das rotas privadas sem sessão, assets do PWA e uma recarga offline no preview de produção após cache do service worker. A navegação offline aqui é após instalação/cache inicial, não primeiro uso sem conexão.
- `corepack npm run test:e2e:local -- persistent.spec.ts --grep 'duas abas sincronizam'`: 1/1 passou no fluxo local com emuladores e conta fictícia. Mostra conteúdo consultado em Meu dia/Notas/Compras após perder rede e recarregar, cria tarefa sem rede com offline padrão (`leve.offlineEnabled` ausente), exibe outbox, sincroniza e atualiza outra aba quando a rede volta.
- Nenhum teste/serviço acessou produção ou Gemini upstream; `GEMINI_API_KEY` permaneceu vazia. O preview não autentica um perfil real; o teste autenticado usa unicamente Firebase Emulator.

**STATUS FASE 0:** DONE. Ambiente e fluxo suportado de dependências confirmados; relatório atualizado com validações da Fase 1.
