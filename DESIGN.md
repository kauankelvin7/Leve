# Leve — direção do frontend

## Revisão editorial de 15/09/2026

Pedido vigente: mudar de forma perceptível a aparência dos componentes. A direção agora distingue navegação em tinta escura, superfícies de papel e áreas de trabalho. `editorial.css` concentra essa camada compartilhada. As quatro paletas continuam determinando o acento e o fundo da navegação.

Nunito e DM Sans continuam em toda a interface, inclusive títulos e números. Os painéis têm bordas definidas e pouca sombra. Botões primários ganham base de pressão; os secundários ficam planos. Notas têm borda de caderno e compras usam progresso fino com porcentagens legíveis. Meu dia tem uma data em destaque e acesso direto à Revisão. No celular a composição se comprime sem esconder os acessos. Movimento é curto e respeita a preferência do sistema.

O carregamento das rotas fica dentro do shell para conservar navegação, guia e cronômetro durante a troca de páginas. Nenhuma nova biblioteca de animação foi adicionada.

## Refinamento de 06/10/2026

Cabeçalhos e resumos ocupam menos altura. Compras e Notas mostram o conteúdo salvo
antes do formulário; criar ou editar leva o foco ao campo correspondente, mantendo
o editor e os rascunhos existentes. O resumo de Compras tem três colunas também no
celular, com quebra de contadores e rótulos em texto ampliado.

O cabeçalho móvel reúne marca, busca, Mais, criação de atividade e perfil. A barra
inferior mostra o nome dos cinco destinos. Mais usa linhas completas com ícone,
nome e seta; fecha por Escape, toque fora e mudança de página. Suas regras de layout
ficam no módulo da navegação, sem herdar a grade móvel da sidebar.

Revisão usa métricas compactas; Busca usa uma lista contínua; Preferências mantém
todos os atalhos visíveis; Lixeira permite títulos longos. Privacidade e Termos
aproveitam a largura disponível, e recursos indisponíveis oferecem retorno dentro
do shell. Escopo, arquitetura e evidências em
`docs/frontend/MOBILE_REFINEMENT_REPORT.md`.

## Abertura da agenda — 06/10/2026

O carregamento inicial tem uma composição própria: marca compacta, agenda de
papel ilustrada em SVG, folhas sobrepostas, mensagem em destaque e indicador
indeterminado. Cores derivam dos tokens da aparência já salva no aparelho.
O movimento limita-se à folha, ao contorno de um dia e ao indicador; a preferência
do sistema por movimento reduzido deixa tudo estático.

A ilustração é decorativa. A mensagem usa uma única região de status e permanece
legível com texto ampliado, contraste maior e cores forçadas. A tela tem superfícies
opacas e respeita safe areas. Não há percentual, etapas fictícias ou tempo mínimo
de exibição. A composição vive em `AgendaLoadingScreen` e seu módulo CSS; a variante
`screen` de `LoadingState` a seleciona.

Evidências e comando de revisão em `docs/frontend/AGENDA_LOADING_REPORT.md`.

## Hierarquia, navegação e Gika — 06/10/2026

Meu dia coloca as tarefas antes do resumo em áudio. Data e contagem usam uma
faixa compacta; a semana preserva seus controles sem repetir o resumo. No desktop,
o mês, a nota fixada e as compras usam uma coluna de apoio. Em telas menores,
o mês começa recolhido. Filtros e transcrição do áudio podem ser expandidos.

A sidebar usa a mesma coluna de ícone/retrato e texto para os cinco destinos.
O perfil é tonal e a seleção fica reservada à página atual. O atalho de criação
superior tem tratamento secundário; Mais sinaliza abertura e página secundária.
Os nomes na barra inferior têm mais espaço e permanecem legíveis em 320 px.
No desktop, o painel lateral tem altura dos seus conteúdos, largura limitada a
224 px e posição sticky. O perfil fica junto à navegação, com rolagem interna em
janelas baixas. O footer usa divisória, marca pequena e links legais agrupados;
no celular, ocupa duas linhas e respeita a altura da navegação com texto ampliado.

A semana mantém as datas inteiras a 200% e rola dentro do painel quando necessário.
No calendário móvel, a agenda do dia usa dialog nativo, com fundo inativo,
fechamento por Escape e restauração do foco ao dia selecionado. No desktop,
o mesmo conteúdo continua como seção da página.

Controles comuns possuem uma única definição de raio e resposta ao toque, com
ações primárias, secundárias e links. Sombras decorativas concorrentes foram
retiradas. Ações das tarefas preservam pelo menos 44 px. Contraste maior usa
tokens da aparência atual, incluindo escuro, sem fixar verde.

A Gika tem acolhimento central, perguntas com leitura alinhada à esquerda e
composer com envio reconhecível. Resultados usam divisórias e metadados em linha
própria; execução confirmada usa classe semântica explícita. Erro e offline têm
título e orientação. Reflow prioriza leitura e controles, com rolagem quando
necessária. Personagem, voz, comandos e confirmações mantêm seus contratos.

Layout de cada área fica no seu módulo; o runtime do tema possui os tokens
derivados. Evidências em `docs/frontend/VISUAL_POLISH_REPORT.md`.

## Referências e propósito

Agenda pessoal, calendário, notas e compras para uso cotidiano. A referência visual consultada é https://leve-agenda-gih.kauankelvin20.chatgpt.site/ (Meu dia, Calendário, Minhas notas e Compras). Reaproveitar princípios de hierarquia e espaçamento, sem copiar textos motivacionais, identidade ou dados de exemplo.

Open Design: https://github.com/nexu-io/open-design. Instaladas as skills `frontend-design`, `impeccable-design-polish` e a entrada de catálogo `design-review` em `C:/Users/kelvi/.codex/skills`. As duas primeiras orientam implementação e acabamento. `design-review` é apenas um apontador para gstack; o workflow completo desse terceiro não foi instalado. Não há daemon, conta paga ou dependência Open Design no runtime do Leve.

## Cor

Preservar as onze paletas atuais do perfil. Seleção, hover, foco, controles, navegação desktop/móvel e progresso usam `--color-action-primary` e cores derivadas por `color-mix`. Nunca fixar verde em um estado de navegação. Cores de categorias e do papel são independentes da paleta da interface. Estados possuem nome e semântica além da cor.

## Tipografia

Nunito e DM Sans em toda a interface, inclusive títulos, marca e notas. A hierarquia usa peso, escala e espaçamento, com contraste AA. Datas civis usam Temporal e o fuso do perfil.

## Layout

Vidro & Papel: fundo pastel, superfícies claras, vidro somente na estrutura, notas como papel. Cabeçalho contextual, conteúdo alinhado e espaço entre grupos. Abaixo de 740px, navegação inferior com cinco destinos e ações de busca/perfil no topo. Calendário mensal usa sete colunas; no celular, contadores substituem prévias de texto e a agenda do dia mantém a leitura completa.

Refinamento de 14/09/2026: superfícies translúcidas com blur e saturação, bordas luminosas, sombras suaves e respostas discretas ao toque, inspiradas em interfaces de iPhone. A camada compartilhada `glass.css` mantém consistência entre agenda, calendário, notas, compras, busca, lixeira e preferências. O modo sólido, a preferência de transparência reduzida do sistema e o fallback sem backdrop-filter usam superfícies opacas. Movimento reduzido desativa as transições acrescentadas.

Preferências têm atalhos por seção, grupos adaptáveis, avatar com inicial, opções de paleta e controles refinados. Exclusão permanente fica recolhida, preservando confirmação e reautenticação. As skills frontend-design e impeccable-design-polish orientaram a hierarquia, o acabamento e a revisão; nenhuma dependência visual nova foi adicionada.

## Componentes e comportamento

- Calendário: navegação de mês, Hoje, filtro de categoria, seleção de dia, link para detalhe e criação com a data selecionada. Carregamento, erro e limite de consulta são explícitos.
- Notas: fixadas primeiro, depois atualização mais recente; cor de papel, corpo legível e ações persistentes. Preservar autosave e conflitos.
- Compras: quantidade pendente e progresso com elemento `progress`; zero itens tem estado vazio. Modelos continuam separados das listas.
- Formulários e botões: foco visível, alvos de toque, disabled identificável e hierarquia estável. Movimentos reduzidos e modo sólido permanecem disponíveis.

## Prova

`tests/e2e-local/design.spec.ts` cobre persistência das quatro paletas, calendário e sete páginas em 1440px/390px com Axe e ausência de transbordamento. A suíte `persistent.spec.ts` preserva a prova dos fluxos reais nos emuladores.
