# Entrega final — filme de produto do Leve

**Data:** 2026-10-07
**Branch:** `video/product-film`
**Base:** `33707a4e72b863f1689113f51e95118a5568bebe`
**QA independente:** **APPROVED** — 0 P0, 0 P1; 1 P2 documentado.

## Arquivos

| Arquivo | Detalhes | SHA-256 |
|---|---|---|
| `output/leve-product-film.mp4` | Master H.264, 1920×1080, 60 fps, 76 s, 28.499.290 bytes, sem áudio | `bb37187c80573a7b15a6e92ed5617d82254926d5310ce2222a185d26edd2c301` |
| `output/leve-product-film-muted.mp4` | Cópia sem áudio, idêntica ao master | `bb37187c80573a7b15a6e92ed5617d82254926d5310ce2222a185d26edd2c301` |
| `output/leve-product-film-readme.mp4` | H.264, 1280×720, 60 fps, 3.189.383 bytes (<10 MB) | `56b4c1b3a4d0392a93e8db3d32d588fede509633b3c767894ab329b93916bab4` |
| `output/poster.png` | Quadro real do master, 1920×1080 | `42596858f9feed591708abfb4a80e9ba68834b3eca61bd50ecf6c7a412c67223` |
| `output/leve-product-film.srt` | 9 cues editoriais, de 00:00 a 01:16 | `bd01631f913999847b3dc21a28daf5a6fa0d41f193609b8facfec721660d52b7` |

O SRT acompanha o texto planejado para uma gravação humana futura; o filme atual não tem voz gravada. O texto essencial está na imagem para compreensão sem áudio. Loudness, true peak e clipping não se aplicam ao master sem faixa sonora.

## QA e testes

- Revisão independente em `06-qa.md`: **APPROVED**, 0 P0, 0 P1. O único P2 é a ausência de cursor guiado pelo manifesto de ações; não há cursor deslocado nem artefato visual. A diferença ficou documentada e não compromete a leitura do filme.
- `video/scripts/verify`: passou; valida os arquivos obrigatórios, metadados, silêncio, dimensões, tamanho do MP4 leve e temporização do SRT.
- `ffprobe` e decode integral FFmpeg: passaram; master tem 4.560 quadros, BT.709, `yuv420p` e somente vídeo.
- `npm run build`: passou. TypeScript cliente/servidor e Vite concluíram. Vite emitiu o aviso existente de chunk maior que 500 kB; não houve alteração de produto para esta entrega.
- `npm run glass:e2e -- public.spec.ts`: 14/14 passaram, incluindo service worker com recarga offline de `/entrar` depois do cache.
- `npm run test:e2e:local -- persistent.spec.ts --grep 'login, ativação e atividade sobrevivem ao reload'`: 1/1 passou com Auth/Firestore Emulator.
- `git diff --check`: passou.

O QA também revisou contact sheet, 14 keyframes, amostragem do vídeo, SRT, ledger, capturas e scans de privacidade/segredos. Veja detalhes e limites em `06-qa.md`.

## Fidelidade e limites documentados

- **Gika — INTERCEPTADA:** UI, autenticação, endpoint do app, router, schema/contrato, comando e persistência no Emulator são reais. Só a requisição ao upstream Gemini usa fixture determinística compatível com o contrato. O próprio vídeo revela a demonstração controlada e não afirma geração ao vivo.
- **Offline — comprovado no escopo capturado:** mostra conteúdo já consultado após queda de rede, uma tarefa elegível aguardando conexão e a tarefa aparecendo após ACK e nova consulta. Não afirma que todo o produto funciona offline, que todo conteúdo é guardado ou que todas as mudanças sincronizam. A divergência entre documentação versionada e política atual da outbox permanece registrada em `03-capture-report.md`.
- **Cold open:** abertura limpa aprovada; sem queda de rede encenada.
- **Conteúdo:** conta e registros fictícios em ambiente local/emulador. Nenhum comportamento do produto foi alterado para a filmagem; todo o trabalho desta tarefa está em `video/`.
- **Áudio:** sem música ou TTS. O resumo falado visível na UI está limitado no ledger à síntese de voz do navegador quando suportada.
- **Licença de composição:** o render usa Remotion 4.0.410. A licença Free publicada pelo Remotion é condicionada a tamanho/tipo de organização; a elegibilidade do Leve não foi inferida. Confira os termos e a quantidade de pessoas da equipe antes de distribuição comercial, conforme `video/README.md`.

## Estado da entrega

O master e os arquivos auxiliares estão renderizados e aprovados nos checks acima. Capturas e renders grandes permanecem ignorados pelo Git; o poster e o MP4 leve do README são exceções permitidas e ficam versionáveis junto com o código da composição, verificadores e relatórios. Não houve push, publicação ou upload externo.
