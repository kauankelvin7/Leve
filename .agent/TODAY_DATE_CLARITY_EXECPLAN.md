# Clareza do dia consultado

## Objetivo e contexto
Entrada main dedf0d7. Usuário esclareceu que havia clicado em dia8: quinta-feira
estava correta. Problema de clareza, sem alteração do cálculo de datas.
Após prévia local, usuário aprovou manter Hoje no calendário e retirar botão
redundante do resumo. Resumo informa Hoje/Amanhã/Dia selecionado.

## Contratos e não objetivos
Preservar selectedDay, sessionStorage, navegação e fuso do perfil. Temporal.PlainDate
compara datas civis: amanhã = hoje+1dia. Nada de converter data em UTC na UI.
Sem API/Rules/outbox/dados alterados. Sem novo botão para voltar no resumo.

## Passos e ownership
Root: TodayOverview.tsx, CSS local, teste focal, referências visuais e CI.
Contexto acima do contador; layout mobile compacto sem ocultar ações pela navbar.

## Gates
Lint/boundaries/typechecks/build; Playwright com conta fictícia/emuladores,
clock UTCdia8/SPdia7, seleção/retorno/reload/Axe focal, viewports e reflow.
Comparações visuais atualizadas somente para a mudança intencional e revisadas;
não enfraquecer limites geométricos ou tolerâncias para aprovar.

## Rollback
Reverter commit próprio, sem migração ou mudança de dados.

## Evidências
Prévia de dois botões foi descartada após avaliação do usuário.
Primeira ampla: novo focal PASS e3 provas visuais PASS;2 falhas no shell snapshot e
geometria mobile após adicionar linha. Redução do espaço do resumo corrigida no
módulo CSS, sem mudar asserções. Referências novas intencionais revisadas: shell-footer desktop e Today390/1366.
Segundo ajuste mobile preserva limites originais; não foram enfraquecidos.
CI da entrada dedf0d7: Planner success;CI failure na etapa Responsive navigation,
conteúdo e public pages. Log-failed da API vazio; não inferir motivo além da etapa.

## Estado de retomada
Gates finais concluídos: lint/boundaries/typechecks/build/diff-check PASS;
Playwright focal3 PASS59.2s sem --update-snapshots: novo teste, sidebar/footer,
Meu dia com320/390/1024/1366, texto200%, Axe e tarefas acima da navbar.
Três outras provas visuais (Gika/paletas/calendário) passaram na primeira ampla;
não confundir com aprovação de toda suíte no estado final.
Estado/documentação atualizados; commit/push main autorizado pela aprovação.
Próximo passo: conferir CI/Planner do novo HEAD. Gemini/push real fora do escopo.
