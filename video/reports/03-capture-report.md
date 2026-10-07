# Fase 3 — captura

**Resultado do reteste: PASS — Gate 3 reaberto e aprovado.** A primeira aprovação foi invalidada quando Motion encontrou a faixa offline persistente nas imagens/sidecars de Meu dia e marca. A causa foi o harness reutilizar `storageState({ indexedDB: true })` em cenas online: as consultas podiam exibir o primeiro snapshot do cache sem esperar o snapshot do servidor. O harness agora separa estados: cenas online usam auth/localStorage sem IndexedDB; apenas a cena offline recebe o IndexedDB previamente populado. Cada imagem online aguarda `navigator.onLine === true`, conteúdo esperado carregado, faixa de dados em cache oculta e ausência das faixas offline/restaurada. O smoke de todas as cenas e duas sequências completas passaram depois da correção. Nenhuma alteração foi feita no produto.

## Spike e escolha das técnicas

O spike comparou a mesma tela real de Meu dia, com a atividade fictícia “Organizar semana de estudos”, no material em `video/assets/captures/spike-final-05/`. Métricas vêm de `spike-metrics.json`; hashes completos ficam nos respectivos arquivos e manifests.

| Técnica | Medição | Resultado e decisão |
|---|---|---|
| Screenshot 2x + animação editorial no Remotion | 3200×1800; 259.241 bytes; SHA-256 `609f1a8a3d933b61c63cce33cd2168a30c70688f11be38e94b7a6934749e3aa9` | Texto e controles nítidos; usar para âncoras e composição. A imagem não simula uma interação do produto. |
| Playwright `recordVideo` | WebM VP8, 1600×900, 25 fps, 5,2 s, 530.446 bytes; SHA-256 `c0bf78e511c29e96d83345046fc0cee8187811e62888c9c396814b0c66a2ff51` | Medição real de 25 fps; movimento apresenta mais blur/compressão, e o começo inclui carregamento antes do estado completo. Não usar o clipe na montagem. Contato: `recordvideo-contact.jpg`. |
| Sequência de screenshots | 8 frames, 2.081.945 bytes no total; dois `requestAnimationFrame` por frame | Nítida, mas ocupa mais espaço e requer sincronização manual. Reservar para microações sem movimento contínuo. |
| CDP screencast | 26 PNG decodificados, 3.648.423 bytes; 17,33 fps em 1,5 s | Nitidez alta, custo de dados e cadência inferior ao vídeo. Não usar na montagem final. |

Escolha por cena: screenshots 2x para estados de Meu dia, calendário, notas, compras, Gika e retorno; screenshots reais antes/depois para a alteração offline; Pixel 7 descriptor em viewport mobile. A edição de câmera/motion será feita sobre as âncoras no Remotion, sem acrescentar elementos que pareçam parte da interface.

## Determinismo e ambientes

- Branch `video/product-film`, commit base `33707a4e72b863f1689113f51e95118a5568bebe`.
- Desktop: viewport CSS 1600×900, `deviceScaleFactor=2`, `pt-BR`, `America/Sao_Paulo`; mobile: Playwright Pixel 7 descriptor, 390×844 CSS, toque habilitado, saída 780×1688. Fontes são aguardadas antes das imagens.
- Datas dos registros usam o dia civil fixo `2026-10-07` (quarta-feira). Não foi fixado o relógio do navegador: a tentativa de congelar `page.clock` impediu a atualização das consultas Firestore usadas no fluxo real. `capturedAt` nos manifests conserva o horário de execução; as telas não exibem horário de sistema.
- A preparação espera ACK HTTP 200 para as criações de atividade, nota, lista e itens de compra. O estado sem IndexedDB força as cenas online a buscar os documentos no Firestore Emulator; o teste de Meu dia ainda exige que o indicador de snapshot `fromCache` desapareça. O perfil online continua `navigator.onLine` e não exibe aviso offline, cacheado ou de reconexão em nenhum screenshot/sidecar.
- Conta e registros são de teste do Firebase Emulator: perfil “Conta fictícia”, agenda, nota, lista e tarefa sintéticas. O reset é feito por `scripts/seed-local.mjs`; os cenários operam pela UI real.
- **App autenticado:** `npm run dev` em `localhost:5174`, com Auth/Firestore Emulator e dados seed; usado para cenas privadas, Gika e fila offline.
- **Preview público com service worker:** evidência separada, não misturada às imagens autenticadas. A análise anterior documenta build + preview e `glass/public.spec.ts` (14/14), que instalou/cacheou o shell e recarregou `/entrar` offline com status 200. Isso comprova o shell público depois do cache, não sessão privada nem conteúdo sincronizado. Referência: `video/reports/01-product-analysis.md`.

## Cenas capturadas

Cada sequência tem 9 cenas e 13 imagens, com manifest versionado, timestamps, bounding boxes e tipo de ação. Binaries e sidecars de texto ficam na pasta ignorada `video/assets/captures/`; manifests reproduzíveis ficam em `video/capture/manifests/`.

| Cena | Evidência capturada | Ambiente/classificação |
|---|---|---|
| Abertura limpa | `opening-today.png`, `opening-brand.png` | UI real; fallback aprovado, sem queda de rede ou edição sugerida. |
| Marca | `brand-reference.png` | UI real. |
| Meu dia | `today.png` | UI real; 7 de outubro de 2026 aparece como quarta-feira. |
| Calendário | `calendar.png` + `mobile/calendar-mobile.png` | UI real; calendário também conferido no descriptor mobile. |
| Notas | `notes.png` | UI real; nota fictícia criada antes, sem edição offline. |
| Compras | `shopping.png` | UI real; lista e itens fictícios. |
| Gika | `gika.png` | **INTERCEPTADA — UI REAL / CONTRATO REAL / RESPOSTA DETERMINÍSTICA.** UI, autenticação, router, schema de resposta, API de comandos e gravação real no Emulator; somente a chamada ao endpoint upstream Gemini é interceptada pelo fixture local. A fixture em `gemini-upstream-fixture.mjs` emite `candidates[0].content.parts[0].functionCall` com `respond_turn/create_task`, conforme o contrato coberto por `tests/integration/gika-semantic.test.ts`. Nenhuma resposta é apresentada como gerada ao vivo. O fixture só registra endpoint, método, fixture e schema; prompt, token e credencial não são gravados. |
| Offline e reconexão | `offline-banner.png`, `offline-pending.png`, `offline-synced.png` | UI real no app autenticado com Emulator. As consultas foram feitas online em Meu dia, Notas e Compras; duas abas reais foram abertas antes de cair a rede. Uma tarefa elegível, “Regar as plantas”, foi enfileirada; o texto real de pendência aparece. O replay recebeu HTTP 200 e a segunda aba foi recarregada para confirmar a tarefa aplicada no servidor. A imagem final não contém o aviso “Sem conexão. Mostrando dados salvos.” nem combina esse aviso com “Conexão restaurada”. Não há edição de nota offline. |
| Encerramento | `closing-same-note.png` | Retorna à mesma nota fictícia vista na cena Notas; a nota não é apresentada como alterada ou sincronizada offline. |

A cena de abertura limpa foi mantida porque o cold open offline só seria aceitável com estado visual real convincente; não se sugeriu edição de nota ou salvamento seguido de reload. A estrutura editorial continua com 76 segundos e fecha na mesma nota.

### Limite das afirmações offline e divergência documental

As imagens demonstram apenas consultas prévias disponíveis durante o corte de rede e uma criação de tarefa coberta pela outbox, seguida de ACK e nova consulta. Não afirmam que o app inteiro funciona offline, que todo histórico é baixado, que o primeiro uso funciona sem internet ou que dados locais nunca podem ser removidos. O preview público com SW é prova independente do shell; não foi usado para fingir uma sessão autenticada.

Permanece a divergência registrada na análise: alguns documentos versionados ainda descrevem offline como opt-in, enquanto a política atual da outbox é ativa por padrão, com opção local para desligar. Essa dívida documental não foi convertida em mensagem promocional e não alterou a captura.

## Dupla execução, diff e scans

Depois do smoke de todas as cenas, `node video/capture/capture.mjs --run run-1` terminou e foi seguido por `--run run-2`; ambas geraram as mesmas 9 cenas/13 imagens, sem aviso offline/cacheado/restaurado em cenas online, loading textual, conta humana, email fora do domínio de teste ou segredo. O script falha se um desses avisos ou estados de loading aparecer em imagem/sidecar online. No cenário offline, os únicos erros de console são `ERR_INTERNET_DISCONNECTED` de recursos durante o corte de rede, esperados; não houve `pageerror` da aplicação. Não foi aberto DevTools nem barra do navegador.

Comparação reproduzível: `python3 video/capture/compare-runs.py`. O comparador alinha as imagens correspondentes e mede pixel idêntico, pixels com delta máximo de canal acima de 8 e diferença absoluta média por canal. Tolerância definida: **até 5% dos pixels com delta > 8 e MAE até 3/255**. Os 13 pares passaram; oito ficaram pixel a pixel idênticos. O maior delta agregado foi em Compras: 4,3442% dos pixels >8 e MAE 1,9846. As outras diferenças são pequenas variações de pintura/antialiasing sem deslocamento estrutural. Não se declara igualdade pixel a pixel de todos os frames.

Foram lidos 24 sidecars de texto DOM (12 por execução) e inspecionado o texto do DOM mobile em ambas as execuções; não houve ocorrência de token/Bearer, email não fictício ou texto de loading. A captura sincronizada foi verificada separadamente: contém “Regar as plantas” e não contém os dois estados de rede contraditórios.

## Índices e hashes dos artefatos

Manifestos versionados com caminho relativo, dimensão, tamanho em bytes, SHA-256, ações e timestamp por execução:

- `video/capture/manifests/run-1.json` — 9.427 bytes; SHA-256 `c614572ee6675918a05d11970fee9ce56ea5edebe28f8ef82184e0e0da06db20`.
- `video/capture/manifests/run-2.json` — 9.430 bytes; SHA-256 `0fa5f7a0a832d71ce37204b1a776ba52ab07712a37b60b79fb6c6904704faf90`.

Os manifests contêm os hashes completos das 26 imagens capturadas, além dos caminhos `video/assets/captures/run-1/...` e `run-2/...`. Exemplos principais:

| Arquivo | Tamanho | SHA-256 |
|---|---:|---|
| `video/assets/captures/run-1/opening-today.png` | 265.991 B | `c2073e4db369652434a57a1cef0f38c05f9ca66230307c189dc08e5a56328832` |
| `video/assets/captures/run-1/gika.png` | 336.980 B | `bb2561f1652eaff3396d90fb6159bf153b81a3ead50799a5f2a7dc21d89abd01` |
| `video/assets/captures/run-1/offline-pending.png` | 229.684 B | `b674be551f0043340232c80a100bca8370e6a6821feff4c6d58f3a776c189ca8` |
| `video/assets/captures/run-1/offline-synced.png` | 276.990 B | `c65fb316a8d1348211ace4c3a919dcd6e1dd90e8d4fefde639544088a88ad0cc` |
| `video/assets/captures/run-1/closing-same-note.png` | 258.027 B | `8a640e484aae4edef64758c5c0a279aa02bced7bd02920f0c16d63ede9c7b43f` |
| `video/assets/captures/run-1/mobile/calendar-mobile.png` | 130.475 B | `48ad3fdd40d581203bb779e401b4a5f08d17ffb6343c068139fd37be84009de3` |
| `video/assets/captures/spike-final-05/still-3200x1800.png` | 259.241 B | `609f1a8a3d933b61c63cce33cd2168a30c70688f11be38e94b7a6934749e3aa9` |
| `video/assets/captures/spike-final-05/page@df535c87df5610be739cc471c6cbf560.webm` | 530.446 B | `c0bf78e511c29e96d83345046fc0cee8187811e62888c9c396814b0c66a2ff51` |

Outras tentativas de spike e a imagem de debug com nome não fictício foram removidas. O conjunto anterior do Gate 3 que mostrava o aviso offline em telas online foi substituído; não deve ser usado na montagem. Após o reteste, somente `spike-final-05`, `run-1` e `run-2` devem permanecer como binários válidos da Fase 3.

## Reproduzir e handoff

```bash
node video/capture/capture.mjs --run run-1
node video/capture/capture.mjs --run run-2
python3 video/capture/compare-runs.py
```

O runner reinicia somente a conta seed do Firebase Emulator; requer o `npm run dev` local com Emulator no ar. A fixture Gemini deve ser pré-carregada no processo do servidor como documentado em `video/capture/gemini-upstream-fixture.mjs`; ela intercepta só o upstream Gemini exato e permite que Auth/router/comando continuem reais. Arquivos binários ficam ignorados; scripts, fixtures, manifests e este relatório são versionáveis. Nenhuma etapa de motion/Remotion foi iniciada nesta entrega.


## V2 — capturas adicionais, 2026-10-07

O harness existente ganhou `--polish`, preservando V1. Desktop 1600×900/2x; mobile Pixel 7 390×844/2x, touch, pt-BR, America/Sao_Paulo e data civil fixa. Os manifests `polish-1.json`, `polish-2.json` e `polish-diff.json` registram estados, hashes, ações e ACKs.

Abertura agora elegível: o editor mostra digitação real, a nota é salva **online**, ACK 200; só depois a rede é cortada e a mesma nota permanece visível na página aberta. Não houve escrita de nota offline nem reload offline nessa abertura. Não se compôs indicador especial.

Meu dia conclui a tarefa seedada; calendário seleciona um dia real; compras marca Café e abre a seção nativa de concluídos; mobile consulta e abre a mesma nota sem alterá-la. Offline foi recapturado para preservar a tarefa concluída, criar somente “Regar as plantas” na outbox e comprovar ACK de replay/reconsulta após reconexão.

Gika mantém exatamente a fixture upstream contratual existente e UI/Auth/router/comando reais. A linguagem técnica foi retirada do filme conforme instrução da iteração V2; a interceptação permanece neste relatório e no ledger. Não se afirma resposta ao vivo nem duração real de inferência.

Permanece a divergência: documentação do produto descreve ativação manual em trechos, enquanto implementação atual ativa cache/outbox por padrão com opt-out. O filme não afirma disponibilidade universal, download integral de conta ou sincronização de todas as operações. O texto amplo do banner nativo é UI real, não evidência de garantia universal; o roteiro limita o contexto aos dados consultados e à tarefa elegível demonstrada.

Resultado final V2: duas execuções completas, 7 cenas e 27 PNGs por execução. Comparação PASS 27/27; 20 imagens pixel-idênticas; maior porcentagem de pixels com diferença >8: 0,0931%; maior MAE por canal: 0,0474/255. Os 13 erros de console `ERR_INTERNET_DISCONNECTED` por execução estão restritos aos cortes de rede; nenhum pageerror. Nota, conclusão de tarefa, check de compra, Gika e replay da tarefa offline receberam ACK 200. Continuidade offline: “Organizar semana de estudos” permanece concluída; “Regar as plantas” é a tarefa nova pendente.

Manifest polish-1 SHA-256: `e953cd36c6fd6c38136e1762d646dc80e804d235e87871bdf073e38d22571514`. Manifest polish-2: `84d736a63ebb1f0e6fe725996a900d7ee2a0ce2307df2105970c365e8f9c5adb`.
