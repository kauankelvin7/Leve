# Roteiro — Leve / V3

**Duração:** 72 s · **Idioma:** pt-BR · **Uso:** copy editorial e montagem. O filme não depende de áudio para ser compreendido.

| Tempo | Cena | Texto | Decisão de edição |
|---|---|---|---|
| 00–05 | Cold open / nota | Sem headline até a ação; **Organizar a vida deveria ser leve.** entra com a câmera abrindo. | Nota real, salva online antes da queda. Sem cartela de marca. |
| 05–14 | Meu Dia | Sem headline. | Full-frame, checkbox real, resposta e recuo. |
| 14–21 | Calendário | Sem headline. | Seleção do dia conduz o corte para mobile. |
| 21–25 | Mobile | **A mesma ideia, mais perto.** | Captura real Pixel 7 consultando a mesma nota. |
| 25–33 | Notas | Sem headline. | Close editorial no título/corpo da nota. |
| 33–40 | Compras | Sem headline. | Abrir, marcar Café e revelar progresso real. |
| 40–52 | Gika | Sem headline técnico; a conversa é a copy. | Pedido → resposta → tarefa real no Leve. Fixture upstream documentada, sem sugerir geração ao vivo. |
| 52–64 | Offline | Sem headline documental. | Faixa real, título da tarefa e mensagem nativa de pendência em recortes separados; reconectar, receber ACK e abrir plano. |
| 64–72 | Fecho | **Mais espaço para viver.** | A mesma nota retorna; o logo está na UI real, sem tela isolada. |

## Verdade da demonstração

Abertura: nota salva online, fica visível na mesma página após corte de conexão. Não demonstra reload, edição ou salvamento offline da nota. Offline: conteúdo consultado antes, uma atividade elegível na outbox local e o resultado após reconexão/ACK. Não generalizar para todo dado ou comando.

Gika: somente a chamada upstream Gemini é interceptada com o contrato `respond_turn/create_task`. A UI, autenticação, endpoint do app, router e comando permanecem reais; o `activity.create` é aplicado no Emulator. Não alegar resposta ao vivo, latência real ou precisão universal.

Sem TTS ou voz artificial. O SRT editorial é uma alternativa opcional de locução futura, não transcrição de fala. Música e poucos efeitos são originais e documentados.
