# Narração — Leve

**Idioma:** pt-BR · **Tom:** calmo, próximo, claro e confiante · **Ritmo de referência:** ~140 palavras/minuto.
**Status:** texto pronto para gravação humana; não há TTS/licença aprovados. O vídeo precisa continuar compreensível sem áudio.

| Tempo | Texto | Observação de performance |
|---|---|---|
| 00–05 | Uma agenda pessoal para o seu dia. | Abertura limpa sobre a UI real; tom calmo, sem prometer resultado além das áreas demonstradas. |
| 05–10 | Organizar a vida deveria ser leve. | Pausa curta depois de “vida”. |
| 10–20 | No Meu dia, compromissos e tarefas aparecem juntos. Você escolhe uma data e enxerga o que pede atenção. | Natural, sem ritmo de lista de recursos. |
| 20–28 | No calendário, a semana se conecta ao restante da sua agenda. | Fluido, acompanhando o movimento da interface. |
| 28–38 | Uma ideia pode virar nota, ficar organizada e ser retomada quando fizer sentido. | Mais próximo; deixar a UI respirar. |
| 38–45 | E até as pequenas compras encontram seu lugar. | Leve, sem ênfase publicitária. |
| 45–56 | Quando você pede, a Gika pode criar uma tarefa simples para sua agenda. | Usar somente com resposta upstream Gemini determinística predefinida e comando aplicado pelo fluxo real; não sugerir uma confirmação separada. |
| 56–69 | Sem conexão, o Leve pode manter acessíveis dados que já foram consultados e guardar certas alterações para tentar sincronizar quando a rede voltar. | Pausado e literal. A formulação “pode”, “já consultados” e “certas alterações” evita promessas absolutas. |
| 69–76 | Leve. Um espaço pessoal para o que você quer lembrar e fazer. | Encerrar com calor, sem superlativo. |

## Texto corrido

Uma agenda pessoal para o seu dia. Organizar a vida deveria ser leve. No Meu dia, compromissos e tarefas aparecem juntos. Você escolhe uma data e enxerga o que pede atenção. No calendário, a semana se conecta ao restante da sua agenda. Uma ideia pode virar nota, ficar organizada e ser retomada quando fizer sentido. E até as pequenas compras encontram seu lugar. Quando você pede, a Gika pode criar uma tarefa simples para sua agenda. Sem conexão, o Leve pode manter acessíveis dados que já foram consultados e guardar certas alterações para tentar sincronizar quando a rede voltar. Leve. Um espaço pessoal para o que você quer lembrar e fazer.

## Legendas

As legendas finais devem ser geradas a partir da gravação aprovada, com revisão humana de pontuação, segmentação e tempo de leitura. Não congelar um SRT com timing estimado antes de fechar áudio e edição. Se o master não tiver voz, manter a versão muted e decidir se a legenda editorial deve ser entregue separadamente.

## Claims a preservar

- Os dados offline foram consultados antes e o comportamento é condicionado pelo cache/sessão disponíveis no aparelho. A edição específica da nota após o reload não foi validada e não aparece no início.
- A outbox aceita somente determinadas alterações; sincronização é uma tentativa após retorno da rede, não promessa universal.
- A Gika pode criar uma tarefa simples no escopo capturado; a chamada upstream Gemini usa fixture determinística compatível com o contrato; não sugerir geração ao vivo. Auth, endpoint do app, router e comando são reais. O fluxo real não tem etapa separada de confirmação.
- A frase “um espaço pessoal” descreve o produto, sem alegações de privacidade/uso de dados não comprovadas.
