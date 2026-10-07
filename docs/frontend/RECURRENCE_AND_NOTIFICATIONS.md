# Repetição e avisos do Leve — 07/10/2026

Atividades com data sem horário avisam automaticamente às 00:00 no fuso da
atividade. O formulário não exibe esse horário nem permite alterá-lo. Atividades
com horário continuam avisando nesse horário. Dia inteiro de vários dias avisa
no primeiro dia de cada ocorrência; sem data não há aviso. O horário da atividade
permanece vazio: o aviso não transforma um dia inteiro em compromisso com hora.
A Gika explica o aviso no dia da atividade e só detalha meia-noite quando perguntada.
Permissão ativa do aparelho e execução do scheduler continuam necessárias.

## Pesquisa oficial

Consultada em 07/10/2026:

- [Notificações do Google Agenda](https://support.google.com/calendar/answer/37242?hl=pt-BR): padrão por agenda e ajustes por evento; preferências pessoais.
- [Eventos recorrentes](https://support.google.com/calendar/answer/37115?hl=pt-BR): frequência e término configuráveis.
- [API de eventos](https://developers.google.com/workspace/calendar/api/v3/reference/events): eventos all-day usam `date`, eventos com hora usam `dateTime`; lembretes podem usar defaults da agenda ou offsets em minutos.

Essas referências não estabelecem meia-noite como regra universal do Google.
00:00 é uma decisão explícita do produto Leve pedida pelo usuário. A adaptação
conserva a separação entre data, hora e aviso e usa padrões automáticos para
reduzir passos de cadastro, sem reproduzir todos os recursos do Google Agenda.

## Opções disponíveis

O modal de repetição reúne não repetir, diariamente, semanalmente, mensalmente,
anualmente e personalizar. A personalização permite intervalo de 1 a 30
unidades (dias/semanas/meses/anos), fim por data ou quantidade até 180.
Mensal/anual podem usar último dia do mês ou pular a ocorrência quando a data
não existe. 29/02 volta a 29/02 em anos bissextos; não acumula desvio da data original.

Há até três avisos antecipados opcionais: 5/10/15/30 minutos, 1/2 horas,
1/2 dias, uma semana ou quantidade personalizada em minutos/horas/dias/semanas,
com limite de 30 dias. Todos partem do aviso automático da atividade. Para uma
atividade sem hora, um aviso de 1 dia acontece às 00:00 do dia anterior.

## Persistência e migração

Mesmas APIs de comandos, revisões, recibos e outbox. `yearly` amplia o schema
existente. A janela de 45 dias e os limites de materialização são preservados;
quando não há ocorrência na janela, o scheduler registra a janela verificada
sem consumir ocorrência, para não prender o lote em séries anuais.

`dayReminderTime` antigo continua aceito em arquivos/clientes antigos, porém
não altera o padrão do sistema. Backfill V3 realinha jobs futuros pendentes,
preservando IDs e histórico de tokens entregues; jobs finalizados não são
reabertos. Scheduler descarta jobs antigos divergentes. Avisos passados não são
enviados retroativamente.

## Validação

Evidências finais e comandos em `.agent/RECURRENCE_OPTIONS_EXECPLAN.md`.
Testes em Auth/Firestore emulados com dados fictícios; Gemini upstream controlado.
Recebimento em aparelho real e Gemini live não foram executados neste ambiente.
