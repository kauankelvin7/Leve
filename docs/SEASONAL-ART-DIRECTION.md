# Direção de arte — experiências sazonais

**Aprovado em:** 17/09/2026  
**Estado:** direção validada para implementação na branch `feat/seasonal-experiences-safe`

## Decisões aprovadas

- Intensidade: **equilibrada e elegante**.
- Linguagem: **formas editoriais e abstratas**, sem pacote visual genérico.
- Intro: aproximadamente **3 segundos**, uma vez por período/aparelho.
- Natal: **estrelas e luzes**, com neve mínima ou ausente.
- Páscoa: **ovos, folhas e formas de papel**, sem coelho literal como elemento dominante.
- PWA: **favicon sazonal agora**; ícone já instalado no launcher continua best-effort e não é requisito funcional.

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

`prefers-reduced-motion` e a preferência de perfil `reduceMotion` sempre prevalecem: nesse caso a intro animada não é exibida e a decoração permanece estática.

Se `seasonalDetailsEnabled` estiver desativado, nenhuma decoração, intro ou favicon sazonal é aplicada.

## Superfícies

- Login: presença um pouco maior, sempre atrás da interação.
- Meu dia: principal superfície autenticada.
- Calendário: detalhe no cabeçalho e marcador discreto da data atual durante o período ativo.
- Demais páginas: apenas detalhe global mínimo.

## Privacidade e performance

- nenhum analytics;
- nenhuma localização remota;
- nenhuma API externa de feriados;
- nenhum dado pessoal novo;
- intro vista fica somente no aparelho em `leve.seasonal.seen.<eventId>.<periodId>`;
- preferência de exibição fica no perfil e participa da exportação;
- número pequeno e fixo de elementos decorativos;
- sem `requestAnimationFrame` permanente.

## Gate de conclusão

A fase só pode ser integrada depois de unitários, lint, typecheck, build, integração relevante e Playwright sazonal passarem, incluindo modo desligado, reduced motion, claro/escuro, desktop/mobile e ausência de overflow/Axe crítico.
