# Storyboard — Leve / V2

**Duração:** 72 s · **Branch:** `video/product-film` · **Mensagem:** Organizar a vida deveria ser leve.

Esta revisão continua a narrativa aprovada. A V1 de 76 s permanece no histórico Git e em `video/output/v1/`; sua revisão está em `video/reports/06-qa-v1.md`. A análise anterior às mudanças está em `07-polish-analysis.md`. Não houve alteração do produto para filmagem. O filme funciona sem áudio: a interface e as headlines contêm a informação necessária.

| Tempo | Cena e ação real | Direção / texto em tela | Evidência e limite | Classificação |
|---|---|---|---|---|
| 0–4 | Digitar a nota “Uma ideia para retomar”; concluir edição online; cortar a rede com a nota consultada ainda visível. | Close funcional imediato. Texto cresce em etapas reais; aos 2,07 s aparece o estado salvo; aos 2,50 s a faixa offline nativa. Sem indicador editorial. | `polish-note`, `note-type-0..4`, `note-saved`, `note-offline`; `note.save` ACK 200 **antes** da queda. Sem reload, edição ou salvamento da nota offline. | REAL + DETERMINÍSTICA |
| 4–7 | Respiro de marca. | **Organizar a vida deveria ser leve.** Reveal breve do logo original; sem longa espera no logo. | Frase de marca, não garantia funcional. | REAL + DETERMINÍSTICA / composição editorial |
| 7–16 | Meu dia; concluir “Organizar semana de estudos”. | **Seu dia, em perspectiva.** Aberto → aproximação ao checkbox → feedback real → aberto. Cursor deriva do bounding box capturado. | `today-before/after`; `activity.setStatus` ACK 200; data civil fixa, quarta-feira 07/10/2026. | REAL + DETERMINÍSTICA |
| 16–23 | Calendário mensal; selecionar o dia e consultar seu detalhe. | **Veja seus dias tomar forma.** Pan e reenquadramento para a informação selecionada. | `calendar-before/day`; não descrever a imagem mensal como visão semanal. | REAL + DETERMINÍSTICA |
| 23–27 | No celular, abrir a mesma nota. | **O mesmo espaço. No seu ritmo.** Moldura CSS neutra; ação curta seguida de leitura. | `mobile-note-before/open`; descriptor Pixel 7, touch, viewport 390×844, captura 780×1688. Consulta real; sem mutação mobile ou promessa de paridade total. | REAL + DETERMINÍSTICA |
| 27–35 | Retomar a nota, editar e mostrar o estado salvo real. | **Ideias também têm lugar.** Composição lateral, close no editor e no cartão salvo. | Estados reais da edição online. Mesma nota/texto da abertura; sem selo fictício de persistência. | REAL + DETERMINÍSTICA |
| 35–42 | Abrir compras, marcar Café e revelar itens concluídos. | **Até o cotidiano ganha espaço.** Câmera acompanha checkbox e resultado nativo. | `shopping-before/after/completed`; `shoppingItem.setChecked` ACK 200. | REAL + DETERMINÍSTICA |
| 42–53 | Abrir Gika, digitar pedido e mostrar “Tarefa adicionada”. | **Uma ideia vira próximo passo.** Contexto → aproximação ao pedido/resultado → recuo. Sem disclosure técnico dentro do filme, conforme pedido de polish. | Fixture somente no upstream Gemini exato; Auth, UI, `/api/gika/respond`, router, contrato, `activity.create` e ACK reais. Não alegar geração ao vivo ou criar confirmação inexistente. | INTERCEPTADA / fluxo do produto real |
| 53–56,5 | Meu dia previamente consultado, rede indisponível. | **Sua agenda já aberta, ainda por perto.** Ritmo mais calmo; cache e faixa nativos. | Sessão inicializada online e dados já consultados no aparelho; disponibilidade depende do cache. | REAL + DETERMINÍSTICA |
| 56,5–60,75 | Criar “Regar as plantas” sem rede; mostrar a pendência real. | **Esta tarefa espera a conexão voltar.** Pan para o estado relevante. | Comando elegível na outbox; não demonstrar edição de nota ou todas as operações offline. | REAL + DETERMINÍSTICA |
| 60,75–65 | Reconectar; aguardar ACK real e consultar tarefa aplicada. | **Conexão de volta. Tarefa na agenda.** Plano abre após a resolução. | ACK 200 e consulta do estado servidor; resultado desta tarefa, sem garantia universal de sincronização. | REAL + DETERMINÍSTICA |
| 65–72 | Voltar à nota inicial e encerrar com a marca. | **Mais espaço para viver.** Close da mesma nota salva online; recuo; logo final por aproximadamente 2 s. | Não associar a nota à alteração offline. Sem CTA comercial ou URL não verificada. | REAL + DETERMINÍSTICA |

## Captura e montagem

- Reutilizar a pipeline existente e os arquivos fonte de Remotion. Capturas V1 preservadas; novas ações constam nos manifests `polish-1.json`, `polish-2.json` e comparação determinística. A fonte de câmera é a UI real, nunca uma reconstrução de controles.
- Desktop 1600×900 CSS / 2x; mobile 390×844 CSS / 2x; pt-BR; `America/Sao_Paulo`; data, seed, fontes e conta fictícia controlados. Nenhum dado de produção, console, cookie ou secret aparece.
- Planos abertos, médios e closes respondem a clique, digitação ou mudança de informação. Cortes secos predominam; reveals por folha e fade ficam em passagens específicas. Não adicionar efeitos ornamentais.
- Áudio instrumental e efeitos sintetizados originais, sem samples externos ou TTS, documentados em `video/audio/`. Master com áudio; derivado README e cópia muted separados. A narração humana continua opcional, não gravada.

## Limites mantidos

O shell público offline com service worker e a captura autenticada em Vite + Firebase Emulator são provas separadas. O cold open V2 foi recuperado porque a nota **salva online** permanece visível durante a queda, sem reload. Não recupera a hipótese anterior de editar/salvar a nota offline. Cache pode ser limitado ou evicto. Outbox aceita determinados comandos; não é sincronização garantida de tudo.

`README.md` e `AGENTS.md` do produto ainda divergem do código quanto à ativação padrão do offline. Essa divergência continua registrada no ledger; o vídeo não altera nem promete uma preferência diferente.

A interceptação da Gika permanece documentada nos manifests, relatórios e ledger. A remoção de linguagem técnica do vídeo foi solicitada nesta iteração; não é autorização para sugerir Gemini ao vivo. Push em aparelho físico, garantias universais de dados/privacidade e primeiro uso offline não fazem parte do filme.
