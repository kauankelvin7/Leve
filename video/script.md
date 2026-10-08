# Roteiro — Leve / V2

**Duração:** 72 s · **Idioma:** pt-BR · **Uso:** copy editorial e montagem.

| Tempo | Cena | Texto em tela | Montagem |
|---|---|---|---|
| 00–04 | Gancho | Sem headline; interface real. | Nota sendo escrita imediatamente, salva online e depois visível com faixa offline nativa. Sem reload ou salvamento offline. |
| 04–07 | Marca | **Organizar a vida deveria ser leve.** | Reveal rápido do logo real depois da frase. |
| 07–16 | Meu dia | **Seu dia, em perspectiva.** | Aberto, foco no checkbox, conclusão real e recuo. |
| 16–23 | Calendário | **Veja seus dias tomar forma.** | Mês, seleção real do dia e pan até o detalhe. |
| 23–27 | Mobile | **O mesmo espaço. No seu ritmo.** | Abrir a mesma nota na UI mobile capturada com touch/viewport reais; moldura neutra. |
| 27–35 | Notas | **Ideias também têm lugar.** | Close lateral do editor e cartão salvo online. |
| 35–42 | Compras | **Até o cotidiano ganha espaço.** | Marcar Café; feedback e itens concluídos reais. |
| 42–53 | Gika | **Uma ideia vira próximo passo.** | App contextualizado, pedido, resultado “Tarefa adicionada”, plano aberto. |
| 53–56,5 | Offline / cache | **Sua agenda já aberta, ainda por perto.** | Mostrar conteúdo já consultado e estado offline nativo. |
| 56,5–60,75 | Offline / tarefa | **Esta tarefa espera a conexão voltar.** | Mostrar “Regar as plantas” aguardando rede na outbox real. |
| 60,75–65 | Reconexão | **Conexão de volta. Tarefa na agenda.** | ACK real e consulta da tarefa aplicada. |
| 65–72 | Fecho | **Mais espaço para viver.** | Mesma nota da abertura, recuo e logo por aproximadamente 2 s. |

## Regras de interpretação

A Gika usa fixture compatível com o contrato real somente no upstream Gemini. Auth, UI, endpoint do app, router e comando são reais. Não chamar essa resposta de ao vivo; não inventar revisão/confirmação separada. O aviso técnico de V1 sai do filme por solicitação explícita de polish, mas a interceptação permanece no ledger e nos relatórios.

A abertura mostra persistência online seguida de permanência visual da nota durante a queda de rede, sem reload. A cena offline posterior demonstra dados previamente consultados e uma criação de tarefa elegível. Não afirmar que todo histórico fica disponível, que todo comando funciona offline ou que a sincronização é garantida.

Headlines e UI tornam o filme compreensível mudo. A trilha original instrumental e os efeitos são complementares. `narration.md` e o SRT são textos editoriais opcionais; não existe locução gravada ou TTS neste master. O README comprimido não é referência de qualidade do master.
