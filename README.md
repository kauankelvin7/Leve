# Leve

> **Estado em 13/09/2026:** E00–E10 estão concluídas nas fronteiras verificáveis localmente e a primeira produção autorizada está ativa em `https://leve-agenda.vercel.app`. A suíte cobre persistência, conflito, duas abas, offline, recuperação por exportação/importação, acessibilidade automatizada e vinte contas concorrentes. O Worker gratuito, o cron por minuto, o segredo HMAC, a chave VAPID e os índices Firestore estão configurados; o tick assinado já respondeu HTTP 200. E09 ainda depende de aparelho para provar push fechado; E10 depende de cotas representativas e leitor de tela; E11 depende de homologação e aceite. O domínio `leve.com` foi adiado por decisão do usuário e não bloqueia a hospedagem Vercel. Leia **[CONTINUAR.md](CONTINUAR.md)** para a matriz exata.

Agenda pessoal em React, TypeScript, Vite, Firebase Auth/Firestore e API Express. O fluxo real permite cadastro direto por e-mail confirmado ou Google e cria a membership durante a ativação da agenda; atividades, notas, listas e itens criados nas rotas privadas persistem no Firestore. A demo E01 permanece isolada em `/demo` somente como referência histórica.

## Executar

Requer Node 24 (baseline executado: 24.0.2) e npm 11.19.1. Instale uma versão corrigida da linha 24 antes de operar serviços reais; o baseline registra o ambiente disponível, não uma certificação de segurança do runtime.

```sh
npm ci
npm run dev
```

`npm run dev` e `npm run dev:local` iniciam Auth/Firestore Emulator, API e Vite juntos. Em outro terminal, execute `npm run seed:local` e use as credenciais fictícias impressas. Abra `http://localhost:5174/entrar`. O projeto `demo-leve` impede acesso acidental a serviços Firebase reais durante esse fluxo. `npm run dev:web` inicia somente o Vite e exige uma API separada em `localhost:8788`.

O Auth Emulator não entrega mensagens em caixas de e-mail reais. Durante um cadastro local, a própria etapa de verificação informa essa limitação e oferece **Confirmar neste ambiente**, que consome somente o código de teste gerado pelo emulador. Fora do modo local, o Firebase continua enviando o link de confirmação normalmente.

## Verificar

```sh
npx playwright install chromium
npm run check
npm run test:integration
npm run test:e2e:local
```

`check` executa TypeScript estrito, build, testes unitários e Playwright contra o build servido localmente. Comandos individuais: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:e2e`. `npm run preview` serve `dist` para inspeção. Não há script de lint nesta base; a verificação estática usa TypeScript, e a revisão de React foi manual. Relatório E2E: `playwright-report/index.html`; traces de falhas: `test-results/`.

No ambiente Codex/Windows, Vite, Vitest e Chromium precisaram executar fora da sandbox por bloqueio de criação de subprocessos (`spawn EPERM`). Isso é distinto de falha de compilação ou teste.

## O que funciona nesta etapa

- Shell responsivo Vidro & Papel, fontes locais DM Sans/Instrument Serif, tokens semânticos e modo sólido.
- Login por e-mail/senha ou Google, cadastro direto em `/registrar`, confirmação de senha, recuperação, verificação de e-mail e ativação idempotente da membership. A sessão usa persistência local do Firebase e continua após fechar e reabrir o navegador até o logout ou revogação.
- Criação, edição, conclusão e lixeira de tarefas; compromissos com horário ou dia inteiro; calendário e pendências atrasadas.
- Recorrência diária, semanal e mensal, com edição individual ou das ocorrências futuras e materialização incremental.
- Notas com editor limitado seguro, vínculos, fixação e busca; listas, quantidades, modelos, ciclos e itens de compras.
- Autorização por uid nas Rules; escrita do cliente negada e comandos validados pela API.
- Perfil e preferências persistentes; criação, edição, arquivamento e lixeira de categorias.
- Exportação JSON versionada, importação como cópia, exclusão retomável de conta e expurgo da lixeira.
- PWA, cache privado opt-in, outbox por conta, atualização protegida e registro de notificações por aparelho.
- Tick HMAC com leases, retries, invalidação de avisos obsoletos, renovação de recorrência e limpeza paginada.

Os fluxos foram validados com dados fictícios nos emuladores e Playwright local. Duas abas, reconexão da outbox, conflito de notas, reflow, Axe e exportação/importação foram exercitados pela interface; a integração também cobre retomada de importação, leases e vinte contas concorrentes. A API de produção respondeu ao healthcheck e inicializou o Firebase Admin com conta de serviço. VAPID, Worker, HMAC e tick assinado estão configurados em produção; PWA instalada e push em aparelho fechado ainda precisam de prova em aparelho suportado. Nenhum recurso pago foi ativado.

O mantenedor confirmou que o Firebase Authentication e o Firestore foram criados no projeto `leve-db`, com E-mail/Senha e Google habilitados. O Google usa seleção explícita de conta, popup e fallback para redirect. A configuração remota confirmou `leve-agenda.vercel.app` entre os domínios autorizados; `leve.com` só deve ser incluído depois que o DNS estiver ativo.

## Organização

| Caminho | Responsabilidade |
|---|---|
| `apps/web/src/app` | Entrada de rotas e fronteira da demo |
| `apps/web/src/features/demo` | Exemplos isolados e calendário de apresentação |
| `apps/web/src/components/ui` | Componentes visuais compartilháveis |
| `apps/web/src/styles/app.css` | Estilo consolidado e responsividade |
| `workers/scheduler` | Cron Free que assina e aciona o tick operacional |
| `design-tokens.json` | Fonte dos valores semânticos, aplicada como variáveis CSS |
| `tests/unit`, `tests/e2e` | Riscos locais verificáveis |
| `docs/EXECUCAO.md` | Auditoria, roadmap, rastreabilidade e pendências |
| `docs/adr/001-fundacao.md` | Decisões e consequências |
| `docs/runbooks/prova-gratuita.md` | Plano de verificação de infraestrutura |

Os documentos originais foram preservados. O relatório consolidado contém as seções dos documentos 01–04 ausentes. `referencia-prototipo/` também não foi fornecida; a aparência foi reconstruída da seção 9 e sua fidelidade ao original ainda precisa de comparação.

## Ambientes e hospedagem

Para usar Firebase Authentication fora dos emuladores, copie `.env.example` para `.env.local`, preencha as variáveis públicas `VITE_FIREBASE_*` do aplicativo Web e reinicie o Vite. O arquivo local é ignorado pelo Git. Variáveis `VITE_*` serão públicas no bundle; as demais são reservadas ao servidor e nunca devem receber esse prefixo. Não incluir credenciais em arquivos versionados.

`vercel.json` prepara build na raiz do projeto (não em `apps/web`) e saída `dist`, com rewrites somente das rotas previstas. `/api/*` e `/assets/*` não recebem fallback global. O deployment verificado foi promovido para `https://leve-agenda.vercel.app`; há um deployment anterior preservado para rollback. A CSP permite recursos próprios e restringe os scripts externos do login Google a `https://apis.google.com` e `https://accounts.google.com`.

A integração Vercel → Firebase Admin/Firestore e a integração Cron → API foram verificadas. Vercel Hobby e Firebase Spark foram confirmados sem billing; o consumo representativo das cotas Firebase/Cloudflare e o push real em aparelho continuam pendentes. O roteiro está em `docs/runbooks/prova-gratuita.md`.
