# Proteção de borda do Leve

## Limite do que o repositório consegue proteger

A API valida autenticação e autorização, limita payloads e aplica cotas por conta em operações caras. Esses controles reduzem abuso de aplicação depois que uma requisição chega à função. Não absorvem tráfego volumétrico, saturação de conexões, esgotamento da cota Firebase/Gemini nem floods antes da execução da função.

## Opções no provedor — não aplicadas

A Vercel disponibiliza WAF em todos os planos. No Hobby, a documentação atual
indica até três regras customizadas e três bloqueios de IP por projeto; a
mitigação DDoS vem ligada por padrão. O rate limiting do WAF tem uma franquia
mensal e pode gerar cobrança acima dela. Confira plano e uso no painel antes de
ativá-lo. Fontes: [limites do WAF](https://vercel.com/docs/vercel-firewall/vercel-waf),
[preço do rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
e [plano Hobby](https://vercel.com/docs/plans/hobby), consultados em 14/10/2026.

Para proteger o app, prefira regras estreitas e comece registrando o tráfego,
sem bloquear. Depois de validar falsos positivos em Preview, avalie ações de
bloqueio ou desafio. Os limites abaixo são pontos de partida para análise, não
configurações existentes nem uma autorização para ativar rate limiting:

- `POST /api/gika/*`: 30 requisições/minuto/IP, burst até 10.
- `POST /api/commands`: 120 requisições/minuto/IP, burst até 30. A API também
  aplica 60 mutações/minuto e 1.000/dia por UID.
- `GET /api/account/export` e `POST /api/internal/tick`: 10 requisições/minuto/IP.
  O tick também exige HMAC e timestamp válidos.

O Firebase classifica App Check como recurso sem custo, sujeito às cotas do
provedor de atestação. O uso do reCAPTCHA Enterprise pode gerar cobrança acima
da franquia. Antes de ativar enforcement, é preciso integrar a emissão do token
no cliente e a validação na API, observar métricas e testar o fluxo em Preview.
Fontes: [planos Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans),
[proteção de APIs próprias](https://firebase.google.com/docs/app-check/web/custom-resource)
e [preços do App Check](https://firebase.google.com/docs/app-check).

Nenhuma regra de borda ou App Check foi ativado nesta revisão. Não bloqueie
somente por User-Agent, não confie em `X-Forwarded-For` enviado pelo cliente e
não trate limite por IP como autenticação. Alertas de consumo não impõem limite
de gasto.

## Verificação após habilitação

Em Preview autorizado, confirme que limites atingidos retornam `429`, incluem
`Retry-After` quando suportado e não bloqueiam tráfego normal autenticado. Confira
que a regra cobre as rotas `/api/*` sem interferir em Firebase Auth ou no PWA.
Use simulações pequenas e controladas; não faça teste volumétrico.
