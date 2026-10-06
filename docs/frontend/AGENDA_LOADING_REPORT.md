# Abertura da agenda — 06/10/2026

## Pedido e composição

Aprimorar a tela “Preparando sua agenda…” a partir da `main`
`3e9cd3d299b5b90f73d0ee797cf21c218c898f21`, na branch
`refine/agenda-loading-screen`.

- Marca compacta e mensagem com hierarquia própria.
- Ilustração original em SVG: agenda com encadernação, calendário, marcador e
  papéis sobrepostos; nenhuma imagem remota ou dependência adicional.
- Movimento discreto na folha e no dia destacado, com indicador indeterminado.
- Texto: “Só um instante. Estamos abrindo seu espaço.”
- Superfícies opacas e cores derivadas da aparência já salva, incluindo escuro.

## Responsabilidade e acessibilidade

`LoadingState` encaminha a variante `screen` para `AgendaLoadingScreen`.
Os demais esqueletos continuam no componente existente, dentro do shell.
Os estilos da nova abertura ficam em CSS Module. A mensagem redefine localmente
o fundo e o padding da regra global de status, evitando um cartão acidental.
Os estilos globais da antiga marca e variante de tela foram removidos.

A abertura não consulta dados, cria temporizadores de estado nem impõe duração
mínima. A autenticação e a chegada da sessão determinam quando ela desaparece.
O indicador não expõe percentual ou etapas que o aplicativo não mede.

Há um landmark `main` nomeado pelo título e uma única região de status com
anúncio educado e atômico. SVG e indicador são decorativos. A tela respeita
`prefers-reduced-motion`, contraste maior, cores forçadas, safe areas e texto
ampliado. A preferência remota do perfil ainda não está disponível durante a
abertura inicial; a redução de movimento aqui segue o sistema.

## Provas executadas

- `npm run lint`: PASS, incluindo limites de arquitetura.
- `npm run build`: PASS, incluindo TypeScript do cliente e servidor.
- `agenda-loading.spec.ts`: 2/2 PASS após revisão das referências.
- Comparação final sem atualizar snapshots: 8/8 PASS, incluindo abertura,
  navegação móvel, compras/notas, recursos indisponíveis, páginas públicas e
  launcher. Referências e tolerâncias das suítes anteriores preservadas.
- Revisão independente de código e dos três snapshots: sem impedimentos.
- Repetição focal após padronizar a rasterização: 2/2 PASS, com as mesmas
  referências e limites; revisão complementar sem impedimentos.
- 11 paletas × claro/escuro × 320/390/1366 px: 66 composições sem transbordamento.
- Axe sem violações nas 22 combinações de paleta/aparência e nos cenários de
  texto a 200%, contraste maior e cores forçadas.
- Animações presentes normalmente e ausentes em movimento reduzido.
- Retorno ao Meu dia após liberar a resposta real da sessão em cada combinação.
- Rota de Notas carregada com o módulo retido: navegação e cabeçalho continuam
  visíveis; o título recebe foco depois do carregamento.

As capturas foram inspecionadas em claro e escuro e geradas com o Chromium 153
do Playwright 1.63.0, correspondente ao lockfile e ao CI. A suíte entra no gate
de navegador existente. A data é fixada em 05/10/2026 para que a ambientação
sazonal opcional não altere as referências em outros meses. As referências ficam em
`tests/e2e-local/agenda-loading.spec.ts-snapshots`:

- `agenda-opening-green-light-390-linux.png`;
- `agenda-opening-orange-dark-390-linux.png`;
- `agenda-opening-purple-light-1366-linux.png`.

O primeiro CI detectou um pixel no contorno da letra “u”: a imagem do Ubuntu
usava antialiasing LCD colorido, enquanto a referência local usava tons de cinza.
Os artefatos foram baixados e comparados; a geometria e a ilustração eram idênticas.
A suíte da abertura usa `--disable-lcd-text` para rasterização consistente,
preservando o navegador configurado. Nenhum limite de diferença, máscara ou estilo
da página foi alterado para essa correção.

Comando de comparação, sem atualizar referências:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/leve-playwright-browsers LEVE_CHROMIUM_EXECUTABLE= \
  npm run test:e2e:local -- agenda-loading.spec.ts mobile-refinement.spec.ts \
  public-pages.spec.ts gika-launcher.spec.ts \
  --output=test-results/agenda-loading-final
```

Durante a primeira execução, uma expectativa de fallback na navegação pelo
cliente falhou: React manteve o Meu dia visível enquanto a nova rota aguardava.
A prova do fallback foi ajustada para a abertura direta de Notas, que realmente
aciona esse estado. A implementação de navegação permaneceu intacta.

## Envio

PR #20 aberto: https://github.com/kauankelvin7/Leve/pull/20.
A correção de rasterização e data foi validada e salva em commit local. Houve uma
interrupção de acesso durante seu push, confirmada por HTTP 401 / Bad credentials.
A autenticação foi restabelecida e confirmada pela API GitHub às 13:16 UTC.
O envio é retomado para aprovação dos checks do HEAD final e integração à main
conforme autorização vigente. Histórico em `CONTINUAR.md`.
