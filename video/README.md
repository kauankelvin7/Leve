# Filme de produto do Leve — V3

72 s de produto real, composição editorial e áudio original. A versão master é a referência de qualidade; o arquivo README é um derivado comprimido para visualização rápida.

## Entregáveis

| Arquivo | Uso |
|---|---|
| `output/leve-product-film.mp4` | Master 1920×1080, 60 fps, H.264 CRF17, yuv420p, BT.709, AAC estéreo 48 kHz |
| `output/leve-product-film-muted.mp4` | Mesmo stream de vídeo, sem áudio |
| `output/leve-product-film-readme.mp4` | Derivado 1280×720 sem áudio, ≤10 MB; não usar para avaliar nitidez do master |
| `output/poster.png` | Poster 1080p da nova abertura |
| `output/leve-product-film.srt` | Dez cues editoriais, 72 s; não é transcrição de voz |

## Reproduzir a captura e a montagem

Requisitos existentes: Node 24, npm 11, Chromium, Firebase Emulator, FFmpeg, Python, NumPy e SciPy. Não há dependência nova na aplicação.

1. Inicie o app local com os emuladores; o preload intercepta somente o endpoint Gemini exato e a chave local é efêmera:

   ```sh
   env NODE_OPTIONS='--import=./video/capture/gemini-upstream-fixture.mjs' \
     GEMINI_API_KEY='local-fixture-only' LEVE_EPHEMERAL=true npm run dev
   ```

2. Em outro terminal, gere as capturas reais com data, timezone e viewport fixos; repita para confirmar determinismo:

   ```sh
   node video/capture/capture.mjs --polish --run v3-capture-3
   node video/capture/capture.mjs --polish --run v3-capture-4
   python3 video/capture/compare-runs.py v3-capture-3 v3-capture-4
   ```

   A captura usa conta fictícia no Emulator. Gika: apenas o upstream é interceptado; o contrato, UI, Auth, router e comando permanecem reais. O filme não sugere resposta Gemini ao vivo. O relógio Playwright é fixado para a data civil; o manifest preserva avisos de conexão offline esperados e o pequeno descompasso com o relógio real do Emulator.

3. Gere a composição de áudio e renderize:

   ```sh
   python3 video/audio/compose.py
   npm ci --prefix video/remotion
   npm run --prefix video/remotion render
   npm run --prefix video/remotion postprocess
   python3 video/scripts/verify
   ```

O master preserva o V2 no histórico Git; V3 substitui os caminhos de entrega corrente. Capturas de origem V3 e o manifest determinístico usado no filme ficam em `assets/captures/v3-capture-3/` e `capture/manifests/v3-capture-3.json`. Não foi alterado código funcional do Leve para filmar.

## Limites que o filme preserva

- Offline: dados consultados previamente, uma criação elegível na outbox e o estado após ACK/reconsulta; não é promessa de funcionamento completo, cache permanente ou sincronização universal.
- Gika: resposta controlada compatível com contrato real; não dizer que Gemini respondeu ao vivo.
- A divergência entre documentação offline e comportamento atual continua no claims ledger.
- Música e efeitos sintetizados/originais, MIT, sem samples externos/TTS; fontes Nunito e DM Sans OFL. Medições objetivas não equivalem à audição subjetiva humana, que permanece recomendada.

Relatórios: `reports/08-creative-audit.md`, `reports/08-creative-polish-report.md`, `reports/09-qa-v3.md`, `reports/claims-ledger.md`, `ASSETS.md`, `audio/MIX_REPORT-v3.md`.
