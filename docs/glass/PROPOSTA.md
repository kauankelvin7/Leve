# Inventário e decisão de superfícies

Base: M9 congelado `b0e7bae753ec93374a3ebe3ec2b1a5ac07298046`. Fonte visual: rotas reais, CSS existente e componentes atuais; manifesto aprovado por estas regras autorizadas, sem etapa humana intermediária. Não existe material liquid-glass.zip/HARNESS.md/PROMPT.md montado; harness equivalente nativo, sem dependência nova.

| Componente | Path em apps/web/src | Rota | Tipo/background atrás | Superfície atual | Glass/variant | Motivo | Risco produto/performance/a11y |
|---|---|---|---|---|---|---|---|
| Sidebar desktop/rail | app/App.tsx;styles/editorial.css | Privadas | Sticky, canvas claro | Ink opaco | Não | Blur não agrega sob fundo opaco; manter paletas/contraste | Baixo/evitar área alta/branco sobre ink |
| Bottom nav mobile | app/App.tsx | Privadas | Fixed sobre conteúdo | Translúcida,blur32 legado | Sim/glass | Navegação flutuante real,blur limitado | Baixo/pequena/safe-area e AA |
| Workspace/header | app/App.tsx | Privadas | Fluxo sobre canvas | Transparente | Não | Sem elevação/background que justifique blur | Baixo/zero/hierarquia existente |
| Auth entry | features/identity/Login.tsx | Entrar/registrar/recuperar | Card sobre ambientação | 94%claro,blur34 | Sim/strong | Superfície elevada existente; tokens semânticos e fallback | Baixo/média/texto e campos opacos |
| Gika panel | features/gika/GikaPanel.tsx | Privadas | Dialog sobre agenda | 97%solid,blur16+backdrop2 | Sim/strong desktop;solid mobile | Uma superfície externa, sem blur interno | Nenhum contrato/área limitada/AA+reduced |
| Gika launcher | features/gika/GikaLauncher.tsx | Privadas | Fixed sobre agenda | 94%solid,blur12 | Sim/pressable | Pequena entrada flutuante | Nenhum contrato/pequena/alvo44+nav/timer |
| Gika composer | features/gika/gika.css | Dialog | Dentro do panel | Solid | Não | Leitura/entrada; evitar nested blur | Nenhum/zero/foco preservado |
| Gika confirmation/batch/recurrence cards | features/gika | Dialog | Dentro do panel | Solid | Não | Preview verificável e legível, nenhum nested blur | Contratos intocados/zero/ações claras |
| ConfirmDialog | components/ui/ConfirmDialog.tsx | Notas/compras/lixeira/etc | Native dialog | Solid,backdropblur4 | Sim/strong | Elevação única; scrim sem segundo blur | Handler intacto/limitada/AA+foco |
| RecurrenceScopeDialog | features/activities/calendar | Calendário | Native dialog | Solid,backdropblur3 | Sim/strong | Mesmo primitivo, escopo funcional intocado | Handler intacto/limitada/sem misturar scopes |
| Calendar mobile sheet | features/activities/Calendar.tsx | Calendário mês | Bottom sheet sobre grid | Translúcida | Sim/strong somente aberto/mobile | Overlay concreto com fundo visual | Handler intacto/limitada/rolagem+safe area |
| Calendar outer shell | features/activities/calendar | Calendário | Grande superfície | Paper | Não | Densidade/performance predominam | Baixo/evitar blur grande/AA |
| Calendar cells/events/timegrid | features/activities/calendar | Calendário | Grade densa | Semântico sólido | Não | Cor informa estado; nenhum blur por célula | Nenhum/zero/estados legíveis |
| Calendar toolbar | features/activities/calendar | Calendário | Dentro do shell | Paper | Não | Fundo chapado, sem benefício de blur | Nenhum/zero/controles intactos |
| Activity cards/forms/detail | features/activities | Hoje/atividade | Lista/inputs | Paper/fields | Não | Densidade e edição | Nenhum/zero/revision/foco intactos |
| Today overview/aside/empty | features/activities/Today.tsx | Hoje | Fluxo sobre canvas | Ink/paper/accent | Não | Identidade/hierarquia aprovada | Nenhum/zero/AA atual |
| Active timer dock | features/activities/ActiveTimerBar.tsx | Privadas | Fixed portal | Glass,blur24 | Sim/glass | Já flutuante, centralizar/fallback completo | Timer intacto/pequena/portal preferences |
| Notes cards | features/notes | Notas | Conteúdo colorido | Presets próprios | Não | Identidades light/dark dos presets | Nenhum/zero/contraste semântico |
| Notes editor/long text | features/notes | Notas/detalhe | Leitura/edição | Solid | Não | Texto longo não necessita vidro | Nenhum/zero/foco e leitura |
| Shopping overview | features/shopping | Compras | Cabeçalho ink | Opaco com blur18 redundante | Não/remover blur | Custo sem efeito visual | Nenhum/redução/AA preservado |
| Shopping cards/dense items | features/shopping | Compras/detalhe | Lista/forms | Solid | Não | Clareza de itens | Nenhum/zero/checks legíveis |
| Settings section nav | features/settings/Settings.tsx | Configurações | Sticky sobre fundo chapado | Opaco com blur18 | Não/remover blur | Sem benefício factual | Nenhum/redução/teclado |
| Settings forms/danger | features/settings | Configurações | Forms/ações sensíveis | Fields/solid | Não | Legibilidade e risco exigem estabilidade | Nenhum/zero/AA+disabled |
| Search/results | features/content/Search.tsx | Buscar | Campo/lista | Solid | Não | Resultados densos | Nenhum/zero/teclado |
| Trash/review lists | features/trash/Trash.tsx;features/activities/Review.tsx | Lixeira/revisão | Lista | Solid | Não | Estados/destruição explícitos | Nenhum/zero/ações claras |
| Buttons/floating controls | components/ui;features | Todas | Controles | Semânticos atuais | Apenas launcher/pressable | Não glassificar cada botão | Nenhum/pequena/alvos44 |
| Popovers | Router/componentes | — | Não localizado | — | Não criar | YAGNI | Zero |
| Toast/notification/tutorial | components;features | Privadas | Portal/feedback | Solid | Não | Não aumentar efeitos/lifecycle | Nenhum/zero/status/alert |
| Outbox/session/status banners | components;platform | Privadas | Estado crítico | Solid | Não | Não alterar contratos/feedback | Nenhum/zero/offline/Auth |
| Privacy/long text | features/identity | Privacidade | Leitura longa | Paper | Não | Vidro não acrescenta informação | Nenhum/zero/leitura |

Manifesto contém8superfícies, com escopo explícito. Nenhuma nova superfície é aprovada por existir uma classe `.panel`. Remover/substituir filtros históricos redundantes antes de empilhar overrides. Classes/tokens exclusivamente visuais; nenhuma regra de domínio/persistência muda.
