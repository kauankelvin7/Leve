# Proteção de borda do Leve

## Limite do que o repositório consegue proteger

A API valida autenticação e autorização, limita payloads e aplica cotas por conta em operações caras. Esses controles reduzem abuso de aplicação depois que uma requisição chega à função. Não absorvem tráfego volumétrico, saturação de conexões, esgotamento da cota Firebase/Gemini nem floods antes da execução da função.

## Opções no provedor — não aplicadas

As páginas oficiais da Vercel consultadas em 14/10/2026 informam que o WAF está disponível em todos os planos. No Hobby, o limite é de três regras customizadas no total, três bloqueios de IP por projeto e uma regra WAF de rate limiting por projeto. A regra de rate limiting no Hobby usa janela fixa de 10 s a 10 min e chaves IP ou JA4 Digest. A documentação lista 1.000.000 de requisições permitidas incluídas e preço de US$ 0,50 por milhão de requisições permitidas; confirme região, franquia e cobrança aplicável no painel antes de ativar. Os limites podem mudar.

Fontes: [limites do WAF](https://vercel.com/docs/vercel-firewall/vercel-waf), [rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) e [uso e preços](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing), consultados em 14/10/2026.

Os valores abaixo são pontos de partida para uma avaliação, não configuração existente nem autorização para ativar proteção. A Hobby permite apenas uma regra WAF de rate limiting por projeto, portanto não comporta limites independentes por rota como os exemplos abaixo:

- `POST /api/gika/*`: avaliar 30 requisições por IP em janela fixa de 60 s.
- `POST /api/commands`: avaliar 120 requisições por IP em janela fixa de 60 s. A API também aplica 60 mutações/minuto e 1.000/dia por UID.
- `GET /api/account/export` e `POST /api/internal/tick`: avaliar 10 requisições por IP em janela fixa de 60 s.

No Hobby não há configuração de burst/token bucket; a documentação reserva token bucket para Enterprise. Para aplicar limites diferentes às rotas, confirme quantas regras o plano do projeto permite e o custo antes de publicar uma alteração no painel.

O Firebase classifica App Check como recurso sem custo, sujeito às cotas do provedor de atestação. O uso do reCAPTCHA Enterprise pode gerar cobrança acima da franquia. Antes de ativar enforcement, é preciso integrar a emissão do token no cliente e a validação na API, observar métricas e testar o fluxo em Preview.
Fontes: [planos Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [proteção de APIs próprias](https://firebase.google.com/docs/app-check/web/custom-resource) e [preços do App Check](https://firebase.google.com/docs/app-check).

Nenhuma regra de borda ou App Check foi ativado nesta revisão. Não bloqueie somente por User-Agent, não confie em `X-Forwarded-For` enviado pelo cliente e não trate limite por IP como autenticação. Alertas de consumo não impõem limite de gasto.

## Verificação após habilitação

Em Preview autorizado, confirme que limites atingidos retornam `429`, incluem `Retry-After` quando suportado e não bloqueiam tráfego normal autenticado. Confira que a regra cobre as rotas `/api/*` sem interferir em Firebase Auth ou no PWA. Use simulações pequenas e controladas; não faça teste volumétrico.
