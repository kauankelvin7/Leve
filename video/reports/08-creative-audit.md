# Auditoria criativa — V2 antes da nova iteração

## Escopo e evidências

Auditoria do master V2 existente, sem alteração da aplicação do Leve. Fonte avaliada: `video/output/leve-product-film.mp4` (1920×1080, 60 fps, 72 s, H.264 + AAC), não o derivado comprimido do README. O relatório de QA vigente classifica o V2 como APPROVED (0 P0/P1); este documento é uma crítica de direção para a próxima versão, não uma invalidação daquele gate técnico.

Materiais revistos:

- Contact sheet de um quadro por segundo (72 amostras): `video/output/v3-audit-1fps.jpg`.
- Contact sheet de transições e seus entornos: `video/output/v3-audit-transitions.jpg`.
- Quadros em resolução integral da abertura, cada área principal, mobile, Gika, offline e fecho: `video/output/v2-keyframes/`.
- Storyboard, script, narração, claims ledger, análise e relatório V2, captura, motion, QA, áudio e manifestos da pipeline atual.
- Metadados do master e decodificação integral do stream de vídeo.

Os quadros mostram a linguagem, cortes e estados com evidência visual. Esta interface de execução não oferece reprodução audiovisual assistível pelo agente; portanto não afirmo ter feito uma sessão subjetiva de playback ou audição. Níveis, duração, codecs e estrutura sonora podem ser verificados objetivamente, mas a qualidade percebida do mix ainda merece validação auditiva humana.

## Diagnóstico geral

O V2 elevou bastante a fidelidade: há ações reais, mobile mais integrado, movimento de câmera, uma gramática curta de transições, som original e uma história coerente. A abertura já começa com edição de nota e usa uma perda de conexão real; não é uma tela genérica parada. A Gika tem uma troca legível e não atribui resposta ao vivo ao modelo. O offline fica no escopo estreito demonstrado pela captura.

O limitador agora é a montagem, não a falta de funcionalidades. A maioria das cenas mantém o mesmo molde: manchete à esquerda e janela retangular do produto à direita sobre o mesmo fundo editorial. O aplicativo muda, mas o peso e a distribuição do quadro mudam pouco. Pan/zoom sobre capturas estáticas dão acabamento, porém não substituem mudança de escala dramática, composição ou continuidade de ação. A sequência acaba lembrando módulos de apresentação, embora cada módulo seja individualmente limpo.

O motivo narrativo mais próprio do Leve — a mesma nota que abre e fecha o filme — ainda não organiza suficientemente as cenas intermediárias. A passagem para mobile é real, mas lê-se como inserção de plataforma, em vez de continuidade espacial inevitável. A marca recebe um intervalo dedicado curto, mas a sua caixa raster escura ainda pode parecer um asset colocado sobre a composição. As capturas de offline incluem controles nativos e texto longo, mais próprios de uma demonstração funcional que de um plano de confiança.

## Revisão por trecho

| Trecho V2 | Problema observado | Objetivo da nova versão | Direção proposta | Risco / controle | Impacto esperado |
|---|---|---|---|---|---|
| 0–5 s — cold open | A ação e a queda de rede são verdadeiras, mas a escala ainda se parece com uma janela de produto enquadrada no layout recorrente. | Começar íntimo, no conteúdo da nota; fazer a conexão cair dentro do gesto; abrir espaço à frase só depois da ação. | Plano próximo da nota, corte motivado no estado de conexão, pull-back curto revelando a nota já aberta; headline entra no espaço negativo ou fica fora deste plano. | Não implicar que uma nova edição offline foi salva nem prometer recuperação geral. Reusar exatamente o estado comprovado. | Gancho imediato e motivo visual reconhecível. |
| 5–8 s — marca | O intervalo de marca é curto, mas o bitmap e sua caixa contrastante podem quebrar a sensação de superfície contínua. | Marca ser consequência da composição e não uma cartela isolada. | Usar logo menor e recortado por máscara editorial quando a arte original permitir; transição da borda da nota para a marca, sem tela vazia. | Não redesenhar nem inventar logo; conferir nitidez em 1080p. | Mais integração e menos sensação de apresentação em slides. |
| 8–17 s — Meu Dia | O close de ação é bom, mas texto lateral + screenshot ainda rege a composição. | Fazer a interface ocupar o quadro e usar o check como ponto de atenção. | Abrir em contexto; corte para close da tarefa e feedback real; retornar ao plano aberto após a conclusão. | O checkbox e o resultado precisam vir das capturas reais e dos IDs existentes. | Variação de escala e microinteração com consequência. |
| 17–24 s — calendário/mobile | Calendário e mobile aparecem em sequência, mas o segundo ainda pode parecer prova de responsividade separada. | Um mesmo contexto visual deve migrar de desktop para telefone. | Aproximar a data selecionada; match cut por dia/nota para captura mobile real por 3–5 s; sem mouse no plano móvel. | Não simular moldura de dispositivo nem estado; usar Playwright com descriptor real e manter legibilidade. | Continuidade entre superfícies, não checklist de plataformas. |
| 24–32 s — notas | Plano editorial adequado, mas a captura ainda é tratada como painel a ilustrar a manchete. | Transformar uma nota real em plano principal e deixar o conteúdo respirar. | Close em título/corpo; movimento lateral mínimo seguindo a hierarquia; texto promocional ausente ou curto. | Não mostrar dados sensíveis; respeitar conteúdo da fixture e captura. | Intimidade, leitura e contraste de ritmo. |
| 32–39 s — compras | Repetição do layout dividido enfraquece a sensação de ação. | Mostrar checkbox/progresso como resolução visual. | Plano médio da lista, corte para checkbox e avanço real, pequeno recuo ao final; som pontual, sem efeito por cada toque. | Somente estado real capturado; não fabricar barra ou percentual. | Resposta tátil e utilidade em menos tempo. |
| 39–50 s — Gika | É uma cena forte e legível, mas volta ao mesmo arranjo visual e tem densidade de texto alta. | Fazer a conversa ser parte do espaço do Leve e dar energia à transformação pedido→resultado. | Começar contextualizada; aproximar o composer e a mensagem; deixar a ação/resultado visível; recuar para provar que continua dentro da agenda. | Fixture apenas no upstream Gemini, estritamente compatível com contrato real; UI/router/comando reais; nunca indicar geração ao vivo. | Personalidade sem virar relatório técnico nem chatbot genérico. |
| 50–64 s — offline | Correção factual está boa, mas controles/formulário e copy documental podem deixar a cena explicativa. | Reduzir a energia sem dramatizar e mostrar uma tarefa específica pendente enquanto a conexão volta. | Enquadrar estado real de tarefa/outbox e reconexão em close; usar pausa e retorno da música; preferir “Esta tarefa espera a conexão voltar” apenas se ledger/captura confirmarem. | Não ampliar claim; preservar divergência entre documentação e estado atual no relatório e ledger. Evitar expor campo nativo de data em formato ambíguo. | Confiança serena e leitura imediata do que ocorreu. |
| 64–72 s — resolução | A nota retorna, mas o filme retoma a mesma fórmula gráfica da abertura; o logo final pode parecer outra cartela. | A mesma nota precisa fechar o arco e o movimento musical. | Match cut para a nota do início; uma linha curta “Mais espaço para viver.”; movimento estabiliza e a marca fecha por até ~2 s. | Reutilizar a nota real e não sugerir uma ação offline não verificada. | Conclusão memorável, sem pausa vazia. |

## Decisão para V3

1. Preservar a duração na faixa aproximada de 68–72 s; não alongar só para manter o storyboard antigo.
2. Romper deliberadamente o layout dividido recorrente: incluir planos full-bleed sem headline, close funcional sem texto, plano médio e uma composição mobile central. Limitar headline aos momentos de promessa, transição e fecho.
3. Usar a nota real como motivo de continuidade (abertura → calendário/mobile → fecho), em vez de usar fundos e cards decorativos sem função narrativa.
4. Adotar três famílias de transição no máximo além de corte seco: match move/cut, paper slide/mask e crossfade curto só para respiro. Movimento reage a ação ou foco, sem parallax gratuito.
5. Fazer um spike com a técnica de captura escolhida antes de sequência nova. A gravação contínua existente teve carregamento inicial e nitidez inferior à captura 2x; comparar screenshot de alta resolução, sequência e vídeo real do navegador. Não usar uma tela artificial para dar fluidez.
6. Rever a captura offline para eliminar formatos de data ambíguos do plano sem esconder uma limitação de produto; manter apenas estado e copy comprovados. Nenhum componente ou mensagem de produto será criado para filmagem.
7. Reusar a composição sonora original reproduzível apenas depois de remapear eventos à montagem nova. Preservar licença e relatório de níveis; avaliação auditiva humana permanece uma limitação a declarar, não a simular.
8. Revalidar todas as claims contra `video/reports/claims-ledger.md`; nenhum estado de UI, sincronização, mobile ou Gika pode ser ampliado pela edição.

## Riscos e gates mantidos

- Risco principal: criar movimento sofisticado em cima de screenshot estático e ainda parecer screen recording. Mitigação: composição e ação mudam juntas; usar vídeo real de navegador só se spike passar nitidez/estabilidade/FPS.
- Risco factual: o corte de conexão pode ser lido como capacidade offline universal. Mitigação: copy contextual, mostrar só o estado coberto e manter divergência documental no relatório.
- Risco de Gika: sequência determinística ser interpretada como resposta ao vivo. Mitigação: não mostrar alegação de tempo real/modelo; interceptação fica explicitada no relatório técnico e ledger.
- Risco sonoro: medição objetiva não comprova timbre ou gosto. Mitigação: mixar de forma conservadora, registrar medições e manter a ressalva de revisão humana.

**Veredito criativo:** V2 é uma boa apresentação de produto com fidelidade e acabamento técnico aprovados; ainda não sustenta a variedade de composição e continuidade visual pedidas para um filme de lançamento. A V3 deve privilegiar ação em close, mudanças de plano motivadas e a nota como elo narrativo, não acrescentar efeitos decorativos.
