# Polish V2 — filme de produto do Leve

## Diferenças de direção

| Aspecto | V1 | V2 |
|---|---|---|
| Duração | 76 s | 72 s |
| Abertura | Meu dia quase estático e marca longa | Digitação de nota, salvamento online, corte real da rede e nota visível; frase/marca em 3 s |
| Câmera | Mesmo app inteiro sob headline | Aberto, médio, close funcional, push-in, pan, slide e reenquadramento motivados por ação |
| Ações | Estados finais dominantes | Tarefa e compra concluídas, seleção de dia, edição de nota, pedido/resultado Gika |
| Mobile | Inserção de 2 s | 4 s, Pixel 7 real 390×844/2x, consulta/abertura da mesma nota |
| Gika | Aviso técnico sobreposto | Pedido e resultado legíveis; interceptação documentada fora do filme, sem claim ao vivo |
| Offline | Copy documental | Três frases humanas ligadas aos estados reais; mesma limitação factual |
| Transições | Fade repetido | Cortes secos, máscaras de folha apenas em três passagens e fade breve na marca |
| Áudio | Nenhum | Música original 92 BPM, dez cues UI e duas transições suaves |
| Encerramento | Nota distante e marca parada | Close na mesma nota, resolução musical e logo final por 2 s |

## Capturas e determinismo

Pipeline existente estendida com `--polish`; nenhuma aplicação alterada. Duas execuções completas, 27 PNGs cada, sete cenas; 27/27 comparações PASS, 20 pixel-idênticas. Máximo delta de pixels >8: 0,0931%; MAE máximo 0,0474/255. Desktop 1600×900/2x e mobile Pixel 7, mesma seed/data/fuso. ACK 200 para nota, conclusão de tarefa, check de compra, criação via Gika e replay outbox.

Offline foi recapturado na V2 para que “Organizar semana de estudos” continue concluída depois da cena Meu dia. “Regar as plantas” é a tarefa nova pendente, aplicada depois da reconexão/ACK/reconsulta. Somente erros de rede esperados durante cortes; nenhum pageerror ou dado de produção.

Capturas V1 e masters anteriores foram preservados. Análise prévia em `07-polish-analysis.md`; contact sheets e renders curtos locais documentam o loop.

## Motion e correções

Refinados CameraMove, Cursor, Title e SceneTransition na composição existente. Coordenadas do cursor seguem boxes reais, câmera respeita limites do screenshot e enquadramento responde a mudanças de estado. Ajustados closes de nota/Gika, seleção do calendário e continuidade offline. Spike de abertura encontrou uma interpolação de chave única, corrigida antes do render integral. Testes de abertura, mobile e Gika passaram. Não há controles/indicadores especiais criados para filmagem.

## Áudio, assets e licenças

Composição/síntese original reproduzível em `audio/compose.py`, seed 20261007, 92 BPM; sem samples externos, stock, TTS ou voz gravada. Música e efeitos MIT do repositório; Nunito/DM Sans OFL com textos integrais em `licenses/`. Origem em `ASSETS.md` e `audio/README.md`.

Mix WAV 48 kHz estéreo 24-bit, −16,00 LUFS / −2,47 dBTP / LRA 6,70; codificada uma vez para AAC no master. Efeitos abaixo da música, sem cue para todo clique; redução em 53–60,75 s e resolução em 65–72 s. A medição final pertence ao hash do MP4 em `output/master-loudness.json`.

A avaliação realizada é objetiva: níveis, densidade, envelope, arranjo e sincronismo. O ambiente não permite audição; não afirmamos avaliação auditiva humana. Essa revisão subjetiva continua recomendada.

## Claims

Novo cold open demonstra apenas nota salva online permanecendo na página já aberta após corte de rede. Não demonstra edição de nota offline, reload autenticado nessa abertura, recuperação universal ou sincronização total. As frases offline referem-se à agenda previamente consultada e à tarefa específica elegível. Mobile mostra consulta real, sem ampliar garantias de disponibilidade em aparelhos.

Gika usa fixture só no upstream Gemini, compatível com contrato real. UI/Auth/router/comando persistem reais. Remoção do disclosure técnico em tela segue a instrução V2; interceptação permanece documentada no ledger/relatório. Não atribuímos geração ao vivo nem latência real ao modelo.

Permanece divergência entre documentação do produto e default atual de cache/outbox; nenhuma mudança de produto para resolver isso nesta tarefa. Nenhum claim NÃO VERIFICADA foi promovido ao roteiro.

## Entrega e QA

Master 1920×1080, 60 fps, 4320 quadros, 72 s, H.264 CRF17, yuv420p, BT.709, faststart e AAC 48 kHz. Versão muted preserva o mesmo stream de vídeo; README é derivado comprimido 720p sem áudio, separado da referência de qualidade.

O primeiro QA rejeitou o recorte da mensagem nativa de pendência offline (P1). Corrigimos o centro/escala da câmera para mostrar título da tarefa e mensagem completa, inspecionamos o frame 3510 e renderizamos novamente o master inteiro com CRF17 para preservar uma única codificação visual. O pós-processamento também acrescenta as tags VUI BT.709 omitidas pelo Remotion, sem reencodar pixels já convertidos pela matriz correta.

Resultados finais, hashes e veredito independente são registrados em `06-qa.md` e `FINAL_REPORT.md` depois do render/loop de QA. Problemas restantes: audição subjetiva humana indisponível; condições comerciais da ferramenta Remotion dependem do responsável pela distribuição. Nenhuma limitação de produto conhecida foi ocultada ou convertida em promessa do vídeo.


### Resultado final

QA **APPROVED**, 0 P0/0 P1. Master SHA-256 `c4ad4073d7f18b8a0c4ef6b45f85ec0edfa86cd4c12b3fb4cd99907c20c7bb9e`, 11.900.248 bytes; AAC −16,01 LUFS/−2,47 dBTP. README 2.947.848 bytes. Master também versionado para download no GitHub, mantendo CRF17/1080p60; nenhuma compressão adicional aplicada ao master. P2 e limites em `06-qa.md`.
