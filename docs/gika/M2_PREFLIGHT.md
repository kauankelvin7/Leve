# M2-S0 — classificação definitiva antes do adapter

M1 visual aprovado pelo usuário. Base f6b21b6695f4953e28daace00edb05b2dd4bfde1, branch antes da correção d8ee3f0716df0e89d471f4aba0eb53ff676453d7. Comparação usa git archive local da base, Vite 5175 versus branch 5174, Auth/Firestore demo-leve e dados fictícios; API era idêntica à base neste momento. Nenhum modelo foi ligado antes deste gate.

| Falha | Classificação | Prova e estado |
|---|---|---|
| Contraste de item concluído | Baseline/preexistente | Reproduzido na base sem Gika, sequência dia inteiro + planner cria: calendar-time-chip.completed 4,28:1, mínimo 4,5:1. Arquivo CSS e Planner idênticos à base. Pendente fora do escopo. |
| Dois testes de recorrência | Baseline do harness | Os testes originais tentam Frequência em Mais opções fechado. m1-baseline-recurrence.json comprova campo invisível na base e visível após abrir disclosure. Helpers/Today idênticos à base. Não é regressão da Gika; pendente manutenção do harness. |
| Offline intermitente | **Regressão M1 da Gika, corrigida** | O launcher cobria o handle de arrastar quando o Planner era deslocado pelo item de dia inteiro. elementFromPoint devolve gika-launcher na branch e calendar-time-move-handle na base com a mesma conta/dados. Ver m2-planner-hit-test.json. Não é falha nova da outbox. |

O offline parecia intermitente porque o cenário isolado sem o item de dia inteiro posicionava o handle fora do launcher. A causa agora está demonstrada; a classificação preliminar de M1 foi substituída, sem ambiguidade.

## Correção e gates

Somente GikaLauncher/gika.css: no calendário desktop o acesso flutuante fica no espaço abaixo da navegação lateral, fora do grid; demais rotas e mobile mantêm o dock. O observer é atualizado por pathname. Não há alteração no Planner, regras de negócio, comandos, outbox ou persistência.

- Antes: sequência original “compromisso de dia inteiro|alteração offline” na branch, 1 PASS/1 FAIL em 33,2 s (ausência do feedback offline).
- Base sem Gika: o offline passou nas duas execuções focais e na sequência com dia inteiro anterior (M1_EVIDENCE.md). Hit-test sob mesmos dados confirmou qual elemento recebe o clique.
- Depois: mesma sequência/mesmo helper original na branch, **2 PASS em 22,5 s**.
- E2E Gika foco/mobile + nova proteção dock fora de sidebar/grid em 1440/1366/1024: **3 PASS em 20,6 s**, com Axe nos cenários originais.
- lint, build/dois typechecks e 102 unitários: PASS. git diff --check: PASS.

O gate M2-S0 está fechado: contraste e recorrência são baseline; offline era regressão Gika corrigida e protegida. Nenhuma falha permanece com classificação indeterminada. Não se declara a suite global integralmente verde por causa dos problemas baseline documentados. M2-T1 pode iniciar estritamente read-only, sem mutações antecipadas.
