# Proteção de borda do Leve

## Limite do que o repositório consegue proteger

A API valida autenticação e autorização, limita payloads e aplica cotas por conta em operações caras. Esses controles reduzem abuso de aplicação depois que uma requisição chega à função. Não absorvem tráfego volumétrico, saturação de conexões, esgotamento da cota Firebase/Gemini nem floods antes da execução da função.

## Ações operacionais no provedor

Na configuração Vercel do projeto, habilitar a proteção de firewall/WAF disponível no plano e aplicar limites gerenciados na borda:

- Limitar `POST /api/gika/*` por IP e janela curta; iniciar em 30 requisições/minuto/IP com burst até 10 e observar falsos positivos.
- Limitar `POST /api/commands` por IP a 120 requisições/minuto com burst até 30. A aplicação também impõe 60 mutações/minuto e 1.000/dia por UID.
- Limitar `GET /api/account/export` e `POST /api/internal/tick` a 10 requisições/minuto/IP; o tick também exige assinatura HMAC e timestamp válidos.
- Aplicar proteção gerenciada contra floods L3/L4/L7 e manter alertas de consumo para Vercel Functions, Firestore, Firebase Auth e Gemini.
- Não bloquear somente pelo User-Agent, não confiar em `X-Forwarded-For` fornecido pelo cliente e não usar o limite de IP como autenticação.

Os números acima são valores iniciais operacionais, não propriedades já aplicadas. Ajustar com telemetria de tráfego legítimo antes de bloquear. O proprietário do projeto precisa habilitar e validar esses controles no painel do provedor; nenhum DNS, produção ou configuração remota foi alterada nesta auditoria.

## Verificação após habilitação

Confirmar na borda do provedor, em preview autorizado, que limites atingidos retornam `429`, incluem `Retry-After` quando suportado e não impedem tráfego normal autenticado. Confirmar também que o firewall cobre as rotas `/api/*` e não altera o fluxo Firebase Auth/PWA. Fazer simulações pequenas e controladas, nunca teste volumétrico.
