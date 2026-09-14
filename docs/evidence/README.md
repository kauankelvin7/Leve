# Evidências locais

- `e02-e03-atividade-persistente.png`: shell autenticado após login, admissão por convite, criação, reload e conclusão de atividade no Firebase Emulator. Gerada pelo teste `tests/e2e-local/persistent.spec.ts` em 11/09/2026.
- `e03-e05-conteudo-persistente.png`: fluxo ampliado com calendário, nota e item de compras persistentes no Firebase Emulator. Gerada pelo mesmo teste após validar reload e estado marcado.
- `auth-desktop-interativo.png`: entrada em 1440×960 após movimentar o ponteiro sobre o shader WebGL.
- `auth-registro-desktop.png`: cadastro em rota própria com nome, confirmação de senha e convite antes da verificação do e-mail.
- `auth-mobile-estatico.png`: entrada em 390×844 com o efeito desativado e fundo responsivo estático.

Em 12/09/2026, `tests/e2e-local/persistent.spec.ts` passou com 7/7 jornadas: autenticação, conteúdo persistente, lixeira, duas abas/offline, conflito de nota, teclado/reflow/Axe e exportação/importação. O resultado textual é reproduzível por `npm run test:e2e:local`; capturas e traces adicionais são preservados somente quando há falha.

As capturas E01 planejadas anteriormente não foram produzidas. Os resultados automatizados e limitações históricas estão em `../EXECUCAO.md`; o estado atual está em `../../CONTINUAR.md`.
