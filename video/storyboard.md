# Storyboard — Leve

**Fase:** 2 — Direção
**Checkpoint:** Gate 2 / aprovação humana antes de qualquer captura de filme
**Duração planejada:** 76 s
**Mensagem central:** Organizar a vida deveria ser leve.
**Diferencial:** Uma agenda pessoal que não perde o que você escreveu — mostrado com o limite real de dados previamente consultados e já sincronizados.

O Leve conduz uma única jornada: uma anotação permanece visível quando a conexão cai; a pessoa encontra o que precisa para o dia, atravessa calendário e listas, recebe ajuda delimitada da Gika e volta à nota depois da reconexão. Não é um catálogo de funções. A UI permanece protagonista; overlays editoriais são discretos e nunca simulam controles ou estados do produto.

| Cena / tempo | Objetivo e tela real | Ação e enquadramento | Headline / apoio (mudo primeiro) | Narração | Transição e captura necessária | Risco / claims ledger | Classificação |
|---|---|---|---|---|---|---|---|
| 1. Abertura limpa — 0–5 s | Apresentar o produto real sem antecipar uma cena offline que não ficou comprovada visualmente. | Começar com a UI autêntica de Meu dia e a marca original visível na navegação. Um push-in sutil revela a tela, sem indicador/estado criado para o filme. | **Um espaço para o que importa.** | “Uma agenda pessoal para o seu dia.” | Abertura limpa, construída com screenshot real e movimento editorial discreto; sem a cena de nota editada/queda de rede. | Copy é descritivo e apoiado nas áreas verificadas do produto. Claims: Leve reúne agenda, calendário, notas e compras. | `REAL + DETERMINÍSTICA` — sessão, conta e conteúdo fictícios; UI real. |
| 2. A ideia — 5–10 s | Apresentar a mensagem central da marca. | A interface recua como uma folha; manter o logotipo Leve original, tipografia e cores do design system. Fundo inspirado em papel/vidro, sem efeitos decorativos. | **Organizar a vida deveria ser leve.** | “Organizar a vida deveria ser leve.” | Crossfade curto a partir da UI; usar marca real presente na captura e tokens de `DESIGN.md`/CSS. | Frase de marca, não garantia funcional. Claims: mensagem central no storyboard. | `REAL + DETERMINÍSTICA` — composição editorial usa marca/tokens existentes. |
| 3. O dia ganha forma — 10–20 s | Explicar o produto por meio de Meu dia. | Retorno à UI autenticada; mostrar data selecionada, resumo e uma atividade fictícia. Um gesto sem pressa abre/realça o dia. Evitar painel vazio ou dado que pareça pessoal. | **Seu dia, em perspectiva.** Apoio: **Agenda e tarefas no mesmo espaço pessoal.** | “No Meu dia, compromissos e tarefas aparecem juntos. Você escolhe uma data e enxerga o que pede atenção.” | Pan horizontal contínuo para o calendário; screenshot 2x da UI mais microclipe/frames de seleção, viewport desktop. | Data fixa e conteúdo seed; garantir que dia da semana e data coincidam. Claims: Leve reúne agenda, calendário, notas e compras; Meu dia mostra data consultada. | `REAL + DETERMINÍSTICA` — seed/data controlados. |
| 4. A semana se conecta — 20–28 s | Mostrar navegação temporal, sem duplicar o controle “Hoje”. | Calendário real em semana; selecionar um dia e mostrar tarefas/detalhe. Câmera acompanha a seleção; mostrar somente controle inequívoco e estado selecionado. | **Veja a semana tomar forma.** | “No calendário, a semana se conecta ao restante da sua agenda.” | A seleção do calendário vira a folha seguinte na mesa contínua. Captura sem modal. | Confirmar data e rótulo de dia civil no screenshot. Claims: navegação do calendário por mês/semana/dia. | `REAL + DETERMINÍSTICA` — data e tarefas seedadas. |
| 5. Guardar uma ideia — 28–38 s | Humanizar a rotina e preparar o retorno narrativo. | Abrir nota fictícia e editar uma frase curta real; esperar o estado/persistência que a UI de fato exibir. Não sobrepor texto diferente do salvo. Enquadramento íntimo, editor legível. | **Ideias também têm lugar.** Apoio: **Notas que você pode editar.** | “Uma ideia pode virar nota, ficar organizada e ser retomada quando fizer sentido.” | Match cut usando a posição do título da nota para formar uma lista. Capturar criação/edição e estado real, com leitura após reload se necessário. | Não inventar indicação “salvo”; conteúdo e conta precisam ser fictícios. Claims: nota pode ser salva e editada na conta autenticada. | `REAL + DETERMINÍSTICA` — conta, nota e texto fictícios; UI/persistência reais. |
| 6. O que falta — 38–45 s | Mostrar utilidade cotidiana das compras sem transformar em lista de features. | Lista real seedada com dois itens; marcar um como concluído, mantendo item e contexto visíveis. Enquadramento compacto. | **E a lista segue com você.** | “E até as pequenas compras encontram seu lugar.” | O check visual conduz à abertura da Gika; microclipe curto ou sequência de frames. | Não implicar que a Gika gerencia itens de compra. Claims: Leve organiza listas e itens de compras. | `REAL + DETERMINÍSTICA` — lista/itens seedados. |
| 7. Ajuda com contexto — 45–56 s | Demonstrar o papel real e delimitado da Gika. | UI verdadeira do painel: pedir uma ação simples coberta (por exemplo, criar uma tarefa datada) e mostrar o resultado real “Tarefa adicionada” depois do ack do comando. A chamada upstream Gemini exata usa fixture determinística compatível com o contrato real; autenticação, UI, rota `/api/gika/respond`, router e comando Firebase continuam reais. | **Uma ideia pode virar próximo passo.** Apoio: **Gika ajuda a organizar a agenda.** | “Quando você pede, a Gika pode criar uma tarefa simples para sua agenda.” | Corte motivado no resultado aplicado e depois deslize de volta para a nota. Captura mantém Auth, UI, endpoint do app, router e comando reais; somente a chamada upstream Gemini usa resposta determinística predefinida. | Não dizer “ao vivo”; não atribuir raciocínio geral, precisão garantida ou autonomia. O fluxo de criação é aplicado após o retorno e não pede confirmação separada; não mostrar uma revisão fictícia. Claim: Gika focada em agenda e pode criar tarefa simples; ledger deve marcar claramente a dependência interceptada. | `INTERCEPTADA — UI, AUTH, ENDPOINT DO APP, ROUTER E COMANDO REAIS / FIXTURE SOMENTE NO UPSTREAM GEMINI`. O fixture intercepta o endpoint upstream Gemini exato e retorna envelope/function-call compatível com o contrato real; não intercepta `/api/gika/respond`. Documentar explicitamente que a resposta do modelo é determinística, nunca ao vivo. |
| 8. Quando a conexão pausa — 56–69 s | Demonstrar o caminho offline validado, sem ampliar a promessa. | **56–58 s:** respiro visual, sem headline. **58–62 s:** na tela real de Meu dia, a rede cai; mostrar a faixa de modo offline e tarefas previamente consultadas. **62–66 s:** criar “Regar as plantas”; mostrar a mensagem real de que ficou salva no aparelho aguardando conexão. **66–69 s:** reconectar, aguardar o ACK 200 real da outbox e consultar novamente Meu dia para mostrar a tarefa aplicada. | **Dados consultados antes podem continuar disponíveis.** Apoio: **Uma tarefa compatível aguarda a conexão voltar.** | “Sem conexão, o Leve pode manter acessíveis dados que já foram consultados e guardar certas alterações para tentar sincronizar quando a rede voltar.” | Usar as capturas autenticadas do Vite + Firebase Emulator. O preview público com service worker é evidência separada da abertura do shell depois do cache, não parte deste fluxo. Não mostrar a faixa transitória de reconexão junto do aviso de cache: ela pode coexistir por instantes. | E2E `persistent.spec.ts::duas abas sincronizam...` comprova cache após consulta, criação elegível na outbox e replay após reconexão. A captura recarrega a segunda aba após o ACK e mostra o estado servidor confirmado. Não afirmar que tudo funciona offline nem que todo histórico está no aparelho. | `REAL + DETERMINÍSTICA` — UI, Auth, outbox e comando reais no Emulator; operação e conteúdo fictícios. |
| 9. O fio se fecha — 69–76 s | Encerrar a jornada na mesma nota apresentada antes das outras áreas. | Retomar “Uma ideia para retomar” na tela de notas, agora com conexão disponível; afastar a câmera até a marca. Não associar a nota à alteração offline. | **Leve. Mais espaço para viver.** | “Leve. Um espaço pessoal para o que você quer lembrar e fazer.” | Crossfade para logo e URL pública somente se aprovada e comprovada; final quieto, sem CTA que não exista. | A sequência retorna ao mesmo registro fictício. Não sugerir que essa nota foi editada ou sincronizada offline. | `REAL + DETERMINÍSTICA` — mesma nota fictícia consultada na conta de teste. |

## Direção visual e ritmo

- Duração total: **76 s**, dentro do alvo de 65–85 s. Cenas âncora: 3, 5, 7 e 8; passagens mais rápidas: 2, 4 e 6.
- A tela do Leve é a superfície principal. Usar mesa contínua clara, inspirada em “Vidro & Papel”, sem reestilizar a UI nem esconder affordances. Motion futuro deve partir de tokens e fontes reais (Nunito/DM Sans conforme `DESIGN.md`), com zoom moderado e texto sempre legível.
- Todo conteúdo mostrado é seed local `@example.test`. Não mostrar dados de produção, secrets, cookies, console, DevTools ou `/demo/*`.
- Mobile real aparece por alguns segundos dentro de moldura CSS neutra, como janela do Meu dia ou calendário. Requer viewport com touch; sem moldura de marca de aparelho. Essa inserção pode substituir parte da cena 4 após revisão de legibilidade e consistência funcional, sem alongar o corte.
- No máximo uma headline (até 8 palavras) e um apoio curto por cena. Duração suficiente para leitura; a fala não carrega informação exclusiva.
- O motivo de “salvo” só aparece se houver affordance real no estado capturado. Não acrescentar check, toast ou animação que afirme persistência.

## Estratégia de captura proposta (não iniciada)

1. Usar a conta seed do Emulator e dados idempotentes inteiramente fictícios. Data civil fixa em `America/Sao_Paulo`; `document.fonts.ready` antes de cada captura. Desktop recomendado pelo orquestrador: 1600×900, deviceScaleFactor 2; mobile com descriptor/touch real.
2. Fluxos comuns (Meu dia, calendário, notas e compras): primeiro testar o roteiro com Playwright sem render; depois capturar estados em screenshot 2x e usar clipe curto/frames somente para microinterações. Emitir `manifest.json` com timestamps, bounding boxes e tipo de ação para cursor/câmera no Remotion.
3. Gika: chamar o fluxo verdadeiro primeiro. Se Gemini ao vivo indisponível, interceptar somente a chamada upstream com fixture documentada, schema/contrato reais, manter router/Auth/comandos reais e rotular internamente a cena como interceptada. Não capturar conversa se o payload/fixture não puder ser revisado.
4. Offline: validar a abertura shell em build de produção/preview com service worker instalado; iniciar com dados já consultados online; acionar `context.setOffline(true)` e observar UI/cache reais; para gravação de alteração, fila e reconexão, repetir o E2E persistente com conta fictícia e registrar qual ambiente/prova cobre cada trecho. A edição da nota seguida de reload não foi comprovada; por isso o cold open offline foi abandonado em favor da abertura limpa. Nada de indicador editorial.
5. Antes da aprovação: **nenhuma captura de filme é autorizada**. Após Gate 2 aprovado, comparar screenshot + animação, `recordVideo`, sequência de frames e CDP screencast numa amostra de aproximadamente 3 s; registrar qualidade, fps, estabilidade e tamanho no relatório de captura.

## Riscos ainda conhecidos

- A documentação do produto ainda diverge do comportamento default offline; não transformar isso em claim de preferência de usuário.
- A prova do service worker é de abertura/reload pública offline; a prova de conteúdo e outbox vem de E2E local autenticado. A sequência final deve respeitar esse escopo e não combinar estados sem documentar como foram capturados.
- A sessão precisa ter sido inicializada online e conteúdo consultado antes; cache local pode ser limitado/evicto. Escritas offline só são suportadas para comandos elegíveis; exclusão e operações de conta não entram.
- Gemini ao vivo e notificações push em dispositivo não foram testados. Push, notificações do sistema, Gika ao vivo, `/demo/*`, promessas de privacidade absolutas e garantia de que “nada se perde” não aparecem.
- Não há decisão/licença de TTS ou música aprovada. Plano sonoro conservador: versão muda plenamente compreensível; preparar a locução humana e SRT. Não incluir TTS/música até confirmar licença e qualidade.

## Gate 2 — conferência do diretor

- Narrativa tem início (anotação), meio (organização/ação) e fim (retorno à anotação).
- Leve permanece protagonista; Gika é uma participação delimitada, com dependência externa explicitada.
- O filme deve funcionar mudo pelas headlines e pela interface; nenhum claim `NÃO VERIFICADA` é proposto.
- Todas as cenas planejadas são classificadas como `REAL + DETERMINÍSTICA` ou `INTERCEPTADA`; nenhuma cena `PROIBIDA` integra o filme.
- A cena offline fica na demonstração principal, depois de a abertura limpa e demais áreas do produto estarem estabelecidas; o escopo de cache e outbox já está no claims ledger.

STATUS:
DONE

ARTEFATOS:
- `video/storyboard.md`
- `video/script.md`
- `video/narration.md`

VALIDADO:
- Orquestrador lido integralmente; análise do produto e claims ledger revisados.
- Durações somam 76 s; cada cena documenta tela, ação, copy, fala, transição, captura, risco, claim e classificação.
- Estratégia separa evidência real e determinística e descreve a interceptação prevista da Gika.
- Considerei as execuções que o orquestrador relatou, sem iniciar captura ou alterar produto.

PROBLEMAS:
- A evidência de confirmação da Gika no E2E usa Gemini fixture, embora router/comando sejam reais; o fluxo não tem confirmação separada antes de criar a tarefa.
- A prova de preview público com service worker e a captura do app autenticado no Emulator são ambientes e evidências separados; não compor como se fossem a mesma sessão.

RECOMENDAÇÃO:
- O orquestrador deve revisar o texto e alinhar o ledger às novas execuções; então apresentar storyboard, claims, estratégia, classificação e riscos ao usuário no checkpoint único. Não iniciar Fase 3 antes da aprovação.
