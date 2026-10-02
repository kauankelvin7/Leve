# Responsive Shell V2 — integração seletiva

2026-10-02. Branch isolada: `feat/gika-responsive-integration`.
Base aprovada: `696e0e5b32596784b09cd5f7f9fccb195afb24d6`.
Fonte: `25ed3817bec867f7818a6a317796d8582157c030`, sem merge da branch antiga.

## Alterações

- Shell até 2240px; removidos limites redundantes de 1560/1120px e de 1040px em Today, calendário e notas. Formulários mantêm seus limites de leitura.
- Rail de 740–959px; sidebar ampla com scroll próprio e perfil no rodapé. Avatar e ícones permanecem visíveis. No calendário, reserva de 64px evita colisão com o launcher existente.
- Today em telas largas usa coluna principal flexível e aside de 320–380px.
- Contrastes históricos de horários, legendas e dias adjacentes reforçados no componente de origem. Seleção e indicadores do calendário consomem o foreground semântico; badge concluído e legenda do perfil também corrigidos. Entrada mantém movimento, sem fade que reduz contraste.
- Demo reutiliza labels acessíveis e estrutura de navegação do shell real. Nenhuma copy funcional da Gika mudou.

Mantidos: bottom navigation, safe areas, modal/composer da Gika, proteção do timer, loading e reduced motion existentes. Descartados: camada adicional de 547 linhas de overrides, mobile/rail duplicados, tokens especulativos de sidecar, decoração extra de loading, config e workflow exclusivos da branch antiga. Sem dependências, writer, Rules, policy, command, receipts, recurrence ou batch alterados.

## Verificação

Inspeção real em Chromium: 390×844, 853×1280, 1024×768, 1366×768, 1920×1080 e 2560×1440, light/dark. 24 amostras da agenda autenticada/Gika sem overflow ou sobreposição do launcher com navegação. Reflow de zoom 200% emulado por metade do viewport CSS; teste existente também verifica fonte a 200%, teclado, reduced motion, modo sólido e contraste das 11 paletas. Loading 390/1920 manteve bounds antes/depois das fontes, sem overflow ou animação em reduced motion. Não foi medido um escore global de CLS.

Gates finais: audit produção **0 critical / 0 high / 0 moderate**; lint; ambos typechecks; build; **480/480 unit**, **243/243 integração**, **17/17 shell/responsive** e **76/76 Gika** PASS. Axe AA: cinco destinos da demo em light/dark + diálogo; 12 scans autenticados de Today/calendário/notas sem violações; painel Gika validado pela suíte existente. Viewports adicionados ao teste existente protegem largura útil; asserção do avatar protege o bug observado no rail. Nenhuma deadline, retry ou asserção foi relaxada.

Primeiras execuções preservadas: shell original 13/13; shell ampliado 16/17 por fade de contraste 4,38:1, depois 16/17 por seleção mensal dark branca (1,86:1); finais 17/17. Typecheck da matriz nova falhou por inferência de array, corrigida com tuple `as const`. Axe autenticado revelou badge 4,42:1 e contador selecionado 1,17:1, ambos corrigidos na origem. Primeira ampla Gika **75/76**, regressão responsiva concreta: sidebar alta colidia com launcher no calendário; focal limpo após correção **1/1**, ampla final limpa **76/76** (12,1min). Não classificados como baseline.

Ponytail oficial 4.10.0 instalado pelo plugin Codex; Caveman oficial instalado globalmente por `skills add`, somente a skill de comunicação. Manifests/skills/entrypoints relevantes inspecionados, owners confirmados. Regras full aplicadas manualmente nesta thread; nada dessas extensões foi copiado ao Leve.

[Desktop](evidence/responsive-integration-desktop.png) · [Tablet/rail](evidence/responsive-integration-tablet.png). Dados sintéticos/emuladores; sem Gemini live. M5_READY_FOR_NEXT_PHASE preservado; M6 todo. Aguardar revisão da integração; roadmap volta diretamente a M6, sem nova fase.
