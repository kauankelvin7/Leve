# Auditoria de segurança V2

Base revisada: `b0e7bae753ec93374a3ebe3ec2b1a5ac07298046`  
Escopo: API Express/Vercel, Firebase Auth/Admin e Firestore, comandos, Gika, import/export, exclusão de conta, notificações, scheduler, PWA compilado, logs, segredos e dependências. Ambiente local e emuladores; nenhum dado, conta ou serviço de produção foi tocado.

## Threat model

| Superfície | Ator e risco considerado | Controles encontrados |
| --- | --- | --- |
| API pública e autenticação | chamadas anônimas, tokens expirados/revogados, flood e enumeração | Firebase ID token verificado com revogação; erros genéricos; CORS allowlist; rotas públicas reduzidas |
| Comandos | replay, duplicação, alteração concorrente, mass assignment, ownership | schema estrito, receipt idempotente vinculado a UID/hash, expectedRevision, transações e limites duráveis |
| Gika | input injection, tool/policy bypass, replay, chamadas Gemini caras e confirmações obsoletas | entrada limitada a 2.000 caracteres e body a 12 KiB; tools allowlisted; output validado; confirmação assinada, UID e revisão revalidados; orçamento durável adicionado nesta versão |
| Firestore | IDOR/BOLA, leitura entre contas, escrita direta, lista sem limite | Rules exigem UID, e-mail verificado, membership ativa e lista até 50; escrita do cliente negada; servidor verifica membership/estado |
| Import/export e exclusão | payload/volume e destruição indevida | envelope validado, cotas e contagens; uma importação ativa por conta; exclusão exige login recente, token não revogado e job retomável |
| Notifications | token alheio ou envio sem autorização | tokens guardados no backend, associação UID/aparelho e no máximo três dispositivos ativos |
| Scheduler/internal tick | invocação externa/replay | HMAC com timestamp; logs sem corpo/token |
| PWA/client | exposição de segredos, cache ou source map | allowlist de env pública Firebase, no source maps, `no-store` da API e headers/CSP no host |
| Logs/segredos | token, e-mail, conteúdo privado ou stack em log/bundle | redação de campos e texto, rotas normalizadas e erros serializados por classe/código; chaves privadas não são empacotadas |
| Quotas/dependências | custo amplificado e advisories | limites por conta já existentes para comandos; auditoria npm de produção executada no gate |

## Findings e prioridade

### MEDIUM — orçamento de Gika dependia da memória da instância

O limitador anterior guardava cotas por UID e totais globais apenas em um `Map` local. Reinícios e instâncias paralelas de funções serverless podiam reiniciar ou dividir esses contadores, permitindo mais chamadas pagas ao modelo e mais leituras Firestore que o limite de 3/minuto e 10/dia sugeria. Corrigido com contadores transacionais de minuto e dia em `usageBuckets`, compartilhados entre instâncias. O teste de integração comprova que três pedidos distintos passam e o quarto é negado antes de invocar o modelo. O limitador local permanece como contenção adicional por instância.

### LOW — HSTS ausente na configuração de resposta do host

As respostas já definiam CSP, `frame-ancestors`, `X-Frame-Options`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`; não havia HSTS. Adicionado `Strict-Transport-Security: max-age=31536000` na configuração Vercel. Sem `includeSubDomains` ou `preload`, pois a propriedade de todos os subdomínios/preload não foi demonstrada.

### INFO — skills de cybersecurity registradas no lockfile não estavam acessíveis no harness

`skills-lock.json` registra skills externas de rate limiting, API abuse e serverless. A lista de skills e os diretórios locais disponíveis neste ambiente não expuseram os arquivos dessas skills; não foi afirmado uso delas. A análise seguiu os controles existentes e os requisitos do repositório.

## Firebase, Rules e comandos

Rules preservam isolamento por UID, membership e estado de conta, exigem token de e-mail verificado, limitam listagens e negam escrita direta. A API chama `verifyIdToken(token, true)`, ativando a verificação de revogação. Os testes adversariais existentes cobrem usuário cruzado, usuário não verificado/suspenso, query ilimitada e tentativa de escrita direta; os testes de integração exercitam receipts, conflitos e confirmações Gika. Nenhuma alteração nas Rules foi necessária.

Command envelopes e domínios usam schemas estritos; receipts são vinculados por UID e hash do comando, e as transações verificam revisão e membership novamente. Gika não executa ferramentas diretamente: propostas validadas viram comandos já existentes, com confirmação explícita para efeitos protegidos.

## Abuse protection, headers e observabilidade

Não há bloqueio por IP implementado na função. CORS não é tratado como controle de abuso. Gika agora tem cota distribuída por UID; comandos mantêm 60 mutações/minuto e 1.000/dia por UID. Export e import continuam sob autenticação, limites de schema/tamanho, estoque e job único. Endpoints de recuperação Gika não chamam Gemini. Nenhum honeypot foi adicionado: não foi identificada superfície anônima apropriada cujo sinal justificasse coleta adicional.

Logs mantêm correlation ID, rota normalizada, status e latência; não registram corpo, Authorization, e-mail de sessão ou mensagens de erro do provedor. Headers existentes são compatíveis com o PWA/Firebase; HSTS foi acrescentado na borda Vercel. CSP não foi afrouxada.

## Dependências, segredos e infraestrutura

Instalação reproduzida pelo lockfile; sem atualização em massa. `npm audit --omit=dev --audit-level=moderate` foi executado como gate. Nenhuma chave administrativa, token real, usuário real, DNS ou produção foi consultado ou alterado. Firebase Admin usa credenciais providas pelo runtime, sem credencial incluída no repositório.

## Riscos residuais

- Limites locais não mitigam DDoS volumétrico nem floods distribuídos que atinjam a função antes do código.
- Cotas por UID podem ser contornadas por criação distribuída de contas; Firebase Auth, políticas antiabuso do provedor, limites Gemini e budgets/alertas Firebase são necessários para controlar esse vetor/custo.
- App Check não é verificado por esta API; adicionar validação exige configuração coordenada de clientes, tokens e enforcement para evitar indisponibilidade. A autenticação Firebase e autorização server-side continuam obrigatórias.
- A validação de HSTS e regras WAF no domínio requer preview no provedor; não houve alteração remota.

Ver ações externas concretas em `EDGE-PROTECTION.md`.

## Evidência de gates

- `npm audit --omit=dev --audit-level=moderate` — 0 vulnerabilidades de produção.
- `npm run lint` — passou, incluindo verificação de fronteiras arquiteturais.
- `npm run typecheck` — passou.
- `npm run build` — passou com source maps desativados.
- `npm test` — 546 testes em 56 arquivos passaram.
- `npm run test:integration` — 253 testes em 8 arquivos passaram com Auth/Firestore Emulator e dados sintéticos.
- Teste novo de cota: três interpretações por UID/minuto passam; a quarta retorna 429 antes do modelo e persiste o contador em um documento diário compartilhado entre instâncias.
- Teste novo de headers: valida as políticas configuradas no host, incluindo HSTS.

O build emitiu apenas o aviso já esperado de chunk JavaScript acima de 500 kB. O npm reportou pacotes de desenvolvimento depreciados durante a instalação, mas nenhum advisory de dependência de produção. Nenhum teste ou scan foi executado contra produção.
