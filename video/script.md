# Roteiro — Leve

**Duração alvo:** 76 s · **Idioma:** pt-BR · **Uso:** texto editorial na tela e plano de edição.
**Status:** proposta do Gate 2; não capturar antes da aprovação humana.

| Tempo | Cena | Texto em tela (headline / apoio) | Direção de montagem |
|---|---|---|---|
| 00–05 | Abertura limpa | **Um espaço para o que importa.** | UI real de Meu dia e marca Leve; push-in sutil. Sem transição de rede ou indicador offline. |
| 05–10 | Marca | **Organizar a vida deveria ser leve.** | Logo Leve real e superfície de papel/vidro formada pela interface. |
| 10–20 | Meu dia | **Seu dia, em perspectiva.** / Agenda e tarefas no mesmo espaço pessoal. | Data selecionada, resumo e atividade seed fictícia; garantir dia/semana coerentes. |
| 20–28 | Calendário | **Veja a semana tomar forma.** | Calendário semanal real; seleção de dia claramente distinta de “Hoje”. |
| 28–38 | Notas | **Ideias também têm lugar.** / Notas que você pode editar. | Editar texto fictício; esperar persistência real; sem selo editorial de “salvo”. |
| 38–45 | Compras | **E a lista segue com você.** | Marcar item fictício em lista real; câmera segue o gesto. |
| 45–56 | Gika | **Uma ideia pode virar próximo passo.** / Gika ajuda a organizar a agenda. | Pedido simples; mostrar o resultado real “Tarefa adicionada” depois de o comando ser aplicado. Somente a chamada upstream Gemini exata usa fixture compatível com o contrato real; a UI, o endpoint do app, o router e o comando são reais. Nunca sugerir geração ao vivo. Inserir a identificação editorial “Demonstração controlada · resposta do modelo predefinida”. O fluxo não pede confirmação separada. |
| 56–69 | Offline | **Dados consultados antes podem continuar disponíveis.** / Uma tarefa compatível aguarda a conexão voltar. | 56–58 respiro sem headline. Em Meu dia, rede cai e a UI real mantém tarefas consultadas; “Regar as plantas” entra na outbox com a mensagem real de pendência; reconectar, aguardar ACK e recarregar a segunda aba para mostrar a tarefa aplicada. Capturas autenticadas em Vite + Emulator. A prova do shell com SW no preview público é separada. |
| 69–76 | Fecho | **Leve. Mais espaço para viver.** | Retorno à mesma nota consultada antes; não sugerir que foi editada offline ou sincronizada. Logo. CTA/URL só se aprovados e verificados. |

## Locução e intenção

A locução integral, segmentada e temporizada está em `video/narration.md`. Ela acrescenta ritmo e afeto, mas não informações necessárias para entender o vídeo. Não afirmar que o Gemini respondeu ao vivo, que todo dado está offline, que notificações chegam em qualquer aparelho ou que o Leve nunca perde conteúdo.

## Regras de edição

- Não exibir mais de uma headline de até oito palavras e uma linha curta de apoio ao mesmo tempo.
- As headlines permanecem tempo suficiente para leitura (mínimo orientativo: 1 s + 0,3 s por palavra), com contraste e área segura mobile.
- A interface real ocupa a maior parte do quadro; overlays editoriais não recobrem controles nem inventam indicador de estado.
- A abertura limpa substitui o cold open offline: edição de nota seguida de reload não foi comprovada. A demonstração posterior mostra cache consultado e a criação offline de uma tarefa elegível, conforme E2E autenticado; não sugere que a nota foi alterada sem conexão.
- O segmento Gika usa fixture apenas no endpoint upstream Gemini exato, com envelope compatível com o contrato real. Auth, UI, `/api/gika/respond`, router, comando e ACK permanecem reais. Identificar na tela como demonstração controlada; nunca sugerir Gemini ao vivo nem inventar etapa de confirmação. A interceptação está documentada em `video/reports/03-capture-report.md`.
