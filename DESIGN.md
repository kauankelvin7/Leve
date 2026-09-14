# Leve — direção do frontend

## Referências e propósito

Agenda pessoal, calendário, notas e compras para uso cotidiano. A referência visual consultada é https://leve-agenda-gih.kauankelvin20.chatgpt.site/ (Meu dia, Calendário, Minhas notas e Compras). Reaproveitar princípios de hierarquia e espaçamento, sem copiar textos motivacionais, identidade ou dados de exemplo.

Open Design: https://github.com/nexu-io/open-design. Instaladas as skills `frontend-design`, `impeccable-design-polish` e a entrada de catálogo `design-review` em `C:/Users/kelvi/.codex/skills`. As duas primeiras orientam implementação e acabamento. `design-review` é apenas um apontador para gstack; o workflow completo desse terceiro não foi instalado. Não há daemon, conta paga ou dependência Open Design no runtime do Leve.

## Cor

Preservar as quatro paletas do perfil. Seleção, hover, foco, controles, navegação desktop/móvel e progresso usam `--color-action-primary` e cores derivadas por `color-mix`. Nunca fixar verde em um estado de navegação. Cores de categorias e do papel são independentes da paleta da interface. Estados possuem nome e semântica além da cor.

## Tipografia

DM Sans para interface e leitura; Instrument Serif para títulos, marca e notas. Hierarquia com títulos expressivos, descrições curtas e metadados discretos, mas com contraste AA. Datas civis usam Temporal e o fuso do perfil.

## Layout

Vidro & Papel: fundo pastel, superfícies claras, vidro somente na estrutura, notas como papel. Cabeçalho contextual, conteúdo alinhado e espaço entre grupos. Abaixo de 740px, navegação inferior com cinco destinos e ações de busca/perfil no topo. Calendário mensal usa sete colunas; no celular, contadores substituem prévias de texto e a agenda do dia mantém a leitura completa.

## Componentes e comportamento

- Calendário: navegação de mês, Hoje, filtro de categoria, seleção de dia, link para detalhe e criação com a data selecionada. Carregamento, erro e limite de consulta são explícitos.
- Notas: fixadas primeiro, depois atualização mais recente; cor de papel, corpo legível e ações persistentes. Preservar autosave e conflitos.
- Compras: quantidade pendente e progresso com elemento `progress`; zero itens tem estado vazio. Modelos continuam separados das listas.
- Formulários e botões: foco visível, alvos de toque, disabled identificável e hierarquia estável. Movimentos reduzidos e modo sólido permanecem disponíveis.

## Prova

`tests/e2e-local/design.spec.ts` cobre persistência das quatro paletas, calendário e sete páginas em 1440px/390px com Axe e ausência de transbordamento. A suíte `persistent.spec.ts` preserva a prova dos fluxos reais nos emuladores.
