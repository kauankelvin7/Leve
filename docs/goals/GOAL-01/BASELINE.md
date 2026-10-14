# GOAL #01 — baseline

## Ponto de partida

- Repositório: `kauankelvin7/Leve`.
- Base: `main`, commit `c7a3de4d2c75e1be3b8f0439adeef6578805f14f` (`chore(deps): integrate 10 security-reviewed Dependabot upgrades (#35)`).
- Branch de trabalho: `goal/01-confiabilidade-privacidade`, criada a partir desse commit em worktree separada.
- A cópia original do usuário em `/workspace/scratch/92ac25cdba41/Leve` já continha mudanças locais não relacionadas. Ela foi preservada sem alterações; o trabalho deste GOAL está em `Leve-goal01`.
- Na consulta inicial ao GitHub, a branch dedicada ainda não existia e buscas por PR “GOAL 01” e “offline privacy” não encontraram PR correspondente.

## Reconhecimento feito antes das mudanças

Foram lidos `AGENTS.md`, `CONTINUAR.md`, `README.md`, o plano técnico, `docs/AGENT-SETUP.md`, arquiteturas de persistência, sincronização e autenticação, além das auditorias recentes em `docs/security/` (incluindo `SECURITY-AUDIT-2026-10-06.md`, `SECURITY-AUDIT-V2.md`, `REPORT.md` e `EDGE-PROTECTION.md`).

O estado do repositório informa que as alterações de domínio passam por `/api/commands`, com `operationId`, `expectedRevision`, recibos e isolamento por UID. O IndexedDB da outbox é separado do cache do Firestore; rascunhos, sessão e preferências também usam storage do navegador. A auditoria anterior já havia implementado cotas distribuídas para a Gika e endurecido autorização, logs e dependências, mas registrou replay HMAC do tick dentro da janela como pendente e WAF/rate limiting por IP como ação externa.

## Evidência do estado inicial

- `offlineEnabled()` em `apps/web/src/platform/outbox.ts` tratava toda configuração diferente de `false` como ativa; portanto, chave ausente habilitava fila offline.
- `Settings.tsx` marcava offline como ativo por padrão e dizia isso explicitamente.
- `firebase.ts` ativava cache persistente do Firestore quando `offlineEnabled()` retornava verdadeiro.
- `AuthProvider.tsx`, `drafts.ts`, `localData.ts`, `outbox.ts`, `sessionPersistence.ts`, preferências visuais e chaves de UI formavam superfícies locais distintas; a limpeza de logout/desativação precisava ser avaliada por UID e pelo risco de descartar comandos não sincronizados.
- Auditoria de segurança: cotas Gika por UID existiam no estado base; o endpoint interno de tick validava HMAC e timestamp, mas a auditoria apontava replay possível dentro da janela. A limitação por IP/WAF dependia de configuração externa não aplicada.
- A inspeção de fluxo confirmou uma corrida comprovável: duas contas podiam registrar em paralelo o mesmo token FCM e deixá-lo ativo para ambas. `account.import` e registro de notificações também não exigiam e-mail verificado, embora comandos de perfil já exigissem.

## Mapa de persistência e fluxos

| Superfície | Uso observado na base | Propriedade e impacto |
|---|---|---|
| Firestore IndexedDB | `firebase.ts` usa `persistentLocalCache` com gerenciador multiaba quando offline está habilitado. | Cache local de snapshots privados já consultados; sua limpeza é global à instância Firestore, não por UID. |
| IndexedDB `leve-local-v1` | `localData.ts`: `outbox-v2` guarda envelopes por `uid:operationId`; `drafts` guarda drafts por `uid:name`; `session-cache` guarda sessão por UID. Migração copia a store antiga `outbox`. | Conteúdo privado persistente; o banco contém escopos de contas distintas e não pode ser apagado por logout de um UID sem preservar o restante. |
| `sessionStorage` | `drafts.ts` usa fallback de draft por UID/nome; Calendar/Today guardam o dia escolhido. | Sobrevive reload na mesma aba e termina ao fechar aba; drafts ainda podem ficar locais mesmo se cache offline não estiver habilitado. |
| `localStorage` | `outbox.ts` guarda preferência offline global e lease fallback; `notifications.ts` guarda ID de aparelho por UID com migração de chave legada; `theme.ts` guarda aparência/tema; Today/Calendar guardam filtros/visão; tutorial e recuperação de sessão guardam estado local. | Mistura configurações sem conteúdo, IDs de aparelho e estado de sessão/conteúdo; cada módulo precisa de política apropriada, não de limpeza global indiscriminada. |
| `localStorage` de sessão de atividade | `sessionLifecycle.ts` persiste sessão de cronômetro para recuperação. | O registro contém UID e conteúdo da sessão; precisa entrar na contagem e na limpeza confirmada da conta correspondente. |
| Service Worker Cache API | `apps/web/public/sw.js` mantém shell/recursos estáticos same-origin e fallback de navegação. Não intercepta `/api/`. | Cache de recursos do app, distinto do cache de documentos privados. |
| Firebase Auth | Configurado no SDK para persistência local de credenciais de sessão. | Necessário para sessão persistente; logout deve continuar revogando a sessão SDK sem apagar comandos pendentes silenciosamente. |
| Gika | Bridges não usam a outbox convencional; rascunho da conversa tem ciclo próprio no cliente. | Não deve disparar ação offline nem ser confundida com mutações pendentes comuns. |

Fluxo de sessão: Firebase Auth informa usuário → `AuthProvider` consulta `/api/session` → servidor valida ID token revogável e perfil/membership → rotas privadas autorizam. Alterações de domínio entram por `/api/commands`; quando offline habilitado, `api.ts` pode gravar comandos elegíveis na outbox e o flush os reenvia com recibo/idempotência. Ao sair/trocar de conta/revogar, a limpeza deve ser UID-scoped e preservar outros UIDs e pendências até uma decisão explícita.

## Baseline reproduzível

Executado contra o snapshot limpo do commit-base (`git archive c7a3de4`) com as dependências já instaladas:

| Gate | Resultado |
|---|---|
| `npm run docs:check` | PASS — 167 arquivos Markdown |
| `npm run lint` | PASS — ESLint e arquitetura (55 fontes TypeScript) |
| `npm run typecheck` | PASS — cliente e servidor |
| `npm run build` | PASS — aviso existente de chunks acima de 500 kB |
| `npm test` | PASS — 70 arquivos, 831 testes |

`npm ci`, integração com emuladores, E2E e `npm audit` foram executados na branch; os resultados da implementação estão em `TESTES.md` e não alteram os resultados desta tabela-base.

## Limites do baseline

O commit-base e as execuções acima são locais. Não houve teste em contas reais, Firebase/Gemini/Vercel de produção, painel de borda, segredos ou implantação. O npm reportou a configuração ambiente desconhecida `http-proxy` durante os comandos.
