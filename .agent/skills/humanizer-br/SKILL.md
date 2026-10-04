# humanizer-br

## Objetivo

Criar e revisar textos de interface em português brasileiro para o Leve/Gika de forma natural, clara, curta e humana, evitando linguagem artificial, corporativa ou com aparência de texto gerado por IA.

## Contexto do produto

- Leve é uma agenda pessoal inteligente.
- Gika é a assistente integrada ao Leve.
- Gika deve soar útil, próxima, tranquila e objetiva.
- Ela não deve parecer um chatbot genérico.
- A interface deve priorizar ação e compreensão rápida.

## Tom

Use:
- português brasileiro natural;
- frases curtas;
- vocabulário cotidiano;
- voz amigável sem exagerar intimidade;
- linguagem direta;
- instruções específicas;
- feedback claro sobre o que aconteceu.

Evite:
- linguagem excessivamente formal;
- frases promocionais;
- entusiasmo artificial;
- excesso de exclamações;
- jargão de IA;
- “mágica”, “revolucionário”, “poderoso”, “incrível” e similares;
- textos longos onde uma frase curta resolve;
- antropomorfizar demais a Gika;
- culpa, cobrança ou julgamento sobre produtividade.

## Princípios de UX writing

### 1. Ação primeiro

Ruim:
`Parece que existem algumas coisas que talvez você queira organizar.`

Melhor:
`Você tem 3 tarefas atrasadas. Quer reorganizá-las?`

### 2. Diga o que vai acontecer

Ruim:
`Continuar`

Melhor:
`Mover 3 tarefas`

### 3. Confirmações devem mostrar impacto

Exemplo:

`Vou mover 3 tarefas para amanhã:`

`• Java`
`• Faculdade`
`• Currículo`

`Academia continua hoje.`

Botões:
`Cancelar`
`Mover 3 tarefas`

### 4. Erros sem dramatização

Preferir:
`Não consegui falar com a Gika agora. Sua agenda continua disponível.`

Ações:
`Tentar novamente`

Evitar:
`Ops! Algo deu muito errado!`

### 5. Loading deve explicar atividade

Preferir:
- `Consultando sua agenda…`
- `Organizando as tarefas…`
- `Preparando uma sugestão…`

Evitar:
- `Pensando…`
- `Usando inteligência artificial…`
- `Processando dados com IA…`

### 6. Sucesso deve ser curto

Exemplos:
- `Tarefa criada para amanhã.`
- `Academia marcada como concluída.`
- `Java foi movido para sexta.`

Quando possível, oferecer:
`Desfazer`

### 7. Ambiguidade deve virar pergunta

Se houver duas tarefas chamadas Academia:

`Qual delas você quer concluir?`

Se uma tarefa fizer parte de recorrência:

`Quer alterar só esta tarefa ou também as próximas?`

### 8. Gika não deve fingir certeza

Quando não houver dados suficientes, pergunte.

Não inventar:
- tarefas;
- horários;
- prioridades;
- categorias;
- intenção do usuário.

## Vocabulário preferido

Preferir:
- tarefa
- rotina
- agenda
- hoje
- amanhã
- pendências
- organizar
- mover
- concluir
- adicionar
- editar
- desfazer

Usar “compromisso” apenas quando o domínio real do Leve fizer essa distinção.

## Identidade da Gika

Exemplos adequados:

`Pergunte à Gika`

`O que vamos organizar?`

`Você tem 3 tarefas para hoje.`

`Posso reorganizar essas pendências.`

`Vou manter Academia hoje e mover as outras duas para amanhã.`

Não usar constantemente o próprio nome:

Evitar:
`A Gika encontrou...`
`A Gika está pensando...`
`A Gika fez...`

Preferir comunicação direta.

## Microcopy de referência

### Empty state
`Nada planejado para hoje.`

### Composer
`Pergunte à Gika`

### Sugestões
- `Organizar meu dia`
- `Ver minhas pendências`
- `O que tenho amanhã?`
- `Adicionar uma tarefa`

### Offline
`A Gika precisa de conexão para responder. Sua agenda continua funcionando normalmente.`

### Falha de IA
`Não consegui responder agora. Tente novamente em alguns instantes.`

### Confirmação de lote
`Vou mover 4 tarefas para amanhã. Quer continuar?`

### Undo
`3 tarefas foram movidas.`
`Desfazer`

## Acessibilidade

- Não depender apenas de ícones.
- Botões devem ter labels acessíveis.
- Não depender apenas de cor para transmitir estado.
- Textos críticos devem permanecer compreensíveis fora do contexto visual.
- Evitar placeholders como única identificação de campos.

## Processo de revisão

Antes de aprovar qualquer texto:

1. Parece algo que uma pessoa brasileira realmente diria?
2. Dá para remover palavras sem perder informação?
3. Está claro o que aconteceu ou acontecerá?
4. Existe ambiguidade?
5. O texto pressiona ou julga o usuário?
6. O nome Gika está sendo repetido desnecessariamente?
7. A ação principal está explícita?
8. O texto funciona em uma tela pequena?

Se qualquer resposta revelar problema, reescreva antes de entregar.
