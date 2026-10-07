# Gika — Product Spec

## Visão

**Leve** é a agenda. **Gika** é a assistente dentro dela.

A Gika não deve parecer um chatbot genérico anexado ao produto. Ela é uma interface natural para consultar, criar, reorganizar e compreender a agenda.

## Exemplos de intenção

### Consulta
- “O que tenho hoje?”
- “O que ficou atrasado?”
- “Como está minha semana?”

### Criação
- “Academia amanhã.”
- “Me lembra de revisar Java sábado.”
- “Consulta sexta às 14.”

### Atualização
- “Terminei academia.”
- “Joga Java para sexta.”
- “Muda o título para Revisão de Java.”

### Organização
- “Estou cansado hoje. Reorganiza o que puder.”
- “Move tudo menos academia para amanhã.”
- “Organiza minha semana.”

## Princípio de confiança

A Gika deve deixar claro:
- o que entendeu;
- o que pretende mudar;
- o que mudou;
- quando precisa de confirmação;
- quando não conseguiu executar.

## Ações de alto impacto

Operações em lote, exclusão e mudanças de recorrência devem mostrar preview antes da execução.

Exemplo:

> Vou mover 3 tarefas para sexta:
> - Java
> - Faculdade
> - Currículo
>
> Academia permanece hoje.
>
> [Cancelar] [Confirmar]

## Degradação graciosa

Se a IA falhar:
- mostrar erro simples;
- permitir retry;
- preservar texto digitado quando possível;
- manter o restante do Leve funcionando.

## Proatividade

A proatividade começa com regras determinísticas, por exemplo:
- muitas tarefas atrasadas;
- dia muito cheio;
- excesso de pendências migradas.

A regra mostra uma sugestão. A IA é chamada para elaborar um plano somente quando necessário.

## Fora do escopo inicial

- autonomia irrestrita;
- exclusões silenciosas;
- acesso direto ao banco pelo modelo;
- leitura indiscriminada de todo o histórico do usuário;
- execução contínua em background sem necessidade;
- substituir a UI tradicional do Leve.

## Avisos de atividades sem horário — 07/10/2026

O padrão do Leve é avisar às 00:00 no fuso da atividade quando ela tem uma data
mas não tem hora. Eventos de dia inteiro avisam no primeiro dia de cada ocorrência.
Não é preciso marcar lembrete para receber esse aviso; a permissão de notificações
do aparelho continua necessária. O horário pode ser personalizado no formulário
sem mudar o compromisso para evento com hora. Horários já passados não são enviados
retroativamente e atividade sem data não tem instante de aviso.

Gika deve criar a tarefa com dueTime=null quando a pessoa informa data e pede
notificação sem escolher hora; não exigir horário nem prometer aviso contínuo.
Configuração de antecipações/horário específico do aviso permanece no formulário.
O sucesso de criação sempre depende do ACK real do comando.
