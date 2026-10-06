# Auditoria de segurança — 06/10/2026

## Escopo e método

Auditoria executada na branch `security/audit-hardening`, a partir de `main`, cobrindo API Express, Firebase Auth/Admin e Firestore, comandos e recibos, Gika/Gemini, importação e exportação, notificações FCM/PWA, dados offline, scheduler, séries, dependências e segredos.

O catálogo desta sessão não expôs uma skill executável chamada `cloudflare security-audit-skill`. A revisão seguiu os controles equivalentes do repositório e manteve as ações externas de WAF descritas em [`EDGE-PROTECTION.md`](./EDGE-PROTECTION.md) como pendentes de aplicação no provedor.

Foram orquestrados cinco pareceres read-only: autenticação/API, dados Firestore, frontend/PWA, cadeia de dependências e Gika/IA. As correções foram consolidadas e revisadas neste branch.

## Correções aplicadas

- **Autorização:** exportação, recibos de comandos e sessão verificam e-mail confirmado, perfil ativo e membership ativa; importação revalida membership dentro da transação.
- **Gika:** propostas sem evidência no texto atual são rejeitadas; histórico enviado ao Gemini contém apenas resultados genéricos; recuperações têm limitador próprio e não consomem a cota do modelo; redirecionamentos do Gemini são bloqueados.
- **Comandos e dados:** séries recebem cota, expiração de comandos antigos, controles de serviço e metadados de lixeira; restauração falha durante purge; time entries importados passam por schema estrito e validação temporal.
- **Notificações:** payloads não expõem o título da atividade na tela bloqueada; UID é obrigatório; o service worker filtra clientes pelo UID e aceita apenas destinos internos; tokens FCM são reassociados atomicamente ao trocar de conta; cache de API/HTML foi restringido.
- **Dados locais:** logout e desativação do modo offline removem sessão em cache, outbox, rascunhos e chaves de session storage da conta.
- **Tooling:** removido `concurrently` (cadeia crítica `shell-quote`); `firebase-tools` atualizado para 15.32.1; Vite/plugin React atualizados; `source-map-js` fixado em 1.2.2.
- **CI:** actions de checkout, Node, Java e upload de artefatos foram fixadas por SHA, mantendo o rótulo de versão em comentário para revisão.

## Evidências e limites

| Verificação | Resultado |
| --- | --- |
| `npm audit --omit=dev` | 0 vulnerabilidades de produção |
| `npm audit` completo | 15 vulnerabilidades dev-only: 9 high, 6 moderate, 0 critical |
| Typecheck | PASS |
| Lint e boundaries | PASS — 55 fontes TypeScript |
| Unitários | PASS — 70 arquivos / 804 testes |
| Build | PASS — Vite 8.3.3 |
| Integração Auth/Firestore | PASS — 10 arquivos / 322 testes |
| Jornadas críticas Playwright | PASS — 8 testes, Chromium local |

As vulnerabilidades restantes pertencem às cadeias transitivas do tooling local (`firebase-tools`, proxy/parsers/glob). Elas não entram no bundle nem nas dependências de produção; não foram mascaradas por filtro de CI. O próximo passo adequado é uma atualização dedicada do CLI com seus próprios gates.

## Riscos residuais e ações externas

- Limite de recuperação Gika é por processo; a proteção distribuída precisa ser aplicada na borda.
- HMAC do endpoint interno de tick continua sujeito a replay dentro da janela de validade; manter rate limit e autenticação de origem no edge.
- WAF, limites por IP, alertas de custo e HSTS precisam ser conferidos no painel/preview autorizado do provedor. Nenhuma configuração remota foi alterada nesta auditoria.
- App Check não foi ativado, pois exige coordenação de clientes e enforcement; Firebase Auth e autorização server-side permanecem obrigatórios.

Nenhuma conta, dado, segredo, DNS, deployment ou ambiente de produção foi acessado ou modificado.
