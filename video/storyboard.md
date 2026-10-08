# Storyboard — Leve / V3

**Duração:** 72 s · **Branch:** `video/product-film` · **Mensagem:** Organizar a vida deveria ser leve.

V3 mantém o arco aprovado e substitui a apresentação em módulos por uma linha visual: a mesma nota abre e fecha o filme. A interface é a fotografia do filme; manchetes aparecem só quando mudam a leitura. Capturas V1/V2 e respectivos relatórios permanecem na história Git e em `reports/`. Nenhuma alteração no produto foi feita para a filmagem.

| Tempo | Cena / ação real | Direção visual | Evidência / limite | Classificação |
|---|---|---|---|---|
| 0–5 | A mesma nota é escrita, salva online e permanece aberta quando a conexão cai. | Cold open em close, sem logo/cartela; a câmera abre para a frase de marca e o contexto real do Leve. | `polish-note`; `note.save` ACK 200 antes de `setOffline(true)`. Sem reload nem escrita de nota offline. | REAL + DETERMINÍSTICA |
| 5–14 | Meu Dia; concluir “Organizar semana de estudos”. | Full-frame; push-in curto no checkbox, clique e feedback real, pull-back para situar a agenda. Sem headline. | `today-before/after`, `activity.setStatus` ACK 200, quinta-feira 08/10/2026 em America/Sao_Paulo. | REAL + DETERMINÍSTICA |
| 14–21 | Selecionar o dia no calendário mensal e consultar seu detalhe. | A seleção conduz o corte seguinte; close reduzido ao dia antes de abrir o plano. | `calendar-before/day`, seleção real; não nomear mês como visão semanal. | REAL + DETERMINÍSTICA |
| 21–25 | Abrir a mesma nota num Pixel 7 real. | Match cut para captura móvel vertical, grande e central; cartão de papel abstrato dá separação sem simular hardware. Copy: **A mesma ideia, mais perto.** | Pixel 7 / touch / viewport 390×844 CSS, screenshots 780×1688; consulta real. Não demonstra paridade total ou sincronização entre aparelhos. | REAL + DETERMINÍSTICA / composição editorial |
| 25–33 | Retomar e editar a nota real. | Close editorial ocupa o quadro; a câmera segue título/corpo e só recua na saída. | `note-type-2/4/saved`; edição online real, sem selo de estado inventado. | REAL + DETERMINÍSTICA |
| 33–40 | Marcar Café e ver a lista respondendo. | Plano aberto curto → close no checkbox/progresso real → retorno ao contexto. | `shopping-before/after/completed`; `shoppingItem.setChecked` ACK 200. | REAL + DETERMINÍSTICA |
| 40–52 | Pedir à Gika uma tarefa; ver o resultado aplicado no Leve. | Conversa contextualizada, aproximação ao pedido e à confirmação, recuo ao workspace. Sem chamada técnica sobreposta. | Fixture somente no upstream Gemini exato, em contrato `respond_turn/create_task`; Auth/UI/router/command e `activity.create` reais. Pedido sintético para 09/10/2026. Não sugerir resposta ao vivo. | INTERCEPTADA / fluxo real do produto |
| 52–64 | Agenda previamente consultada; criação de tarefa elegível pendente; reconexão e consulta do estado aplicado. | A trilha abre espaço. Corte para recorte real do nome da tarefa e, separadamente, da mensagem nativa de pendência, evitando o controle de data do navegador. Depois abre para reconexão. | `offline-banner/pending/synced`; estado outbox real e ACK/reconsulta servidor. Não demonstra edição de nota offline, disponibilidade universal nem sincronização garantida. | REAL + DETERMINÍSTICA |
| 64–72 | Retornar à nota e encerrar. | Match cut para a nota inicial; plano alarga, “Mais espaço para viver.” aparece no espaço livre, logo continua dentro da UI real. Sem cartela parada. | Mesma nota fictícia e conteúdo salvo online; não associada à mutação offline. | REAL + DETERMINÍSTICA |

## Gramática visual

- Variar quadro aberto (Meu Dia/contexto), plano médio (calendário/Gika), close funcional (nota/checkbox/pendência) e quadro vertical real (mobile).
- Movimento só acompanha ação, foco ou contexto: push, pull-back, pan curto e match cuts. Corte seco domina; paper reveal fica nas passagens móveis/compras/fecho e fade no intervalo de confiança.
- A marca não recebe mais um plano isolado. Tipografia segue Nunito/DM Sans e a paleta real do projeto; “Vidro & Papel” aparece como camada/superfície editorial, sem mesa 3D, neon ou parallax decorativo.
- Interface, feedback, estados, texto de erro/outbox e controles são capturados da aplicação. Remotion enquadra/compoõe; não cria feature ou estado.

## Captura e determinismo

Desktop 1600×900 CSS / 2x, Pixel 7 390×844 / 2x, `pt-BR`, `America/Sao_Paulo`, seed fictícia e relógio Playwright fixado em 08/10/2026. Manifests `v3-capture-3/4.json`; comparador 27 imagens e mobile dentro da tolerância. A data civil foi avançada de V2 (07/10, quarta) a V3 (08/10, quinta) para refletir a data de execução e evitar tarefa fora do “Meu dia”.

## Som e claims

Trilha e micro-eventos originais, reproduzíveis com seed, 92 BPM, stems documentados/licença MIT; sem amostras externas, TTS ou voz. O instrumental reduz durante o offline e retorna depois do ACK. Mix 48 kHz estéreo alvo −16 LUFS, true peak ≤ −1,5 dBTP. A limitação de audição subjetiva deste ambiente é declarada no QA, nunca simulada.

Claims e divergência entre documentação e comportamento offline permanecem no `reports/claims-ledger.md`. Não afirmar “nunca perde”, offline total, sincronização universal, Gemini ao vivo ou push garantido em qualquer aparelho.
