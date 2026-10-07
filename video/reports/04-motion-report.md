# Fase 4 — motion / Remotion

**Status: CONCLUÍDA — submetida ao Gate 4 visual.** A montagem final de 76 segundos foi composta a partir das capturas atualizadas e limpas da Fase 3, revisada em contact sheet e frames em tamanho integral, e exportada sem áudio artificial. Nenhum arquivo ou comportamento do produto foi alterado.

## Montagem

- Composição `LeveProductFilm`: 1920×1080, 60 fps, 4.560 frames, duração exata de 76 s. A ordem segue o storyboard aprovado: abertura limpa, marca, Meu dia, calendário desktop/mobile/retorno, notas, compras, Gika, estados offline e retomada, retorno à mesma nota e encerramento.
- Direção “Vidro & Papel” usa cores e tipografia de `DESIGN.md` e `apps/web/src/styles/refinements.css`, capturas reais 2x, moldura editorial discreta, movimentos de câmera suaves, sobreposições e transições curtas. O layout preserva a legibilidade e deixa a interface como foco. O quadro mobile usa a captura real do descriptor Pixel 7, sem simular componentes do produto. A marca usa o bitmap capturado no produto em escala moderada; o recorte remove apenas o padding vazio à direita, sem redesenhar letras.
- O master final é `video/output/leve-product-film-muted.mp4` (artefato ignorado pelo Git): H.264, 1920×1080, 60/1 fps, 4.560 frames, 76,000 s, `yuv420p`, range limitado, primárias/transferência/matriz BT.709, sem stream de áudio. SHA-256: `bb37187c80573a7b15a6e92ed5617d82254926d5310ce2222a185d26edd2c301`.
- A renderização intermediária `video/output/leve-product-film-final-render.mp4` contém a faixa AAC silenciosa padrão do Remotion; o passe FFmpeg removeu completamente o áudio e converteu o master para BT.709/yuv420p. Não foi adicionada narração sintética, música ou TTS.

## Transparência e claims

- **Gika — INTERCEPTADA.** A tela é a UI real com autenticação, router, comando, schema e gravação no Emulator reais; somente a chamada upstream Gemini recebeu fixture determinística compatível com o contrato. A sobreposição informa “Demonstração controlada · resposta do modelo predefinida”. O filme não apresenta a resposta como geração ao vivo nem afirma entrega de push no aparelho.
- **Offline — escopo comprovado.** A sequência começa com dados previamente consultados ainda visíveis durante a desconexão, mostra uma tarefa coberta pela fila local aguardando conexão, e termina com a tarefa visível após reconexão. A legenda contextualiza esses estados; não afirma funcionamento integral offline, sincronização de todos os dados ou garantia universal de preservação. A divergência entre documentação versionada (opt-in) e política atual da outbox (ativa por padrão, com opção local para desligar) permanece registrada em `03-capture-report.md` e não foi transformada em claim.
- A abertura usa o fallback limpo do storyboard, sem queda de conexão artificial. Todas as mensagens editoriais estão gravadas na imagem, então a narrativa é compreensível sem áudio.

## Validação visual e técnica

- As capturas de `run-1` foram reinspecionadas após a correção documentada na Fase 3: estados online limpos, sem faixa offline/cacheada/restaurada. A contact sheet final e os quadros de Gika, offline consultado, tarefa pendente, reconexão e mobile foram revistos em resolução integral.
- O quadro de tarefa pendente mostra o formulário real com “Salvo neste aparelho e aguardando conexão”; só nesse trecho aparece a frase “Uma tarefa compatível aguarda a conexão voltar”. A frase não aparece no estado offline anterior à criação da tarefa. Após a reconexão, a atividade “Regar as plantas” aparece na lista real.
- O encerramento retorna à mesma nota fictícia “Uma ideia para retomar” apresentada na cena Notas. Não há edição offline da nota.
- TypeScript: `npx --prefix video/remotion tsc --noEmit -p video/remotion/tsconfig.json` passou.
- Render integral: `npm run --prefix video/remotion render` concluiu as 4.560 frames. `npm run --prefix video/remotion postprocess` concluiu a conversão do master. `ffprobe` confirmou duração, dimensão, cadência, pixel format e as três tags BT.709; a inspeção confirma que só existe stream de vídeo.
- A escala do wordmark foi conferida primeiro em um render curto da cena real; a renderização completa final usa a mesma composição inspecionada.
- Contact sheet: `video/output/frame-contact-sheet.jpg`; 14 frames-chave em `video/output/keyframes/`. Esses artefatos e o master ficam em `video/output/`, caminho ignorado pelo Git.

## Handoff do Gate 4

**STATUS:** composição e validação de Motion concluídas; submetida para avaliação visual do Gate 4. Isto não declara QA final do vídeo nem aprovação de Gate 5.

**ARTEFATOS:**
- `video/remotion/src/film.tsx` e `video/remotion/src/components.tsx` — composição e componentes.
- `video/remotion/package.json` — comandos isolados de render e pós-processamento.
- `video/output/leve-product-film-muted.mp4` — master final, sem áudio (ignorado pelo Git).
- `video/output/frame-contact-sheet.jpg` e `video/output/keyframes/` — revisão visual (ignorados pelo Git).
- `video/reports/03-capture-report.md` — evidência e limites das claims de captura.

**PROBLEMAS:** nenhum bloqueio visual ou técnico identificado na revisão desta fase. A prova de entrega de notificações push no dispositivo continua fora das claims e do escopo comprovado.

**PRÓXIMO PASSO:** avaliação independente do Gate 4. Não iniciar QA da Fase 5 até aprovação visual explícita.


## V2 — direção e acabamento

72 s / 4320 frames. Composição existente refinada, sem novo pipeline: abertura 4 s, marca 3 s, Meu dia 9 s, calendário 7 s, mobile 4 s, notas 8 s, compras 7 s, Gika 11 s, offline 12 s, encerramento 7 s.

Câmera passa de aberto a médio/close conforme ação: tarefa e item concluídos, seleção de data, escrita/salvamento, painel Gika e estados offline. Cursor usa bounding boxes reais do manifesto. CameraMove limita o crop ao conteúdo real; easing controlado e máscaras de folha em apenas três transições, com cortes secos nos demais planos. Logo de encerramento por aproximadamente 2 s. Fontes e marca existentes preservadas.

Spikes V2: abertura, mobile e Gika renderizados antes do integral; correção de interpolação com um único keyframe e reenquadramentos de calendário/Gika/nota após inspeção de frames 1080p. Nenhuma mudança na aplicação foi feita. Capturas de estado ganham movimento editorial; não são apresentadas como gravação contínua ou inferência ao vivo.

Master visual: Remotion 4.0.410, PNG source, H.264 CRF17, yuv420p, BT.709, 1080p60. Pós-processamento preserva stream de vídeo, muxa mix original em AAC 48 kHz e gera versão muted/README separadas.
