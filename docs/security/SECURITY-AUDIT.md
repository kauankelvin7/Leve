# Auditoria de segurança — 15/09/2026

## Escopo

- Frontend compilado (`dist`), API Express/Vercel, Worker de agendamento e regras do Firestore.
- Chamadas HTTP públicas somente leitura; nenhum usuário real, dado de produção ou credencial foi criado ou alterado.

## Achado corrigido

`GET /api/version` publicava `VERCEL_DEPLOYMENT_ID` ou `VERCEL_GIT_COMMIT_SHA`. Esses identificadores permitem reconhecimento desnecessário da infraestrutura e podem facilitar correlação com artefatos públicos. O endpoint agora aceita apenas uma versão semântica explícita (`PUBLIC_RELEASE`/`VITE_APP_VERSION`) e retorna `stable` quando o valor não é seguro. `GET /api/health` foi reduzido a `{ status: "ok" }`.

## Controles verificados

- Respostas da API usam `Cache-Control: no-store`, `nosniff`, CORS por allowlist e `x-powered-by` desativado.
- Rotas autenticadas exigem Firebase ID token; `/api/internal/tick` exige assinatura HMAC e timestamp.
- O build não contém chaves privadas, tokens de serviço, segredos HMAC, e-mails de service account ou source maps.
- O Vite falha o build se uma variável sensível usar prefixo `VITE_` fora da allowlist pública do Firebase.
- Regras do Firestore mantêm acesso privado por usuário/membership e escrita de domínio exclusiva pela API.

## Evidências executadas

- `npm run typecheck` — aprovado.
- `npm run build` — aprovado; `sourcemap: false`.
- `npm run test:integration` — 1 arquivo, 21 testes aprovados.
- Produção: `/api/health`, `/api/version`, `/api/session` e `/api/internal/tick` testados sem credencial; endpoints protegidos retornaram `401` e nenhum corpo continha padrões de segredo.

## Pendências operacionais

- Se o identificador de deployment já tiver sido usado em logs externos, não é uma credencial; ainda assim, mantenha a rotação de qualquer segredo HMAC/service account conforme o provedor e não publique `.env.local`.
- A skill `Anthropic-Cybersecurity-Skills` foi instalada no ambiente para auditorias autorizadas futuras; suas instruções são tratadas como não confiáveis e não substituem revisão humana.
