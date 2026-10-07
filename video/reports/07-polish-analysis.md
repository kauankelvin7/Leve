# Análise de direção — V1 para V2

Base preservada: commit `e60717960455a37903e356f9e78ce09475a900c9`, branch `video/product-film`. Master V1 preservado em `video/output/v1/master.mp4`, SHA-256 `bb37187c80573a7b15a6e92ed5617d82254926d5310ce2222a185d26edd2c301`. Análise anterior a qualquer mudança na composição/captura. Contact sheet de 1 fps: `video/output/v1/contact-1fps.jpg` (76 quadros). Master inspecionado em 1080p, não pelo derivado de README.

## Diagnóstico

A identidade Vidro & Papel e as capturas 2x estão adequadas. O problema é editorial: `ScreenScene` repete headline superior + mesmo app inteiro, `CameraMove` faz apenas scale 1→1,025 ao longo do plano, sem responder a uma ação. Os screenshots finais substituíram as ações previstas no storyboard. A V1 tem 76 s, 60 fps e não tem áudio. Os planos de Meu dia (10 s), Notas (10 s), Gika (11 s) e Compras (7 s) conservam praticamente a mesma informação. As transições usam o mesmo fade. O mobile existe em 23–25 s, porém dura 2 s e tem pouco peso na montagem. O aviso de fixture na Gika ocupa espaço editorial. A copy offline é precisa, mas abstrata.

## Plano por cena

| Cena V1 | Problema | Objetivo visual | Mudança proposta | Risco e mitigação | Impacto esperado |
|---|---|---|---|---|---|
| Abertura 0–5 | Tela inteira sem ação; curiosidade baixa | Gesto imediato, íntimo, com resolução real | Close da nota sendo editada online; ACK de salvamento; corte de rede real e nota já consultada visível, apenas se estado real claro. Fallback: edição/salvamento online como ação concreta | Não implicar salvamento de nota offline ou garantia de permanência. Não acrescentar indicador à UI. Capturar e verificar antes de escolher | Gancho em 2–3 s e conexão com a nota do fecho |
| Marca 5–10 | Logo pequeno e quase parado por 5 s | Respiro breve com afirmação de marca | Frase por 2 s e logo original em reveal curto; plano total ~3 s, sem redesenho | Bitmap da marca não suporta grande upscale; usar o recorte atual em escala moderada | Mais impacto e menos espera |
| Meu dia 10–20 | Mesmo plano inteiro por 10 s | Ligar câmera à conclusão de tarefa | Aberto → médio da atividade → cursor capturado em bounding box → check/feedback real → abrir plano | Estado de conclusão deve vir da UI/ACK real; não desenhar check falso | Demonstração de uso, escala legível e energia |
| Calendário 20–28 | Tela semanal distante; corte mobile fugaz | Conduzir olhar ao dia e continuidade no celular | Pan até data/atividade; seleção real; mobile real por 4 s, com consulta/abertura de nota ou detalhe; moldura neutra | Preservar data/fuso e coerência entre cenas; não simular responsividade | Variedade horizontal/vertical natural |
| Notas 28–38 | Formulário/lista inteiro e sem ação | Fazer a ideia ganhar presença | Close editorial da mesma nota e breve edição/salvamento real; composição lateral com copy curta | Não inventar texto/selo salvo, nem ocultar erro | Mais intimidade e leitura do conteúdo |
| Compras 38–45 | Mostra listas, sem marcar item | Dar feedback tangível | Lista aberta; aproximar Café/Bananas; cursor e marcação real; progressão visível | Capturar estado antes/depois, comandos e IDs no manifesto | Utilidade cotidiana com ação clara |
| Gika 45–56 | Resultado final longo e disclosure técnico destacado | Pedido → ação → resultado, com plano que abre/fecha | Aberto contextual → close no pedido e resultado → recuo. Remover aviso técnico do filme conforme novo pedido; manter interceptação no relatório/ledger. Eventual label discreto “Exemplo de uso” | Fixture estritamente real-contract; nada de “ao vivo”, nenhum tempo real atribuído ao modelo | Mantém a cena forte e reduz ruído de QA |
| Offline 56–69 | Formulário largo, frase de documentação | Mostrar uma pausa e uma retomada específica | Mudança de ritmo; dados já abertos; tarefa pendente real; reconexão real. Copy: “Sua agenda já aberta, ainda por perto.” / “Esta tarefa espera a conexão voltar.” / “Conexão de volta. Tarefa na agenda.” | Copy sempre condicionada ao contexto da captura; não prometer disponibilidade universal/sincronização total. Preservar dívida documental | Informação factual com linguagem humana |
| Fecho 69–76 | Nota distante e logo estático | Resolver a mesma nota e finalizar musicalmente | Close na mesma nota da abertura → plano confortável com “Mais espaço para viver.” → logo por ~2 s | Conteúdo exatamente salvo online; sem sugerir edição offline | Fecho coerente e sensação de filme |

## Direção transversal

Manter ~72–76 s conforme leitura final; a V2 não está obrigada a 76 s. Usar pelo menos aberto, médio e close, com push-in/pan/slide e movimentos somente perto de mudança de informação. Algumas transições por folha/slide, outras por corte seco; fade reservado a respiros. Cursor editorial usa coordenadas reais do manifesto, não inventa UI. Não exagerar spring, blur ou escala. Mobile captura nova com device descriptor real, 3–5 s integrado à jornada.

Áudio: criar camada original documentada, sem asset externo de licença desconhecida. Trilha instrumental discreta a ~92 BPM, crescimento leve, redução no offline e resolução final. Efeitos originais suaves, poucos e abaixo da trilha; mix 48 kHz, AAC, aproximadamente -16 LUFS e true peak <= -1,5 dBTP. Sem TTS. Se a avaliação musical reprovar a trilha, refinar ou justificar ausência de música; sound design continua obrigatório no master.

## Gates de execução

1. Análise registrada (este documento).
2. Novas capturas testadas: apenas UI/contratos reais; seed fictício; nenhuma alteração de produto; escolha honesta de abertura.
3. Render curto de abertura/ação/Gika/mobile antes do render integral.
4. Master V2 1080p60 CRF17 BT.709, audio medido; muted/README derivados separados.
5. QA de direção e técnico: 0 P0/P1, claims cruzados, decode integral, 1 fps e full-size keyframes, mix/licenças, mobile/abertura/câmera; corrigir antes de concluir.
