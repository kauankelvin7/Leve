# Narração e legendas editoriais — Leve / V2

**Idioma:** pt-BR · **Tom:** calmo, próximo e claro · **Duração:** 72 s.

Não há locução gravada nem TTS. O master contém trilha instrumental e efeitos originais. O texto abaixo é uma alternativa para futura voz humana e a base do SRT editorial separado; as legendas não são transcrição de uma voz existente. Headlines e interface continuam suficientes sem áudio.

| Tempo | Texto opcional | Intenção |
|---|---|---|
| 00–04 | Uma ideia. Um espaço para retomar. | Acompanhar o gesto real sem prometer salvamento offline. |
| 04–07 | Organizar a vida deveria ser leve. | Frase de marca, com breve respiro. |
| 07–16 | No Meu dia, você vê o que pede atenção. E dá um passo de cada vez. | Acompanhar a conclusão da tarefa. |
| 16–27 | Seus dias ganham forma no calendário. E suas notas vão com você. | Uma cue reúne calendário e consulta mobile real; não prometer toda função em todo aparelho. |
| 27–35 | Ideias também têm lugar. Para escrever, guardar e retomar. | Edição e salvamento online da mesma nota. |
| 35–42 | Até as pequenas compras encontram seu espaço. | Tom simples, cotidiano. |
| 42–53 | Com a Gika, um pedido pode virar uma tarefa na agenda. | Resultado real; fixture do upstream documentada. Não sugerir resposta ao vivo. |
| 53–65 | Sua agenda já aberta, ainda por perto. Esta tarefa espera a conexão voltar. Conexão de volta. Tarefa na agenda. | As três frases correspondem aos três estados reais; sem garantia geral de cache ou sincronização. |
| 65–72 | Leve. Mais espaço para viver. | Retorno à nota e resolução musical. |

## Entrega e revisão futura

`video/output/leve-product-film.srt` contém nove cues editoriais, com tempo final em 72 s. Caso se grave voz humana futuramente, revisar cadência e sincronização pela gravação efetiva. A duração do plano atual não presume uma performance de locução. Não inserir TTS para preencher silêncio.

## Escopo factual

A nota foi salva online antes da queda; permaneceu visível na mesma página, sem reload ou mutação offline. Os dados de Meu dia foram consultados antes; a tarefa específica entra na outbox e é aplicada após reconexão e ACK. O cache pode ser limitado/evicto; outras operações não são demonstradas. O offline padrão do código ainda diverge de documentação do produto.

A interpretação da Gika é controlada exclusivamente no upstream Gemini. UI, Auth, router, comando e contrato são reais. Nenhuma fala ou legenda afirma geração ao vivo, autonomia irrestrita ou precisão garantida.
