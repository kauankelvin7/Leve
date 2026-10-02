# M7 — voz como entrada textual

Entrada25eecb063afa06d0d1dd98273baee354f42b7752, feat/gika-integration local=origin após fetch, worktree limpo. M6 revisado/aprovado; T1→T2 sequenciais autorizados. Ponytail/full/Caveman/full/humanizer local aplicados.

## Abordagem, suporte e privacidade

Reutiliza SpeechRecognition/webkitSpeechRecognition nativas, sem dependência. Detecção em runtime, contexto seguro e policy de microfone; presença de API não garante disponibilidade do serviço/permissão/hardware. MDN consultado em02/10/2026: Chrome/Android têm API normal/prefixada; Safari14.1+/iOS prefixada; Chromium/Edge/WebView dependem da implementação do fornecedor; Firefox aparece como preview no BCD, sem promessa stable. Browser sem API ou com policy bloqueada fica textual; denied/network/no-speech/start rejection preservam draft.

Fontes oficiais: [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json). MDN informa explicitamente que alguns browsers, como Chrome, enviam áudio a serviço web e não funcionam offline. Não ativamos processLocally/downloads de idioma nem declaramos on-device/localidade/retention do fornecedor. A UI informa possível envio ao serviço do navegador antes do gesto. O Leve não cria blobs/MediaRecorder/getUserMedia próprio, não armazena/loga áudio ou transcrição, não envia áudio ao Gemini. Texto revisado/enviado conscientemente segue o composer/conversa normal existente, sem histórico extra.

Permissions-Policy alterada somente microphone=()→microphone=(self); camera/geolocation continuam negados, nenhum origin terceiro autorizado. Guard unit verifica configuração exata e fronteira sem transport/storage/commands. Configuração versionada, sem deploy; não afirmar funcionamento de microfone em produção/dispositivo real por CI. Harness simula resultados da API, não permissão/hardware real.

## T1

Uma captura pt-BR/final-only por gesto, sem auto-restart/envio. Estados starting/listening/processing/ready/denied/unsupported/error; cancel/close/offline/loading/unmount abortam, eventos atrasados não mudam draft. Shell keyed por session.uid mantém isolamento existente. Draft anterior anexado sem truncar/substituir; mudança concorrente/limite recusam transcrição e preservam texto. Campo revisável após final; send/Enter bloqueados durante captura, ações textuais originais permanecem independentes. Botão44px/aria-pressed/live status/teclado, nenhuma animação nova.

Primeiro lint PASS; primeiro build/typecheck FAIL TS2416 por fixture Denied sobrescrever Mock com função simples. Correção somente tipagem do mock, sem afrouxar asserção. Rodada corrigida lint/doisTS/build/522unit PASS; integração completa252PASS,8arquivos em emuladores demo novos; audit produção high/JSON0total (0critical/high/moderate). Primeiro E2E focal5/5PASS em43,8s: gesto/final/edit/manualsend, cancel/latefinal, denied/draft e dois M1foco/layout; Axe listening0. Nenhum timeout/retry/assertion de domínio relaxado, nenhuma tentativa omitida.

M1 regressão adapta apenas foco ao botão agora disponível e label/availability; teclado/foco continuam explicitamente assertados, sem disparar hardware em CI. Sem auth/server/router/commands/policy/confirmation/receipts/revisions/recurrence/batch/organization/Rules/outbox/dependências alterados. Único ajuste de deploy é header self. Screenshots históricos gerados restaurados. Logs sanitizados /tmp/leve-m7-*; nenhum segredo real/Gemini live/PR/main/deploy/M8/Character/TQA.
