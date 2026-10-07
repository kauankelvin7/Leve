# Filme de produto do Leve

Master editorial de lançamento, composto com capturas do aplicativo real em ambiente local com Firebase Emulator. Duração: 76 segundos. O vídeo funciona sem áudio: os títulos e explicações essenciais estão na imagem. Não usamos música nem voz sintética. O SRT acompanha o texto de narração preparado para eventual gravação humana e não representa fala gravada no master.

[![Assistir ao filme de produto (76 s)](output/poster.png)](output/leve-product-film-readme.mp4)

## Entregáveis

- `output/leve-product-film.mp4` — master H.264, 1920×1080, 60 fps, 76 s, sem faixa de áudio.
- `output/leve-product-film-muted.mp4` — master sem áudio; idêntico ao arquivo acima.
- `output/leve-product-film-readme.mp4` — versão H.264 1280×720, inferior a 10 MB.
- `output/poster.png` — quadro de abertura em 1920×1080.
- `output/leve-product-film.srt` — texto editorial alinhado à estrutura de 76 s; requer sincronização se uma voz humana for gravada.

Os renders e as capturas são locais e ignorados pelo Git; `video/README.md`, roteiros, código de captura e relatórios são versionáveis.

## Reproduzir

Requisitos: Node 24, npm 11, Chromium em `/usr/bin/chromium`, FFmpeg, Firebase Emulator e dependências instaladas no repositório.

1. Inicie o fluxo local do Leve com `npm run dev` na raiz, Auth/Firestore Emulator e a fixture upstream Gemini documentada em `capture/gemini-upstream-fixture.mjs`.
2. Gere as capturas fictícias: `node video/capture/capture.mjs --run run-1` e `--run run-2`.
3. Compare os estados: `python3 video/capture/compare-runs.py`.
4. Instale as dependências isoladas de composição uma vez com `npm ci --prefix video/remotion`.
5. Renderize e pós-processe: `npm run --prefix video/remotion render`, depois `npm run --prefix video/remotion postprocess`.
6. Gere a cópia compacta/poster usando os comandos FFmpeg mantidos no relatório da Fase 6.
7. Rode `video/scripts/verify`.

As capturas autenticadas usam dados sintéticos no Emulator, não dados de produção. As cenas online não reutilizam IndexedDB; somente as cenas offline recebem o cache preparado. A resposta Gika usa uma fixture determinística compatível com o contrato upstream, enquanto UI, autenticação, router, comando e persistência local são reais. A interceptação é revelada dentro do filme e descrita em `reports/03-capture-report.md`.

## Escopo offline

O vídeo mostra estados efetivamente validados: dados consultados antes continuam visíveis após a desconexão; uma criação de tarefa elegível aguarda a rede; após ACK do servidor e nova consulta, a tarefa aparece na agenda. Isso não demonstra que o app inteiro funciona offline, que todo o histórico fica disponível ou que toda alteração sincroniza. A divergência encontrada entre a documentação versionada e o padrão atual da outbox está registrada em `reports/03-capture-report.md`.

## QA e evidências

- `reports/FINAL_REPORT.md` — decisões, limitações e hashes finais.
- `reports/06-qa.md` — auditoria independente e veredito.
- `reports/claims-ledger.md` — evidências e status das afirmações.
- `output/frame-contact-sheet.jpg` e `output/keyframes/` — inspeção visual da sequência.

## Licenças

O render usa Remotion 4.0.410 conforme os termos vigentes verificados durante esta tarefa. A licença Free publicada pelo Remotion limita-se a indivíduos, equipes/organizações de até três pessoas, organizações sem fins lucrativos ou avaliação. A elegibilidade de Leve não foi presumida; confira os termos e o tamanho da equipe antes de distribuição comercial. O master local é uma versão candidata para revisão.
