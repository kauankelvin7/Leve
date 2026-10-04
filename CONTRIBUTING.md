# Trabalhar no Leve

Use Node24, npm11 e Java21 para os emuladores. Instale com `npm ci --include=dev` e `npx playwright install chromium`.

`npm run dev` inicia Auth/Firestore Emulator, API e Vite. `npm run seed:local` prepara somente dados sintéticos de `demo-leve`. O produto real é a agenda autenticada; `/demo` é referência histórica.

## Verificar

Feche o servidor de desenvolvimento antes dos gates que iniciam emuladores próprios.

- `npm run verify`: audit de produção, lint/guardrails, ambos typechecks/build, unitários, integração Auth/Rules/commands e oito jornadas Gika críticas. Não requer credencial Gemini.
- Durante uma alteração pequena, execute primeiro o teste focal correspondente. Preserve a primeira falha; não aumente deadline/retry nem remova asserções para obter verde.
- Para RC, acrescente `npm run test:e2e:local` e `npm run test:e2e` ao `verify`: suíte autenticada completa e shell de produção. Revise visualmente telas reais, claro/escuro, mobile/tablet/desktop, teclado, modo sólido/reduced motion e200%. Os screenshots/artefatos locais não substituem validação em dispositivo.

O CI executa o núcleo e o E2E crítico; a suíte ampla fica no gate de RC. `check:boundaries` reutiliza o parser já instalado pelo ESLint: proíbe imports runtime de persistência/commands internos em model/router/UI, e de model/API/commands em voz/proatividade/character. As únicas exceções server-side são os leitores convencionais `reads.ts`/`batchGuard.ts`, somente `db`/`commandHash`; isso não autoriza novos writers.

## Contratos

Leia `AGENTS.md`, `.agent/GIKA_STATE.md`, `.agent/GIKA_TASKS.yaml` e `.agent/GIKA_EXECPLAN.md` antes de alterar a Gika. Arquitetura/policy/evals estão em `docs/gika/`.

Toda mutação passa pela API/command layer existente, com UID autenticado, ownership, expectedRevision, receipt e ack real. Modelo propõe; software resolve identidades e valida. Preview e confirmação devem selar o mesmo efeito. Recorrência occurrence/future separados; all unsupported; batch cap5, partial explícito. Nunca criar writer/collection/outbox/persistência paralelos.

Offline não autoriza IA, microfone simulado, fila de prompts ou execução automática ao reconectar. Preserve draft e agenda convencional. Logs somente técnicos: sem tokens, UID, texto, agenda, transcrição, payload ou receipt completo. `GEMINI_API_KEY` é exclusivamente server-side; nenhuma chave privada em `VITE_*`, arquivos versionados ou artefatos de teste. Use somente Free Tier/R$0; sem billing/deploy/main/PR sem autorização.

O estado registra limites operacionais: AppCheck adiado até configuração/UAT gratuitos, rate limit Gika por instância, microfone/dispositivo real e Gemini live não comprovados nesta regressão. `CHARACTER_ASSET_REQUIRED` exige asset/rig reais antes de concluir o acabamento visual; fallback/documentação não completam a personagem.
