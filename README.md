# Leve

> **Estado em 11/09/2026:** identidade E02 e os fluxos persistentes iniciais de atividades, calendário, notas e compras estão integrados e validados com Auth/Firestore Emulator. Leia **[CONTINUAR.md](CONTINUAR.md)** antes de retomar; edição completa, lixeira, recorrência, offline e push ainda estão em construção.

Agenda pessoal em React, TypeScript, Vite, Firebase Auth/Firestore e API Express. O fluxo real exige conta confirmada, convite e membership; atividades, notas, listas e itens criados nas rotas privadas persistem no Firestore. A demo E01 permanece isolada em `/demo` somente como referência histórica.

## Executar

Requer Node 24 (baseline executado: 24.0.2) e npm 11.19.1. Instale uma versão corrigida da linha 24 antes de operar serviços reais; o baseline registra o ambiente disponível, não uma certificação de segurança do runtime.

```sh
npm ci
npm run dev:local
```

Em outro terminal, execute `npm run seed:local` e use as credenciais fictícias impressas. Abra o endereço informado pelo Vite (normalmente `http://127.0.0.1:5173`) e entre por `/entrar`. O projeto `demo-leve` impede acesso acidental a serviços Firebase reais durante esse fluxo.

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
- Login por e-mail/senha ou Google, cadastro em `/registrar`, confirmação de senha, recuperação, verificação de e-mail, convite e membership. A sessão usa persistência local do Firebase e continua após fechar e reabrir o navegador até o logout ou revogação.
- Criação, conclusão e lixeira/restauração de tarefas; compromissos com duração; calendário mensal por intervalo.
- Criação e remoção lógica de notas simples; criação de listas, itens e marcação de compras.
- Autorização por uid nas Rules; escrita do cliente negada e comandos validados pela API.
- Perfil e preferências persistentes; criação e arquivamento de categorias.

O fluxo real foi validado somente com dados fictícios nos emuladores. O projeto Firebase `leve-db` está vinculado e suas Rules/índices foram publicados, mas a API de produção, credenciais administrativas, provedores Auth, hospedagem, notificações, PWA, exportação e sincronização offline ainda precisam de configuração e prova próprias.

O mantenedor confirmou que o Firebase Authentication foi criado no projeto `leve-db`. Os provedores e domínios autorizados ainda precisam ser ensaiados no ambiente real quando existir uma URL de preview.

## Organização

| Caminho | Responsabilidade |
|---|---|
| `apps/web/src/app` | Entrada de rotas e fronteira da demo |
| `apps/web/src/features/demo` | Exemplos isolados e calendário de apresentação |
| `apps/web/src/components/ui` | Componentes visuais compartilháveis |
| `apps/web/src/styles/app.css` | Estilo consolidado e responsividade |
| `design-tokens.json` | Fonte dos valores semânticos, aplicada como variáveis CSS |
| `tests/unit`, `tests/e2e` | Riscos locais verificáveis |
| `docs/EXECUCAO.md` | Auditoria, roadmap, rastreabilidade e pendências |
| `docs/adr/001-fundacao.md` | Decisões e consequências |
| `docs/runbooks/prova-gratuita.md` | Plano de verificação de infraestrutura |

Os documentos originais foram preservados. O relatório consolidado contém as seções dos documentos 01–04 ausentes. `referencia-prototipo/` também não foi fornecida; a aparência foi reconstruída da seção 9 e sua fidelidade ao original ainda precisa de comparação.

## Ambientes e hospedagem

Não é necessário preencher `.env.example` para a demo; nenhuma variável de serviço é consumida nesta etapa. Variáveis `VITE_*` serão públicas no bundle. As demais são reservadas ao servidor e nunca devem receber esse prefixo. Não incluir credenciais em arquivos versionados.

`vercel.json` prepara build na raiz do projeto (não em `apps/web`) e saída `dist`, com rewrites somente das rotas previstas. `/api/*` e `/assets/*` não recebem fallback global. Não houve publicação: validar configuração, headers, URLs diretas e 404 em preview antes de produzir evidência de hospedagem. A CSP atual permite apenas recursos da própria origem; E02 terá de revisar origens do Firebase.

Não há faturamento ou serviço provisionado por esta execução. A ausência de faturamento nas contas do mantenedor e as integrações Vercel → Firestore e Cron → API ainda não foram verificadas. O roteiro está em `docs/runbooks/prova-gratuita.md`.
