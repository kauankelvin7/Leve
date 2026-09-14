# Refinamento de producao — aplicabilidade

Data: 12/09/2026. Este registro incorpora `REFINAMENTO.md` ao fluxo de E06–E11 sem alterar a arquitetura aprovada em `PROMPT-CODEX.md` e `CONTINUAR.md`.

## Decisao de arquitetura

O bloco 4 sugere migrar o backend para Next/Vercel API Routes. A base aprovada usa Vite, React, Firebase e API Express; a migracao nao e uma correcao localizada e deixaria os fluxos atuais sem uma prova equivalente. Portanto, ela nao sera feita agora. Os principios do bloco — autenticacao, membership, erros JSON, rate limit, logs redigidos e `no-store` — permanecem exigidos e ja pertencem ao middleware Express em `server/app.ts` e aos comandos.

## Aplicar agora ou ja aplicado

| Bloco | Decisao | Evidencia ou acao |
| --- | --- | --- |
| 1. Auth e rotas | Ja aplicado | O cliente bloqueia sessao sem `emailVerified`; a API verifica o token e membership. Continua pendente apenas prova externa autorizada. |
| 2. XSS e headers | Ja aplicado em parte | Notas aceitam somente a arvore schema-validada, sem HTML arbitrario; textos simples sao validados por Zod; regras bloqueiam escrita direta. `vercel.json` tem CSP, frame, tipo e referrer. DOMPurify nao agrega defesa enquanto nao houver renderizacao de HTML de usuario. |
| 3. Rate limit e listeners | Aplicado e monitorar | `usageBuckets` limita comandos. Todos os `onSnapshot` auditados retornam unsubscribe em `useEffect`. Busca/lixeira abrem um listener por lista para itens: aceitavel no limite atual, mas entra no ensaio de capacidade de E10 antes de ampliar contas. |
| 5. Admin singleton | Ja aplicado | `server/platform/firebase.ts` usa `getApps()[0] ?? initializeApp` e exporta um unico Auth/Firestore. |
| 6. N+1 | Avaliado | Nao ha `getDoc` por atividade na interface. A exportacao le itens por lista; substitui-la por collection group exigiria denormalizacao/migracao de `uid` e nao reduz a necessidade de paginação. Medir em E10 antes de alterar o modelo. |
| 7. Indices | Ja aplicado e congelado | Os indices existentes correspondem a recorrencia, lembretes e intervalo de agenda. Nenhum indice novo e criado sem erro real ou evidencia de crescimento. |
| 8. Atomicidade | Ja aplicado e continuar provando | Convites/ativacao, revisoes, recibos, ciclos, importacao e contadores usam transacoes ou lotes. O token FCM foi separado dos metadados do aparelho e e revogado na mesma transacao. E06–E09 ainda requerem ensaio integrado. |
| 9. Cache | Ja aplicado | API define `no-store`; Firestore usa persistencia local multitab quando offline esta ativo. |
| 10. PWA update | Ja aplicado localmente | O worker anuncia atualizacao e `OutboxStatus` impede atualizar enquanto ha alteracoes pendentes. Falta ensaio real de atualizacao em E08. |
| 12. Health e env | Ajustado agora | Health passou a informar versao e timestamp; `.env.example` ficou somente com placeholders. |

## Preparar agora, executar em ambiente autorizado

| Bloco | Quando | Criterio de conclusao |
| --- | --- | --- |
| 11. Migrations | Preparado | `scripts/migrations/001-separate-notification-tokens.ts` move tokens legados para a colecao interna e remove o campo antigo de forma idempotente. Executar manualmente e somente em ambiente autorizado; nunca no boot. |
| 12. Deploy e rollback | E11 | Checklist de preview, variaveis por ambiente e rollback so apos autorizacao de deploy. |
| 13. Carga | E10 | Roteiro contra emuladores, com dados ficticios e sem Playwright/Auth Emulator nesta rodada. |
| Push/FCM | E09 | Worker, VAPID, FCM e evidencia em aparelho fechado. |

## Itens que nao devem ser aplicados agora

- Migracao para Next API Routes: conflita com a stack Express explicitamente aprovada.
- Rate limit de login no backend: o login e tratado pelo Firebase Auth, nao por `/api/auth/*`; duplicar esse controle no Express nao protege o ponto de entrada real.
- DOMPurify: nao existe HTML de usuario renderizado. O schema estrito da nota e a ausencia de `dangerouslySetInnerHTML` sao a defesa correta para o modelo atual.
- Indices especulativos ou por booleano: aumentariam custo de escrita sem uma query que os exija.

## Efeito no fluxo

O refinamento nao antecipa E11. Ele reforca E10 como gate de capacidade, acessibilidade, recuperacao e operacao, e mantem E08/E09 dependentes de evidencias reais de navegador/aparelho. Cada evidencia externa continuara sendo registrada em `CONTINUAR.md` antes de marcar um gate como concluido.
