# M2 — evidências read-only

## Preflight M2-S0

Classificação definitiva em [M2_PREFLIGHT.md](M2_PREFLIGHT.md). Contraste completed e harness recorrência são baseline. Offline era regressão do dock Gika; corrigida no commit 7a3c343 com sequência Planner original 2 PASS e nova proteção desktop. Nenhuma regra/domínio Planner alterada.

## M2-T1 — adapter de modelo

PRE HEAD 7a3c343, worktree limpo; ownership server/gika, env examples, testes unit e docs. Provider-independent ModelAdapter; Gemini Developer generateContent explícito gemini-3.5-flash-lite; thinkingLevel MEDIUM; uma request, até três calls, 10s, 64 KiB, 1024 tokens, sem retry/fallback. Segredo somente process.env.GEMINI_API_KEY no header HTTP, nunca URL/log/cause/frontend. env.example contém somente GEMINI_API_KEY=; .env.example preserva config anterior e adiciona a variável vazia.

Gates executados 2026-09-30: npm run lint PASS; npm run build (dois typechecks) PASS; npm test 116 PASS/27 arquivos. Primeiro teste de privacidade falhou por matcher exigir propriedade cause ausente; corrigido para verificar ausência real, suite integral repetida PASS. Sem testes desabilitados ou chave fictícia; transport injetado usa Response fixtures offline.

Casos: missing env sem HTTP; 429/quota; 503/403; JSON/envelope inválido; malformed function call; truncamento; limites de bytes/calls; deadline de transport que ignora abort; falha sanitizada sem causa upstream; resposta válida; narrativa livre descartada. Interface não importa Firebase/commands.

Documentação oficial consultada em 2026-09-30: [modelo estável](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [Standard Free Tier gratuito](https://ai.google.dev/gemini-api/docs/pricing), [REST e MEDIUM](https://ai.google.dev/api/generate-content). Nenhum recurso financeiro foi configurado. Smoke real não executado: GEMINI_API_KEY ausente. A configuração financeira de um projeto real ainda deverá ser comprovada como sem billing antes do smoke; não é inferível de uma credencial ausente.
