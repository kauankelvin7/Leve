# M3-T1 — create_task pelo comando existente

## PRE, contrato e limite da entrega

2026-10-01, branch feat/gika-integration, HEAD92cc9c74f5d865265ebe80a100386f992c97d20d e worktree limpo antes de editar. Fontes de verdade/skill oficial relidas; auditoria e necessidade da base mínima de IDs registradas antes do código em M3_T1_EXECPLAN.md. Today.save → sendCommand → POST/api/commands → contentCommand/activity.create continua sendo a única escrita. Handler, schemas Activity, Rules, outbox e regras originais não foram modificados. platform/api.ts ganhou somente guard UID/signal opcionais; callers convencionais mantêm defaults, cobertos por teste real do módulo.

create_task tipada/strict (inclusive parametersJsonSchema additionalProperties:false), título/data/horário normalizados contra o pedido original e contexto civil do perfil. Modelo não escolhe UID/timezone/IDs/defaults/revisão. Falta de título, título isolado ou data ambígua pedem esclarecimento. Datas impossíveis/horário DST inválido usam os schemas existentes do domínio. Somente uma task simples por pedido; outras mutações/recorrência/batch/voz/proatividade ausentes. Descriptor não é sucesso. UI recebe createdTask com título/data/id/revisão/resultado somente depois do receipt validado do comando real.

Nova autorização após espera do modelo; UID/signal antes do envio e depois da espera de getIdToken; /commands verifica token e a transação existente revalida perfil/membership/controles. Nenhuma escrita em validação/policy inválida. Falha de comando/receipt incorreto não confirma criação. Mesmo envelope pendente como Today evita gerar IDs novos na tentativa manual; apenas base mínima documentada, sem concluir M3-T2. Não enfileirar ações Gika nem chamar queued de applied. Cancelamento após dispatch pode deixar resultado incerto; não significa rollback. M3-T2/T3 todo e sem autorização nesta entrega.

## Gates executados

| Comando/prova | Resultado |
|---|---|
| npm run lint | PASS, sem warnings |
| npm run typecheck | PASS, cliente e servidor |
| npm run build (final) | PASS; warning de bundle >500kB preexistente |
| npm test (final) | PASS, 175 testes/33 arquivos |
| FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 FIRESTORE_EMULATOR_HOST=localhost:8080 npm run test:integration:inside | PASS, 53 testes/4 arquivos; 25 Gika, incluindo 11 novos de criação; 28 demais |
| LEVE_LOCAL_URL=http://localhost:5174 npm run test:e2e:local -- --output=/tmp/leve-m3-all-e2e | 56 executados, 44 PASS/12 FAIL; classificação abaixo; nenhum skipped |
| E2E Gika dentro da suíte completa | PASS, 5 criação +6 leitura real/fallback +14 mock; desktop/mobile/dark/Axe, isolamento e reload |
| Planner visual, offline/conflito e sazonal na suíte completa | 5 visual +4 Planner convencionais +7 sazonal PASS; offline original e dock preservados |
| NODE_OPTIONS=--dns-result-order=ipv4first npm run check | Build/dois typechecks e 172 unit PASS naquele momento; shell12 PASS/1 FAIL baseline; código final depois validado novamente por 175 unit/lint/build |
| agent-browser após reiniciar dev | PASS: página de acesso com conteúdo/controles, sem overlay/erros; React checklist e humanizer-br aplicados |

Emuladores existentes reutilizados; processos que alteram a base executados sequencialmente. Não houve chave fictícia Gemini, chamada live Gemini, billing, SDK/dependência nova, push ou deploy. MetadataLookupWarning403 do Admin SDK não impediu nenhum teste emulado. DNS ipv4first foi usado somente no processo do check, pois o preview localhost precisa corresponder ao gate127.0.0.1; nenhuma mudança de host/proxy em produção.

## Regressão ampliada: resultados sem mascaramento

As três falhas Planner permanecem baseline já demonstrado em M2_PREFLIGHT.md/M1_EVIDENCE.md: completed4,28:1 versus4,5:1 e dois testes de frequência sem abrir Mais opções. Offline não é baseline: foi regressão do dock M1 corrigida em M2-S0 e agora passou novamente. Nenhuma intermitência Gika observada.

O check shell falhou em color-contrast da demo Compras (eyebrow4,06:1). Cópia isolada por git archive92cc9c7, build próprio, dependências locais e execução do mesmo shell.spec com --grep 'acessibilidade automatizada' também falhou em color-contrast (demo Hoje,4,38:1). Demo e todas as folhas CSS envolvidas são idênticas à base. Scan comparativo no mesmo modo dev/reducedMotion não encontrou violações em demo Compras em nenhuma versão: evidência de comportamento de inicialização/timing do gate baseline, sem atribuir a Gika ou afirmar gate verde. Ver evidence/m3-baseline-checks.json e m3-baseline-files.json.

A suíte completa adicionalmente revelou harness antigo em design/persistent/refinements/session: tutorial já concluído por testes anteriores, seletores não específicos (Criar conta, Meu dia, navegação Notas), .calendar-agenda assumida apesar do desktop iniciar em Semana, labels antigos de tutorial/backup e contraste em reflow. Os mesmos arquivos/código de UI convencional não foram alterados. Comparação executável da cópia92cc9c7 registrada no fechamento abaixo; não corrigir essas áreas fora do escopo nem desabilitar testes.

Fechamento da comparação: executar os nove casos adicionais na cópia isolada92cc9c7, com Vite próprio5177/VITE_USE_EMULATORS e emuladores já preparados, sem novo globalSetup ou concorrência de escritores. 9 executados/9 FAIL com as mesmas causas; baseline frontend original, command/domain backend idêntico à base, sem chamadas Gika. evidence/m3-legacy-baseline-comparison.json registra nome/categoria por versão. Casos:

| Teste original | Causa reproduzida na base |
|---|---|
| design.spec: paletas/navegação | exige Pular guia quando perfil já concluiu tutorial em testes anteriores; count0 em ambas versões |
| persistent.spec: cadastro | Criar conta não exact seleciona dois botões (e-mail/Google) |
| persistent.spec: login/atividade | .calendar-agenda só existe em Mês; desktop começa em Semana |
| persistent.spec: dia inteiro | link Meu dia global seleciona sidebar e voltar do detalhe |
| persistent.spec: conflito de nota | link Notas em navigation não específico seleciona Principal e Acessos rápidos |
| persistent.spec: reflow | color-contrast convencional em dados completados; mesmo código/estilos |
| persistent.spec: export/import | espera download e tenta label antigo Baixar uma cópia; UI usa Baixar backup, não dispara download |
| refinements.spec | label antigo Tutorial do Leve não identifica o guia atual |
| session.spec: cronômetro fora do detalhe | link Meu dia global seleciona sidebar e voltar da página |

Os 12 FAIL locais são esses nove + os três Planner anteriores. O gate shell é outra falha baseline de contraste/timing, não omitida. Nenhuma regressão nova demonstrada da Gika. A comparação não usa credenciais de produção, não troca backend de comandos nem faz escrita Gika paralela.

Execução inicial dos cinco E2E novos: 3 PASS/2 FAIL por harness novo capturar profile.completeTutorial e usar .activity-card inexistente. Corrigidos no próprio teste (aguardar tutorial, filtrar activity.create, usar .day-activity); execução completa final dos cinco PASS. Uma primeira tentativa da suíte ampla foi interrompida ao detectar outputDir compartilhado por invocação npm sem separador; repetição completa com diretório exclusivo é o resultado56 acima. Não classificar esses erros iniciais como regressão de produto.

## Evidências e revisão

- Evals E10/M3-E12..E18 em EVALS.md, unit/integration/E2E, nenhum sucesso por narrativa sem tool válida.
- Screenshots reais após receipt e antes do reload: evidence/m3-create-desktop-light.png e m3-create-mobile-dark.png. Tarefa aparece na agenda convencional e sobrevive ao reload nos dois E2E.
- Sem nova ADR: implementação cumpre ADR-GIKA-005 e os contratos M0. Diferenças operacionais/bases mínimas no ExecPlan da tarefa e documentação de arquitetura/policy.
- Gemini real E10 não foi testado nesta tarefa: nenhuma credencial atual autorizada. O smoke M2 E01/E02 já PASS permanece histórico; não prova a nova interpretação de create_task. Credencial temporária M2 não reutilizada. Todas as interpretações M3 verificadas aqui são fixtures; escrita/receipts/persistência UI são reais em emuladores.
- Parar após M3-T1 e aguardar revisão do usuário. M3 permanece incompleto; M3-T2/T3 não iniciados.

## Checkpoint

Commit atômico de código/testes/estado/tarefas/evidências:3fa05f0d447724e2ad41ad95e1482e3941c3a8de (feat/gika-integration). Grafo de dependências/escopo/segredos/diff PASS; worktree limpo após o commit. Checkpoint documental posterior registra este SHA sem alteração funcional. Nova autorização é necessária para iniciar T2; não interpretar checkpoint como autorização.
