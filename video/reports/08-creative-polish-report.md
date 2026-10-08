# V3 — relatório de direção e acabamento

## Resumo de V2 → V3

V2 já tinha ações reais, mobile, música e acabamento técnico aprovado. O problema era a montagem uniforme: a maior parte das cenas mantinha headline à esquerda e janela do app à direita. V3 mantém o arco e 72 segundos, mas trata a UI como imagem principal: cold open em close; Meu Dia/calendário/compras/Gika em full-frame; nota em close editorial; mobile vertical real; offline em recortes motivados; fecho voltando à mesma nota. A cartela de marca foi removida. O logo permanece na sidebar real do app.

| Cena | Alteração V3 | Objetivo / limite |
|---|---|---|
| Abertura | Digitação começa sem logo; câmera parte de close, recua para a frase de marca integrada à nota. | Ação nos primeiros quadros; nota salva online antes de corte de rede, sem prometer escrita offline. |
| Meu Dia | Full-frame, push-in no checkbox, feedback real e pull-back. | A câmera acompanha a conclusão, não repete uma manchete descritiva. |
| Calendário → mobile | Close no dia selecionado e match cut para nota real aberta no Pixel 7. | Continuidade de conteúdo em dois formatos; não afirma sincronização garantida. |
| Notas | Close que prioriza título e corpo; sem painel explicativo. | Menos espaço perdido e maior intimidade editorial. |
| Compras | Checkbox e progresso em close, seguido de contexto. | Ação real e resposta visual com densidade sonora contida. |
| Gika | Full-frame contextual; push-in durante o pedido/resultado e recuo. | Gika segue parte do Leve, não chatbot em cartela. Fixture upstream `respond_turn/create_task`, contrato estrito; comando real. Sem alegação ao vivo. |
| Offline | Energia baixa; captures reais de banner, título da tarefa e aviso nativo pendente em closes separados; volta ao plano após ACK/reconsulta. | Evita formato nativo de data no foco. Mostra só o estado e a tarefa efetivamente comprovados. |
| Fecho | Retorno à mesma nota; headline entra no espaço livre. | Logo continua dentro da UI real, sem vários segundos de logo parado. |

## Capturas e determinismo

Nova captura Playwright em 08/10/2026, `America/Sao_Paulo`, desktop 1600×900 CSS/2x e Pixel 7 390×844 CSS/2x/touch; seed e tempo controlados. `capture.mjs` fixa a data civil para impedir que o avanço do relógio do ambiente mova a tarefa para fora do dia mostrado. A resposta determinística da Gika foi ajustada para 09/10/2026 (“amanhã”); nenhuma resposta ao vivo foi enviada.

Runs `v3-capture-3` e `v3-capture-4`: 27 capturas e viewport mobile comparadas. Todas dentro da tolerância do comparador; imagens de ação, cenas e dispositivo permanecem deriváveis do UI/Emulator. Os manifests guardam ações, bounding boxes, ACKs, hashes e scans de privacidade/loading. Screenshots e manifest final estão em `assets/captures/v3-capture-3/` e `capture/manifests/v3-capture-3.json`.

A abertura e o mobile foram renderizados como spikes antes do master. O primeiro master detectou chave de câmera ausente ao entrar no mobile; foi corrigida e o trecho de 4 s renderizado novamente sem erro antes do render integral. Um segundo problema encontrado durante a recaptura foi a data avançada: o teste passou a fixar o relógio; o outro gate encontrado foi a fixture incompatível com “amanhã”, corrigido para 09/10 e validado no router/command real.

## Motion, edição e som

Componente existente `CameraMove` agora aceita retângulos de câmera animados e modo full-frame sem card periférico. Easing Bezier preservado. A montagem alterna planos abertos, médios, close funcional e mobile vertical. Há cortes secos; paper reveal apenas em passagens selecionadas, um fade na mudança de energia. Nada de 3D/neon/glitch; motion acompanha gesto, seleção, foco ou reconexão.

Composição e síntese originais existentes, revisadas e remapeadas para os cortes V3: seed 20261007, 92 BPM, 48 kHz estéreo; sem sample externo, stock ou TTS. Eventos de save, tarefa, mobile, compras, Gika, conexão e dois paper passes foram retemporizados. Há silêncio relativo no offline e retorno após o ACK; sem som em todo clique. Origem e licença MIT ficam em `audio/README.md` e `ASSETS.md`; Nunito/DM Sans seguem OFL.

Mix WAV medido na execução V3: −16,00 LUFS, −2,26 dBTP e LRA 6,60 LU. (O AAC reconstruído do master será medido à parte.) Não há audição humana disponível nesta sessão; o relatório não afirma uma avaliação subjetiva de timbre/música.

## Produto e claims

Nenhuma alteração funcional no Leve. O offline continua restrito a dados consultados, uma tarefa elegível na outbox e resultado após reconexão/ACK. A divergência de documentação sobre padrão offline continua registrada. Gika usa resposta fixture controlada compatível com contrato; UI/Auth/router/comando reais. Nenhuma nova claim universal ou de geração ao vivo foi introduzida. O texto editorial mobile não promete sincronização ou operações equivalentes em todo dispositivo.

## Estado de entrega

### Iteração V3.1 e QA final

O primeiro master V3 foi rejeitado durante a revisão: os closes offline cortavam a mensagem e davam zoom excessivo; a amostragem de transições também revelou quadros pretos nos efeitos `fade`/`sheet`, pois as cenas são sequenciais e não havia uma camada anterior por baixo. Corrigi os alvos da câmera offline e removi esses efeitos isolados, mantendo cortes secos apoiados por continuidade de enquadramento/ação. Não houve alteração no produto nem criação de UI.

O trecho offline de 12 s foi renderizado como spike e revisado em resolução integral antes do master. O título “Regar as plantas”, o formulário com data e o texto nativo “Salvo neste aparelho e aguardando conexão.” ficaram legíveis, com botões inteiros. Depois da mudança de transições, foram inspecionadas amostras antes e depois das oito fronteiras entre cenas; sem quadro vazio/preto. O contact sheet final de 72 quadros (1 fps) e frames integrais de abertura, Meu Dia, calendário, mobile, Gika, offline e nota de encerramento foram revistos.

### Master e derivados

- Duração: 72 s / 4.320 frames, 1920×1080, 60 fps, H.264, yuv420p, BT.709, AAC estéreo 48 kHz.
- AAC decodificado: −16,01 LUFS, −2,26 dBTP (limite ≤ −1,5 dBTP).
- README: 1280×720, sem áudio, 4.037.000 bytes; derivado, não referência para qualidade do master.
- SHA-256 do master: `73591c58e6198242534ea46dfb06e90ba079da17d1fa91e2aa010341d5263562`.
- `python3 video/scripts/verify`: PASS. Decodificação integral FFmpeg: PASS, sem erros. `git diff --check`: PASS.
- Visual final: PASS nas amostras a 1 fps, keyframes de cenas e fronteiras; os dois defeitos encontrados no loop foram corrigidos e o master foi rerenderizado.

### Gates, limites e problemas restantes

- P0: 0. P1: 0 conhecidos após a correção e o novo master.
- Claims: sem nova claim offline universal. Conteúdo previamente consultado, tarefa elegível em fila e ACK/reconsulta permanecem limites explícitos no ledger. O aviso amplo da própria UI e a divergência documentação/comportamento continuam documentados; o produto não foi alterado.
- Gika: UI/API/router/comando/contrato reais; apenas a chamada upstream usa fixture determinística. Não se afirma geração Gemini ao vivo.
- Áudio: música e efeitos foram compostos/sintetizados neste projeto, sem assets externos, samples ou TTS; origem/licença em `audio/README.md` e `ASSETS.md`. Níveis e true peak foram medidos. Limite restante: não houve audição humana subjetiva nesta sessão, portanto não alego aprovação auditiva de timbre/mix.
- Nenhuma alteração fora de `video/`; dados de captura são fictícios e usam Firebase Emulator. Nenhuma tela de cliente/produção foi incluída.

### Relatórios e evidências

Auditoria anterior às alterações em `08-creative-audit.md`; gate e evidência final em `09-qa-v3.md`; medições em `audio/MIX_REPORT-v3.md`; claims e limites em `claims-ledger.md`. A folha de contato integral está em `video/output/v3-final-contact-1fps.jpg` no workspace e é derivada de revisão, não parte do filme.
