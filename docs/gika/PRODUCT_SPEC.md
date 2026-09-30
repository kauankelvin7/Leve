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
