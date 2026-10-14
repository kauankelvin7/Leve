# GOAL #01 — diagnóstico

## Confirmado no commit-base

| Área | Evidência | Estado inicial | Tratamento neste GOAL |
|---|---|---|---|
| Opt-in offline | `apps/web/src/platform/outbox.ts:19`; `apps/web/src/features/settings/Settings.tsx:129` | Ausência de preferência equivalia a habilitado; UI reforçava esse padrão. Contradizia README e arquitetura. | Preferência explícita e escopada por UID; migração preserva drafts e outbox. |
| Cache Firestore | `apps/web/src/platform/firebase.ts:18-29` | Persistência IndexedDB ativada pela preferência acima. Instalações legadas podem já ter cache persistente antes de existir preferência por conta. | Migração de uma só vez do cache legado, sem limpar drafts/outbox; sucesso só é registrado após a limpeza terminar. |
| Limpeza local | `Settings.tsx`, `AuthProvider.tsx`, `outbox.ts` | Logout/desativação e troca de conta interagem com comandos pendentes e dados no aparelho; caminhos precisam de aviso, confirmação e isolamento UID. | Preservar comandos pendentes até sync ou decisão informada; verificar revogação e falhas de limpeza. |
| Outbox | `outbox.ts`, `localData.ts`, `api.ts`, `outboxPolicy.ts` | Liderança usa Web Locks com fallback baseado em `localStorage`; IndexedDB guarda comandos e migra stores legados. Precisava de prova de concorrência, transação, UID e ACK parcial. | Implementar correções justificadas e regressões determinísticas sem alterar contratos. |
| Gika/tick | `docs/security/SECURITY-AUDIT-2026-10-06.md:39`; `server/app.ts`, `server/*tick*` | Auditoria registra replay HMAC dentro da janela. O guard da Gika tinha de ser conferido quanto à distribuição e espera antes de recuperar recibos. | Conferir estado atual em código; proteção de replay e cotas locais verificáveis. |
| Borda | `docs/security/EDGE-PROTECTION.md` | WAF e limites por IP são instruções para o painel; não são um controle comprovadamente ativo no repositório. | Não alterar infraestrutura. Documentar passos e critérios verificáveis. |

## Confirmado nas auditorias recentes

- A auditoria V2 descreve autenticação com Firebase ID token revogável, autorização por membership e perfil, recibos vinculados ao UID/hash, schemas estritos, cotas persistentes por UID, limites de payload Gika e logs sem corpo/token.
- Ela ressalva que a cota por UID não mitiga flood volumétrico nem ataques distribuídos antes do código e que o rate limit de IP depende da borda.
- `docs/security/DEVELOPMENT_REMAINING.md` registra advisories exclusivamente em dependências de desenvolvimento no inventário anterior. A versão atual ainda precisa do gate `npm audit --omit=dev --audit-level=moderate`.
- Não há evidência inicial de que Rules, formatos de comando ou schemas precisem de alteração; isso será reavaliado no diff final.
- A validação independente read-only reproduziu a corrida de reassociação de token de notificação entre UIDs, o bypass de e-mail verificado em `account.import`/registro de notificação e o bloqueio de leitura de conteúdo após expiração de comando. As correções e regressões desses achados foram incluídas nesta branch.
- A cota de recuperação Gika era um `Map` em memória por processo, apesar da documentação da auditoria indicar armazenamento distribuído; instâncias/restarts não compartilhavam o limite.
- A revisão independente posterior confirmou duas lacunas P2: remoção da outbox concorrendo com flush em outra aba, e row legado de `session-cache` permanecendo após a migração com offline desativado.

## Riscos potenciais a verificar

- A corrida de liderança em navegador sem Web Locks foi tratada com lease e fencing; a revisão confirmou que a remoção manual ainda pode concorrer com um flush ativo, e a correção/regressão continua pendente.
- ACK malformado ou resposta ambígua após o servidor aceitar uma escrita, que poderia perder ou duplicar operação.
- Além do cache Firestore, o upgrade pode reter o row legado de sessão em instalações sem marcador de consentimento por UID.
- Estado de membership revogado observado por listener enquanto a rede falha, capaz de reaproveitar sessão em cache.
- Logs ou respostas de erro que incluam dados privados sob exceção de transporte/provedor.
- Payloads, timeout e estado de quota do tick/Gika em condições de falha parcial.

## Fora do escopo ou não comprovado

- Não existe evidência local para configurar limites de IP/WAF sem acesso ao painel Vercel/Cloudflare. Não será inferida proteção ativa a partir de documentação.
- Não será testado tráfego volumétrico ou contra produção.
- Uma revogação não pode apagar remotamente dados de um aparelho que permaneça offline; a política de produto precisa explicar a retenção local até a próxima conexão e exigir escolha segura ao limpar pendências.

## Situação

## Resultado da verificação

- O comportamento de contas novas é opt-out explícito: a ausência de `leve.offlineEnabled.<uid>` não ativa Firestore cache nem fila offline.
- A preferência global antiga não concede consentimento novo. Rascunhos, comandos, sessões de atividade e dados de outra conta permanecem disponíveis durante a migração; o usuário pode sincronizar, recuperar ou remover seu conteúdo após confirmação.
- Cache persistente legado do Firestore é limpo antes de habilitar consultas privadas. Falha mantém a migração pendente, mostra aviso e permite nova tentativa. A revisão posterior confirmou que `session-cache` legado não é removido nessa migração; drafts e outbox seguem preservados por intenção, e nenhuma limpeza deles está autorizada sem escolha explícita.
- O fallback de liderança usa lease transacional IndexedDB com token de fencing; a suite focal verifica duas abas simultâneas, expiração e confirmação de perda de liderança.
- O token FCM agora tem um único documento de proprietário hash-keyed, com reassociação na mesma transação do token/dispositivo e contagem; o token raw segue apenas na coleção de tokens server-only.
- O guard distribuído de recuperação Gika aplica 12/10 s, 60/min e 600/dia por UID. Tick reserva digest HMAC verificado em `maintenance/internalTickReplay` antes de executar jobs.
- Não foi comprovado bypass de autorização em comandos ordinários nem exposição de tokens/conteúdo por logs. O controle volumétrico por IP continua dependente de borda externa.

Os comandos e evidências da verificação final estão em `TESTES.md`; os limites e a revisão estão em `REVISAO.md` e `RELATORIO_FINAL.md`.
