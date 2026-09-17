# Direção de arte — experiências sazonais

**Aprovado em:** 17/09/2026  
**Estado:** experiência sazonal e marcadores de datas âncora integrados; refinamento visual validado após revisão em aparelho real

## Decisões aprovadas

- Intensidade: **equilibrada e elegante**.
- Linguagem: **formas editoriais e abstratas**, sem pacote visual genérico.
- Intro: aproximadamente **3 segundos**, uma vez por período/aparelho.
- Natal: **estrelas e luzes**, com neve mínima ou ausente.
- Páscoa: **ovos, folhas e formas de papel**, sem coelho literal como elemento dominante.
- PWA: **favicon sazonal agora**; ícone já instalado no launcher continua best-effort e não é requisito funcional.
- Calendário: datas especiais recebem **um pequeno símbolo próprio na data exata**, sem competir com compromissos.

## Princípios

A agenda continua sendo o protagonista. A ambientação não desloca formulários, não cobre tarefas, não bloqueia interação e não altera significado de cores de atividades, notas ou categorias.

A identidade visual deriva dos tokens ativos do Leve. Eventos são reconhecidos principalmente pela forma, não por forçar vermelho/verde, laranja ou outras cores fixas.

Os SVGs são próprios, pequenos e determinísticos. Não há imagens remotas, Lottie, Motion, canvas permanente, partículas aleatórias ou dependência nova de animação.

## Eventos V1

| Evento | Linguagem visual |
| --- | --- |
| Natal | estrela editorial de quatro pontas, brilhos discretos |
| Ano-Novo | spark geométrico e linhas de luz |
| Páscoa | forma oval com faixas orgânicas, como papel recortado |
| Festa Junina | bandeirolas geométricas de baixa saturação |
| Halloween | lua crescente e pequeno detalhe de morcego abstrato |

## Movimento

A intro usa apenas `opacity` e `transform`, dura cerca de 3 segundos e nunca bloqueia cliques. A ambientação usa poucos elementos, deslocamentos de poucos pixels e ciclos lentos.

Os marcadores do calendário são **sempre estáticos**. Eles não pulsam, não giram e não criam movimento adicional dentro das células de datas.

`prefers-reduced-motion` e a preferência de perfil `reduceMotion` sempre prevalecem: nesse caso a intro animada não é exibida e a decoração permanece estática.

Se `seasonalDetailsEnabled` estiver desativado, nenhuma decoração, intro, favicon sazonal ou marcador de data especial é aplicada.

## Superfícies

- Login: presença um pouco maior, sempre atrás da interação.
- Meu dia: principal superfície autenticada.
- Calendário: detalhe no cabeçalho e marcadores discretos nas datas âncora.
- Demais páginas: apenas detalhe global mínimo.

## Marcadores do calendário

Os marcadores fazem parte do contexto temporal do calendário, não apenas da ambientação do período atual. Ao navegar para uma data sazonal, o símbolo pode aparecer mesmo que a data de hoje esteja em outro mês.

Datas âncora V1:

| Data | Evento | Forma |
| --- | --- | --- |
| 01/01 | Ano-Novo | spark geométrico |
| domingo de Páscoa | Páscoa | ovo abstrato |
| 24/06 | Festa Junina | bandeirolas |
| 31/10 | Halloween | lua crescente |
| 25/12 | Natal | estrela editorial |
| 31/12 | Ano-Novo | spark geométrico |

### Tratamento visual final

A primeira versão integrada usava o símbolo dentro de um pequeno contêiner com fundo, borda e raio. A revisão em aparelho real mostrou que essa composição era lida como badge ou botão e adicionava ruído a uma grade que já possui bordas, foco, seleção e atividades.

O tratamento definitivo é **ícone editorial solto**:

- nenhum fundo, borda, sombra ou cápsula ao redor do SVG;
- posição no canto superior direito, com respiro suficiente em relação ao número;
- aproximadamente **12–16 px**, com ajuste óptico por desenho e viewport;
- cor derivada dos tokens ativos, combinando acento e texto em vez de usar cor fixa por evento;
- opacidade moderada, suficiente para reconhecer o símbolo sem disputar protagonismo;
- um eco muito sutil da cor de acento no número da data especial;
- `hoje`, seleção, foco e atividades continuam hierarquicamente acima do efeito sazonal;
- nenhum marcador é interativo e todos mantêm `pointer-events: none`.

Regras visuais e funcionais:

- visão Mês: marcador apenas na célula pertencente ao mês exibido; datas adjacentes não recebem o símbolo;
- visão Semana/Dia: marcador no cabeçalho da data correspondente;
- nenhum compromisso muda de cor por causa da data sazonal;
- o ícone é `aria-hidden`; o nome do evento entra no nome acessível do botão da data;
- nenhum marcador é mostrado quando `seasonalDetailsEnabled` estiver desligado.

## Privacidade e performance

- nenhum analytics;
- nenhuma localização remota;
- nenhuma API externa de feriados;
- nenhum dado pessoal novo;
- intro vista fica somente no aparelho em `leve.seasonal.seen.<eventId>.<periodId>`;
- preferência de exibição fica no perfil e participa da exportação;
- número pequeno e fixo de elementos decorativos;
- marcadores são resolvidos localmente por data civil;
- sem `requestAnimationFrame` permanente.

## Validação do refinamento

O refinamento visual foi integrado pelo PR #4 no squash:

```text
f7894a5da7845bb03e658b7fb4ffd45289e17963
refine(calendar): simplify seasonal date markers
```

Antes do merge, o mesmo HEAD passou CI completo, Seasonal E2E e Planner E2E. Depois do merge, os três gates passaram novamente na `main`.

O E2E sazonal protege explicitamente contra regressão para aparência de badge: o marcador precisa permanecer transparente, sem borda, sem sombra, não interativo e dentro do orçamento de tamanho definido.

O workflow focal do Planner também observa os arquivos do marcador sazonal que podem alterar a composição do Calendário.

## Gate de conclusão

A fase e suas extensões só podem ser integradas depois de unitários, lint, typecheck, build, integração relevante e Playwright sazonal passarem, incluindo modo desligado, reduced motion, claro/escuro, desktop/mobile e ausência de overflow/Axe crítico.

Alterações no calendário também precisam preservar o gate focal do Planner.

A **Fase 7 de auditoria final não foi iniciada** por decisão explícita do usuário.
