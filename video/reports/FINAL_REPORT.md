# Entrega final V2 — Leve Product Film

Data: 2026-10-07. Branch: `video/product-film`. Produto base: `33707a4e72b863f1689113f51e95118a5568bebe`; iteração sobre V1 `e60717960455a37903e356f9e78ce09475a900c9`.

**QA APPROVED — 0 P0, 0 P1.** Loop realizado: primeiro master V2 REJECTED por recorte da mensagem offline; câmera corrigida; master integral renderizado novamente e revisado independentemente. Evidências em `06-qa.md`.

## Arquivos finais

| Arquivo em output/ | Uso | Bytes | SHA-256 |
|---|---|---:|---|
| `leve-product-film.mp4` | Master 1080p60 H.264 CRF17 / AAC 48 kHz estéreo | 11,900,248 | `c4ad4073d7f18b8a0c4ef6b45f85ec0edfa86cd4c12b3fb4cd99907c20c7bb9e` |
| `leve-product-film-muted.mp4` | Mesmo stream visual, sem áudio; local | 9,583,649 | `aca6c1fc7f0d7ec0970da0cbe7f50d2ca408f69ceec89b8dcd5ab1431d2c0e6b` |
| `leve-product-film-readme.mp4` | Derivado 720p CRF24, sem áudio | 2,947,848 | `9d3dfcfa3704cc81a19e5daf91d18ccd737f3b2b701e018525e832d425a29a9c` |
| `poster.png` | Poster 1080p, frame 5,9 s | 214,869 | `0b37e1a234baf243c8db08e79d8bb776915e22eb0fe740f3408a2fef8c76f721` |
| `leve-product-film.srt` | 9 cues editoriais, 72 s | 817 | `151ae8938765d95bfdb4461eadaa649adfd6cc77963136ddea986f7cc1c2fe89` |

72,000 s, 4320 frames, H.264 yuv420p BT.709, CRF17, faststart. Remotion converteu capturas RGB pela matriz BT.709; tags VUI de primárias/transferência foram acrescentadas sem recodificação visual. Master e muted têm streams comprimidos de vídeo iguais, hashes de arquivo diferentes pela faixa sonora/container. README é somente derivado, não master.

## Validação executada nesta iteração

- 27 estados reais × duas execuções Playwright; comparação 27/27 PASS, 20 idênticos; ACK 200 das operações demonstradas.
- Typecheck isolado da composição e renders curtos abertura/mobile/Gika: PASS.
- `python3 video/scripts/verify`: PASS no hash final acima; metadados, áudio, igualdade dos streams visuais, tamanho do README e SRT.
- Decode integral FFmpeg: sem erros, repetido independentemente.
- QA de direção: contact sheet 1 fps, 18 keyframes 1080p e transições com amostragem densa; abertura com ação, variedade de câmera, mobile real, copy e continuidade.
- AAC final medido: **−16,01 LUFS / −2,47 dBTP / LRA 6,80**. Mix original 48 kHz, música e efeitos MIT, sem samples externos/TTS/locução.
- `git diff --check`: PASS; alterações restritas a `video/`.

Testes de produto da V1 permanecem em `FINAL_REPORT-v1.md`; não são apresentados como repetidos nesta iteração. A aplicação não foi alterada.

## Fidelidade e limites

Gika **INTERCEPTADA** somente no upstream Gemini; contrato/UI/Auth/router/comando reais. Sem alegação ao vivo ou latência real. Disclosure técnico saiu do filme conforme pedido e segue nos relatórios/ledger.

Abertura: nota digitada e salva online antes da queda; permaneceu na página aberta. Offline posterior: conteúdo já consultado, uma tarefa elegível na outbox, ACK/reconsulta após reconexão. Nenhuma garantia universal de cache/permanência/sincronização. Divergência documental do default offline preservada.

Mobile real Pixel 7 390×844/2x/touch: consulta/abertura da mesma nota. Seed e conteúdo fictícios. Retorno à mesma nota no fecho e logo por ~2 s. Identidade Vidro & Papel e marca original preservadas.

## Pendências menores documentadas

P2: audição subjetiva humana indisponível neste ambiente (níveis/arranjo/sincronismo avaliados objetivamente, sem fingir escuta); marca bitmap sobre fundo original; cursor de saída breve em duas ações; formato nativo MM/DD do input Chromium apesar de calendário civil pt-BR correto. Nenhum P0/P1 restante. Condições comerciais do Remotion seguem sob responsabilidade de distribuição.

V1, primeira V2 rejeitada, capturas e stems pesados foram preservados localmente. Master V2 também versionado, cerca de 12 MB sem compressão adicional para GitHub; muted permanece local. `07-polish-report.md` detalha diferenças e assets/licenças.
