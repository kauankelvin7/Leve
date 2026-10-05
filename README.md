<h1 align="center">Leve</h1>

<p align="center">
  Agenda pessoal que não perde o que você escreveu.<br>
  Atividades, calendário, notas e compras em um espaço privado, no celular e no desktop.
</p>

<p align="center">
  <a href="https://leve-agenda.vercel.app"><strong>Ver aplicação →</strong></a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-instal%C3%A1vel-5A0FC8?logo=pwa&logoColor=white">
  <img alt="Licença MIT" src="https://img.shields.io/badge/licen%C3%A7a-MIT-green">
</p>

![Leve — entrada desktop](docs/screenshots/desktop.png)

<p align="center">
  <img src="docs/screenshots/mobile-1.png" width="30%" alt="Agenda no celular">
  <img src="docs/screenshots/mobile-2.png" width="30%" alt="Notas no celular">
  <img src="docs/screenshots/mobile-3.png" width="30%" alt="Compras no celular">
</p>

---

## Sumário

- [A proposta](#a-proposta)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Decisões de engenharia](#decisões-de-engenharia)
- [Como executar](#como-executar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testes e verificação](#testes-e-verificação)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Segurança e operação](#segurança-e-operação)
- [Privacidade e acessibilidade](#privacidade-e-acessibilidade)
- [Status do projeto](#status-do-projeto)
- [Autor](#autor)
- [Licença](#licença)

---

## A proposta

Aplicativos de agenda costumam falhar exatamente quando você mais precisa deles: no metrô sem sinal, com duas abas abertas, no meio de uma edição. O resultado é sempre o mesmo — a alteração some, ou uma versão sobrescreve a outra em silêncio.

O **Leve** foi construído a partir de uma premissa oposta: **perder dado do usuário é o pior defeito possível**, e todo o resto da arquitetura se subordina a isso.

Na prática, isso significa três compromissos:

**1. Nenhuma escrita acontece sem o servidor validar.**
O cliente nunca grava direto no banco. Toda mutação vira um comando com identificador próprio, entidade estável e revisão esperada. Se o comando chegar duas vezes — retry de rede, clique duplo, reconexão — ele só produz efeito uma vez.

**2. Conflito não é resolvido por sorte.**
Quando duas sessões editam a mesma nota, o sistema não aplica "a última vence". Ele detecta a divergência de revisão e preserva o conteúdo concorrente para que você decida.

**3. Ficar offline não pode custar trabalho.**
Alterações feitas sem conexão vão para uma outbox local e sincronizam quando a rede volta. Nada é descartado no caminho, e a interface diz o que está pendente em vez de fingir que salvou.

Somado a isso, é um sistema de uso pessoal: os dados são isolados por conta, exportáveis em JSON versionado e apagáveis de verdade — incluindo a exclusão completa da conta.

---

## Funcionalidades

| Área | O que faz |
| --- | --- |
| **Agenda** | Tarefas e compromissos (com horário ou dia inteiro), pendências atrasadas e visão de calendário |
| **Recorrência** | Diária, semanal e mensal, editando uma ocorrência ou todas as futuras |
| **Notas** | Editor limitado e seguro, vínculos, fixação e busca |
| **Compras** | Listas, quantidades, modelos e ciclos |
| **Organização** | Categorias com criação, edição, arquivamento e lixeira |
| **Recuperação** | Lixeira, expurgo e exclusão de conta retomável |
| **Portabilidade** | Exportação JSON versionada; importação entra como cópia, sem sobrescrever |
| **PWA** | Instalável, com notificações configuráveis por aparelho |
| **Offline** | Cache privado e outbox local, ativados manualmente |

### Uso offline

Desativado por padrão, por ser um dado sensível guardado no aparelho. Ative em **Preferências → Aparelho → Uso offline** enquanto estiver conectado e abra as áreas que quiser consultar depois. A partir daí, a sessão e os dados já carregados funcionam sem internet; novas alterações entram na outbox e sincronizam na reconexão.

O primeiro acesso e a ativação do modo offline precisam acontecer online.

---

## Arquitetura

```
Navegador (React 19 + TS)
   │
   ├── Firebase Auth ──────────── e-mail/senha ou Google
   │
   └── POST /api/commands ─────── Express 5 (token Firebase obrigatório)
                │
                ├── validação com schemas de packages/domain (Zod)
                ├── autorização por UID + membership
                └── Firestore  ◄── Rules negam escrita direta do cliente

Worker (cron) ── tick assinado por HMAC ──► /api  (recorrência, avisos, limpeza)
```

| Camada | Escolha | Papel |
| --- | --- | --- |
| Web | React 19 + TypeScript + Vite | Aplicação responsiva e PWA |
| Identidade | Firebase Authentication | E-mail/senha e Google, sessão persistente |
| Dados | Firestore | Coleções privadas por UID e membership |
| API | Express 5 | Único ponto de escrita, via `POST /api/commands` |
| Domínio | `packages/domain` (Zod) | Schemas e regras compartilhados entre cliente e servidor |
| Agendamento | Worker com tick HMAC | Recorrência, invalidação de avisos e limpeza paginada |

---

## Decisões de engenharia

**Um único caminho de escrita, em vez de CRUD por endpoint.**
Toda mutação passa por `POST /api/commands`. Validação, autorização, idempotência e registro ficam concentrados em um lugar só. O custo é uma API menos "REST", com discriminador de tipo no payload e menos legibilidade para quem espera rotas por recurso.

**Schemas compartilhados em vez de validação duplicada.**
Cliente e servidor importam o mesmo pacote de domínio. Uma regra de negócio muda em um arquivo, não em dois — e o TypeScript acusa a divergência em build.

**Revisão esperada em vez de last-write-wins.**
Cada comando declara a revisão que espera encontrar. Se não bater, o servidor recusa e devolve o estado concorrente. É mais trabalho na interface, mas elimina a classe inteira de bugs de sobrescrita silenciosa.

**Offline como opt-in, não como padrão.**
Cache local significa dados pessoais gravados no aparelho. A escolha é do usuário, feita de forma explícita e reversível.

**Tudo em plano gratuito.**
Vercel Hobby, Firebase Spark e Worker gratuito. Restrição assumida desde o início, e ela moldou decisões reais — paginação na limpeza, leases no scheduler e cuidado com leituras no Firestore.

---

## Como executar

Requer **Node.js 24.x** e **npm 11.19.1**. O campo `packageManager` fixa a versão e o CI verifica divergências.

```sh
corepack enable
npm ci
npm run dev
```

`npm run dev` sobe Auth Emulator, Firestore Emulator, API e Vite juntos. Em outro terminal:

```sh
npm run seed:local
```

Depois abra `http://localhost:5174/entrar` e use as credenciais fictícias impressas pelo seed.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Emuladores + API + Vite (ambiente completo) |
| `npm run dev:web` | Só o Vite; exige uma API separada em `localhost:8788` |
| `npm run seed:local` | Popula os emuladores com dados fictícios |
| `npm run preview` | Serve o `dist` já buildado |
| `npm run screenshots` | Regera as imagens de `docs/screenshots/` |

> O Auth Emulator não envia e-mails reais. No cadastro local, a tela de verificação oferece **Confirmar neste ambiente**, que consome apenas o código de teste do emulador. Fora do modo local, o Firebase envia o link normalmente.

---

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha antes de usar o Firebase fora dos emuladores. Arquivos `.env*` não são versionados.

| Variável | Onde vive | Observação |
| --- | --- | --- |
| `VITE_FIREBASE_*` | Cliente | Vai para o bundle e **é pública** — só configuração do app Web |
| Credenciais de servidor | Servidor | **Nunca** use o prefixo `VITE_`, ou o segredo vaza no build |
| `CORS_ORIGINS` | Servidor | Origens aceitas pela API. Sem valor, só o mesmo domínio |
| `LOG_LEVEL` | Servidor | `debug` em desenvolvimento, `error` em produção |

---

## Testes e verificação

```sh
npx playwright install chromium

npm run lint
npm run typecheck
npm run build
npm test
npm run test:integration
npm run test:e2e:local
```

`npm run check` encadeia build, testes unitários e E2E.

| Camada | O que cobre |
| --- | --- |
| Unitários | Regras de domínio, recorrência e utilitários |
| Integração | Emuladores reais — retomada de importação, leases e contas concorrentes |
| E2E (Playwright) | Duas abas, reconexão da outbox, conflito de notas, reflow, Axe e exportação/importação |

Relatório E2E em `playwright-report/index.html`; traces de falha em `test-results/`.

**Fora do automatizado:** push com o app fechado, leitor de tela externo e instalação em aparelho físico exigem validação manual.

---

## Estrutura do repositório

| Caminho | Responsabilidade |
| --- | --- |
| `apps/web/src/app` | Rotas, shell e providers |
| `apps/web/src/features` | Identidade, agenda, notas, compras e preferências |
| `apps/web/src/platform` | Firebase, API, tema, outbox e PWA |
| `api/` | Entrypoint HTTP da API |
| `server/` | Comandos, autorização, repositórios e jobs |
| `packages/domain/` | Schemas e regras compartilhadas |
| `workers/scheduler/` | Tick HMAC |
| `scripts/` | Dev local, seed, screenshots e migrações |
| `tests/` | Unitários, integração e navegador |
| `docs/` | ADRs, runbooks e evidências |

---

## Segurança e operação

- Dados isolados por UID e membership; escrita direta do cliente é negada pelas Rules.
- Comandos idempotentes por `operationId`; conflitos preservam o conteúdo concorrente.
- Logs estruturados com redação de segredos — nunca devem conter tokens, cookies, senhas ou conteúdo privado.
- CSP permite recursos próprios e restringe scripts externos do login Google a `apis.google.com` e `accounts.google.com`.
- `vercel.json` faz build na raiz (não em `apps/web`), saída em `dist`, com rewrites apenas das rotas previstas — `/api/*` e `/assets/*` não têm fallback global.
- Nenhum recurso pago é ativado.

---

## Privacidade e acessibilidade

O resumo público está em `/privacidade`. A conta permite exportar e excluir dados, revogar notificações, reduzir movimento, reduzir transparência e aumentar contraste. Estados de carregamento e de perda de conexão explicam o que está acontecendo e oferecem recuperação sem apagar alterações locais.

---

## Status do projeto

Release final homologada e aceita: validações em aparelho, instalação e atualização do PWA, notificações, acessibilidade manual, capacidade e rollback foram executadas. A base está coberta por testes automatizados, emuladores e homologação manual.

Hospedagem autorizada: `https://leve-agenda.vercel.app`. Histórico operacional em [CONTINUAR.md](CONTINUAR.md).

---

## Autor

**Kauan Kelvin** — desenvolvedor fullstack

[LinkedIn](https://www.linkedin.com/in/kauan-kelvin/) · [Portfólio](https://kauankelvindev.vercel.app) · [GitHub](https://github.com/kauankelvin7)

---

## Licença

MIT — ver [LICENSE](LICENSE).
