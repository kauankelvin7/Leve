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

### MEDIUM — abuso de chamadas Gika e cotas locais ineficazes em serverless

O limitador inicial foi adicionado no commit `ac27289` junto à primeira integração da Gika. A árvore, as decisões e as evidências disponíveis apenas repetiam `3/minuto` e `10/dia`; não foi encontrada justificativa de produto, medição de uso, cálculo de custo ou cota oficial do provedor por UID que fundamentasse esses números. O Free Tier do provedor tem cotas do projeto, não uma relação documentada que torne 10 pedidos diários por usuário um limite correto. O `10/dia` era arbitrário. O limite global `120/dia/instância` também era efêmero e sem base operacional.

Uma interação que chega à interpretação realiza uma chamada HTTP ao Gemini. Leitura simples, consulta semanal e proposta de organização têm custo diferente de leituras Firestore, mas todas usam uma chamada do modelo e eram cobradas como uma unidade diária. Em organização, o servidor pode fazer leituras de preparação e revalidação antes/depois do modelo. Confirmação de comando e recuperação de receipt não chamam o modelo. A cota anterior também era consumida antes de alguns retornos de pré-validação que não chamavam o modelo, e dez interações legítimas no dia esgotavam a Gika independentemente do tipo.

O limite diário fixo e os limites diários locais foram removidos. `GIKA_DAILY_LIMIT` agora é um teto opcional explícito, inteiro positivo, aplicado por UID e dia UTC; vazio/ausente significa sem teto diário. O burst de 3 chamadas foi preservado e reforçado para uma janela móvel de 60 segundos. O número 3 veio da mesma escolha histórica, sem telemetria que prove ser ótimo; foi mantido como proteção proporcional contra rajadas e conforme a instrução de não enfraquecer o burst. Uma pergunta normal consome uma chamada do limite curto. Não há dado de produção suficiente nesta auditoria para calibrar melhor esse número.

### Persistência e propriedades da cota Gika

O estado usa `usageBuckets/{uid}_gika`, com UID derivado do token verificado. Cada requisição faz uma transação que lê um documento e escreve o array de até três timestamps recentes; com cota diária configurada, o mesmo documento recebe chave do dia UTC e contagem. Excesso faz uma leitura e nenhuma escrita. Contenção concorrente causa retries transacionais e pode acrescentar leituras, mas os retries internos não duplicam a gravação confirmada. Chamadas HTTP repetidas sem receipt de comando são requisições distintas e consomem cada uma; replay que é resolvido por receipt retorna antes da cota e do modelo.

As transações concorrentes no mesmo documento serializam a verificação e incremento: o teste adversarial dispara seis solicitações simultâneas com mesmo UID e comprova exatamente três admissões; outro UID mantém cota independente. A janela móvel elimina a duplicação de chamadas na virada de minuto. Não há rollover relevante para o burst na virada do dia; a cota diária opcional troca a chave na meia-noite UTC. Falha de leitura/escrita aborta antes da chamada do modelo e retorna indisponibilidade genérica (fail-closed). Regras negam leitura e escrita cliente de `usageBuckets`. Nenhum conteúdo da pergunta ou dado de agenda é armazenado no contador.

O documento é estável por UID: não cria um documento a cada dia ou minuto e, portanto, o contador Gika não cresce com o tempo. Ele permanece até a exclusão da conta; o job de exclusão existente apaga todos os documentos com prefixo `${uid}_`. TTL não é usado porque requer billing neste projeto. Para cada interpretação admitida, o orçamento consome uma leitura e uma escrita Firestore; uma tentativa negada consome uma leitura. Contenção pode aumentar leituras por retries do Firestore.

### LOW — HSTS ausente na configuração de resposta do host

As respostas já definiam CSP, `frame-ancestors`, `X-Frame-Options`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`; não havia HSTS. Adicionado `Strict-Transport-Security: max-age=31536000` na configuração Vercel. Sem `includeSubDomains` ou `preload`, pois a propriedade de todos os subdomínios/preload não foi demonstrada. A regra é aplicada pelo host Vercel em deployments HTTPS, inclusive preview HTTPS; `npm run dev` e `vite preview` locais não leem headers Vercel e continuam HTTP local sem HSTS. A configuração/compatibilidade foi coberta pelo teste focal de headers; nenhum preview ou deploy foi feito nesta revisão.

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

- A cota por UID não mitiga DDoS volumétrico nem floods distribuídos que atinjam a função antes do código; o rate limit por IP precisa ser aplicado no edge.
- Cotas por UID podem ser contornadas por criação distribuída de contas; Firebase Auth, políticas antiabuso do provedor, limites Gemini e budgets/alertas Firebase são necessários para controlar esse vetor/custo.
- App Check não é verificado por esta API; adicionar validação exige configuração coordenada de clientes, tokens e enforcement para evitar indisponibilidade. A autenticação Firebase e autorização server-side continuam obrigatórias.
- A validação de HSTS e regras WAF no domínio requer preview no provedor; não houve alteração remota.

Ver ações externas concretas em `EDGE-PROTECTION.md`.

## Evidência de gates

- `npm audit --omit=dev --audit-level=moderate` — 0 vulnerabilidades de produção.
- No checkpoint inicial `a92b334`: `npm audit --omit=dev --audit-level=moderate` retornou 0 vulnerabilidades; lint, typecheck e build passaram; 546 testes unitários e 253 integrações passaram.
- Após esta revisão focal: lint, typecheck e build passaram; os testes unitários direcionados passaram (11 testes em 2 arquivos).
- Integração focal: 126 testes em 3 arquivos passaram no Auth/Firestore Emulator, incluindo a remoção do contador na exclusão da conta. Após o limite do array ser endurecido, Gika e Rules foram repetidos: 104/104 passaram.
- O teste focal de headers passou e confirma HSTS no host Vercel; nenhum preview ou deploy foi iniciado.
- Não houve mudança em dependências ou lockfile desde o `npm audit` do checkpoint inicial.

O build emitiu apenas o aviso já esperado de chunk JavaScript acima de 500 kB. O npm reportou pacotes de desenvolvimento depreciados durante a instalação, mas nenhum advisory de dependência de produção. Nenhum teste ou scan foi executado contra produção.
